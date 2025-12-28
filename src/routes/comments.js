/**
 * Comments Routes
 * Handles comment functionality for posts
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireApiAuth } = require('../middleware/auth');
const { loadCurrentAccount } = require('../middleware/account');
const commentsService = require('../services/comments');
const { PostCommentsModel } = require('../database/accountModels');

// Apply auth middleware to all comments routes
router.use(requireAuth);
router.use(loadCurrentAccount);

/**
 * GET /admin/api/comments/post/:id
 * API: Get comments for a post
 */
router.get('/post/:id', requireApiAuth, (req, res) => {
    try {
        const comments = commentsService.getPostComments(req.params.id);

        res.json({
            success: true,
            comments,
        });
    } catch (error) {
        console.error('Error getting post comments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get comments',
        });
    }
});

/**
 * POST /admin/api/comments
 * API: Create a new comment
 */
router.post('/', requireApiAuth, async (req, res) => {
    try {
        const { postId, text } = req.body;

        if (!postId || !text) {
            return res.status(400).json({
                success: false,
                message: 'postId and text are required',
            });
        }

        const { ScheduledPostsModel } = require('../database/models');
        const post = ScheduledPostsModel.findById(postId);

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

        const result = await commentsService.postComment(
            post.thread_id,
            text,
            accessToken
        );

        if (result.success) {
            // Save comment to database
            PostCommentsModel.create({
                post_id: postId,
                thread_id: post.thread_id,
                comment_id: result.commentId,
                comment_text: text,
                author_username: req.currentAccount?.username || 'You',
            });
        }

        res.json(result);
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create comment',
        });
    }
});

/**
 * DELETE /admin/api/comments/:id
 * API: Delete a comment (hide it)
 */
router.delete('/:id', requireApiAuth, async (req, res) => {
    try {
        const comment = PostCommentsModel.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found',
            });
        }

        const accessToken = req.currentAccount?.access_token || req.session.access_token;

        if (!accessToken) {
            return res.status(400).json({
                success: false,
                message: 'No access token available',
            });
        }

        const result = await commentsService.hideComment(
            comment.comment_id,
            true,
            accessToken
        );

        if (result.success) {
            PostCommentsModel.delete(req.params.id);
        }

        res.json(result);
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete comment',
        });
    }
});

/**
 * POST /admin/api/comments/:id/hide
 * API: Hide a comment
 */
router.post('/:id/hide', requireApiAuth, async (req, res) => {
    try {
        const comment = PostCommentsModel.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found',
            });
        }

        const accessToken = req.currentAccount?.access_token || req.session.access_token;

        if (!accessToken) {
            return res.status(400).json({
                success: false,
                message: 'No access token available',
            });
        }

        const result = await commentsService.hideComment(
            comment.comment_id,
            true,
            accessToken
        );

        res.json(result);
    } catch (error) {
        console.error('Error hiding comment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to hide comment',
        });
    }
});

/**
 * POST /admin/api/comments/:id/unhide
 * API: Unhide a comment
 */
router.post('/:id/unhide', requireApiAuth, async (req, res) => {
    try {
        const comment = PostCommentsModel.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: 'Comment not found',
            });
        }

        const accessToken = req.currentAccount?.access_token || req.session.access_token;

        if (!accessToken) {
            return res.status(400).json({
                success: false,
                message: 'No access token available',
            });
        }

        const result = await commentsService.hideComment(
            comment.comment_id,
            false,
            accessToken
        );

        res.json(result);
    } catch (error) {
        console.error('Error unhiding comment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to unhide comment',
        });
    }
});

/**
 * POST /admin/api/comments/post/:postId/fetch
 * API: Fetch latest comments for a post
 */
router.post('/post/:postId/fetch', requireApiAuth, async (req, res) => {
    try {
        const accessToken = req.currentAccount?.access_token || req.session.access_token;

        if (!accessToken) {
            return res.status(400).json({
                success: false,
                message: 'No access token available',
            });
        }

        const result = await commentsService.updatePostComments(
            req.params.postId,
            accessToken
        );

        res.json(result);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch comments',
        });
    }
});

module.exports = router;
