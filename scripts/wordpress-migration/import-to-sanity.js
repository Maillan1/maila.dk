#!/usr/bin/env node

/**
 * Import WordPress posts to Sanity
 */

const fs = require('fs');
const path = require('path');
const {createClient} = require('@sanity/client');
const {nanoid} = require('nanoid');
const TurndownService = require('turndown');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'frontend', '.env.local') });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
});

console.log('📦 WordPress to Sanity Import\n');
console.log(`Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}`);
console.log(`Dataset: ${process.env.NEXT_PUBLIC_SANITY_DATASET}\n`);

// Load extracted posts
const posts = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'wordpress-posts.json'), 'utf8'));

// Load image mapping
let imageMapping = {};
const imageMappingPath = path.join(__dirname, '..', '..', 'image-mapping.json');
if (fs.existsSync(imageMappingPath)) {
  imageMapping = JSON.parse(fs.readFileSync(imageMappingPath, 'utf8'));
  console.log(`📷 Loaded ${Object.keys(imageMapping).length} image mappings\n`);
}

console.log(`📚 Loaded ${posts.length} posts from wordpress-posts.json\n`);

// Initialize Turndown
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

// Process WordPress shortcodes
function processShortcodes(html) {
  // Handle [caption] shortcodes
  // Format: [caption id="..." align="..." width="..."]<img />Caption text[/caption]
  html = html.replace(
    /\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/gi,
    (match, content) => {
      // Extract image tag if present
      const imgMatch = content.match(/<img[^>]*>/i);
      const imgTag = imgMatch ? imgMatch[0] : '';

      // Extract caption text (everything after the img tag)
      const captionText = content.replace(/<img[^>]*>/i, '').trim();

      // Return both the image and caption text as a blockquote
      if (imgTag && captionText) {
        return `${imgTag}<blockquote>${captionText}</blockquote>`;
      } else if (imgTag) {
        return imgTag;
      } else {
        return `<blockquote>${captionText}</blockquote>`;
      }
    }
  );

  return html;
}

// Extract images from HTML and create Sanity image blocks
function extractImages(html) {
  const images = [];

  // Find all img tags with escaped quotes
  const imgMatches = html.matchAll(/<img[^>]+src=\\*["']([^"'\\]+)\\*["'][^>]*>/gi);

  for (const match of imgMatches) {
    const imgTag = match[0];
    const url = match[1];

    // Check if we have this image in Sanity
    if (imageMapping[url]) {
      images.push({
        tag: imgTag,
        url: url,
        assetId: imageMapping[url]
      });
    }
  }

  return images;
}

// Convert HTML to Sanity blocks with formatting preserved
function htmlToBlocks(html) {
  if (!html) return [];

  // First, decode SQL escaped sequences
  let cleanHtml = html
    .replace(/\\r\\n/g, '\n')    // Windows newlines from SQL
    .replace(/\\n/g, '\n')        // Unix newlines from SQL
    .replace(/\\r/g, '\n')        // Mac newlines from SQL
    .replace(/\\"/g, '"')         // Escaped double quotes
    .replace(/\\'/g, "'")         // Escaped single quotes
    .replace(/\\\\/g, '\\');      // Double backslash to single

  // Extract images AFTER cleaning escape sequences
  const images = extractImages(cleanHtml);

  // Replace image tags with placeholders
  for (let i = 0; i < images.length; i++) {
    cleanHtml = cleanHtml.replace(images[i].tag, `__IMAGE_PLACEHOLDER_${i}__`);
  }

  // Process WordPress shortcodes
  cleanHtml = processShortcodes(cleanHtml);

  // Convert HTML to Markdown
  const markdown = turndownService.turndown(cleanHtml);

  // Parse Markdown to Sanity blocks
  const blocks = markdownToBlocks(markdown);

  // Replace image placeholders with Sanity image blocks
  const finalBlocks = [];
  for (const block of blocks) {
    // Check if block contains image placeholder
    const text = block.children?.[0]?.text || '';
    const placeholderMatch = text.match(/__IMAGE_PLACEHOLDER_(\d+)__/);

    if (placeholderMatch) {
      const imageIndex = parseInt(placeholderMatch[1]);
      const image = images[imageIndex];

      // Add Sanity image block
      finalBlocks.push({
        _type: 'image',
        _key: nanoid(),
        asset: {
          _type: 'reference',
          _ref: image.assetId
        }
      });

      // If there's text after the placeholder, keep that in a new block
      const remainingText = text.replace(/__IMAGE_PLACEHOLDER_\d+__/, '').trim();
      if (remainingText) {
        finalBlocks.push(createBlock('normal', remainingText));
      }
    } else {
      finalBlocks.push(block);
    }
  }

  return finalBlocks;
}

// Parse Markdown and create Sanity blocks with formatting
function markdownToBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split('\n');
  let currentParagraph = [];

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join('\n').trim();
      if (text) {
        blocks.push(createBlock('normal', text));
      }
      currentParagraph = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    // Blockquotes
    const blockquoteMatch = trimmed.match(/^>\s*(.+)$/);
    if (blockquoteMatch) {
      flushParagraph();
      const text = blockquoteMatch[1];
      blocks.push(createBlock('blockquote', text));
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      blocks.push(createBlock(`h${level}`, text));
      continue;
    }

    // List items
    if (trimmed.match(/^[-*+]\s/) || trimmed.match(/^\d+\.\s/)) {
      flushParagraph();
      const text = trimmed.replace(/^[-*+]\s/, '').replace(/^\d+\.\s/, '');
      currentParagraph.push(text);
      continue;
    }

    // Regular paragraph lines
    currentParagraph.push(trimmed);
  }

  flushParagraph();
  return blocks;
}

