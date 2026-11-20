#!/usr/bin/env node
/**
 * Third-party/official round-trip validation, not a homegrown LevelDB counter:
 * the official @foundryvtt/foundryvtt-cli extractor reconstructs parent
 * RollTables/Actors from their separately stored embedded documents.
 * A missing or incorrect !tables.results! or !actors.items! linkage causes
 * the extraction/count checks to fail before any GitHub release is published.
 */
import {extractPack} from '@foundryvtt/foundryvtt-cli';
import {mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const out=mkdtempSync(join(tmpdir(),'merp-ui-foundry-extract-'));
const getDocs=dir=>readdirSync(dir,{recursive:true})
 .filter(name=>name.endsWith('.json')).map(name=>
 JSON.parse(readFileSync(join(dir,name),'utf8')));
try{
 const loreDir=join(out,'lore'),creaturesDir=join(out,'creatures');
 await extractPack('packs/merp-ui-lore',loreDir,{documentType:'RollTable',yaml:false});
 await extractPack('packs/merp-ui-creatures',creaturesDir,{documentType:'Actor',yaml:false});
 const rawLore=getDocs(loreDir),rawActors=getDocs(creaturesDir);
 const tables=rawLore.filter(x=>x._key?.startsWith('!tables!'));
 const actors=rawActors.filter(x=>x._key?.startsWith('!actors!'));
 const folders=rawActors.filter(x=>x._key?.startsWith('!folders!'));
 assert.equal(tables.length,2,'Official Foundry extractor must find 2 tables');
 assert.equal(actors.length,2,'Official Foundry extractor must find 2 Actors');
 assert.equal(folders.length,26,'Official Foundry extractor must find 26 folders');
 const counts=new Map([['wolf',235],['warg',520]]);
 for(const table of tables){
  const key=table.flags?.['merp-ui']?.creatureLoreTable?.creatureKey;
  assert.ok(counts.has(key),'Unexpected Lore species '+key);
  assert.equal(table.results?.length,counts.get(key),
   'Official extractor did not reconstruct embedded result documents for '+key);
  assert.ok(table.results.every(row=>typeof row==='object' && row._id
   &&row.flags?.['merp-ui']?.creatureLoreEntry?.creatureKey===key
   &&typeof row.description==='string'&&row.description.length>200),
   'Native TableResults are missing or not hydrated for '+key);
  if(key==='warg'){
   const regions=new Set(table.results.filter(x=>
     x.flags?.['merp-ui']?.creatureLoreEntry?.loreKind==='region'
     ).map(x=>x.flags['merp-ui'].creatureLoreEntry.regionKey));
   assert.equal(regions.size,32,'Foundry extractor does not see 32 Warg regions');
  }
 }
 let embeddedCount=0;
 for(const actor of actors){
   const kind=actor.flags?.['merp-ui']?.creatureLore?.key;
   const count=kind==='wolf'?27:kind==='warg'?28:null;
   assert.ok(count,'Unknown Actor '+actor.name);
   assert.equal(actor.items?.length,count,'Actor Items are not embedded in '+actor.name);
   assert.ok(actor.items.every(x=>typeof x==='object'&&x._id&&x.name&&x.type),
     'Foundry extraction failed for Actor Items in '+actor.name);
   embeddedCount+=actor.items.length;
   assert.ok(actor.system?.description?.includes('merp-ui-lore-catalogue'),
     'Creature description lost its Lore controls: '+actor.name);
   if(kind==='wolf'){
     assert.ok(actor.system?.notes?.length>5000
       &&actor.system.notes.includes('À l’intention du Meneur'),
       'Wolf Notes are empty after official extractor round-trip');
   }
 }
 assert.equal(embeddedCount,55);
 console.log('Official Foundry CLI extraction: '+JSON.stringify({
  tables:tables.length,results:tables.reduce((a,x)=>a+x.results.length,0),
  wargRegions:32,actors:actors.length,embeddedItems:embeddedCount,folders:folders.length,
  wolfNotesRestored:true
 }));
}finally{
 rmSync(out,{recursive:true,force:true});
}
