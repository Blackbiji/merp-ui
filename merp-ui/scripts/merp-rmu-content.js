import {
  installMerpRmuTalentsFlaws,
  registerMerpRmuTalentsFlawsHooks,
  registerMerpRmuTalentsFlawsSetting
} from "./merp-rmu/talents-flaws.js";
import {
  registerMerpRmuLegacyMigrationSetting,
  runMerpRmuLegacyMigrations
} from "./merp-rmu/legacy-migrations.js";
import {
  cloneRmuDocument,
  exposeRmuAdapterApi,
  findRmuCompendiumDocument,
  getRmuCompendiumIndex
} from "./merp-rmu/rmu-adapter.js";
import { registerCreationRestrictionHooks } from "./merp-rmu/creation-adapter.js";
import {
  expectedProfessionTechnicalKey,
  filterLimitedBaseSpellListChoices,
  installMerpPrimeStatHelper,
  merpPrimeStatsForProfession,
  normalizedSpellListIdentity
} from "./merp-rmu/creation-rules.js";
import { registerHonninBeta } from "./merp-rmu/honnin-beta.js";

const MODULE_ID = "merp-ui";
registerMerpRmuTalentsFlawsHooks();
registerHonninBeta();
const DATA_PATH = `modules/${MODULE_ID}/data/merp-rmu/khazad.json`;
const PROFESSION_DESCRIPTIONS_PATH = `modules/${MODULE_ID}/data/merp-rmu/profession-descriptions.json`;
const MERP_SPECIAL_POWER_SKILLS_PATH = `modules/${MODULE_ID}/data/merp-rmu/special-power-skills.json`;
const MERP_HERBS_PATH = `modules/${MODULE_ID}/data/merp-rmu/herbs-v1.json`;
const MERP_INTRODUCTION_PATH = `modules/${MODULE_ID}/data/merp-rmu/introduction-v1.json`;
const MERP_INTRODUCTION_SETTING = "merpRmuIntroductionVersion";
const MERP_HERBS_SETTING = "merpRmuHerbsVersion";

const MERP_SPECIAL_POWER_SKILL_KEYS = new Set([
  "healing-songs",
  // Legacy 1.2.107–1.2.109 keys retained only for safe migration/results.
  "healing-song-blood",
  "healing-song-bone",
  "healing-song-sensory",
  "healing-song-muscle",
  "healing-song-cleansing",
  "healing-song-strengthening",
  "yavannas-song"
]);
const MERP_SPECIAL_POWER_CANONICAL_KEYS = new Set(["healing-songs", "yavannas-song"]);

const MERP_SPECIAL_POWER_TRANSLATIONS = {
  skills: {
    "Healing Songs": "Chants de Guérison (Healing Songs)",
    "Yavanna's Song": "Chant de Yavanna (Yavanna's Song)",
    "Tattooing": "Tatouage (Tattooing)",
    // Backward compatibility with the 1.2.107/108 standalone Skill names.
    "Chant du Sang": "Chant du Sang",
    "Chant des Os": "Chant des Os",
    "Chant des Sens": "Chant des Sens",
    "Chant des Muscles, Tendons et Ligaments": "Chant des Muscles, Tendons et Ligaments",
    "Chant de Purification": "Chant de Purification",
    "Chant de Fortification": "Chant de Fortification",
    "Chant de Yavanna": "Chant de Yavanna"
  },
  specializations: {
    "Blood Songs": "Chant du Sang (Blood Songs)",
    "Bone Songs": "Chant des Os (Bone Songs)",
    "Sensory Songs": "Chant des Sens (Sensory Songs)",
    "Muscle/Tendon/Ligament Songs": "Chant des Muscles, Tendons et Ligaments (Muscle/Tendon/Ligament Songs)",
    "Cleansing Songs": "Chant de Purification (Cleansing Songs)",
    "Strengthening Songs": "Chant de Fortification (Strengthening Songs)"
  }
};

function installMerpSpecialPowerSkillTranslations() {
  try {
    const translations = game?.i18n?.translations;
    if (!translations) return false;
    const dictionaries = [translations];
    const fallback = game?.i18n?._fallback ?? game?.i18n?.fallbackTranslations ?? null;
    if (fallback && typeof fallback === "object") dictionaries.push(fallback);
    for (const dictionary of dictionaries) {
      for (const [name, label] of Object.entries(MERP_SPECIAL_POWER_TRANSLATIONS.skills)) {
        foundry.utils.setProperty(dictionary, `RMU.Skills.${name}`, label);
      }
      for (const [name, label] of Object.entries(MERP_SPECIAL_POWER_TRANSLATIONS.specializations)) {
        foundry.utils.setProperty(dictionary, `RMU.Specializations.${name}`, label);
      }
    }
    return true;
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible d’installer les traductions des Chants MERP`, error);
    return false;
  }
}
const NON_RMU_DATA_PATH = `modules/${MODULE_ID}/data/merp-rmu/non-rmu-spell-lists.json`;
const ROOT_FOLDER = "MERP-RMU";
const INSTALL_SETTING = "merpRmuContentVersion";
const PROFESSION_DESCRIPTION_SETTING = "merpRmuProfessionDescriptionVersion";
const PROFESSION_CHASSIS_INTEGRITY_SETTING = "merpRmuProfessionChassisIntegrityVersion";
const MERP_SPECIAL_POWER_SKILLS_SETTING = "merpRmuSpecialPowerSkillsVersion";
const NON_RMU_PACK_SETTING = "merpRmuSpellListPackVersion";
const NON_RMU_PACK_ID = "world.merp-rmu-spell-lists";


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

async function loadProfessionDescriptionData() {
  const response = await fetch(PROFESSION_DESCRIPTIONS_PATH, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${PROFESSION_DESCRIPTIONS_PATH}: ${response.status}`);
  return response.json();
}

function professionDescriptionDefinitions(descriptionData) {
  const definitions = new Map();
  for (const entry of descriptionData?.professions ?? []) {
    if (!entry?.key || !entry?.name || typeof entry?.description !== "string" || !entry.description.trim()) continue;
    definitions.set(entry.key, {
      key: entry.key,
      name: entry.name,
      description: entry.description,
      aliases: new Set([entry.name, ...(PROFESSION_DESCRIPTION_ALIASES.get(entry.key) ?? [])])
    });
  }
  return definitions;
}

