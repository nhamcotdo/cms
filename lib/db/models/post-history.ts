/**
 * Post History Model
 * TypeScript version with full type safety
 */

import { prepareStatement } from '../index';
import { PostHistory, CreatePostHistoryInput } from '../schema';

/**
 * Parse JSON fields from database
 */
function parseHistoryData(history: any): PostHistory {
  if (!history) return history;

  return {
    ...history,
    attachment_data: history.attachment_data ? JSON.parse(history.attachment_data) : null,
  } as PostHistory;
}

/**
 * Post History Model
 */
export const PostHistoryModel = {
  /**
   * Create a post history record
   */
  create(input: CreatePostHistoryInput): PostHistory | null {
    const stmt = prepareStatement(`
      INSERT INTO post_history (
        container_id, thread_id, text, media_type, status,
        published_at, attachment_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.container_id,
      input.thread_id || null,
      input.text || null,
      input.media_type || null,
      input.status || 'published',
      input.published_at || Math.floor(Date.now() / 1000),
      input.attachment_data ? JSON.stringify(input.attachment_data) : null
    );

    return this.findById(Number(result.lastInsertRowid));
  },

  /**
   * Find post history by ID
   */
  findById(id: number): PostHistory | null {
    const stmt = prepareStatement('SELECT * FROM post_history WHERE id = ?');
    const history = stmt.get(id);
    return history ? parseHistoryData(history) : null;
  },

  /**
   * Find by container ID
   */
  findByContainerId(containerId: string): PostHistory | null {
    const stmt = prepareStatement('SELECT * FROM post_history WHERE container_id = ?');
    const history = stmt.get(containerId);
    return history ? parseHistoryData(history) : null;
  },

  /**
   * Get all post history
   */
  findAll(limit?: number): PostHistory[] {
    let query = 'SELECT * FROM post_history ORDER BY created_at DESC';
    if (limit) {
      query += ' LIMIT ?';
      const stmt = prepareStatement(query);
      return stmt.all(limit).map(h => parseHistoryData(h));
    }
    const stmt = prepareStatement(query);
    return stmt.all().map(h => parseHistoryData(h));
  },

  /**
   * Find by thread ID
   */
  findByThreadId(threadId: string): PostHistory[] {
    const stmt = prepareStatement('SELECT * FROM post_history WHERE thread_id = ? ORDER BY created_at DESC');
    const history = stmt.all(threadId);
    return history.map(h => parseHistoryData(h));
  },

  /**
   * Get count
   */
  count(): number {
    const stmt = prepareStatement('SELECT COUNT(*) as count FROM post_history');
    const result = stmt.get() as { count: number } | undefined;
    return result?.count || 0;
  },
};
