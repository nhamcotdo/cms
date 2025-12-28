/**
 * Admin Routes
 * Routes for admin panel functionality
 */

const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const {
    ScheduledPostsModel,
    MediaFilesModel,
    PostHistoryModel,
    UserSettingsModel,
    POST_STATUS,
} = require('../database/models');
const textParser = require('../../public/scripts/text-parser.js');
const axios = require('axios');
const https = require('https');
const path = require('path');
const { requireAuth, requireApiAuth } = require('../middleware/auth');
const { loadCurrentAccount, requireAccessToken } = require('../middleware/account');

const spoilerMarker = '**spoiler**';

const agent = new https.Agent({
    rejectUnauthorized: process.env.REJECT_UNAUTHORIZED !== 'false',
});

const MEDIA_TYPE__CAROUSEL = 'CAROUSEL';
const MEDIA_TYPE__IMAGE = 'IMAGE';
const MEDIA_TYPE__TEXT = 'TEXT';
const MEDIA_TYPE__VIDEO = 'VIDEO';

const PARAMS__TEXT = 'text';
const PARAMS__REPLY_CONTROL = 'reply_control';
const PARAMS__REPLY_TO_ID = 'reply_to_id';
const PARAMS__LINK_ATTACHMENT = 'link_attachment';
const PARAMS__TOPIC_TAG = 'topic_tag';
const PARAMS__QUOTE_POST_ID = 'quote_post_id';
const PARAMS_IS_SPOILER_MEDIA = 'is_spoiler_media';
const PARAMS__POLL_ATTACHMENT = 'poll_attachment';
const PARAMS_TEXT_ENTITES = 'text_entities';

// Apply auth and account middleware to all admin routes
router.use(requireAuth);
router.use(loadCurrentAccount);

/**
 * Middleware to ensure user is logged in (legacy, for compatibility)
 */
const loggedInUserChecker = (req, res, next) => {
    if (req.session.access_token || req.currentAccount) {
        next();
    } else {
        res.redirect('/?return_url=' + encodeURIComponent(req.originalUrl));
    }
};

/**
 * Helper to get access token from request
 */
function getAccessToken(req) {
    return req.session.access_token || req.currentAccount?.access_token;
}

/**
 * Helper to render with common locals
 */
function renderWithLocals(req, res, template, locals = {}) {
    res.render(template, {
        ...locals,
        currentAccount: req.currentAccount,
    });
}

/**
 * Platforms Route - Platform selection page
 */
router.get('/platforms', async (req, res) => {
    try {
        const { AccountsModel } = require('../database/accountModels');

        // Get threads accounts for current user
        const adminUserId = req.adminUser?.id;
        const threadsAccounts = adminUserId
            ? AccountsModel.findByAdminUserId(adminUserId)
            : [];

        // Get stats for threads
        const threadsStats = {
            total: 0,
            published: 0,
        };

        threadsAccounts.forEach(account => {
            const accountPosts = ScheduledPostsModel.findAll()
                .filter(p => p.account_id === account.id);
            threadsStats.total += accountPosts.length;
            threadsStats.published += accountPosts.filter(p => p.status === POST_STATUS.PUBLISHED).length;
        });

        renderWithLocals(req, res, 'admin/platforms', {
            title: 'Platforms',
            currentPage: 'platforms',
            threadsAccounts,
            threadsStats,
        });
    } catch (error) {
        console.error('Error loading platforms:', error);
        renderWithLocals(req, res, 'admin/platforms', {
            title: 'Platforms',
            currentPage: 'platforms',
            threadsAccounts: [],
            threadsStats: { total: 0, published: 0 },
            error: 'Failed to load platforms',
        });
    }
});

/**
 * Dashboard Route
 */
