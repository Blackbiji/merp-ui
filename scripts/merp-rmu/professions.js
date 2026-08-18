import { contentLanguage, localizeManagedDocument } from "./localization.js";
import { folderParentId } from "./content-folders.js";
import { cloneRmuDocument, findRmuCompendiumDocument } from "./rmu-adapter.js";
import { expectedProfessionTechnicalKey } from "./creation-rules.js";
import { upsertManagedItem } from "./managed-content.js";

const MODULE_ID = "merp-ui";
const ROOT_FOLDER = "MERP-RMU";
const DATA_PATH = `modules/${MODULE_ID}/data/merp-rmu/khazad.json`;
const PROFESSION_DESCRIPTIONS_PATH =
  `modules/${MODULE_ID}/data/merp-rmu/profession-descriptions.json`;

async function loadMerpRmuData() {
  const response = await fetch(DATA_PATH, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Unable to load ${DATA_PATH}: ${response.status}`);
  return response.json();
}

const PROFESSION_DESCRIPTION_ALIASES = new Map([
  ["fighter", ["Guerrier", "Fighter"]],
  ["barbarian", ["Barbare", "Barbarian"]],
  ["rogue", ["Roublard", "Rogue"]],
  ["thief", ["Voleur", "Thief"]],
  ["layman", ["Sans Profession", "Layman"]],
  ["alchemist", ["Alchimiste", "Alchemist"]],
  ["magician", ["Magicien", "Magician"]],
  ["animist", ["Animiste", "Animist"]],
  ["razak-zinul", ["Razak-Zinul", "Razak-zinul"]],
  ["herutano", ["Herutano", "Herutanor"]],
  ["lay-healer", ["Soigneur", "Lay Healer"]],
  ["seer", ["Devin", "Seer"]],
  ["bard", ["Barde", "Bard"]],
  ["ranger", ["Rôdeur", "Ranger"]],
  ["astrologer", ["Astrologue", "Astrologer"]],
  ["kekhavra", ["Kekhavra"]],
  ["sorcerer", ["Sorcier", "Sorcerer"]],
  ["vracara", ["Vracara"]],
  ["wegech", ["Wegech"]],
  ["drughan", ["Drughân", "Drughan"]]
]);

export async function loadProfessionDescriptionData() {
  const response = await fetch(PROFESSION_DESCRIPTIONS_PATH, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${PROFESSION_DESCRIPTIONS_PATH}: ${response.status}`);
  return response.json();
}

export function professionDescriptionDefinitions(descriptionData) {
  const definitions = new Map();
  for (const entry of descriptionData?.professions ?? []) {
    if (!entry?.key || !entry?.name || typeof entry?.description !== "string" || !entry.description.trim()) continue;
    const localized = entry.localizations?.[contentLanguage()] ?? null;
    const name = localized?.name ?? entry.name;
    const description = localized?.description ?? entry.description;
    definitions.set(entry.key, {
      key: entry.key,
      name,
      description,
      aliases: new Set([entry.name, name, ...(PROFESSION_DESCRIPTION_ALIASES.get(entry.key) ?? [])])
    });
  }
  return definitions;
}

export function isInsideMerpRmuItemTree(item) {
  let folder = item?.folder ?? null;
  const seen = new Set();
  while (folder && !seen.has(folder.id)) {
    if (folder.name === ROOT_FOLDER) return true;
    seen.add(folder.id);
    const parentId = folderParentId(folder);
    folder = parentId ? game.folders.get(parentId) : null;
  }
  return false;
}

