import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const lore=read('source/creature-lore/warg-fr-v1.json');
const outcomes=['absoluteFailure','failure','partialSuccess','success','absoluteSuccess'];
test('Warg: all approved French cultures and regions survive import',()=>{
 assert.equal(lore.creatureKey,'warg');
 assert.equal(lore.language,'fr');
 assert.equal(lore.racial.length,60);
 assert.equal(lore.region.length,32);
 const names=new Set(), results=[];
 for(const type of ['racial','region'])for(const variant of lore[type]){
  assert.ok(variant.key);
  assert.ok(variant.name);
  assert.ok(variant.gmNote?.startsWith('Contrôle MJ :'));
  assert.ok(!names.has(type+':'+variant.key));
  names.add(type+':'+variant.key);
  assert.deepEqual(Object.keys(variant.outcomes),outcomes);
  for(const outcome of outcomes){
   const text=variant.outcomes[outcome];
   assert.ok(text.length>450,type+'/'+variant.key+'/'+outcome);
   assert.ok(!text.includes('[TRADUCTION À FAIRE]'));
   results.push(text);
  }
 }
 assert.equal(results.length,460);
 assert.equal(new Set(results).size,460);
});
test('Warg: size is Large in RMU and 2x2 on the grid, other mechanics untouched',()=>{
 const actor=read('source/creature-lore/warg-actor-large-v5.json');
 assert.equal(actor.type,'Creature');
 assert.equal(actor.name,'Warg');
 assert.equal(actor.system.appearance.size,'L');
 assert.equal(actor.prototypeToken.width,2);
 assert.equal(actor.prototypeToken.height,2);
 assert.equal(actor.flags['merp-ui'].creatureLore.key,'warg');
 assert.ok(actor.flags['merp-ui'].creatureLore.lore.racial);
 assert.ok(actor.flags['merp-ui'].creatureLore.lore.region);
 assert.equal(actor.items.length,28);
});
test('Warg: Arthedain is preserved in all five degrees with its GM reliability notes',()=>{
 const a=lore.region.find(x=>x.key==='region-arthedain');
 assert.ok(a);
 assert.equal(a.name,'Arthedain');
 assert.deepEqual(Object.keys(a.outcomes),outcomes);
 assert.ok(a.gmNote.includes('absoluteFailure'));
 assert.ok(a.gmNote.includes('failure'));
 assert.ok(a.gmNote.includes('absoluteSuccess'));
 assert.ok(a.outcomes.absoluteSuccess.includes('Fornost'));
 assert.equal(lore.missingSource.length,0);
});
