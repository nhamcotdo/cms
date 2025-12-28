/**
 * Account management routes
 * Handles Threads account CRUD operations and account switching
 */

const express = require('express');
const router = express.Router();
const { AccountsModel, AccountCookiesModel, AdminSessionsModel } = require('../database/accountModels');
const { requireAuth, requireApiAuth } = require('../middleware/auth');
const { requireCurrentAccount, setCurrentAccount, clearCurrentAccount } = require('../middleware/account');

// Apply auth middleware to all accounts routes
router.use(requireAuth);

/**
 * GET /admin/accounts
 * Display accounts management page (user's accounts only)
 */
router.get('/', (req, res) => {
    const adminUserId = req.adminUser?.id;
    const accounts = adminUserId
        ? AccountsModel.findByAdminUserId(adminUserId)
        : [];

    res.render('admin/accounts/list', {
        title: 'Accounts - Threads Admin',
        accounts,
        currentAccountId: req.currentAccount?.id,
    });
});

/**
 * GET /admin/api/accounts
 * API: Get all accounts for current user
 */
router.get('/api/accounts', requireApiAuth, (req, res) => {
    const adminUserId = req.adminUser?.id;
    const accounts = adminUserId
        ? AccountsModel.findByAdminUserId(adminUserId)
        : [];

    res.json({
        success: true,
        accounts,
        currentAccountId: req.currentAccount?.id,
    });
});

/**
 * POST /admin/api/accounts
 * API: Add a new Threads account (from OAuth callback)
 */
router.post('/api/accounts', requireApiAuth, async (req, res) => {
    try {
        const {
            threads_user_id,
            username,
            threads_profile_picture_url,
            threads_biography,
            access_token,
            token_expires_at,
        } = req.body;

        if (!threads_user_id || !username || !access_token) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
            });
        }

        // Check if account already exists
        const existing = AccountsModel.findByThreadsUserId(threads_user_id);
        if (existing) {
            // Update existing account
            await AccountsModel.update(existing.id, {
                access_token,
                token_expires_at,
                threads_profile_picture_url,
                threads_biography,
            });

            return res.json({
                success: true,
                message: 'Account updated successfully',
                account: AccountsModel.findById(existing.id),
            });
        }

        // Create new account
        const account = await AccountsModel.create({
            threads_user_id,
            username,
            threads_profile_picture_url,
            threads_biography,
            access_token,
            token_expires_at,
        });

        res.json({
            success: true,
            message: 'Account added successfully',
            account,
        });
    } catch (error) {
        console.error('Error adding account:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add account',
        });
    }
});

/**
 * POST /admin/api/accounts/save-cookies
 * API: Save cookies for an account
 */
router.post('/api/accounts/save-cookies', requireApiAuth, async (req, res) => {
    try {
        const { accountId, cookies } = req.body;

        if (!accountId || !Array.isArray(cookies)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request',
            });
        }

        const account = AccountsModel.findById(accountId);
        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Account not found',
            });
        }

        // Transform cookies to expected format
        const cookieData = cookies.map(cookie => ({
            name: cookie.key || cookie.name,
            value: cookie.value,
            expires: cookie.expires ? Math.floor(new Date(cookie.expires).getTime() / 1000) : null,
        }));

        AccountCookiesModel.saveCookies(accountId, cookieData);

        res.json({
            success: true,
            message: 'Cookies saved successfully',
        });
    } catch (error) {
        console.error('Error saving cookies:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save cookies',
        });
    }
});

/**
 * PUT /admin/api/accounts/:id/switch
 * API: Switch to a different account (only if owned by current user)
 */
router.put('/api/accounts/:id/switch', requireApiAuth, async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const adminUserId = req.adminUser?.id;

        const account = AccountsModel.findById(accountId);
        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Account not found',
            });
        }

        // Check if account belongs to current user
        if (account.admin_user_id !== adminUserId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to use this account',
            });
        }

        if (!account.is_active) {
            return res.status(400).json({
                success: false,
                message: 'Account is not active',
            });
        }

        // Update last used
        AccountsModel.updateLastUsed(accountId);

        // Set current account cookie
        setCurrentAccount(res, accountId);

        // Update session with new access token
        req.session.access_token = account.access_token;

        res.json({
            success: true,
            message: 'Switched to account successfully',
            account,
        });
    } catch (error) {
        console.error('Error switching account:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to switch account',
        });
    }
});

/**
 * PUT /admin/api/accounts/:id
 * API: Update account
 */
router.put('/api/accounts/:id', requireApiAuth, async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const { username, threads_profile_picture_url, threads_biography, is_active } = req.body;

        const updates = {};
        if (username !== undefined) updates.username = username;
        if (threads_profile_picture_url !== undefined) updates.threads_profile_picture_url = threads_profile_picture_url;
        if (threads_biography !== undefined) updates.threads_biography = threads_biography;
        if (is_active !== undefined) updates.is_active = is_active;

        const account = await AccountsModel.update(accountId, updates);

        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Account not found',
            });
        }

        res.json({
            success: true,
            message: 'Account updated successfully',
            account,
        });
    } catch (error) {
        console.error('Error updating account:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update account',
        });
    }
});

/**
 * DELETE /admin/api/accounts/:id
 * API: Delete account (only if owned by current user)
 */
router.delete('/api/accounts/:id', requireApiAuth, async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const adminUserId = req.adminUser?.id;

        // Check if account exists and belongs to current user
        const account = AccountsModel.findById(accountId);
        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Account not found',
            });
        }

        if (account.admin_user_id !== adminUserId) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this account',
            });
        }

        // Check if this is the current account
        if (req.currentAccount && req.currentAccount.id === accountId) {
            clearCurrentAccount(res);
            delete req.session.access_token;
        }

        const deleted = AccountsModel.delete(accountId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Account not found',
            });
        }

        res.json({
            success: true,
            message: 'Account deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete account',
        });
    }
});

module.exports = router;
