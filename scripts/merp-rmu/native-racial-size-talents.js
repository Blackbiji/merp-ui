/**
 * MERP-UI — restore RMU's native size Talents on existing Troll / Half-Troll Actors.
 *
 * Compendium synchronization intentionally does not rewrite embedded Actor Items.
 * This migration only touches MERP-RMU racial Talent Items (or creates a missing
 * race-granted item), preserving every existing Item ID, stats, XP, DP, equipment,
 * Actor appearance, token data and user-added Talents.
 *
 * Native RMU size order: Medium -> Big (Increased Size I) -> Large (II).
 */
import { contentLanguage } from './localization.js';

const MODULE = 'merp-ui';
const MIGRATION = 'native-racial-size-v1';
const SIZES = Object.freeze({
  'race-trolls': Object.freeze({ size: 'Large', talent: 'Increased Size', tier: 2 }),
  'race-half-trolls': Object.freeze({ size: 'Large', talent: 'Increased Size', tier: 2 })
});
const descriptions = Object.freeze({
  fr: 'Ce personnage appartient à la catégorie Large. Increased Size II applique les effets de la taille prévus par RMU.',
  en: 'This character is Large. Increased Size II applies the size effects defined by RMU.'
});
const keyOf = race => String(
  race?.flags?.[MODULE]?.canonicalKey ?? race?.flags?.[MODULE]?.key ?? ''
).replace(/-age-[1-4]$/, '');

function isRacialTalent(item) {
  return item?.type === 'talent' &&
    (item.flags?.rmu?.race === true ||
     item.flags?.[MODULE]?.autoRacialGrant === MIGRATION);
}

export function planNativeTrollSize(actor) {
  if (!actor || actor.documentName !== 'Actor' ||
      String(actor.type).toLowerCase() !== 'character') {
    return { eligible: false, reason: 'not-character' };
  }
  const races = [...actor.items].filter(item => item.type === 'race');
  if (races.length !== 1) return { eligible: false, reason: 'race-count', count: races.length };
  const race = races[0];
  if (race.flags?.[MODULE]?.collection !== 'merp-rmu') {
    return { eligible: false, reason: 'not-merp-rmu' };
  }
  const key = keyOf(race), rule = SIZES[key];
  if (!rule || race.system?.frame?.size !== rule.size) {
    return { eligible: false, reason: 'not-matching-troll', key };
  }

  const talents = [...actor.items].filter(i => i.type === 'talent');
  const matched = talents.filter(i =>
    isRacialTalent(i) && ['Large', rule.talent].includes(i.name)
  );
  const other = talents.filter(i =>
    !isRacialTalent(i) && i.name === rule.talent
  );
  if (matched.length > 1 || other.length > 0) {
    return { eligible: false, reason: 'ambiguous-size-talents',
      key, racialMatches: matched.map(i => i.id),
      nonRacialMatches: other.map(i => i.id) };
  }
  const talent = matched[0] ?? null;
  const alreadyCorrect = Boolean(talent) &&
    talent.name === rule.talent && talent.system?.tier === rule.tier;
  // The embedded Race's frame.size does not automatically guarantee the
  // Actor's own RMU frame has been synchronized. Older Actors can retain
  // Medium even after a correct Increased Size II grant.
  const actorFrameSize = actor.system?.frame?.size ?? null;
  const frameNeedsSync = actorFrameSize !== null && actorFrameSize !== rule.size;
  return { eligible: true, key, race: race.name, expected: rule.size,
    tier: rule.tier, talentId: talent?.id ?? null, actorFrameSize, frameNeedsSync,
    action: !talent ? 'grant' : !alreadyCorrect ? 'normalize'
      : frameNeedsSync ? 'sync-frame' : 'none' };
}

