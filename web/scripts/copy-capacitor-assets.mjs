// Post-build script: copies Next.js static export to a flat directory for Capacitor.
// Resolves all paths relative to the script's own location so it works on macOS/Linux/Windows.
import { cpSync, mkdirSync, existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// web/ — web project root, sibling of scripts/
const webRoot = resolve(__dirname, '..');

// Discover distDir from next.config.ts (or fall back to default 'out' for `output: 'export'`).
function readNextDistDir() {
  const cfgPath = join(webRoot, 'next.config.ts');
  if (!existsSync(cfgPath)) return 'dist';
  try {
    const src = readFileSync(cfgPath, 'utf8');
    const m = src.match(/distDir\s*:\s*['"]([^'"]+)['"]/);
    return m ? m[1] : 'dist';
  } catch {
    return 'dist';
  }
}

const distDirName = readNextDistDir();
const exportDir = join(webRoot, distDirName);
const outputDir = join(webRoot, 'android', 'app', 'src', 'main', 'assets', 'public');

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

let copied = 0;

// Copy index.html to root (Capacitor entry point)
const indexSrc = join(exportDir, 'index.html');
if (existsSync(indexSrc)) {
  cpSync(indexSrc, join(outputDir, 'index.html'));
  console.log('Copied index.html');
  copied++;
}

// Copy _next/static
const staticSrc = join(exportDir, '_next');
if (existsSync(staticSrc)) {
  copyRecursive(staticSrc, join(outputDir, '_next'));
  console.log('Copied _next/');
  copied++;
}

// Copy any other top-level files (favicon, etc.)
for (const entry of readdirSync(exportDir)) {
  if (entry === 'index.html' || entry === '_next') continue;
  const src = join(exportDir, entry);
  const dest = join(outputDir, entry);
  if (statSync(src).isDirectory()) {
    copyRecursive(src, dest);
  } else {
    cpSync(src, dest);
  }
  console.log(`Copied ${entry}`);
  copied++;
}

console.log(`Capacitor assets prepared at ${outputDir} (${copied} entries from ${exportDir})`);
