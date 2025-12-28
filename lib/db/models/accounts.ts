/**
 * Accounts Model - Threads Accounts
 * TypeScript version with full type safety
 */

import { prepareStatement } from '../index';
import { Account, CreateAccountInput, UpdateAccountInput } from '../schema';

/**
 * Parse account data
 */
function parseAccountData(account: any): Account {
  if (!account) return account;

  return {
    ...account,
    is_active: Boolean(account.is_active),
  } as Account;
}

/**
 * Accounts Model
 */
export const AccountsModel = {
  /**
   * Create a new Threads account
   */
  create(input: CreateAccountInput): Account | null {
    const stmt = prepareStatement(`
      INSERT INTO accounts (
        threads_user_id, username, threads_profile_picture_url,
        threads_biography, access_token, token_expires_at, is_active, admin_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.threads_user_id,
      input.username,
      input.threads_profile_picture_url || null,
      input.threads_biography || null,
      input.access_token,
      input.token_expires_at || null,
      input.is_active !== undefined ? (input.is_active ? 1 : 0) : 1,
      input.admin_user_id || null
    );

    return this.findById(Number(result.lastInsertRowid));
  },

  /**
   * Find account by ID
   */
  findById(id: number): Account | null {
    const stmt = prepareStatement('SELECT * FROM accounts WHERE id = ?');
    const account = stmt.get(id);
    return account ? parseAccountData(account) : null;
  },

  /**
   * Find account by Threads user ID
   */
  findByThreadsUserId(threadsUserId: string): Account | null {
    const stmt = prepareStatement('SELECT * FROM accounts WHERE threads_user_id = ?');
    const account = stmt.get(threadsUserId);
    return account ? parseAccountData(account) : null;
  },

  /**
   * Get all accounts
   */
  findAll(filters?: {
    admin_user_id?: number;
    is_active?: boolean;
    limit?: number;
  }): Account[] {
    let query = 'SELECT * FROM accounts WHERE 1=1';
    const params: any[] = [];

    if (filters?.admin_user_id !== undefined) {
      query += ' AND admin_user_id = ?';
      params.push(filters.admin_user_id);
    }

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
    const accounts = stmt.all(...params);
    return accounts.map(acc => parseAccountData(acc));
  },

  /**
   * Find accounts by admin user ID
   */
  findByAdminUserId(adminUserId: number): Account[] {
    const stmt = prepareStatement('SELECT * FROM accounts WHERE admin_user_id = ? ORDER BY created_at DESC');
    const accounts = stmt.all(adminUserId);
    return accounts.map(acc => parseAccountData(acc));
  },

  /**
   * Update account
   */
  update(id: number, updates: UpdateAccountInput): Account | null {
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
  updateLastUsed(id: number): void {
    const stmt = prepareStatement(`
      UPDATE accounts SET last_used_at = strftime('%s', 'now') WHERE id = ?
    `);
    stmt.run(id);
  },

  /**
   * Delete account
   */
  delete(id: number): boolean {
    const stmt = prepareStatement('DELETE FROM accounts WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get active account count
   */
  countActive(): number {
    const stmt = prepareStatement('SELECT COUNT(*) as count FROM accounts WHERE is_active = 1');
    const result = stmt.get() as { count: number } | undefined;
    return result?.count || 0;
  },

  /**
   * Get total account count
   */
  count(): number {
    const stmt = prepareStatement('SELECT COUNT(*) as count FROM accounts');
    const result = stmt.get() as { count: number } | undefined;
    return result?.count || 0;
  },
};
