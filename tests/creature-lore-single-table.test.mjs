import test from 'node:test';
import assert from 'node:assert/strict';
import {ClassicLevel} from 'classic-level';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const outcomes=['absoluteFailure','failure','partialSuccess','success','absoluteSuccess'];
const source=JSON.parse(readFileSync('source/creature-lore/warg-v2.0.12.json','utf8'));
const french=JSON.parse(readFileSync('source/creature-lore/warg-fr-v1.json','utf8'));
const racial=JSON.parse(readFileSync('source/creature-lore/drafts/warg-racial-fr-structured.json','utf8'));
const normalized=val=>createHash('sha256').update(val).digest('hex');
const expectedEnglish=new Map(source.results.map(row=>[
  row.loreKey+'/'+(row.regionKey??row.cultureKey)+'/'+row.outcome,row.text
]));
const opened=new ClassicLevel('packs/merp-ui-lore',{keyEncoding:'utf8',valueEncoding:'utf8',createIfMissing:false});
await opened.open();
const tables=[];
try{
 for await(const [key,value] of opened.iterator()){
  const doc=JSON.parse(value);
  if(key.startsWith('!tables.results!'))
    assert.fail('Detached results are not visible in native Foundry RollTables: '+key);
  else if(key.startsWith('!tables!'))tables.push({key,doc});
  else assert.fail('Unrecognised LevelDB record: '+key);
 }
}finally{await opened.close()}
const entries=tables.flatMap(({key,doc})=>
  (doc.results??[]).map(result=>({key:'!tables.results!'+doc._id+'.'+result._id,doc:result})));


test('Two private RollTables and exactly one table per creature',()=>{
 assert.equal(tables.length,2);
 assert.equal(entries.length,755);
 const names=tables.map(x=>x.doc.flags?.['merp-ui']?.creatureLoreTable?.creatureKey).sort();
 assert.deepEqual(names,['warg','wolf']);
 for(const {key,doc} of tables){
  assert.equal(doc.flags['merp-ui'].creatureLoreTable.loreKey,'all');
  assert.equal(doc.formula,'1d'+doc.results.length);
  assert.ok(Array.isArray(doc.results) && doc.results.length>0,
    'The native Foundry RollTable must contain embedded results');
  assert.equal(doc.type===undefined||doc.type==='RollTable',true);
 }
});

test('Every result is linked to its species and one of four Lore families',()=>{
 const expected={wolf:235,warg:520};
 for(const [creature,count] of Object.entries(expected)){
  const parent=tables.find(x=>x.doc.flags['merp-ui'].creatureLoreTable.creatureKey===creature);
  const subset=parent.doc.results.map(doc=>({key:'!tables.results!'+parent.doc._id+'.'+doc._id,doc}));
  assert.equal(subset.length,count);
  assert.equal(new Set(subset.map(x=>x.doc._id)).size,count);
  assert.deepEqual(subset.map(x=>x.doc.range[0]).sort((a,b)=>a-b),
    Array.from({length:count},(_,i)=>i+1));
  const unique=new Set();
  for(const {doc} of subset){
    const f=doc.flags?.['merp-ui']?.creatureLoreEntry;
    assert.equal(f.creatureKey,creature);
    assert.ok(['racial','cultural','region','historic'].includes(f.loreKind));
    assert.ok(outcomes.includes(f.outcome));
    assert.equal(doc.description.length>200,true);
    const variant=f.loreKind==='racial'?f.raceKey:
      f.loreKind==='cultural'?f.cultureKey:
      f.loreKind==='region'?(f.regionKey??'*'):'*';
    assert.ok(variant);
    const key=f.loreKind+'/'+variant+'/'+f.outcome;
    assert.ok(!unique.has(key),'Repeated result '+creature+'/'+key);
    unique.add(key);
  }
 }
});

test('Wolf and Warg semantic families are separate, with no bogus Warg Historic Lore',()=>{
 const counts={};
 for(const {doc} of entries){
  const f=doc.flags?.['merp-ui']?.creatureLoreEntry;
  const key=f.creatureKey+'/'+f.loreKind;counts[key]=(counts[key]??0)+1;
 }
 assert.equal(counts['wolf/historic'],5);
 assert.equal(counts['wolf/region'],5);
 assert.equal(counts['wolf/racial']+counts['wolf/cultural'],225);
 assert.equal(counts['warg/racial'],60);
 assert.equal(counts['warg/cultural'],300);
 assert.equal(counts['warg/region'],160);
 assert.equal(counts['warg/historic']??0,0);
});

