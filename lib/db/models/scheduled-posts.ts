/**
 * Scheduled Posts Model
 * TypeScript version with full type safety
 */

import { prepareStatement } from '../index';
import {
  ScheduledPost,
  CreateScheduledPostInput,
  UpdateScheduledPostInput,
  POST_STATUS,
} from '../schema';

/**
 * Parse JSON fields from database
 */
function parsePostData(post: any): ScheduledPost {
  if (!post) return post;

  return {
    ...post,
    is_spoiler_media: Boolean(post.is_spoiler_media),
    attachment_data: post.attachment_data ? JSON.parse(post.attachment_data) : null,
    poll_attachment: post.poll_attachment ? JSON.parse(post.poll_attachment) : null,
    text_entities: post.text_entities ? JSON.parse(post.text_entities) : null,
  } as ScheduledPost;
}

/**
 * Scheduled Posts Model
 */
export const ScheduledPostsModel = {
  /**
   * Create a new scheduled post
   */
  create(input: CreateScheduledPostInput): ScheduledPost | null {
    const stmt = prepareStatement(`
      INSERT INTO scheduled_posts (
        text, media_type, scheduled_for, status, attachment_data,
        reply_control, reply_to_id, link_attachment, topic_tag,
        quote_post_id, is_spoiler_media, poll_attachment, text_entities, account_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.text,
      input.media_type || 'TEXT',
      input.scheduled_for,
      input.status || POST_STATUS.SCHEDULED,
      input.attachment_data ? JSON.stringify(input.attachment_data) : null,
      input.reply_control || null,
      input.reply_to_id || null,
      input.link_attachment || null,
      input.topic_tag || null,
      input.quote_post_id || null,
      input.is_spoiler_media ? 1 : 0,
      input.poll_attachment ? JSON.stringify(input.poll_attachment) : null,
      input.text_entities ? JSON.stringify(input.text_entities) : null,
      input.account_id || null
    );

    return this.findById(Number(result.lastInsertRowid));
  },

  /**
   * Find scheduled post by ID
   */
  findById(id: number): ScheduledPost | null {
    const stmt = prepareStatement('SELECT * FROM scheduled_posts WHERE id = ?');
    const post = stmt.get(id);
    return post ? parsePostData(post) : null;
  },

  /**
   * Get all scheduled posts with optional filters
   */
  findAll(filters?: {
    status?: string;
    before?: number;
    after?: number;
    account_id?: number;
    limit?: number;
  }): ScheduledPost[] {
    let query = 'SELECT * FROM scheduled_posts WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.before) {
      query += ' AND scheduled_for < ?';
      params.push(filters.before);
    }

    if (filters?.after) {
      query += ' AND scheduled_for > ?';
      params.push(filters.after);
    }

    if (filters?.account_id !== undefined) {
      query += ' AND account_id = ?';
      params.push(filters.account_id);
    }

    query += ' ORDER BY scheduled_for ASC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = prepareStatement(query);
    const posts = stmt.all(...params);
    return posts.map(post => parsePostData(post));
  },

  /**
   * Update scheduled post
   */
  update(id: number, updates: UpdateScheduledPostInput): ScheduledPost | null {
    const fields: string[] = [];
    const params: any[] = [];

    const jsonFields = ['attachment_data', 'poll_attachment', 'text_entities'];
    const booleanFields = ['is_spoiler_media'];

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'id') {
        fields.push(`${key} = ?`);

        if (jsonFields.includes(key) && value !== null) {
          params.push(JSON.stringify(value));
        } else if (booleanFields.includes(key)) {
          params.push(value ? 1 : 0);
        } else {
          params.push(value);
        }
      }
    }

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
  delete(id: number): boolean {
    const stmt = prepareStatement('DELETE FROM scheduled_posts WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get posts due for publishing
   */
  getDuePosts(): ScheduledPost[] {
    const now = Math.floor(Date.now() / 1000);
    const stmt = prepareStatement(`
      SELECT * FROM scheduled_posts
      WHERE status = ? AND scheduled_for <= ?
      ORDER BY scheduled_for ASC
    `);

    const posts = stmt.all(POST_STATUS.SCHEDULED, now);
    return posts.map(post => parsePostData(post));
  },

  /**
   * Get posts by account ID
   */
  findByAccountId(accountId: number): ScheduledPost[] {
    const stmt = prepareStatement('SELECT * FROM scheduled_posts WHERE account_id = ? ORDER BY scheduled_for DESC');
    const posts = stmt.all(accountId);
    return posts.map(post => parsePostData(post));
  },

  /**
   * Count posts by status
   */
  countByStatus(status?: string): number {
    let query = 'SELECT COUNT(*) as count FROM scheduled_posts';
    if (status) {
      query += ' WHERE status = ?';
    }
    const stmt = prepareStatement(query);
    const result = status ? stmt.get(status) : stmt.get();
    return (result as any)?.count || 0;
  },
};