function isInsideMerpRmuItemTree(item) {
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

async function resolveNativeProfessionDocument(def) {
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

function findManagedProfessionCandidates(key, expectedName = null) {
  return game.items.filter((item) => {
    if (item.type !== "profession") return false;
    const managedKey = item.getFlag?.(MODULE_ID, "key");
    const collection = item.getFlag?.(MODULE_ID, "collection");
    if (managedKey === key && collection === "merp-rmu") return true;
    return expectedName && item.name === expectedName && isInsideMerpRmuItemTree(item);
  });
}

async function forceProfessionChassis({ data = null, notify = false, includeEmbedded = true } = {}) {
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

async function normalizeEmbeddedProfessionTechnicalKey(item) {
  if (!item?.parent || item.parent.documentName !== "Actor" || item.type !== "profession") return false;
  const expected = expectedProfessionTechnicalKey(item);
  if (!expected || item.system?.profession === expected) return false;
  await item.update({ "system.profession": expected }, { render: false, merpUiProfessionNormalization: true });
  return true;
}

async function repairActorProfessionTechnicalKeys() {
  if (!game.user?.isGM) return 0;
  let updated = 0;
  for (const actor of game.actors ?? []) {
    for (const item of actor.items ?? []) {
      if (await normalizeEmbeddedProfessionTechnicalKey(item)) updated += 1;
    }
  }
  return updated;
}


function folderParentId(folder) {
  return folder?.folder?.id ?? folder?.folder ?? null;
}

async function ensureFolder(name, type, parent = null, sort = null, sorting = null) {
  const parentId = parent?.id ?? parent ?? null;
  let folder = game.folders.find((candidate) =>
    candidate.type === type &&
    candidate.name === name &&
    folderParentId(candidate) === parentId
  );

  if (!folder) {
    folder = await Folder.create({
      name,
      type,
      folder: parentId,
      sorting: sorting ?? "a",
      sort: sort ?? 0
    });
  } else {
    const update = {};
    if (sort !== null && folder.sort !== sort) update.sort = sort;
    if (sorting !== null && folder.sorting !== sorting) update.sorting = sorting;
    if (Object.keys(update).length) await folder.update(update);
  }

  return folder;
}

async function ensureItemFolder(name, parent = null, sort = null, sorting = null) {
  return ensureFolder(name, "Item", parent, sort, sorting);
}

async function ensureJournalFolder(name, parent = null, sort = null, sorting = null) {
  return ensureFolder(name, "JournalEntry", parent, sort, sorting);
}

function findManagedItem(key) {
  return game.items.find((item) =>
    item.getFlag(MODULE_ID, "key") === key &&
    item.getFlag(MODULE_ID, "collection") === "merp-rmu"
  );
}

function prepareDocumentData(entry, folder) {
  const data = foundry.utils.deepClone(entry.document);
  data.folder = folder.id;
  return data;
}

async function upsertManagedItem(entry, folder) {
  const existing = findManagedItem(entry.key);
  const data = prepareDocumentData(entry, folder);

  if (!existing) {
    const created = await Item.create(data, { renderSheet: false });
    return { action: "created", item: created };
  }

  const update = foundry.utils.deepClone(data);
  delete update.type;
  await existing.update(update, { render: false });
  return { action: "updated", item: existing };
}


function findManagedJournal(key) {
  return game.journal.find((journal) =>
    journal.getFlag(MODULE_ID, "key") === key &&
    journal.getFlag(MODULE_ID, "collection") === "merp-rmu-rules"
  );
}

function prepareJournalData(entry, folder) {
  const data = foundry.utils.deepClone(entry.document);
  data.folder = folder?.id ?? null;
  return data;
}

async function upsertManagedJournal(entry, folder) {
  const existing = findManagedJournal(entry.key);
  const data = prepareJournalData(entry, folder);

  if (!existing) {
    const created = await JournalEntry.create(data, { renderSheet: false });
    return { action: "created", journal: created };
  }

  const update = foundry.utils.deepClone(data);
  await existing.update(update, { render: false, diff: false, recursive: false });
  return { action: "updated", journal: existing };
}

function managedJournals() {
  return game.journal.filter((journal) =>
    journal.getFlag(MODULE_ID, "collection") === "merp-rmu-rules"
  );
}

function managedItems() {
  return game.items.filter((item) =>
    item.getFlag(MODULE_ID, "collection") === "merp-rmu"
  );
}

function folderLineageNames(item) {
  const names = [];
  let folder = item?.folder ?? null;
  const visited = new Set();

  while (folder && !visited.has(folder.id)) {
    visited.add(folder.id);
    names.push(folder.name);
    const parentId = folderParentId(folder);
    folder = parentId ? game.folders.get(parentId) : null;
  }

  return names;
}

function ageFolderName(item) {
  return folderLineageNames(item).find((name) => /^(Premier|Deuxième|Troisième|Quatrième) Âge$/u.test(name)) ?? null;
}

function normalizeLinkLabel(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[’']/gu, "’")
    .trim();
}

function aliasesForManagedItem(item) {
  const aliases = new Set([item.name]);
  const name = item.name;

  if (name.includes(" — ")) {
    const [left, right] = name.split(" — ", 2);
    aliases.add(left.trim());
    for (const part of right.split(/\s*\/\s*/u)) aliases.add(part.trim());
  }

  const paren = name.match(/^(.+?)\s*\((.+)\)$/u);
  if (paren) {
    aliases.add(paren[1].trim());
    for (const part of paren[2].split(/\s*\/\s*/u)) aliases.add(part.trim());
  }

  const explicitAliases = {
    "Guerrier": ["Guerrier", "Fighter"],
    "Barbare": ["Barbare", "Barbarian"],
    "Roublard": ["Roublard", "Rogue"],
    "Voleur": ["Voleur", "Thief"],
    "Sans Profession": ["Sans Profession", "Layman"],
    "Alchimiste": ["Alchimiste", "Alchemist"],
    "Magicien": ["Magicien", "Magician"],
    "Soigneur": ["Soigneur", "Lay Healer"],
    "Animiste": ["Animiste", "Animist"],
    "Rôdeur": ["Rôdeur", "Ranger"],
    "Barde": ["Barde", "Bard"],
    "Devin": ["Devin", "Seer"],
    "Astrologue": ["Astrologue", "Astrologer"],
    "Razak-Zinul": ["Razak-Zinul", "Razak-zinul"],
    "Kekhavra": ["Kekhavra"],
    "Sorcier": ["Sorcier", "Sorcerer"],
    "Vracara": ["Vracara"],
    "Wegech": ["Wegech"],
    "Drughân": ["Drughân", "Drughan"],
    "Herutano": ["Herutano", "Herutanor"],
    "Prêtre Honnin (Ônu)": ["Prêtre Honnin", "Ônu", "Honnin Priest"],
    "Petits-Nains — Noegyth Nibin": ["Petits-Nains", "Noegyth Nibin"],
    "Orcs communs — Yrch": ["Orcs communs", "Yrch"],
    "Uruk-hai — Grands Orcs": ["Uruk-hai", "Grands Orcs"],
    "Demi-Orcs — Perorch / Piryrch": ["Demi-Orcs", "Perorch", "Piryrch"],
    "Trolls des Cavernes": ["Trolls des Cavernes"],
    "Trolls des Forêts": ["Trolls des Forêts"],
    "Trolls des Collines": ["Trolls des Collines"],
    "Trolls des Neiges": ["Trolls des Neiges"],
    "Trolls de Pierre": ["Trolls de Pierre"],
    "Olog-hai — Trolls Noirs": ["Olog-hai", "Olog", "Trolls Noirs"],
    "Demi-Trolls — Pertorog / Pirtereg": ["Demi-Trolls", "Pertorog", "Pirtereg"],

    "Khazâd (Naugrim)": ["Khazâd", "Naugrim", "Nains"],
    "Humains (Hildor)": ["Humains", "Hildor"],
    "Elfes (Quendi)": ["Elfes", "Quendi"],
    "Hobbits (Periannath)": ["Hobbits", "Periannath"],
    "Demi-Elfes (Peredhil)": ["Demi-Elfes", "Peredhil"],
    "Umli (Demi-Nains)": ["Umli", "Demi-Nains"],
    "Petits-Nains (Noegyth Nibin)": ["Petits-Nains", "Noegyth Nibin"],
    "Orcs (Yrch)": ["Orcs", "Yrch"],
    "Trolls (Tereg)": ["Trolls", "Tereg"],
    "Drúedain / Woses — Drughu": ["Drúedain", "Woses", "Drughu"],
    "Daen Lintis — Dunlendings": ["Daen Lintis", "Dunlendings", "Dunlending"],
    "Gimútéothraim — Éothraim": ["Gimútéothraim", "Éothraim"],
    "Hommes des Collines — Hillmen": ["Hommes des Collines", "Hillmen"],
    "Luindrim — Foredhil / Iaurwaith": ["Luindrim", "Foredhil", "Iaurwaith"],
    "Narodbrijig — Peuple des Collines": ["Narodbrijig"],
    "Covsheknarod — Êluzan": ["Covsheknarod", "Êluzan"],
    "Honnin — Suzamatu": ["Honnin", "Suzamatu"],
    "Kuorind — Ûshasai": ["Kuorind", "Ûshasai"],
    "Pêdi — Jashcâi": ["Pêdi", "Jashcâi"],
    "Teleri — Falmari": ["Teleri", "Falmari"],
    "Maison de Bávor — Barbes-Raides": ["Maison de Bávor", "Barbes-Raides"],
    "Maison de Thelór — Poings-de-Fer": ["Maison de Thelór", "Poings-de-Fer"],
    "Maison de Drúin — Pieds-de-Pierre": ["Maison de Drúin", "Pieds-de-Pierre"],
    "Maison de Barin — Mèches-Noires": ["Maison de Barin", "Mèches-Noires"],
    "Maison de Durin — Longues-Barbes": ["Maison de Durin", "Longues-Barbes"],
    "Maisons de Dwálin et de Thrár — Barbes-de-Feu et Torses-Larges": [
      "Maisons de Dwálin et de Thrár", "Maison de Dwálin", "Maison de Thrár",
      "Barbes-de-Feu", "Torses-Larges"
    ]
  };

  for (const alias of explicitAliases[name] ?? []) aliases.add(alias);
  return [...aliases].map(normalizeLinkLabel).filter((alias) => alias.length >= 4);
}

function chooseLinkTarget(sourceItem, candidates) {
  if (!candidates.length) return null;
  const sourceAge = ageFolderName(sourceItem);
  return candidates.find((candidate) => ageFolderName(candidate) === sourceAge) ?? candidates[0];
}

function buildManagedLinkAliases(sourceItem, items) {
  const aliases = new Map();

  for (const target of items) {
    if (target.id === sourceItem.id) continue;
    for (const alias of aliasesForManagedItem(target)) {
      const key = alias.toLocaleLowerCase("fr");
      const list = aliases.get(key) ?? { label: alias, targets: [] };
      list.targets.push(target);
      if (alias.length > list.label.length) list.label = alias;
      aliases.set(key, list);
    }
  }

  return [...aliases.values()]
    .map((entry) => ({
      label: entry.label,
      target: chooseLinkTarget(sourceItem, entry.targets)
    }))
    .filter((entry) => entry.target)
    .sort((a, b) => b.label.length - a.label.length);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function linkTextNode(text, aliases, usedTargetIds) {
  let remaining = text;
  const chunks = [];

  while (remaining.length) {
    let best = null;

    for (const entry of aliases) {
      if (usedTargetIds.has(entry.target.id)) continue;
      const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(entry.label)})(?=$|[^\\p{L}\\p{N}])`, "iu");
      const match = remaining.match(pattern);
      if (!match) continue;
      const start = (match.index ?? 0) + match[1].length;
      if (!best || start < best.start || (start === best.start && match[2].length > best.match.length)) {
        best = { entry, start, match: match[2] };
      }
    }

    if (!best) {
      chunks.push(remaining);
      break;
    }

    chunks.push(remaining.slice(0, best.start));
    chunks.push(`@UUID[Item.${best.entry.target.id}]{${best.match}}`);
    usedTargetIds.add(best.entry.target.id);
    remaining = remaining.slice(best.start + best.match.length);
  }

  return chunks.join("");
}

function enrichManagedDescriptionLinks(sourceItem, html, items) {
  if (!html || typeof html !== "string" || !globalThis.DOMParser) return html;
  const aliases = buildManagedLinkAliases(sourceItem, items);
  if (!aliases.length) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="merp-link-root">${html}</div>`, "text/html");
  const root = doc.querySelector("#merp-link-root");
  if (!root) return html;

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  const usedTargetIds = new Set();
  for (const node of nodes) {
    const parentTag = node.parentElement?.tagName?.toLowerCase();
    if (["a", "code", "pre", "script", "style", "h1"].includes(parentTag)) continue;
    if (!node.nodeValue?.trim()) continue;
    node.nodeValue = linkTextNode(node.nodeValue, aliases, usedTargetIds);
  }

  return root.innerHTML;
}

async function linkManagedDescriptions() {
  const items = managedItems();
  let updated = 0;

  for (const item of items) {
    const description = item.system?.description;
    if (!description || typeof description !== "string") continue;
    const linked = enrichManagedDescriptionLinks(item, description, items);
    if (linked === description) continue;
    await item.update({ "system.description": linked }, { render: false });
    updated += 1;
  }

  return updated;
}

function buildJournalLinkAliases(sourceJournal, journals, items) {
  const aliases = [];
  for (const journal of journals) {
    if (journal.id === sourceJournal.id) continue;
    aliases.push({ label: normalizeLinkLabel(journal.name), uuid: `JournalEntry.${journal.id}`, targetId: `J:${journal.id}` });
  }
  for (const item of items) {
    for (const alias of aliasesForManagedItem(item)) {
      aliases.push({ label: alias, uuid: `Item.${item.id}`, targetId: `I:${item.id}` });
    }
  }
  return aliases.filter((entry) => entry.label.length >= 4).sort((a, b) => b.label.length - a.label.length);
}

function linkTextNodeToDocuments(text, aliases, usedTargetIds) {
  let remaining = text;
  const chunks = [];
  while (remaining.length) {
    let best = null;
    for (const entry of aliases) {
      if (usedTargetIds.has(entry.targetId)) continue;
      const pattern = new RegExp(`(^|[^\p{L}\p{N}])(${escapeRegExp(entry.label)})(?=$|[^\p{L}\p{N}])`, "iu");
      const match = remaining.match(pattern);
      if (!match) continue;
      const start = (match.index ?? 0) + match[1].length;
      if (!best || start < best.start || (start === best.start && match[2].length > best.match.length)) {
        best = { entry, start, match: match[2] };
      }
    }
    if (!best) { chunks.push(remaining); break; }
    chunks.push(remaining.slice(0, best.start));
    chunks.push(`@UUID[${best.entry.uuid}]{${best.match}}`);
    usedTargetIds.add(best.entry.targetId);
    remaining = remaining.slice(best.start + best.match.length);
  }
  return chunks.join("");
}

function enrichJournalHtmlLinks(sourceJournal, html, journals, items) {
  if (!html || typeof html !== "string" || !globalThis.DOMParser) return html;
  const aliases = buildJournalLinkAliases(sourceJournal, journals, items);
  if (!aliases.length) return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="merp-journal-link-root">${html}</div>`, "text/html");
  const root = doc.querySelector("#merp-journal-link-root");
  if (!root) return html;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  const usedTargetIds = new Set();
  for (const node of nodes) {
    const parentTag = node.parentElement?.tagName?.toLowerCase();
    if (["a", "code", "pre", "script", "style", "h1"].includes(parentTag)) continue;
    if (!node.nodeValue?.trim()) continue;
    node.nodeValue = linkTextNodeToDocuments(node.nodeValue, aliases, usedTargetIds);
  }
  return root.innerHTML;
}

async function linkManagedJournalPages() {
  const journals = managedJournals();
  const items = managedItems();
  let updated = 0;
  for (const journal of journals) {
    const pageUpdates = [];
    for (const page of journal.pages ?? []) {
      if (page.type !== "text") continue;
      const content = page.text?.content;
      if (!content) continue;
      const linked = enrichJournalHtmlLinks(journal, content, journals, items);
      if (linked !== content) pageUpdates.push({ _id: page.id, "text.content": linked });
    }
    if (pageUpdates.length) {
      await journal.updateEmbeddedDocuments("JournalEntryPage", pageUpdates);
      updated += pageUpdates.length;
    }
  }
  return updated;
}

async function loadMerpRmuData() {
  const route = foundry?.utils?.getRoute ? foundry.utils.getRoute(DATA_PATH) : DATA_PATH;
  const response = await fetch(route, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Données MERP-RMU introuvables : HTTP ${response.status}`);
  return response.json();
}

async function loadNonRmuSpellListData() {
  const route = foundry?.utils?.getRoute ? foundry.utils.getRoute(NON_RMU_DATA_PATH) : NON_RMU_DATA_PATH;
  const response = await fetch(route, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Listes MERP-RMU non-RMU introuvables : HTTP ${response.status}`);
  return response.json();
}

async function ensureConfiguredFolders(folderDefs, root, type = "Item") {
  const folders = new Map();
  const pending = [...folderDefs];

  while (pending.length) {
    let progressed = false;

    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const def = pending[index];
      const parent = def.parent ? folders.get(def.parent) : root;
      if (def.parent && !parent) continue;

      folders.set(def.key, await ensureFolder(def.name, type, parent, def.sort ?? null, def.sorting ?? null));
      pending.splice(index, 1);
      progressed = true;
    }

    if (!progressed) {
      throw new Error(`Définition circulaire ou parent inconnu dans les dossiers MERP-RMU : ${
        pending.map((def) => def.key).join(", ")
      }`);
    }
  }

  return folders;
}


function spellListSignature(itemOrData) {
  const system = itemOrData?.system ?? {};
  return [
    itemOrData?.name ?? "",
    system.listType ?? "",
    system.profession ?? "",
    system.realms ?? ""
  ].join("\u0000");
}

function spellListSystemFingerprint(item) {
  return JSON.stringify(item?.system?.toObject ? item.system.toObject() : (item?.system ?? {}));
}

async function removeExactImportedSpellListDuplicates(candidates) {
  const groups = new Map();
  for (const item of candidates) {
    const source = item._stats?.compendiumSource ?? null;
    if (!source) continue;
    const key = `${source}\u0000${spellListSystemFingerprint(item)}`;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  let deleted = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => Number(a._stats?.createdTime ?? 0) - Number(b._stats?.createdTime ?? 0));
    const extras = group.slice(1);
    if (extras.length) {
      await Item.deleteDocuments(extras.map((item) => item.id));
      deleted += extras.length;
    }
  }
  return deleted;
}

// Remove duplicate world spell-list Items created by repeated full Compendium imports.
// RMU builds the Base/Open/Closed specialization menus from world Items, so each
// duplicate Item becomes a duplicate option in the UI. RMU identifies a spell-list
// specialization by its visible list identity (name + list type + profession + realm),
// so repeated imports may still differ in harmless metadata/system details while
// producing the same menu option. Deduplicate by that RMU identity. MERP variants
// remain distinct whenever their profession/list type/realm differs (e.g. Animist
// copies derived from Druid lists).
async function deduplicateWorldSpellLists({ verbose = false } = {}) {
  if (!game.user?.isGM) return { deleted: 0, groups: 0, skippedMissing: 0, details: [] };

  const groups = new Map();
  for (const item of game.items.filter((candidate) => candidate.type === "spell-list")) {
    const key = spellListSignature(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  let deleted = 0;
  let duplicateGroups = 0;
  let skippedMissing = 0;
  const details = [];

  for (const [signature, originalGroup] of groups.entries()) {
    // Work from live documents only. A prior synchronization pass may already have
    // deleted one of the documents which was present when the group was assembled.
    const group = originalGroup
      .map((item) => game.items.get(item.id))
      .filter(Boolean);
    if (group.length < 2) continue;
    duplicateGroups += 1;

    // Prefer a native RMU Compendium import over a MERP-UI mirror. Otherwise keep
    // the oldest document, which is the least surprising choice for existing worlds.
    group.sort((a, b) => {
      const aNative = Boolean(a._stats?.compendiumSource) && a.getFlag?.(MODULE_ID, "collection") !== "merp-rmu";
      const bNative = Boolean(b._stats?.compendiumSource) && b.getFlag?.(MODULE_ID, "collection") !== "merp-rmu";
      if (aNative !== bNative) return aNative ? -1 : 1;
      return Number(a._stats?.createdTime ?? 0) - Number(b._stats?.createdTime ?? 0);
    });

    const keeper = group[0];
    const removed = [];
    for (const extra of group.slice(1)) {
      const live = game.items.get(extra.id);
      if (!live) {
        skippedMissing += 1;
        continue;
      }
      try {
        await live.delete({ merpUiSpellListDeduplication: true });
        deleted += 1;
        removed.push(extra.id);
      } catch (error) {
        // Foundry v14 may report a stale world Item during a migration if another
        // synchronization step removed it milliseconds earlier. Missing documents
        // are safe to ignore; other errors are surfaced without aborting all groups.
        if (!game.items.get(extra.id)) {
          skippedMissing += 1;
          console.debug(`${MODULE_ID} | Liste déjà supprimée pendant le dédoublonnage : ${extra.id}`);
        } else {
          console.warn(`${MODULE_ID} | Impossible de supprimer le doublon de liste ${extra.name} (${extra.id})`, error);
        }
      }
    }

    if (removed.length || verbose) {
      details.push({
        signature,
        name: keeper.name,
        kept: keeper.id,
        removed,
        profession: keeper.system?.profession ?? "",
        listType: keeper.system?.listType ?? "",
        realms: keeper.system?.realms ?? ""
      });
    }
  }

  const result = { deleted, groups: duplicateGroups, skippedMissing, details };
  if (verbose) console.table(details.map((entry) => ({
    name: entry.name,
    listType: entry.listType,
    profession: entry.profession,
    realms: entry.realms,
    kept: entry.kept,
    removed: entry.removed.join(", ")
  })));
  return result;
}


async function upsertConfiguredNativeSpellLists(defs, folders) {
  const results = [];
  if (!defs?.length) return results;

  const { pack, index } = await getRmuCompendiumIndex("rmu-spell-law.spell-lists", [
    "name", "type", "system.profession", "system.realms", "system.listType"
  ]);
  if (!pack) {
    console.warn(`${MODULE_ID} | Compendium RMU Spell Law introuvable; listes RMU natives ignorées.`);
    return results;
  }

  for (const def of defs) {
    const folder = folders.get(def.folder);
    if (!folder) throw new Error(`Sous-dossier MERP-RMU inconnu pour liste RMU : ${def.folder}`);

    const hit = index.find((entry) =>
      entry.name === def.name &&
      (!def.sourceProfession || entry.system?.profession === def.sourceProfession)
    ) ?? index.find((entry) => entry.name === def.name);

    if (!hit) {
      console.warn(`${MODULE_ID} | Liste RMU native introuvable : ${def.name}`);
      continue;
    }

    const source = await pack.getDocument(hit._id);
    if (!source) continue;

    // If MERP-RMU uses the native RMU list unchanged (same technical profession
    // and realm), the official Compendium itself is the canonical source. Do not
    // create a world mirror, otherwise RMU displays the same specialization twice.
    const targetProfession = def.targetProfession ?? source.system?.profession;
    const targetRealm = def.realm ?? source.system?.realms;
    const unchangedNative =
      targetProfession === source.system?.profession &&
      targetRealm === source.system?.realms;
    if (unchangedNative) {
      const managed = findManagedItem(def.key);
      if (managed) await managed.delete();
      results.push({ action: "reused-compendium", item: source });
      continue;
    }

    const document = source.toObject();
    delete document._id;
    delete document.folder;
    delete document._stats;
    document.system = foundry.utils.deepClone(document.system ?? {});
    if (def.targetName) {
      document.name = def.targetName;
      document.system.name = def.targetName;
    }
    document.system.profession = def.targetProfession ?? document.system.profession;
    document.system.realms = def.realm ?? document.system.realms;
    document.system.listType = def.targetListType ?? document.system.listType;
    for (const spell of document.system.spells ?? []) {
      spell.profession = def.targetProfession ?? spell.profession;
      spell.listType = document.system.listType ?? spell.listType;
      spell.spellList = document.name;
    }
    document.flags = foundry.utils.mergeObject(document.flags ?? {}, {
      [MODULE_ID]: {
        key: def.key,
        collection: "merp-rmu",
        contentVersion: 1,
        nativeRMU: true,
        source: {
          type: "rmu-native-spell-list",
          reference: source.uuid,
          merpMapping: def.merpMapping ?? "Direct RMU"
        }
      }
    }, { inplace: false, overwrite: true });

    const desiredSignature = spellListSignature(document);
    let equivalents = game.items.filter((item) => item.type === "spell-list" && spellListSignature(item) === desiredSignature);

    // Repeated "Import Compendium" operations can create byte-for-byte identical
    // spell-list Items. They otherwise appear several times in RMU's specialization picker.
    await removeExactImportedSpellListDuplicates(equivalents);
    equivalents = game.items.filter((item) => item.type === "spell-list" && spellListSignature(item) === desiredSignature);

    const managed = findManagedItem(def.key);
    const external = equivalents.find((item) => item.id !== managed?.id && item.getFlag(MODULE_ID, "collection") !== "merp-rmu");

    // If the user already imported the native RMU list into the world, use that copy.
    // Our managed mirror is only a fallback for worlds where Spell Law has not been imported.
    if (external) {
      if (managed) await managed.delete();
      results.push({ action: "reused", item: external });
      continue;
    }

    results.push(await upsertManagedItem({ key: def.key, document }, folder));
  }

  return results;
}

async function upsertConfiguredNativeProfessions(defs, folders) {
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
    const merged = foundry.utils.mergeObject(document, overrides, { inplace: false, overwrite: true, recursive: true });
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

function nonRmuSpellListEntries(data) {
  return (data.spellLists ?? data.items ?? []).filter((entry) =>
    entry.document?.type === "spell-list" &&
    entry.document?.flags?.[MODULE_ID]?.nativeRMU === false
  );
}

async function removeNonRmuWorldSpellListMirrors(data, { verbose = false } = {}) {
  if (!game.user?.isGM) return { deleted: 0, details: [] };

  const keys = new Set(nonRmuSpellListEntries(data).map((entry) => entry.key));
  const candidates = game.items.filter((item) =>
    item.type === "spell-list" &&
    item.getFlag(MODULE_ID, "collection") === "merp-rmu" &&
    keys.has(item.getFlag(MODULE_ID, "key"))
  );

  const details = candidates.map((item) => ({
    name: item.name,
    id: item.id,
    profession: item.system?.profession ?? "",
    listType: item.system?.listType ?? "",
    realms: item.system?.realms ?? ""
  }));

  if (candidates.length) {
    await Item.deleteDocuments(candidates.map((item) => item.id), { merpUiNonRmuMirrorCleanup: true });
  }
  if (verbose && details.length) console.table(details);
  return { deleted: candidates.length, details };
}

async function syncNonRmuSpellListPack(data, { force = false } = {}) {
  if (!game.user?.isGM || game.system?.id !== "rmu") return { skipped: true, reason: "not-gm-or-rmu" };
  const packData = await loadNonRmuSpellListData();
  let pack = game.packs.get(NON_RMU_PACK_ID);
  if (!pack) {
    const CompendiumCollectionClass = foundry?.documents?.collections?.CompendiumCollection ?? globalThis.CompendiumCollection;
    if (!CompendiumCollectionClass?.createCompendium) {
      return { skipped: true, reason: "compendium-api-unavailable" };
    }
    pack = await CompendiumCollectionClass.createCompendium({
      type: "Item",
      label: "MERP-RMU — Listes de Sorts",
      name: "merp-rmu-spell-lists",
      package: "world",
      system: "rmu"
    });
  }
  if (!pack) return { skipped: true, reason: "pack-create-failed" };

  const targetVersion = Number(data.schemaVersion || 1);
  const installedVersion = Number(game.settings.get(MODULE_ID, NON_RMU_PACK_SETTING) || 0);
  if (!force && installedVersion >= targetVersion) return { skipped: true, reason: "already-current", version: installedVersion };

  const wasLocked = pack.locked;
  await pack.configure({ locked: false });
  try {
    const existing = await pack.getIndex();
    const ids = existing.map((entry) => entry._id);
    if (ids.length) await Item.deleteDocuments(ids, { pack: pack.collection });

    const docs = nonRmuSpellListEntries(packData).map((entry) => {
      const doc = foundry.utils.deepClone(entry.document);
      delete doc.folder;
      delete doc._id;
      doc.flags = foundry.utils.mergeObject(doc.flags ?? {}, {
        [MODULE_ID]: { compendiumManaged: true }
      }, { inplace: false, overwrite: true });
      return doc;
    });
    if (docs.length) await Item.createDocuments(docs, { pack: pack.collection });
    await game.settings.set(MODULE_ID, NON_RMU_PACK_SETTING, targetVersion);
    return { version: targetVersion, count: docs.length };
  } finally {
    if (wasLocked) await pack.configure({ locked: true });
  }
}

async function pruneManagedItems(validKeys) {
  const obsolete = game.items.filter((item) =>
    item.getFlag(MODULE_ID, "collection") === "merp-rmu" &&
    !validKeys.has(item.getFlag(MODULE_ID, "key"))
  );

  if (!obsolete.length) return 0;
  await Item.deleteDocuments(obsolete.map((item) => item.id));
  return obsolete.length;
}

async function pruneManagedJournals(validKeys) {
  const obsolete = game.journal.filter((journal) =>
    journal.getFlag(MODULE_ID, "collection") === "merp-rmu-rules" &&
    !validKeys.has(journal.getFlag(MODULE_ID, "key"))
  );
  if (!obsolete.length) return 0;
  await JournalEntry.deleteDocuments(obsolete.map((journal) => journal.id));
  return obsolete.length;
}

async function deleteEmptyLegacyFolders(root, configuredFolders) {
  const keepIds = new Set([root.id, ...configuredFolders.values()].map((folder) => folder.id));

  function isDescendantOfRoot(folder) {
    let current = folder;
    const visited = new Set();

    while (current && !visited.has(current.id)) {
      if (current.id === root.id) return true;
      visited.add(current.id);
      const parentId = folderParentId(current);
      current = parentId ? game.folders.get(parentId) : null;
    }

    return false;
  }

  let deleted = 0;
  let progressed = true;

  while (progressed) {
    progressed = false;

    const candidates = game.folders
      .filter((folder) =>
        folder.type === "Item" &&
        folder.id !== root.id &&
        !keepIds.has(folder.id) &&
        isDescendantOfRoot(folder)
      )
      .sort((a, b) => (b.depth ?? 0) - (a.depth ?? 0));

    for (const folder of candidates) {
      const hasItems = game.items.some((item) => item.folder?.id === folder.id);
      const hasChildren = game.folders.some((child) => folderParentId(child) === folder.id);

      if (!hasItems && !hasChildren) {
        await folder.delete();
        deleted += 1;
        progressed = true;
      }
    }
  }

  return deleted;
}

export async function installMerpRmuContent({ force = false, notify = true } = {}) {
  if (!game.user?.isGM) return { skipped: true, reason: "not-gm" };
  if (game.system?.id !== "rmu") return { skipped: true, reason: "wrong-system" };

  const data = await loadMerpRmuData();
  const installedVersion = Number(game.settings.get(MODULE_ID, INSTALL_SETTING) || 0);
  const targetVersion = Number(data.schemaVersion || 1);

  if (!force && installedVersion >= targetVersion) {
    return { skipped: true, reason: "already-current", version: installedVersion };
  }

  const root = await ensureItemFolder(ROOT_FOLDER);
  const folderDefs = (data.folders ?? []).map((folder) =>
    typeof folder === "string"
      ? { key: folder, name: folder, parent: null }
      : folder
  );
  const folders = await ensureConfiguredFolders(folderDefs, root, "Item");

  const results = [];
  for (const entry of data.items ?? []) {
    const folder = folders.get(entry.folder);
    if (!folder) throw new Error(`Sous-dossier MERP-RMU inconnu : ${entry.folder}`);
    results.push(await upsertManagedItem(entry, folder));
  }
  const nativeProfessionResults = await upsertConfiguredNativeProfessions(data.rmuNativeProfessions ?? [], folders);
  results.push(...nativeProfessionResults);

  // Older MERP-UI versions could leave Profession Items with the editorial
  // content intact but their native RMU mechanical chassis empty. Restore the
  // authoritative chassis explicitly before any Actor can clone the Profession.
  const professionChassis = await forceProfessionChassis({ data, includeEmbedded: true });

  // Profession prose is versioned and migrated independently from mechanical content.
  // Keep official Spell Law lists imported into the world. MERP-RMU needs these
  // editable world copies for profession/list-type adaptations. Duplicate
  // presentation is handled in the RMU creation selector.

  const nativeSpellListResults = await upsertConfiguredNativeSpellLists(data.rmuNativeSpellLists ?? [], folders);
  results.push(...nativeSpellListResults);

  // RMU's findAllSpellLists() aggregates every eligible Item Compendium AND
  // world spell-list Items. Our dedicated MERP-RMU Compendium is therefore
  // already visible in the Add Skill dialog. A world mirror would make every
  // MERP-RMU-only list appear twice (e.g. Nature's Movement/Senses and
  // Nature's Summons), so remove any mirrors created by earlier versions.
  const nonRmuData = await loadNonRmuSpellListData();
  const nonRmuMirrorCleanup = await removeNonRmuWorldSpellListMirrors(nonRmuData);

  // Repeated imports of the RMU Spell Law pack create duplicate world Items.
  // Clean them globally because Open and Closed lists are not part of the
  // profession-specific native list configuration above.
  const spellListDeduplication = await deduplicateWorldSpellLists();
  const deduplicatedSpellLists = spellListDeduplication.deleted;

  const validKeys = new Set([
    ...(data.items ?? []).map((entry) => entry.key),
    ...(data.rmuNativeProfessions ?? []).map((entry) => entry.key),
    ...(data.rmuNativeSpellLists ?? []).map((entry) => entry.key)
  ]);
  const deleted = data.pruneManagedItems ? await pruneManagedItems(validKeys) : 0;
  const deletedFolders = await deleteEmptyLegacyFolders(root, folders);
  const linkedDescriptions = await linkManagedDescriptions();

  let journalResults = [];
  let deletedJournals = 0;
  let linkedJournalPages = 0;
  if ((data.journals ?? []).length || (data.journalFolders ?? []).length) {
    const journalRoot = await ensureJournalFolder("Règles MERP - RMU");
    const journalFolderDefs = (data.journalFolders ?? []).map((folder) =>
      typeof folder === "string" ? { key: folder, name: folder, parent: null } : folder
    );
    const journalFolders = await ensureConfiguredFolders(journalFolderDefs, journalRoot, "JournalEntry");
    for (const entry of data.journals ?? []) {
      const folder = entry.folder ? journalFolders.get(entry.folder) : journalRoot;
      if (!folder) throw new Error(`Sous-dossier de Journal MERP-RMU inconnu : ${entry.folder}`);
      journalResults.push(await upsertManagedJournal(entry, folder));
    }
    const validJournalKeys = new Set((data.journals ?? []).map((entry) => entry.key));
    deletedJournals = data.pruneManagedJournals ? await pruneManagedJournals(validJournalKeys) : 0;
    linkedJournalPages = await linkManagedJournalPages();
  }

  const repairedActorProfessions = await repairActorProfessionTechnicalKeys();
  await game.settings.set(MODULE_ID, INSTALL_SETTING, targetVersion);
  const compendium = await syncNonRmuSpellListPack(data, { force });

  const summary = {
    version: targetVersion,
    created: results.filter((result) => result.action === "created").length,
    updated: results.filter((result) => result.action === "updated").length,
    deleted,
    deletedFolders,
    linkedDescriptions,
    journalCreated: journalResults.filter((result) => result.action === "created").length,
    journalUpdated: journalResults.filter((result) => result.action === "updated").length,
    deletedJournals,
    linkedJournalPages,
    repairedActorProfessions,
    professionChassis,
    removedNonRmuWorldMirrors: nonRmuMirrorCleanup.deleted,
    nonRmuMirrorCleanup,
    deduplicatedSpellLists,
    spellListDeduplication,
    compendium,
    itemNames: results.map((result) => result.item.name),
    journalNames: journalResults.map((result) => result.journal.name)
  };

  if (notify) {
    ui.notifications.info(
      `MERP UI : contenu MERP-RMU installé (${summary.created} créé(s), ${summary.updated} mis à jour, ${summary.linkedDescriptions} description(s) liée(s), ${summary.deleted} ancien(s) supprimé(s), ${summary.deletedFolders} dossier(s) obsolète(s) nettoyé(s)).`
    );
  }

  return summary;
}

Hooks.once("init", () => {
  exposeRmuAdapterApi();
  installMerpSpecialPowerSkillTranslations();
  registerMerpRmuTalentsFlawsSetting();
  registerMerpRmuLegacyMigrationSetting();
  game.settings.register(MODULE_ID, INSTALL_SETTING, {
    name: "Version des données MERP-RMU",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });
  game.settings.register(MODULE_ID, NON_RMU_PACK_SETTING, {
    name: "Version du compendium de Listes MERP-RMU",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });
  game.settings.register(MODULE_ID, PROFESSION_DESCRIPTION_SETTING, {
    name: "Version éditoriale des descriptions de Professions MERP-RMU",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });
  game.settings.register(MODULE_ID, PROFESSION_CHASSIS_INTEGRITY_SETTING, {
    name: "Version de réparation du châssis des Professions MERP-RMU",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });
  game.settings.register(MODULE_ID, MERP_SPECIAL_POWER_SKILLS_SETTING, {
    name: "Version des Compétences MERP spéciales de Manipulation de la Puissance",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });
  game.settings.register(MODULE_ID, MERP_INTRODUCTION_SETTING, {
    name: "Version de l’introduction MERP-RMU",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });
  game.settings.register(MODULE_ID, MERP_HERBS_SETTING, {
    name: "Version du catalogue d’Herbes MERP-RMU",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });
});


Hooks.once("ready", async () => {
  if (game.system?.id !== "rmu") return;
  installMerpPrimeStatHelper();
  await installRmuCreationPrototypeFixes();
  await installMerpSpecialPowerManeuverResults();
});

Hooks.once("ready", async () => {
  if (!game.user?.isGM || game.system?.id !== "rmu") return;

  try {
    // Historical repairs are versioned and run only once per world.
    const legacyMigrations = await runMerpRmuLegacyMigrations({
      cleanupStartlight: cleanupInvalidStartlightArtifacts
    });
    const result = await installMerpRmuContent();
    result.legacyMigrations = legacyMigrations;
    // Isolated installers: they never increment or invoke the main MERP-RMU schema.
    result.specialPowerSkills = await installMerpSpecialPowerSkills({ notify: false });
    result.specialPowerActorSync = await syncMerpSpecialPowerSkillsAllActors({ notify: false });
    result.talentsFlawsV2 = await installMerpRmuTalentsFlaws({ notify: false });

    // One-time integrity repair for worlds that were affected by the old
    // description migration. This restores only the authoritative RMU chassis.
    const chassisTarget = 2;
    const chassisInstalled = Number(game.settings.get(MODULE_ID, PROFESSION_CHASSIS_INTEGRITY_SETTING) || 0);
    if (chassisInstalled < chassisTarget) {
      result.professionChassisIntegrity = await forceProfessionChassis({ notify: false, includeEmbedded: true });
      await game.settings.set(MODULE_ID, PROFESSION_CHASSIS_INTEGRITY_SETTING, chassisTarget);
    } else {
      result.professionChassisIntegrity = { skipped: true, reason: "already-current", version: chassisInstalled };
    }

    // Editorial descriptions have their own version and never invoke the full
    // MERP-RMU installer. Future prose/layout changes are therefore mechanically inert.
    const descriptionData = await loadProfessionDescriptionData();
    const descriptionTarget = Number(descriptionData?.version || 1);
    const descriptionInstalled = Number(game.settings.get(MODULE_ID, PROFESSION_DESCRIPTION_SETTING) || 0);
    if (descriptionInstalled < descriptionTarget) {
      result.professionDescriptions = await forceProfessionDescriptions({ notify: false });
      await game.settings.set(MODULE_ID, PROFESSION_DESCRIPTION_SETTING, descriptionTarget);
    } else {
      result.professionDescriptions = { skipped: true, reason: "already-current", version: descriptionInstalled };
    }

    console.log(`${MODULE_ID} | MERP-RMU`, result);
  } catch (error) {
    console.error(`${MODULE_ID} | Échec de l’installation des données MERP-RMU`, error);
    ui.notifications.error(
      "MERP UI : impossible d’installer les données MERP-RMU. Consultez la console F12."
    );
  }

  try {
    await installMerpRmuIntroduction({ notify: false });
  } catch (error) {
    console.error(`${MODULE_ID} | Échec de l’installation de l’introduction MERP-RMU`, error);
    ui.notifications.error("MERP UI : impossible d’installer l’introduction MERP-RMU. Consultez la console F12.");
  }

  try {
    await installMerpRmuHerbs({ notify: false });
  } catch (error) {
    console.error(`${MODULE_ID} | Échec de l’installation du catalogue d’herbes`, error);
    ui.notifications.error("MERP UI : impossible d’installer le catalogue d’herbes. Consultez la console F12.");
  }

  try {
    await hideManagedMerpRmuJournalPageTitles({ notify: false });
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible de normaliser l’affichage des titres de pages MERP-RMU`, error);
  }
});

Hooks.on("createItem", async (item, options) => {
  if (options?.merpUiProfessionNormalization || options?.merpUiProfessionChassisRestore ||
      options?.merpUiStartlightCleanup || options?.merpUiSpecialPowerSkillSync) return;
  try {
    // Reject the historical Startlight typo immediately on world spell-list Items.
    // Official Spell Law world copies are otherwise retained intentionally.
    if (!item.parent && !item.pack && !item.inCompendium && item.type === "spell-list") {
      if (isInvalidStartlightName(item.name)) {
        await item.delete({ merpUiStartlightCleanup: true });
        console.info(`${MODULE_ID} | Liste erronée supprimée immédiatement : ${item.name}`);
        return;
      }
    }

    if (item.type === "profession") {
      await normalizeEmbeddedProfessionTechnicalKey(item);
    } else if (item.type === "culture") {
      if (item.parent?.documentName === "Actor") await syncMerpSpecialPowerSkillsForActor(item.parent);
    } else if (item.type === "race" && item.parent?.documentName === "Actor") {
      await syncMerpSpecialPowerSkillsForActor(item.parent);
    }
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible de normaliser/nettoyer l’Item créé`, error);
  }
});

Hooks.on("updateItem", async (item, changes, options) => {
  if (options?.merpUiProfessionNormalization || options?.merpUiProfessionChassisRestore ||
options?.merpUiSpecialPowerSkillSync) return;
  if (!item.parent || item.parent.documentName !== "Actor") return;

  try {
    if (item.type === "profession") {
      await normalizeEmbeddedProfessionTechnicalKey(item);
    } else if (item.type === "culture") {
      await syncMerpSpecialPowerSkillsForActor(item.parent);
    } else if (item.type === "race") {
      await syncMerpSpecialPowerSkillsForActor(item.parent);
    }
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible de normaliser l’Item embarqué`, error);
  }
});