router.get('/dashboard', async (req, res) => {
    try {
        const scheduledCount = ScheduledPostsModel.findAll({ status: POST_STATUS.SCHEDULED }).length;
        const draftCount = ScheduledPostsModel.findAll({ status: POST_STATUS.DRAFT }).length;
        const publishedCount = ScheduledPostsModel.findAll({ status: POST_STATUS.PUBLISHED }).length;
        const failedCount = ScheduledPostsModel.findAll({ status: POST_STATUS.FAILED }).length;
        const mediaCount = MediaFilesModel.findAll().length;
        const totalPosts = PostHistoryModel.findAll().length;

        const recentPosts = ScheduledPostsModel.findAll({ limit: 5 });

        renderWithLocals(req, res, 'admin/dashboard', {
            title: 'Dashboard',
            currentPage: 'dashboard',
            stats: {
                scheduled: scheduledCount,
                drafts: draftCount,
                published: publishedCount,
                failed: failedCount,
                media: mediaCount,
                totalPosts,
            },
            recentPosts,
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        renderWithLocals(req, res, 'admin/dashboard', {
            title: 'Dashboard',
            currentPage: 'dashboard',
            error: 'Failed to load dashboard data',
        });
    }
});

/**
 * Create Post Route
 */
router.get('/create', (req, res) => {
    const { AccountsModel } = require('../database/accountModels');
    const accounts = AccountsModel.findAll({ is_active: true });

    renderWithLocals(req, res, 'admin/create-post', {
        title: 'Create Post',
        currentPage: 'create',
        accounts,
    });
});

/**
 * Handle file upload
 */
router.post('/upload/file', loggedInUserChecker, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            error: true,
            message: 'No file uploaded',
        });
    }

    try {
        const fileUrl = `/uploads/${req.file.filename}`;

        const mediaRecord = MediaFilesModel.create({
            filename: req.file.filename,
            original_name: req.file.originalname,
            mime_type: req.file.mimetype,
            file_size: req.file.size,
            file_path: req.file.path,
            url: fileUrl,
        });

        res.json({
            success: true,
            file: {
                id: mediaRecord.id,
                url: fileUrl,
                filename: req.file.filename,
                original_name: req.file.originalname,
                mime_type: req.file.mimetype,
                size: req.file.size,
            },
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({
            error: true,
            message: 'Failed to upload file',
        });
    }
});

/**
 * Save post (as draft or schedule)
 */
router.post('/save', loggedInUserChecker, upload.array(), async (req, res) => {
    const {
        text,
        attachmentType,
        attachmentUrl,
        attachmentAltText,
        replyControl,
        replyToId,
        topicTag,
        linkAttachment,
        pollOptionA,
        pollOptionB,
        pollOptionC,
        pollOptionD,
        quotePostId,
        spoilerMedia,
        scheduleDate,
        scheduleTime,
        saveType,
        accountId,
    } = req.body;

    // Handle saveType being an array from FormData
    const actualSaveType = Array.isArray(saveType) ? saveType[saveType.length - 1] : saveType;

    console.log('Received saveType:', saveType, 'Actual saveType:', actualSaveType);
    console.log('Schedule date:', scheduleDate, 'time:', scheduleTime);

    try {
        let mediaType = MEDIA_TYPE__TEXT;
        let attachmentData = null;

        if (attachmentType && attachmentType.length > 0) {
            if (attachmentType.length === 1) {
                mediaType = attachmentType[0] === 'Image' ? MEDIA_TYPE__IMAGE : MEDIA_TYPE__VIDEO;
            } else {
                mediaType = MEDIA_TYPE__CAROUSEL;
            }

            attachmentData = {
                attachmentType,
                attachmentUrl,
                attachmentAltText,
            };
        }

        let pollAttachment = null;
        if (pollOptionA && pollOptionB) {
            pollAttachment = {
                option_a: pollOptionA,
                option_b: pollOptionB,
                option_c: pollOptionC || null,
                option_d: pollOptionD || null,
            };
        }

        let textEntities = null;
        let processedText = text;

        if (text.includes(spoilerMarker)) {
            const parsedInput = textParser.extractSpoilerInfo(text);
            processedText = parsedInput.text;
            textEntities = parsedInput.textEntities;
        }

        let scheduledFor = null;
        let status = POST_STATUS.DRAFT;

        if (actualSaveType === 'schedule' && scheduleDate && scheduleTime) {
            const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
            scheduledFor = Math.floor(scheduledDateTime.getTime() / 1000);
            status = POST_STATUS.SCHEDULED;
        }

        console.log('Final status:', status, 'Scheduled for:', scheduledFor);

        const post = ScheduledPostsModel.create({
            text: processedText,
            media_type: mediaType,
            scheduled_for: scheduledFor || Math.floor(Date.now() / 1000),
            status,
            attachment_data: attachmentData,
            reply_control: replyControl || null,
            reply_to_id: replyToId || null,
            link_attachment: linkAttachment || null,
            topic_tag: topicTag || null,
            quote_post_id: quotePostId || null,
            is_spoiler_media: spoilerMedia === 'on',
            poll_attachment: pollAttachment,
            text_entities: textEntities,
            account_id: accountId || req.currentAccount?.id || null,
        });

        const successMessage = actualSaveType === 'schedule'
            ? 'Post scheduled successfully'
            : 'Post saved as draft';

        res.json({
            success: true,
            message: successMessage,
            postId: post.id,
        });
    } catch (error) {
        console.error('Error saving post:', error);
        res.status(500).json({
            error: true,
            message: 'Failed to save post',
        });
    }
});

