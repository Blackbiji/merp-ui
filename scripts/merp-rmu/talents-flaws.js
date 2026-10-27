import {
  contentLanguage,
  localizeManagedDocument
} from "./localization.js";
import {
  ensureConfiguredFolders,
  ensureItemFolder,
  folderParentId,
  localizedFolderAliases,
  localizedFolderName
} from "./content-folders.js";
import { refreshManagedDatasetLocalization } from "./content-localization.js";

const MODULE_ID = "merp-ui";
const ROOT_FOLDER = "MERP-RMU";
const DATA_PATH = `modules/${MODULE_ID}/data/merp-rmu/talents-flaws-v2.json`;
const VERSION_SETTING = "merpRmuTalentsFlawsVersion";
const LANGUAGE_SETTING = "merpRmuTalentsFlawsLanguage";
const COLLECTION = "merp-rmu-talents-flaws-v2";

function route(path) {
  return foundry?.utils?.getRoute ? foundry.utils.getRoute(path) : path;
}

async function loadData() {
  const response = await fetch(route(DATA_PATH), { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Unable to load ${DATA_PATH}: ${response.status}`);
  return response.json();
}

function worldFolders() {
  return [...(game.folders ?? [])];
}

function worldItems() {
  return [...(game.items ?? [])];
}

function managed(item) {
  return item?.type === "talent" &&
    (item.getFlag?.(MODULE_ID, "collection") ?? item?.flags?.[MODULE_ID]?.collection) === COLLECTION;
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .toLowerCase().trim();
}

/**
 * During RMU character creation, the Race shown in the prepared header may
 * already be the newly selected Race while actor.items still exposes the
 * initial Hildor Race. In particular, RMU creates the three free Dúnedain
 * racial Talents before the embedded Race replacement has fully settled.
 *
 * Prefer the *selected* Race; never infer eligibility from an unrelated or
 * stale Race Item. Outside that transition, the embedded Race remains the
 * source of truth. An ambiguous collection is deliberately not accepted.
 */
function actorRaceName(actor) {
  const races = [...(actor?.items ?? [])].filter(item => item.type === "race");
  const candidates = [
    actor?.system?._header?._raceName,
    actor?.system?._creation?.race?.name,
    actor?.system?._creation?.raceName,
    typeof actor?.system?._creation?.race === "string" ? actor.system._creation.race : null,
    actor?.system?._race?.name,
    actor?.system?._raceName,
    actor?.system?.race?.name,
    actor?.system?.raceName,
    typeof actor?.system?.race === "string" ? actor.system.race : null
  ].filter(value => typeof value === "string" && value.trim());

  const raceMatches = (item, name) => {
    const key = String(item?.flags?.[MODULE_ID]?.canonicalKey ??
      item?.flags?.[MODULE_ID]?.key ?? "").replace(/-age-[1-4]$/, "");
    const expected = normalize(name);
    return normalize(item?.name) === expected ||
      (key === "race-dunedain" && expected === "dunedain");
  };
  // During character creation RMU creates the new racial Talents before
  // replacing the embedded previous Race.  That previous Race can be ANY
  // Race, not just the initial Human default.  The prepared header is RMU's
  // explicit current choice and is reliable during this short transition.
  // Outside creation keep the embedded Item authoritative, so adding a
  // Dúnedain-only Talent manually to a non-Dúnedain remains prohibited.
  const selectedRace = actor?.system?._header?._raceName;
  if (Number(actor?.system?.view) === 0 && races.length <= 1 &&
      normalize(selectedRace) === "dunedain") {
    return selectedRace;
  }

  for (const candidate of candidates) {
    if (races.some(item => raceMatches(item, candidate))) return candidate;
  }

  if (!races.length) return candidates[0] ?? "";
  return races.length === 1 ? races[0].name : "";
}

function actorCultureName(actor) {
  return [...(actor?.items ?? [])].find((item) => item.type === "culture")?.name ?? "";
}

/**
 * RMU can grant the free race Talents BEFORE committing the replacement Race
 * Item or refreshing the prepared header (notably Elf -> Dúnedain directly).
 * Restriction validation must not veto this native, reversible step.
 *
 * Constrain the exception to precisely the THREE auto-granted Dúnedain
 * talents and only while the actor is in the RMU creation view. Completed
 * characters and all optional/purchasable Talents keep strict restrictions.
 */
const FREE_DUNEDAIN_RACIAL_TALENTS = new Set([
  "dunedain-longevity", "dunedain-disease-resistance", "dunedain-western-endurance"
]);
function isTransitionalDunedainRacialGrant(actor, item) {
  const flags = item?.flags?.[MODULE_ID] ?? {};
  if (!FREE_DUNEDAIN_RACIAL_TALENTS.has(flags.key)) return false;
  if (Number(actor?.system?.view) !== 0) return false;
  if (actor?.type && !["character", "Character"].includes(actor.type)) return false;
  const raceOnly = flags.restrictions?.races;
  if (!Array.isArray(raceOnly) || raceOnly.length !== 1 || normalize(raceOnly[0]) !== "dunedain") return false;
  if (flags.restrictions?.cultures?.length) return false;
  // Free racial abilities, unlike Dúnedain Ancestry, cannot be purchased.
  return Number(item?.system?.cost ?? 0) === 0;
}

function allowed(actor, item) {
  const restrictions = item?.getFlag?.(MODULE_ID, "restrictions") ?? item?.flags?.[MODULE_ID]?.restrictions ?? {};
  const races = Array.isArray(restrictions.races) ? restrictions.races : [];
  const cultures = Array.isArray(restrictions.cultures) ? restrictions.cultures : [];
  if (!races.length && !cultures.length) return true;

  const race = normalize(actorRaceName(actor));
  const culture = normalize(actorCultureName(actor));
  const matches = (actual, choices) => choices.some((choice) => {
    const wanted = normalize(choice);
    return Boolean(actual && wanted) &&
      (actual === wanted || actual.includes(wanted) || wanted.includes(actual));
  });
  return (races.length && matches(race, races)) || (cultures.length && matches(culture, cultures));
}

export function registerMerpRmuTalentsFlawsSetting() {
  if (game.settings.settings.has(`${MODULE_ID}.${VERSION_SETTING}`)) return;
  game.settings.register(MODULE_ID, VERSION_SETTING, {
    name: "Version des Talents & Défauts spécifiques MERP-RMU",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });
  game.settings.register(MODULE_ID, LANGUAGE_SETTING, {
    name: "Langue des Talents & Défauts MERP-RMU", scope: "world", config: false, type: String, default: ""
  });
}

let hooksRegistered = false;
export function registerMerpRmuTalentsFlawsHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;
  Hooks.on("preCreateItem", (item, data, options) => {
    try {
      if (options?.merpUiTalentFlawInstall) return;
      const actor = item?.parent;
      if (!actor || actor.documentName !== "Actor" || item.type !== "talent" || !managed(item)) return;
      if (allowed(actor, item) || isTransitionalDunedainRacialGrant(actor, item)) return;
      const restrictions = item.getFlag?.(MODULE_ID, "restrictions") ?? {};
      const labels = [...(restrictions.races ?? []), ...(restrictions.cultures ?? [])].join(", ");
      ui.notifications.warn(`MERP UI : ${item.name} est réservé à : ${labels}.`);
      return false;
    } catch (error) {
      console.warn(`${MODULE_ID} | Impossible de vérifier la restriction d’un Talent/Défaut MERP-RMU`, error);
    }
  });
}


function folderHasDirectItems(folder) {
  return worldItems().some((item) => item.folder?.id === folder?.id);
}

function folderChildren(folder) {
  return worldFolders().filter((candidate) =>
    folderParentId(candidate) === folder?.id
  );
}

async function deleteEmptyFolderTree(folder) {
  if (!folder) return 0;

  let deleted = 0;
  for (const child of [...folderChildren(folder)]) {
    deleted += await deleteEmptyFolderTree(child);
  }

  if (!folderHasDirectItems(folder) && folderChildren(folder).length === 0) {
    await folder.delete({ merpUiTalentFlawLocalization: true });
    deleted += 1;
  }

  return deleted;
}

async function cleanupDuplicateTalentFolderTrees(data, canonicalCatalogue) {
  const root = worldFolders().find((folder) =>
    folder.type === "Item" &&
    folder.name === ROOT_FOLDER &&
    folderParentId(folder) === null
  ) ?? null;
  if (!root) return 0;

  const catalogueNames = localizedFolderAliases({
    name: data?.root || "Talents & Défauts",
    localizations: data?.rootLocalizations ?? {}
  });

  const duplicates = worldFolders().filter((folder) =>
    folder.type === "Item" &&
    folder.id !== canonicalCatalogue?.id &&
    folderParentId(folder) === root.id &&
    catalogueNames.includes(folder.name)
  );

  let deleted = 0;
  for (const duplicate of duplicates) {
    // Only remove a duplicate tree if it contains no Items anywhere. We never
    // delete or move user content as part of localization cleanup.
    const stack = [duplicate];
    let hasItems = false;
    while (stack.length) {
      const current = stack.pop();
      if (folderHasDirectItems(current)) {
        hasItems = true;
        break;
      }
      stack.push(...folderChildren(current));
    }
    if (!hasItems) deleted += await deleteEmptyFolderTree(duplicate);
  }

  return deleted;
}

export async function refreshTalentsFlawsLocalization(data = null, { notify = false } = {}) {
  data = data ?? await loadData();
  const language = contentLanguage();
  const root = await ensureItemFolder(ROOT_FOLDER);

  const catalogueDefinition = {
    name: data?.root || "Talents & Défauts",
    localizations: data?.rootLocalizations ?? {}
  };
  const catalogue = await ensureItemFolder(
    localizedFolderName(catalogueDefinition),
    root,
    null,
    null,
    localizedFolderAliases(catalogueDefinition)
  );

  const folders = await ensureConfiguredFolders(
    data?.folders ?? [],
    catalogue,
    "Item"
  );

  const localized = await refreshManagedDatasetLocalization(data, {
    itemCollection: COLLECTION,
    itemFolderRoot: catalogue,
    notify: false,
    label: "Talents & Défauts MERP-RMU"
  });

  // Folder placement is mechanical catalogue structure, not localization.
  // Preserve the 1.4.x behavior for worlds where an Item survived in an
  // obsolete translated folder.
  let moved = 0;
  for (const entry of data?.items ?? []) {
    const item = worldItems().find((candidate) =>
      managed(candidate) &&
      (candidate.getFlag?.(MODULE_ID, "key") ?? candidate?.flags?.[MODULE_ID]?.key) === entry.key
    );
    const folder = folders.get(entry.folder) ?? catalogue;
    if (item && folder?.id && item.folder?.id !== folder.id) {
      await item.update(
        { folder: folder.id },
        { render: false, merpUiTalentFlawLocalization: true }
      );
      moved += 1;
    }
  }

  const removedDuplicateFolders = await cleanupDuplicateTalentFolderTrees(
    data,
    catalogue
  );

  await game.settings.set(MODULE_ID, LANGUAGE_SETTING, language);

  const result = {
    ...localized,
    language,
    localizationOnly: true,
    moved,
    removedDuplicateFolders
  };

  if (notify) {
    ui.notifications.info(
      `MERP UI : Talents & Défauts — localisation ${language.toUpperCase()} ` +
      `(${result.localizedItems ?? 0} modifié(s)).`
    );
  }
  return result;
}

export async function installMerpRmuTalentsFlaws({ force = false, notify = false } = {}) {
  if (!game.user?.isGM || game.system?.id !== "rmu") return { skipped: true, reason: "not-gm-or-rmu" };

  const data = await loadData();
  const target = Number(data?.version || 1);
  const installed = Number(game.settings.get(MODULE_ID, VERSION_SETTING) || 0);
  const existingManaged = worldItems().filter(managed);
  const entries = data?.items ?? [];
  const expectedKeys = new Set(entries.map((entry) => entry.key));
  const existingKeys = new Set(existingManaged.map((item) => item.getFlag?.(MODULE_ID, "key") ?? item?.flags?.[MODULE_ID]?.key));
  const catalogueComplete = existingManaged.length === entries.length &&
    expectedKeys.size === existingKeys.size &&
    [...expectedKeys].every((key) => existingKeys.has(key));

  const language = contentLanguage();
  if (!force && installed >= target && catalogueComplete) {
    // Always perform the lightweight comparison so a partially localized
    // world self-heals without rewriting the mechanical Talent data.
    return refreshTalentsFlawsLocalization(data, { notify });
  }

  const root = await ensureItemFolder(ROOT_FOLDER);
  const catalogueDefinition = {
    name: data?.root || "Talents & Défauts",
    localizations: data?.rootLocalizations ?? {}
  };
  const catalogue = await ensureItemFolder(
    localizedFolderName(catalogueDefinition),
    root,
    null,
    null,
    localizedFolderAliases(catalogueDefinition)
  );
  const folders = new Map();
  for (const def of data?.folders ?? []) {
    folders.set(def.key, await ensureItemFolder(
      localizedFolderName(def),
      catalogue,
      null,
      null,
      localizedFolderAliases(def)
    ));
  }

  const details = [];
  const validKeys = new Set();
  for (const entry of entries) {
    validKeys.add(entry.key);
    const folder = folders.get(entry.folder) ?? catalogue;
    const document = localizeManagedDocument(entry.document, entry.localizations);
    document.folder = folder.id;

    const existing = worldItems().find((item) =>
      managed(item) && (item.getFlag?.(MODULE_ID, "key") ?? item?.flags?.[MODULE_ID]?.key) === entry.key
    );

    if (!existing) {
      const created = await Item.create(document, { renderSheet: false, merpUiTalentFlawInstall: true });
      details.push({ key: entry.key, name: created.name, action: "created" });
    } else {
      const update = foundry.utils.deepClone(document);
      delete update.type;
      await existing.update(update, { render: false, merpUiTalentFlawInstall: true });
      details.push({ key: entry.key, name: existing.name, action: "updated" });
    }
  }

  const stale = worldItems().filter((item) =>
    managed(item) && !validKeys.has(item.getFlag?.(MODULE_ID, "key") ?? item?.flags?.[MODULE_ID]?.key)
  );
  if (stale.length) await Item.deleteDocuments(stale.map((item) => item.id), { merpUiTalentFlawInstall: true });

  const removedDuplicateFolders = await cleanupDuplicateTalentFolderTrees(
    data,
    catalogue
  );

  await game.settings.set(MODULE_ID, VERSION_SETTING, target);
  await game.settings.set(MODULE_ID, LANGUAGE_SETTING, language);
  const result = {
    version: target,
    created: details.filter((d) => d.action === "created").length,
    updated: details.filter((d) => d.action === "updated").length,
    deleted: stale.length,
    removedDuplicateFolders,
    total: details.length,
    details
  };
  if (notify) ui.notifications.info(`MERP UI : Talents & Défauts MERP-RMU installés (${result.total} entrées).`);
  return result;
}
