-- Migration 001: Multi-Account Management & Analytics
-- This migration adds support for multiple Threads accounts,
-- admin authentication, analytics tracking, and commenting

-- Accounts table - Store multiple Threads accounts
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    threads_user_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    threads_profile_picture_url TEXT,
    threads_biography TEXT,
    access_token TEXT NOT NULL,
    token_expires_at INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    last_used_at INTEGER
);

-- Account cookies table - Store session cookies for each account
CREATE TABLE IF NOT EXISTS account_cookies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    cookie_name TEXT NOT NULL,
    cookie_value TEXT NOT NULL,
    expires_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Admin users table - Local admin authentication
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Admin sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user_id INTEGER NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- Post analytics table - Track engagement metrics
CREATE TABLE IF NOT EXISTS post_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    thread_id TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    quote_count INTEGER DEFAULT 0,
    fetched_at INTEGER DEFAULT (strftime('%s', 'now')),
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (post_id) REFERENCES scheduled_posts(id) ON DELETE CASCADE
);

-- Post comments table - Store comments from Threads
CREATE TABLE IF NOT EXISTS post_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    thread_id TEXT NOT NULL,
    comment_id TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    author_username TEXT,
    author_avatar_url TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (post_id) REFERENCES scheduled_posts(id) ON DELETE CASCADE
);

-- Bulk imports table - Track bulk import operations
CREATE TABLE IF NOT EXISTS bulk_imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_user_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    total_rows INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    completed_at INTEGER,
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- Add account_id column to scheduled_posts for multi-account support
ALTER TABLE scheduled_posts ADD COLUMN account_id INTEGER DEFAULT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_accounts_threads_user_id ON accounts(threads_user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_account_cookies_account_id ON account_cookies(account_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_session_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_post_analytics_post_id ON post_analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_thread_id ON post_comments(thread_id);
CREATE INDEX IF NOT EXISTS idx_bulk_imports_admin_user_id ON bulk_imports(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_account_id ON scheduled_posts(account_id);
