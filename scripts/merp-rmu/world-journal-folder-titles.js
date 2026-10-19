import { contentLanguage } from "./localization.js";
import { folderParentId } from "./content-folders.js";
import { localizedCompendiumLabel } from "./compendium-content.js";

// Titles of imported *World* folders and the titles inside a Compendium are
// different documents. The compendium synchronizer updates only the latter.
// This bridge preserves Folder IDs and never edits JournalEntry contents.
const MODULE_ID = "merp-ui";
const RULES_PACK = "merp-rmu-rules";
const MANIFEST_PATH = "source/compendiums/content-sync-manifest.json";
let knownRulesFolders = null;

function moduleRoute(path) {
  const url = `modules/${MODULE_ID}/${path}`;
  return foundry?.utils?.getRoute?.(url) ?? url;
}

async function sourceJson(path) {
  const response = await fetch(moduleRoute(path), {
    cache: "no-store", credentials: "same-origin"
  });
  if (!response.ok) throw Error(`HTTP ${response.status}: ${path}`);
  return response.json();
}

/** Load the canonical FR/EN names from the very same source files as LevelDB. */
export async function sourceRulesFolderTitles() {
  if (knownRulesFolders) return knownRulesFolders;
  const manifest = await sourceJson(MANIFEST_PATH);
  const definitions = manifest?.packs?.find(p => p.name === RULES_PACK)?.sources ?? [];
  const byKey = new Map();

  for (const ref of definitions) {
    const source = await sourceJson(ref.file);
    const keys = source.compendiumFolderKeyPath ?? [];
    const translations = source.compendiumFolderPath ?? {};
    const french = translations.fr ?? [];
    const english = translations.en ?? [];

    for (let index = 0; index < keys.length; index += 1) {
      if (!french[index] || !english[index]) continue;
      const key = keys.slice(0, index + 1).join("/");
      const pair = { key, fr: french[index], en: english[index] };
      const previous = byKey.get(key);
      if (previous && (previous.fr !== pair.fr || previous.en !== pair.en)) {
        console.warn(`${MODULE_ID} | Conflicting folder translations for ${key}`);
        continue;
      }
      byKey.set(key, pair);
    }
  }

  knownRulesFolders = [...byKey.values()];
  return knownRulesFolders;
}

function matchingAliases(folder, pair) {
  return folder.name === pair.fr || folder.name === pair.en;
}

function isSupportedLocation(folder, packRootIds) {
  const parent = folderParentId(folder);
  return !parent || packRootIds.has(parent);
}

/**
 * Localize only World JournalEntry folders whose *current* name exactly equals
 * one of our published FR/EN aliases. A user-customized title is left alone.
 * Folders are updated in place, without changing IDs or their children.
 */
export async function localizeImportedJournalFolderTitles({
  language = contentLanguage(), dryRun = false
} = {}) {
  if (!game.user?.isGM || game.system?.id !== "rmu") {
    return { skipped: true, reason: "not-gm-or-rmu" };
  }

  const locale = language === "en" ? "en" : "fr";
  const candidates = (game.folders?.contents ?? [])
    .filter(folder => folder.type === "JournalEntry");

  // The two optional top-level folders come from importing compendiums.
  const topLevel = ["merp-rmu-languages", "merp-rmu-rules"]
    .map(packName => ({
      key: packName,
      fr: localizedCompendiumLabel(packName, "fr"),
      en: localizedCompendiumLabel(packName, "en")
    }))
    .filter(pair => pair.fr && pair.en);

  let updated = 0;
  let unchanged = 0;
  const changes = [];
  const packRootIds = new Set();
  for (const folder of candidates) {
    if (folderParentId(folder)) continue;
    const pair = topLevel.find(label => matchingAliases(folder, label));
    if (!pair) continue;
    packRootIds.add(folder.id);
    const name = pair[locale];
    if (folder.name === name) { unchanged++; continue; }
    changes.push({ id: folder.id, old: folder.name, name, key: pair.key });
    if (!dryRun) await folder.update({ name }, {
      render: false, merpUiJournalFolderLocalization: true
    });
    updated++;
  }

  const rulesFolders = await sourceRulesFolderTitles();
  for (const folder of candidates) {
    if (!isSupportedLocation(folder, packRootIds)) continue;
    const pair = rulesFolders.find(label => matchingAliases(folder, label));
    if (!pair) continue;
    const name = pair[locale];
    if (folder.name === name) { unchanged++; continue; }
    changes.push({ id: folder.id, old: folder.name, name, key: pair.key });
    if (!dryRun) await folder.update({ name }, {
      render: false, merpUiJournalFolderLocalization: true
    });
    updated++;
  }

  return {
    language: locale, dryRun, updated, unchanged,
    matched: updated + unchanged, changes
  };
}
