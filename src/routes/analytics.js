/**
 * Analytics Routes
 * Handles social analytics tracking and display
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireApiAuth } = require('../middleware/auth');
const { loadCurrentAccount } = require('../middleware/account');
const analyticsService = require('../services/analytics');
const { PostAnalyticsModel } = require('../database/accountModels');

// Apply auth middleware to all analytics routes
router.use(requireAuth);
router.use(loadCurrentAccount);

/**
 * GET /admin/analytics
 * Display analytics dashboard
 */
router.get('/', async (req, res) => {
    try {
        const stats = analyticsService.getOverallStats();
        const recentAnalytics = analyticsService.getAllAnalytics({ limit: 10 });

        res.render('analytics/dashboard', {
            title: 'Analytics Dashboard',
            currentPage: 'analytics',
            stats,
            recentAnalytics,
        });
    } catch (error) {
        console.error('Error loading analytics dashboard:', error);
        res.render('analytics/dashboard', {
            title: 'Analytics Dashboard',
            currentPage: 'analytics',
            error: 'Failed to load analytics data',
        });
    }
});

/**
 * GET /admin/api/analytics/overview
 * API: Get overall statistics
 */
router.get('/api/overview', requireApiAuth, (req, res) => {
    try {
        const stats = analyticsService.getOverallStats();
        res.json({
            success: true,
            stats,
        });
    } catch (error) {
        console.error('Error getting overview stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get overview statistics',
        });
    }
});

/**
 * GET /admin/api/analytics/post/:id
 * API: Get analytics for a specific post
 */
router.get('/api/post/:id', requireApiAuth, (req, res) => {
    try {
        const analytics = analyticsService.getPostAnalytics(req.params.id);

        if (!analytics) {
            return res.status(404).json({
                success: false,
                message: 'Analytics not found for this post',
            });
        }

        res.json({
            success: true,
            analytics,
        });
    } catch (error) {
        console.error('Error getting post analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get post analytics',
        });
    }
});

/**
 * POST /admin/api/analytics/fetch
 * API: Fetch latest analytics for all published posts
 */
router.post('/api/fetch', requireApiAuth, async (req, res) => {
    try {
        if (!req.currentAccount) {
            return res.status(400).json({
                success: false,
                message: 'No Threads account connected',
            });
        }

        const results = await analyticsService.fetchAllPublishedAnalytics(
            req.currentAccount.access_token
        );

        res.json({
            success: true,
            message: `Analytics updated: ${results.success} posts`,
            results,
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch analytics',
        });
    }
});

/**
 * POST /admin/api/analytics/post/:id/fetch
 * API: Fetch analytics for a specific post
 */
router.post('/api/post/:id/fetch', requireApiAuth, async (req, res) => {
    try {
        const { ScheduledPostsModel } = require('../database/models');
        const post = ScheduledPostsModel.findById(req.params.id);

        if (!post || !post.thread_id) {
            return res.status(404).json({
                success: false,
                message: 'Post not found or not published',
            });
        }

        const accessToken = req.currentAccount?.access_token || req.session.access_token;

        if (!accessToken) {
            return res.status(400).json({
                success: false,
                message: 'No access token available',
            });
        }

        const analytics = await analyticsService.updatePostAnalytics(
            post.id,
            post.thread_id,
            accessToken
        );

        if (!analytics) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch analytics',
            });
        }

        res.json({
            success: true,
            message: 'Analytics updated successfully',
            analytics,
        });
    } catch (error) {
        console.error('Error fetching post analytics:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch analytics',
        });
    }
});

module.exports = router;