export async function forceProfessionDescriptions({ data = null, notify = false } = {}) {
  if (!game.user?.isGM) return { skipped: true, reason: "not-gm", updated: 0, matched: 0 };
  if (game.system?.id !== "rmu") return { skipped: true, reason: "wrong-system", updated: 0, matched: 0 };

  const descriptionData = await loadProfessionDescriptionData();
  const definitions = professionDescriptionDefinitions(descriptionData);
  let updated = 0;
  let matched = 0;
  const details = [];

  for (const [key, def] of definitions.entries()) {
    const candidates = game.items.filter((item) => {
      if (item.type !== "profession") return false;
      const itemKey = item.getFlag?.(MODULE_ID, "key");
      const collection = item.getFlag?.(MODULE_ID, "collection");
      const byKey = itemKey === key;
      const byAlias = def.aliases.has(item.name);
      const inManagedTree = isInsideMerpRmuItemTree(item);
      return byKey || (byAlias && (collection === "merp-rmu" || inManagedTree));
    });

    // Prefer the current managed document, but update every legacy duplicate in the
    // MERP-RMU tree as well so opening an old entry can no longer show stale prose.
    candidates.sort((a, b) => {
      const aCurrent = a.getFlag?.(MODULE_ID, "key") === key && a.getFlag?.(MODULE_ID, "collection") === "merp-rmu";
      const bCurrent = b.getFlag?.(MODULE_ID, "key") === key && b.getFlag?.(MODULE_ID, "collection") === "merp-rmu";
      return Number(bCurrent) - Number(aCurrent);
    });

    matched += candidates.length;
    for (const item of candidates) {
      if (item.system?.description === def.description) {
        details.push({ key, name: item.name, id: item.id, action: "unchanged" });
        continue;
      }
      // IMPORTANT: description migrations are editorial only. Never use
      // non-recursive/system replacement semantics here: doing so can reset
      // RMU Profession model fields (costs, realms, base-list count, etc.) to
      // schema defaults. Update exactly one dotted path and let Foundry merge it.
      await item.update({ "system.description": def.description }, {
        render: false,
        merpUiForceProfessionDescription: true
      });
      updated += 1;
      details.push({ key, name: item.name, id: item.id, action: "updated" });
    }
  }

  const missing = [...definitions.keys()].filter((key) => !details.some((entry) => entry.key === key));
  const result = { updated, matched, expected: definitions.size, missing, details };
  if (notify) {
    ui.notifications.info(`MERP UI : ${updated} description(s) de Profession réécrite(s) sur ${matched} fiche(s) trouvée(s).`);
  }
  return result;
}


const PROFESSION_CHASSIS_FIELDS = [
  "book", "profession", "spellCastingGroup", "numberOfBaseLists", "realms",
  "skillDevelopmentCosts", "combatTrainingCosts", "professionalSkills"
];

export async function resolveNativeProfessionDocument(def) {
  const source = await findRmuCompendiumDocument(def.sourcePack ?? "rmu.core", {
    id: def.sourceId ?? null,
    name: def.sourceName ?? null,
    type: "profession",
    fields: ["name", "type"]
  });
  if (!source) return null;
  const document = cloneRmuDocument(source);
  const overrides = foundry.utils.deepClone(def.document ?? {});
  return foundry.utils.mergeObject(document, overrides, { inplace: false, overwrite: true, recursive: true });
}

export function findManagedProfessionCandidates(key, expectedName = null) {
  return game.items.filter((item) => {
    if (item.type !== "profession") return false;
    const managedKey = item.getFlag?.(MODULE_ID, "key");
    const collection = item.getFlag?.(MODULE_ID, "collection");
    if (managedKey === key && collection === "merp-rmu") return true;
    return expectedName && item.name === expectedName && isInsideMerpRmuItemTree(item);
  });
}

