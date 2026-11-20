import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(file)=>JSON.parse(readFileSync(file,'utf8'));
const fr=read('source/creature-lore/warg-fr-v1.json');
const en=read('source/creature-lore/warg-en-batches/warg-en-racial-lot-01.json');
const outcomes=['absoluteFailure','failure','partialSuccess','success','absoluteSuccess'];
test('Warg first 10 culture English draft tables: 50 full results and GM notes',()=>{
 assert.equal(en.creatureKey,'warg');
 assert.equal(en.language,'en');
 assert.equal(en.cultures.length,10);
 assert.equal(en.outcomeCount,50);
 for(let i=0;i<10;i++){
  const source=fr.racial[i], translated=en.cultures[i];
  assert.equal(translated.cultureKey,source.key);
  assert.ok(translated.gmNote.length>100,'missing GM verification '+source.key);
  assert.deepEqual(Object.keys(translated.outcomes),outcomes);
  for(const outcome of outcomes){
   const english=translated.outcomes[outcome], french=source.outcomes[outcome];
   assert.ok(english.length>500,source.key+'/'+outcome+' incomplete');
   assert.notEqual(english,french,'untranslated '+source.key+'/'+outcome);
   assert.equal(english.split('\n\n').length,french.split('\n\n').length,
      'source paragraph count not preserved: '+source.key+'/'+outcome);
  }
 }
});
