#!/usr/bin/env node
/**
 * OFFLINE: consolidate all Wolf and Warg lore into exactly ONE RollTable per
 * creature, with separately identifiable racial / cultural / region / historic
 * results. Retains each original narrative and GM verification note.
 *
 * To be used AFTER the v2.0.11 Wolf and v2.0.12 Warg upgrade scripts and BEFORE
 * the lossless LevelDB compaction. No Actor, RMU skill or narrative Actor field
 * is written. All content currently missing English translations is tagged.
 */
import {ClassicLevel} from 'classic-level';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const assert=(yes,reason)=>{if(!yes)throw Error('Creature Lore consolidation: '+reason)};
assert(process.env.CI==='true'&&process.env.MERPUI_OFFLINE_PACK_COMPACTION==='1',
 'Refusing to touch a live Foundry compendium');
const OUTCOMES=['absoluteFailure','failure','partialSuccess','success','absoluteSuccess'];
const raceSource=JSON.parse(readFileSync('source/creature-lore/drafts/warg-racial-fr-structured.json','utf8'));
const frSource=JSON.parse(readFileSync('source/creature-lore/warg-fr-v1.json','utf8'));
const arthedain=JSON.parse(readFileSync('source/creature-lore/drafts/warg-arthedain-en-pending.json','utf8'));
const english=JSON.parse(readFileSync('source/creature-lore/warg-v2.0.12.json','utf8'));
const sha=s=>createHash('sha256').update(s).digest('hex');
const id=s=>sha(s).slice(0,16);
assert(raceSource.groups.length===12&&frSource.racial.length===60
  &&frSource.region.length===32 &&english.results.length===455,'Incomplete bilingual sources');
assert(raceSource.groups.every(g=>OUTCOMES.every(o=>typeof g.outcomes[o]==='string'
  &&g.outcomes[o].length>350)&&g.gmNote.length>100),'Invalid race knowledge');
assert(OUTCOMES.every(o=>typeof arthedain[o]==='string'&&arthedain[o].length>800),
 'Incomplete draft Arthedain translation');

const enCultures=[...new Set(english.results.filter(x=>x.loreKey==='racial').map(x=>x.cultureKey))];
const enRegions=[...new Set(english.results.filter(x=>x.loreKey==='region').map(x=>x.regionKey))];
assert(enCultures.length===60&&enRegions.length===31,'Incorrect previous Warg source');
assert(frSource.racial.every((x,i)=>x.key===enCultures[i]),
 'French and English cultural variants are misaligned');
assert(frSource.region[0].key==='region-arthedain','Arthedain must be first');
const regionToFrench=new Map(enRegions.map((key,i)=>[key,frSource.region[i+1]]));
const frCulture=new Map(frSource.racial.map(x=>[x.key,x]));
const frRegion=new Map(frSource.region.map(x=>[x.key,x]));
const enLore=new Map(english.results.map(x=>[
 x.loreKey+'/'+(x.regionKey??x.cultureKey)+'/'+x.outcome,x
]));
assert(enLore.size===455,'Duplicate EN source keys');

