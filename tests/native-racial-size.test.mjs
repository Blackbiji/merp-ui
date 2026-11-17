import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planNativeTrollSize, ensureNativeTrollSize } from '../scripts/merp-rmu/native-racial-size-talents.js';
import { ensureHobbitRacialTalents } from '../scripts/merp-rmu/racial-identity-hobbits-v205.js';

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


test('legacy Troll: compendiumSourceKey is enough when collection flag is absent', () => {
  const actor=actorFor({size:'Medium',actorSize:'Medium',talents:[
    {id:'legacy-large',type:'talent',name:'Large',
      flags:{rmu:{race:true}},system:{tier:3,category:'Racial',dpSpent:0}}
  ]});
  actor.items[0].id='race-legacy';
  actor.items[0].flags={'merp-ui':{compendiumSourceKey:'race-trolls-age-3'}};
  actor.items[0].system.talents=[{name:'Large',tier:3},{name:'Natural Armor',tier:3}];
  const plan=planNativeTrollSize(actor);
  assert.equal(plan.eligible,true);
  assert.equal(plan.raceNeedsSync,true);
  assert.equal(plan.frameNeedsSync,true);
  assert.equal(plan.talentId,'legacy-large');
  assert.equal(plan.racePatch['system.frame.size'],'Large');
  assert.deepEqual(plan.racePatch['system.talents'].map(t=>[t.name,t.tier]),
    [['Increased Size',2],['Natural Armor',3]]);
});

test('legacy Troll: fixes Race, racial Talent and Actor size without changing inventory', async () => {
  const actor=actorFor({size:'Medium',actorSize:'Medium',talents:[
    {id:'old-talent',type:'talent',name:'Large',flags:{rmu:{race:true}},
      system:{tier:3,maxTier:3,category:'Racial',dpSpent:0}},
    {id:'sword',type:'weapon',name:'Personal sword',system:{size:'Medium'}}
  ]});
  actor.items[0].id='old-race';
  actor.items[0].flags={'merp-ui':{key:'race-trolls-age-2'}};
  actor.items[0].system.talents=[{name:'Large',tier:3}];
  actor.isOwner=true;
  actor.items.get=id=>actor.items.find(i=>i.id===id);
  const changed=[];
  actor.updateEmbeddedDocuments=async(_kind, patches)=>{
    for(const patch of patches) {
      const item=actor.items.get(patch._id);
      for(const [key,value] of Object.entries(patch)) {
        if(key==='_id')continue;
        if(key==='name')item.name=value;
        else if(key==='system.frame.size')item.system.frame.size=value;
        else if(key==='system.talents')item.system.talents=value;
        else if(key.startsWith('system.'))item.system[key.slice(7)]=value;
      }
      changed.push(item.id);
    }
    return patches;
  };
  actor.createEmbeddedDocuments=async()=>{throw Error('unexpected grant');};
  actor.update=async patch=>{actor.system.frame.size=patch['system.frame.size'];};
  const prev=globalThis.game;
  globalThis.game={user:{isGM:true},system:{id:'rmu'},settings:{get:()=> 'fr'}};
  try {
    const result=await ensureNativeTrollSize(actor);
    assert.equal(result.changed,true);
    assert.equal(actor.system.frame.size,'Large');
    assert.equal(actor.items[0].system.frame.size,'Large');
    assert.deepEqual(actor.items[0].system.talents.map(t=>[t.name,t.tier]),[['Increased Size',2]]);
    assert.equal(actor.items[1].name,'Increased Size');
    assert.equal(actor.items[1].system.tier,2);
    assert.deepEqual(changed,['old-race','old-talent']);
    assert.equal(actor.items[2].name,'Personal sword');
    assert.equal(actor.items[2].system.size,'Medium');
    assert.equal(planNativeTrollSize(actor).action,'none');
  } finally {globalThis.game=prev;}
});

test('unmanaged race with only a Troll display name is never migrated', () => {
  const actor=actorFor({size:'Medium',actorSize:'Medium'});
  actor.items[0].name='Trolls (Tereg)';
  actor.items[0].flags={};
  assert.equal(planNativeTrollSize(actor).eligible,false);
});

test('legacy Hobbit: old compendium key is recognized for racial repair', async () => {
  const actor=actorFor({race:'race-hobbits',size:'Medium',actorSize:'Medium',talents:[
    {id:'old-small',type:'talent',name:'Small',flags:{},
      system:{tier:1,category:'Racial',dpSpent:0,description:'Old'}},
    {id:'sword',type:'weapon',name:'Custom Hobbit sword',system:{size:'Medium'}}
  ]});
  actor.items[0].id='old-hobbit-race';
  actor.items[0].flags={'merp-ui':{compendiumSourceKey:'race-hobbits-age-3'}};
  actor.items[0].system.talents=[{name:'Small',tier:1}];
  actor.isOwner=true;
  actor.items.get=id=>actor.items.find(i=>i.id===id);
  const changed=[];
  actor.updateEmbeddedDocuments=async(_kind, patches)=>{
    for(const patch of patches) {
      const item=actor.items.get(patch._id);
      for(const [key,value] of Object.entries(patch)) {
        if(key==='_id')continue;
        if(key==='name')item.name=value;
        else if(key==='system.frame.size')item.system.frame.size=value;
        else if(key==='system.talents')item.system.talents=value;
        else if(key.startsWith('system.'))item.system[key.slice(7)]=value;
      }
      changed.push(item.id);
    }
    return patches;
  };
  actor.createEmbeddedDocuments=async(_kind,docs)=>{
    for(let n=0;n<docs.length;n++)actor.items.push({...docs[n],id:'new-'+n});
    return docs;
  };
  actor.update=async patch=>{actor.system.frame.size=patch['system.frame.size'];};
  const prev=globalThis.game;
  globalThis.game={user:{isGM:true},system:{id:'rmu'},settings:{get:()=> 'fr'}};
  try {
    const report=await ensureHobbitRacialTalents(actor);
    assert.equal(report.eligible,true);
    assert.equal(report.created,3);
    assert.equal(actor.system.frame.size,'Small');
    assert.equal(actor.items[0].system.frame.size,'Small');
    assert.equal(actor.items[0].system.talents[0].name,'Decreased Size');
    assert.equal(actor.items[1].id,'old-small');
    assert.equal(actor.items[1].name,'Decreased Size');
    assert.deepEqual(changed,['old-small','old-hobbit-race']);
    assert.equal(actor.items[2].system.size,'Medium');
  } finally {globalThis.game=prev;}
});
