#!/usr/bin/env node
/**
 * MERP-UI 2.0.12: materialise complete English Warg Racial and Region Lore
 * into the offline prebuilt Creature Lore RollTable LevelDB compendium.
 * All 235 Wolf results and all other compendiums remain unchanged.
 * Run only on an offline CI checkout, never against a live Foundry world.
 */
import { ClassicLevel } from 'classic-level';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source=JSON.parse(readFileSync(resolve('source/creature-lore/warg-v2.0.12.json'),'utf8'));
const results=source.results;
const outcomes=['absoluteFailure','failure','partialSuccess','success','absoluteSuccess'];
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
assert(source.schema==='merp-ui/creature-lore/v1','Unexpected lore schema');
assert(results.length===455,'Expected 455 Warg Lore results, found '+results.length);

const groups=new Map();
for(const row of results) {
  assert(row.creatureKey==='warg' && ['racial','region'].includes(row.loreKey),'Invalid Warg result identity');
  const key=row.loreKey==='racial'?row.cultureKey:row.regionKey;
  assert(typeof key==='string' && key.startsWith(row.loreKey==='racial'?'culture-':'region-'),
    'Missing cultural or regional key');
  assert(typeof row.text==='string' && row.text.length>350 && typeof row.gmNote==='string' &&
    row.gmNote.length>20,'Missing text or GM verification');
  assert(outcomes.includes(row.outcome),'Unknown result degree');
  assert(row.reliability===(['failure','absoluteFailure'].includes(row.outcome)?'errone':'exact'),
    'Incorrect reliability of '+key+'/'+row.outcome);
  const group=row.loreKey+'/'+key;
  const entries=groups.get(group)||[];
  assert(!entries.some(x=>x.outcome===row.outcome),'Duplicate result '+group+'/'+row.outcome);
  entries.push(row);groups.set(group,entries);
}
assert([...groups.keys()].filter(x=>x.startsWith('racial/')).length===60 &&
       [...groups.keys()].filter(x=>x.startsWith('region/')).length===31,
       'Expected 60 cultures and 31 regions');
assert([...groups.values()].every(entries=>entries.length===5 &&
  outcomes.every(o=>entries.some(x=>x.outcome===o))),
  'Incomplete Warg group');

