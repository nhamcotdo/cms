/**
 * Account management middleware
 * Handles current account context and multi-account session management
 */

const { AccountsModel, AccountCookiesModel } = require('../database/accountModels');

const CURRENT_ACCOUNT_COOKIE = 'current_account_id';
const THREADS_SESSION_COOKIE = 'threads_session';

/**
 * Load current account from session
 * Sets req.currentAccount for use in routes
 */
function loadCurrentAccount(req, res, next) {
    const accountId = req.signedCookies[CURRENT_ACCOUNT_COOKIE];

    if (accountId) {
        const account = AccountsModel.findById(accountId);
        if (account && account.is_active) {
            req.currentAccount = account;
            AccountsModel.updateLastUsed(account.id);
            return next();
        }
    }

    // No valid account, try to get first active account
    const accounts = AccountsModel.findAll({ is_active: true });

    if (accounts.length > 0) {
        req.currentAccount = accounts[0];
        setCurrentAccount(res, accounts[0].id);
        AccountsModel.updateLastUsed(accounts[0].id);
    }

    next();
}

/**
 * Require a current account to be set
 * Redirects to accounts page if no account available
 */
function requireCurrentAccount(req, res, next) {
    if (!req.currentAccount) {
        return res.redirect('/admin/accounts');
    }

    next();
}

/**
 * Set current account in cookie
 */
function setCurrentAccount(res, accountId) {
    res.cookie(CURRENT_ACCOUNT_COOKIE, accountId, {
        signed: true,
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    });
}

/**
 * Clear current account cookie
 */
function clearCurrentAccount(res) {
    res.clearCookie(CURRENT_ACCOUNT_COOKIE);
}

/**
 * Get access token for current account
 * Also loads cookies for the account into the request
 */
function loadAccountCookies(req, res, next) {
    if (!req.currentAccount) {
        return next();
    }

    const cookies = AccountCookiesModel.findByAccountId(req.currentAccount.id);

    // Store cookies for use in Threads API calls
    req.accountCookies = cookies;

    next();
}

/**
 * Middleware to ensure access token is available
 * Checks session first, then current account
 */
function requireAccessToken(req, res, next) {
    // Check for existing session access token (for OAuth flow)
    if (req.session.access_token) {
        req.accessToken = req.session.access_token;
        return next();
    }

    // Check for current account access token
    if (req.currentAccount && req.currentAccount.access_token) {
        req.accessToken = req.currentAccount.access_token;
        req.session.access_token = req.currentAccount.access_token;
        return next();
    }

    // No access token available
    if (req.path.startsWith('/admin/api/')) {
        return res.status(401).json({
            success: false,
            message: 'No Threads account connected. Please add an account first.',
        });
    }

    return res.redirect('/admin/auth/threads');
}

module.exports = {
    loadCurrentAccount,
    requireCurrentAccount,
    setCurrentAccount,
    clearCurrentAccount,
    loadAccountCookies,
    requireAccessToken,
    CURRENT_ACCOUNT_COOKIE,
};
