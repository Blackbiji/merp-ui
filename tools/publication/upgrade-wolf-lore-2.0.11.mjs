#!/usr/bin/env node
/**
 * Materialise approved Wolf lore in the prebuilt Foundry RollTable LevelDB pack.
 * Idempotent: updates 10 existing outcomes and adds exactly 5 Half-Elven outcomes.
 * The three RollTables, RMU rolls and other cultural results stay unchanged.
 * Execute only against an offline checkout (never a live Foundry installation).
 */
import { ClassicLevel } from 'classic-level';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const source = JSON.parse(readFileSync(resolve(root,'source/creature-lore/wolf-v2.0.11.json'),'utf8'));
const data = source.results;
const EXPECTED = ['absoluteFailure','failure','partialSuccess','success','absoluteSuccess'];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
assert(data.length === 15, 'Expected exactly 15 approved texts');
for(const loreKey of ['historic','region','racial']){
  const subset=data.filter(x=>x.loreKey===loreKey);
  assert(subset.length===5 && new Set(subset.map(x=>x.outcome)).size===5,
    'Expected five unique outcomes for '+loreKey);
  assert(subset.every(x=>x.creatureKey==='wolf' && typeof x.text==='string' && x.text.length>450),
    'Invalid or truncated '+loreKey+' prose');
}
const db = new ClassicLevel(resolve(root,'packs/merp-ui-lore'),{valueEncoding:'utf8',keyEncoding:'utf8'});
await db.open();
try {
  const tables=new Map();
  for await(const [key,value] of db.iterator({gte:'!tables!',lt:'!tables!~'})){
    const parsed=JSON.parse(value);
    const info=parsed.flags?.['merp-ui']?.creatureLoreTable;
    if(info?.creatureKey==='wolf')tables.set(info.loreKey,{id:key.slice('!tables!'.length),table:parsed});
  }
  assert([...['historic','region','racial']].every(x=>tables.has(x)) && tables.size===3,
    'Existing Wolf RollTable metadata not found exactly once');
  const records=[];
  for await(const [key,value] of db.iterator({gte:'!tables.results!',lt:'!tables.results!~'})){
    const doc=JSON.parse(value),f=doc.flags?.['merp-ui']?.creatureLoreEntry;
    if(f?.creatureKey==='wolf')records.push({key,doc,f});
  }
  const group=(type)=>records.filter(x=>x.f.loreKey===type);
  assert(group('historic').length===5 && group('region').length===5 && group('racial').length>=220,
    'Unexpected existing Wolf entries; refusing to modify pack');
  const ops=[];
  let updates=0,insertions=0;
  for(const row of data){
    const target=group(row.loreKey);
    const matches=target.filter(x=>x.f.cultureKey===row.cultureKey && x.f.outcome===row.outcome);
    assert(matches.length<2,'Duplicate pre-existing lore outcome '+row.loreKey+'/'+row.outcome);
    if(matches.length===1){
      const match=matches[0];
      match.doc.description=row.text;
      match.doc.flags['merp-ui'].creatureLoreEntry={
        ...match.f,reliability:row.reliability,gmNote:row.gmNote
      };
      ops.push({type:'put',key:match.key,value:JSON.stringify(match.doc)});
      updates++;
    } else {
      assert(row.loreKey==='racial' && row.cultureKey==='culture-half-elves',
        'Only new Half-Elven entries may be inserted');
      const tableId=tables.get('racial').id;
      const prototype=target.find(x=>x.f.cultureKey==='*') ?? target[0];
      assert(prototype && prototype.doc.type==='text','Cannot find an existing table-result template');
      const id=createHash('sha256').update('merp-ui|2.0.11|wolf|racial|culture-half-elves|'+row.outcome)
        .digest('hex').slice(0,16);
      const key='!tables.results!'+tableId+'.'+id;
      assert(!records.some(x=>x.key===key), 'Deterministic result ID collision');
      const doc=structuredClone(prototype.doc);
      doc._id=id;
      doc.description=row.text;
      doc.name='';
      doc.drawn=false;
      doc.flags['merp-ui'].creatureLoreEntry={
        schemaVersion:1,creatureKey:'wolf',loreKey:'racial',cultureKey:'culture-half-elves',
        outcome:row.outcome,reliability:row.reliability,gmNote:row.gmNote
      };
      ops.push({type:'put',key,value:JSON.stringify(doc)});
      insertions++;
    }
  }
  assert(updates===10 && (insertions===5 || insertions===0),
    'Expected 10 updates and five inserts (or idempotent re-run)');
  await db.batch(ops);
  console.log('Wolf lore v2.0.11: '+updates+' updated, '+insertions+' added');
  let count=0;const counts={historic:0,region:0,racial:0,halfElves:0};
  for await(const [,value] of db.iterator({gte:'!tables.results!',lt:'!tables.results!~'})){
    const f=JSON.parse(value).flags?.['merp-ui']?.creatureLoreEntry;
    if(f?.creatureKey!=='wolf')continue;
    count++;counts[f.loreKey]++;if(f.cultureKey==='culture-half-elves')counts.halfElves++;
  }
  assert(count===235 && counts.historic===5 && counts.region===5 &&
         counts.racial===225 && counts.halfElves===5,
         'Post-build lore count mismatch: '+JSON.stringify(counts));
  console.log(JSON.stringify({count,counts}));
} finally {await db.close();}
