/**
 * Comments Service
 * Handles fetching and managing comments from Threads API
 */

const axios = require('axios');
const https = require('https');
const { PostCommentsModel } = require('../database/accountModels');
const { ScheduledPostsModel } = require('../database/models');

const agent = new https.Agent({
    rejectUnauthorized: process.env.REJECT_UNAUTHORIZED !== 'false',
});

const GRAPH_API_BASE_URL =
    'https://graph.threads.net/' +
    (process.env.GRAPH_API_VERSION ? process.env.GRAPH_API_VERSION + '/' : '');

/**
 * Build Graph API URL with parameters
 */
function buildGraphAPIURL(path, searchParams, accessToken) {
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

/**
 * Fetch comments for a thread
 */
async function fetchThreadComments(threadId, accessToken) {
    const fields = ['id', 'text', 'timestamp', 'username', 'media_type', 'media_url'];
    const url = buildGraphAPIURL(
        `${threadId}/replies`,
        {
            fields: fields.join(','),
            limit: 25,
        },
        accessToken
    );

    try {
        const response = await axios.get(url, { httpsAgent: agent });
        const comments = response.data.data || [];

        return comments.map(comment => ({
            comment_id: comment.id,
            comment_text: comment.text || '',
            author_username: comment.username,
            timestamp: comment.timestamp,
            media_type: comment.media_type,
            media_url: comment.media_url,
        }));
    } catch (error) {
        console.error(`Error fetching comments for thread ${threadId}:`, error.message);
        return [];
    }
}

/**
 * Post a comment on a thread
 */
async function postComment(threadId, text, accessToken) {
    const url = buildGraphAPIURL(
        `${threadId}/reply`,
        {},
        accessToken
    );

    try {
        const response = await axios.post(
            url,
            new URLSearchParams({ text }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                httpsAgent: agent,
            }
        );

        return {
            success: true,
            commentId: response.data.id,
        };
    } catch (error) {
        console.error('Error posting comment:', error.message);
        return {
            success: false,
            message: error.response?.data?.error?.message || error.message,
        };
    }
}

/**
 * Hide a comment
 */
async function hideComment(commentId, hide, accessToken) {
    const url = buildGraphAPIURL(
        `${commentId}/manage_reply`,
        {},
        accessToken
    );

    try {
        const response = await axios.post(
            url,
            new URLSearchParams({ hide: hide ? 'true' : 'false' }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                httpsAgent: agent,
            }
        );

        return {
            success: true,
        };
    } catch (error) {
        console.error('Error hiding comment:', error.message);
        return {
            success: false,
            message: error.response?.data?.error?.message || error.message,
        };
    }
}

/**
 * Save comments to database for a post
 */
function saveComments(postId, threadId, comments) {
    // Delete existing comments for this post
    PostCommentsModel.deleteByPostId(postId);

    // Save new comments
    comments.forEach(comment => {
        PostCommentsModel.create({
            post_id: postId,
            thread_id: threadId,
            comment_id: comment.comment_id,
            comment_text: comment.comment_text,
            author_username: comment.author_username,
        });
    });

    return comments;
}

/**
 * Get comments for a post
 */
function getPostComments(postId) {
    return PostCommentsModel.findByPostId(postId);
}

/**
 * Get comment count for a post
 */
function getCommentCount(postId) {
    return PostCommentsModel.getCountByPostId(postId);
}

/**
 * Fetch and store comments for a post
 */
async function updatePostComments(postId, accessToken) {
    const post = ScheduledPostsModel.findById(postId);

    if (!post || !post.thread_id) {
        return {
            success: false,
            message: 'Post not found or not published',
        };
    }

    const comments = await fetchThreadComments(post.thread_id, accessToken);

    saveComments(postId, post.thread_id, comments);

    return {
        success: true,
        count: comments.length,
    };
}

module.exports = {
    fetchThreadComments,
    postComment,
    hideComment,
    saveComments,
    getPostComments,
    getCommentCount,
    updatePostComments,
};
