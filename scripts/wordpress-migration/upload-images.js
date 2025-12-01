#!/usr/bin/env node

/**
 * Upload WordPress images used in blog posts to Sanity
 */

const fs = require('fs');
const path = require('path');
const {createClient} = require('@sanity/client');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'frontend', '.env.local') });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
});

console.log('📦 WordPress Images to Sanity Upload\n');
console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`);
console.log(`Dataset: ${process.env.NEXT_PUBLIC_SANITY_DATASET}\n`);

const uploadsDir = path.join(__dirname, '..', '..', 'wordpress-backup', 'wp-content', 'uploads');
const imageMapping = {};

// Extract all image URLs from posts
function extractImageUrls() {
  const posts = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'wordpress-posts.json'), 'utf8'));
  const imageUrls = new Set();

  for (const post of posts) {
    if (!post.content) continue;

    // Find all img src attributes (handle escaped quotes)
    const imgMatches = post.content.matchAll(/<img[^>]+src=\\*["']([^"'\\]+)\\*["']/gi);
    for (const match of imgMatches) {
      let url = match[1];
      imageUrls.add(url);
    }
  }

  return Array.from(imageUrls);
}

// Convert URL to local file path
function urlToLocalPath(url) {
  // Extract path after /uploads/
  const match = url.match(/\/uploads\/(.+)$/);
  if (!match) return null;

  const relativePath = match[1];
  return path.join(uploadsDir, relativePath);
}

// Upload image to Sanity
async function uploadImage(url, localPath) {
  try {
    if (!fs.existsSync(localPath)) {
      return { success: false, url, error: 'File not found' };
    }

    const filename = path.basename(localPath);

    // Read file
    const imageBuffer = fs.readFileSync(localPath);

    // Upload to Sanity
    const asset = await client.assets.upload('image', imageBuffer, {
      filename: filename,
    });

    // Map old URL to Sanity asset
    imageMapping[url] = asset._id;

    return { success: true, url, assetId: asset._id };
  } catch (error) {
    return { success: false, url, error: error.message };
  }
}

// Main upload function
async function uploadAllImages() {
  console.log('🔍 Extracting image URLs from posts...\n');
  const imageUrls = extractImageUrls();
  console.log(`📚 Found ${imageUrls.length} unique images referenced in posts\n`);

  let success = 0;
  let errors = 0;
  const errorDetails = [];

  console.log('🔄 Starting upload...\n');

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    const localPath = urlToLocalPath(url);

    if (!localPath) {
      console.error(`   ⚠️  Skipping invalid URL: ${url}`);
      errors++;
      continue;
    }

    const result = await uploadImage(url, localPath);

    if (result.success) {
      success++;
      if (success % 10 === 0 || success === imageUrls.length) {
        console.log(`   ✅ Uploaded ${success}/${imageUrls.length}: ${path.basename(localPath)}`);
      }
    } else {
      errorDetails.push({ url, error: result.error });
      errors++;
    }
  }

  // Save mapping to file
  const mappingPath = path.join(__dirname, '..', '..', 'image-mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(imageMapping, null, 2));

  console.log(`\n✨ Upload complete!`);
  console.log(`   ✅ Success: ${success}`);
  if (errors > 0) {
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`\n⚠️  Error details:`);
    errorDetails.forEach(({ url, error }) => {
      console.log(`   - ${path.basename(url)}: ${error}`);
    });
  }
  console.log(`\n💾 Image mapping saved to image-mapping.json`);
  console.log(`   (${Object.keys(imageMapping).length} images mapped)`);
}

// Run
uploadAllImages().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
