import { createHash } from 'node:crypto';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const root = process.cwd();
const errors = [];
let checked = 0;
const check = (ok, message) => { if (!ok) errors.push(message); };
const readJSON = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const requireFile = (path) => check(existsSync(join(root, path)), 'Missing file: ' + path);

const module = readJSON('module.json');
check(module.id === 'merp-ui', 'Module ID changed');
check(module.version === '2.0.3', 'Expected version 2.0.3');
check(module.manifest === 'https://raw.githubusercontent.com/Blackbiji/merp-ui/main/module.json', 'Unexpected manifest URL');
check(module.download === 'https://github.com/Blackbiji/merp-ui/releases/download/v2.0.3/merp-ui-2.0.3.zip', 'Unexpected release ZIP URL');
check(module.packs?.length === 9, 'Expected nine Compendiums');
for (const path of [...module.esmodules, ...module.styles, ...module.languages.map(e => e.path)]) requireFile(path);
for (const pack of module.packs) {
  const folder = join(root, pack.path);
  check(existsSync(join(folder, 'CURRENT')), pack.name + ': missing LevelDB CURRENT');
  check(existsSync(folder) && readdirSync(folder).some(n => n.endsWith('.ldb')), pack.name + ': missing LevelDB data');
}

const manifest = readJSON('source/compendiums/content-sync-manifest.json');
check(manifest.packs?.length === 9, 'Expected nine source-manifest packs');
check(/^[a-f0-9]{64}$/.test(manifest.fingerprint || ''), 'Missing/malformed sync fingerprint');
const seenIds = new Set();
let races = 0;
for (const pack of manifest.packs) {
  check(module.packs.some(p => p.name === pack.name), 'Unknown source pack: ' + pack.name);
  for (const item of pack.sources) {
    checked++;
    const file = item.file;
    const absolute = resolve(root, file);
    if (!absolute.startsWith(root + sep)) { errors.push('Unsafe source path: ' + file); continue; }
    if (!existsSync(absolute)) { errors.push('Missing source: ' + file); continue; }
    const digest = createHash('sha256').update(readFileSync(absolute)).digest('hex');
    check(digest === item.hash, 'Source hash mismatch: ' + file);
    const source = readJSON(file);
    check(source.key === item.key, 'Source key mismatch: ' + file);
    const identity = pack.name + ':' + item.id;
    check(!seenIds.has(identity), 'Duplicate document ID: ' + identity);
    seenIds.add(identity);
    if (pack.name === 'merp-rmu-races') {
      races++;
      for (const lang of ['fr','en']) {
        check((source.localizations?.[lang]?.system?.description || '').length > 100, file + ': missing ' + lang + ' description');
      }
    }
    if (pack.name === 'merp-rmu-talents-flaws' && ['dunedain-western-endurance','dunedain-disease-resistance','dunedain-longevity'].includes(item.key)) {
      for (const lang of ['fr','en']) {
        check(Boolean(source.localizations?.[lang]?.name), item.key + ': missing ' + lang + ' name');
        check(Boolean(source.localizations?.[lang]?.system?.description), item.key + ': missing ' + lang + ' text');
      }
    }
  }
}
check(races === 12, 'Expected twelve race sources, found ' + races);
console.log('Checked ' + checked + ' source hashes, ' + module.packs.length + ' packs and ' + races + ' races.');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('MERP-UI 2.0.3 release consistency: OK.');
