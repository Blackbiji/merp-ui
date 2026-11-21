#!/usr/bin/env node
/**
 * MERP-ui — OFFLINE Wolf bilingual literary Lore upgrade.
 * Runs AFTER consolidate-creature-lore.mjs and BEFORE compaction.
 * Never opens a running Foundry World. Does not modify Warg entries.
 */
import {ClassicLevel} from 'classic-level';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const assert=(ok,message)=>{if(!ok)throw Error('Wolf bilingual Lore: '+message)};
assert(process.env.CI==='true'&&process.env.MERPUI_OFFLINE_PACK_COMPACTION==='1',
  'Refusing to edit a live or unguarded Foundry compendium');
const root=resolve(process.cwd());
const base='source/creature-lore/wolf-literary/';
const read=name=>JSON.parse(readFileSync(resolve(root,base+name),'utf8'));
const cultural=read('cultures.bilingual.json');
const racial=read('races.bilingual.json');
const regional=read('regions.bilingual.json');
const historic=read('historic.bilingual.json');
const OUTCOMES=['absoluteFailure','failure','partialSuccess','success','absoluteSuccess'];
const canonicalKey=(kind,key,outcome)=>kind+'/'+key+'/'+outcome;
const hashText=s=>createHash('sha256').update(s).digest('hex');
const identityId=s=>hashText(s).slice(0,16);
const unique=new Set();
const desired=[];
function add(kind,key,loreKey,labels,values){
  assert(typeof key==='string'&&key.length>0,'Missing variant key '+kind);
  assert(values&&typeof values==='object','Missing lore source '+kind+'/'+key);
  for(const outcome of OUTCOMES){
    const data=values[outcome];
    assert(data&&typeof data.fr==='string'&&data.fr.length>150
      &&typeof data.en==='string'&&data.en.length>150
      &&typeof data.gmFr==='string'&&data.gmFr.length>20
      &&typeof data.gmEn==='string'&&data.gmEn.length>20,
      'Incomplete translation '+kind+'/'+key+'/'+outcome);
    const uniqueKey=canonicalKey(kind,key,outcome);
    assert(!unique.has(uniqueKey),'Duplicate Wolf knowledge '+uniqueKey);
    unique.add(uniqueKey);
    desired.push({kind,key,loreKey,outcome,labels,data,uniqueKey});
  }
}
assert(cultural.groups?.length===62&&racial.groups?.length===12
  &&regional.groups?.length===32&&historic.rows?.length===5,
  'Expected 62 general/cultural, 12 major-race, 32 regional and 1 historic groups');
assert(cultural.groups[0].key==='*','The first cultural entry must be generic');
for(const g of cultural.groups){
  const general=g.key==='*';
  add(general?'racial':'cultural',general?'*':g.key,
    'racial',{cultureFr:g.labelFr,cultureEn:g.labelEn,
    ...(general?{raceFr:'Général',raceEn:'General'}:{})},g.outcomes);
}
for(const g of racial.groups)
  add('racial',g.key,'racial',{raceFr:g.labelFr,raceEn:g.labelEn},g.outcomes);
for(const g of regional.groups)
  add('region',g.key,'region',{regionFr:g.labelFr,regionEn:g.labelEn},g.outcomes);
add('historic','*','historic',{},Object.fromEntries(historic.rows.map(r=>[
  r.outcome,{fr:r.fr,en:r.en,gmFr:r.gmFr,gmEn:r.gmEn}
])));
assert(desired.length===535&&unique.size===535,'Expected 535 unique Wolf entries');
const countByFamily=Object.fromEntries(['racial','cultural','region','historic'].map(k=>[
  k,desired.filter(v=>v.kind===k).length
]));
assert(countByFamily.racial===65&&countByFamily.cultural===305
  &&countByFamily.region===160&&countByFamily.historic===5,
  'Unexpected family counts '+JSON.stringify(countByFamily));