Hooks.on("deleteItem", async (item, options) => {
  if (options?.merpUiSpecialPowerSkillSync) return;
  const actor = item?.parent;
  if (!actor || actor.documentName !== "Actor" || !["race", "culture"].includes(item.type)) return;
  queueMicrotask(() => syncMerpSpecialPowerSkillsForActor(actor).catch((error) =>
    console.warn(`${MODULE_ID} | Impossible de synchroniser les Chants après suppression Race/Culture`, error)
  ));
});


function actorCreationProfession(actor) {
  if (!actor || actor.documentName !== "Actor") return null;
  // During RMU character creation, system._profession is not guaranteed to be
  // prepared yet, while the selected profession Item is already embedded.
  // Prefer that real Item so MERP prime stats work from the moment the
  // profession has been selected.
  const embedded = [...(actor.items ?? [])].find((item) => item.type === "profession");
  if (embedded) {
    return {
      name: embedded.name,
      profession: embedded.system?.profession ?? embedded.name
    };
  }
  return actor.system?._profession ?? null;
}

function fixMerpPrimeStatsInCreation(app) {
  const actor = app?.actor ?? app?.document ?? null;
  if (!actor || actor.documentName !== "Actor") return 0;
  const system = actor.system;
  const custom = merpPrimeStatsForProfession(actorCreationProfession(actor));
  if (!custom) return 0;

  const block = system?._creation?.stats?.boostedStatBlock;
  if (block) {
    for (const [shortName, stat] of Object.entries(block)) {
      if (stat && typeof stat === "object") stat.recommended = custom.includes(shortName);
    }
  }

  const root = app?.element?.[0] ?? app?.element;
  if (!(root instanceof HTMLElement)) return 0;
  let changed = 0;
  for (const row of root.querySelectorAll('[data-rmu-stat-short-name]')) {
    const shortName = row.dataset.rmuStatShortName;
    // RMU puts data-rmu-stat-short-name directly on the <td> itself.
    // Previous MERP-UI versions incorrectly searched for a nested <td>, so
    // the prime-stat markers were never changed.
    const cell = row.matches?.('td') ? row : row.querySelector?.('td');
    if (!cell) continue;
    const marker = cell.querySelector('.rmu-suggested-stat-marker');
    const wanted = custom.includes(shortName);
    if (!wanted && marker) { marker.remove(); changed += 1; }
    if (wanted && !marker) {
      const span = document.createElement('span');
      span.className = 'rmu-suggested-stat-marker';
      span.dataset.tooltip = game.i18n.localize('RMU.Tips.SuggestedStatForProfession');
      span.innerHTML = '<i class="rmu-mdi rmu-mdi-asterisk"></i>';
      cell.append(span);
      changed += 1;
    }
  }
  return changed;
}


