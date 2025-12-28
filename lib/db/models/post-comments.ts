/**
 * Post Comments Model
 * TypeScript version with full type safety
 */

import { prepareStatement } from '../index';
import { PostComment, CreatePostCommentInput } from '../schema';

/**
 * Post Comments Model
 */
export const PostCommentsModel = {
  /**
   * Create a new comment record
   */
  create(input: CreatePostCommentInput): PostComment | null {
    const stmt = prepareStatement(`
      INSERT INTO post_comments (
        post_id, thread_id, comment_id, comment_text,
        author_username, author_avatar_url
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.post_id,
      input.thread_id,
      input.comment_id,
      input.comment_text,
      input.author_username || null,
      input.author_avatar_url || null
    );

    return this.findById(Number(result.lastInsertRowid));
  },

  /**
   * Find comment by ID
   */
  findById(id: number): PostComment | null {
    const stmt = prepareStatement('SELECT * FROM post_comments WHERE id = ?');
    return stmt.get(id) as PostComment | null;
  },

  /**
   * Find comments by post ID
   */
  findByPostId(postId: number): PostComment[] {
    const stmt = prepareStatement(`
      SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at DESC
    `);
    return stmt.all(postId) as PostComment[];
  },

  /**
   * Find by comment ID (Threads ID)
   */
  findByCommentId(commentId: string): PostComment | null {
    const stmt = prepareStatement('SELECT * FROM post_comments WHERE comment_id = ?');
    return stmt.get(commentId) as PostComment | null;
  },

  /**
   * Get all comments
   */
  findAll(limit?: number): PostComment[] {
    let query = 'SELECT * FROM post_comments ORDER BY created_at DESC';
    if (limit) {
      query += ' LIMIT ?';
      const stmt = prepareStatement(query);
      return stmt.all(limit) as PostComment[];
    }
    const stmt = prepareStatement(query);
    return stmt.all() as PostComment[];
  },

  /**
   * Find comments by thread ID
   */
  findByThreadId(threadId: string): PostComment[] {
    const stmt = prepareStatement(`
      SELECT * FROM post_comments WHERE thread_id = ? ORDER BY created_at DESC
    `);
    return stmt.all(threadId) as PostComment[];
  },

  /**
   * Delete comment
   */
  delete(id: number): boolean {
    const stmt = prepareStatement('DELETE FROM post_comments WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete comments by post ID
   */
  deleteByPostId(postId: number): void {
    const stmt = prepareStatement('DELETE FROM post_comments WHERE post_id = ?');
    stmt.run(postId);
  },

  /**
   * Get comment count by post
   */
  getCountByPostId(postId: number): number {
    const stmt = prepareStatement(`
      SELECT COUNT(*) as count FROM post_comments WHERE post_id = ?
    `);
    const result = stmt.get(postId) as { count: number } | undefined;
    return result?.count || 0;
  },

  /**
   * Bulk insert comments for a post
   */
  bulkInsert(comments: CreatePostCommentInput[]): PostComment[] {
    const stmt = prepareStatement(`
      INSERT INTO post_comments (
        post_id, thread_id, comment_id, comment_text,
        author_username, author_avatar_url
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const inserted: PostComment[] = [];

    comments.forEach(comment => {
      const result = stmt.run(
        comment.post_id,
        comment.thread_id,
        comment.comment_id,
        comment.comment_text,
        comment.author_username || null,
        comment.author_avatar_url || null
      );
      const insertedComment = this.findById(Number(result.lastInsertRowid));
      if (insertedComment) {
        inserted.push(insertedComment);
      }
    });

    return inserted;
  },
};
