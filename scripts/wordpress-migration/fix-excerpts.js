#!/usr/bin/env node

/**
 * Fix excerpts for all imported posts that have empty or dirty excerpts
 */

const {createClient} = require('@sanity/client');
const path = require('path');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'frontend', '.env.local') });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
});

function generateExcerpt(content) {
  if (!content || !Array.isArray(content)) return '';

  // Extract text from Sanity blocks
  let text = '';
  for (const block of content) {
    if (block._type === 'block' && block.children) {
      for (const child of block.children) {
        if (child.text) {
          text += child.text + ' ';
        }
      }
    }
  }

  // Clean up the text
  text = text
    .replace(/\[caption[^\]]*\][\s\S]*?\[\/caption\]/gi, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Take first 160 characters
  let excerpt = text.substring(0, 160);
  if (text.length > 160) {
    excerpt += '...';
  }

  return excerpt;
}

async function fixExcerpts() {
  console.log('🔄 Fixing excerpts for imported posts...\n');

  // Get all imported posts
  const posts = await client.fetch(
    '*[_type == "post" && _id match "imported-*"]{_id, title, excerpt, content}'
  );

  console.log(`📚 Found ${posts.length} imported posts\n`);

  let updated = 0;
  let skipped = 0;

  for (const post of posts) {
    // Check if excerpt needs fixing (empty or has dirty characters)
    const needsFix = !post.excerpt ||
                     post.excerpt.trim() === '' ||
                     post.excerpt.includes('\\r\\n') ||
                     post.excerpt.includes('[caption') ||
                     post.excerpt.match(/[\u200B-\u200D\uFEFF]/);  // Zero-width characters

    if (needsFix) {
      const newExcerpt = generateExcerpt(post.content);

      if (newExcerpt) {
        await client.patch(post._id)
          .set({ excerpt: newExcerpt })
          .commit();

        updated++;
        if (updated % 10 === 0) {
          console.log(`   Updated ${updated} excerpts...`);
        }
      }
    } else {
      skipped++;
    }
  }

  console.log(`\n✨ Complete!`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⏭️  Skipped (already clean): ${skipped}`);
}

fixExcerpts().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
