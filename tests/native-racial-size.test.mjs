import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planNativeTrollSize, ensureNativeTrollSize } from '../scripts/merp-rmu/native-racial-size-talents.js';

function race(key) {
  return JSON.parse(readFileSync('source/compendiums/merp-rmu-races/' + key + '.json', 'utf8'));
}

function allRaceDocuments(source) {
  const docs = [source.document];
  for (const item of Object.values(source.ageVariants ?? {})) docs.push(item.document);
  for (const item of Object.values(source.document.flags?.['merp-ui']?.ageVariants ?? {})) docs.push(item.document);
  return docs;
}

test('Hobbits: canonical native Decreased Size I in all Age variants', () => {
  const src = race('race-hobbits');
  for (const doc of allRaceDocuments(src)) {
    assert.equal(doc.system.frame.size, 'Small');
    const size = doc.system.talents.filter(t => ['Small', 'Decreased Size'].includes(t.name));
    assert.deepEqual(size.map(t => [t.name, t.tier]), [['Decreased Size', 1]]);
  }
});

for (const key of ['race-trolls', 'race-half-trolls']) {
  test(key + ': canonical native Increased Size II in all Age variants', () => {
    const src = race(key);
    for (const doc of allRaceDocuments(src)) {
      assert.equal(doc.system.frame.size, 'Large');
      const size = doc.system.talents.filter(t => ['Large', 'Increased Size'].includes(t.name));
      assert.deepEqual(size.map(t => [t.name, t.tier]), [['Increased Size', 2]]);
    }
  });
}

function actorFor({race='race-trolls',size='Large',actorSize=null,talents=[]}={}) {
  return {
    documentName: 'Actor', type: 'Character', name: 'Size test',
    ...(actorSize ? {system:{frame:{size:actorSize}}} : {}),
    items: [{ type: 'race', name: race,
      flags: {'merp-ui': {collection:'merp-rmu',canonicalKey:race}},
      system: {frame: {size}}
    }, ...talents]
  };
}
test('existing Troll with old racial Large Talent is migrated without deleting', () => {
  const a=actorFor({talents:[{id:'existing-talent',type:'talent',
    name:'Large',flags:{rmu:{race:true}},system:{tier:3}}]});
  const plan=planNativeTrollSize(a);
  assert.equal(plan.eligible,true);
  assert.equal(plan.talentId,'existing-talent');
  assert.equal(plan.action,'normalize');
  assert.equal(plan.tier,2);
});

test('existing Troll with missing racial size Talent gets only a new grant', () => {
  const plan=planNativeTrollSize(actorFor());
  assert.equal(plan.eligible,true);
  assert.equal(plan.action,'grant');
});

test('native Increased Size II is idempotent', () => {
  const plan=planNativeTrollSize(actorFor({talents:[{id:'native',
    type:'talent',name:'Increased Size',flags:{rmu:{race:true}},
    system:{tier:2}}]}));
  assert.equal(plan.action,'none');
});


// Reproduces the in-game regression: the Race and its native Tier II Talent
// are correct, but RMU's Actor frame still displays Medium.
test('Troll with Increased Size II and Medium Actor frame requires synchronization', () => {
  const plan=planNativeTrollSize(actorFor({actorSize:'Medium',talents:[{
    id:'native',type:'talent',name:'Increased Size',
    flags:{rmu:{race:true}},system:{tier:2}
  }]}));
  assert.equal(plan.eligible,true);
  assert.equal(plan.frameNeedsSync,true);
  assert.equal(plan.actorFrameSize,'Medium');
  assert.equal(plan.action,'sync-frame');
});

test('Troll frame synchronization updates only Actor size and no embedded items', async () => {
  const a=actorFor({actorSize:'Medium',talents:[{
    id:'native',type:'talent',name:'Increased Size',
    flags:{rmu:{race:true}},system:{tier:2}
  }]});
  a.isOwner=true;
  a.items.get=id=>a.items.find(i=>i.id===id);
  const writes=[];
  a.update=async patch=>{
    writes.push(patch);
    if(patch['system.frame.size']) a.system.frame.size=patch['system.frame.size'];
  };
  a.updateEmbeddedDocuments=async()=>{throw Error('unexpected Talent mutation');};
  a.createEmbeddedDocuments=async()=>{throw Error('unexpected Talent insertion');};
  const previous=globalThis.game;
  globalThis.game={user:{isGM:true},system:{id:'rmu'},settings:{get:()=> 'fr'}};
  try {
    const outcome=await ensureNativeTrollSize(a);
    assert.equal(outcome.changed,true);
    assert.deepEqual(writes,[{'system.frame.size':'Large'}]);
    assert.equal(a.system.frame.size,'Large');
    assert.equal(a.items[1].id,'native');
  } finally {
    globalThis.game=previous;
  }
});

test('already Large Actor and correct Tier II talent is not re-migrated', () => {
  const plan=planNativeTrollSize(actorFor({actorSize:'Large',talents:[{
    id:'native',type:'talent',name:'Increased Size',
    flags:{rmu:{race:true}},system:{tier:2}
  }]}));
  assert.equal(plan.action,'none');
  assert.equal(plan.frameNeedsSync,false);
});

test('never overwrite a purchased Increased Size Talent', () => {
  const plan=planNativeTrollSize(actorFor({talents:[{id:'purchased',
    type:'talent',name:'Increased Size',flags:{},system:{tier:1}}]}));
  assert.equal(plan.eligible,false);
  assert.equal(plan.reason,'ambiguous-size-talents');
});

test('other races are untouched', () => {
  const plan=planNativeTrollSize(actorFor({race:'race-humans',size:'Medium'}));
  assert.equal(plan.eligible,false);
});
