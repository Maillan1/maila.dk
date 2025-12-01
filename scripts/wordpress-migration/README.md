# WordPress Migration Scripts

These scripts migrated 59 blog posts from WordPress backup to Sanity CMS.

## Migration Complete ✅

**59 blog posts** successfully imported with:
- Proper handling of escaped characters (\\r\\n, \\', etc.)
- HTML to Markdown conversion preserving formatting
- WordPress shortcode support ([caption])
- Inline formatting (bold, italic, headings, blockquotes)

## Scripts

- `simple-extract.js` - Extracts posts from WordPress SQL dump using regex
- `import-to-sanity.js` - Converts HTML to Markdown and imports to Sanity

## Usage (if needed again)

1. Extract posts from SQL dump:
   ```bash
   node simple-extract.js
   ```
   Outputs: `wordpress-posts.json` (59 posts)

2. Import to Sanity:
   ```bash
   node import-to-sanity.js
   ```
   Uses Turndown for HTML→Markdown conversion

## Note

WordPress backup data is gitignored and local only.
