/**
 * Bulk Imports Model
 * TypeScript version with full type safety
 */

import { prepareStatement } from '../index';
import { BulkImport, CreateBulkImportInput, UpdateBulkImportInput, IMPORT_STATUS } from '../schema';

/**
 * Bulk Imports Model
 */
export const BulkImportsModel = {
  /**
   * Create a new bulk import record
   */
  create(input: CreateBulkImportInput): BulkImport | null {
    const stmt = prepareStatement(`
      INSERT INTO bulk_imports (
        admin_user_id, file_name, total_rows, success_count, error_count, status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.admin_user_id,
      input.file_name,
      input.total_rows || 0,
      input.success_count || 0,
      input.error_count || 0,
      input.status || IMPORT_STATUS.PENDING
    );

    return this.findById(Number(result.lastInsertRowid));
  },

  /**
   * Find bulk import by ID
   */
  findById(id: number): BulkImport | null {
    const stmt = prepareStatement('SELECT * FROM bulk_imports WHERE id = ?');
    const imp = stmt.get(id);
    return imp as BulkImport | null;
  },

  /**
   * Find imports by admin user ID
   */
  findByAdminUserId(adminUserId: number): BulkImport[] {
    const stmt = prepareStatement(`
      SELECT * FROM bulk_imports WHERE admin_user_id = ? ORDER BY created_at DESC
    `);
    return stmt.all(adminUserId) as BulkImport[];
  },

  /**
   * Get all imports
   */
  findAll(filters?: { status?: string; admin_user_id?: number; limit?: number }): BulkImport[] {
    let query = 'SELECT * FROM bulk_imports WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters?.admin_user_id !== undefined) {
      query += ' AND admin_user_id = ?';
      params.push(filters.admin_user_id);
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = prepareStatement(query);
    return stmt.all(...params) as BulkImport[];
  },

  /**
   * Update import
   */
  update(id: number, updates: UpdateBulkImportInput): BulkImport | null {
    const fields: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'id' && key !== 'completed_at') {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    params.push(id);
    const stmt = prepareStatement(`
      UPDATE bulk_imports SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);

    // If status is completed or failed, set completed_at
    if (updates.status === IMPORT_STATUS.COMPLETED || updates.status === IMPORT_STATUS.FAILED) {
      const completeStmt = prepareStatement(`
        UPDATE bulk_imports SET completed_at = strftime('%s', 'now')
        WHERE id = ?
      `);
      completeStmt.run(id);
    }

    return this.findById(id);
  },

  /**
   * Increment success/error counters
   */
  incrementCounters(id: number, success: boolean = false, error: boolean = false): BulkImport | null {
    let query = 'UPDATE bulk_imports SET ';
    const params: any[] = [];

    if (success) {
      query += 'success_count = success_count + 1';
    }
    if (error) {
      if (success) query += ', ';
      query += 'error_count = error_count + 1';
    }

    query += ' WHERE id = ?';
    params.push(id);

    const stmt = prepareStatement(query);
    stmt.run(...params);

    return this.findById(id);
  },

  /**
   * Delete import
   */
  delete(id: number): boolean {
    const stmt = prepareStatement('DELETE FROM bulk_imports WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get statistics by admin user
   */
  getStatsByAdminUser(adminUserId: number): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const stmt = prepareStatement(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM bulk_imports
      WHERE admin_user_id = ?
    `);
    const result = stmt.get(adminUserId) as any;
    return {
      total: result.total || 0,
      pending: result.pending || 0,
      processing: result.processing || 0,
      completed: result.completed || 0,
      failed: result.failed || 0,
    };
  },
};
