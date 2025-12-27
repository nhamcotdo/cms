/**
 * Database models for Threads Admin Panel
 * Provides CRUD operations for scheduled posts, media files, and post history
 */

const { prepareStatement } = require('./init');

const POST_STATUS = {
    DRAFT: 'draft',
    SCHEDULED: 'scheduled',
    PUBLISHING: 'publishing',
    PUBLISHED: 'published',
    FAILED: 'failed',
};

/**
 * Scheduled Posts Model
 */
const ScheduledPostsModel = {
    /**
     * Create a new scheduled post
     */
    create(postData) {
        const stmt = prepareStatement(`
            INSERT INTO scheduled_posts (
                text, media_type, scheduled_for, status, attachment_data,
                reply_control, reply_to_id, link_attachment, topic_tag,
                quote_post_id, is_spoiler_media, poll_attachment, text_entities
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            postData.text,
            postData.media_type || 'TEXT',
            postData.scheduled_for,
            postData.status || POST_STATUS.SCHEDULED,
            postData.attachment_data ? JSON.stringify(postData.attachment_data) : null,
            postData.reply_control || null,
            postData.reply_to_id || null,
            postData.link_attachment || null,
            postData.topic_tag || null,
            postData.quote_post_id || null,
            postData.is_spoiler_media ? 1 : 0,
            postData.poll_attachment ? JSON.stringify(postData.poll_attachment) : null,
            postData.text_entities ? JSON.stringify(postData.text_entities) : null
        );

        return this.findById(result.lastInsertRowid);
    },

    /**
     * Find scheduled post by ID
     */
    findById(id) {
        const stmt = prepareStatement('SELECT * FROM scheduled_posts WHERE id = ?');
        const post = stmt.get(id);
        return post ? this.parsePostData(post) : null;
    },

    /**
     * Get all scheduled posts with optional filters
     */
    findAll(filters = {}) {
        let query = 'SELECT * FROM scheduled_posts WHERE 1=1';
        const params = [];

        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }

        if (filters.before) {
            query += ' AND scheduled_for < ?';
            params.push(filters.before);
        }

        if (filters.after) {
            query += ' AND scheduled_for > ?';
            params.push(filters.after);
        }

        query += ' ORDER BY scheduled_for ASC';

        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(filters.limit);
        }

        const stmt = prepareStatement(query);
        const posts = stmt.all(...params);
        return posts.map(post => this.parsePostData(post));
    },

    /**
     * Update scheduled post
     */
    update(id, updates) {
        const fields = [];
        const params = [];

        const jsonFields = ['attachment_data', 'poll_attachment', 'text_entities'];
        const booleanFields = ['is_spoiler_media'];

        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined && key !== 'id') {
                fields.push(`${key} = ?`);

                if (jsonFields.includes(key) && updates[key] !== null) {
                    params.push(JSON.stringify(updates[key]));
                } else if (booleanFields.includes(key)) {
                    params.push(updates[key] ? 1 : 0);
                } else {
                    params.push(updates[key]);
                }
            }
        });

        if (fields.length === 0) {
            return this.findById(id);
        }

        params.push(id);
        const stmt = prepareStatement(`
            UPDATE scheduled_posts
            SET ${fields.join(', ')}, updated_at = strftime('%s', 'now')
            WHERE id = ?
        `);

        stmt.run(...params);
        return this.findById(id);
    },

    /**
     * Delete scheduled post
     */
    delete(id) {
        const stmt = prepareStatement('DELETE FROM scheduled_posts WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    },

    /**
     * Get posts due for publishing
     */
    getDuePosts() {
        const now = Math.floor(Date.now() / 1000);
        const stmt = prepareStatement(`
            SELECT * FROM scheduled_posts
            WHERE status = ? AND scheduled_for <= ?
            ORDER BY scheduled_for ASC
        `);

        const posts = stmt.all(POST_STATUS.SCHEDULED, now);
        return posts.map(post => this.parsePostData(post));
    },

    /**
     * Parse JSON fields from database
     */
    parsePostData(post) {
        if (!post) return null;

        return {
            ...post,
            is_spoiler_media: Boolean(post.is_spoiler_media),
            attachment_data: post.attachment_data ? JSON.parse(post.attachment_data) : null,
            poll_attachment: post.poll_attachment ? JSON.parse(post.poll_attachment) : null,
            text_entities: post.text_entities ? JSON.parse(post.text_entities) : null,
        };
    },
};

/**
 * Media Files Model
 */
const MediaFilesModel = {
    /**
     * Create a new media file record
     */
    create(fileData) {
        const stmt = prepareStatement(`
            INSERT INTO media_files (
                filename, original_name, mime_type, file_size, file_path, url, alt_text
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            fileData.filename,
            fileData.original_name,
            fileData.mime_type,
            fileData.file_size,
            fileData.file_path,
            fileData.url,
            fileData.alt_text || null
        );

        return this.findById(result.lastInsertRowid);
    },

    /**
     * Find media file by ID
     */
    findById(id) {
        const stmt = prepareStatement('SELECT * FROM media_files WHERE id = ?');
        return stmt.get(id);
    },

    /**
     * Find media file by filename
     */
    findByFilename(filename) {
        const stmt = prepareStatement('SELECT * FROM media_files WHERE filename = ?');
        return stmt.get(filename);
    },

    /**
     * Get all media files
     */
    findAll(limit) {
        let query = 'SELECT * FROM media_files ORDER BY uploaded_at DESC';
        if (limit) {
            query += ' LIMIT ?';
            const stmt = prepareStatement(query);
            return stmt.all(limit);
        }
        const stmt = prepareStatement(query);
        return stmt.all();
    },

    /**
     * Delete media file record
     */
    delete(id) {
        const stmt = prepareStatement('DELETE FROM media_files WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    },
};

/**
 * Post History Model
 */
const PostHistoryModel = {
    /**
     * Create a post history record
     */
    create(historyData) {
        const stmt = prepareStatement(`
            INSERT INTO post_history (
                container_id, thread_id, text, media_type, status,
                published_at, attachment_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            historyData.container_id,
            historyData.thread_id || null,
            historyData.text || null,
            historyData.media_type || null,
            historyData.status || 'published',
            historyData.published_at || Math.floor(Date.now() / 1000),
            historyData.attachment_data ? JSON.stringify(historyData.attachment_data) : null
        );

        return this.findById(result.lastInsertRowid);
    },

    /**
     * Find post history by ID
     */
    findById(id) {
        const stmt = prepareStatement('SELECT * FROM post_history WHERE id = ?');
        const history = stmt.get(id);
        return history ? this.parseHistoryData(history) : null;
    },

    /**
     * Find by container ID
     */
    findByContainerId(containerId) {
        const stmt = prepareStatement('SELECT * FROM post_history WHERE container_id = ?');
        const history = stmt.get(containerId);
        return history ? this.parseHistoryData(history) : null;
    },

    /**
     * Get all post history
     */
    findAll(limit) {
        let query = 'SELECT * FROM post_history ORDER BY created_at DESC';
        if (limit) {
            query += ' LIMIT ?';
            const stmt = prepareStatement(query);
            return stmt.all(limit).map(h => this.parseHistoryData(h));
        }
        const stmt = prepareStatement(query);
        return stmt.all().map(h => this.parseHistoryData(h));
    },

    /**
     * Parse JSON fields from database
     */
    parseHistoryData(history) {
        if (!history) return null;

        return {
            ...history,
            attachment_data: history.attachment_data ? JSON.parse(history.attachment_data) : null,
        };
    },
};

/**
 * User Settings Model
 */
const UserSettingsModel = {
    /**
     * Get setting value by key
     */
    get(key) {
        const stmt = prepareStatement('SELECT value FROM user_settings WHERE key = ?');
        const result = stmt.get(key);
        return result ? result.value : null;
    },

    /**
     * Set setting value
     */
    set(key, value) {
        const stmt = prepareStatement(`
            INSERT INTO user_settings (key, value, updated_at)
            VALUES (?, ?, strftime('%s', 'now'))
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = strftime('%s', 'now')
        `);
        stmt.run(key, value);
        return this.get(key);
    },

    /**
     * Get all settings
     */
    getAll() {
        const stmt = prepareStatement('SELECT * FROM user_settings');
        const settings = stmt.all();
        const result = {};
        settings.forEach(setting => {
            result[setting.key] = setting.value;
        });
        return result;
    },
};

module.exports = {
    POST_STATUS,
    ScheduledPostsModel,
    MediaFilesModel,
    PostHistoryModel,
    UserSettingsModel,
};