const pending = new WeakMap();
export async function ensureNativeTrollSize(actor, { dryRun = false } = {}) {
  const plan = planNativeTrollSize(actor);
  if (!plan.eligible || plan.action === 'none') return { ...plan, changed: false };
  if (!game.user?.isGM || game.system?.id !== 'rmu' || !actor.isOwner) {
    return { ...plan, changed: false, reason: 'requires-gm-rmu-owner' };
  }
  if (dryRun) return { ...plan, changed: false, dryRun: true };
  if (pending.has(actor)) return pending.get(actor);

  const execute = async () => {
    const description = descriptions[contentLanguage() === 'en' ? 'en' : 'fr'];
    if (plan.action === 'grant') {
      await actor.createEmbeddedDocuments('Item', [{
        name: 'Increased Size',
        type: 'talent',
        img: 'systems/rmu/icons/svg/iron_crown_w.svg',
        system: {
          book: 'MERP-RMU', category: 'Racial', cost: '0',
          tier: 2, maxTier: 2, discount: 'x1', dpSpent: 0,
          description, skill: null, attack: null, modifiers: []
        },
        flags: { rmu: { race: true },
          [MODULE]: { autoRacialGrant: MIGRATION, racialTalentKey: 'increased-size' } }
      }], { merpUiNativeRacialSize: true });
    } else if (plan.action === 'normalize') {
      const item = actor.items.get(plan.talentId);
      if (!item || !isRacialTalent(item)) {
        throw Error('Racial Talent changed during normalization: ' + actor.name);
      }
      await actor.updateEmbeddedDocuments('Item', [{
        _id: item.id, name: 'Increased Size',
        'system.tier': 2,
        ...(Number(item.system?.maxTier ?? 0) < 2 ? { 'system.maxTier': 2 } : {}),
        'system.description': description
      }], { merpUiNativeRacialSize: true });
    }
    // Synchronize the native Actor frame as well as the racial Talent.
    // Do not touch token dimensions, equipment or any other Actor field.
    if (plan.frameNeedsSync && actor.system?.frame?.size !== plan.expected) {
      await actor.update({ 'system.frame.size': plan.expected },
        { merpUiNativeRacialSize: true });
    }
    if (actor.system?.frame?.size && actor.system.frame.size !== plan.expected) {
      console.warn(MODULE + ' | RMU did not prepare the expected Troll size',
        { actor: actor.name, expected: plan.expected,
          actual: actor.system.frame.size, talent: 'Increased Size' });
    }
    return { ...plan, changed: true };
  };
  const task = execute();
  pending.set(actor, task);
  try { return await task; }
  finally { pending.delete(actor); }
}

const scheduled = new Map();
function schedule(actor) {
  if (!actor?.isOwner || game.system?.id !== 'rmu' || !game.user?.isGM) return;
  const key = actor.uuid ?? actor.id;
  if (scheduled.has(key)) clearTimeout(scheduled.get(key));
  scheduled.set(key, setTimeout(async () => {
    scheduled.delete(key);
    try {
      const outcome = await ensureNativeTrollSize(actor);
      if (outcome.changed) console.info(MODULE + ' | Native Troll size Talent', outcome);
    } catch (error) {
      console.error(MODULE + ' | Native Troll size Talent', actor.name, error);
    }
  }, 850));
}

let registered = false;
export function registerNativeRacialSizeTalents() {
  if (registered) return;
  registered = true;
  const onCreateRace = (item, options, userId) => {
    if (options?.merpUiNativeRacialSize || userId !== game.user?.id) return;
    if (item.type === 'race' && item.parent?.documentName === 'Actor') schedule(item.parent);
  };
  const onUpdateRace = (item, changes, options, userId) => {
    if (options?.merpUiNativeRacialSize || userId !== game.user?.id) return;
    if (item.type === 'race' && item.parent?.documentName === 'Actor') schedule(item.parent);
  };
  Hooks.on('createItem', onCreateRace);
  Hooks.on('updateItem', onUpdateRace);
  Hooks.on('updateActor', (actor, changes, options, userId) => {
    if (options?.merpUiNativeRacialSize || userId !== game.user?.id) return;
    if (changes.system?.frame?.size !== undefined) schedule(actor);
  });
  Hooks.once('ready', () => {
    if (game.system?.id !== 'rmu' || !game.user?.isGM) return;
    for (const actor of game.actors.contents) {
      if (planNativeTrollSize(actor).eligible) schedule(actor);
    }
  });
}
