/**
 * Generate a deterministic release fingerprint for ALL MERP-RMU source JSONs.
 * Run after editing source/compendiums, and commit the manifest with the release.
 * `node scripts/build-merp-rmu-sync-manifest.mjs --check` validates it in CI.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await fs.readFile(path.join(root, 'source/compendiums/manifest.json'), 'utf8'));
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
// Keep UUIDs aligned with build-merp-rmu-compendiums.mjs.
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function stableId(packName, sourceKey) {
  const digest = crypto.createHash('sha256').update(`${packName}:${sourceKey}`).digest();
  let value = 0n;
  for (const byte of digest.subarray(0, 12)) value = (value << 8n) + BigInt(byte);
  let id = '';
  for (let i = 0; i < 16; i++) { id = BASE62[Number(value % 62n)] + id; value /= 62n; }
  return id;
}
const packs = [];
for (const pack of config.packs) {
  const dir = path.join(root, pack.sourceDirectory);
  const files = (await fs.readdir(dir)).filter((name) => name.endsWith('.json')).sort();
  if (files.length !== pack.count) throw Error(`${pack.name}: expected ${pack.count} sources, got ${files.length}`);
  const sources = [];
  const keys = new Set();
  for (const filename of files) {
    const relative = `${pack.sourceDirectory}/${filename}`;
    const bytes = await fs.readFile(path.join(root, relative));
    const definition = JSON.parse(bytes.toString('utf8'));
    if (!definition.key || keys.has(definition.key)) throw Error(`${pack.name}: missing or repeated source key ${definition.key}`);
    keys.add(definition.key);
    sources.push({ key: definition.key, id: stableId(pack.name, definition.key), file: relative, hash: sha(bytes) });
  }
  packs.push({ name: pack.name, type: pack.type, sources });
}
const fingerprint = sha(JSON.stringify(packs));
const data = { schemaVersion: 1, fingerprint, packs };
const output = path.join(root, 'source/compendiums/content-sync-manifest.json');
const expected = JSON.stringify(data, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (await fs.readFile(output, 'utf8') !== expected) throw Error('content-sync-manifest.json is stale. Rebuild it.');
  console.log(`Validated ${packs.length} MERP-RMU packs / ${packs.reduce((n,p)=>n+p.sources.length,0)} documents: ${fingerprint}`);
} else {
  await fs.writeFile(output, expected);
  console.log(`Generated ${packs.length} MERP-RMU packs / ${packs.reduce((n,p)=>n+p.sources.length,0)} documents: ${fingerprint}`);
}