// Create a Sanity block with inline formatting
function createBlock(style, text) {
  const children = parseInlineFormatting(text);

  return {
    _type: 'block',
    _key: nanoid(),
    style: style,
    children: children,
    markDefs: [],
  };
}

// Parse inline Markdown formatting (bold, italic, links)
function parseInlineFormatting(text) {
  const children = [];
  let currentText = '';
  let i = 0;

  function addTextSpan(content, marks = []) {
    if (content) {
      children.push({
        _type: 'span',
        _key: nanoid(),
        text: content,
        marks: marks,
      });
    }
  }

  while (i < text.length) {
    // Bold: **text** or __text__
    if ((text[i] === '*' && text[i + 1] === '*') || (text[i] === '_' && text[i + 1] === '_')) {
      addTextSpan(currentText);
      currentText = '';

      const delimiter = text.slice(i, i + 2);
      i += 2;
      let boldText = '';

      while (i < text.length - 1 && text.slice(i, i + 2) !== delimiter) {
        boldText += text[i];
        i++;
      }

      if (text.slice(i, i + 2) === delimiter) {
        addTextSpan(boldText, ['strong']);
        i += 2;
      } else {
        currentText += delimiter + boldText;
      }
      continue;
    }

    // Italic: *text* or _text_
    if ((text[i] === '*' || text[i] === '_') && text[i + 1] !== text[i]) {
      addTextSpan(currentText);
      currentText = '';

      const delimiter = text[i];
      i += 1;
      let italicText = '';

      while (i < text.length && text[i] !== delimiter) {
        italicText += text[i];
        i++;
      }

      if (text[i] === delimiter) {
        addTextSpan(italicText, ['em']);
        i += 1;
      } else {
        currentText += delimiter + italicText;
      }
      continue;
    }

    // Links: [text](url)
    if (text[i] === '[') {
      addTextSpan(currentText);
      currentText = '';

      i += 1;
      let linkText = '';

      while (i < text.length && text[i] !== ']') {
        linkText += text[i];
        i++;
      }

      if (text[i] === ']' && text[i + 1] === '(') {
        i += 2;
        let url = '';

        while (i < text.length && text[i] !== ')') {
          url += text[i];
          i++;
        }

        if (text[i] === ')') {
          // For now, just add link text without actual link (would need markDefs)
          addTextSpan(linkText);
          i += 1;
        } else {
          currentText += '[' + linkText + '](' + url;
        }
      } else {
        currentText += '[' + linkText;
      }
      continue;
    }

    currentText += text[i];
    i++;
  }

  addTextSpan(currentText);

  // If no children were added, add a default empty span
  if (children.length === 0) {
    children.push({
      _type: 'span',
      _key: nanoid(),
      text: '',
      marks: [],
    });
  }

  return children;
}

// Convert to Sanity format
function toSanityDoc(post) {
  const slug = (post.slug || post.title
    .toLowerCase()
    .replace(/[^a-z0-9æøå]+/g, '-')
    .replace(/(^-|-$)/g, '')).substring(0, 200);

  return {
    _type: 'post',
    _id: `imported-${post.id}`,
    title: post.title,
    slug: {
      _type: 'slug',
      current: slug,
    },
    publishedAt: post.date,
    date: post.date,
    content: htmlToBlocks(post.content),
    excerpt: post.excerpt || '',
  };
}

// Import posts
async function importPosts() {
  console.log('🔄 Starting import...\n');

  let success = 0;
  let errors = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];

    try {
      const doc = toSanityDoc(post);
      await client.createOrReplace(doc);
      success++;

      if (success % 10 === 0 || success === posts.length) {
        console.log(`   ✅ Imported ${success}/${posts.length}: ${post.title.substring(0, 50)}...`);
      }
    } catch (error) {
      console.error(`   ❌ Error importing "${post.title}": ${error.message}`);
      errors++;
    }
  }

  console.log(`\n✨ Import complete!`);
  console.log(`   ✅ Success: ${success}`);
  if (errors > 0) {
    console.log(`   ❌ Errors: ${errors}`);
  }

  console.log(`\n🎉 Your WordPress blog is now in Sanity!`);
  console.log(`   Visit http://localhost:3333 to see your posts in Sanity Studio`);
}

// Run
importPosts().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
