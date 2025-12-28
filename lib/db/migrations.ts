/**
 * Migration runner for database schema updates
 * TypeScript version of migration system
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getDb } from './index';

const MIGRATIONS_DIR = join(process.cwd(), 'src/database/migrations');

/**
 * Ensure migrations tracking table exists
 */
function ensureMigrationsTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);
}

/**
 * Get executed migrations
 */
export function getExecutedMigrations(): string[] {
  const db = getDb();
  const stmt = db.prepare('SELECT name FROM _migrations ORDER BY name');
  const rows = stmt.all() as { name: string }[];
  return rows.map(row => row.name);
}

/**
 * Get all migration files
 */
function getMigrationFiles(): string[] {
  try {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql') && file !== 'runner.js' && file !== 'runner.ts');
    return files.sort();
  } catch (error) {
    console.error('Failed to read migrations directory:', error);
    return [];
  }
}

/**
 * Execute a single migration
 */
function executeMigration(migrationFile: string): void {
  const db = getDb();
  const filePath = join(MIGRATIONS_DIR, migrationFile);
  const sql = readFileSync(filePath, 'utf-8');

  console.log(`Executing migration: ${migrationFile}`);

  db.transaction(() => {
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(migrationFile);
  })();

  console.log(`Migration ${migrationFile} completed`);
}

/**
 * Run all pending migrations
 */
export function runMigrations(): void {
  console.log('Checking for pending migrations...');

  ensureMigrationsTable();

  const executedMigrations = new Set(getExecutedMigrations());
  const migrationFiles = getMigrationFiles();

  const pendingMigrations = migrationFiles.filter(file => !executedMigrations.has(file));

  if (pendingMigrations.length === 0) {
    console.log('No pending migrations');
    return;
  }

  console.log(`Found ${pendingMigrations.length} pending migration(s)`);

  for (const migration of pendingMigrations) {
    try {
      executeMigration(migration);
    } catch (error) {
      console.error(`Migration ${migration} failed:`, error);
      throw error;
    }
  }

  console.log('All migrations completed successfully');
}

/**
 * Run a specific migration by name
 */
export function runMigration(migrationName: string): void {
  const migrationFiles = getMigrationFiles();
  const targetFile = migrationFiles.find(f => f.includes(migrationName));

  if (!targetFile) {
    throw new Error(`Migration not found: ${migrationName}`);
  }

  const executedMigrations = new Set(getExecutedMigrations());
  if (executedMigrations.has(targetFile)) {
    console.log(`Migration ${targetFile} already executed`);
    return;
  }

  executeMigration(targetFile);
}