const db=new ClassicLevel(resolve(root,'packs/merp-ui-lore'),{
  keyEncoding:'utf8',valueEncoding:'utf8',createIfMissing:false
});
await db.open();
try{
  const parents=[],records=[];
  for await(const [key,value] of db.iterator()){
    const doc=JSON.parse(value);
    if(key.startsWith('!tables.results!'))records.push({key,doc,raw:value});
    else if(key.startsWith('!tables!'))parents.push({key,doc,raw:value});
    else assert(false,'Unknown LevelDB entry '+key);
  }
  assert(parents.length===2,'Expected one RollTable per species');
  const parentOf=k=>parents.find(p=>p.doc.flags?.['merp-ui']?.creatureLoreTable?.creatureKey===k);
  const wolfParent=parentOf('wolf'),wargParent=parentOf('warg');
  assert(wolfParent&&wargParent,'Wolf or Warg table missing');
  const wolfRows=records.filter(x=>x.doc.flags?.['merp-ui']?.creatureLoreEntry?.creatureKey==='wolf');
  const wargRows=records.filter(x=>x.doc.flags?.['merp-ui']?.creatureLoreEntry?.creatureKey==='warg');
  assert(wargRows.length===520&&wargParent.doc.results.length===520,
    'Warg must remain at 520 results');
  assert([235,535].includes(wolfRows.length)&&wolfParent.doc.results.length===wolfRows.length,
    'Unexpected Wolf baseline: '+wolfRows.length);
  const wargIntegrity=hashText([wargParent,...wargRows].map(r=>r.key+'\0'+r.raw)
    .sort().join('\n'));
  const prior=new Map();
  for(const row of wolfRows){
    const f=row.doc.flags?.['merp-ui']?.creatureLoreEntry??{};
    const kind=f.loreKind??(f.cultureKey?.startsWith('culture-')?'cultural':f.loreKey);
    const variant=kind==='racial'?(f.raceKey??'*')
      :kind==='cultural'?f.cultureKey:kind==='region'?(f.regionKey??'*'):'*';
    const key=canonicalKey(kind,variant,f.outcome);
    assert(!prior.has(key),'Existing Wolf entry duplicated '+key);
    prior.set(key,row);
  }
  const seenOld=new Set();
  const table=structuredClone(wolfParent.doc);
  const tableId=table._id;
  table.name='Loup / Wolf — Creature Lore';
  table.description='';
  table.formula='1d535';
  table.replacement=false;
  table.displayRoll=false;
  table.results=[];
  table.flags??={};
  table.flags['merp-ui']??={};
  table.flags['merp-ui'].creatureLoreTable={
    ...table.flags['merp-ui'].creatureLoreTable,
    schemaVersion:3,creatureKey:'wolf',loreKey:'all',
    families:['racial','cultural','region','historic'],
    gmOnly:true,locales:{fr:true,en:true},
    editorialStatus:'staged-for-next-release'
  };
  const order={racial:0,cultural:1,region:2,historic:3};
  desired.sort((a,b)=>order[a.kind]-order[b.kind]
    ||a.key.localeCompare(b.key,'en')
    ||OUTCOMES.indexOf(a.outcome)-OUTCOMES.indexOf(b.outcome));
  const ops=[];
  let reused=0,created=0;
  for(let i=0;i<desired.length;i++){
    const entry=desired[i];
    let previous=prior.get(entry.uniqueKey);
    // The previous generic Wolf Region Lore (5 results) becomes the
    // Eriador general region. Preserve those five TableResult UUIDs.
    if(!previous&&entry.kind==='region'&&entry.key==='region-eriador')
      previous=prior.get(canonicalKey('region','*',entry.outcome));
    const doc=previous?structuredClone(previous.doc):structuredClone(wolfRows[0].doc);
    if(previous){assert(!seenOld.has(previous.key),'Source entry reused twice');seenOld.add(previous.key);reused++;}
    else {created++;doc._id=identityId('merp-ui|lore|single|wolf|'+entry.uniqueKey);}
    const key='!tables.results!'+tableId+'.'+doc._id;
    assert(!ops.some(op=>op.key===key),'TableResult ID collision '+key);
    doc.type='text';
    doc.name=entry.kind+' · '+entry.key+' · '+entry.outcome;
    doc.description=entry.data.en;
    doc.range=[i+1,i+1];
    doc.weight=1;
    doc.drawn=false;
    doc.flags??={};
    doc.flags['merp-ui']??={};
    const oldFlag=doc.flags['merp-ui'].creatureLoreEntry??{};
    const newFlag={
      ...oldFlag,
      schemaVersion:3,
      creatureKey:'wolf',
      loreKey:entry.loreKey,
      loreKind:entry.kind,
      outcome:entry.outcome,
      reliability:['absoluteFailure','failure'].includes(entry.outcome)?'errone':'exact',
      gmNote:entry.data.gmEn,
      localizations:{
        fr:{text:entry.data.fr,gmNote:entry.data.gmFr},
        en:{text:entry.data.en,gmNote:entry.data.gmEn}
      },
      editorialStatus:'staged-for-next-release',
      englishTranslationStatus:'available'
    };
    delete newFlag.raceKey;
    delete newFlag.cultureKey;
    delete newFlag.regionKey;
    delete newFlag.raceLabel;
    delete newFlag.raceLabelFr;
    delete newFlag.cultureLabel;
    delete newFlag.cultureLabelFr;
    delete newFlag.regionLabel;
    delete newFlag.regionLabelFr;
    if(entry.kind==='racial'){
      newFlag.raceKey=entry.key;
      newFlag.raceLabel=entry.labels.raceFr;
      newFlag.raceLabelEn=entry.labels.raceEn;
      newFlag.cultureKey='*';
    }else if(entry.kind==='cultural'){
      newFlag.cultureKey=entry.key;
      newFlag.cultureLabelFr=entry.labels.cultureFr;
      newFlag.cultureLabel=entry.labels.cultureEn;
    }else if(entry.kind==='region'){
      newFlag.regionKey=entry.key;
      newFlag.regionLabelFr=entry.labels.regionFr;
      newFlag.regionLabel=entry.labels.regionEn;
      newFlag.cultureKey='*';
    }else{
      newFlag.cultureKey='*';
    }
    doc.flags['merp-ui'].creatureLoreEntry=newFlag;
    table.results.push(doc._id);
    ops.push({type:'put',key,value:JSON.stringify(doc)});
  }
  assert(reused===wolfRows.length&&created===535-wolfRows.length,
    'Wolf original results lost: '+JSON.stringify({reused,created,previous:wolfRows.length}));
  // The RollTable remains the same UUID. Warg parent and its 520 children
  // are deliberately absent from this batch.
  ops.unshift({type:'put',key:wolfParent.key,value:JSON.stringify(table)});
  await db.batch(ops);
  const finalParents=[],finalEntries=[];
  for await(const [key,value] of db.iterator()){
    const doc=JSON.parse(value);
    if(key.startsWith('!tables!'))finalParents.push({key,doc,raw:value});
    else if(key.startsWith('!tables.results!'))finalEntries.push({key,doc,raw:value});
    else assert(false,'Unexpected DB entry after update: '+key);
  }
  const finalWolf=finalEntries.filter(r=>r.doc.flags?.['merp-ui']?.creatureLoreEntry?.creatureKey==='wolf');
  const finalWarg=finalEntries.filter(r=>r.doc.flags?.['merp-ui']?.creatureLoreEntry?.creatureKey==='warg');
  const checkWarg=hashText([finalParents.find(x=>x.key===wargParent.key),...finalWarg]
    .map(r=>r.key+'\0'+r.raw).sort().join('\n'));
  assert(checkWarg===wargIntegrity,'Warg was unexpectedly changed');
  assert(finalParents.length===2&&finalEntries.length===1055
    &&finalWolf.length===535&&finalWarg.length===520,'Final table counts are incorrect');
  assert(new Set(table.results).size===535,'Wolf RollTable has duplicate embedded IDs');
  const children=new Set(finalWolf.map(x=>x.doc._id));
  assert(table.results.every(id=>children.has(id)),'Wolf parent references missing results');
  assert(finalWolf.every(x=>x.doc.flags['merp-ui'].creatureLoreEntry
    .localizations?.fr?.text?.length>150
    &&x.doc.flags['merp-ui'].creatureLoreEntry.localizations?.en?.text?.length>150),
    'An unlocalised Wolf result remains');
  console.log('MERP-ui Wolf bilingual lore migration: '+JSON.stringify({
    tableId,existingResultsPreserved:reused,newResults:created,wolf:535,warg:520,
    total:1055,wargBytesUnchanged:true,byFamily:countByFamily,readyForRelease:false
  }));
}finally{await db.close();}