/**
 * Publish post immediately
 */
router.post('/publish-now', loggedInUserChecker, upload.array(), async (req, res) => {
    const {
        text,
        attachmentType,
        attachmentUrl,
        attachmentAltText,
        replyControl,
        replyToId,
        topicTag,
        linkAttachment,
        pollOptionA,
        pollOptionB,
        pollOptionC,
        pollOptionD,
        quotePostId,
        spoilerMedia,
    } = req.body;

    try {
        let mediaType = MEDIA_TYPE__TEXT;
        let attachmentData = null;

        if (attachmentType && attachmentType.length > 0) {
            if (Array.isArray(attachmentType)) {
                if (attachmentType.length === 1) {
                    mediaType = attachmentType[0] === 'Image' ? MEDIA_TYPE__IMAGE : MEDIA_TYPE__VIDEO;
                } else {
                    mediaType = MEDIA_TYPE__CAROUSEL;
                }
                attachmentData = {
                    attachmentType,
                    attachmentUrl: Array.isArray(attachmentUrl) ? attachmentUrl : [attachmentUrl],
                    attachmentAltText: Array.isArray(attachmentAltText) ? attachmentAltText : [attachmentAltText],
                };
            }
        }

        let pollAttachment = null;
        if (pollOptionA && pollOptionB) {
            pollAttachment = {
                option_a: pollOptionA,
                option_b: pollOptionB,
                option_c: pollOptionC || null,
                option_d: pollOptionD || null,
            };
        }

        let textEntities = null;
        let processedText = text;

        if (text && text.includes(spoilerMarker)) {
            const parsedInput = textParser.extractSpoilerInfo(text);
            processedText = parsedInput.text;
            textEntities = parsedInput.textEntities;
        }

        const params = {
            [PARAMS__TEXT]: processedText || '',
            media_type: mediaType,
        };

        // For TEXT posts, use auto_publish_text
        if (mediaType === MEDIA_TYPE__TEXT) {
            params.auto_publish_text = true;
        }

        if (replyControl) {
            params[PARAMS__REPLY_CONTROL] = replyControl;
        }

        if (replyToId) {
            params[PARAMS__REPLY_TO_ID] = replyToId;
        }

        if (linkAttachment) {
            params[PARAMS__LINK_ATTACHMENT] = linkAttachment;
        }

        if (topicTag) {
            params[PARAMS__TOPIC_TAG] = topicTag;
        }

        if (quotePostId) {
            params[PARAMS__QUOTE_POST_ID] = quotePostId;
        }

        if (spoilerMedia === 'on') {
            params[PARAMS_IS_SPOILER_MEDIA] = true;
        }

        if (pollAttachment) {
            params[PARAMS__POLL_ATTACHMENT] = JSON.stringify(pollAttachment);
        }

        if (textEntities) {
            params[PARAMS_TEXT_ENTITES] = JSON.stringify(textEntities);
        }

        if (attachmentData && (mediaType === 'IMAGE' || mediaType === 'VIDEO')) {
            addAttachmentFields(params, attachmentData.attachmentType[0], attachmentData.attachmentUrl[0], attachmentData.attachmentAltText[0]);
        } else if (attachmentData && mediaType === MEDIA_TYPE__CAROUSEL) {
            params.children = [];

            attachmentData.attachmentType.forEach((type, i) => {
                const child = {
                    is_carousel_item: true,
                };
                addAttachmentFields(child, type, attachmentData.attachmentUrl[i], attachmentData.attachmentAltText[i]);
                params.children.push(child);
            });
        }

        const postThreadsUrl = buildGraphAPIURL(
            `me/threads`,
            params,
            req.currentAccount?.access_token || req.session.access_token
        );

        console.log('Publishing now with URL:', postThreadsUrl);
        console.log('Params:', params);

        const postResponse = await axios.post(postThreadsUrl, {}, { httpsAgent: agent });

        // For TEXT posts with auto_publish_text, response contains thread_id directly
        let threadId, containerId;

        if (params.auto_publish_text && postResponse.data.id) {
            threadId = postResponse.data.id;
            containerId = null;
            console.log('TEXT post auto-published:', threadId);
        } else {
            containerId = postResponse.data.id;
            console.log('Container created:', containerId);

            const publishUrl = buildGraphAPIURL(
                `me/threads_publish`,
                { creation_id: containerId },
                req.currentAccount?.access_token || req.session.access_token
            );

            const publishResponse = await axios.post(publishUrl, {}, { httpsAgent: agent });
            threadId = publishResponse.data.id;
        }

        // Save to post history
        PostHistoryModel.create({
            container_id: containerId,
            thread_id: threadId,
            text: processedText,
            media_type: mediaType,
            status: POST_STATUS.PUBLISHED,
            published_at: Math.floor(Date.now() / 1000),
            attachment_data: attachmentData,
        });

        res.json({
            success: true,
            message: 'Post published successfully!',
            threadId,
        });
    } catch (error) {
        console.error('Error publishing now:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
        res.status(500).json({
            error: true,
            message: error.response?.data?.error?.message || error.message,
        });
    }
});

/**
 * Scheduled Posts Route
 */
router.get('/scheduled', loggedInUserChecker, async (req, res) => {
    try {
        const posts = ScheduledPostsModel.findAll();

        res.render('admin/scheduled-posts', {
            title: 'Scheduled Posts',
            currentPage: 'scheduled',
            posts,
        });
    } catch (error) {
        console.error('Error loading scheduled posts:', error);
        res.render('admin/scheduled-posts', {
            title: 'Scheduled Posts',
            currentPage: 'scheduled',
            error: 'Failed to load scheduled posts',
        });
    }
});

/**
 * Delete scheduled post
 */
router.delete('/scheduled/:id', loggedInUserChecker, async (req, res) => {
    try {
        const deleted = ScheduledPostsModel.delete(req.params.id);

        if (deleted) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: true, message: 'Post not found' });
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: true, message: 'Failed to delete post' });
    }
});

