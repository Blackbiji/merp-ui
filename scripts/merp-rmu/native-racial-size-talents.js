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
// Legacy embedded Races do not always retain the collection flag. They may
// preserve only a canonical key or a compendium source key from an older build.
// Never guess ancestry from the visible (user-editable) name alone.
const keyOf = race => {
  const flags = race?.flags?.[MODULE] ?? {};
  const values = [flags.canonicalKey, flags.key, flags.compendiumSourceKey];
  for (const value of values) {
    const key = String(value ?? '').replace(/-age-[1-4]$/, '');
    if (Object.hasOwn(SIZES, key)) return key;
  }
  return '';
};

const sizeName = name => String(name ?? '').trim().toLowerCase();
const isSizeName = name => ['large', 'increased size'].includes(sizeName(name));

function isRacialTalent(item) {
  if (item?.type !== 'talent') return false;
  // Legacy native grants commonly carry only a Racial category. An ordinary
  // purchased Increased Size Talent must never be upgraded by this migration.
  return item.flags?.rmu?.race === true ||
    item.flags?.[MODULE]?.autoRacialGrant === MIGRATION ||
    item.flags?.[MODULE]?.racialTalentKey === 'increased-size' ||
    (sizeName(item.name) === 'large' &&
      sizeName(item.system?.category) === 'racial' &&
      Number(item.system?.dpSpent ?? 0) === 0);
}

function raceSizePatch(race, rule) {
  const patch = {};
  if (race.system?.frame?.size !== rule.size) {
    patch['system.frame.size'] = rule.size;
  }
  if (Array.isArray(race.system?.talents)) {
    const talents = race.system.talents;
    const indices = talents.flatMap((item, i) => isSizeName(item?.name) ? [i] : []);
    // Do not alter a hand-edited Race with multiple overlapping size grants.
    if (indices.length > 1) return {ambiguous: true, patch: {}};
    if (indices.length === 1) {
      const i = indices[0], old = talents[i];
      if (old.name !== rule.talent || Number(old.tier) !== rule.tier) {
        patch['system.talents'] = talents.map((item, j) =>
          j === i ? {...item, name: rule.talent, tier: rule.tier} : item
        );
      }
    } else {
      patch['system.talents'] = [...talents,
        {name: rule.talent, tier: rule.tier, description: descriptions.fr}];
    }
  }
  return {ambiguous: false, patch};
}

export function planNativeTrollSize(actor) {
  if (!actor || actor.documentName !== 'Actor' ||
      String(actor.type).toLowerCase() !== 'character') {
    return { eligible: false, reason: 'not-character' };
  }
  const races = [...actor.items].filter(item => item.type === 'race');
  if (races.length !== 1) return { eligible: false, reason: 'race-count', count: races.length };
  const race = races[0];
  const key = keyOf(race), rule = SIZES[key];
  if (!rule) return { eligible: false, reason: 'not-managed-troll', key };
  const raceRepair = raceSizePatch(race, rule);
  if (raceRepair.ambiguous) {
    return { eligible: false, reason: 'ambiguous-race-size-talents', key };
  }

  const talents = [...actor.items].filter(i => i.type === 'talent');
  const matched = talents.filter(i =>
    isRacialTalent(i) && isSizeName(i.name)
  );
  const other = talents.filter(i =>
    !isRacialTalent(i) && isSizeName(i.name)
  );
  if (matched.length > 1 || other.length > 0) {
    return { eligible: false, reason: 'ambiguous-size-talents',
      key, racialMatches: matched.map(i => i.id),
      nonRacialMatches: other.map(i => i.id) };
  }
  const talent = matched[0] ?? null;
  const alreadyCorrect = Boolean(talent) &&
    talent.name === rule.talent && Number(talent.system?.tier) === rule.tier;
  // RMU CharacterData stores character size at appearance.size. The
  // embedded Race alone has frame.size; Actor.system.frame does not exist.
  const actorFrameSize = actor.system?.appearance?.size ?? null;
  const frameNeedsSync = actor.system?.appearance != null &&
    actorFrameSize !== rule.size;
  const raceNeedsSync = Object.keys(raceRepair.patch).length > 0;
  return { eligible: true, key, race: race.name, raceId: race.id,
    expected: rule.size, tier: rule.tier, talentId: talent?.id ?? null,
    actorFrameSize, frameNeedsSync, raceNeedsSync, racePatch: raceRepair.patch,
    action: !talent ? 'grant' : !alreadyCorrect ? 'normalize'
      : raceNeedsSync || frameNeedsSync ? 'sync-frame' : 'none' };
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
    // Repair the original embedded Race before recalculating the Actor. This
    // is the missing step for characters created before the 2.0.9 release.
    if (plan.raceNeedsSync) {
      const embeddedRace = actor.items.get(plan.raceId);
      if (!embeddedRace || keyOf(embeddedRace) !== plan.key) {
        throw Error('Embedded Race changed during size migration: ' + actor.name);
      }
      await actor.updateEmbeddedDocuments('Item',
        [{_id: embeddedRace.id, ...plan.racePatch}],
        {merpUiNativeRacialSize: true});
    }
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
    // Only the Character's appearance.size is writable for RMU. Never
    // create a stray Actor.system.frame field or alter existing equipment.
    if (plan.frameNeedsSync && actor.system?.appearance?.size !== plan.expected) {
      await actor.update({ 'system.appearance.size': plan.expected },
        { merpUiNativeRacialSize: true });
    }
    if (actor.system?.appearance?.size && actor.system.appearance.size !== plan.expected) {
      console.warn(MODULE + ' | RMU Actor size differs from racial expectation',
        { actor: actor.name, expected: plan.expected,
          actual: actor.system.appearance.size, talent: 'Increased Size' });
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
    if (changes.system?.appearance?.size !== undefined ||
        changes['system.appearance.size'] !== undefined) schedule(actor);
  });
  Hooks.once('ready', () => {
    if (game.system?.id !== 'rmu' || !game.user?.isGM) return;
    // A summarized audit helps the GM identify unresolved legacy data.
    // Migrate eligible Actors serially to avoid flooding Foundry with writes
    // as all character sheets are prepared at world startup.
    void (async () => {
      const report = {scanned: 0, repaired: 0, alreadyCorrect: 0, skipped: [], errors: []};
      for (const actor of game.actors.contents) {
        report.scanned++;
        const plan = planNativeTrollSize(actor);
        if (!plan.eligible) {
          if (['ambiguous-race-size-talents', 'ambiguous-size-talents'].includes(plan.reason)) {
            report.skipped.push({actor: actor.name, reason: plan.reason});
          }
          continue;
        }
        try {
          const result = await ensureNativeTrollSize(actor);
          if (result.changed) report.repaired++;
          else report.alreadyCorrect++;
        } catch (error) {
          report.errors.push({actor: actor.name, error: String(error)});
        }
      }
      console.info(MODULE + ' | Legacy Troll racial sizes', report);
    })();
  });
}
