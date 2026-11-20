import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=JSON.parse(readFileSync('source/creatures/creatures-of-middle-earth-sections.json','utf8'));
const selector=readFileSync('scripts/merp-rmu/lore-selectors.js','utf8');
const packBuilder=readFileSync('tools/publication/build-creature-folders.mjs','utf8');
const module=JSON.parse(readFileSync('module.json','utf8'));
const start=selector.indexOf('"Creature Lore": [');
const end=selector.indexOf('"Racial Lore": [',start);
const block=selector.slice(start,end);
function flatten(nodes,parent='',level=1,out=[]){
  for(const n of nodes){
    const path=[parent,n.key].filter(Boolean).join('/');
    assert.ok(n.key&&n.section&&n.name?.fr&&n.name?.en);
    out.push({path,level,section:n.section,node:n});
    if(n.children)flatten(n.children,path,level+1,out);
  }
  return out;
}
const all=flatten(source.folderHierarchy);
const previous=[
  'Snaga','Common Orcs','Uruk-hai','Cave Trolls','Snow Trolls',
  'Hill Trolls','Mountain Trolls','Stone Trolls','Olog-hai',
  'Half-orcs and Orc-men','Nazgul','Barrow-wights','Wraiths and Ghosts','Vampires',
  'Fire-drakes','Cold-drakes','Winged Dragons','Long-worms',
  'Great Eagles','Great Spiders','Wargs','Werewolves','Mumakil','Mearas',
  'Watcher in the Water','Balrogs','Shadows of Angband'
];

test('The 26 native folders replicate all chapter 5 and 6 headings',()=>{
  assert.equal(source.schema,'merp-ui/creatures-of-middle-earth-sections/v1');
  assert.deepEqual(source.folderHierarchy.map(x=>x.section),['5.0','6.0']);
  assert.deepEqual(source.folderHierarchy.map(x=>x.children.length),[8,9]);
  assert.equal(all.length,26);
  assert.equal(all.filter(x=>!x.node.children?.length).length,22);
  assert.equal(new Set(all.map(x=>x.path)).size,26);
  assert.equal(new Set(all.map(x=>x.section)).size,26);
  assert.ok(all.every(x=>x.level<=3),'Folders exceed Foundry three-level nesting');
  assert.deepEqual(all.find(x=>x.section==='6.4').node.children.map(x=>x.section),
    ['6.4.1','6.4.2','6.4.3','6.4.4','6.4.5']);
  assert.deepEqual(all.find(x=>x.section==='6.6').node.children.map(x=>x.section),
    ['6.6.1','6.6.2']);
});

test('The new Actor Compendium is separate from the private Lore RollTables',()=>{
  assert.equal(module.packs.length,11);
  const actors=module.packs.find(x=>x.name==='merp-ui-creatures');
  assert.equal(actors.type,'Actor');
  assert.equal(actors.system,'rmu');
  assert.equal(actors.path,'packs/merp-ui-creatures');
  assert.equal(actors.ownership.PLAYER,'NONE');
  assert.equal(module.packs.find(x=>x.name==='merp-ui-lore').type,'RollTable');
  assert.ok(module.packFolders.some(x=>x.packs?.includes('merp-ui-creatures')));
});

test('The existing Wolf and Warg are distinct, subject to Actor-level validation',()=>{
  const assigned=new Map(source.speciesPlacements.map(x=>[x.creatureKey,x]));
  assert.equal(assigned.get('wolf').folderPath,'animal-glossary/apsanakuni');
  assert.equal(assigned.get('warg').folderPath,'monster-glossary/undead-beings');
  assert.equal(assigned.size,2);
  assert.ok([...assigned.values()].every(x=>all.some(y=>y.path===x.folderPath)));
  assert.ok([...assigned.values()].every(x=>x.status==='preview-implemented'));
});

