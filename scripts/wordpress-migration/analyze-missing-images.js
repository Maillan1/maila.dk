#!/usr/bin/env node

/**
 * Analyze missing images from WordPress migration
 * Generates a report of images that were referenced but not uploaded to Sanity
 */

const fs = require('fs');
const path = require('path');

const postsFile = path.join(__dirname, '..', '..', 'wordpress-posts.json');
const imageMappingFile = path.join(__dirname, '..', '..', 'image-mapping.json');
const uploadsDir = path.join(__dirname, '..', '..', 'wordpress-backup', 'wp-content', 'uploads');
const outputFile = path.join(__dirname, '..', '..', 'missing-images-report.md');

console.log('📊 Analyzing missing images...\n');

// Load posts and image mapping
const posts = JSON.parse(fs.readFileSync(postsFile, 'utf8'));
const imageMapping = JSON.parse(fs.readFileSync(imageMappingFile, 'utf8'));

console.log(`📚 Loaded ${posts.length} posts`);
console.log(`📷 Loaded ${Object.keys(imageMapping).length} uploaded images\n`);

// Extract all image URLs from posts
const allImageUrls = new Set();
const imagesByPost = {};

for (const post of posts) {
  if (!post.content) continue;

  // Clean escape sequences first
  let content = post.content
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");

  // Find all img tags
  const imgMatches = content.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);

  const postImages = [];
  for (const match of imgMatches) {
    const url = match[1];
    allImageUrls.add(url);
    postImages.push(url);
  }

  if (postImages.length > 0) {
    imagesByPost[post.id] = {
      title: post.title,
      date: post.date,
      images: postImages
    };
  }
}

console.log(`🔍 Found ${allImageUrls.size} unique image references\n`);

// Check which images are missing
const missingImages = [];
const foundImages = [];

for (const url of allImageUrls) {
  // Check if in Sanity mapping
  if (imageMapping[url]) {
    foundImages.push(url);
    continue;
  }

  // Check if file exists locally
  let localPath = url;

  // Extract path from URL
  if (url.includes('wp-content/uploads/')) {
    const match = url.match(/wp-content\/uploads\/(.+)$/);
    if (match) {
      localPath = path.join(uploadsDir, match[1]);
      if (fs.existsSync(localPath)) {
        foundImages.push(url);
        continue;
      }
    }
  }

  // Image is missing
  missingImages.push(url);
}

console.log(`✅ Found: ${foundImages.length} images`);
console.log(`❌ Missing: ${missingImages.length} images\n`);

// Analyze missing images by year
const missingByYear = {};
for (const url of missingImages) {
  const yearMatch = url.match(/\/(\d{4})\//);
  const year = yearMatch ? yearMatch[1] : 'unknown';
  if (!missingByYear[year]) {
    missingByYear[year] = [];
  }
  missingByYear[year].push(url);
}

// Generate report
let report = `# Missing Images Report

Generated: ${new Date().toISOString()}

## Summary

- **Total image references**: ${allImageUrls.size}
- **Successfully uploaded to Sanity**: ${foundImages.length}
- **Missing images**: ${missingImages.length}

## Missing Images by Year

`;

for (const [year, urls] of Object.entries(missingByYear).sort()) {
  report += `\n### ${year} (${urls.length} images)\n\n`;
}

report += `\n## Affected Posts\n\n`;

// List posts with missing images
for (const [postId, postData] of Object.entries(imagesByPost)) {
  const missingInPost = postData.images.filter(url => missingImages.includes(url));

  if (missingInPost.length > 0) {
    report += `### ${postData.title}\n`;
    report += `- Date: ${postData.date}\n`;
    report += `- Post ID: ${postId}\n`;
    report += `- Missing: ${missingInPost.length} of ${postData.images.length} images\n\n`;

    for (const url of missingInPost) {
      // Extract filename
      const filename = url.split('/').pop();

      // Check if it's a Facebook image
      const isFacebookImage = filename.match(/^\d+_\d+_\d+_[a-z]/);

      report += `- \`${filename}\``;
      if (isFacebookImage) {
        report += ` *(Facebook image)*`;
      }
      report += `\n  - URL: ${url}\n`;
    }
    report += `\n`;
  }
}

report += `\n## Complete List of Missing Images\n\n`;

for (const url of missingImages.sort()) {
  const filename = url.split('/').pop();
  const isFacebookImage = filename.match(/^\d+_\d+_\d+_[a-z]/);

  report += `- ${filename}`;
  if (isFacebookImage) {
    report += ` *(Facebook)*`;
  }
  report += `\n  - ${url}\n`;
}

report += `\n## Recovery Instructions

### Option 1: Find on Facebook
Facebook images follow the pattern: \`<numeric-id>_<numeric-id>_<numeric-id>_<letter>\`

You may be able to find these by:
1. Searching your Facebook photos around the dates listed above
2. Using Facebook's "Download Your Information" feature
3. Checking Facebook albums from ${Object.keys(missingByYear).sort()[0] || 'the relevant time period'}

### Option 2: Try Original URLs
Some images might still be accessible at their original URLs. You can try accessing them directly or use a script to download them.

### Option 3: Remove References
If images cannot be recovered, we can update the migration script to cleanly remove broken image references instead of leaving text artifacts.
`;

// Write report
fs.writeFileSync(outputFile, report);

console.log(`📄 Report written to: ${outputFile}\n`);
console.log('📋 Summary:');
console.log(`   Missing images: ${missingImages.length}`);
console.log(`   Affected posts: ${Object.values(imagesByPost).filter(p => p.images.some(url => missingImages.includes(url))).length}`);
console.log(`   Years affected: ${Object.keys(missingByYear).sort().join(', ')}`);
