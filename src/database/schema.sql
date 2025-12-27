-- Database schema for Threads Admin Panel

-- Scheduled posts table
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    media_type TEXT DEFAULT 'TEXT',
    scheduled_for INTEGER NOT NULL,
    status TEXT DEFAULT 'draft',
    container_id TEXT,
    thread_id TEXT,
    attachment_data TEXT,
    reply_control TEXT,
    reply_to_id TEXT,
    link_attachment TEXT,
    topic_tag TEXT,
    quote_post_id TEXT,
    is_spoiler_media INTEGER DEFAULT 0,
    poll_attachment TEXT,
    text_entities TEXT,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    published_at INTEGER
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_for ON scheduled_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_created_at ON scheduled_posts(created_at);

-- Media files table
CREATE TABLE IF NOT EXISTS media_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    url TEXT NOT NULL,
    alt_text TEXT,
    uploaded_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_media_files_uploaded_at ON media_files(uploaded_at);

-- Post history table
CREATE TABLE IF NOT EXISTS post_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    container_id TEXT,
    thread_id TEXT,
    text TEXT,
    media_type TEXT,
    status TEXT DEFAULT 'published',
    published_at INTEGER,
    attachment_data TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_post_history_container_id ON post_history(container_id);
CREATE INDEX IF NOT EXISTS idx_post_history_thread_id ON post_history(thread_id);
CREATE INDEX IF NOT EXISTS idx_post_history_created_at ON post_history(created_at);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Insert default settings if not exists
INSERT OR IGNORE INTO user_settings (key, value) VALUES ('scheduler_enabled', '1');
INSERT OR IGNORE INTO user_settings (key, value) VALUES ('max_file_size', '10485760');
INSERT OR IGNORE INTO user_settings (key, value) VALUES ('allowed_image_types', 'image/jpeg,image/png,image/gif,image/webp');