test('Existing RMU Creature Lore specialisations survive the reorganisation',()=>{
  assert.ok(start>=0&&end>start);
  for(const topic of [
    'Animal Glossary','Monster Glossary','Bats and Birds',
    'Potili (Insects & Spiders)','Rávatsar (Amphibians & Reptiles)',
    'Lassanakûni (Leaf-Eaters)','Apsanakûni (Meat-Eaters)',
    'Water Drakes','Were-worms','Pûkel-creatures'
  ]) assert.ok(block.includes('entry("'+topic+'",'),topic);
  for(const old of previous)
    assert.equal(block.split('entry("'+old+'",').length-1,1,
      'Legacy technical specialization changed: '+old);
  assert.ok(block.includes('Peoples outside these two glossaries'));
});

test('Taxonomy deliberately places original Creature Actors and leaves RMU skills unchanged',()=>{
  assert.equal(source.packTarget.declaredInModule,true);
  assert.equal(source.packTarget.publicationStatus,'preview-with-wolf-and-warg-actors');
  assert.ok(!selector.includes('"Animal Lore": ['),'An unapproved RMU skill was added');
  assert.ok(!packBuilder.includes("'system.description'"));
  assert.ok(!packBuilder.includes("'system.notes'"));
  assert.ok(!packBuilder.includes('updateEmbeddedDocuments'));
  assert.ok(packBuilder.includes("key.startsWith('!folders!')"));
  assert.ok(packBuilder.includes('existingActorCount:afterActors'));
});


test('Native Actor compendium contains Wolf and Warg in their exact folders',async()=>{
  const {ClassicLevel}=await import('classic-level');
  const {createHash}=await import('node:crypto');
  const id=path=>createHash('sha256').update('merp-ui:creature-folder:'+path).digest('hex').slice(0,16);
  const db=new ClassicLevel('packs/merp-ui-creatures',{keyEncoding:'utf8',valueEncoding:'utf8',createIfMissing:false});
  await db.open();
  const actors=[],folders=[],embedded=new Map();
  try{
    for await(const [key,value] of db.iterator()){
      if(key.startsWith('!actors.items!'))embedded.set(key,JSON.parse(value));
      else if(key.startsWith('!actors!'))actors.push(JSON.parse(value));
      else if(key.startsWith('!folders!'))folders.push(JSON.parse(value));
    }
  }finally{await db.close();}
  assert.equal(folders.length,26);
  assert.equal(actors.length,2,'Actors must be visible in the compendium, not mere folder placeholders');
  const wolf=actors.find(a=>a.flags?.['merp-ui']?.creatureLore?.key==='wolf');
  const warg=actors.find(a=>a.flags?.['merp-ui']?.creatureLore?.key==='warg');
  assert.equal(wolf?.folder,id('animal-glossary/apsanakuni'));
  assert.equal(warg?.folder,id('monster-glossary/undead-beings'));
  assert.equal(wolf.items.length,27);
  assert.equal(warg.items.length,28);
  assert.equal(embedded.size,55);
  for(const actor of [wolf,warg]){
    assert.ok(actor.items.every(id=>typeof id==='string'&&id.length===16),
      'Actor must list Item IDs, not inline objects');
    for(const id of actor.items){
      const key='!actors.items!'+actor._id+'.'+id;
      assert.equal(embedded.get(key)?._id,id,'Foundry Actor Item record missing: '+key);
    }
  }
  assert.ok(wolf.system.notes.length>5000,
    'Wolf GM biography must be restored to the native Notes field');
  assert.ok(wolf.system.notes.includes('À l’intention du Meneur'));
  assert.ok(!wolf.system.description.includes('À l’intention du Meneur'),
    'GM biography should not be duplicated in the Description');
  assert.ok(wolf.system.description.includes('À lire ou paraphraser aux joueurs'));
  assert.equal((wolf.system.description.match(/data-merp-ui-lore-action=/g)||[]).length,4);
  assert.equal((warg.system.description.match(/data-merp-ui-lore-action=/g)||[]).length,3);
  assert.ok(warg.system.notes.includes('merp-ui-warg-notes-card'));
  assert.equal((warg.system.notes.match(/merp-ui-warg-note-heading/g)||[]).length,6);
  assert.ok(!warg.system.description.includes('data-merp-ui-lore="historic"'));
});
