/**
 * Database models for Multi-Account Management
 * Provides CRUD operations for accounts, admin users, sessions, analytics, and comments
 */

const { prepareStatement } = require('./init');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Accounts Model - Threads Accounts
 */
const AccountsModel = {
    /**
     * Create a new Threads account
     */
    create(accountData) {
        const stmt = prepareStatement(`
            INSERT INTO accounts (
                threads_user_id, username, threads_profile_picture_url,
                threads_biography, access_token, token_expires_at, is_active, admin_user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            accountData.threads_user_id,
            accountData.username,
            accountData.threads_profile_picture_url || null,
            accountData.threads_biography || null,
            accountData.access_token,
            accountData.token_expires_at || null,
            accountData.is_active !== undefined ? (accountData.is_active ? 1 : 0) : 1,
            accountData.admin_user_id || null
        );

        return this.findById(result.lastInsertRowid);
    },

    /**
     * Find account by ID
     */
    findById(id) {
        const stmt = prepareStatement('SELECT * FROM accounts WHERE id = ?');
        const account = stmt.get(id);
        return account ? this.parseAccountData(account) : null;
    },

    /**
     * Find account by Threads user ID
     */
    findByThreadsUserId(threadsUserId) {
        const stmt = prepareStatement('SELECT * FROM accounts WHERE threads_user_id = ?');
        const account = stmt.get(threadsUserId);
        return account ? this.parseAccountData(account) : null;
    },

    /**
     * Get all accounts
     */
    findAll(filters = {}) {
        let query = 'SELECT * FROM accounts WHERE 1=1';
        const params = [];

        if (filters.admin_user_id !== undefined) {
            query += ' AND admin_user_id = ?';
            params.push(filters.admin_user_id);
        }

        if (filters.is_active !== undefined) {
            query += ' AND is_active = ?';
            params.push(filters.is_active ? 1 : 0);
        }

        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(filters.limit);
        }

        query += ' ORDER BY created_at DESC';

        const stmt = prepareStatement(query);
        const accounts = stmt.all(...params);
        return accounts.map(acc => this.parseAccountData(acc));
    },

    /**
     * Find accounts by admin user ID
     */
    findByAdminUserId(adminUserId) {
        const stmt = prepareStatement('SELECT * FROM accounts WHERE admin_user_id = ? ORDER BY created_at DESC');
        const accounts = stmt.all(adminUserId);
        return accounts.map(acc => this.parseAccountData(acc));
    },

    /**
     * Update account
     */
    update(id, updates) {
        const fields = [];
        const params = [];

        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined && key !== 'id') {
                fields.push(`${key} = ?`);
                params.push(updates[key]);
            }
        });

        if (fields.length === 0) {
            return this.findById(id);
        }

        params.push(id);
        const stmt = prepareStatement(`
            UPDATE accounts
            SET ${fields.join(', ')}, updated_at = strftime('%s', 'now')
            WHERE id = ?
        `);

        stmt.run(...params);
        return this.findById(id);
    },

    /**
     * Update last used timestamp
     */
    updateLastUsed(id) {
        const stmt = prepareStatement(`
            UPDATE accounts SET last_used_at = strftime('%s', 'now') WHERE id = ?
        `);
        stmt.run(id);
    },

    /**
     * Delete account
     */
    delete(id) {
        const stmt = prepareStatement('DELETE FROM accounts WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    },

    /**
     * Parse account data
     */
    parseAccountData(account) {
        if (!account) return null;
        return {
            ...account,
            is_active: Boolean(account.is_active),
        };
    },
};

/**
 * Account Cookies Model
 */
const AccountCookiesModel = {
    /**
     * Save cookies for an account
     */
    saveCookies(accountId, cookies) {
        const deleteStmt = prepareStatement('DELETE FROM account_cookies WHERE account_id = ?');
        deleteStmt.run(accountId);

        const stmt = prepareStatement(`
            INSERT INTO account_cookies (account_id, cookie_name, cookie_value, expires_at)
            VALUES (?, ?, ?, ?)
        `);

        cookies.forEach(cookie => {
            stmt.run(accountId, cookie.name, cookie.value, cookie.expires || null);
        });

        return this.findByAccountId(accountId);
    },

    /**
     * Get cookies for an account
     */
    findByAccountId(accountId) {
        const stmt = prepareStatement('SELECT * FROM account_cookies WHERE account_id = ?');
        return stmt.all(accountId);
    },

    /**
     * Delete cookies for an account
     */
    deleteByAccountId(accountId) {
        const stmt = prepareStatement('DELETE FROM account_cookies WHERE account_id = ?');
        stmt.run(accountId);
    },
};

/**
 * Admin Users Model
 */
const AdminUsersModel = {
    /**
     * Create a new admin user
     */
    async create(userData) {
        const passwordHash = await bcrypt.hash(userData.password, SALT_ROUNDS);

        const stmt = prepareStatement(`
            INSERT INTO admin_users (username, email, password_hash, is_active)
            VALUES (?, ?, ?, ?)
        `);

        const result = stmt.run(
            userData.username,
            userData.email,
            passwordHash,
            userData.is_active !== undefined ? (userData.is_active ? 1 : 0) : 1
        );

        return this.findById(result.lastInsertRowid);
    },

    /**
     * Find admin user by ID
     */
    findById(id) {
        const stmt = prepareStatement('SELECT * FROM admin_users WHERE id = ?');
        const user = stmt.get(id);
        return user ? this.parseUserData(user) : null;
    },

    /**
     * Find admin user by username
     */
    findByUsername(username) {
        const stmt = prepareStatement('SELECT * FROM admin_users WHERE username = ?');
        const user = stmt.get(username);
        return user ? this.parseUserData(user) : null;
    },

    /**
     * Find admin user by email
     */
    findByEmail(email) {
        const stmt = prepareStatement('SELECT * FROM admin_users WHERE email = ?');
        const user = stmt.get(email);
        return user ? this.parseUserData(user) : null;
    },

    /**
     * Verify password
     */
    async verifyPassword(user, password) {
        return bcrypt.compare(password, user.password_hash);
    },

    /**
     * Update user
     */
    async update(id, updates) {
        const fields = [];
        const params = [];

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined && key !== 'id' && key !== 'password') {
                fields.push(`${key} = ?`);
                params.push(value);
            }
        }

        if (fields.length === 0) {
            return this.findById(id);
        }

        params.push(id);
        const stmt = prepareStatement(`
            UPDATE admin_users
            SET ${fields.join(', ')}, updated_at = strftime('%s', 'now')
            WHERE id = ?
        `);

        stmt.run(...params);
        return this.findById(id);
    },

    /**
     * Update password
     */
    async updatePassword(id, newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        const stmt = prepareStatement(`
            UPDATE admin_users
            SET password_hash = ?, updated_at = strftime('%s', 'now')
            WHERE id = ?
        `);
        stmt.run(passwordHash, id);
        return this.findById(id);
    },

    /**
     * Parse user data (keep password hash for verification)
     */
    parseUserData(user) {
        if (!user) return null;
        return {
            id: user.id,
            username: user.username,
            email: user.email,
            password_hash: user.password_hash,
            is_active: Boolean(user.is_active),
            created_at: user.created_at,
            updated_at: user.updated_at,
        };
    },
};

/**
 * Admin Sessions Model
 */
const AdminSessionsModel = {
    /**
     * Create a new session
     */
    create(adminUserId, expiresInSeconds = 604800) {
        const sessionToken = this.generateSessionToken();
        const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

        const stmt = prepareStatement(`
            INSERT INTO admin_sessions (admin_user_id, session_token, expires_at)
            VALUES (?, ?, ?)
        `);

        const result = stmt.run(adminUserId, sessionToken, expiresAt);
        return this.findById(result.lastInsertRowid);
    },

    /**
     * Find session by token
     */
    findByToken(token) {
        const stmt = prepareStatement(`
            SELECT * FROM admin_sessions
            WHERE session_token = ? AND expires_at > strftime('%s', 'now')
        `);
        return stmt.get(token);
    },

    /**
     * Find session by ID
     */
    findById(id) {
        const stmt = prepareStatement('SELECT * FROM admin_sessions WHERE id = ?');
        return stmt.get(id);
    },

    /**
     * Delete session
     */
    delete(token) {
        const stmt = prepareStatement('DELETE FROM admin_sessions WHERE session_token = ?');
        stmt.run(token);
    },

    /**
     * Delete all sessions for a user
     */
    deleteByUserId(userId) {
        const stmt = prepareStatement('DELETE FROM admin_sessions WHERE admin_user_id = ?');
        stmt.run(userId);
    },

    /**
     * Clean up expired sessions
     */
    deleteExpired() {
        const stmt = prepareStatement(`
            DELETE FROM admin_sessions WHERE expires_at <= strftime('%s', 'now')
        `);
        stmt.run();
    },

    /**
     * Generate random session token
     */
    generateSessionToken() {
        return require('crypto').randomBytes(32).toString('hex');
    },
};

/**
 * Post Analytics Model
 */
const PostAnalyticsModel = {
    /**
     * Create or update analytics for a post
     */
    upsert(analyticsData) {
        const existing = this.findByPostId(analyticsData.post_id);

        if (existing) {
            return this.update(existing.id, analyticsData);
        }

        const stmt = prepareStatement(`
            INSERT INTO post_analytics (
                post_id, thread_id, likes_count, comments_count,
                shares_count, views_count, quote_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            analyticsData.post_id,
            analyticsData.thread_id || null,
            analyticsData.likes_count || 0,
            analyticsData.comments_count || 0,
            analyticsData.shares_count || 0,
            analyticsData.views_count || 0,
            analyticsData.quote_count || 0
        );

        return this.findById(result.lastInsertRowid);
    },

    /**
     * Find analytics by ID
     */
    findById(id) {
        const stmt = prepareStatement('SELECT * FROM post_analytics WHERE id = ?');
        return stmt.get(id);
    },

    /**
     * Find analytics by post ID
     */
    findByPostId(postId) {
        const stmt = prepareStatement('SELECT * FROM post_analytics WHERE post_id = ?');
        return stmt.get(postId);
    },

    /**
     * Get all analytics
     */
    findAll(limit) {
        let query = 'SELECT * FROM post_analytics ORDER BY fetched_at DESC';
        if (limit) {
            query += ' LIMIT ?';
            const stmt = prepareStatement(query);
            return stmt.all(limit);
        }
        const stmt = prepareStatement(query);
        return stmt.all();
    },

    /**
     * Update analytics
     */
    update(id, updates) {
        const fields = [];
        const params = [];

        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined && key !== 'id') {
                fields.push(`${key} = ?`);
                params.push(updates[key]);
            }
        });

        if (fields.length === 0) {
            return this.findById(id);
        }

        params.push(id);
        const stmt = prepareStatement(`
            UPDATE post_analytics
            SET ${fields.join(', ')}, fetched_at = strftime('%s', 'now')
            WHERE id = ?
        `);

        stmt.run(...params);
        return this.findById(id);
    },

    /**
     * Get overall statistics
     */
    getOverallStats() {
        const stmt = prepareStatement(`
            SELECT
                COUNT(*) as total_posts,
                SUM(likes_count) as total_likes,
                SUM(comments_count) as total_comments,
                SUM(shares_count) as total_shares,
                SUM(views_count) as total_views,
                AVG(likes_count) as avg_likes,
                AVG(comments_count) as avg_comments
            FROM post_analytics
        `);
        return stmt.get();
    },
};

