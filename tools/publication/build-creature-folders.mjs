#!/usr/bin/env node
/**
 * Prepare MERP-UI's native Actor Compendium folder tree, off-line.
 * This generates only Folder documents. No Actor JSON, Notes, Description,
 * RMU data, skills or embedded Items are modified or bundled.
 */
import {ClassicLevel} from 'classic-level';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const assert=(ok,m)=>{if(!ok)throw Error('Creatures pack: '+m)};
assert(process.env.CI==='true'&&process.env.MERPUI_OFFLINE_PACK_COMPACTION==='1',
 'This builder is restricted to off-line CI checkouts');
const source=JSON.parse(readFileSync('source/creatures/creatures-of-middle-earth-sections.json','utf8'));
const manifest=JSON.parse(readFileSync('module.json','utf8'));
assert(source.schema==='merp-ui/creatures-of-middle-earth-sections/v1',
 'Unrecognised creature sections source');
assert(manifest.packs.some(x=>x.name==='merp-ui-creatures'&&x.type==='Actor'&&x.system==='rmu'
 && x.path==='packs/merp-ui-creatures'),'Missing Actor pack declaration');
const selector=readFileSync('scripts/merp-rmu/lore-selectors.js','utf8');
assert(selector.includes('entry("Animal Glossary"')&&selector.includes('entry("Monster Glossary"'),
 'The new Creature Lore selector must be prepared first');
const id=path=>createHash('sha256').update('merp-ui:creature-folder:'+path).digest('hex').slice(0,16);
const folders=[],keys=new Set(),sections=new Set();
function walk(nodes,parent=null,prefix='',depth=1){
  assert(depth<=3,'Exceeds three folder nesting levels');
  for(let i=0;i<nodes.length;i++){
    const x=nodes[i];const path=[prefix,x.key].filter(Boolean).join('/');
    assert(x.section&&x.key&&x.name?.fr&&x.name?.en,'Incomplete section '+path);
    assert(!keys.has(path)&&!sections.has(x.section),'Duplicate section or key '+path);
    keys.add(path);sections.add(x.section);
    const folder={
      _id:id(path), name:x.section+' — '+x.name.fr+' / '+x.name.en,
      type:'Actor', folder:parent, sorting:'m', sort:100000*(i+1),
      color:null,
      flags:{'merp-ui':{catalog:'Creatures of Middle-earth',
        chapter:x.section, key:x.key, path,
        labels:{fr:x.name.fr,en:x.name.en}}}
    };
    folders.push({path,folder});
    if(x.children)walk(x.children,folder._id,path,depth+1);
  }
}
walk(source.folderHierarchy);
assert(folders.length===26&&source.folderHierarchy.length===2,'Expected 26 folders under two roots');
assert(folders.filter(x=>x.folder.folder===null).length===2,'Expected two root folders');
for(const {creatureKey,folderPath} of source.speciesPlacements){
  assert(folders.some(x=>x.path===folderPath),'Unknown placement for '+creatureKey);
}
const packPath=resolve('packs/merp-ui-creatures');
const db=new ClassicLevel(packPath,{valueEncoding:'utf8',keyEncoding:'utf8'});
await db.open();
try{
 const contents=[],existing=[];
 for await(const [key,value] of db.iterator()){
   const o=JSON.parse(value);contents.push({key,doc:o});
   assert(key.startsWith('!folders!')||key.startsWith('!actors!'),
     'Unrecognised record in Actor pack: '+key);
   if(key.startsWith('!folders!'))existing.push({key,doc:o});
 }
 const expectedKeys=new Set(folders.map(x=>'!folders!'+x.folder._id));
 assert(existing.every(x=>expectedKeys.has(x.key)),'Unknown existing folder: refusing destructive rewrite');
 const beforeActors=contents.filter(x=>x.key.startsWith('!actors!')).length;
 const batch=[];
 for(const {folder} of folders){
   const key='!folders!'+folder._id;
   const old=existing.find(x=>x.key===key);
   if(old) assert(old.doc.flags?.['merp-ui']?.key===folder.flags['merp-ui'].key,
      'Refusing to overwrite an unrelated folder '+key);
   batch.push({type:'put',key,value:JSON.stringify(folder)});
 }
 await db.batch(batch);
 await db.compactRange('!','~');
 let afterFolders=0,afterActors=0;
 for await(const [key,value] of db.iterator()){
   if(key.startsWith('!folders!')){
     const object=JSON.parse(value);
     assert(object._id===key.slice('!folders!'.length),'Folder _id/key mismatch');
     afterFolders++;
   }else if(key.startsWith('!actors!'))afterActors++;
   else assert(false,'Unexpected record after writing '+key);
 }
 assert(afterFolders===26&&afterActors===beforeActors,
   'Folder build failed or Actor records were changed');
 console.log('MERP-UI Creature Actor folders: '+
   JSON.stringify({pack:'merp-ui-creatures',folders:afterFolders,
     animals:8,monsters:9,dragonSubtypes:5,giantSubtypes:2,
     existingActorCount:afterActors,actorNotesChanged:0,actorDescriptionsChanged:0}));
}finally{await db.close();}
