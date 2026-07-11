/**
 * generate-sw.js — Post-build script for service worker generation.
 *
 * This script:
 * 1. Reads the SW template (public/sw-template.js)
 * 2. Scans .next/static/ for build assets
 * 3. Generates public/precache-manifest.json — the SW consumes this at install time
 * 4. Copies the SW template to public/sw.js
 *
 * The SW's install handler fetches precache-manifest.json and adds all
 * build assets to a precache (Cache First) on install.
 *
 * Usage: node scripts/generate-sw.js
 * Run after `next build` completes.
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE_SRC = path.join(ROOT, 'public', 'sw-template.js');
const OUTPUT_DEST = path.join(ROOT, 'public', 'sw.js');
const PRECACHE_MANIFEST_DEST = path.join(ROOT, 'public', 'precache-manifest.json');

// Static public assets to include in precache manifest
const PUBLIC_PRECACHE = [
  '/favicon.ico',
  '/manifest.json',
  '/img/system/logo1.png',
  '/img/system/logo2.png',
  '/notification.mp3'
];

async function generateSW() {
  console.log('═══════════════════════════════════════════════');
  console.log('  🔧 Generating Service Worker with Workbox');
  console.log('═══════════════════════════════════════════════\n');

  // Check if template exists
  if (!fs.existsSync(TEMPLATE_SRC)) {
    console.error(`❌ Template not found: ${TEMPLATE_SRC}`);
    process.exit(1);
  }

  // Check if build output exists
  const nextStaticDir = path.join(ROOT, '.next', 'static');
  if (!fs.existsSync(nextStaticDir)) {
    console.warn('⚠️  No .next/static/ found. Build may not have run yet.');
    console.log('   Will still generate the SW (precache will be empty).');
  }

  const startTime = Date.now();

  try {
    // ── Step 1: Generate precache-manifest.json ──────────────────────────
    console.log('📝 Generating precache-manifest.json...');

    const precacheEntries = [];

    // Add public assets
    for (const url of PUBLIC_PRECACHE) {
      const filePath = path.join(ROOT, url.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        precacheEntries.push({
          url,
          revision: stats.mtimeMs.toString(36)
        });
      }
    }

    // Add build assets from .next/static/ recursively
    if (fs.existsSync(nextStaticDir)) {
      const walkDir = (dir, basePrefix) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.join(basePrefix, entry.name);

          if (entry.isDirectory()) {
            walkDir(fullPath, relativePath);
          } else if (/\.(js|css|json)$/i.test(entry.name) && !entry.name.endsWith('.map')) {
            const stats = fs.statSync(fullPath);
            const url = `/_next/static/${relativePath.replace(/\\/g, '/')}`;
            precacheEntries.push({
              url,
              revision: stats.mtimeMs.toString(36)
            });
          }
        }
      };

      walkDir(nextStaticDir, '');
    }

    // Write manifest JSON
    fs.writeFileSync(PRECACHE_MANIFEST_DEST, JSON.stringify(precacheEntries, null, 2), 'utf-8');
    console.log(`   ✅ ${precacheEntries.length} entries written to precache-manifest.json`);

    // ── Step 2: Copy template to SW output ───────────────────────────────
    console.log('\n📝 Generating service worker...');

    fs.copyFileSync(TEMPLATE_SRC, OUTPUT_DEST);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`   ✅ SW template copied in ${elapsed}s`);
    console.log(`   📁 Output: ${OUTPUT_DEST}`);

    // Verify the output SW references the precache manifest
    const outputContent = fs.readFileSync(OUTPUT_DEST, 'utf-8');
    if (!outputContent.includes('precache-manifest.json')) {
      console.warn('\n⚠️  Generated SW missing reference to precache-manifest.json.');
      console.warn('   Check that the install handler fetches precache-manifest.json.');
    }

    // Verify precache-manifest.json was written
    const manifestContent = fs.readFileSync(PRECACHE_MANIFEST_DEST, 'utf-8');
    const manifestEntries = JSON.parse(manifestContent);
    console.log(`\n📊 precache-manifest.json: ${manifestEntries.length} URLs ready for SW install`);

    console.log('\n✅ Done!');
  } catch (err) {
    console.error('\n❌ Failed to generate Service Worker:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

generateSW();