/**
 * Bulk delete scheduled posts
 */
router.delete('/api/scheduled/bulk-delete', requireApiAuth, async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No post IDs provided',
            });
        }

        let deletedCount = 0;
        let failedCount = 0;

        for (const id of ids) {
            try {
                const deleted = ScheduledPostsModel.delete(id);
                if (deleted) {
                    deletedCount++;
                } else {
                    failedCount++;
                }
            } catch (error) {
                console.error('Error deleting post:', id, error);
                failedCount++;
            }
        }

        res.json({
            success: true,
            message: `Deleted ${deletedCount} posts${failedCount > 0 ? ` (${failedCount} failed)` : ''}`,
            deletedCount,
            failedCount,
        });
    } catch (error) {
        console.error('Error bulk deleting posts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete posts',
        });
    }
});

/**
 * Edit scheduled post
 */
router.get('/scheduled/:id/edit', loggedInUserChecker, async (req, res) => {
    try {
        const post = ScheduledPostsModel.findById(req.params.id);

        if (!post) {
            return res.render('admin/scheduled-posts', {
                title: 'Scheduled Posts',
                currentPage: 'scheduled',
                error: 'Post not found',
            });
        }

        const { AccountsModel } = require('../database/accountModels');
        const accounts = AccountsModel.findAll({ is_active: true });

        res.render('admin/edit-post', {
            title: 'Edit Post',
            currentPage: 'scheduled',
            post,
            accounts,
        });
    } catch (error) {
        console.error('Error loading post:', error);
        res.render('admin/scheduled-posts', {
            title: 'Scheduled Posts',
            currentPage: 'scheduled',
            error: 'Failed to load post',
        });
    }
});

/**
 * Update scheduled post
 */
