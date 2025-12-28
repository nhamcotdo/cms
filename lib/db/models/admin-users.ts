/**
 * Admin Users Model
 * TypeScript version with full type safety
 */

import { prepareStatement } from '../index';
import { AdminUser, CreateAdminUserInput, UpdateAdminUserInput } from '../schema';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Parse user data (keep password hash for verification)
 */
function parseUserData(user: any): AdminUser {
  if (!user) return user;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    password_hash: user.password_hash,
    is_active: Boolean(user.is_active),
    created_at: user.created_at,
    updated_at: user.updated_at,
  } as AdminUser;
}

/**
 * Admin Users Model
 */
export const AdminUsersModel = {
  /**
   * Create a new admin user
   */
  async create(input: CreateAdminUserInput): Promise<AdminUser | null> {
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const stmt = prepareStatement(`
      INSERT INTO admin_users (username, email, password_hash, is_active)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.username,
      input.email,
      passwordHash,
      input.is_active !== undefined ? (input.is_active ? 1 : 0) : 1
    );

    return this.findById(Number(result.lastInsertRowid));
  },

  /**
   * Find admin user by ID
   */
  findById(id: number): AdminUser | null {
    const stmt = prepareStatement('SELECT * FROM admin_users WHERE id = ?');
    const user = stmt.get(id);
    return user ? parseUserData(user) : null;
  },

  /**
   * Find admin user by username
   */
  findByUsername(username: string): AdminUser | null {
    const stmt = prepareStatement('SELECT * FROM admin_users WHERE username = ?');
    const user = stmt.get(username);
    return user ? parseUserData(user) : null;
  },

  /**
   * Find admin user by email
   */
  findByEmail(email: string): AdminUser | null {
    const stmt = prepareStatement('SELECT * FROM admin_users WHERE email = ?');
    const user = stmt.get(email);
    return user ? parseUserData(user) : null;
  },

  /**
   * Verify password
   */
  async verifyPassword(user: AdminUser, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  },

  /**
   * Update user
   */
  async update(id: number, updates: UpdateAdminUserInput): Promise<AdminUser | null> {
    const fields: string[] = [];
    const params: any[] = [];

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
  async updatePassword(id: number, newPassword: string): Promise<AdminUser | null> {
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
   * Get all users
   */
  findAll(filters?: { is_active?: boolean; limit?: number }): AdminUser[] {
    let query = 'SELECT * FROM admin_users WHERE 1=1';
    const params: any[] = [];

    if (filters?.is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.is_active ? 1 : 0);
    }

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = prepareStatement(query);
    const users = stmt.all(...params);
    return users.map(u => parseUserData(u));
  },

  /**
   * Delete user
   */
  delete(id: number): boolean {
    const stmt = prepareStatement('DELETE FROM admin_users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Count users
   */
  count(): number {
    const stmt = prepareStatement('SELECT COUNT(*) as count FROM admin_users');
    const result = stmt.get() as { count: number } | undefined;
    return result?.count || 0;
  },
};
