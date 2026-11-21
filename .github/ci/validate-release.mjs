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
check(/^\d+\.\d+\.\d+$/.test(module.version), 'Expected a semantic release version');
check(module.version === readJSON('package.json').version, 'Package/manifest version mismatch');
check(module.manifest === 'https://raw.githubusercontent.com/Blackbiji/merp-ui/main/module.json', 'Unexpected manifest URL');
check(module.download === `https://github.com/Blackbiji/merp-ui/releases/download/v${module.version}/merp-ui-${module.version}.zip`, 'Unexpected release ZIP URL');
check(module.packs?.length === 11, 'Expected eleven Compendiums');
// Publication notices are mandatory; presence checks are NOT legal clearance.
for (const file of ['README.md', 'NOTICE.md', 'docs/RIGHTS-CHECKLIST-NEXT-RELEASE.md']) requireFile(file);
const noticeText = readFileSync(join(root, 'NOTICE.md'), 'utf8');
const readmeText = readFileSync(join(root, 'README.md'), 'utf8');
check(noticeText.includes('Rolemaster Unified (RMU) is a copyrighted and trademarked property of Iron Crown Enterprises Ltd'),
  'NOTICE.md must acknowledge the Rolemaster Unified / RMU copyright and trademark');
check(noticeText.includes('**descriptive title**') && noticeText.includes('does not challenge'),
  'NOTICE.md must describe MERP-RMU as a descriptive title without trademark challenge');
check(noticeText.includes('not authorised, licensed, sponsored, affiliated with, or endorsed'),
  'NOTICE.md must disclaim ICE endorsement');
check(noticeText.includes('ICE cannot authorise a Middle-earth fan publication'),
  'NOTICE.md must distinguish Middle-earth rights from RMU rights');
check(noticeText.includes('non-commercial nature') && noticeText.includes('does not by itself create a licence'),
  'NOTICE.md must state that non-commercial use is not a licence');
check(noticeText.includes('Les droits relatifs à **la Terre du Milieu'),
  'NOTICE.md must contain the separate French-language rights notice');
check(readmeText.includes('**Rights and naming.**') && readmeText.includes('**Required official products:**'),
  'README.md must display the rights notice and the official RMU dependency');
check(module.description.includes('purely descriptive title') && module.description.includes('no trademark challenge'),
  'module.json must display the MERP-RMU descriptive-name disclaimer');

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
console.log(`MERP-ui ${module.version} release consistency: OK.`);

const wargLore = readJSON('source/creature-lore/warg-v2.0.12.json');
check(wargLore.schema === 'merp-ui/creature-lore/v1', 'Warg Lore schema mismatch');
check(wargLore.results?.length === 455, 'Warg Lore: expected 455 results');
const wargGroups = new Map();
for (const entry of wargLore.results ?? []) {
  const group = entry.loreKey + '/' + (entry.regionKey || entry.cultureKey);
  const degrees = wargGroups.get(group) || [];
  degrees.push(entry.outcome);
  wargGroups.set(group, degrees);
  check(entry.creatureKey === 'warg' && typeof entry.text === 'string' &&
    entry.text.length > 350, 'Invalid Warg prose in '+group);
}
check([...wargGroups.keys()].filter(x=>x.startsWith('racial/')).length===60,
  'Expected 60 cultural variants');
check([...wargGroups.keys()].filter(x=>x.startsWith('region/')).length===31,
  'Expected 31 regional variants');
check([...wargGroups.values()].every(x=>x.length===5 && new Set(x).size===5),
  'Warg table variant missing result degrees');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Warg Lore source: 60 cultural and 31 regional variants verified.');

const compactionPath=join(root,'dist/leveldb-compaction-report.json');
check(existsSync(compactionPath),'Missing offline LevelDB reconstruction audit');
if(existsSync(compactionPath)){
  const audit=JSON.parse(readFileSync(compactionPath,'utf8'));
  check(audit.version===module.version && audit.packCount===11 && audit.identical===true,
    'Invalid LevelDB rebuild report');
  check(audit.packs?.length===11 && audit.packs.every(p=>
    p.logical?.entries>0 && /^[a-f0-9]{64}$/.test(p.logical.sha256??'') &&
    p.physicalAfter?.ldb>=1 && p.physicalAfter?.manifests===1),
    'Missing compendium contents or physical files after rebuild');
  check(audit.savedBytes>8000000,'Compendium rebuild saved less than 8 MB; refusing to publish without investigation');
  check(audit.packs.find(p=>p.pack==='merp-ui-lore')?.logical?.types?.['!tables.results']===755,
    'Expected 755 linked TableResult records for Foundry to hydrate');
  check(audit.packs.find(p=>p.pack==='merp-ui-lore')?.logical?.types?.['!tables']===2,
    'Expected one RollTable each for Wolf and Warg');
  check(audit.packs.find(p=>p.pack==='merp-ui-creatures')?.logical?.types?.['!folders']===26,
    'Creature Actor Compendium: expected 26 native folder documents');
  check(audit.packs.find(p=>p.pack==='merp-ui-creatures')?.logical?.types?.['!actors']===2 &&
    audit.packs.find(p=>p.pack==='merp-ui-creatures')?.logical?.types?.['!actors.items']===55,
    'Expected 2 Actors and 55 linked Item documents');
  console.log('Offline LevelDB audit:',audit.packCount,'packs; ',
    audit.savedBytes,'bytes eliminated; all logical records identical.');
}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
