#!/usr/bin/env node
/**
 * Build the two user-provided MERP-UI creature Actors into the separate Actor
 * Compendium, AFTER the native folder scaffold is constructed.
 * The Actors' validated narrative material is not rewritten by this script.
 * Mechanical Items use the source JSON and still require the official RMU
 * system for their behaviours. Never run against a live Foundry World.
 */
import {ClassicLevel} from 'classic-level';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const assert=(condition,message)=>{if(!condition)throw Error('Creature Actor builder: '+message);};
assert(process.env.CI==='true'&&process.env.MERPUI_OFFLINE_PACK_COMPACTION==='1',
  'Only a designated offline publication checkout may build Compendiums.');
const module=JSON.parse(readFileSync('module.json','utf8'));
assert(module.packs.some(x=>x.name==='merp-ui-creatures'&&x.type==='Actor'),
  'Missing the Actor Compendium.');
const classifications=JSON.parse(readFileSync('source/creatures/creatures-of-middle-earth-sections.json','utf8'));
const folderId=path=>createHash('sha256')
  .update('merp-ui:creature-folder:'+path).digest('hex').slice(0,16);
const expected=[
  {name:'wolf',path:'animal-glossary/apsanakuni',minItems:27,
   sections:['region','racial','cultural','historic']},
  {name:'warg',path:'monster-glossary/undead-beings',minItems:28,
   sections:['racial','cultural','region']}
];
const db=new ClassicLevel(resolve('packs/merp-ui-creatures'),{keyEncoding:'utf8',valueEncoding:'utf8',createIfMissing:false});
await db.open();
try{
  const folderKeys=new Set(),existingActors=[];
  for await(const [key,value] of db.iterator()){
    if(key.startsWith('!folders!'))folderKeys.add(key);
    else if(key.startsWith('!actors!'))existingActors.push({key,value:JSON.parse(value)});
    else assert(false,'Unexpected Actor Compendium record: '+key);
  }
  assert(folderKeys.size===26,'Expected 26 native bestiary folders.');
  assert(existingActors.length===0||existingActors.length===2,
    'Unexpected pre-existing Actors in new Creature pack.');
  const batch=[],ids=new Set();
  for(const entry of expected){
    const source=JSON.parse(readFileSync('source/creatures/actors/'+entry.name+'.json','utf8'));
    const id=source._id,folder=folderId(entry.path);
    assert(/^[a-zA-Z0-9]{16}$/.test(id),'Foundry Actor ID invalid: '+entry.name);
    assert(!ids.has(id),'Duplicate Actor ID');ids.add(id);
    assert(source.type==='Creature'&&source.system&&source.items.length>=entry.minItems,
      'Incomplete native RMU Creature Actor: '+entry.name);
    assert(folderKeys.has('!folders!'+folder),'Missing native folder for '+entry.name);
    assert(source.flags?.['merp-ui']?.creatureLore?.key===entry.name,
      'Missing Lore identity for '+entry.name);
    assert(typeof source.system.description==='string' && source.system.description.includes('merp-ui-lore-catalogue'),
      'Missing creature Bio/Lore description for '+entry.name);
    for(const family of entry.sections){
      assert(source.system.description.includes('data-merp-ui-lore-kind="'+family+'"'),
        'No actionable '+family+' Lore test in '+entry.name);
    }
    if(entry.name==='warg'){
      assert(source.system.notes.includes('merp-ui-warg-notes-card')&&
        (source.system.notes.match(/merp-ui-warg-note-heading/g)||[]).length===6,
        'Warg Notes are missing their six Bio-style section headings.');
      assert(!source.system.description.includes('data-merp-ui-lore="historic"'),
        'Warg Historic Lore is not yet supported.');
    }
    const doc={...source,folder,ownership:{default:0}};
    const key='!actors!'+id;
    const old=existingActors.find(x=>x.key===key);
    if(old)assert(old.value.flags?.['merp-ui']?.creatureLore?.key===entry.name,
      'Refusing to replace an unrelated Actor.');
    batch.push({type:'put',key,value:JSON.stringify(doc)});
  }
  assert(existingActors.every(x=>ids.has(x.value._id)),
    'There are unrelated Actors in this test pack.');
  await db.batch(batch);
  const found=[];
  for await(const [key,value] of db.iterator({gte:'!actors!',lt:'!actors!~'})){
    const actor=JSON.parse(value);
    assert(key==='!actors!'+actor._id,'Actor key/ID mismatch.');
    found.push({key,id:actor._id,folder:actor.folder,items:actor.items.length,
      name:actor.name,description:actor.system.description,notes:actor.system.notes});
  }
  assert(found.length===2,'Native Actor Compendium contains no visible creature documents.');
  assert(found.some(x=>x.name.includes('Loup')&&x.folder===folderId(expected[0].path)),
    'Wolf is missing from the proper animal folder.');
  assert(found.some(x=>x.name.includes('Warg')&&x.folder===folderId(expected[1].path)),
    'Warg is missing from the proper monster folder.');
  console.log('MERP-UI native Actor Compendium: '+JSON.stringify({
    pack:'merp-ui-creatures',folders:folderKeys.size,actors:found.length,
    entries:found.map(({id,name,folder,items})=>({id,name,folder,items})),
    wargNotesBioStyled:true,explicitLoreControls:true
  }));
}finally{await db.close();}
