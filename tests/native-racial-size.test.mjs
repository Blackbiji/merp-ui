import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planNativeTrollSize } from '../scripts/merp-rmu/native-racial-size-talents.js';

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

function actorFor({race='race-trolls',size='Large',talents=[]}={}) {
  return {
    documentName: 'Actor', type: 'Character', name: 'Size test',
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