/**
 * Post Comments Model
 */
const PostCommentsModel = {
    /**
     * Create a new comment record
     */
    create(commentData) {
        const stmt = prepareStatement(`
            INSERT INTO post_comments (
                post_id, thread_id, comment_id, comment_text,
                author_username, author_avatar_url
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            commentData.post_id,
            commentData.thread_id,
            commentData.comment_id,
            commentData.comment_text,
            commentData.author_username || null,
            commentData.author_avatar_url || null
        );

        return this.findById(result.lastInsertRowid);
    },

    /**
     * Find comment by ID
     */
    findById(id) {
        const stmt = prepareStatement('SELECT * FROM post_comments WHERE id = ?');
        return stmt.get(id);
    },

    /**
     * Find comments by post ID
     */
    findByPostId(postId) {
        const stmt = prepareStatement(`
            SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at DESC
        `);
        return stmt.all(postId);
    },

    /**
     * Find by comment ID (Threads ID)
     */
    findByCommentId(commentId) {
        const stmt = prepareStatement('SELECT * FROM post_comments WHERE comment_id = ?');
        return stmt.get(commentId);
    },

    /**
     * Get all comments
     */
    findAll(limit) {
        let query = 'SELECT * FROM post_comments ORDER BY created_at DESC';
        if (limit) {
            query += ' LIMIT ?';
            const stmt = prepareStatement(query);
            return stmt.all(limit);
        }
        const stmt = prepareStatement(query);
        return stmt.all();
    },

    /**
     * Delete comment
     */
    delete(id) {
        const stmt = prepareStatement('DELETE FROM post_comments WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    },

    /**
     * Delete comments by post ID
     */
    deleteByPostId(postId) {
        const stmt = prepareStatement('DELETE FROM post_comments WHERE post_id = ?');
        stmt.run(postId);
    },

    /**
     * Get comment count by post
     */
    getCountByPostId(postId) {
        const stmt = prepareStatement(`
            SELECT COUNT(*) as count FROM post_comments WHERE post_id = ?
        `);
        const result = stmt.get(postId);
        return result ? result.count : 0;
    },
};

/**
 * Bulk Imports Model
 */
const BulkImportsModel = {
    /**
     * Create a new bulk import record
     */
    create(importData) {
        const stmt = prepareStatement(`
            INSERT INTO bulk_imports (
                admin_user_id, file_name, total_rows, success_count, error_count, status
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            importData.admin_user_id,
            importData.file_name,
            importData.total_rows || 0,
            importData.success_count || 0,
            importData.error_count || 0,
            importData.status || 'pending'
        );

        return this.findById(result.lastInsertRowid);
    },

    /**
     * Find bulk import by ID
     */
    findById(id) {
        const stmt = prepareStatement('SELECT * FROM bulk_imports WHERE id = ?');
        const imp = stmt.get(id);
        return imp ? this.parseImportData(imp) : null;
    },

    /**
     * Find imports by admin user ID
     */
    findByAdminUserId(adminUserId) {
        const stmt = prepareStatement(`
            SELECT * FROM bulk_imports WHERE admin_user_id = ? ORDER BY created_at DESC
        `);
        const imports = stmt.all(adminUserId);
        return imports.map(imp => this.parseImportData(imp));
    },

    /**
     * Get all imports
     */
    findAll(limit) {
        let query = 'SELECT * FROM bulk_imports ORDER BY created_at DESC';
        if (limit) {
            query += ' LIMIT ?';
            const stmt = prepareStatement(query);
            return stmt.all(limit).map(imp => this.parseImportData(imp));
        }
        const stmt = prepareStatement(query);
        return stmt.all().map(imp => this.parseImportData(imp));
    },

    /**
     * Update import
     */
    update(id, updates) {
        const fields = [];
        const params = [];

        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined && key !== 'id') {
                fields.push(`${key} = ?`);
                params.push(updates[key]);
            }
        });

        if (fields.length === 0) {
            return this.findById(id);
        }

        params.push(id);
        const stmt = prepareStatement(`
            UPDATE bulk_imports SET ${fields.join(', ')}
            WHERE id = ?
        `);

        stmt.run(...params);

        if (updates.status === 'completed' || updates.status === 'failed') {
            const completeStmt = prepareStatement(`
                UPDATE bulk_imports SET completed_at = strftime('%s', 'now')
                WHERE id = ?
            `);
            completeStmt.run(id);
        }

        return this.findById(id);
    },

    /**
     * Parse import data
     */
    parseImportData(imp) {
        if (!imp) return null;
        return {
            ...imp,
        };
    },
};

module.exports = {
    AccountsModel,
    AccountCookiesModel,
    AdminUsersModel,
    AdminSessionsModel,
    PostAnalyticsModel,
    PostCommentsModel,
    BulkImportsModel,
    SALT_ROUNDS,
};
