/**
 * MERP-UI — Local, licensed Spell Law -> MERP-RMU hybrid list materialization.
 *
 * This deliberately ships NO official RMU spell data. On a GM's Foundry world,
 * it derives MERP-specific lists from the installed Spell Law compendium and
 * stores them in MERP-UI's own spell-list compendium (never in World Items).
 *
 * Source keys are stable: an existing pack document keeps its UUID across
 * updates and language changes. Nothing touches the official Spell Law pack.
 */
import { contentLanguage, localizeManagedDocument } from './localization.js';
import { loadNativeSpellTranslations, applyNativeSpellTranslationOverlay } from './spell-lists.js';
import { organizeUpdatedCompendium, queueCompendiumMaintenance } from './compendium-content.js';

const MODULE_ID = 'merp-ui';
const MERP_PACK = `${MODULE_ID}.merp-rmu-spell-lists`;
const RMU_PACK = 'rmu-spell-law.spell-lists';
const HYBRID_PROFESSIONS = new Set(['Sorcier', 'Vracara', 'Kekhavra', 'Wegech']);
const DATA_PATH = `modules/${MODULE_ID}/data/merp-rmu/khazad.json`;
const SCHEMA_VERSION = 1;

function hash(value, seed = 2166136261) {
  let h = seed >>> 0;
  for (let i = 0; i < value.length; i++) {
    h = Math.imul(h ^ value.charCodeAt(i), 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function stableId(key) {
  // Exactly 16 alphanumeric characters, reproducible on every installation.
  return `mh${hash(key, 2166136261)}${hash(key, 2246822519).slice(0, 6)}`;
}

function canonicalName(entry) {
  return String(entry?.name ?? '').trim();
}

function folderMetadata(profession) {
  const key = profession.toLowerCase().replace(/[^a-z0-9]/g, '');
  return {
    compendiumFolderKeyPath: ['spell-lists-hybrid', `spell-lists-hybrid-${key}`],
    compendiumFolderPath: {
      fr: ['Listes de Sorts Hybrides', `${profession} (Base)`],
      en: ['Hybrid Spell Lists', `${profession} (Base)`]
    }
  };
}

export function selectHybridNativeListDefinitions(data) {
  return (data?.rmuNativeSpellLists ?? []).filter(def =>
    HYBRID_PROFESSIONS.has(def?.targetProfession) && Boolean(def?.key && def?.name)
  );
}

function findSource(index, definition) {
  const candidates = index.filter(entry =>
    entry.type === 'spell-list' && canonicalName(entry) === definition.name
  );
  if (definition.sourceProfession) {
    return candidates.find(entry =>
      entry.system?.profession === definition.sourceProfession
    ) ?? null;
  }
  // Do not silently select the wrong source if a future Spell Law adds a
  // same-named list belonging to a different profession.
  return candidates.length === 1 ? candidates[0] : null;
}

function requiresAdaptation(def, source) {
  return Boolean(
    (def.targetProfession ?? source.system?.profession) !== source.system?.profession ||
    (def.realm ?? source.system?.realms) !== source.system?.realms ||
    (def.targetListType ?? source.system?.listType) !== source.system?.listType ||
    (def.targetName && def.targetName !== source.name)
  );
}

function buildAdaptedDocument(def, source, translations, language) {
  let document = source.toObject();
  delete document._id;
  delete document._stats;
  delete document.folder;
  document.system = foundry.utils.deepClone(document.system ?? {});

  document.name = def.targetName ?? document.name;
  document.system.name = document.name;
  document.system.profession = def.targetProfession ?? document.system.profession;
  document.system.realms = def.realm ?? document.system.realms;
  document.system.listType = def.targetListType ?? document.system.listType;

  document = applyNativeSpellTranslationOverlay(document, def.name, translations, language);
  // A translated *source* list must not rename two distinct MERP adaptations
  // to the same string (e.g. Nerve Law and Organ Law).
  if (def.targetName) {
    document.name = def.targetName;
    document.system.name = def.targetName;
    document.system.label = def.targetName;
  }
  document = localizeManagedDocument(document, def.localizations, language);
  document.system.name = document.name;
  for (const spell of document.system?.spells ?? []) {
    spell.profession = document.system.profession;
    spell.listType = document.system.listType;
    spell.spellList = document.name;
  }

  const metadata = folderMetadata(def.targetProfession);
  document.flags ??= {};
  const previous = document.flags[MODULE_ID] ?? {};
  const fingerprint = `${SCHEMA_VERSION}-${hash(JSON.stringify({
    name: document.name,
    system: document.system,
    img: document.img,
    language,
    origin: source.uuid
  }))}-${hash(JSON.stringify(def.localizations ?? {}))}`;

  document.flags[MODULE_ID] = {
    ...previous,
    key: def.key,
    collection: 'merp-rmu',
    nativeRMU: true,
    nativeHybridCompendiumSchema: SCHEMA_VERSION,
    nativeHybridFingerprint: fingerprint,
    compendiumSourceKey: def.key,
    compendiumPack: 'merp-rmu-spell-lists',
    compendiumSourceFile: 'data/merp-rmu/khazad.json#rmuNativeSpellLists',
    compendiumFolderKey: metadata.compendiumFolderKeyPath[1],
    ...metadata,
    source: {
      type: 'rmu-native-spell-list',
      reference: source.uuid,
      merpMapping: def.merpMapping ?? 'Direct RMU'
    }
  };
  return document;
}

/**
 * Idempotent, GM-only. dryRun is read-only. Never installs World Items.
 * Run only after MERP-UI's source-manifest compendium sync at startup.
 */
export async function synchronizeNativeHybridSpellLists({
  language = contentLanguage(),
  dryRun = false,
  notify = false
} = {}) {
  if (game.system?.id !== 'rmu') return { skipped: 'wrong-system' };
  if (!game.user?.isGM) return { skipped: 'not-gm' };
  const effectiveLanguage = language === 'fr' ? 'fr' : 'en';

  return queueCompendiumMaintenance(async () => {
    const report = {
      language: effectiveLanguage, dryRun,
      definitions: 0, sourceFound: 0,
      created: 0, updated: 0, unchanged: 0, reusedNative: 0,
      errors: []
    };
    const sourcePack = game.packs.get(RMU_PACK);
    const destPack = game.packs.get(MERP_PACK);
    if (!sourcePack || !destPack) {
      report.errors.push(`Missing compendium: ${!sourcePack ? RMU_PACK : MERP_PACK}`);
      return report;
    }
    const route = foundry.utils.getRoute ? foundry.utils.getRoute(DATA_PATH) : DATA_PATH;
    const response = await fetch(route, { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) {
      report.errors.push(`Unable to load hybrid definitions: HTTP ${response.status}`);
      return report;
    }
    const definitions = selectHybridNativeListDefinitions(await response.json());
    report.definitions = definitions.length;
    if (!definitions.length) return report;

    const sourceIndex = [...await sourcePack.getIndex({
      fields: ['name', 'type', 'system.profession', 'system.realms', 'system.listType']
    })];
    const targetIndex = [...await destPack.getIndex({
      fields: ['flags.merp-ui.key', 'flags.merp-ui.compendiumSourceKey']
    })];
    const byKey = new Map();
    const occupiedIds = new Set();
    for (const entry of targetIndex) {
      occupiedIds.add(entry._id);
      const flags = entry.flags?.[MODULE_ID] ?? {};
      const key = flags.compendiumSourceKey ?? flags.key;
      if (key) byKey.set(key, entry._id);
    }
    const translations = effectiveLanguage === 'fr'
      ? await loadNativeSpellTranslations() : null;
    const existingDocuments = [];
    const creates = [];

    for (const def of definitions) {
      try {
        const entry = findSource(sourceIndex, def);
        if (!entry) {
          report.errors.push(`${def.key}: missing or ambiguous Spell Law source '${def.name}'`);
          continue;
        }
        const source = await sourcePack.getDocument(entry._id);
        if (!source) {
          report.errors.push(`${def.key}: unable to load Spell Law source`);
          continue;
        }
        report.sourceFound++;
        if (!requiresAdaptation(def, source)) {
          report.reusedNative++;
          continue;
        }
        const desired = buildAdaptedDocument(def, source, translations, effectiveLanguage);
        const existingId = byKey.get(def.key);
        if (existingId) {
          const existing = await destPack.getDocument(existingId);
          if (!existing) throw Error(`existing compendium document ${existingId} not found`);
          if (existing.getFlag(MODULE_ID, 'nativeHybridFingerprint') ===
              desired.flags[MODULE_ID].nativeHybridFingerprint) {
            report.unchanged++;
          } else {
            existingDocuments.push({ existing, desired });
          }
        } else {
          const id = stableId(def.key);
          if (occupiedIds.has(id)) throw Error(`stable ID collision for ${id}`);
          occupiedIds.add(id);
          desired._id = id;
          creates.push(desired);
          byKey.set(def.key, id);
        }
      } catch (error) {
        report.errors.push(`${def.key}: ${error.message}`);
      }
    }

    if (dryRun) {
      report.created = creates.length;
      report.updated = existingDocuments.length;
      return report;
    }
    if (!creates.length && !existingDocuments.length) return report;

    const wasLocked = Boolean(destPack.locked ?? destPack.metadata?.locked);
    if (wasLocked && typeof destPack.configure !== 'function') {
      report.errors.push('MERP-UI spell-list compendium cannot be unlocked');
      return report;
    }
    try {
      if (wasLocked) await destPack.configure({ locked: false });
      for (const desired of creates) {
        try {
          await Item.create(desired, {
            pack: destPack.collection,
            keepId: true,
            keepEmbeddedIds: true,
            render: false,
            renderSheet: false,
            merpUiCompendiumPackMaintenance: true
          });
          report.created++;
        } catch (error) {
          report.errors.push(`create ${desired.name}: ${error.message}`);
        }
      }
      for (const { existing, desired } of existingDocuments) {
        try {
          await existing.update({
            name: desired.name,
            img: desired.img,
            system: desired.system,
            [`flags.${MODULE_ID}`]: desired.flags[MODULE_ID]
          }, { render: false, merpUiCompendiumPackMaintenance: true });
          report.updated++;
        } catch (error) {
          report.errors.push(`update ${desired.name}: ${error.message}`);
        }
      }
    } finally {
      if (wasLocked) await destPack.configure({ locked: true });
    }

    if (report.created || report.updated) {
      await organizeUpdatedCompendium('merp-rmu-spell-lists', effectiveLanguage);
    }
    if (notify) {
      ui.notifications?.info?.(`MERP-UI: ${report.created} hybrid lists added, ${report.updated} updated.`);
    }
    if (report.errors.length) console.warn('MERP-UI | Hybrid spell-list sync', report);
    return report;
  });
}