function isInvalidStartlightName(value) {
  const key = normalizedSpellListIdentity(value);
  return key === "startlight" || key === "startlights";
}

async function cleanupInvalidStartlightArtifacts({ verbose = false } = {}) {
  if (!game.user?.isGM || game.system?.id !== "rmu") return { deletedWorld: 0, deletedPack: 0, deletedEmbedded: 0 };

  let deletedWorld = 0;
  let deletedPack = 0;
  let deletedEmbedded = 0;

  const worldItems = game.items.filter((item) =>
    item.type === "spell-list" && isInvalidStartlightName(item.name)
  );
  if (worldItems.length) {
    await Item.deleteDocuments(worldItems.map((item) => item.id), { merpUiStartlightCleanup: true });
    deletedWorld = worldItems.length;
  }

  for (const actor of game.actors ?? []) {
    const bad = [...(actor.items ?? [])].filter((item) =>
      item.type === "skill" &&
      item.name === "Base Spell List" &&
      isInvalidStartlightName(item.system?.specialization ?? item.system?.spellListName)
    );
    if (bad.length) {
      await actor.deleteEmbeddedDocuments("Item", bad.map((item) => item.id), { merpUiStartlightCleanup: true });
      deletedEmbedded += bad.length;
    }
  }

  for (const pack of game.packs ?? []) {
    if (pack.documentName !== "Item") continue;
    let index;
    try { index = await pack.getIndex({ fields: ["name", "type"] }); } catch (_) { continue; }
    const badIds = index
      .filter((entry) => entry.type === "spell-list" && isInvalidStartlightName(entry.name))
      .map((entry) => entry._id);
    if (!badIds.length) continue;
    if (pack.metadata?.packageType !== "world" && pack.metadata?.packageName !== "world") continue;
    const wasLocked = pack.locked;
    try {
      if (wasLocked) await pack.configure({ locked: false });
      await Item.deleteDocuments(badIds, { pack: pack.collection, merpUiStartlightCleanup: true });
      deletedPack += badIds.length;
    } catch (error) {
      console.warn(`${MODULE_ID} | Impossible de supprimer STARTLIGHT du Compendium ${pack.collection}`, error);
    } finally {
      if (wasLocked) { try { await pack.configure({ locked: true }); } catch (_) {} }
    }
  }

  if (verbose && (deletedWorld || deletedPack || deletedEmbedded)) {
    console.info(`${MODULE_ID} | Nettoyage STARTLIGHT`, { deletedWorld, deletedPack, deletedEmbedded });
  }
  return { deletedWorld, deletedPack, deletedEmbedded };
}

function embeddedSpellListIdentity(itemLike) {
  const sys = itemLike?.system ?? itemLike?._source?.system ?? {};
  const uuid = sys.spellListUuid ?? sys.spellListUUID ?? sys.spellList?.uuid ?? "";
  const specialization = sys.specialization ?? sys.spellListName ?? "";
  return {
    uuid: String(uuid ?? "").trim(),
    name: normalizedSpellListIdentity(specialization)
  };
}


registerCreationRestrictionHooks({
  specialSkillKey: merpSpecialSkillKey,
  specialSkillKeys: MERP_SPECIAL_POWER_SKILL_KEYS,
  specialSkillAllowed: merpSpecialPowerSkillAllowed,
  embeddedSpellListIdentity,
  isInvalidStartlightName
});

