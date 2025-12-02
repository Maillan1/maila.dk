#!/usr/bin/env node

/**
 * Create Maila Walmod author and set for all imported posts
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

async function setAuthor() {
  console.log('📝 Setting author...\n');

  // Use existing person - NEVER create new ones
  const authorId = 'afbc856d-8a00-424f-9e63-add812dad057';
  const author = await client.getDocument(authorId);

  console.log(`✅ Using author: ${author.name}`);

  // Get all imported posts
  const posts = await client.fetch('*[_type == "post" && _id match "imported-*"]{_id, title}');
  console.log(`\n📚 Found ${posts.length} imported posts\n`);

  // Update all posts to reference the author
  let updated = 0;
  for (const post of posts) {
    await client.patch(post._id)
      .set({ author: { _type: 'reference', _ref: authorId } })
      .commit();
    updated++;
    if (updated % 10 === 0) {
      console.log(`   Updated ${updated}/${posts.length} posts...`);
    }
  }

  console.log(`\n✨ Complete! All ${updated} posts now have ${author.name} as author`);
}

setAuthor().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
