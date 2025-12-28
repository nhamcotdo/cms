/**
 * Media Files Model
 * TypeScript version with full type safety
 */

import { prepareStatement } from '../index';
import { MediaFile, CreateMediaFileInput } from '../schema';

/**
 * Media Files Model
 */
export const MediaFilesModel = {
  /**
   * Create a new media file record
   */
  create(input: CreateMediaFileInput): MediaFile | null {
    const stmt = prepareStatement(`
      INSERT INTO media_files (
        filename, original_name, mime_type, file_size, file_path, url, alt_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.filename,
      input.original_name,
      input.mime_type,
      input.file_size,
      input.file_path,
      input.url,
      input.alt_text || null
    );

    return this.findById(Number(result.lastInsertRowid));
  },

  /**
   * Find media file by ID
   */
  findById(id: number): MediaFile | null {
    const stmt = prepareStatement('SELECT * FROM media_files WHERE id = ?');
    return stmt.get(id) as MediaFile | null;
  },

  /**
   * Find media file by filename
   */
  findByFilename(filename: string): MediaFile | null {
    const stmt = prepareStatement('SELECT * FROM media_files WHERE filename = ?');
    return stmt.get(filename) as MediaFile | null;
  },

  /**
   * Get all media files
   */
  findAll(limit?: number): MediaFile[] {
    let query = 'SELECT * FROM media_files ORDER BY uploaded_at DESC';
    if (limit) {
      query += ' LIMIT ?';
      const stmt = prepareStatement(query);
      return stmt.all(limit) as MediaFile[];
    }
    const stmt = prepareStatement(query);
    return stmt.all() as MediaFile[];
  },

  /**
   * Delete media file record
   */
  delete(id: number): boolean {
    const stmt = prepareStatement('DELETE FROM media_files WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Get total file size
   */
  getTotalSize(): number {
    const stmt = prepareStatement('SELECT SUM(file_size) as total FROM media_files');
    const result = stmt.get() as { total: number } | undefined;
    return result?.total || 0;
  },

  /**
   * Get count of media files
   */
  count(): number {
    const stmt = prepareStatement('SELECT COUNT(*) as count FROM media_files');
    const result = stmt.get() as { count: number } | undefined;
    return result?.count || 0;
  },
};