test('All 455 prior Warg English narratives are unmodified',()=>{
 let preserved=0;
 for(const {doc} of entries){
  const f=doc.flags?.['merp-ui']?.creatureLoreEntry;
  if(f.creatureKey!=='warg'||f.loreKind==='racial'||f.regionKey==='region-arthedain')continue;
  const key=f.loreKey+'/'+(f.regionKey??f.cultureKey)+'/'+f.outcome;
  const orig=expectedEnglish.get(key);
  assert.equal(typeof orig,'string','Missing English baseline '+key);
  assert.equal(normalized(doc.description),normalized(orig),
    'English text changed '+key);
  preserved++;
 }
 assert.equal(preserved,455);
});

test('French 60 cultures and 32 regions are complete and private GM notes remain',()=>{
 assert.equal(french.racial.length,60);
 assert.equal(french.region.length,32);
 const rows=entries.filter(x=>x.doc.flags['merp-ui'].creatureLoreEntry.creatureKey==='warg'
   &&['cultural','region'].includes(x.doc.flags['merp-ui'].creatureLoreEntry.loreKind));
 assert.equal(rows.length,460);
 for(const {doc} of rows){
  const f=doc.flags['merp-ui'].creatureLoreEntry;
  assert.ok(f.localizations?.fr?.text?.length>350);
  assert.ok(f.localizations?.fr?.gmNote?.length>50);
  assert.ok(f.reliability);
  assert.ok(f.gmNote?.length>50);
 }
 assert.equal(rows.filter(x=>x.doc.flags['merp-ui'].creatureLoreEntry.regionKey==='region-arthedain').length,5);
});

test('Twelve authentic Racial Lore sources are French only until EN translation is approved',()=>{
 assert.equal(racial.groups.length,12);
 const rows=entries.filter(x=>x.doc.flags['merp-ui'].creatureLoreEntry.creatureKey==='warg'
   &&x.doc.flags['merp-ui'].creatureLoreEntry.loreKind==='racial');
 assert.equal(rows.length,60);
 assert.equal(new Set(rows.map(x=>x.doc.flags['merp-ui'].creatureLoreEntry.raceKey)).size,12);
 for(const {doc} of rows){
  const f=doc.flags['merp-ui'].creatureLoreEntry;
  assert.ok(f.localizations.fr.text.length>500);
  assert.ok(f.gmNote?.length>100);
  assert.equal(f.englishTranslationStatus,'not-available');
  assert.ok(['approved','pending-author-final-review'].includes(f.editorialStatus));
 }
});

test('The compendium includes the two validated user-provided Creature Actor sources',()=>{
 const creatureSource=JSON.parse(readFileSync('source/creatures/creatures-of-middle-earth-sections.json','utf8'));
 assert.equal(creatureSource.speciesPlacements.length,2);
 assert.equal(creatureSource.packTarget.publicationStatus,'preview-with-wolf-and-warg-actors');
 assert.equal(creatureSource.lorePolicy.actorIntegration.includes('explicit Lore controls'),true);
});

test('Clean-World imported official Wolf and Warg Actors have safe Lore binding',()=>{
  const code=readFileSync('scripts/merp-rmu/creature-lore.js','utf8');
  assert.ok(code.includes("const enableWolfActor=actor=>enableLoreActor(actor,'wolf')"));
  assert.ok(code.includes("const enableWargActor=actor=>enableLoreActor(actor,'warg')"));
  assert.ok(code.includes("Hooks.on('createActor',actor=>{"));
  assert.ok(code.includes('merp-ui-lore-offer-panel'));
  assert.ok(!code.includes("actor.update({'system.notes'"));
  assert.ok(!code.includes("actor.update({'system.description'"));
  assert.ok(code.includes("button.dataset.merpLoreBound==='1'"));
  assert.ok(code.includes("familyHint:source.familyHint"));
});
