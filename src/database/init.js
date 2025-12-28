/**
 * Database initialization and management
 * Handles SQLite database connection, schema creation, and initialization
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../threads_admin.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db = null;

/**
 * Initialize database connection and create schema
 */
function initializeDatabase() {
    if (db) {
        return db;
    }

    console.log('Initializing database...');

    try {
        db = new Database(DB_PATH, { verbose: console.log });

        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');

        const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
        db.exec(schema);

        // Run migrations
        const { runMigrations } = require('./migrations/runner');
        runMigrations();

        console.log('Database initialized successfully');
        return db;
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}

/**
 * Get database instance
 */
function getDatabase() {
    if (!db) {
        return initializeDatabase();
    }
    return db;
}

/**
 * Close database connection
 */
function closeDatabase() {
    if (db) {
        db.close();
        db = null;
        console.log('Database connection closed');
    }
}

/**
 * Prepare statement with error handling
 */
function prepareStatement(sql) {
    const database = getDatabase();
    try {
        return database.prepare(sql);
    } catch (error) {
        console.error('Failed to prepare statement:', error);
        throw error;
    }
}

module.exports = {
    initializeDatabase,
    getDatabase,
    closeDatabase,
    prepareStatement,
};
