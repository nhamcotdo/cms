/**
 * Database singleton for Next.js
 * Ensures only one database connection per request lifecycle
 */

import Database from 'better-sqlite3';
import { join } from 'path';

interface DatabaseInstance {
  db: Database.Database;
  initialized: boolean;
}

let globalDb: DatabaseInstance | null = null;

const DB_PATH = join(process.cwd(), 'threads_admin.db');

/**
 * Get or create database singleton instance
 * Safe for server-side rendering and serverless functions
 */
export function getDb(): Database.Database {
  if (!globalDb) {
    const db = new Database(DB_PATH, { verbose: process.env.SQL_DEBUG === 'true' ? console.log : undefined });

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    globalDb = {
      db,
      initialized: false,
    };
  }

  return globalDb.db;
}

/**
 * Initialize database schema
 */
export function initializeDatabase(): void {
  const db = getDb();

  if (globalDb?.initialized) {
    return;
  }

  try {
    // Read and execute schema
    const schemaPath = join(process.cwd(), 'src/database/schema.sql');
    const { readFileSync } = require('fs');
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);

    // Run migrations
    const { runMigrations } = require('./migrations');
    runMigrations();

    globalDb!.initialized = true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Close database connection (for graceful shutdown)
 */
export function closeDatabase(): void {
  if (globalDb) {
    globalDb.db.close();
    globalDb = null;
  }
}

/**
 * Prepare statement helper
 */
export function prepareStatement(sql: string): Database.Statement {
  const db = getDb();
  try {
    return db.prepare(sql);
  } catch (error) {
    console.error('Failed to prepare statement:', error);
    throw error;
  }
}
