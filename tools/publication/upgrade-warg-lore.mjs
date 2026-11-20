#!/usr/bin/env node
/**
 * Upgrade an OFFLINE checkout's Foundry V14 RollTable LevelDB with validated
 * Warg lore. No RMU items, mechanics or existing Wolf results are changed.
 * Usage: node tools/publication/upgrade-warg-lore.mjs [root]
 */
import { ClassicLevel } from 'classic-level';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve(process.argv[2]??process.cwd());
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const data=read('source/creature-lore/warg-fr-v1.json');
const outcomes=['absoluteFailure','failure','partialSuccess','success','absoluteSuccess'];
function assert(ok,msg){if(!ok)throw Error('Warg Lore: '+msg);}
assert(data.creatureKey==='warg'&&data.language==='fr','bad FR source');
assert(data.racial?.length===60&&data.region?.length===32,'expected 60 cultures and 32 regions');
const unique=new Set(), rows=[];
for(const kind of ['racial','region'])for(const group of data[kind]){
  const identity=kind+':'+group.key;
  assert(!unique.has(identity),'duplicate specialization: '+identity);unique.add(identity);
  assert(group.gmNote?.length>30,'missing MJ control for '+identity);
  assert(outcomes.every(o=>group.outcomes?.[o]?.length>450),'incomplete results for '+identity);
  for(const outcome of outcomes)rows.push({kind,group,outcome,fr:group.outcomes[outcome]});
}
assert(rows.length===460,'expected 460 outcomes');
// Optional complete English translations are all-or-nothing.
const enPath='source/creature-lore/warg-en-v1.json';
const english=existsSync(resolve(root,enPath))?read(enPath):null;
if(english){
  assert(english.creatureKey==='warg'&&english.language==='en','bad EN source');
  for(const {kind,group,outcome,fr} of rows){
    const translated=english[kind]?.[group.key]?.[outcome];
    assert(typeof translated==='string'&&translated.length>400&&translated!==fr,
      'incomplete English translation '+kind+'/'+group.key+'/'+outcome);
    const noteEN=english[kind]?.[group.key]?.gmNote;
    assert(typeof noteEN==='string'&&noteEN.length>30&&noteEN!==group.gmNote,
      'missing translated MJ control '+kind+'/'+group.key);
  }
}
const hash=(...parts)=>createHash('sha256').update(parts.join('|')).digest('hex').slice(0,16);
const db=new ClassicLevel(resolve(root,'packs/merp-ui-lore'),{valueEncoding:'utf8',keyEncoding:'utf8'});
await db.open();
try{
  const tables=[], entries=[];
  for await(const [key,value] of db.iterator({gte:'!tables!',lt:'!tables!~'})){
    const doc=JSON.parse(value), f=doc.flags?.['merp-ui']?.creatureLoreTable;
    tables.push({key,doc,f,id:key.slice('!tables!'.length)});
  }
  for await(const [key,value] of db.iterator({gte:'!tables.results!',lt:'!tables.results!~'})){
    const doc=JSON.parse(value), f=doc.flags?.['merp-ui']?.creatureLoreEntry;
    entries.push({key,doc,f});
  }
  const tableIds=new Map(), templates=new Map(), ops=[], wanted=new Set();
  for(const kind of ['racial','region']){
    const wolf=tables.filter(t=>t.f?.creatureKey==='wolf'&&t.f?.loreKey===kind);
    const warg=tables.filter(t=>t.f?.creatureKey==='warg'&&t.f?.loreKey===kind);
    assert(wolf.length===1&&warg.length<=1,'missing template or duplicate table '+kind);
    const old=warg[0];
    const id=old?.id??hash('merp-ui','warg','table',kind);
    const doc=structuredClone(old?.doc??wolf[0].doc);
    doc._id=id;
    doc.name='Warg — '+(kind==='racial'?'Racial Lore':'Region Lore');
    doc.description='MERP-UI · Warg · '+(kind==='racial'?'60 cultures':'32 régions');
    doc.formula='1d'+(kind==='racial'?300:160);
    doc.displayRoll=false;
    doc.replacement=true;
    doc.flags??={};doc.flags['merp-ui']??={};
    doc.flags['merp-ui'].creatureLoreTable={
      schemaVersion:1,creatureKey:'warg',loreKey:kind,source:'warg-fr-v1.json',
      status:english?'bilingual-complete':'approved-fr-english-pending',
      variantCount:kind==='racial'?60:32
    };
    tableIds.set(kind,id);
    ops.push({type:'put',key:'!tables!'+id,value:JSON.stringify(doc)});
    const proto=entries.find(x=>x.f?.creatureKey==='wolf'&&x.f?.loreKey===kind&&x.f?.cultureKey==='*');
    assert(proto,'missing Wolf result prototype '+kind);
    templates.set(kind,proto.doc);
  }
  const oldWargEntries=new Map(entries.filter(x=>x.f?.creatureKey==='warg').map(x=>[x.key,x]));
  for(const {kind,group,outcome,fr} of rows){
    const id=hash('merp-ui','warg',kind,group.key,outcome);
    const key='!tables.results!'+tableIds.get(kind)+'.'+id;
    const doc=structuredClone(oldWargEntries.get(key)?.doc??templates.get(kind));
    doc._id=id;
    doc.name='';
    doc.type='text';
    doc.description=fr;
    doc.drawn=false;
    doc.range=[1,1];
    doc.weight=1;
    doc.flags??={};doc.flags['merp-ui']??={};
    const translations={fr};
    if(english)translations.en=english[kind][group.key][outcome];
    doc.flags['merp-ui'].creatureLoreEntry={
      schemaVersion:1,creatureKey:'warg',loreKey:kind,
      cultureKey:kind==='racial'?group.key:'*',
      ...(kind==='region'?{regionKey:group.key,regionName:group.name}:{}),
      outcome,
      reliability:['absoluteFailure','failure'].includes(outcome)?'errone':'exact',
      gmNote:group.gmNote,
      gmNoteTranslations:english?{fr:group.gmNote,en:english[kind][group.key].gmNote}:{fr:group.gmNote},
      translations
    };
    wanted.add(key);
    ops.push({type:'put',key,value:JSON.stringify(doc)});
  }
  // Remove only obsolete Warg entries belonging to our two tables.
  const ourTableIds=new Set(tableIds.values());
  for(const {key,f} of entries){
    const id=key.slice('!tables.results!'.length).split('.')[0];
    if(f?.creatureKey==='warg'&&ourTableIds.has(id)&&!wanted.has(key))ops.push({type:'del',key});
  }
  await db.batch(ops);
  const counts={racial:0,region:0};
  for await(const [,value] of db.iterator({gte:'!tables.results!',lt:'!tables.results!~'})){
    const f=JSON.parse(value).flags?.['merp-ui']?.creatureLoreEntry;
    if(f?.creatureKey==='warg'&&f.loreKey in counts)counts[f.loreKey]++;
  }
  assert(counts.racial===300&&counts.region===160,'postbuild count mismatch '+JSON.stringify(counts));
  console.log(JSON.stringify({creature:'warg',cultures:60,regions:32,results:460,
    english:english?'complete':'pending',counts},null,2));
}finally{await db.close();}
