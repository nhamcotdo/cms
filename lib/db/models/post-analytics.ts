/**
 * Post Analytics Model
 * TypeScript version with full type safety
 */

import { prepareStatement } from '../index';
import { PostAnalytics, CreatePostAnalyticsInput, UpdatePostAnalyticsInput } from '../schema';

/**
 * Post Analytics Model
 */
export const PostAnalyticsModel = {
  /**
   * Create or update analytics for a post
   */
  upsert(input: CreatePostAnalyticsInput): PostAnalytics | null {
    const existing = this.findByPostId(input.post_id);

    if (existing) {
      return this.update(existing.id, input);
    }

    const stmt = prepareStatement(`
      INSERT INTO post_analytics (
        post_id, thread_id, likes_count, comments_count,
        shares_count, views_count, quote_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.post_id,
      input.thread_id || null,
      input.likes_count || 0,
      input.comments_count || 0,
      input.shares_count || 0,
      input.views_count || 0,
      input.quote_count || 0
    );

    return this.findById(Number(result.lastInsertRowid));
  },

  /**
   * Find analytics by ID
   */
  findById(id: number): PostAnalytics | null {
    const stmt = prepareStatement('SELECT * FROM post_analytics WHERE id = ?');
    return stmt.get(id) as PostAnalytics | null;
  },

  /**
   * Find analytics by post ID
   */
  findByPostId(postId: number): PostAnalytics | null {
    const stmt = prepareStatement('SELECT * FROM post_analytics WHERE post_id = ?');
    return stmt.get(postId) as PostAnalytics | null;
  },

  /**
   * Get all analytics
   */
  findAll(limit?: number): PostAnalytics[] {
    let query = 'SELECT * FROM post_analytics ORDER BY fetched_at DESC';
    if (limit) {
      query += ' LIMIT ?';
      const stmt = prepareStatement(query);
      return stmt.all(limit) as PostAnalytics[];
    }
    const stmt = prepareStatement(query);
    return stmt.all() as PostAnalytics[];
  },

  /**
   * Update analytics
   */
  update(id: number, updates: UpdatePostAnalyticsInput): PostAnalytics | null {
    const fields: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'id') {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    }

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
   * Delete analytics
   */
  delete(id: number): boolean {
    const stmt = prepareStatement('DELETE FROM post_analytics WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get overall statistics
   */
  getOverallStats(): {
    total_posts: number;
    total_likes: number;
    total_comments: number;
    total_shares: number;
    total_views: number;
    avg_likes: number;
    avg_comments: number;
  } {
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
    const result = stmt.get() as any;
    return {
      total_posts: result.total_posts || 0,
      total_likes: result.total_likes || 0,
      total_comments: result.total_comments || 0,
      total_shares: result.total_shares || 0,
      total_views: result.total_views || 0,
      avg_likes: result.avg_likes || 0,
      avg_comments: result.avg_comments || 0,
    };
  },

  /**
   * Get analytics by thread ID
   */
  findByThreadId(threadId: string): PostAnalytics | null {
    const stmt = prepareStatement('SELECT * FROM post_analytics WHERE thread_id = ?');
    return stmt.get(threadId) as PostAnalytics | null;
  },
};