router.put('/scheduled/:id', loggedInUserChecker, upload.array(), async (req, res) => {
    try {
        const {
            text,
            attachmentType,
            attachmentUrl,
            attachmentAltText,
            replyControl,
            replyToId,
            topicTag,
            linkAttachment,
            pollOptionA,
            pollOptionB,
            pollOptionC,
            pollOptionD,
            quotePostId,
            spoilerMedia,
            scheduleDate,
            scheduleTime,
            accountId,
        } = req.body;

        const existingPost = ScheduledPostsModel.findById(req.params.id);
        if (!existingPost) {
            return res.status(404).json({ error: true, message: 'Post not found' });
        }

        let mediaType = existingPost.media_type;
        let attachmentData = existingPost.attachment_data;

        if (attachmentType && attachmentType.length > 0) {
            if (attachmentType.length === 1) {
                mediaType = attachmentType[0] === 'Image' ? MEDIA_TYPE__IMAGE : MEDIA_TYPE__VIDEO;
            } else {
                mediaType = MEDIA_TYPE__CAROUSEL;
            }
            attachmentData = {
                attachmentType,
                attachmentUrl,
                attachmentAltText,
            };
        }

        let pollAttachment = existingPost.poll_attachment;
        if (pollOptionA && pollOptionB) {
            pollAttachment = {
                option_a: pollOptionA,
                option_b: pollOptionB,
                option_c: pollOptionC || null,
                option_d: pollOptionD || null,
            };
        }

        let textEntities = null;
        let processedText = text || existingPost.text;

        if (processedText.includes(spoilerMarker)) {
            const parsedInput = textParser.extractSpoilerInfo(processedText);
            processedText = parsedInput.text;
            textEntities = parsedInput.textEntities;
        }

        let scheduledFor = existingPost.scheduled_for;
        let status = existingPost.status;

        if (scheduleDate && scheduleTime) {
            const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
            scheduledFor = Math.floor(scheduledDateTime.getTime() / 1000);
            status = POST_STATUS.SCHEDULED;
        }

        const updateData = {
            text: processedText,
            media_type: mediaType,
            scheduled_for: scheduledFor,
            status,
            attachment_data: attachmentData,
            reply_control: replyControl || null,
            reply_to_id: replyToId || null,
            link_attachment: linkAttachment || null,
            topic_tag: topicTag || null,
            quote_post_id: quotePostId || null,
            is_spoiler_media: spoilerMedia === 'on',
            poll_attachment: pollAttachment,
            text_entities: textEntities,
            account_id: accountId || req.currentAccount?.id || existingPost.account_id,
        };

        const post = ScheduledPostsModel.update(req.params.id, updateData);

        res.json({
            success: true,
            message: 'Post updated successfully',
            post,
        });
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ error: true, message: 'Failed to update post' });
    }
});

/**
 * Publish post immediately
 */
router.post('/scheduled/:id/publish', loggedInUserChecker, async (req, res) => {
    try {
        const post = ScheduledPostsModel.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ error: true, message: 'Post not found' });
        }

        // Load the account associated with this post
        const { AccountsModel } = require('../database/accountModels');
        const accountId = post.account_id || req.currentAccount?.id;
        const postAccount = accountId ? AccountsModel.findById(accountId) : null;

        if (!postAccount || !postAccount.access_token) {
            return res.status(400).json({
                error: true,
                message: 'No valid account found for this post. Please add an account first.',
            });
        }

        const GRAPH_API_BASE_URL =
            'https://graph.threads.net/' +
            (process.env.GRAPH_API_VERSION ? process.env.GRAPH_API_VERSION + '/' : '');

        const params = {
            [PARAMS__TEXT]: post.text,
            media_type: post.media_type || MEDIA_TYPE__TEXT,
        };

        const mediaType = post.media_type || MEDIA_TYPE__TEXT;

        // For TEXT posts, use auto_publish_text to skip container step
        if (mediaType === MEDIA_TYPE__TEXT) {
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

        if (post.attachment_data && (mediaType === 'IMAGE' || mediaType === 'VIDEO')) {
            const { attachmentType, attachmentUrl, attachmentAltText } = post.attachment_data;
            addAttachmentFields(params, attachmentType[0], attachmentUrl[0], attachmentAltText[0]);
        } else if (post.attachment_data && mediaType === MEDIA_TYPE__CAROUSEL) {
            const { attachmentType, attachmentUrl, attachmentAltText } = post.attachment_data;
            params.children = [];

            attachmentType.forEach((type, i) => {
                const child = {
                    is_carousel_item: true,
                };
                addAttachmentFields(child, type, attachmentUrl[i], attachmentAltText[i]);
                params.children.push(child);
            });
        }

        const postThreadsUrl = buildGraphAPIURL(
            `me/threads`,
            params,
            postAccount.access_token
        );

        console.log('Creating container with URL:', postThreadsUrl);
        console.log('Params:', params);

        const postResponse = await axios.post(postThreadsUrl, {}, { httpsAgent: agent });

        // For TEXT posts with auto_publish_text, response contains thread_id directly
        // For media posts, response contains container_id that needs to be published
        let threadId, containerId;

        if (params.auto_publish_text && postResponse.data.id) {
            // TEXT post was auto-published
            threadId = postResponse.data.id;
            containerId = null;
            console.log('TEXT post auto-published:', threadId);
        } else {
            // Media post - need to publish the container
            containerId = postResponse.data.id;
            console.log('Container created:', containerId);

            const publishUrl = buildGraphAPIURL(
                `me/threads_publish`,
                { creation_id: containerId },
                postAccount.access_token
            );

            const publishResponse = await axios.post(publishUrl, {}, { httpsAgent: agent });
            threadId = publishResponse.data.id;
        }

        ScheduledPostsModel.update(req.params.id, {
            status: POST_STATUS.PUBLISHED,
            container_id: containerId,
            thread_id: threadId,
            published_at: Math.floor(Date.now() / 1000),
        });

        PostHistoryModel.create({
            container_id: containerId,
            thread_id: threadId,
            text: post.text,
            media_type: post.media_type,
            status: POST_STATUS.PUBLISHED,
            attachment_data: post.attachment_data,
        });

        res.json({
            success: true,
            message: 'Post published successfully',
            threadId,
        });
    } catch (error) {
        console.error('===== Error publishing post =====');
        console.error('Post ID:', req.params.id);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        if (error.config) {
            console.error('Request URL:', error.config.url);
            console.error('Request method:', error.config.method);
            console.error('Request headers:', JSON.stringify(error.config.headers, null, 2));
        }

        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response status text:', error.response.statusText);
            console.error('Response headers:', JSON.stringify(error.response.headers, null, 2));
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }

        res.status(500).json({
            error: true,
            message: error.response?.data?.error?.message || error.message,
            details: error.response?.data || null
        });
    }
});

