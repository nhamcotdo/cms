/**
 * User Settings Model
 * TypeScript version with full type safety
 */

import { prepareStatement } from '../index';
import { UserSetting } from '../schema';

/**
 * User Settings Model
 */
export const UserSettingsModel = {
  /**
   * Get setting value by key
   */
  get(key: string): string | null {
    const stmt = prepareStatement('SELECT value FROM user_settings WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value || null;
  },

  /**
   * Get setting as number
   */
  getNumber(key: string, defaultValue: number = 0): number {
    const value = this.get(key);
    return value ? parseInt(value, 10) : defaultValue;
  },

  /**
   * Get setting as boolean
   */
  getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = this.get(key);
    return value ? value === '1' || value.toLowerCase() === 'true' : defaultValue;
  },

  /**
   * Set setting value
   */
  set(key: string, value: string | number | boolean): string | null {
    const stringValue = String(value);
    const stmt = prepareStatement(`
      INSERT INTO user_settings (key, value, updated_at)
      VALUES (?, ?, strftime('%s', 'now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = strftime('%s', 'now')
    `);
    stmt.run(key, stringValue);
    return this.get(key);
  },

  /**
   * Get all settings as object
   */
  getAll(): Record<string, string> {
    const stmt = prepareStatement('SELECT * FROM user_settings');
    const settings = stmt.all() as UserSetting[];
    const result: Record<string, string> = {};
    settings.forEach(setting => {
      result[setting.key] = setting.value;
    });
    return result;
  },

  /**
   * Delete setting
   */
  delete(key: string): boolean {
    const stmt = prepareStatement('DELETE FROM user_settings WHERE key = ?');
    const result = stmt.run(key);
    return result.changes > 0;
  },
};
