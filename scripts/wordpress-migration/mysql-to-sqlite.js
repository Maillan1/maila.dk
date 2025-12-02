#!/usr/bin/env node

/**
 * Convert MySQL SQL dump to SQLite and load into database
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const sqlFile = path.join(__dirname, '..', '..', 'wordpress-backup', 'maila_dk_db.sql');
const dbFile = path.join(__dirname, '..', '..', 'wordpress.db');

console.log('🔄 Converting MySQL dump to SQLite...\n');

// Read the MySQL SQL dump
let sql = fs.readFileSync(sqlFile, 'utf8');

console.log(`📁 Read ${(sql.length / 1024 / 1024).toFixed(2)}MB SQL file`);

// Clean up MySQL-specific syntax for SQLite compatibility
console.log('🧹 Cleaning MySQL syntax...\n');

// Remove MySQL-specific comments and settings
sql = sql.replace(/\/\*!40\d+ .+? \*\/;/g, '');
sql = sql.replace(/\/\*!40\d+ .+?\*\//g, '');
sql = sql.replace(/SET .+?;/gi, '');
sql = sql.replace(/LOCK TABLES .+?;/gi, '');
sql = sql.replace(/UNLOCK TABLES;/gi, '');

// Remove AUTO_INCREMENT entirely (SQLite adds AUTOINCREMENT to INTEGER PRIMARY KEY automatically)
sql = sql.replace(/AUTO_INCREMENT=?\d*/gi, '');

// Remove ENGINE, CHARSET, and COLLATE clauses
sql = sql.replace(/ENGINE=\w+/gi, '');
sql = sql.replace(/DEFAULT CHARSET=[\w\d_]+/gi, '');
sql = sql.replace(/COLLATE[\s=]+[\w\d_]+/gi, '');
sql = sql.replace(/CHARACTER SET [\w\d_]+/gi, '');

// Convert data types
sql = sql.replace(/bigint\((\d+)\)/gi, 'INTEGER');
sql = sql.replace(/int\((\d+)\)/gi, 'INTEGER');
sql = sql.replace(/tinyint\((\d+)\)/gi, 'INTEGER');
sql = sql.replace(/smallint\((\d+)\)/gi, 'INTEGER');
sql = sql.replace(/mediumint\((\d+)\)/gi, 'INTEGER');
sql = sql.replace(/longtext/gi, 'TEXT');
sql = sql.replace(/mediumtext/gi, 'TEXT');
sql = sql.replace(/tinytext/gi, 'TEXT');
sql = sql.replace(/datetime/gi, 'TEXT');
sql = sql.replace(/varchar\((\d+)\)/gi, 'TEXT');

// Remove unsigned and other MySQL-specific attributes
sql = sql.replace(/\s+unsigned/gi, '');
sql = sql.replace(/\s+on update CURRENT_TIMESTAMP/gi, '');

// Fix KEY definitions - SQLite doesn't support KEY, use CREATE INDEX instead
// We'll handle this by removing KEY lines and creating indexes separately if needed
sql = sql.replace(/,\s*KEY `.+?` \(.+?\)/gi, '');
sql = sql.replace(/,\s*UNIQUE KEY `.+?` \(.+?\)/gi, '');

// Convert MySQL backticks to SQLite double quotes for identifiers
sql = sql.replace(/`/g, '"');

// Clean up extra commas before closing parentheses in CREATE TABLE
sql = sql.replace(/,(\s*)\)/g, '$1)');

// Clean up extra whitespace and parentheses in CREATE TABLE
sql = sql.replace(/\)\s*\)\s*;/g, ');');

// Remove IF NOT EXISTS from DROP TABLE (SQLite syntax difference)
sql = sql.replace(/DROP TABLE IF EXISTS/gi, 'DROP TABLE IF EXISTS');

console.log('✅ MySQL syntax cleaned\n');

// Delete existing database if it exists
if (fs.existsSync(dbFile)) {
  fs.unlinkSync(dbFile);
  console.log('🗑️  Removed old database\n');
}

// Create SQLite database
console.log('📦 Creating SQLite database...\n');
const db = new Database(dbFile);

// Split SQL into statements more carefully
// Need to handle semicolons inside strings and multiline INSERT statements
const statements = [];
let currentStatement = '';
let inString = false;
let stringChar = '';
let escaped = false;

for (let i = 0; i < sql.length; i++) {
  const char = sql[i];
  const prevChar = i > 0 ? sql[i - 1] : '';

  currentStatement += char;

  // Track if we're inside a string (handle both ' and ")
  if (!escaped && (char === "'" || char === '"')) {
    if (!inString) {
      inString = true;
      stringChar = char;
    } else if (char === stringChar) {
      inString = false;
      stringChar = '';
    }
  }

  // Track escape character
  escaped = (char === '\\' && !escaped);

  // End statement on semicolon outside of strings
  if (char === ';' && !inString) {
    const stmt = currentStatement.trim();
    // Skip empty statements and comments
    if (stmt && !stmt.startsWith('--')) {
      statements.push(stmt);
    }
    currentStatement = '';
  }
}

console.log(`⚙️  Executing ${statements.length} SQL statements...\n`);

let executed = 0;
let errors = 0;

// Use a transaction for better performance
const transaction = db.transaction(() => {
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim();

    if (!statement || statement.startsWith('--')) continue;

    try {
      db.exec(statement);
      executed++;

      if (executed % 100 === 0) {
        console.log(`   ✅ Executed ${executed}/${statements.length} statements...`);
      }
    } catch (err) {
      // Some errors are expected (like DROP TABLE IF NOT EXISTS on tables that don't exist)
      if (!err.message.includes('no such table') && !err.message.includes('syntax error near ")"')) {
        console.error(`   ⚠️  Error on statement ${i}: ${err.message.substring(0, 100)}`);
        // Debug: Log first failing statement
        if (errors === 0) {
          console.error(`\nFirst failing statement:\n${statement.substring(0, 500)}\n`);
        }
        errors++;
      }
    }
  }
});

transaction();

console.log(`\n✨ Database created!`);
console.log(`   ✅ Executed: ${executed} statements`);
console.log(`   ⚠️  Errors: ${errors}`);

// Verify tables were created
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(`\n📊 Tables in database (${tables.length}):`);
tables.forEach(t => console.log(`   - ${t.name}`));

// Check posts count
try {
  const postCount = db.prepare("SELECT COUNT(*) as count FROM wp_maila_posts WHERE post_status='publish' AND post_type='post'").get();
  console.log(`\n📝 Published posts: ${postCount.count}`);
} catch (err) {
  console.error(`\n⚠️  Could not count posts: ${err.message}`);
}

db.close();

console.log(`\n✅ SQLite database ready at: ${dbFile}`);
console.log(`\nNext: Run extract-from-sqlite.js to extract complete post data`);
