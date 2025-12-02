#!/usr/bin/env node

/**
 * Extract complete WordPress post data from SQLite using proper SQL queries
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbFile = path.join(__dirname, '..', '..', 'wordpress.db');
const outputFile = path.join(__dirname, '..', '..', 'wordpress-posts.json');

console.log('📚 Extracting WordPress posts from SQLite...\n');

// Open database
const db = new Database(dbFile, { readonly: true });

// Get all published posts
const posts = db.prepare(`
  SELECT
    ID as id,
    post_title as title,
    post_name as slug,
    post_content as content,
    post_excerpt as excerpt,
    post_date as date
  FROM wp_maila_posts
  WHERE post_status = 'publish' AND post_type = 'post'
  ORDER BY post_date DESC
`).all();

console.log(`📝 Found ${posts.length} published posts\n`);

// For each post, get post meta
const postsWithMeta = posts.map(post => {
  // Get post meta (like featured image, etc)
  const metaRows = db.prepare(`
    SELECT meta_key, meta_value
    FROM wp_maila_postmeta
    WHERE post_id = ?
  `).all(post.id);

  const meta = {};
  for (const row of metaRows) {
    meta[row.meta_key] = row.meta_value;
  }

  // Generate excerpt from content if excerpt is empty
  let excerpt = post.excerpt;
  if (!excerpt || excerpt.trim() === '') {
    // Strip HTML and take first 160 characters
    const textContent = post.content
      .replace(/<[^>]*>/g, '')  // Remove HTML tags
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .trim();
    excerpt = textContent.substring(0, 160);
    if (textContent.length > 160) {
      excerpt += '...';
    }
  }

  return {
    ...post,
    excerpt,
    meta,
  };
});

db.close();

// Write to JSON
fs.writeFileSync(outputFile, JSON.stringify(postsWithMeta, null, 2));

console.log(`✅ Extracted ${postsWithMeta.length} posts with complete metadata\n`);
console.log(`📄 Output: ${outputFile}`);

// Show sample
if (postsWithMeta.length > 0) {
  const sample = postsWithMeta[0];
  console.log(`\n📋 Sample post:`);
  console.log(`   Title: ${sample.title}`);
  console.log(`   Excerpt: ${sample.excerpt ? sample.excerpt.substring(0, 60) + '...' : '(none)'}`);
  console.log(`   Date: ${sample.date}`);
}

console.log(`\n✨ Next: Run import-to-sanity.js to import posts with complete data`);
