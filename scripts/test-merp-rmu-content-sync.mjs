/** Offline, deterministic tests with a minimal Foundry API stub. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async (p) => JSON.parse(await fs.readFile(path.join(ROOT, p), 'utf8'));
const manifest = await read('source/compendiums/content-sync-manifest.json');
const info = await read('source/compendiums/manifest.json');
const clone = (obj) => structuredClone(obj);
const settings = new Map();
const KEY = 'merp-ui.merpRmuContentSourceFingerprint';
let language = 'en';
let fetchCount = 0;
let patchSource = false;
let failedLock = false;
let packUpdates = 0;
let pagesUpdated = 0;

function assign(target, key, value) {
  const parts = key.split('.');
  let dst = target;
  for (const part of parts.slice(0, -1)) dst = dst[part] ??= {};
  dst[parts.at(-1)] = clone(value);
}
class FakeJournal {
  constructor(data) { this.source = clone(data); this.id = this.source._id; this.name = this.source.name; this.flags = this.source.flags; this.pages = { contents: (this.source.pages ?? []).map((page, i) => ({...clone(page), id: page._id ?? `PAGE-${i}`})) }; }
  async update(patch) {
    packUpdates++;
    for (const [key, value] of Object.entries(patch)) assign(this.source, key, value);
    this.name = this.source.name; this.flags = this.source.flags;
  }
  async updateEmbeddedDocuments(_kind, updates) {
    pagesUpdated += updates.length;
    for (const update of updates) {
      const page = this.pages.contents.find((p) => p.id === update._id);
      assert(page, 'page IDs are preserved');
      for (const [key, value] of Object.entries(update)) if (key !== '_id') assign(page, key, value);
    }
  }
  toObject() { return clone(this.source); }
}
class FakeItem {
  constructor(source) { this.source = clone(source); this.id = this.source._id; this.name = this.source.name; this.flags = this.source.flags; }
  toObject() { return clone(this.source); }
  async update(patch) { packUpdates++; for(const [key,value] of Object.entries(patch)) assign(this.source,key,value); this.name=this.source.name;this.flags=this.source.flags; }
}
const packs = new Map();
for (const p of info.packs) {
  const rows = (await fs.readFile(path.join(ROOT,p.seedPath),'utf8')).trim().split('\n').map(JSON.parse);
  const docs = new Map(rows.map(d => [d._id, p.type === 'Item' ? new FakeItem(d) : new FakeJournal(d)]));
  const pack = {
    locked: true, metadata:{locked:true}, documentName:p.type, collection:`merp-ui.${p.name}`,
    async configure({locked}) { if (failedLock && !locked) throw Error('unavailable lock'); this.locked=locked; },
    async getIndex() { return [...docs.values()].map(d => ({ _id:d.id, flags:d.flags })); },
    async getDocument(id) { return docs.get(id); },
    docs
  };
  packs.set(`merp-ui.${p.name}`, pack);
}
const introPack = packs.get('merp-ui.merp-rmu-rules');
const intro = [...introPack.docs.values()].find((d)=> d.flags?.['merp-ui']?.compendiumSourceKey === 'merp-rmu-introduction');
assert(intro);
const initialIds = intro.pages.contents.map(p => p.id);
assert.equal(initialIds.length,7,'intro retains settings guide');
const originalGuide = clone(intro.pages.contents[6]);

globalThis.game = {
 user: {isGM:true}, system:{id:'rmu'}, packs,
 journal: {contents:[]},
 settings: {
   settings:new Map(),
   register(namespace,key,definition) {this.settings.set(`${namespace}.${key}`,definition);},
   get(namespace,key) {return settings.get(`${namespace}.${key}`) ?? '';},
   async set(namespace,key,value){settings.set(`${namespace}.${key}`,value);}
 }
};
globalThis.foundry = {utils:{getRoute:(x)=>x,deepClone:clone,mergeObject:(base,overlay)=> Object.assign(clone(base),clone(overlay))}};
globalThis.ui = {notifications:{info() {}, warn() {} }};
// Modern Foundry top-level Compendium writes use Document static methods;
// only JournalEntryPage is an embedded Document in a JournalEntry.
const topLevelUpdate = async (updates, {pack}) => {
  const target = packs.get(pack);
  assert(target, `Compendium ${pack} must exist`);
  for (const patch of updates) {
    const doc = target.docs.get(patch._id);
    assert(doc, `Document ${patch._id} must exist`);
    await doc.update(Object.fromEntries(Object.entries(patch).filter(([key]) => key !== '_id')));
  }
};
globalThis.Item = {updateDocuments: topLevelUpdate};
globalThis.JournalEntry = {updateDocuments: topLevelUpdate};
globalThis.JournalEntryPage = {updateDocuments: async (updates, {parent}) =>
  parent.updateEmbeddedDocuments('JournalEntryPage', updates)};

globalThis.fetch = async (url) => {
  fetchCount++;
  const pathname = url.replace('modules/merp-ui/', '');
  const data = await read(pathname);
  if (patchSource && pathname === 'source/compendiums/merp-rmu-rules/merp-rmu-introduction.json') {
    data.localizations.en.pages[0].text.content += '<p>Test new editorial content</p>';
  }
  return {ok:true, json:async()=>data};
};
const { registerMerpRmuContentSyncSettings, synchronizeMerpRmuSources } = await import('./merp-rmu/content-sync.js');
registerMerpRmuContentSyncSettings();
assert(game.settings.settings.has(KEY));
// Fresh seed and sources match exactly: no rewrite on initial GM startup.
const first = await synchronizeMerpRmuSources();
assert.equal(first.errors,0,JSON.stringify(first.packs.filter(p=>p.errors.length)));
assert.equal(first.changed,0,'fresh seeds should not rewrite existing documents');
assert.equal(packUpdates,0);
assert.equal(pagesUpdated,0);
const afterUpgrade = await synchronizeMerpRmuSources({force:true, dryRun:true});
assert.equal(afterUpgrade.changed,0,'the same sources must be stable after the upgrade');
pagesUpdated=0;
assert.equal(intro.pages.contents.length,7);
assert.deepEqual(intro.pages.contents[6],originalGuide);
assert.equal(settings.get(KEY),`v2:${manifest.fingerprint}:en`);
const priorFetches=fetchCount;
const second=await synchronizeMerpRmuSources();
assert.equal(second.skipped,true);
assert.equal(fetchCount,priorFetches+1,'only loads manifest on unchanged revision');
// Single source change: page updated by original page ID, other pages preserved.
patchSource = true;
const updated = await synchronizeMerpRmuSources({ force:true });
assert.equal(updated.errors,0);
assert.equal(updated.changed,1);
assert.equal(pagesUpdated,1);
assert.match(intro.pages.contents[0].text.content,/Test new editorial content/);
assert.deepEqual(intro.pages.contents.map(p=>p.id),initialIds);
assert.deepEqual(intro.pages.contents[6],originalGuide);
for(const pack of packs.values()) assert.equal(pack.locked,true,'lock always restored');
// World journal only updated when explicitly requested.
const worldJournal=new FakeJournal(intro.toObject());
worldJournal.pages={contents:intro.pages.contents.map(p=>clone(p))};
worldJournal.flags['merp-ui'].compendiumPack='merp-rmu-rules';
worldJournal.flags['merp-ui'].compendiumSourceKey='merp-rmu-introduction';
worldJournal.pages.contents[0].text.content='Personal world note';
game.journal.contents.push(worldJournal);
await synchronizeMerpRmuSources({ force:true });
assert.equal(worldJournal.pages.contents[0].text.content,'Personal world note');
await synchronizeMerpRmuSources({ force:true, worldJournals:true });
assert.match(worldJournal.pages.contents[0].text.content,/Test new editorial content/);
// A missing document in an older migrated LevelDB pack must be detectable
// as a safe new entry, not created with a random identity. Dry-run first.
const skillsPack = packs.get('merp-ui.merp-rmu-skills');
const missingSource = manifest.packs.find(p => p.name === 'merp-rmu-skills').sources[0];
assert(skillsPack.docs.has(missingSource.id),'Stable manifest IDs match built Compendium IDs');
const temporarilyMissing = skillsPack.docs.get(missingSource.id);
skillsPack.docs.delete(missingSource.id);
const newEntryPlan = await synchronizeMerpRmuSources({ force:true, dryRun:true, packs:['merp-rmu-skills'] });
assert.equal(newEntryPlan.created,1,'reports a future new source entry');
assert.equal(newEntryPlan.errors,0);
skillsPack.docs.set(missingSource.id,temporarilyMissing);
// French localizations use the same IDs; guide stays untouched.
settings.set('merp-ui.contentLanguage','fr');
patchSource=false;
const french=await synchronizeMerpRmuSources({ force:true, packs:['merp-rmu-rules'] });
assert.equal(french.errors,0);
assert.equal(intro.pages.contents[0].name,'Bienvenue dans MERP-RMU');
assert.deepEqual(intro.pages.contents.map(p=>p.id),initialIds);
assert.deepEqual(intro.pages.contents[6],originalGuide);
// Non-GM security
const before=packUpdates; game.user.isGM=false;
assert.equal((await synchronizeMerpRmuSources({force:true})).skipped,true);
assert.equal(packUpdates,before);
console.log('PASS: 9 packs / 455 sources; unchanged, incremental edit, UUIDs, extra page, world protection, locks, GM security.');
