/**
 * Analytics Service
 * Handles fetching and storing post analytics from Threads API
 */

const axios = require('axios');
const https = require('https');
const { PostAnalyticsModel } = require('../database/accountModels');
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
 * Fetch analytics for a specific post
 */
async function fetchPostAnalytics(threadId, accessToken) {
    const url = buildGraphAPIURL(
        `${threadId}/insights`,
        {
            metric: ['likes_count', 'comments_count', 'shares_count', 'views_count'].join(','),
        },
        accessToken
    );

    try {
        const response = await axios.get(url, { httpsAgent: agent });
        const metrics = response.data.data || [];

        const analytics = {
            thread_id: threadId,
            likes_count: 0,
            comments_count: 0,
            shares_count: 0,
            views_count: 0,
            quote_count: 0,
        };

        metrics.forEach(metric => {
            if (metric.name === 'likes_count') {
                analytics.likes_count = metric.values?.[0]?.value || 0;
            } else if (metric.name === 'comments_count') {
                analytics.comments_count = metric.values?.[0]?.value || 0;
            } else if (metric.name === 'shares_count') {
                analytics.shares_count = metric.values?.[0]?.value || 0;
            } else if (metric.name === 'views_count') {
                analytics.views_count = metric.values?.[0]?.value || 0;
            }
        });

        return analytics;
    } catch (error) {
        console.error(`Error fetching analytics for thread ${threadId}:`, error.message);
        return null;
    }
}

/**
 * Update analytics for a post
 */
async function updatePostAnalytics(postId, threadId, accessToken) {
    const analytics = await fetchPostAnalytics(threadId, accessToken);

    if (!analytics) {
        return null;
    }

    return PostAnalyticsModel.upsert({
        post_id: postId,
        thread_id: threadId,
        ...analytics,
    });
}

/**
 * Fetch analytics for all published posts
 */
async function fetchAllPublishedAnalytics(accessToken) {
    const publishedPosts = ScheduledPostsModel.findAll({
        status: 'published',
    });

    const results = {
        success: 0,
        failed: 0,
    };

    for (const post of publishedPosts) {
        if (post.thread_id) {
            const result = await updatePostAnalytics(post.id, post.thread_id, accessToken);
            if (result) {
                results.success++;
            } else {
                results.failed++;
            }
        }
    }

    return results;
}

/**
 * Get overall statistics
 */
function getOverallStats() {
    return PostAnalyticsModel.getOverallStats();
}

/**
 * Get analytics for a specific post
 */
function getPostAnalytics(postId) {
    return PostAnalyticsModel.findByPostId(postId);
}

/**
 * Get all analytics with optional filters
 */
function getAllAnalytics(filters = {}) {
    return PostAnalyticsModel.findAll(filters.limit);
}

module.exports = {
    fetchPostAnalytics,
    updatePostAnalytics,
    fetchAllPublishedAnalytics,
    getOverallStats,
    getPostAnalytics,
    getAllAnalytics,
};