const db=new ClassicLevel(resolve('packs/merp-ui-lore'),{keyEncoding:'utf8',valueEncoding:'utf8'});
await db.open();
try {
 const originals=[],oldTables=[];
 for await(const [key,value] of db.iterator()) {
  const doc=JSON.parse(value);
  if(key.startsWith('!tables!'))oldTables.push({key,doc});
  else if(key.startsWith('!tables.results!'))originals.push({key,doc});
  else assert(false,'Unexpected LevelDB record: '+key);
 }
 assert(oldTables.length===5&&originals.length===690,
  'Expected exactly 5 existing tables and 690 results; stop on unexpected data');
 const buckets={wolf:[],warg:[]};
 for(const row of originals){
  const flag=row.doc.flags?.['merp-ui']?.creatureLoreEntry;
  assert(flag?.creatureKey && buckets[flag.creatureKey],
    'Unexpected creature or missing metadata: '+row.key);
  assert(OUTCOMES.includes(flag.outcome)&&['racial','region','historic'].includes(flag.loreKey),
    'Unknown Lore family or RMU degree '+row.key);
  assert(typeof row.doc.description==='string'&&row.doc.description.length>100,
    'Missing narrative '+row.key);
  buckets[flag.creatureKey].push({...row,flag});
 }
 assert(buckets.wolf.length===235&&buckets.warg.length===455,'Wolf/Warg count mismatch');

 const operations=[];
 const summary={wolf:{},warg:{}};
 const titles={wolf:'Loup / Wolf — Creature Lore',warg:'Warg / Ouargue — Creature Lore'};
 const canonicalKeys=new Set();
 for(const creature of ['wolf','warg']){
  // Preserve the UUID of each old Racial RollTable as the canonical one;
  // links to those two tables continue to resolve after consolidation.
  const parent=oldTables.find(x=>x.doc.flags?.['merp-ui']?.creatureLoreTable?.creatureKey===creature
    &&x.doc.flags?.['merp-ui']?.creatureLoreTable?.loreKey==='racial');
  assert(parent,'Missing template RollTable for '+creature);
  const tableId=parent.doc._id;
  assert(parent.key==='!tables!'+tableId,'Invalid existing Racial RollTable identity');
  const table=structuredClone(parent.doc);
  table._id=tableId;
  table.name=titles[creature];
  table.description='';
  table.formula='1d'+(creature==='wolf'?235:520);
  table.replacement=false;
  table.displayRoll=false;
  // Foundry consumes RollTable.results from the *parent RollTable document*.
  // Storing results solely at !tables.results! keys leaves an empty sheet.
  table.results=[];
  table.flags??={};table.flags['merp-ui']??={};
  table.flags['merp-ui'].creatureLoreTable={
   schemaVersion:2,creatureKey:creature,loreKey:'all',
   families:['racial','cultural','region','historic'],
   gmOnly:true,
   locales:{fr:true,en:creature==='wolf'?false:'partial'},
   editorialStatus:'test-candidate'
  };
  const entries=[];
  const legacy=buckets[creature].slice().sort((a,b)=>a.key.localeCompare(b.key));
  for(const row of legacy){
   const flag={...row.flag};
   const isCulture=flag.loreKey==='racial' && typeof flag.cultureKey==='string'
      && flag.cultureKey.startsWith('culture-');
   flag.loreKind=isCulture?'cultural':flag.loreKey;
   flag.schemaVersion=2;
   if(flag.loreKey==='racial'&&!isCulture)flag.raceKey='*';
   if(creature==='warg'){
    const docFr=isCulture?frCulture.get(flag.cultureKey)
     :flag.loreKey==='region'?regionToFrench.get(flag.regionKey):null;
    assert(docFr,'Missing Warg FR translation '+row.key);
    const localized=docFr.outcomes?.[flag.outcome];
    assert(typeof localized==='string'&&localized.length>350,
      'Missing Warg FR outcome '+row.key);
    flag.localizations={...flag.localizations,
      fr:{text:localized,gmNote:docFr.gmNote}};
    if(isCulture)flag.cultureLabelFr=docFr.name;
    if(flag.loreKey==='region')flag.regionLabelFr=docFr.name;
   }
   entries.push({oldKey:row.key,doc:row.doc,flag,oldNarrative:row.doc.description,
     source:'original'});
  }
  if(creature==='warg'){
   const region=frRegion.get('region-arthedain');
   assert(region && !entries.some(x=>x.flag.regionKey==='region-arthedain'),
      'Arthedain must be newly added once');
   for(const outcome of OUTCOMES){
    const flag={schemaVersion:2,creatureKey:'warg',loreKey:'region',
      loreKind:'region',cultureKey:'*',regionKey:'region-arthedain',
      regionLabel:'Arthedain',regionLabelFr:'Arthedain',
      outcome,reliability:['absoluteFailure','failure'].includes(outcome)?'errone':'exact',
      gmNote:region.gmNote,
      localizations:{fr:{text:region.outcomes[outcome],gmNote:region.gmNote}},
      editorialStatus:'pending-English-translation-review'};
    entries.push({oldKey:null,doc:structuredClone(legacy[0].doc),
      flag,oldNarrative:arthedain[outcome],source:'arthedain-new'});
   }
   for(const racial of raceSource.groups){
    for(const outcome of OUTCOMES){
      const flag={schemaVersion:2,creatureKey:'warg',loreKey:'racial',
        loreKind:'racial',raceKey:racial.raceKey,raceLabel:racial.raceLabel,
        cultureKey:'*',outcome,
        reliability:['absoluteFailure','failure'].includes(outcome)?'errone':'exact',
        gmNote:racial.gmNote,localizations:{fr:{
          text:racial.outcomes[outcome],gmNote:racial.gmNote
        }},editorialStatus:racial.editorialStatus,
        englishTranslationStatus:'not-available'};
      entries.push({oldKey:null,doc:structuredClone(legacy[0].doc),
        flag,oldNarrative:racial.outcomes[outcome],
        source:'racial-fr-new'});
    }
   }
  }
  const byFamily={racial:0,cultural:0,region:0,historic:0};
  const unique=new Set();
  const order={racial:0,cultural:1,region:2,historic:3};
  entries.sort((a,b)=>order[a.flag.loreKind]-order[b.flag.loreKind]
    ||String(a.flag.raceKey??a.flag.cultureKey??a.flag.regionKey??'*')
      .localeCompare(String(b.flag.raceKey??b.flag.cultureKey??b.flag.regionKey??'*'))
    ||OUTCOMES.indexOf(a.flag.outcome)-OUTCOMES.indexOf(b.flag.outcome));
  assert(entries.length===(creature==='wolf'?235:520),
    'Unexpected result count for '+creature);
  table.formula='1d'+entries.length;
  for(let i=0;i<entries.length;i++){
    const entry=entries[i],flag=entry.flag,kind=flag.loreKind;
    byFamily[kind]++;
    const variant=kind==='racial'?(flag.raceKey??'*')
      :kind==='cultural'?flag.cultureKey:kind==='region'?(flag.regionKey??'*'):'*';
    const identity=kind+'/'+variant+'/'+flag.outcome;
    assert(!unique.has(identity),'Duplicate table entry '+creature+'/'+identity);
    unique.add(identity);
    const resultId=id('merp-ui|lore|single|'+creature+'|'+identity);
    const key='!tables.results!'+tableId+'.'+resultId;
    assert(!canonicalKeys.has(key),'Result document ID collision '+key);
    canonicalKeys.add(key);
    const doc=structuredClone(entry.doc);
    doc._id=resultId;
    doc.type='text';
    doc.name=kind+' · '+variant+' · '+flag.outcome;
    doc.description=entry.oldNarrative;
    doc.range=[i+1,i+1];
    doc.weight=1;
    doc.drawn=false;
    doc.flags??={};doc.flags['merp-ui']??={};
    doc.flags['merp-ui'].creatureLoreEntry=flag;
    // Foundry/LevelDB stores embedded TableResults as TWO linked records:
    // the parent RollTable lists only result IDs, and each child lives at
    // !tables.results!<tableId>.<resultId>. Inline full objects are ignored.
    table.results.push(resultId);
    operations.push({type:'put',key,value:JSON.stringify(doc)});
  }
  summary[creature]={tableId,entries:entries.length,byFamily};
  assert(table.results.length===entries.length,'Parent table has lost results for '+creature);
  operations.push({type:'put',key:'!tables!'+tableId,value:JSON.stringify(table)});
 }
 // Keep the original Racial table UUIDs: replace those two document records,
 // and delete only the three superseded Region/Historic RollTables.
 for(const {key,doc} of oldTables){
   const ident=doc.flags?.['merp-ui']?.creatureLoreTable;
   if(ident?.loreKey!=='racial')operations.push({type:'del',key});
 }
 // Delete old results *before* writing the new ones so batch order remains
 // correct even if a deterministic ID is reused in a future migration.
 const priorResults=new Set(originals.map(x=>x.key));
 const newResults=operations.filter(x=>x.type==='put'&&x.key.startsWith('!tables.results!'));
 assert(newResults.length===755,'Expected 755 separately stored table results');
 const parents=operations.filter(x=>x.type==='put'&&x.key.startsWith('!tables!'));
 const edits=operations.filter(x=>x.type==='del');
 const finalOps=[
   ...[...priorResults].map(key=>({type:'del',key})),
   ...edits,
   ...parents,
   ...newResults
 ];
 await db.batch(finalOps);
 const logical={tables:0,results:0,groups:{wolf:{},warg:{}}};
 const parentTables=[],storedChildren=new Map();
 for await(const [key,value] of db.iterator()){
  const o=JSON.parse(value);
  if(key.startsWith('!tables.results!'))storedChildren.set(key,o);
  else if(key.startsWith('!tables!'))parentTables.push({key,table:o});
  else throw Error('Unexpected record '+key);
 }
 assert(parentTables.length===2 && storedChildren.size===755,
   'Foundry needs two parent tables AND 755 separate TableResult records');
 const used=new Set();
 for(const {key,table} of parentTables){
   logical.tables++;
   assert(table.flags?.['merp-ui']?.creatureLoreTable?.loreKey==='all',
     'Non consolidated table');
   assert(Array.isArray(table.results)&&table.results.length>0&&
     table.results.every(id=>typeof id==='string'&&id.length===16),
     'Parent must contain embedded result IDs, not full result objects: '+key);
   assert(table.formula==='1d'+table.results.length,'Formula does not cover the results');
   for(const id of table.results){
     const childKey='!tables.results!'+table._id+'.'+id;
     assert(storedChildren.has(childKey),'RollTable references a missing result '+childKey);
     assert(!used.has(childKey),'Duplicated embedded result '+childKey);
     used.add(childKey);
     const result=storedChildren.get(childKey);
     assert(result._id===id && Array.isArray(result.range) && result.range.length===2,
       'Invalid embedded result identity/range '+childKey);
     logical.results++;
     const f=result.flags?.['merp-ui']?.creatureLoreEntry;
     assert(f?.loreKind&&f?.creatureKey,'Unclassified result '+childKey);
     logical.groups[f.creatureKey][f.loreKind]=(logical.groups[f.creatureKey][f.loreKind]??0)+1;
   }
 }
 assert(used.size===storedChildren.size,'Orphan embedded result records');
 assert(logical.tables===2&&logical.results===755,
   'Consolidation did not produce exactly 2 tables and 755 entries: '+JSON.stringify(logical));
 assert(logical.groups.wolf.historic===5&&logical.groups.wolf.region===5
   &&logical.groups.warg.cultural===300&&logical.groups.warg.region===160
   &&logical.groups.warg.racial===60,'Missing a Lore family: '+JSON.stringify(logical));
 console.log('MERP-UI one RollTable per Creature: '+JSON.stringify({summary,logical,
  languageCaveat:'Warg 12 Racial tables are FR only. Arthedain EN is pending editorial approval.',
  retainedTableUuids:true,actorNotesChanged:0,actorDescriptionsChanged:0}));
}finally{await db.close();}
