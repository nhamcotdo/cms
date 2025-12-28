/**
 * Post Scheduler Service
 * Handles scheduled post publishing using node-cron
 */

const cron = require('node-cron');
const { ScheduledPostsModel, PostHistoryModel, POST_STATUS } = require('../database/models');
const { AccountsModel } = require('../database/accountModels');
const axios = require('axios');
const https = require('https');
const { URL } = require('url');

class PostScheduler {
    constructor() {
        this.schedulerTask = null;
        this.isRunning = false;
    }

    /**
     * Initialize and start the scheduler
     */
    initialize() {
        if (this.isRunning) {
            console.log('Scheduler is already running');
            return;
        }

        console.log('Initializing post scheduler...');

        this.schedulerTask = cron.schedule('* * * * *', async () => {
            await this.processScheduledPosts();
        });

        this.isRunning = true;
        console.log('Scheduler started - checking every minute');
    }

    /**
     * Update access token (deprecated - kept for compatibility)
     */
    updateAccessToken(accessToken) {
        console.warn('updateAccessToken is deprecated. Scheduler now uses account access tokens from database.');
    }

    /**
     * Process all scheduled posts that are due
     */
    async processScheduledPosts() {
        try {
            const duePosts = ScheduledPostsModel.getDuePosts();

            if (duePosts.length === 0) {
                return;
            }

            console.log(`Found ${duePosts.length} posts due for publishing`);

            for (const post of duePosts) {
                await this.publishPost(post);
            }
        } catch (error) {
            console.error('Error processing scheduled posts:', error);
        }
    }

    /**
     * Publish a single scheduled post
     */
    async publishPost(post) {
        const agent = new https.Agent({
            rejectUnauthorized: process.env.REJECT_UNAUTHORIZED !== 'false',
        });

        try {
            console.log(`Publishing scheduled post ${post.id}...`);

            // Load the account associated with this post
            const accountId = post.account_id;
            const postAccount = accountId ? AccountsModel.findById(accountId) : null;

            if (!postAccount || !postAccount.access_token) {
                console.error(`No valid account found for post ${post.id}. Skipping.`);
                ScheduledPostsModel.update(post.id, {
                    status: POST_STATUS.FAILED,
                    error_message: 'No valid account found for this post',
                });
                return;
            }

            const accessToken = postAccount.access_token;

            ScheduledPostsModel.update(post.id, {
                status: POST_STATUS.PUBLISHING,
            });

            const GRAPH_API_BASE_URL = `https://graph.threads.net/${process.env.GRAPH_API_VERSION ? process.env.GRAPH_API_VERSION + '/' : ''}`;

            const params = {
                [PARAMS__TEXT]: post.text,
                media_type: post.media_type || 'TEXT',
            };

            // For TEXT posts, use auto_publish_text to publish immediately
            if (params.media_type === 'TEXT') {
                params.auto_publish_text = true;
            }

            if (post.reply_control) {
                params[PARAMS__REPLY_CONTROL] = post.reply_control;
            }

            if (post.reply_to_id) {
                params[PARAMS__REPLY_TO_ID] = post.reply_to_id;
            }

            if (post.link_attachment) {
                params[PARAMS__LINK_ATTACHMENT] = post.link_attachment;
            }

            if (post.topic_tag) {
                params[PARAMS__TOPIC_TAG] = post.topic_tag;
            }

            if (post.quote_post_id) {
                params[PARAMS__QUOTE_POST_ID] = post.quote_post_id;
            }

            if (post.is_spoiler_media) {
                params[PARAMS_IS_SPOILER_MEDIA] = true;
            }

            if (post.poll_attachment) {
                params[PARAMS__POLL_ATTACHMENT] = JSON.stringify(post.poll_attachment);
            }

            if (post.text_entities) {
                params[PARAMS_TEXT_ENTITES] = JSON.stringify(post.text_entities);
            }

            if (post.attachment_data) {
                const { attachmentType, attachmentUrl, attachmentAltText } = post.attachment_data;

                if (post.media_type === 'IMAGE' || post.media_type === 'VIDEO') {
                    this.addAttachmentFields(params, attachmentType[0], attachmentUrl[0], attachmentAltText[0]);
                } else if (post.media_type === 'CAROUSEL') {
                    params.children = [];

                    attachmentType.forEach((type, i) => {
                        const child = {
                            is_carousel_item: true,
                        };
                        this.addAttachmentFields(child, type, attachmentUrl[i], attachmentAltText[i]);
                        params.children.push(child);
                    });
                }
            }

            const postThreadsUrl = this.buildGraphAPIURL(
                `me/threads`,
                params,
                accessToken,
                GRAPH_API_BASE_URL
            );

            const postResponse = await axios.post(postThreadsUrl, {}, { httpsAgent: agent });

            // For TEXT posts with auto_publish_text, response contains thread_id directly
            // For media posts, response contains container_id that needs to be published
            let threadId, containerId;

            if (params.auto_publish_text && postResponse.data.id) {
                // TEXT post was auto-published
                threadId = postResponse.data.id;
                containerId = null;
                console.log(`TEXT post ${post.id} auto-published: ${threadId}`);

                // Update database with published status
                const scheduledPost = ScheduledPostsModel.findById(post.id);
                ScheduledPostsModel.update(post.id, {
                    status: POST_STATUS.PUBLISHED,
                    thread_id: threadId,
                    published_at: Math.floor(Date.now() / 1000),
                });

                // Add to post history
                PostHistoryModel.create({
                    container_id: null,
                    thread_id: threadId,
                    text: scheduledPost.text,
                    media_type: scheduledPost.media_type,
                    status: POST_STATUS.PUBLISHED,
                    published_at: Math.floor(Date.now() / 1000),
                    attachment_data: scheduledPost.attachment_data,
                });
            } else {
                // Media post - need to publish the container
                containerId = postResponse.data.id;
                console.log(`Container created for post ${post.id}: ${containerId}`);

                ScheduledPostsModel.update(post.id, {
                    container_id: containerId,
                });

                await this.publishContainer(containerId, post.id, accessToken);
            }

            console.log(`Successfully published scheduled post ${post.id}`);
        } catch (error) {
            console.error(`Error publishing scheduled post ${post.id}:`, error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
            }

            const retryCount = (post.retry_count || 0) + 1;
            const maxRetries = 3;

            if (retryCount < maxRetries) {
                ScheduledPostsModel.update(post.id, {
                    status: POST_STATUS.SCHEDULED,
                    retry_count: retryCount,
                    error_message: error.response?.data?.error?.message || error.message,
                });
                console.log(`Will retry post ${post.id} (attempt ${retryCount}/${maxRetries})`);
            } else {
                ScheduledPostsModel.update(post.id, {
                    status: POST_STATUS.FAILED,
                    retry_count: retryCount,
                    error_message: error.response?.data?.error?.message || error.message,
                });
                console.error(`Post ${post.id} failed after ${maxRetries} attempts`);
            }
        }
    }

