import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '..', 'data');
const manifestPath = resolve(dataDir, 'sources.json');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

console.log(`Refreshing ${manifest.files.length} data files...\n`);

let okCount = 0;
let failCount = 0;

for (const entry of manifest.files) {
  const outPath = resolve(dataDir, entry.filename);
  process.stdout.write(`  ${entry.filename.padEnd(22)} `);
  try {
    const res = await fetch(entry.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.text();
    JSON.parse(body);
    writeFileSync(outPath, body);
    const sizeKB = (body.length / 1024).toFixed(1);
    console.log(`ok (${sizeKB} KB)`);
    okCount++;
  } catch (err) {
    console.log(`FAILED: ${err.message}`);
    failCount++;
  }
}

const today = new Date().toISOString().slice(0, 10);
manifest._lastRefreshed = today;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`\nDone. ${okCount} succeeded, ${failCount} failed. Manifest timestamp updated to ${today}.`);
process.exit(failCount > 0 ? 1 : 0);