const digest=value=>createHash('sha256').update(value).digest('hex').slice(0,16);
const db=new ClassicLevel(resolve('packs/merp-ui-lore'),{keyEncoding:'utf8',valueEncoding:'utf8'});
await db.open();
try {
  const tables=new Map();
  for await(const [key,value] of db.iterator({gte:'!tables!',lt:'!tables!~'})) {
    const table=JSON.parse(value),flag=table.flags?.['merp-ui']?.creatureLoreTable;
    if(flag?.creatureKey && ['wolf','warg'].includes(flag.creatureKey))
      tables.set(flag.creatureKey+'/'+flag.loreKey,{key,id:key.slice('!tables!'.length),table});
  }
  for(const type of ['racial','region'])assert(tables.has('wolf/'+type),'Missing Wolf template for '+type);

  const existing=[];
  for await(const [key,value] of db.iterator({gte:'!tables.results!',lt:'!tables.results!~'})) {
    const doc=JSON.parse(value);
    const flag=doc.flags?.['merp-ui']?.creatureLoreEntry;
    if(flag?.creatureKey && ['wolf','warg'].includes(flag.creatureKey))existing.push({key,doc,flag});
  }
  const wolf=existing.filter(x=>x.flag.creatureKey==='wolf');
  const warg=existing.filter(x=>x.flag.creatureKey==='warg');
  const wolfCount={racial:wolf.filter(x=>x.flag.loreKey==='racial').length,
                   region:wolf.filter(x=>x.flag.loreKey==='region').length,
                   historic:wolf.filter(x=>x.flag.loreKey==='historic').length};
  assert(wolf.length===235 && wolfCount.racial===225 && wolfCount.region===5 &&
    wolfCount.historic===5,'Wolf baseline mismatch; refusing to touch compendium');

  const operations=[];
  for(const type of ['racial','region']) {
    if(tables.has('warg/'+type))continue;
    const basis=tables.get('wolf/'+type).table;
    const id=digest('merp-ui|warg|'+type+'|table');
    const doc=structuredClone(basis);
    doc._id=id;
    doc.name=type==='racial'?'Warg — Racial Lore':'Warg — Region Lore';
    doc.description=type==='racial'?'Warg cultural knowledge — 60 variants, 5 results each':
      'Warg regional knowledge — 31 variants, 5 results each';
    doc.flags=doc.flags||{};
    doc.flags['merp-ui']=doc.flags['merp-ui']||{};
    doc.flags['merp-ui'].creatureLoreTable={
      ...doc.flags['merp-ui'].creatureLoreTable,
      schemaVersion:1,creatureKey:'warg',loreKey:type
    };
    const key='!tables!'+id;
    operations.push({type:'put',key,value:JSON.stringify(doc)});
    tables.set('warg/'+type,{key,id,table:doc});
  }

  let added=0,updated=0;
  for(const row of results) {
    const id=digest('merp-ui|warg|'+row.loreKey+'|'+(row.regionKey||row.cultureKey)+'|'+row.outcome);
    const tableId=tables.get('warg/'+row.loreKey).id;
    const key='!tables.results!'+tableId+'.'+id;
    const match=warg.find(x=>x.key===key);
    const sample=wolf.find(x=>x.flag.loreKey===row.loreKey &&
      x.flag.outcome===row.outcome && x.flag.cultureKey==='*');
    assert(sample?.doc?.type==='text','Missing Wolf '+row.loreKey+'/'+row.outcome+' result template');
    const doc=structuredClone(match?.doc??sample.doc);
    doc._id=id;
    doc.type='text';
    doc.name='';
    doc.description=row.text;
    doc.drawn=false;
    doc.flags=doc.flags||{};
    doc.flags['merp-ui']=doc.flags['merp-ui']||{};
    doc.flags['merp-ui'].creatureLoreEntry={
      schemaVersion:1,creatureKey:'warg',loreKey:row.loreKey,
      cultureKey:row.cultureKey||'*',
      ...(row.regionKey?{regionKey:row.regionKey,regionLabel:row.regionLabel}:{}),
      outcome:row.outcome,reliability:row.reliability,gmNote:row.gmNote
    };
    operations.push({type:'put',key,value:JSON.stringify(doc)});
    match?updated++:added++;
  }
  assert((added===455 && updated===0)||(added===0 && updated===455),
    'Unexpected existing Warg Lore data: '+added+' inserted / '+updated+' updated');
  await db.batch(operations);
  const counters={wolf:0,warg:0,wargRacial:0,wargRegion:0};
  const keys=new Set();
  for await(const [key,value] of db.iterator({gte:'!tables.results!',lt:'!tables.results!~'})) {
    const flag=JSON.parse(value).flags?.['merp-ui']?.creatureLoreEntry;
    if(flag?.creatureKey==='wolf')counters.wolf++;
    if(flag?.creatureKey==='warg'){
      assert(!keys.has(key),'Duplicate Warg LevelDB result key');keys.add(key);
      counters.warg++;
      if(flag.loreKey==='racial')counters.wargRacial++;
      if(flag.loreKey==='region')counters.wargRegion++;
    }
  }
  assert(counters.wolf===235 && counters.warg===455 &&
    counters.wargRacial===300 && counters.wargRegion===155,
    'Final compendium counts wrong: '+JSON.stringify(counters));
  console.log('MERP-UI 2.0.12 Warg lore built:',JSON.stringify({
    ...counters,cultures:60,regions:31,tables:2,inserted:added,updated
  }));
} finally {
  await db.close();
}