    /**
     * Publish a container to make it live
     */
    async publishContainer(containerId, postId, accessToken) {
        const agent = new https.Agent({
            rejectUnauthorized: process.env.REJECT_UNAUTHORIZED !== 'false',
        });

        const GRAPH_API_BASE_URL = `https://graph.threads.net/${process.env.GRAPH_API_VERSION ? process.env.GRAPH_API_VERSION + '/' : ''}`;

        try {
            const publishUrl = this.buildGraphAPIURL(
                `me/threads_publish`,
                {
                    creation_id: containerId,
                },
                accessToken,
                GRAPH_API_BASE_URL
            );

            const response = await axios.post(publishUrl, { httpsAgent: agent });
            const threadId = response.data.id;

            const scheduledPost = ScheduledPostsModel.findById(postId);
            ScheduledPostsModel.update(postId, {
                status: POST_STATUS.PUBLISHED,
                thread_id: threadId,
                published_at: Math.floor(Date.now() / 1000),
            });

            // Add to post history
            PostHistoryModel.create({
                container_id: containerId,
                thread_id: threadId,
                text: scheduledPost.text,
                media_type: scheduledPost.media_type,
                status: POST_STATUS.PUBLISHED,
                published_at: Math.floor(Date.now() / 1000),
                attachment_data: scheduledPost.attachment_data,
            });

            return threadId;
        } catch (error) {
            console.error('Error publishing container:', error.message);
            throw error;
        }
    }

    /**
     * Build Graph API URL with parameters
     */
    buildGraphAPIURL(path, searchParams, accessToken, base_url) {
        const url = new URL(path, base_url);

        Object.keys(searchParams).forEach(key => {
            if (searchParams[key] !== undefined && searchParams[key] !== null) {
                url.searchParams.append(key, searchParams[key]);
            }
        });

        if (accessToken) {
            url.searchParams.append('access_token', accessToken);
        }

        return url.toString();
    }

    /**
     * Add attachment fields to params
     */
    addAttachmentFields(target, attachmentType, url, altText) {
        if (attachmentType === 'Image') {
            target.media_type = 'IMAGE';
            target.image_url = url;
            if (altText) {
                target.alt_text = altText;
            }
        } else if (attachmentType === 'Video') {
            target.media_type = 'VIDEO';
            target.video_url = url;
            if (altText) {
                target.alt_text = altText;
            }
        }
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.schedulerTask) {
            this.schedulerTask.stop();
            this.isRunning = false;
            console.log('Scheduler stopped');
        }
    }
}

const PARAMS__ACCESS_TOKEN = 'access_token';
const PARAMS__ALT_TEXT = 'alt_text';
const PARAMS__TEXT = 'text';
const PARAMS__LINK_ATTACHMENT = 'link_attachment';
const PARAMS__QUOTE_POST_ID = 'quote_post_id';
const PARAMS__REPLY_CONTROL = 'reply_control';
const PARAMS__REPLY_TO_ID = 'reply_to_id';
const PARAMS__TOPIC_TAG = 'topic_tag';
const PARAMS__POLL_ATTACHMENT = 'poll_attachment';
const PARAMS_TEXT_ENTITES = 'text_entities';
const PARAMS_IS_SPOILER_MEDIA = 'is_spoiler_media';

module.exports = new PostScheduler();
