/**
 * Admin authentication routes
 * Handles user registration, login, logout, and session management
 */

const express = require('express');
const router = express.Router();
const { AdminUsersModel, AdminSessionsModel } = require('../database/accountModels');
const {
    requireAuth,
    setSessionCookie,
    clearSessionCookie,
    requireApiAuth,
} = require('../middleware/auth');

/**
 * GET /admin/auth/login
 * Display login form
 */
router.get('/login', (req, res) => {
    // Check if already logged in with VALID session
    const sessionToken = req.signedCookies.admin_session;
    if (sessionToken) {
        const session = AdminSessionsModel.findByToken(sessionToken);
        if (session && session.expires_at > Math.floor(Date.now() / 1000)) {
            const user = AdminUsersModel.findById(session.admin_user_id);
            if (user && user.is_active) {
                return res.redirect('/admin/platforms');
            }
        }
        // Clear invalid/expired session cookie
        res.clearCookie('admin_session');
    }

    res.render('auth/login', {
        title: 'Login - Threads Admin',
        error: null,
    });
});

/**
 * POST /admin/auth/login
 * Process login form
 */
router.post('/login', async (req, res) => {
    const { username, password, remember } = req.body;

    if (!username || !password) {
        return res.render('auth/login', {
            title: 'Login - Threads Admin',
            error: 'Please provide username and password',
        });
    }

    try {
        // Find user by username or email
        let user = AdminUsersModel.findByUsername(username);
        if (!user) {
            user = AdminUsersModel.findByEmail(username);
        }

        if (!user) {
            return res.render('auth/login', {
                title: 'Login - Threads Admin',
                error: 'Invalid username or password',
            });
        }

        if (!user.is_active) {
            return res.render('auth/login', {
                title: 'Login - Threads Admin',
                error: 'Account is disabled',
            });
        }

        // Verify password
        const isValid = await AdminUsersModel.verifyPassword(user, password);
        if (!isValid) {
            return res.render('auth/login', {
                title: 'Login - Threads Admin',
                error: 'Invalid username or password',
            });
        }

        // Create session
        const sessionExpiry = remember ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60; // 30 days or 7 days
        const session = AdminSessionsModel.create(user.id, sessionExpiry);

        // Set session cookie
        setSessionCookie(res, session.session_token);

        // Redirect to intended page or platforms
        const redirectTo = req.query.redirect || '/admin/platforms';
        res.redirect(redirectTo);
    } catch (error) {
        console.error('Login error:', error);
        res.render('auth/login', {
            title: 'Login - Threads Admin',
            error: 'An error occurred during login',
        });
    }
});

/**
 * GET /admin/auth/register
 * Display registration form
 */
router.get('/register', (req, res) => {
    // Check if already logged in with VALID session
    const sessionToken = req.signedCookies.admin_session;
    if (sessionToken) {
        const session = AdminSessionsModel.findByToken(sessionToken);
        if (session && session.expires_at > Math.floor(Date.now() / 1000)) {
            const user = AdminUsersModel.findById(session.admin_user_id);
            if (user && user.is_active) {
                return res.redirect('/admin/platforms');
            }
        }
        // Clear invalid/expired session cookie
        res.clearCookie('admin_session');
    }

    res.render('auth/register', {
        title: 'Register - Threads Admin',
        error: null,
    });
});

/**
 * POST /admin/auth/register
 * Process registration form
 */
router.post('/register', async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    // Validation
    if (!username || !email || !password) {
        return res.render('auth/register', {
            title: 'Register - Threads Admin',
            error: 'All fields are required',
        });
    }

    if (password !== confirmPassword) {
        return res.render('auth/register', {
            title: 'Register - Threads Admin',
            error: 'Passwords do not match',
        });
    }

    if (password.length < 8) {
        return res.render('auth/register', {
            title: 'Register - Threads Admin',
            error: 'Password must be at least 8 characters',
        });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.render('auth/register', {
            title: 'Register - Threads Admin',
            error: 'Invalid email address',
        });
    }

    try {
        // Check if username exists
        const existingUsername = AdminUsersModel.findByUsername(username);
        if (existingUsername) {
            return res.render('auth/register', {
                title: 'Register - Threads Admin',
                error: 'Username already taken',
            });
        }

        // Check if email exists
        const existingEmail = AdminUsersModel.findByEmail(email);
        if (existingEmail) {
            return res.render('auth/register', {
                title: 'Register - Threads Admin',
                error: 'Email already registered',
            });
        }

        // Create user
        await AdminUsersModel.create({
            username,
            email,
            password,
        });

        // Auto-login after registration
        const user = AdminUsersModel.findByUsername(username);
        const session = AdminSessionsModel.create(user.id);
        setSessionCookie(res, session.session_token);

        res.redirect('/admin/platforms');
    } catch (error) {
        console.error('Registration error:', error);
        res.render('auth/register', {
            title: 'Register - Threads Admin',
            error: 'An error occurred during registration',
        });
    }
});

/**
 * POST /admin/auth/logout
 * Logout current user
 */
router.post('/logout', (req, res) => {
    const sessionToken = req.signedCookies.admin_session;

    if (sessionToken) {
        AdminSessionsModel.delete(sessionToken);
    }

    clearSessionCookie(res);
    res.redirect('/admin/auth/login');
});

/**
 * GET /admin/auth/logout
 * Logout via GET (for convenience)
 */
router.get('/logout', (req, res) => {
    const sessionToken = req.signedCookies.admin_session;

    if (sessionToken) {
        AdminSessionsModel.delete(sessionToken);
    }

    clearSessionCookie(res);
    res.redirect('/admin/auth/login');
});

/**
 * GET /admin/api/auth/me
 * Get current authenticated user
 */
router.get('/api/me', requireApiAuth, (req, res) => {
    res.json({
        success: true,
        user: req.adminUser,
    });
});

/**
 * POST /admin/api/auth/logout
 * API logout endpoint
 */
router.post('/api/logout', requireApiAuth, (req, res) => {
    const sessionToken = req.signedCookies.admin_session;

    if (sessionToken) {
        AdminSessionsModel.delete(sessionToken);
    }

    clearSessionCookie(res);
    res.json({
        success: true,
        message: 'Logged out successfully',
    });
});

module.exports = router;
