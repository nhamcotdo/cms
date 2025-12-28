/**
 * Migration runner for database schema updates
 */

const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../init');

const MIGRATIONS_DIR = path.join(__dirname);

/**
 * Ensure migrations tracking table exists
 */
function ensureMigrationsTable() {
    const db = getDatabase();
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
function getExecutedMigrations() {
    const db = getDatabase();
    const stmt = db.prepare('SELECT name FROM _migrations ORDER BY name');
    return stmt.all().map(row => row.name);
}

/**
 * Get all migration files
 */
function getMigrationFiles() {
    const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter(file => file.endsWith('.sql') && file !== 'runner.js');
    return files.sort();
}

/**
 * Execute a single migration
 */
function executeMigration(migrationFile) {
    const db = getDatabase();
    const filePath = path.join(MIGRATIONS_DIR, migrationFile);
    const sql = fs.readFileSync(filePath, 'utf-8');

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
function runMigrations() {
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
function runMigration(migrationName) {
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

module.exports = {
    runMigrations,
    runMigration,
    getExecutedMigrations,
    getMigrationFiles,
};