/**
 * Post History Route
 */
router.get('/history', loggedInUserChecker, async (req, res) => {
    try {
        const history = PostHistoryModel.findAll();

        res.render('admin/post-history', {
            title: 'Post History',
            currentPage: 'history',
            history,
        });
    } catch (error) {
        console.error('Error loading post history:', error);
        res.render('admin/post-history', {
            title: 'Post History',
            currentPage: 'history',
            error: 'Failed to load post history',
        });
    }
});

/**
 * Media Library Route
 */
router.get('/media', loggedInUserChecker, async (req, res) => {
    try {
        const mediaFiles = MediaFilesModel.findAll();

        res.render('admin/media-library', {
            title: 'Media Library',
            currentPage: 'media',
            mediaFiles,
        });
    } catch (error) {
        console.error('Error loading media library:', error);
        res.render('admin/media-library', {
            title: 'Media Library',
            currentPage: 'media',
            error: 'Failed to load media library',
        });
    }
});

/**
 * Delete media file
 */
router.delete('/media/:id', loggedInUserChecker, async (req, res) => {
    try {
        const media = MediaFilesModel.findById(req.params.id);

        if (!media) {
            return res.status(404).json({ error: true, message: 'Media file not found' });
        }

        const fs = require('fs');
        if (fs.existsSync(media.file_path)) {
            fs.unlinkSync(media.file_path);
        }

        MediaFilesModel.delete(req.params.id);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting media:', error);
        res.status(500).json({ error: true, message: 'Failed to delete media file' });
    }
});

/**
 * Helper function to add attachment fields
 */
function addAttachmentFields(target, attachmentType, url, altText) {
    if (attachmentType === 'Image') {
        target.media_type = MEDIA_TYPE__IMAGE;
        target.image_url = url;
        if (altText) {
            target.alt_text = altText;
        }
    } else if (attachmentType === 'Video') {
        target.media_type = MEDIA_TYPE__VIDEO;
        target.video_url = url;
        if (altText) {
            target.alt_text = altText;
        }
    }
}

/**
 * Helper function to build Graph API URL
 */
function buildGraphAPIURL(path, searchParams, accessToken) {
    const GRAPH_API_BASE_URL =
        'https://graph.threads.net/' +
        (process.env.GRAPH_API_VERSION ? process.env.GRAPH_API_VERSION + '/' : '');

    const url = new URL(path, GRAPH_API_BASE_URL);

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

module.exports = router;
