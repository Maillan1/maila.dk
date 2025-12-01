#!/usr/bin/env node

const fs = require('fs');

console.log('🔍 Simple WordPress post extractor...\n');

const sql = fs.readFileSync('/Users/AKJ/code/maila-blog/wordpress-backup/maila_dk_db.sql', 'utf8');

// Find the posts table columns
const columnMatch = sql.match(/INSERT INTO `wp_maila_posts` \(([^)]+)\)/);
if (!columnMatch) {
  console.error('Could not find columns');
  process.exit(1);
}

const columns = columnMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
console.log('Columns:', columns.slice(0, 10).join(', '), '...\n');

// Get column indices for the fields we care about
const idIdx = columns.indexOf('ID');
const titleIdx = columns.indexOf('post_title');
const contentIdx = columns.indexOf('post_content');
const excerptIdx = columns.indexOf('post_excerpt');
const dateIdx = columns.indexOf('post_date');
const statusIdx = columns.indexOf('post_status');
const typeIdx = columns.indexOf('post_type');
const nameIdx = columns.indexOf('post_name');

console.log(`Found column indices: ID=${idIdx}, title=${titleIdx}, status=${statusIdx}, type=${typeIdx}\n`);

// Extract just the data rows using the format I saw: (ID, ..., ..., 'title', ...)
// This is a simplified extraction for the specific format
const posts = [];
const insertSections = sql.split(/INSERT INTO `wp_maila_posts`[^VALUES]+VALUES\s+/g).slice(1);

console.log(`Found ${insertSections.length} INSERT sections\n`);

for (const section of insertSections) {
  // Match individual rows: (value1, value2, 'string value', ...)
  // Very simplified - just grab rows between parentheses
  const matches = section.matchAll(/\((\d+),\s*(\d+),\s*'([^']+)',\s*'([^']+)',\s*'([\s\S]*?)',\s*'([^']*?)',\s*'([^']*?)',\s*'(publish|draft|inherit)',\s*'([^']*?)',\s*'([^']*?)',\s*'([^']*?)',\s*'([^']*?)'/g);

  for (const match of matches) {
    const [, id, author, date, dateGmt, content, title, excerpt, status, commentStatus, pingStatus, password, slug] = match;

    if (status === 'publish') {
      posts.push({
        id,
        title,
        slug,
        content,
        excerpt,
        date,
        status,
      });
    }
  }
}

console.log(`✅ Extracted ${posts.length} published posts\n`);

posts.slice(0, 10).forEach((p, i) => {
  console.log(`${i + 1}. ${p.title.substring(0, 60)}`);
  console.log(`   Date: ${p.date}, ID: ${p.id}`);
});

if (posts.length > 10) {
  console.log(`... and ${posts.length - 10} more`);
}

fs.writeFileSync('wordpress-posts.json', JSON.stringify(posts, null, 2));
console.log(`\n💾 Saved to wordpress-posts.json`);
