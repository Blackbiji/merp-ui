/**
 * MERP-UI 2.0.5 — Racial technical identity + Hobbit creation talents.
 *
 * Scope: MERP-UI-managed race Items only. Never mutate Actor level, XP,
 * statistics, skills, DP, or character-creation elections.
 *
 * RMU's creatureVariety is a SINGLE technical string. Extra ancestral matches
 * are stored as MERP-UI metadata; this does not claim that stock RMU's Slaying
 * resolver reads them. In particular, dual ancestry is not simulated by a
 * comma-separated creatureVariety value.
 */
import { contentLanguage } from './localization.js';

const MODULE = 'merp-ui';
const FIX = 'hobbit-v205';
const RACE_RULES = Object.freeze({
  'race-khazad': { type: 'Humanoids', variety: 'Dwarf', tags: ['Dwarf'] },
  'race-petty-dwarves': { type: 'Humanoids', variety: 'Dwarf', tags: ['Dwarf'] },
  'race-umli': { type: 'Humanoids', variety: 'Umli', tags: ['Umli'] },
  'race-orcs': { type: 'Goblinoids', variety: 'Orc', tags: ['Orc'] },
  'race-trolls': { type: 'Trolls', variety: 'Troll', tags: ['Troll'] },
  'race-dunedain': { type: 'Humanoids', variety: 'Dunadan', tags: ['Dunadan'] },
  'race-humans': { type: 'Humanoids', variety: 'Human', tags: ['Human'] },
  'race-elves': { type: 'Humanoids', variety: 'Elf', tags: ['Elf'] },
  'race-half-elves': { type: 'Humanoids', variety: 'Elf', tags: ['Elf','Human'] },
  'race-half-orcs': { type: 'Humanoids', variety: 'Orc', tags: ['Orc','Human'] }
});

function keyForRace(item) {
  if (item?.type !== 'race') return null;
  const f = item.flags?.[MODULE] ?? {};
  if (f.collection !== 'merp-rmu') return null;
  const raw = f.canonicalKey || f.key;
  const key = String(raw || '').replace(/-age-[1-4]$/, '');
  return Object.hasOwn(RACE_RULES, key) ? key : null;
}

function patchForRace(item) {
  const rule = RACE_RULES[keyForRace(item)];
  if (!rule) return null;
  const patch = {};
  if (item.system?.creatureType !== rule.type) patch['system.creatureType'] = rule.type;
  if (item.system?.creatureVariety !== rule.variety) patch['system.creatureVariety'] = rule.variety;
  const currentTags = item.flags?.[MODULE]?.raceMatchTags;
  if (JSON.stringify(currentTags ?? []) !== JSON.stringify(rule.tags)) {
    patch[`flags.${MODULE}.raceMatchTags`] = [...rule.tags];
  }
  return Object.keys(patch).length ? patch : null;
}

function isHobbit(race) {
  const f = race?.flags?.[MODULE] ?? {};
  return race?.type === 'race' && f.collection === 'merp-rmu' &&
    String(f.canonicalKey || f.key || '').replace(/-age-[1-4]$/, '') === 'race-hobbits';
}

