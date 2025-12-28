/**
 * Admin Sessions Model
 * TypeScript version with full type safety
 */

import { randomBytes } from 'crypto';
import { prepareStatement } from '../index';
import { AdminSession } from '../schema';

/**
 * Admin Sessions Model
 */
export const AdminSessionsModel = {
  /**
   * Create a new session
   */
  create(adminUserId: number, expiresInSeconds: number = 604800): AdminSession | null {
    const sessionToken = this.generateSessionToken();
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

    const stmt = prepareStatement(`
      INSERT INTO admin_sessions (admin_user_id, session_token, expires_at)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(adminUserId, sessionToken, expiresAt);
    return this.findById(Number(result.lastInsertRowid));
  },

  /**
   * Find session by token
   */
  findByToken(token: string): AdminSession | null {
    const stmt = prepareStatement(`
      SELECT * FROM admin_sessions
      WHERE session_token = ? AND expires_at > strftime('%s', 'now')
    `);
    return stmt.get(token) as AdminSession | null;
  },

  /**
   * Find session by ID
   */
  findById(id: number): AdminSession | null {
    const stmt = prepareStatement('SELECT * FROM admin_sessions WHERE id = ?');
    return stmt.get(id) as AdminSession | null;
  },

  /**
   * Validate session and return user ID if valid
   */
  validateAndGetUserId(token: string): number | null {
    const session = this.findByToken(token);
    return session ? session.admin_user_id : null;
  },

  /**
   * Delete session
   */
  delete(token: string): void {
    const stmt = prepareStatement('DELETE FROM admin_sessions WHERE session_token = ?');
    stmt.run(token);
  },

  /**
   * Delete all sessions for a user
   */
  deleteByUserId(userId: number): void {
    const stmt = prepareStatement('DELETE FROM admin_sessions WHERE admin_user_id = ?');
    stmt.run(userId);
  },

  /**
   * Clean up expired sessions
   */
  deleteExpired(): number {
    const stmt = prepareStatement(`
      DELETE FROM admin_sessions WHERE expires_at <= strftime('%s', 'now')
    `);
    const result = stmt.run();
    return result.changes;
  },

  /**
   * Get active session count for a user
   */
  countByUserId(userId: number): number {
    const stmt = prepareStatement(`
      SELECT COUNT(*) as count FROM admin_sessions
      WHERE admin_user_id = ? AND expires_at > strftime('%s', 'now')
    `);
    const result = stmt.get(userId) as { count: number } | undefined;
    return result?.count || 0;
  },

  /**
   * Generate random session token
   */
  generateSessionToken(): string {
    return randomBytes(32).toString('hex');
  },
};