function filterInvalidSpellListsFromGroups(groups) {
  if (!Array.isArray(groups)) return groups;

  // RMU may reuse these selector groups between dialog instances.  Always
  // filter a clone so MERP-UI never mutates RMU's cached selector state.
  groups = foundry.utils.deepClone(groups);

  for (const group of groups) {
    if (group?.profession === "Soigneur" && group?.realms === "Mentalism") {
      group.groupName = "Soigneur";
    } else if (group?.profession === "Kekhavra" && String(group?.realms ?? "").includes(",")) {
      group.groupName = "Kekhavra — Hybride Théurgie/Mentalisme";
    } else if (group?.profession === "Sorcier") {
      group.groupName = "Sorcier — Hybride Essence/Théurgie";
    } else if (group?.profession === "Vracara") {
      group.groupName = "Vracara — Hybride Mentalisme/Théurgie";
    } else if (group?.profession === "Wegech") {
      group.groupName = "Wegech — Hybride Théurgie/Essence";
    } else if (group?.profession === "Drughân") {
      group.groupName = "Drughân — Semi-magique de Théurgie";
    } else if (group?.profession === "Herutano") {
      group.groupName = "Herutano";
    }

    if (!Array.isArray(group?.spellLists)) continue;
    const seen = new Set();
    group.spellLists = group.spellLists.filter((spellList) => {
      const name = spellList?.name ?? spellList?.system?.name ?? "";
      if (isInvalidStartlightName(name)) return false;

      const key = normalizedSpellListIdentity(name);
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return groups.filter((group) => Array.isArray(group?.spellLists) && group.spellLists.length > 0);
}


function normalizeCombatTrainingName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ");
}

function combatTrainingIdentity(itemOrSkill) {
  const sys = itemOrSkill?.system ?? itemOrSkill ?? {};
  const category = sys.category ?? itemOrSkill?.category ?? "";
  const name = sys.name ?? itemOrSkill?.name ?? "";
  const trainingGroup = sys.trainingGroup ?? itemOrSkill?.trainingGroup ?? "";
  return {
    category: normalizeCombatTrainingName(category),
    name: normalizeCombatTrainingName(name),
    trainingGroup: normalizeCombatTrainingName(trainingGroup),
  };
}

function usedCombatTrainingSpecializations(actor, selectedSkill, editSkillId = null) {
  if (!actor?.items || !selectedSkill) return { standard: new Set(), exotic: new Set() };

  const wanted = combatTrainingIdentity(selectedSkill);
  const standard = new Set();
  const exotic = new Set();

  for (const item of Array.from(actor.items)) {
    if (item?.type !== "skill" || item?.id === editSkillId) continue;
    const got = combatTrainingIdentity(item);
    if (got.category !== "combat training") continue;

    // Match primarily on the concrete skill name (Melee Weapons / Ranged Weapons).
    // trainingGroup is used only when both sides actually expose one; this avoids
    // missing skills during character creation where RMU's prepared Item may not
    // yet carry exactly the same trainingGroup representation as the compendium.
    if (got.name !== wanted.name) continue;
    if (got.trainingGroup && wanted.trainingGroup && got.trainingGroup !== wanted.trainingGroup) continue;

    const specialization = item.system?.specialization;
    if (!specialization || specialization === "tbd") continue;
    (item.system?.isExotic ? exotic : standard).add(String(specialization));
  }

  return { standard, exotic };
}

function filterCombatTrainingSkillOptions(skill, actor, editSkillId = null) {
  if (!skill) return skill;
  const identity = combatTrainingIdentity(skill);
  if (identity.category !== "combat training") return skill;
  if (!["melee weapons", "ranged weapons"].includes(identity.name)) return skill;

  const used = usedCombatTrainingSpecializations(actor, skill, editSkillId);
  if (Array.isArray(skill.options)) {
    skill.options = skill.options.filter((option) => option === "Exotic" || !used.standard.has(String(option)));
  }
  if (Array.isArray(skill.specializations)) {
    skill.specializations = skill.specializations.filter((option) => option === "Exotic" || !used.standard.has(String(option)));
  }
  if (Array.isArray(skill.exotics)) {
    skill.exotics = skill.exotics.filter((option) => !used.exotic.has(String(option)));
  }
  return skill;
}

function filterAlreadyChosenCombatTrainingSpecializations(result, actor, editSkillId = null) {
  if (!result || !Array.isArray(result.groups)) return result;
  for (const group of result.groups) {
    if (!Array.isArray(group?.skills)) continue;
    for (const skill of group.skills) filterCombatTrainingSkillOptions(skill, actor, editSkillId);
    group.skills = group.skills.filter((skill) => {
      const identity = combatTrainingIdentity(skill);
      if (identity.category !== "combat training") return true;
      if (!["melee weapons", "ranged weapons"].includes(identity.name)) return true;
      return !skill.fixedSpecializations || (skill.options?.length ?? skill.specializations?.length ?? 0) > 0;
    });
  }
  result.groups = result.groups.filter((group) => Array.isArray(group?.skills) && group.skills.length > 0);
  return result;
}

function normalizeSpecializationAlias(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function specializationAliases(value) {
  const aliases = new Set();
  const raw = String(value ?? "").trim();
  if (!raw) return aliases;
  aliases.add(normalizeSpecializationAlias(raw));
  try {
    const localized = game.i18n.localize(`RMU.Specializations.${raw}`);
    if (localized && !localized.startsWith("RMU.Specializations.")) {
      aliases.add(normalizeSpecializationAlias(localized));
    }
  } catch (_) {}
  return aliases;
}

function cultureElectionCombatSpecializations(app, skill) {
  const used = new Set();
  const wantedName = normalizeCombatTrainingName(skill?.name);
  const wantedCategory = normalizeCombatTrainingName(skill?.category);
  if (wantedCategory !== "combat training" || !["melee weapons", "ranged weapons"].includes(wantedName)) return used;

  const addElection = (election) => {
    if (!election || typeof election !== "object") return;
    if (normalizeCombatTrainingName(election.skillCategory) !== "combat training") return;
    if (normalizeCombatTrainingName(election.skillName) !== wantedName) return;
    const value = election.exotic ?? election.specialization;
    for (const alias of specializationAliases(value)) if (alias) used.add(alias);
  };

  // Current culture pool. This is where RMU keeps choices while the character is
  // still in the Culture Skills creation step; they are not Actor Items yet.
  for (const election of app?._cultureGroup?.elections ?? []) addElection(election);

  // Also scan every culture election group defensively.
  const elections = app?._actor?.system?._culture?.elections;
  if (elections && typeof elections === "object") {
    for (const value of Object.values(elections)) {
      for (const election of value?.elections ?? []) addElection(election);
    }
  }
  return used;
}

function filterCultureCombatTrainingSkill(skill, app) {
  if (!skill) return skill;
  const identity = combatTrainingIdentity(skill);
  if (identity.category !== "combat training" || !["melee weapons", "ranged weapons"].includes(identity.name)) return skill;

  const used = cultureElectionCombatSpecializations(app, skill);
  if (!used.size) return skill;
  const isUsed = (option) => {
    if (option === "Exotic") return false;
    for (const alias of specializationAliases(option)) if (used.has(alias)) return true;
    return false;
  };
  if (Array.isArray(skill.options)) skill.options = skill.options.filter((option) => !isUsed(option));
  if (Array.isArray(skill.specializations)) skill.specializations = skill.specializations.filter((option) => !isUsed(option));
  return skill;
}

function filterCultureCombatTrainingOptions(result, app) {
  const skills = result?.skills;
  if (!skills || !Array.isArray(skills.categories)) return result;
  for (const category of skills.categories) {
    if (!Array.isArray(skills[category])) continue;
    for (const skill of skills[category]) filterCultureCombatTrainingSkill(skill, app);
    skills[category] = skills[category].filter((skill) => {
      const id = combatTrainingIdentity(skill);
      if (id.category !== "combat training" || !["melee weapons", "ranged weapons"].includes(id.name)) return true;
      return !skill.fixedSpecializations || (skill.options?.length ?? 0) > 0;
    });
  }
  skills.categories = skills.categories.filter((category) => Array.isArray(skills[category]) && skills[category].length > 0);
  return result;
}


// ---------------------------------------------------------------------------
// MERP-specific Power Manipulation skills (isolated from the main MERP-RMU
// schema installer so adding/editing these skills can never rewrite Professions).
// ---------------------------------------------------------------------------
async function loadMerpSpecialPowerSkillData() {
  const response = await fetch(MERP_SPECIAL_POWER_SKILLS_PATH, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${MERP_SPECIAL_POWER_SKILLS_PATH}: ${response.status}`);
  return response.json();
}

function merpSpecialSkillKey(item) {
  return item?.getFlag?.(MODULE_ID, "key") ?? item?.flags?.[MODULE_ID]?.key ?? null;
}

function merpActorRaceName(actor) {
  return [...(actor?.items ?? [])].find((item) => item.type === "race")?.name ?? "";
}

function merpActorCultureName(actor) {
  return [...(actor?.items ?? [])].find((item) => item.type === "culture")?.name ?? "";
}

function isMerpElfActor(actor) {
  return /elf|elfe|quendi/i.test(merpActorRaceName(actor));
}

function merpSpecialPowerSkillAllowed(actor, itemOrKey) {
  const key = typeof itemOrKey === "string" ? itemOrKey : merpSpecialSkillKey(itemOrKey);
  if (!MERP_SPECIAL_POWER_SKILL_KEYS.has(key)) return true;
  if (key === "yavannas-song") {
    const culture = merpActorCultureName(actor);
    return /(^|\b)sindar(\b|$)|elfes?\s+sylvains?|silvan|sylvan/i.test(culture);
  }
  return isMerpElfActor(actor);
}

async function installMerpSpecialPowerSkills({ force = false, notify = false } = {}) {
  if (!game.user?.isGM || game.system?.id !== "rmu") return { skipped: true, reason: "not-gm-or-rmu" };
  const data = await loadMerpSpecialPowerSkillData();
  const target = Number(data?.version || 1);
  const installed = Number(game.settings.get(MODULE_ID, MERP_SPECIAL_POWER_SKILLS_SETTING) || 0);

  // Do not trust the version setting alone. Versions 1.2.107-1.2.109 could
  // leave six standalone Healing Songs Items in the world while already
  // marking the special-skill data as current. The native-style + selector
  // requires one canonical blank-specialization parent Item.
  const worldSkills = game.items?.contents ?? [];
  const canonicalHealingPresent = worldSkills.some((item) =>
    item.type === "skill" &&
    merpSpecialSkillKey(item) === "healing-songs" &&
    String(item.system?.specialization ?? "").trim() === ""
  );
  const canonicalYavannaPresent = worldSkills.some((item) =>
    item.type === "skill" && merpSpecialSkillKey(item) === "yavannas-song"
  );
  const canonicalSetComplete = canonicalHealingPresent && canonicalYavannaPresent;
  if (!force && installed >= target && canonicalSetComplete) {
    return { skipped: true, reason: "already-current", version: installed };
  }

  const root = await ensureItemFolder(ROOT_FOLDER);
  const folder = await ensureItemFolder(data?.folder || "Skills", root);
  const details = [];

  for (const entry of data?.items ?? []) {
    const key = entry?.key;
    const doc = foundry.utils.deepClone(entry?.document ?? {});
    if (!key || doc?.type !== "skill") continue;
    doc.flags ??= {};
    doc.flags[MODULE_ID] ??= {};
    doc.flags[MODULE_ID].key = key;
    doc.flags[MODULE_ID].collection = "merp-special-power-skills";
    doc.folder = folder.id;

    // Prefer the stable MERP key.  Healing Songs deliberately share the same
    // Skill name and differ only by specialization, exactly like Melee Weapons
    // (Blade, Chain, etc.), so a name-only fallback would collapse all six.
    let item = (game.items?.contents ?? []).find((candidate) =>
      candidate.type === "skill" && candidate.getFlag?.(MODULE_ID, "key") === key
    );
    if (!item) {
      const wantedSpec = String(doc.system?.specialization ?? "");
      item = (game.items?.contents ?? []).find((candidate) =>
        candidate.type === "skill" &&
        candidate.name === doc.name &&
        candidate.system?.category === "Power Manipulation" &&
        String(candidate.system?.specialization ?? "") === wantedSpec
      );
    }

    if (!item) {
      item = await Item.create(doc, { renderSheet: false, merpUiSpecialPowerSkillInstall: true });
      details.push({ key, name: item?.name, action: "created" });
      continue;
    }

    // Dedicated dotted updates only. Never replace the whole system DataModel.
    const update = {
      name: doc.name,
      img: doc.img ?? item.img,
      folder: folder.id,
      "flags.merp-ui.key": key,
      "flags.merp-ui.collection": "merp-special-power-skills"
    };
    for (const [field, value] of Object.entries(doc.system ?? {})) {
      update[`system.${field}`] = foundry.utils.deepClone(value);
    }
    await item.update(update, { render: false, merpUiSpecialPowerSkillInstall: true });
    details.push({ key, name: item.name, action: "updated" });
  }

  // Remove only obsolete MERP-UI world templates. Never touch embedded Actor
  // skills here: developed specializations must retain their ranks. The legacy
  // templates are the six pre-parent Healing Songs definitions from 1.2.107-109.
  const legacyKeys = new Set([
    "healing-song-blood",
    "healing-song-bone",
    "healing-song-sensory",
    "healing-song-muscle",
    "healing-song-cleansing",
    "healing-song-strengthening"
  ]);
  const canonicalParents = (game.items?.contents ?? []).filter((item) =>
    item.type === "skill" &&
    merpSpecialSkillKey(item) === "healing-songs" &&
    String(item.system?.specialization ?? "").trim() === ""
  );
  const keepParentId = canonicalParents[0]?.id ?? null;
  const obsoleteWorldItems = (game.items?.contents ?? []).filter((item) => {
    if (item.type !== "skill") return false;
    const collection = item.getFlag?.(MODULE_ID, "collection") ?? item.flags?.[MODULE_ID]?.collection;
    if (collection !== "merp-special-power-skills") return false;
    const key = merpSpecialSkillKey(item);
    if (legacyKeys.has(key)) return true;
    // Also clean duplicate/non-parent items carrying the new shared key.
    if (key === "healing-songs") {
      const spec = String(item.system?.specialization ?? "").trim();
      return spec !== "" || (keepParentId && item.id !== keepParentId);
    }
    return false;
  });
  if (obsoleteWorldItems.length) {
    await Item.deleteDocuments(obsoleteWorldItems.map((item) => item.id), {
      render: false,
      merpUiSpecialPowerSkillInstall: true
    });
    for (const item of obsoleteWorldItems) {
      details.push({ key: merpSpecialSkillKey(item), name: item.name, action: "legacy-world-template-removed" });
    }
  }

  await game.settings.set(MODULE_ID, MERP_SPECIAL_POWER_SKILLS_SETTING, target);
  if (notify) ui.notifications.info(`MERP UI : Chants elfiques installés ; ${obsoleteWorldItems.length} ancien(s) modèle(s) Healing Songs nettoyé(s).`);
  return { installed: details.length, expected: 2, removedLegacyWorldItems: obsoleteWorldItems.length, details };
}

function merpSpecialPowerSkillItems(actor) {
  return (game.items?.contents ?? []).filter((item) => {
    const key = merpSpecialSkillKey(item);
    return item.type === "skill" &&
      MERP_SPECIAL_POWER_CANONICAL_KEYS.has(key) &&
      merpSpecialPowerSkillAllowed(actor, item);
  });
}


function merpSpecialSkillTotalRanks(item) {
  const system = item?.system ?? {};
  return Number(system.ranks || 0) + Number(system.cultureRanks || 0) + Number(system.levelUpRanks || 0);
}


function healingSongsSourceItem() {
  return (game.items?.contents ?? []).find((item) =>
    item.type === "skill" && merpSpecialSkillKey(item) === "healing-songs"
  ) ?? null;
}

function prepareHealingSongsPlusControl(context, actor) {
  if (!context?.system?._skillGroups || !actor || !isMerpElfActor(actor)) return false;
  const source = healingSongsSourceItem();
  if (!source) return false;
  let changed = false;
  for (const group of context.system._skillGroups ?? []) {
    for (const skill of group?.skills ?? []) {
      if (String(skill?.name ?? "") !== "Healing Songs") continue;
      if (String(skill?.specialization ?? "").trim() !== "") continue;
      // Make the zero-rank embedded template behave exactly like Directed Spell:
      // one parent row + native RMU add-specialization button.
      skill._undeveloped = true;
      skill._canDevelop = false;
      skill._disableSkillRoll = true;
      skill._originUUID = source.uuid;
      changed = true;
    }
  }
  return changed;
}

function healingSongsDialogOptions(dialog) {
  const sourceDoc = healingSongsSourceItem();
  if (!sourceDoc || !dialog?._actor) return null;
  const sourceSystem = foundry.utils.deepClone(sourceDoc.system ?? {});
  const used = new Set(
    [...(dialog._actor.items ?? [])]
      .filter((item) => item.type === "skill" && String(item.system?.name ?? item.name ?? "") === "Healing Songs")
      .map((item) => String(item.system?.specialization ?? "").trim())
      .filter(Boolean)
  );
  sourceSystem.specializations = (sourceSystem.specializations ?? []).filter((spec) => !used.has(String(spec)));
  sourceSystem.fixedSpecializations = true;
  sourceSystem.hasSpecialization = true;
  const copy = {
    ...sourceSystem,
    sourceSkillUuid: sourceDoc.uuid,
    hasTrainingGroup: false
  };
  return {
    label: "RMU.Dialogs.CultureSkillDialog.Specialization.LabelSkill",
    hint: "RMU.Dialogs.CultureSkillDialog.Specialization.HintSkill",
    groups: typeof dialog._rollup === "function" ? dialog._rollup([copy]) : [{ category: "Power Manipulation", skills: [copy] }]
  };
}

function makeEmbeddedMerpSpecialPowerSkill(source) {
  const doc = source.toObject();
  delete doc._id;
  delete doc.folder;
  delete doc.ownership;
  delete doc.sort;
  delete doc._stats;
  doc.flags ??= {};
  doc.flags[MODULE_ID] ??= {};
  doc.flags[MODULE_ID].autoEmbeddedSpecialPowerSkill = true;
  doc.flags.rmu ??= {};
  doc.flags.rmu.origin = { uuid: source.uuid };
  doc.system ??= {};
  doc.system.ranks = 0;
  doc.system.cultureRanks = 0;
  doc.system.levelUpRanks = 0;
  doc.system.favorite = false;
  return doc;
}

async function syncMerpSpecialPowerSkillsForActor(actor, { notify = false } = {}) {
  if (!actor || actor.documentName !== "Actor" || actor.type !== "Character") {
    return { skipped: true, reason: "not-character" };
  }

  // These Skills are deliberately embedded on eligible Actors because RMU 1.3.5
  // builds its undeveloped-skill catalogue exclusively from the rmu.core Compendium.
  // World Item skills therefore cannot appear on the Character sheet by themselves.
  const desiredSources = merpSpecialPowerSkillItems(actor);
  const desiredKeys = new Set(desiredSources.map(merpSpecialSkillKey));
  const existing = [...(actor.items ?? [])].filter((item) =>
    item.type === "skill" && MERP_SPECIAL_POWER_SKILL_KEYS.has(merpSpecialSkillKey(item))
  );

  const createData = [];
  for (const source of desiredSources) {
    const key = merpSpecialSkillKey(source);
    const wantedSpec = String(source.system?.specialization ?? "").trim();

    // Healing Songs is a parent Skill with specializations.  Learned songs and
    // the zero-rank parent deliberately share the same MERP key, so a key-only
    // duplicate check would incorrectly suppress the parent as soon as any song
    // had been learned.  Identity must include the specialization.
    const duplicateByIdentity = [...(actor.items ?? [])].some((item) =>
      item.type === "skill" &&
      merpSpecialSkillKey(item) === key &&
      item.system?.category === "Power Manipulation" &&
      String(item.system?.specialization ?? "").trim() === wantedSpec
    );
    if (duplicateByIdentity) continue;
    createData.push(makeEmbeddedMerpSpecialPowerSkill(source));
  }

  // Migrate existing 1.2.107/108 standalone Chants in place.  Each Healing
  // Song becomes a specialization of the single Healing Songs Skill while
  // preserving its ranks and all player advancement.
  let migrated = 0;
  for (const source of desiredSources) {
    const key = merpSpecialSkillKey(source);
    const current = existing.find((item) => merpSpecialSkillKey(item) === key);
    if (!current) continue;
    const update = {};
    if (current.name !== source.name) update.name = source.name;
    for (const field of ["name", "category", "trainingGroup", "stat", "description", "specialization", "specializationType", "hasSpecialization", "fixedSpecializations", "specializations", "autoSkill"]) {
      const wanted = foundry.utils.deepClone(source.system?.[field]);
      if (wanted === undefined) continue;
      update[`system.${field}`] = wanted;
    }
    if (Object.keys(update).length) {
      await current.update(update, { render: false, merpUiSpecialPowerSkillSync: true });
      migrated += 1;
    }
  }

  let created = [];
  if (createData.length) {
    created = await actor.createEmbeddedDocuments("Item", createData, {
      render: false,
      merpUiSpecialPowerSkillSync: true
    });
  }

  // If Race/Culture changes during character creation, remove only untouched
  // automatically embedded Skills that are no longer legal. Never delete ranks.
  const removable = existing.filter((item) => {
    if (item.getFlag?.(MODULE_ID, "autoEmbeddedSpecialPowerSkill") !== true) return false;
    if (merpSpecialSkillTotalRanks(item) !== 0) return false;

    const key = merpSpecialSkillKey(item);
    const spec = String(item.system?.specialization ?? "").trim();

    // Remove legacy auto-created zero-rank Healing Songs specializations from
    // 1.2.107-1.2.109.  The single blank-specialization parent now owns the +
    // selector.  Never remove a developed specialization.
    if (key === "healing-songs" && spec !== "") return true;
    return !desiredKeys.has(key);
  });
  if (removable.length) {
    await actor.deleteEmbeddedDocuments("Item", removable.map((item) => item.id), {
      render: false,
      merpUiSpecialPowerSkillSync: true
    });
  }

  if ((created.length || removable.length) && actor.sheet?.rendered) actor.sheet.render(false);
  if (notify) {
    ui.notifications.info(`MERP UI : ${created.length} Chant(s) ajouté(s), ${migrated} migré(s), ${removable.length} retiré(s) sur ${actor.name}.`);
  }
  return {
    actor: actor.name,
    eligible: desiredSources.length,
    created: created.length,
    migrated,
    removed: removable.length
  };
}

async function syncMerpSpecialPowerSkillsAllActors({ notify = false } = {}) {
  const details = [];
  for (const actor of game.actors?.contents ?? []) {
    if (actor.type !== "Character") continue;
    details.push(await syncMerpSpecialPowerSkillsForActor(actor, { notify: false }));
  }
  if (notify) ui.notifications.info(`MERP UI : Chants elfiques synchronisés sur ${details.length} personnage(s).`);
  return { actors: details.length, details };
}

function makeMerpSkillOption(item) {
  const system = foundry.utils.deepClone(item.system ?? {});
  return {
    ...system,
    name: system.name || item.name,
    category: system.category || "Power Manipulation",
    sourceSkillUuid: item.uuid,
    uuid: item.uuid,
    _id: item.id,
    hasTrainingGroup: false,
    options: Array.isArray(system.options) ? system.options : []
  };
}

function pushUniqueMerpSkillOptions(array, additions) {
  if (!Array.isArray(array)) return false;
  const names = new Set(array.map((entry) => String(entry?.name ?? entry?.skillName ?? "").trim().toLocaleLowerCase("fr")));
  let changed = false;
  for (const addition of additions) {
    const name = String(addition?.name ?? "").trim().toLocaleLowerCase("fr");
    if (!name || names.has(name)) continue;
    array.push(foundry.utils.deepClone(addition));
    names.add(name);
    changed = true;
  }
  return changed;
}

function injectMerpSpecialPowerSkills(result, actor, sourceCategory = null) {
  if (!result || !actor) return result;
  const additions = merpSpecialPowerSkillItems(actor).map(makeMerpSkillOption);
  if (!additions.length) return result;

  const visit = (node, inheritedCategory = null, depth = 0) => {
    if (!node || depth > 6) return false;
    let changed = false;

    if (Array.isArray(node)) {
      const isPower = String(inheritedCategory ?? sourceCategory ?? "").toLowerCase() === "power manipulation";

      // RMU uses arrays both for collections of Skill choices and for an
      // individual Skill's specialization values. A specialization array is
      // made of strings and must never receive complete Skill objects.
      const isSpecializationArray = node.some((entry) => typeof entry === "string");

      if (isPower && !isSpecializationArray) {
        changed = pushUniqueMerpSkillOptions(node, additions) || changed;
      }

      for (const entry of node) {
        if (entry && typeof entry === "object") {
          changed = visit(entry, inheritedCategory, depth + 1) || changed;
        }
      }
      return changed;
    }

    if (typeof node !== "object") return false;

    const category = node.category ?? node.skillCategory ?? node.name ?? inheritedCategory;
    const isPower = String(category ?? "").toLowerCase() === "power manipulation";

    const isSkillNode =
      typeof node.name === "string" &&
      typeof node.category === "string" &&
      (
        "stat" in node ||
        "sourceSkillUuid" in node ||
        "specializationType" in node ||
        "hasSpecialization" in node
      );

    for (const key of ["skills", "options", "items", "entries"]) {
      const values = node[key];
      if (!Array.isArray(values) || !isPower) continue;

      // On an individual Skill, `options` is the specialization list even if
      // it is still empty during an early RMU preparation pass.
      if (key === "options" && isSkillNode) continue;

      // Defensive guard for already-populated specialization arrays.
      if (key === "options" && values.some((entry) => typeof entry === "string")) continue;

      changed = pushUniqueMerpSkillOptions(values, additions) || changed;
    }

    for (const [key, value] of Object.entries(node)) {
      if (["skills", "options", "items", "entries"].includes(key)) continue;
      if (value && typeof value === "object") changed = visit(value, category, depth + 1) || changed;
    }
    return changed;
  };

  visit(result, sourceCategory, 0);
  return result;
}

const HEALING_SONG_RESULTS = {
  "Spectacular Failure": "Une dissonance entre dans le chant sans être perçue avant sa conclusion. La puissance curative s’inverse et la maladie ou la blessure s’aggrave, éventuellement jusqu’à mettre la vie du patient en danger. Le chanteur subit également un jet d’Échec de Sort sans modificateur.",
  "Absolute Failure": "Une dissonance rend cette affection impossible à guérir par chant, méditation ou sort. Il faut désormais recourir à une guérison ordinaire ou aux herbes.",
  "Failure": "Cette maladie ou cette blessure dépasse la capacité de ce chanteur. D’autres méthodes ou d’autres chanteurs peuvent être tentés.",
  "Unusual Event": "La combinaison du patient, du chant et des chanteurs produit une magie rare. Le chanteur principal peut interrompre le chant — tous les participants subissent alors un jet sur la table de Force des Échecs de Sort — ou poursuivre, avec des conséquences inhabituelles déterminées par le MJ.",
  "Partial Success": "La guérison s’avère difficile. Choisissez un effet de guérison approprié d’un niveau au plus égal aux rangs de cette Compétence, et non à son bonus, ou laissez le MJ choisir l’effet.",
  "Unusual Success": "Cette combinaison de chanteurs, de patient et de chant guérit et fortifie le patient au-delà de la portée normale de la Compétence ; l’effet exact relève du MJ.",
  "Near Success": "La guérison s’avère difficile. Choisissez un effet de guérison approprié d’un niveau au plus égal à la moitié des rangs de cette Compétence, et non à son bonus, ou laissez le MJ choisir l’effet.",
  "Success": "Le chant réussit. Choisissez un effet de guérison approprié d’un niveau au plus égal aux rangs de cette Compétence, et non à son bonus, ou laissez le MJ choisir l’effet.",
  "Absolute Success": "En tissant des paroles de pouvoir dans le chant, vous guérissez complètement l’affection."
};

const YAVANNA_SONG_RESULTS = {
  "Spectacular Failure": "Une dissonance inverse la puissance de l’herbe : elle agit désormais comme un poison. Un jet réussi de Connaissance des Herbes est nécessaire pour remarquer l’altération.",
  "Blunder": "Une dissonance inverse la puissance de l’herbe : elle agit désormais comme un poison. Un jet réussi de Connaissance des Herbes est nécessaire pour remarquer l’altération.",
  "Absolute Failure": "Une dissonance dissipe la puissance de l’herbe. Un jet réussi de Connaissance des Herbes est nécessaire pour le remarquer.",
  "Failure": "Le chant n’a aucun effet. Un autre chanteur peut tenter sa chance.",
  "Unusual Event": "La combinaison de l’herbe et du chant modifie sa nature d’une manière inhabituelle, déterminée par le MJ. Une Manœuvre réussie d’Herboristerie révèle qu’une altération a eu lieu, sans nécessairement en dévoiler l’effet exact.",
  "Partial Success": "L’herbe se conserve trois fois plus longtemps que normalement.",
  "Unusual Success": "Si l’herbe n’a pas encore été cueillie, elle évolue vers une nouvelle variété déterminée par le MJ et peut se reproduire si elle est cultivée avec soin. Si elle était déjà cueillie, traitez ce résultat comme un Événement Inhabituel.",
  "Near Success": "L’herbe se conserve trois fois plus longtemps et son efficacité est doublée.",
  "Success": "L’herbe se conserve quatre fois plus longtemps et son efficacité est doublée.",
  "Absolute Success": "Les paroles de pouvoir exaltent la vertu naturelle de l’herbe : elle se conserve vingt fois plus longtemps ou double sa vertu immédiate, selon ce qui convient à l’herbe."
};

function merpSpecialManeuverDecision(decision) {
  const text = String(decision ?? "");
  if (/Unusual Event/i.test(text) && /Success/i.test(text)) return "Unusual Success";
  if (/Unusual Event/i.test(text)) return "Unusual Event";
  if (/Blunder/i.test(text)) return "Blunder";
  for (const key of ["Spectacular Failure", "Absolute Failure", "Absolute Success", "Partial Success", "Near Success", "Success", "Failure"]) {
    if (text.includes(key)) return key;
  }
  return text;
}

async function installMerpSpecialPowerManeuverResults() {
  try {
    const route = (path) => foundry?.utils?.getRoute ? foundry.utils.getRoute(path) : `/${path}`;
    const mod = await import(route("systems/rmu/module/rmu/maneuvers/maneuvers.js"));
    const proto = mod?.Maneuver?.prototype;
    if (!proto || proto.__merpUiSpecialPowerResults || typeof proto.resolveManeuver !== "function") return false;
    const original = proto.resolveManeuver;
    proto.resolveManeuver = async function(roll, skill, options) {
      const result = await original.call(this, roll, skill, options);
      const actor = this?._actor;
      const skillName = String(skill?.name ?? skill?.system?.name ?? "");
      const skillSpec = String(skill?.specialization ?? skill?.system?.specialization ?? "");
      const candidates = [...(actor?.items ?? [])].filter((candidate) =>
        candidate.type === "skill" &&
        (String(candidate.system?.name ?? "") === skillName || String(candidate.name ?? "") === skillName)
      );
      const item = (skillSpec && candidates.find((candidate) => String(candidate.system?.specialization ?? "") === skillSpec)) || candidates[0];
      const key = merpSpecialSkillKey(item);
      if (!MERP_SPECIAL_POWER_SKILL_KEYS.has(key)) return result;
      const decision = merpSpecialManeuverDecision(result?.decision);
      const table = key === "yavannas-song" ? YAVANNA_SONG_RESULTS : HEALING_SONG_RESULTS;
      if (table[decision]) {
        result.decision = decision;
        result.description = table[decision];
        result.tableName = key === "yavannas-song" ? "Chant de Yavanna — Table MERP" : "Chants de Guérison — Table MERP";
        result.effects = [];
      }
      return result;
    };
    proto.__merpUiSpecialPowerResults = true;
    return true;
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible d’installer les tables spéciales de chants`, error);
    return false;
  }
}

async function installRmuCreationPrototypeFixes() {
  if (game.system?.id !== "rmu") return false;

  const route = (path) => foundry?.utils?.getRoute ? foundry.utils.getRoute(path) : `/${path}`;
  let changed = false;

  try {
    const mod = await import(route("systems/rmu/module/apps/actor/character-sheet-v2.js"));
    const Cls = mod?.default;
    const proto = Cls?.prototype;
    if (proto && !proto.__merpUiPrimeStatsContextFix && typeof proto._prepareContext === "function") {
      const original = proto._prepareContext;
      proto._prepareContext = async function(...args) {
        const context = await original.apply(this, args);
        try {
          const actor = this?.document ?? context?.actor ?? null;
          const custom = merpPrimeStatsForProfession(actorCreationProfession(actor));
          const block = context?.system?._creation?.stats?.boostedStatBlock;
          if (custom && block) {
            for (const [shortName, stat] of Object.entries(block)) {
              if (stat && typeof stat === "object") {
                stat.recommended = custom.includes(shortName);
              }
            }
          }
          prepareHealingSongsPlusControl(context, actor);
        } catch (error) {
          console.warn(`${MODULE_ID} | Impossible de corriger les Prime Stats dans le contexte de création RMU`, error);
        }
        return context;
      };
      proto.__merpUiPrimeStatsContextFix = true;
      changed = true;
      console.info(`${MODULE_ID} | Correctif global des Prime Stats MERP dans la création RMU installé.`);
    }
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible de patcher CharacterSheetV2RMU pour les Prime Stats`, error);
  }

  try {
    const mod = await import(route("systems/rmu/module/apps/creation/add-untrained-skill-dialog-v2.js"));
    const Cls = mod?.default;
    const proto = Cls?.prototype;
    if (proto && !proto.__merpUiSpellListSourceFix && typeof proto._spellListsForSkill === "function") {
      const original = proto._spellListsForSkill;
      proto._spellListsForSkill = async function(...args) {
        let groups = await original.apply(this, args);
        groups = filterInvalidSpellListsFromGroups(groups);
        groups = filterLimitedBaseSpellListChoices(groups, this?._actor, { excludeId: this?._editSkillId ?? null });
        return groups;
      };
      proto.__merpUiSpellListSourceFix = true;
      changed = true;
      console.info(`${MODULE_ID} | Correctif global du sélecteur de Listes de Sorts RMU installé.`);
    }

    if (proto && !proto.__merpUiCombatTrainingDedupFix && typeof proto._getSkillSelectionOptions === "function") {
      const originalGetOptions = proto._getSkillSelectionOptions;
      proto._getSkillSelectionOptions = async function(...args) {
        const sourceKey = this?._sourceSkillItemData?.flags?.[MODULE_ID]?.key ?? null;
        if (sourceKey === "healing-songs") {
          const special = healingSongsDialogOptions(this);
          if (special) return special;
        }
        let result = await originalGetOptions.apply(this, args);
        result = filterAlreadyChosenCombatTrainingSpecializations(result, this?._actor, this?._editSkillId ?? null);
        const sourceCategory = this?._sourceSkillItemData?.system?.category ?? this?._selectedSkill?.category ?? null;
        return injectMerpSpecialPowerSkills(result, this?._actor, sourceCategory);
      };
      proto.__merpUiCombatTrainingDedupFix = true;
      changed = true;
      console.info(`${MODULE_ID} | Déduplication des spécialisations d'Armes de mêlée/distance installée.`);
    }

    // RMU 1.3.5 can render a filtered specialization list while keeping its
    // internal selection/response on a stale value.  This is especially visible
    // for Combat Training and Base Spell Lists: the first visible option is not
    // necessarily the value that will be saved.  Reconcile the final prepared
    // context with the Actor immediately before the dialog is rendered.
    if (proto && !proto.__merpUiFinalSelectionStateFix && typeof proto._prepareContext === "function") {
      const originalPrepareContext = proto._prepareContext;
      proto._prepareContext = async function(...args) {
        const data = await originalPrepareContext.apply(this, args);

        try {
          const skill = data?._selectedSkill;
          if (!skill) return data;

          // Combat Training: remove specializations already present on the Actor
          // and make the dialog response match the first remaining visible option.
          const combatIdentity = combatTrainingIdentity(skill);
          if (combatIdentity.category === "combat training" && ["melee weapons", "ranged weapons"].includes(combatIdentity.name)) {
            filterCombatTrainingSkillOptions(skill, this?._actor, this?._editSkillId ?? null);

            data._options = skill.options ?? [];
            data._hasOptions = data._options.length > 0;
            data._addButtonEnabled = data._options.length > 0;

            if (data._options.length > 0) {
              let index = Number.isInteger(this._selectedSpecialIndex) ? this._selectedSpecialIndex : 0;
              if (index < 0 || index >= data._options.length) index = 0;
              this._selectedSpecialIndex = index;
              data._selectedSpecialIndex = index;

              const specialization = data._options[index];
              this._enteredSpecialization = specialization;
              this._response.specialization = specialization;
              if (specialization !== "Exotic") {
                this._enteredExotic = null;
                this._response.exotic = null;
              }
            } else {
              this._selectedSpecialIndex = 0;
              data._selectedSpecialIndex = 0;
              this._enteredSpecialization = null;
              this._response.specialization = null;
            }
          }

          // MERP-specific Power Manipulation skills: inject after RMU has fully
          // prepared the context as well, because RMU 1.3.5 can rebuild options
          // after _getSkillSelectionOptions().
          const sourceCategory = this?._sourceSkillItemData?.system?.category ?? skill?.category ?? null;
          injectMerpSpecialPowerSkills(data, this?._actor, sourceCategory);

          // Spell Lists: RMU leaves _response.spellList empty on a newly-opened
          // dialog until the user changes the select.  Explicitly select the first
          // visible list (or the edited list) so the displayed value is actionable.
          if (Array.isArray(skill.spellLists) && skill.spellLists.length > 0) {
            let groupIndex = Number.isInteger(this._selectedCategoryIndex) ? this._selectedCategoryIndex : 0;
            if (groupIndex < 0 || groupIndex >= skill.spellLists.length) groupIndex = 0;
            this._selectedCategoryIndex = groupIndex;
            data._selectedCategoryIndex = groupIndex;

            const spellGroup = skill.spellLists[groupIndex];
            const lists = spellGroup?.spellLists ?? [];
            data._spellGroup = spellGroup;

            if (lists.length > 0) {
              let listIndex = Number.isInteger(this._selectedSpecialIndex) ? this._selectedSpecialIndex : 0;
              const editedName = this?._sourceSkillItemData?.system?.specialization;
              if (editedName) {
                const editedIndex = lists.findIndex((entry) => entry?.name === editedName);
                if (editedIndex >= 0) listIndex = editedIndex;
              }
              if (listIndex < 0 || listIndex >= lists.length) listIndex = 0;

              this._selectedSpecialIndex = listIndex;
              data._selectedSpecialIndex = listIndex;
              const selectedList = lists[listIndex];
              this._response.spellList = selectedList;
              this._response.spellListUuid = selectedList?._spellListUuid ?? selectedList?.uuid ?? null;
              this._response.specialization = selectedList?.name ?? null;
              this._enteredSpecialization = selectedList?.name ?? null;
              data._addButtonEnabled = !!selectedList;
            } else {
              this._selectedSpecialIndex = 0;
              data._selectedSpecialIndex = 0;
              this._response.spellList = null;
              this._response.spellListUuid = null;
              data._addButtonEnabled = false;
            }

          }
        } catch (error) {
          console.warn(`${MODULE_ID} | Impossible de synchroniser le sélecteur RMU avant rendu`, error);
        }

        return data;
      };
      proto.__merpUiFinalSelectionStateFix = true;
      changed = true;
      console.info(`${MODULE_ID} | Synchronisation finale des sélecteurs Armes/Listes de Sorts installée.`);
    }
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible de patcher AddUntrainedSkillDialogV2`, error);
  }

  try {
    const mod = await import(route("systems/rmu/module/apps/creation/culture-skill-dialog-v2.js"));
    const Cls = mod?.default;
    const proto = Cls?.prototype;
    if (proto && !proto.__merpUiCultureSelectionFix && typeof proto._getSkillSelectionOptions === "function") {
      const original = proto._getSkillSelectionOptions;
      proto._getSkillSelectionOptions = async function(...args) {
        let result = await original.apply(this, args);
        result = filterCultureCombatTrainingOptions(result, this);
        return result;
      };
      proto.__merpUiCultureSelectionFix = true;
      changed = true;
      console.info(`${MODULE_ID} | Correctif des spécialisations de Combat Training culturel installé.`);
    }

    if (proto && !proto.__merpUiCultureCombatFinalFix && typeof proto._prepareContext === "function") {
      const originalPrepare = proto._prepareContext;
      proto._prepareContext = async function(...args) {
        const data = await originalPrepare.apply(this, args);
        try {
          const skill = data?._selectedSkill;
          if (skill) {
            filterCultureCombatTrainingSkill(skill, this);
            data._hasOptions = (skill.options?.length ?? 0) > 0;
            if (skill.fixedSpecializations) {
              let idx = Number.isInteger(this._selectedSpecialIndex) ? this._selectedSpecialIndex : 0;
              if (idx < 0 || idx >= (skill.options?.length ?? 0)) idx = 0;
              this._selectedSpecialIndex = idx;
              data._selectedSpecialIndex = idx;
              const value = skill.options?.[idx] ?? null;
              this._enteredSpecialization = value;
              this._response.specialization = value;
            }
          }
        } catch (error) {
          console.warn(`${MODULE_ID} | Impossible de finaliser le filtrage des spécialisations culturelles`, error);
        }
        return data;
      };
      proto.__merpUiCultureCombatFinalFix = true;
      changed = true;
    }
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible de patcher CultureSkillDialogV2`, error);
  }

  return changed;
}