const TALENTS = Object.freeze({
  small: {
    name: 'Small',
    fr: 'Les Hobbits sont de petite taille (catégorie Small). Leur taille et leur stabilité sont déjà prises en compte par la Race.',
    en: 'Hobbits are Small. Their size and balance are already reflected in the Race.'
  },
  resistant: {
    name: 'Resistant',
    fr: 'Les Hobbits résistent particulièrement bien à diverses influences, aux poisons et aux maladies. Appliquer les résistances prévues par la Race.',
    en: 'Hobbits show remarkable resistance to harmful influences, poisons and diseases. Use the Race’s defined resistances.'
  },
  stealthy: {
    name: 'Stealthy',
    fr: 'Le pas léger des Hobbits leur permet de passer inaperçus. +5 par Tier aux manœuvres de discrétion appropriées.',
    en: 'Hobbits move quietly and easily escape notice. +5 per Tier to appropriate Stealth manoeuvres.'
  },
  surefooted: {
    name: 'Sure-footed',
    fr: 'Leurs pieds robustes et leur centre de gravité bas leur assurent une bonne stabilité sur les pentes et les terrains irréguliers.',
    en: 'Their tough feet and low centre of gravity give Hobbits good footing on slopes and uneven ground.'
  }
});
const ORDER = Object.freeze(['small','resistant','stealthy','surefooted']);
const KNOWN = Object.freeze({
  small: ['small','petite taille'],
  resistant: ['resistant','résistant'],
  stealthy: ['stealthy','furtif','furtif (stealthy)'],
  surefooted: ['sure-footed','sure footed','pied sûr','pieds sûrs']
});
function norm(raw) {
  return String(raw ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
}
function talentIdentity(item) {
  if (item?.type !== 'talent') return null;
  const tagged = item.flags?.[MODULE]?.racialTalentKey;
  if (ORDER.includes(tagged)) return tagged;
  if (item.flags?.[MODULE]?.key === 'stealthy-hobbit') return 'stealthy';
  const names = [item.name, item.system?.name].map(norm);
  for (const key of ORDER) if (KNOWN[key].some(alias => names.includes(norm(alias)))) return key;
  return null;
}
const promises = new WeakMap();

/** Idempotent repair/grant, only with exactly one embedded Hobbit Race. */
export async function ensureHobbitRacialTalents(actor, {dryRun = false} = {}) {
  if (!actor || actor.documentName !== 'Actor' || actor.type?.toLowerCase() !== 'character') {
    return {eligible:false, reason:'not-character'};
  }
  const races = [...actor.items].filter(i => i.type === 'race');
  if (races.length !== 1 || !isHobbit(races[0])) return {eligible:false, reason:'not-hobbit'};
  if (!actor.isOwner) return {eligible:false, reason:'not-owner'};
  if (!dryRun && promises.has(actor)) return promises.get(actor);
  const execute = async () => {
    const locale = contentLanguage() === 'en' ? 'en' : 'fr';
    const mapped = new Map();
    for (const talent of actor.items.filter(i => i.type === 'talent')) {
      const key = talentIdentity(talent);
      if (key) mapped.set(key, [...(mapped.get(key) ?? []), talent]);
    }
    // Never merge or delete an existing Talent silently; duplicates are reported.
    const duplicates = [...mapped].filter(([_, docs]) => docs.length > 1).map(([key]) => key);
    if (duplicates.length) throw Error(`MERP-UI Hobbit: talents déjà en double : ${duplicates.join(', ')}`);
    const missing = ORDER.filter(key => !mapped.has(key));
    const report = {eligible:true, actorId:actor.id, existing:4-missing.length, missing, created:0, descriptionsUpdated:0};
    if (dryRun) return report;
    if (missing.length) {
      // These are legitimate RMU Talent Items: free race-granted, Tier I,
      // descriptive only, no synthetic skill/stat/size effects or DP spending.
      const docs = missing.map(key => ({
        name:TALENTS[key].name,
        type:'talent',
        img:'systems/rmu/icons/svg/iron_crown_w.svg',
        system: {
          book:'MERP-RMU', category:'Racial', name:TALENTS[key].name,
          cost:key==='stealthy'?'7/Tier':'0', tier:1,
          maxTier:key==='stealthy'?3:1, discount:'x1', dpSpent:0,
          description:TALENTS[key][locale], skill:null, attack:null,
          modifiers:[]
        },
        flags: {
          rmu:{race:true},
          [MODULE]:{racialTalentKey:key,autoRacialGrant:FIX}
        }
      }));
      const created = await actor.createEmbeddedDocuments('Item', docs, {merpUiHobbitRacialFix:true});
      if (created.length !== docs.length) {
        throw Error(`MERP-UI Hobbit: attribution incomplète (${created.length}/${docs.length}); relancer pour compléter`);
      }
      report.created=created.length;
    }
    // The pre-existing Stealthy was sourced from full editorial HTML. Its
    // lengthy headings must never fill the native character-creation table.
    // Only touch actual race-granted talents or those managed by this patch.
    const updates=[];
    for (const item of actor.items.filter(i => i.type==='talent')) {
      const key=talentIdentity(item);
      if (!key) continue;
      const flag=item.flags?.[MODULE] ?? {};
      const fromOurCatalog=flag.key==='stealthy-hobbit';
      const owned=flag.autoRacialGrant===FIX;
      const racial=item.flags?.rmu?.race === true;
      if (!fromOurCatalog && !owned && !racial) continue;
      const target=TALENTS[key][locale];
      if (item.system?.description !== target) {
        updates.push({_id:item.id, 'system.description':target});
      }
    }
    if (updates.length) await actor.updateEmbeddedDocuments('Item', updates, {merpUiHobbitRacialFix:true});
    report.descriptionsUpdated=updates.length;
    return report;
  };
  if (dryRun) return execute();
  const pending=execute(); promises.set(actor,pending);
  try {return await pending;} finally {promises.delete(actor);}
}

async function pruneOrphanHobbitGrants(actor) {
  if (!actor?.isOwner) return 0;
  const hasHobbit=[...actor.items].some(i=>isHobbit(i));
  if (hasHobbit) return 0;
  const ids=actor.items.filter(i=>i.type==='talent' && i.flags?.[MODULE]?.autoRacialGrant===FIX)
    .map(i=>i.id);
  if (ids.length) await actor.deleteEmbeddedDocuments('Item',ids,{merpUiHobbitRacialFix:true});
  return ids.length;
}

/** Apply only changed technical fields; does not touch stats, skills or DP. */
export async function synchronizeRacialIdentities({includeWorld=true,includeActors=true,dryRun=false}={}) {
  if (!game.user?.isGM || game.system?.id!=='rmu') return {skipped:true,reason:'requires-rmu-gm'};
  const report={world:0,actors:0,changes:0,errors:[]};
  if (includeWorld) for (const item of game.items.contents) {
    const patch=patchForRace(item);
    if (!patch) continue;
    report.world++;
    if (!dryRun) {try {await item.update(patch,{merpUiRaceIdentityV205:true}); report.changes++;}
      catch(e){report.errors.push({item:item.name,error:String(e)});}}
  }
  if (includeActors) for (const actor of game.actors.contents) {
    const updates=[];
    for (const item of actor.items) {
      const patch=patchForRace(item);
      if (patch) updates.push({_id:item.id,...patch});
    }
    if (!updates.length) continue;
    report.actors++;
    if (!dryRun) {try {await actor.updateEmbeddedDocuments('Item',updates,{merpUiRaceIdentityV205:true});report.changes+=updates.length;}
      catch(e){report.errors.push({actor:actor.name,error:String(e)});}}
  }
  return report;
}

const scheduled=new Map();
function schedule(actor) {
  if (!actor || actor.documentName!=='Actor' || game.system?.id!=='rmu' || !actor.isOwner) return;
  if (scheduled.has(actor.id)) clearTimeout(scheduled.get(actor.id));
  scheduled.set(actor.id,setTimeout(async()=>{
    scheduled.delete(actor.id);
    try {
      const races=[...actor.items].filter(i=>i.type==='race');
      if (races.length===1 && isHobbit(races[0])) await ensureHobbitRacialTalents(actor);
      else await pruneOrphanHobbitGrants(actor);
    } catch(e) {console.error(`${MODULE} | Hobbits racial talents`,e);}
  },850));
}

let registered=false;
export function registerRacialIdentityAndHobbitHooks() {
  if (registered) return;
  registered=true;
  Hooks.on('createItem',(item,options,userId)=>{
    if (userId!==game.user?.id || item.type!=='race' || item.parent?.documentName!=='Actor') return;
    schedule(item.parent);
  });
  Hooks.on('updateItem',(item,changes,options,userId)=>{
    if (userId!==game.user?.id || options?.merpUiRaceIdentityV205 ||
        item.type!=='race' || item.parent?.documentName!=='Actor') return;
    schedule(item.parent);
  });
  Hooks.on('deleteItem',(item,options,userId)=>{
    if (userId!==game.user?.id || item.type!=='race' || item.parent?.documentName!=='Actor') return;
    schedule(item.parent);
  });
  Hooks.once('ready',()=>{
    if (game.system?.id!=='rmu') return;
    // Existing Actors created before v2.0.5 also get their missing racial
    // Talents. This acts on race Items, not the Character creation UI.
    for (const actor of game.actors.contents) {
      if ([...actor.items].some(isHobbit)) schedule(actor);
    }
    if (game.user?.isGM) synchronizeRacialIdentities().then(report=>{
      console.info(`${MODULE} | v2.0.5 Race identities`,report);
    }).catch(e=>console.error(`${MODULE} | v2.0.5 Races`,e));
  });
}