export async function forceProfessionChassis({ data = null, notify = false, includeEmbedded = true } = {}) {
  if (!game.user?.isGM) return { skipped: true, reason: "not-gm", updated: 0, matched: 0, expected: 20 };
  if (game.system?.id !== "rmu") return { skipped: true, reason: "wrong-system", updated: 0, matched: 0, expected: 20 };
  const sourceData = data ?? await loadMerpRmuData();
  const definitions = [];

  for (const def of (sourceData.items ?? []).filter((entry) => entry?.document?.type === "profession")) {
    definitions.push({ key: def.key, name: def.document?.name, img: def.document?.img, system: foundry.utils.deepClone(def.document?.system ?? {}) });
  }
  for (const def of (sourceData.rmuNativeProfessions ?? [])) {
    const merged = await resolveNativeProfessionDocument(def);
    if (!merged) {
      console.warn(`${MODULE_ID} | Châssis RMU natif introuvable : ${def.key}`);
      definitions.push({ key: def.key, name: def.document?.name, missing: true });
      continue;
    }
    definitions.push({ key: def.key, name: merged.name, img: merged.img, system: foundry.utils.deepClone(merged.system ?? {}) });
  }

  let updated = 0;
  let matched = 0;
  const missing = [];
  const details = [];
  for (const def of definitions) {
    if (def.missing || !def.system) { missing.push(def.key); continue; }
    const candidates = findManagedProfessionCandidates(def.key, def.name);
    if (!candidates.length) { missing.push(def.key); continue; }
    for (const item of candidates) {
      const update = {};
      if (def.img) update.img = def.img;
      for (const field of PROFESSION_CHASSIS_FIELDS) if (def.system[field] !== undefined) update[`system.${field}`] = foundry.utils.deepClone(def.system[field]);
      await item.update(update, { render: false, diff: false, recursive: false, merpUiProfessionChassisRestore: true });
      updated += 1; matched += 1;
      details.push({ key: def.key, name: item.name, id: item.id, embedded: false, developmentCosts: def.system.skillDevelopmentCosts?.length ?? 0, combatTrainingCosts: def.system.combatTrainingCosts?.length ?? 0, professionalSkills: def.system.professionalSkills?.length ?? 0, baseLists: def.system.numberOfBaseLists ?? 0 });
    }
    if (includeEmbedded) {
      for (const actor of (game.actors?.contents ?? [])) {
        for (const item of actor.items ?? []) {
          if (item.type !== "profession") continue;
          const itemKey = item.getFlag?.(MODULE_ID, "key");
          if (itemKey !== def.key && item.name !== def.name) continue;
          const update = {};
          if (def.img) update.img = def.img;
          for (const field of PROFESSION_CHASSIS_FIELDS) if (def.system[field] !== undefined) update[`system.${field}`] = foundry.utils.deepClone(def.system[field]);
          await item.update(update, { render: false, diff: false, recursive: false, merpUiProfessionChassisRestore: true });
          updated += 1; matched += 1;
          details.push({ key: def.key, name: item.name, id: item.id, actor: actor.name, embedded: true });
        }
      }
    }
  }
  const result = { updated, matched, expected: definitions.length, missing, details };
  if (notify) ui.notifications.info(`MERP UI : châssis restauré pour ${definitions.length - missing.length}/${definitions.length} Professions (${updated} fiche(s) mises à jour).`);
  return result;
}

export async function normalizeEmbeddedProfessionTechnicalKey(item) {
  if (!item?.parent || item.parent.documentName !== "Actor" || item.type !== "profession") return false;
  const expected = expectedProfessionTechnicalKey(item);
  if (!expected || item.system?.profession === expected) return false;
  await item.update({ "system.profession": expected }, { render: false, merpUiProfessionNormalization: true });
  return true;
}

export async function repairActorProfessionTechnicalKeys() {
  if (!game.user?.isGM) return 0;
  let updated = 0;
  for (const actor of game.actors ?? []) {
    for (const item of actor.items ?? []) {
      if (await normalizeEmbeddedProfessionTechnicalKey(item)) updated += 1;
    }
  }
  return updated;
}

export async function upsertConfiguredNativeProfessions(defs, folders) {
  const results = [];
  if (!defs?.length) return results;

  for (const def of defs) {
    const folder = folders.get(def.folder);
    if (!folder) throw new Error(`Sous-dossier MERP-RMU inconnu pour profession RMU : ${def.folder}`);
    const pack = game.packs.get(def.sourcePack ?? "rmu.core");
    if (!pack) {
      console.warn(`${MODULE_ID} | Compendium RMU introuvable pour profession : ${def.key}`);
      continue;
    }
    let source = null;
    if (def.sourceId) source = await pack.getDocument(def.sourceId);
    if (!source && def.sourceName) {
      const index = await pack.getIndex({ fields: ["name", "type"] });
      const hit = index.find((entry) => entry.type === "profession" && entry.name === def.sourceName)
        ?? index.find((entry) => entry.name === def.sourceName);
      if (hit) source = await pack.getDocument(hit._id);
    }
    if (!source) {
      console.warn(`${MODULE_ID} | Profession RMU native introuvable : ${def.key}`);
      continue;
    }
    const document = source.toObject();
    delete document._id;
    delete document.folder;
    delete document._stats;
    const overrides = foundry.utils.deepClone(def.document ?? {});
    const mergedBase = foundry.utils.mergeObject(document, overrides, { inplace: false, overwrite: true, recursive: true });
    const merged = localizeManagedDocument(mergedBase, def.localizations);
    merged.flags = foundry.utils.mergeObject(merged.flags ?? {}, {
      [MODULE_ID]: {
        key: def.key,
        collection: "merp-rmu",
        contentVersion: 1,
        nativeRMU: true,
        source: { type: "rmu-native-profession", reference: source.uuid }
      }
    }, { inplace: false, overwrite: true, recursive: true });
    results.push(await upsertManagedItem({ key: def.key, document: merged }, folder));
  }
  return results;
}
