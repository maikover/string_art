// Post-build script: copies Next.js static export to a flat directory for Capacitor
import { cpSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

// Always use absolute paths - script is at web/scripts/, so webDir = web/
const scriptDir = join('/home/maikover/Projects/string_art/web');
const nextExportDir = join(scriptDir, '.next/server/app');
const outputDir = join('/home/maikover/Projects/string_art/web/android/app/src/main/assets/public');

function copyRecursive(src, dest) {
  if (!existsSync(src)) return;
  const stat = statSync(src);
  if (stat.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    for (const entry of readdirSync(src)) {
      copyRecursive(join(src, entry), join(dest, entry));
    }
  } else {
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest);
  }
}

mkdirSync(outputDir, { recursive: true });

// Copy index.html to root (Capacitor entry point)
const indexSrc = join(nextExportDir, 'index.html');
if (existsSync(indexSrc)) {
  cpSync(indexSrc, join(outputDir, 'index.html'));
  console.log('Copied index.html');
}

// Copy _next/static
const staticSrc = join(scriptDir, '.next', 'static');
if (existsSync(staticSrc)) {
  copyRecursive(staticSrc, join(outputDir, '_next'));
  console.log('Copied _next/static');
}

// Copy server chunks
const chunksSrc = join(scriptDir, '.next', 'server', 'chunks');
if (existsSync(chunksSrc)) {
  copyRecursive(chunksSrc, join(outputDir, 'server', 'chunks'));
  console.log('Copied server/chunks');
}

// Copy manifests
const manifestFiles = [
  'server/middleware-manifest.json',
  'server/middleware-middleware-manifest.json',
];
for (const mf of manifestFiles) {
  const src = join(scriptDir, '.next', mf);
  if (existsSync(src)) {
    copyRecursive(src, join(outputDir, mf));
    console.log(`Copied ${mf}`);
  }
}

console.log('Capacitor assets prepared at', outputDir);