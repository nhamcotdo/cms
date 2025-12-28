/**
 * Admin authentication middleware
 * Handles session-based authentication for admin users
 */

const { AdminSessionsModel, AdminUsersModel } = require('../database/accountModels');

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_EXPIRY_DAYS = 7;

/**
 * Require admin authentication
 * Redirects to login if not authenticated
 */
function requireAuth(req, res, next) {
    const sessionToken = req.signedCookies[SESSION_COOKIE_NAME];

    if (!sessionToken) {
        return res.redirect('/admin/auth/login');
    }

    const session = AdminSessionsModel.findByToken(sessionToken);

    if (!session) {
        res.clearCookie(SESSION_COOKIE_NAME);
        return res.redirect('/admin/auth/login');
    }

    const user = AdminUsersModel.findById(session.admin_user_id);

    if (!user || !user.is_active) {
        res.clearCookie(SESSION_COOKIE_NAME);
        return res.redirect('/admin/auth/login');
    }

    req.adminUser = user;
    req.adminSession = session;
    next();
}

/**
 * Optional authentication - doesn't redirect if not authenticated
 */
function optionalAuth(req, res, next) {
    const sessionToken = req.signedCookies[SESSION_COOKIE_NAME];

    if (sessionToken) {
        const session = AdminSessionsModel.findByToken(sessionToken);
        if (session) {
            const user = AdminUsersModel.findById(session.admin_user_id);
            if (user && user.is_active) {
                req.adminUser = user;
                req.adminSession = session;
            }
        }
    }

    next();
}

/**
 * Set admin session cookie
 */
function setSessionCookie(res, sessionToken) {
    res.cookie(SESSION_COOKIE_NAME, sessionToken, {
        signed: true,
        maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    });
}

/**
 * Clear admin session cookie
 */
function clearSessionCookie(res) {
    res.clearCookie(SESSION_COOKIE_NAME);
}

/**
 * API authentication - returns 401 instead of redirect
 */
function requireApiAuth(req, res, next) {
    const sessionToken = req.signedCookies[SESSION_COOKIE_NAME];

    if (!sessionToken) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const session = AdminSessionsModel.findByToken(sessionToken);

    if (!session) {
        res.clearCookie(SESSION_COOKIE_NAME);
        return res.status(401).json({ success: false, message: 'Invalid session' });
    }

    const user = AdminUsersModel.findById(session.admin_user_id);

    if (!user || !user.is_active) {
        res.clearCookie(SESSION_COOKIE_NAME);
        return res.status(401).json({ success: false, message: 'Invalid user' });
    }

    req.adminUser = user;
    req.adminSession = session;
    next();
}

module.exports = {
    requireAuth,
    optionalAuth,
    setSessionCookie,
    clearSessionCookie,
    requireApiAuth,
    SESSION_COOKIE_NAME,
};