/**
 * RMU 1.3.5 character creation uses ApplicationV2. Creation-dialog choices
 * are normalized at the RMU prototypes; this render hook is now only needed
 * to refresh MERP Prime Stat markers while the profession is being selected.
 */
Hooks.on("renderApplicationV2", (app) => {
  try {
    fixMerpPrimeStatsInCreation(app);
    queueMicrotask(() => fixMerpPrimeStatsInCreation(app));
    setTimeout(() => fixMerpPrimeStatsInCreation(app), 50);
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible d’appliquer les caractéristiques principales MERP à la création RMU`, error);
  }
});


async function loadMerpRmuIntroductionData() {
  const route = foundry?.utils?.getRoute ? foundry.utils.getRoute(MERP_INTRODUCTION_PATH) : MERP_INTRODUCTION_PATH;
  const response = await fetch(route, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Unable to load ${MERP_INTRODUCTION_PATH}: ${response.status}`);
  return response.json();
}

async function installMerpRmuIntroduction({ force = false, notify = false } = {}) {
  if (!game.user?.isGM || game.system?.id !== "rmu") return { skipped: true, reason: "not-gm-or-rmu" };

  const data = await loadMerpRmuIntroductionData();
  const targetVersion = Number(data?.version || 1);
  const installedVersion = Number(game.settings.get(MODULE_ID, MERP_INTRODUCTION_SETTING) || 0);
  if (!force && installedVersion >= targetVersion) {
    return { skipped: true, reason: "already-current", version: installedVersion };
  }

  // If a Journal folder named MERP-RMU already exists, place the introduction
  // inside it. Otherwise keep the introduction at the Journal root, where it
  // remains the first thematic folder alongside Magie, Religion and Économie.
  const journalRoot = game.folders.find((folder) =>
    folder.type === "JournalEntry" &&
    folder.name === ROOT_FOLDER &&
    folderParentId(folder) === null
  ) ?? null;

  const folder = await ensureJournalFolder(
    data.folder?.name || "Présentation de MERP-RMU",
    journalRoot,
    data.folder?.sort ?? -100000,
    data.folder?.sorting ?? "m"
  );

  const key = data.journal?.key || "merp-rmu-introduction";
  const collection = data.journal?.collection || "merp-rmu-introduction";
  const existing = game.journal.find((journal) =>
    journal.getFlag?.(MODULE_ID, "key") === key &&
    journal.getFlag?.(MODULE_ID, "collection") === collection
  );

  const payload = foundry.utils.deepClone(data.journal?.document ?? {});
  payload.folder = folder.id;
  payload.flags = foundry.utils.mergeObject(payload.flags ?? {}, {
    [MODULE_ID]: { key, collection, contentVersion: targetVersion }
  }, { inplace: false, overwrite: true, recursive: true });

  let action = "created";
  if (existing) {
    // Recreate only this editorial Journal so that page order and formatting
    // are deterministic. This never touches the mechanical MERP-RMU schema.
    await existing.delete({ merpUiIntroductionInstall: true });
    action = "updated";
  }
  await JournalEntry.create(payload, { merpUiIntroductionInstall: true });
  await game.settings.set(MODULE_ID, MERP_INTRODUCTION_SETTING, targetVersion);

  const result = { version: targetVersion, action, folder: folder.name, pages: payload.pages?.length ?? 0 };
  if (notify) ui.notifications.info(`MERP UI : introduction MERP-RMU ${action === "created" ? "installée" : "mise à jour"}.`);
  console.log(`${MODULE_ID} | Introduction MERP-RMU`, result);
  return result;
}

async function loadMerpRmuHerbData() {
  const response = await fetch(MERP_HERBS_PATH, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${MERP_HERBS_PATH}: ${response.status}`);
  return response.json();
}

async function installMerpRmuHerbs({ force = false, notify = false } = {}) {
  if (!game.user?.isGM || game.system?.id !== "rmu") return { skipped: true, reason: "not-gm-or-rmu" };

  const data = await loadMerpRmuHerbData();
  const targetVersion = Number(data?.version || 1);
  const installedVersion = Number(game.settings.get(MODULE_ID, MERP_HERBS_SETTING) || 0);
  if (!force && installedVersion >= targetVersion) {
    return { skipped: true, reason: "already-current", version: installedVersion };
  }

  const merpRoot = await ensureItemFolder(ROOT_FOLDER);
  const herbRoot = await ensureItemFolder(data.rootFolder || "Herbes & Substances", merpRoot, 700000, "m");
  const folderMap = new Map();
  for (const def of data.folders ?? []) {
    const parent = def.parent ? folderMap.get(def.parent) : herbRoot;
    const folder = await ensureItemFolder(def.name, parent ?? herbRoot, def.sort ?? 0, "a");
    folderMap.set(def.key, folder);
  }

  let created = 0;
  let updated = 0;
  const herbItemsByKey = new Map();
  for (const entry of data.items ?? []) {
    const folder = folderMap.get(entry.folder) ?? herbRoot;
    const payload = foundry.utils.deepClone(entry.document);
    payload.folder = folder.id;
    const existing = game.items.find((item) =>
      item.getFlag?.(MODULE_ID, "key") === entry.key &&
      item.getFlag?.(MODULE_ID, "collection") === "merp-rmu-herbs"
    );
    if (existing) {
      await existing.update(payload, { merpUiHerbInstall: true });
      herbItemsByKey.set(entry.key, existing);
      updated += 1;
    } else {
      const createdItem = await Item.create(payload, { merpUiHerbInstall: true });
      if (createdItem) herbItemsByKey.set(entry.key, createdItem);
      created += 1;
    }
  }

  const resolveHerbLinks = (html) => String(html ?? "").replace(
    /\[\[HERB:([^|\]]+)\|([^\]]+)\]\]/g,
    (match, key, label) => {
      const item = herbItemsByKey.get(key) ?? game.items.find((candidate) =>
        candidate.getFlag?.(MODULE_ID, "key") === key &&
        candidate.getFlag?.(MODULE_ID, "collection") === "merp-rmu-herbs"
      );
      return item ? `@UUID[Item.${item.id}]{${label}}` : label;
    }
  );

  let journalCreated = 0;
  let journalUpdated = 0;
  if (data.journal?.document) {
    const rulesRoot = await ensureJournalFolder(data.journal.folderName || "Règles MERP - RMU");
    const rulesFolder = data.journal.subfolderName
      ? await ensureJournalFolder(data.journal.subfolderName, rulesRoot, 100000, "m")
      : rulesRoot;
    const existingJournal = game.journal.find((journal) =>
      journal.getFlag?.(MODULE_ID, "key") === data.journal.key &&
      journal.getFlag?.(MODULE_ID, "collection") === "merp-rmu-herb-rules"
    );
    if (existingJournal) {
      await existingJournal.delete({ merpUiHerbInstall: true });
      journalUpdated = 1;
    } else {
      journalCreated = 1;
    }
    const journalPayload = foundry.utils.deepClone(data.journal.document);
    journalPayload.folder = rulesFolder.id;
    for (const page of journalPayload.pages ?? []) {
      if (page?.type === "text" && page?.text?.content) {
        page.text.content = resolveHerbLinks(page.text.content);
      }
    }
    await JournalEntry.create(journalPayload, { merpUiHerbInstall: true });

    // Nettoie l’ancien emplacement créé par les premières versions du guide des Herbes.
    // On ne supprime que des dossiers devenus totalement vides.
    const obsoleteRoot = game.folders.find((folder) =>
      folder.type === "JournalEntry" &&
      folder.name === "Règles MERP-RMU" &&
      folderParentId(folder) === null
    );
    if (obsoleteRoot) {
      const obsoleteHerbs = game.folders.find((folder) =>
        folder.type === "JournalEntry" &&
        folder.name === "Herbes & Substances" &&
        folderParentId(folder) === obsoleteRoot.id
      );
      if (obsoleteHerbs) {
        const hasDocs = game.journal.some((entry) => (entry.folder?.id ?? entry.folder) === obsoleteHerbs.id);
        const hasChildren = game.folders.some((folder) => folderParentId(folder) === obsoleteHerbs.id);
        if (!hasDocs && !hasChildren) await obsoleteHerbs.delete();
      }
      const rootHasDocs = game.journal.some((entry) => (entry.folder?.id ?? entry.folder) === obsoleteRoot.id);
      const rootHasChildren = game.folders.some((folder) => folderParentId(folder) === obsoleteRoot.id);
      if (!rootHasDocs && !rootHasChildren) await obsoleteRoot.delete();
    }
  }

  await game.settings.set(MODULE_ID, MERP_HERBS_SETTING, targetVersion);
  const result = { version: targetVersion, created, updated, journalCreated, journalUpdated, total: (data.items ?? []).length };
  if (notify) ui.notifications.info(`MERP UI : catalogue d’herbes installé (${result.total} entrées).`);
  console.log(`${MODULE_ID} | Herbes MERP-RMU`, result);
  return result;
}

function exposeMerpRmuContentApi() {
  globalThis.MERPUI = globalThis.MERPUI ?? {};
  globalThis.MERPUI.installMerpRmuContent = (options = {}) =>
    installMerpRmuContent({ ...options, force: options.force ?? true });
  globalThis.MERPUI.forceProfessionDescriptions = (options = {}) =>
    forceProfessionDescriptions({ ...options, notify: options.notify ?? true });
  globalThis.MERPUI.installSpecialPowerSkills = async (options = {}) => {
    const install = await installMerpSpecialPowerSkills({ ...options, force: options.force ?? true, notify: options.notify ?? true });
    const sync = await syncMerpSpecialPowerSkillsAllActors({ notify: options.notify ?? true });
    return { install, sync };
  };
  globalThis.MERPUI.syncSpecialPowerSkills = (options = {}) =>
    syncMerpSpecialPowerSkillsAllActors({ notify: options.notify ?? true });
  globalThis.MERPUI.installMerpRmuTalentsFlaws = (options = {}) =>
    installMerpRmuTalentsFlaws({ ...options, force: options.force ?? true, notify: options.notify ?? true });
  globalThis.MERPUI.syncNonRmuSpellListPack = async (options = {}) => {
    const data = await loadMerpRmuData();
    return syncNonRmuSpellListPack(data, { force: options.force ?? true });
  };
  globalThis.MERPUI.deduplicateSpellLists = (options = {}) =>
    deduplicateWorldSpellLists({ verbose: options.verbose ?? true });
  globalThis.MERPUI.cleanupStartlight = (options = {}) =>
    cleanupInvalidStartlightArtifacts({ verbose: options.verbose ?? true });
  globalThis.MERPUI.installIntroduction = (options = {}) =>
    installMerpRmuIntroduction({ ...options, force: options.force ?? true, notify: options.notify ?? true });
  globalThis.MERPUI.installHerbs = (options = {}) =>
    installMerpRmuHerbs({ ...options, force: options.force ?? true, notify: options.notify ?? true });
}

// Expose diagnostics/install helpers as soon as this module is evaluated.  This
// avoids losing the API if Foundry's ready hook has already fired during a hot reload.
exposeMerpRmuContentApi();
Hooks.once("ready", () => {
  installMerpSpecialPowerSkillTranslations();
  exposeMerpRmuContentApi();
});

// ---------------------------------------------------------------------------
// MERP-UI 1.3.0 — Journal page title presentation
// Generated MERP-RMU journal pages already carry their own visible <h1>/<h2>
// headings in the HTML body. Foundry's separate "Display Page Title" option
// would therefore render the same title twice. Keep it disabled on managed
// MERP-RMU pages without altering any journal content.
// ---------------------------------------------------------------------------
const MERP_MANAGED_JOURNAL_COLLECTIONS_WITH_INLINE_TITLES = new Set([
  "merp-rmu-rules",
  "merp-rmu-introduction",
  "merp-rmu-herb-rules"
]);

function merpUiJournalUsesInlineTitles(journal) {
  const collection = journal?.getFlag?.(MODULE_ID, "collection") ?? journal?.flags?.[MODULE_ID]?.collection;
  return MERP_MANAGED_JOURNAL_COLLECTIONS_WITH_INLINE_TITLES.has(collection);
}


async function hideManagedMerpRmuJournalPageTitles({ notify = false } = {}) {
  if (!game.user?.isGM || game.system?.id !== "rmu") return { skipped: true, reason: "not-gm-or-rmu" };
  let journals = 0;
  let pages = 0;
  for (const journal of game.journal ?? []) {
    if (!merpUiJournalUsesInlineTitles(journal)) continue;
    const updates = [];
    for (const page of journal.pages ?? []) {
      if (page.title?.show === false) continue;
      updates.push({ _id: page.id, "title.show": false });
    }
    if (!updates.length) continue;
    await journal.updateEmbeddedDocuments("JournalEntryPage", updates, {
      render: false,
      merpUiHidePageTitles: true
    });
    journals += 1;
    pages += updates.length;
  }
  if (pages) ui.journal?.render?.(true);
  if (notify) ui.notifications.info(`MERP UI : titres de page masqués par défaut sur ${pages} page(s).`);
  const result = { journals, pages };
  console.log(`${MODULE_ID} | Titres de pages MERP-RMU`, result);
  return result;
}

// Apply the presentation rule to new managed pages before Foundry persists them.
Hooks.on("preCreateJournalEntryPage", (page, data, options) => {
  try {
    const journal = page?.parent;
    if (!merpUiJournalUsesInlineTitles(journal)) return;
    page.updateSource({ "title.show": false });
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible de masquer le titre d’une nouvelle page MERP-RMU`, error);
  }
});

