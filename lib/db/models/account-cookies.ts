/**
 * Account Cookies Model
 * TypeScript version with full type safety
 */

import { prepareStatement } from '../index';
import { AccountCookie } from '../schema';

/**
 * Account Cookies Model
 */
export const AccountCookiesModel = {
  /**
   * Save cookies for an account (replaces all existing cookies)
   */
  saveCookies(accountId: number, cookies: Array<{ name: string; value: string; expires?: number }>): AccountCookie[] {
    const deleteStmt = prepareStatement('DELETE FROM account_cookies WHERE account_id = ?');
    deleteStmt.run(accountId);

    const stmt = prepareStatement(`
      INSERT INTO account_cookies (account_id, cookie_name, cookie_value, expires_at)
      VALUES (?, ?, ?, ?)
    `);

    cookies.forEach(cookie => {
      stmt.run(accountId, cookie.name, cookie.value, cookie.expires || null);
    });

    return this.findByAccountId(accountId);
  },

  /**
   * Get cookies for an account
   */
  findByAccountId(accountId: number): AccountCookie[] {
    const stmt = prepareStatement('SELECT * FROM account_cookies WHERE account_id = ?');
    return stmt.all(accountId) as AccountCookie[];
  },

  /**
   * Get cookies as object for easier use
   */
  getCookieObject(accountId: number): Record<string, string> {
    const cookies = this.findByAccountId(accountId);
    const result: Record<string, string> = {};
    cookies.forEach(cookie => {
      result[cookie.cookie_name] = cookie.cookie_value;
    });
    return result;
  },

  /**
   * Delete cookies for an account
   */
  deleteByAccountId(accountId: number): void {
    const stmt = prepareStatement('DELETE FROM account_cookies WHERE account_id = ?');
    stmt.run(accountId);
  },

  /**
   * Delete expired cookies
   */
  deleteExpired(): void {
    const stmt = prepareStatement(`
      DELETE FROM account_cookies WHERE expires_at IS NOT NULL AND expires_at <= strftime('%s', 'now')
    `);
    stmt.run();
  },
};
