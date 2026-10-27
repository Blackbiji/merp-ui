import {
  contentLanguage,
  localizeManagedDocument
} from "./localization.js";
import { localizeJournalDocument } from "./content-localization.js";
import { resolveNativeProfessionDocument } from "./professions.js";

const MODULE_ID = "merp-ui";
const CAMPAIGN_AGE_SETTING = "campaignAge";

export function registerCompendiumContentSettings() {
  if (!game.settings.settings.has(`${MODULE_ID}.${CAMPAIGN_AGE_SETTING}`)) {
    game.settings.register(MODULE_ID, CAMPAIGN_AGE_SETTING, {
      name: "MERPUI.Settings.CampaignAge.Name",
      hint: "MERPUI.Settings.CampaignAge.Hint",
      scope: "world",
      config: true,
      type: String,
      choices: {
        "1": "MERPUI.Settings.CampaignAge.First",
        "2": "MERPUI.Settings.CampaignAge.Second",
        "3": "MERPUI.Settings.CampaignAge.Third",
        "4": "MERPUI.Settings.CampaignAge.Fourth"
      },
      default: "3"
    });
  }
}

export function campaignAge() {
  const value = String(
    game.settings.get(MODULE_ID, CAMPAIGN_AGE_SETTING) ?? "3"
  );
  return ["1", "2", "3", "4"].includes(value) ? Number(value) : 3;
}

function merpFlags(document) {
  return document?.flags?.[MODULE_ID] ?? {};
}

function compendiumLocalizations(document) {
  return merpFlags(document)?.compendiumLocalizations ?? {};
}

function compendiumAgeVariants(document) {
  return merpFlags(document)?.compendiumAgeVariants ?? null;
}

function nativeProfessionDefinition(document) {
  return merpFlags(document)?.nativeProfessionDefinition ?? null;
}

function updatePayload(document) {
  const data = foundry.utils.deepClone(document ?? {});
  delete data._id;
  delete data._stats;
  delete data.folder;
  delete data.type;
  return data;
}

function currentCompendiumMetadata(item) {
  const flags = foundry.utils.deepClone(merpFlags(item) ?? {});
  return {
    compendiumSourceKey: flags.compendiumSourceKey ?? null,
    compendiumPack: flags.compendiumPack ?? null,
    compendiumSourceFile: flags.compendiumSourceFile ?? null,
    compendiumFolderKey: flags.compendiumFolderKey ?? null,
    compendiumBuildLanguage: flags.compendiumBuildLanguage ?? null,
    compendiumLocalizations: flags.compendiumLocalizations ?? {},
    compendiumAgeVariants: flags.compendiumAgeVariants ?? null,
    compendiumFolderPath: flags.compendiumFolderPath ?? null,
    compendiumFolderKeyPath: flags.compendiumFolderKeyPath ?? [],
    compendiumResolverBacked: Boolean(flags.compendiumResolverBacked)
  };
}

export function compendiumAgeAvailability(data) {
  const variants = compendiumAgeVariants(data);
  if (!variants || typeof variants !== "object") return null;
  return Object.keys(variants)
    .map(Number)
    .filter((age) => Number.isInteger(age) && age >= 1 && age <= 4)
    .sort((a, b) => a - b);
}

export function validateCompendiumAgeDrop(data, { notify = true } = {}) {
  const available = compendiumAgeAvailability(data);
  if (!available?.length) return { allowed: true, age: null, available: null };

  const age = campaignAge();
  const allowed = available.includes(age);

  if (!allowed && notify) {
    ui.notifications.warn(
      `MERP UI : ${data?.name ?? "ce contenu"} n’est pas disponible au ` +
      `${age}${age === 1 ? "er" : "e"} Âge. ` +
      `Âges disponibles : ${available.join(", ")}.`
    );
  }

  return { allowed, age, available };
}

async function applyAgeVariant(item, { preserveSelectedAge = true } = {}) {
  const variants = compendiumAgeVariants(item);
  if (!variants) return { action: "not-age-dependent" };

  const previouslySelected = Number(
    merpFlags(item)?.selectedCampaignAge ?? 0
  );
  const age =
    preserveSelectedAge && variants[String(previouslySelected)]
      ? previouslySelected
      : campaignAge();
  const variant = variants[String(age)];
  if (!variant?.document) {
    return { action: "unavailable-age", age };
  }

  const localized = localizeManagedDocument(
    variant.document,
    variant.localizations ?? {}
  );
  const metadata = currentCompendiumMetadata(item);

  localized.flags ??= {};
  localized.flags[MODULE_ID] ??= {};
  Object.assign(localized.flags[MODULE_ID], metadata, {
    key:
      localized.flags[MODULE_ID].canonicalKey ??
      metadata.compendiumSourceKey ??
      localized.flags[MODULE_ID].key,
    selectedCampaignAge: age,
    sourceAgeKey: variant.sourceKey ?? null
  });

  await item.update(
    updatePayload(localized),
    {
      render: false,
      diff: false,
      recursive: true,
      merpUiCompendiumMaterialize: true
    }
  );

  return {
    action: "age-variant-applied",
    age,
    sourceKey: variant.sourceKey ?? null
  };
}

async function resolveNativeProfession(item) {
  const def = nativeProfessionDefinition(item);
  if (!def) return { action: "not-native-profession" };

  const resolved = await resolveNativeProfessionDocument(def);
  if (!resolved) {
    ui.notifications.error(
      `MERP UI : le châssis RMU requis pour ${item.name} est introuvable. ` +
      "Vérifiez la présence des Compendiums natifs de RMU (version minimale déclarée : 1.3.55)."
    );
    return { action: "source-missing", key: def.key ?? null };
  }

  const localized = localizeManagedDocument(
    resolved,
    def.localizations ?? {}
  );
  const metadata = currentCompendiumMetadata(item);

  localized.flags ??= {};
  localized.flags[MODULE_ID] ??= {};
  Object.assign(localized.flags[MODULE_ID], metadata, {
    key: def.key,
    collection: "merp-rmu-compendium",
    nativeRMU: true,
    resolvedFromCompendium: true,
    source: {
      type: "rmu-native-profession",
      pack: def.sourcePack ?? "rmu.core",
      id: def.sourceId ?? null,
      name: def.sourceName ?? null
    }
  });

  await item.update(
    updatePayload(localized),
    {
      render: false,
      diff: false,
      recursive: true,
      merpUiCompendiumMaterialize: true
    }
  );

  return {
    action: "native-profession-resolved",
    key: def.key,
    sourcePack: def.sourcePack ?? "rmu.core"
  };
}

async function localizeImportedCompendiumItem(item) {
  const localizations = compendiumLocalizations(item);
  if (!localizations || !Object.keys(localizations).length) {
    return { action: "no-localization" };
  }

  const current = item.toObject();
  const localized = localizeManagedDocument(current, localizations);
  const metadata = currentCompendiumMetadata(item);
  localized.flags ??= {};
  localized.flags[MODULE_ID] ??= {};
  Object.assign(localized.flags[MODULE_ID], metadata);

  await item.update(
    updatePayload(localized),
    {
      render: false,
      diff: false,
      recursive: true,
      merpUiCompendiumMaterialize: true
    }
  );
  return { action: "localized", language: contentLanguage() };
}

export async function materializeCompendiumItem(item, options = {}) {
  if (!item || options?.merpUiCompendiumMaterialize) {
    return { skipped: true };
  }

  const flags = merpFlags(item);
  if (!flags?.compendiumPack) return { skipped: true, reason: "not-compendium" };

  if (nativeProfessionDefinition(item)) {
    return resolveNativeProfession(item);
  }

  if (compendiumAgeVariants(item)) {
    return applyAgeVariant(item);
  }

  return localizeImportedCompendiumItem(item);
}

export async function materializeCompendiumJournal(journal, options = {}) {
  if (!journal || options?.merpUiCompendiumMaterialize) {
    return { skipped: true };
  }

  const flags = merpFlags(journal);
  if (!flags?.compendiumPack) return { skipped: true, reason: "not-compendium" };

  const localizations = compendiumLocalizations(journal);
  if (!localizations || !Object.keys(localizations).length) {
    return { action: "no-localization" };
  }

  const current = journal.toObject();
  const localized = localizeJournalDocument(current, localizations);
  for (const page of localized.pages ?? []) {
    page.title ??= {};
    page.title.show = false;
  }
  localized.flags ??= {};
  localized.flags[MODULE_ID] ??= {};
  Object.assign(localized.flags[MODULE_ID], currentCompendiumMetadata(journal));

  await journal.update(
    updatePayload(localized),
    {
      render: false,
      diff: false,
      recursive: true,
      merpUiCompendiumMaterialize: true
    }
  );

  return { action: "localized", language: contentLanguage() };
}

export async function relocalizeImportedCompendiumItems({ notify = false } = {}) {
  const items = [
    ...(game.items?.contents ?? []),
    ...(game.actors?.contents ?? []).flatMap((actor) => [...(actor.items ?? [])])
  ].filter((item) => Boolean(merpFlags(item)?.compendiumPack));

  const journals = (game.journal?.contents ?? []).filter(
    (journal) => Boolean(merpFlags(journal)?.compendiumPack)
  );

  let updatedItems = 0;
  for (const item of items) {
    const result = await materializeCompendiumItem(item);
    if (!result?.skipped) updatedItems += 1;
  }

  let updatedJournals = 0;
  for (const journal of journals) {
    const result = await materializeCompendiumJournal(journal);
    if (!result?.skipped) updatedJournals += 1;
  }

  if (notify) {
    ui.notifications.info(
      `MERP UI : ${updatedItems} Item(s) et ${updatedJournals} Journal(aux) ` +
      "importé(s) depuis les Compendiums actualisé(s)."
    );
  }

  return {
    updatedItems,
    updatedJournals,
    items: items.length,
    journals: journals.length,
    language: contentLanguage()
  };
}


const MERP_COMPENDIUM_LABELS = Object.freeze({
  "merp-rmu-races": { fr: "MERP-RMU — Races", en: "MERP-RMU — Races" },
  "merp-rmu-cultures": { fr: "MERP-RMU — Cultures", en: "MERP-RMU — Cultures" },
  "merp-rmu-professions": { fr: "MERP-RMU — Professions", en: "MERP-RMU — Professions" },
  "merp-rmu-skills": { fr: "MERP-RMU — Compétences", en: "MERP-RMU — Skills" },
  "merp-rmu-spell-lists": { fr: "MERP-RMU — Listes de Sorts", en: "MERP-RMU — Spell Lists" },
  "merp-rmu-talents-flaws": { fr: "MERP-RMU — Talents & Défauts", en: "MERP-RMU — Talents & Flaws" },
  "merp-rmu-herbs": { fr: "MERP-RMU — Herbes & Substances", en: "MERP-RMU — Herbs & Substances" },
  "merp-rmu-languages": { fr: "MERP-RMU — Langues", en: "MERP-RMU — Languages" },
  "merp-rmu-rules": { fr: "MERP-RMU — Règles & Références", en: "MERP-RMU — Rules & References" }
});

const MERP_COMPENDIUM_PACKS = [
  "merp-rmu-races",
  "merp-rmu-cultures",
  "merp-rmu-professions",
  "merp-rmu-skills",
  "merp-rmu-spell-lists",
  "merp-rmu-talents-flaws",
  "merp-rmu-herbs",
  "merp-rmu-languages",
  "merp-rmu-rules"
];

function modulePack(packName) {
  return game.packs?.get(`${MODULE_ID}.${packName}`)
    ?? game.packs?.get(packName)
    ?? null;
}

// CLEAN-38b — The localized-library pass and the source-manifest pass both
// temporarily unlock module compendiums.  Their independent queues used to
// permit one pass to lock a pack while the other was updating its documents.
// Serialize the *whole* maintenance passes, including their folder operations.
// A rejected task must not prevent a later language change from running.
let compendiumMaintenanceQueue = Promise.resolve();

export function queueCompendiumMaintenance(operation) {
  const current = compendiumMaintenanceQueue.then(operation);
  compendiumMaintenanceQueue = current.then(
    () => undefined,
    () => undefined
  );
  return current;
}

async function withUnlockedPack(pack, callback) {
  const wasLocked = Boolean(pack.locked ?? pack.metadata?.locked);
  if (wasLocked && typeof pack.configure === "function") {
    await pack.configure({ locked: false });
  }
  try {
    return await callback();
  } finally {
    if (wasLocked && typeof pack.configure === "function") {
      await pack.configure({ locked: true });
    }
  }
}

function localizedFolderPath(flags, language) {
  const path = flags?.compendiumFolderPath ?? {};
  const localized = path?.[language] ?? path?.fr ?? path?.en ?? [];
  return Array.isArray(localized) ? localized : [];
}

function folderKeyPath(flags) {
  const keys = flags?.compendiumFolderKeyPath ?? [];
  return Array.isArray(keys) ? keys : [];
}


function canonicalCultureFolderKey(key) {
  const value = String(key ?? "").trim();
  if (!value) return value;

  const ageMatch = value.match(
    /^cultures-age-[1-4]-(dunedain|khazad|humans|elves|hobbits|restricted)$/
  );
  if (ageMatch) return `cultures-${ageMatch[1]}`;

  return value;
}

function canonicalCultureFolderName(key, language) {
  const names = {
    "cultures-dunedain": { fr: "Dúnedain", en: "Dúnedain" },
    "cultures-khazad": { fr: "Khazâd", en: "Khazâd" },
    "cultures-humans": { fr: "Humains", en: "Humans" },
    "cultures-elves": { fr: "Elfes", en: "Elves" },
    "cultures-hobbits": { fr: "Hobbits", en: "Hobbits" },
    "cultures-restricted": { fr: "Restreint", en: "Restricted" }
  };
  const lang = language === "fr" ? "fr" : "en";
  return names[key]?.[lang] ?? null;
}

async function collapseCultureFolderDuplicates(pack, language) {
  if (!pack || pack.collection !== `${MODULE_ID}.merp-rmu-cultures`) {
    return { skipped: true, reason: "not-cultures" };
  }

  const folders = [...(pack.folders?.contents ?? [])];
  const groups = new Map();

  for (const folder of folders) {
    const rawKey = folder.getFlag?.(MODULE_ID, "compendiumFolderKey");
    if (!rawKey) continue;

    const canonicalKey = canonicalCultureFolderKey(rawKey);
    if (!canonicalKey.startsWith("cultures-")) continue;

    const list = groups.get(canonicalKey) ?? [];
    list.push(folder);
    groups.set(canonicalKey, list);
  }

  let mergedFolders = 0;
  let movedDocuments = 0;
  let movedChildren = 0;

  for (const [canonicalKey, group] of groups.entries()) {
    if (!group.length) continue;

    // Prefer a folder already using the canonical technical key.
    const canonical =
      group.find((folder) =>
        folder.getFlag?.(MODULE_ID, "compendiumFolderKey") === canonicalKey
      ) ??
      [...group].sort((a, b) => String(a.id).localeCompare(String(b.id)))[0];

    const expectedName = canonicalCultureFolderName(canonicalKey, language);
    const canonicalUpdate = {
      [`flags.${MODULE_ID}.compendiumFolderKey`]: canonicalKey
    };
    if (expectedName && canonical.name !== expectedName) {
      canonicalUpdate.name = expectedName;
    }
    await canonical.update(canonicalUpdate, { render: false });

    for (const duplicate of group) {
      if (duplicate.id === canonical.id) continue;

      // Move every document currently assigned to the duplicate Folder.
      const index = await pack.getIndex({ fields: ["folder"] });
      for (const entry of index) {
        const folderId = entry.folder?.id ?? entry.folder ?? null;
        if (folderId !== duplicate.id) continue;

        const document = await pack.getDocument(entry._id);
        await document.update(
          { folder: canonical.id },
          { render: false, merpUiCompendiumPackMaintenance: true }
        );
        movedDocuments += 1;
      }

      // Preserve any nested folders, although Culture folders should normally
      // be one level deep.
      for (const child of [...(pack.folders?.contents ?? [])]) {
        const parentId = child.folder?.id ?? child.folder ?? null;
        if (parentId !== duplicate.id) continue;
        await child.update({ folder: canonical.id }, { render: false });
        movedChildren += 1;
      }

      await duplicate.delete({ render: false });
      mergedFolders += 1;
    }
  }

  return {
    mergedFolders,
    movedDocuments,
    movedChildren
  };
}

async function ensurePackFolder(pack, { key, name, parent = null }) {
  const folders = pack.folders?.contents ?? [];
  let existing = folders.find((folder) =>
    folder.getFlag?.(MODULE_ID, "compendiumFolderKey") === key
  ) ?? null;

  if (!existing) {
    existing = await Folder.create({
      name,
      type: pack.documentName,
      folder: parent?.id ?? null,
      sorting: "a",
      flags: {
        [MODULE_ID]: {
          compendiumFolderKey: key
        }
      }
    }, {
      pack: pack.collection,
      renderSheet: false
    });
  } else {
    const update = {};
    if (existing.name !== name) update.name = name;
    const currentParent = existing.folder?.id ?? existing.folder ?? null;
    const expectedParent = parent?.id ?? null;
    if (currentParent !== expectedParent) update.folder = expectedParent;
    if (Object.keys(update).length) {
      await existing.update(update, { render: false });
    }
  }

  return existing;
}


async function removeObsoleteManagedPackFolders(pack, validKeys) {
  const folders = [...(pack.folders?.contents ?? [])];
  const removable = folders
    .filter((folder) => {
      const key = folder.getFlag?.(MODULE_ID, "compendiumFolderKey");
      if (!key || validKeys.has(key)) return false;

      const hasDocuments = (pack.index ?? []).some((entry) => {
        const folderId = entry.folder?.id ?? entry.folder ?? null;
        return folderId === folder.id;
      });
      const hasChildren = folders.some((child) => {
        const parentId = child.folder?.id ?? child.folder ?? null;
        return parentId === folder.id;
      });

      return !hasDocuments && !hasChildren;
    })
    .sort((a, b) => {
      const depth = (folder) => {
        let current = folder;
        let d = 0;
        const seen = new Set();
        while (current?.folder && !seen.has(current.id)) {
          seen.add(current.id);
          const pid = current.folder?.id ?? current.folder;
          current = pack.folders?.get?.(pid);
          d += 1;
        }
        return d;
      };
      return depth(b) - depth(a);
    });

  let deleted = 0;
  for (const folder of removable) {
    try {
      await folder.delete({ render: false });
      deleted += 1;
    } catch (error) {
      console.warn(
        `${MODULE_ID} | Impossible de supprimer l’ancien dossier de Compendium ${folder.name}`,
        error
      );
    }
  }

  return deleted;
}

async function organizeCompendiumPack(pack, language) {
  if (!pack) return { skipped: true, reason: "missing-pack" };

  return withUnlockedPack(pack, async () => {
    const cultureFolderRepair =
      await collapseCultureFolderDuplicates(pack, language);

    const index = await pack.getIndex({
      fields: [
        "folder",
        "flags.merp-ui.compendiumFolderPath",
        "flags.merp-ui.compendiumFolderKeyPath"
      ]
    });

    const folderCache = new Map();
    const validFolderKeys = new Set();
    let moved = 0;

    for (const entry of index) {
      const flags = entry.flags?.[MODULE_ID] ?? {};
      const keys = folderKeyPath(flags);
      const names = localizedFolderPath(flags, language);
      if (!keys.length || !names.length) continue;

      let parent = null;
      const cumulative = [];
      for (let i = 0; i < Math.min(keys.length, names.length); i += 1) {
        cumulative.push(keys[i]);
        const pathKey = cumulative.join("/");
        validFolderKeys.add(pathKey);
        let folder = folderCache.get(pathKey);
        if (!folder) {
          folder = await ensurePackFolder(pack, {
            key: pathKey,
            name: names[i],
            parent
          });
          folderCache.set(pathKey, folder);
        }
        parent = folder;
      }

      const expected = parent?.id ?? null;
      const current = entry.folder?.id ?? entry.folder ?? null;
      if (expected && current !== expected) {
        const document = await pack.getDocument(entry._id);
        await document.update(
          { folder: expected },
          { render: false, merpUiCompendiumPackMaintenance: true }
        );
        moved += 1;
      }
    }

    const deletedObsoleteFolders =
      await removeObsoleteManagedPackFolders(pack, validFolderKeys);

    return {
      pack: pack.collection,
      moved,
      deletedObsoleteFolders,
      cultureFolderRepair
    };
  });
}

async function localizeCompendiumPack(pack, language) {
  if (!pack) return { skipped: true, reason: "missing-pack" };

  return withUnlockedPack(pack, async () => {
    const index = await pack.getIndex({
      fields: ["name", "flags.merp-ui.compendiumLocalizations"]
    });

    let updated = 0;
    for (const entry of index) {
      const localizations =
        entry.flags?.[MODULE_ID]?.compendiumLocalizations ?? {};
      if (!localizations || !Object.keys(localizations).length) continue;

      const document = await pack.getDocument(entry._id);
      const source = document.toObject();
      const localized = pack.documentName === "JournalEntry"
        ? localizeJournalDocument(source, localizations, language)
        : localizeManagedDocument(source, localizations, language);

      if (pack.documentName === "JournalEntry") {
        for (const page of localized.pages ?? []) {
          page.title ??= {};
          page.title.show = false;
        }
      }

      await document.update(updatePayload(localized), {
        render: false,
        diff: false,
        recursive: true,
        merpUiCompendiumPackMaintenance: true
      });
      updated += 1;
    }

    return { pack: pack.collection, updated, language };
  });
}

/** Organize newly added documents without relocalizing unrelated libraries. */
export async function organizeUpdatedCompendium(packName, language = contentLanguage()) {
  if (!MERP_COMPENDIUM_PACKS.includes(packName)) throw Error(`Unknown MERP-RMU pack ${packName}`);
  const pack = modulePack(packName);
  if (!pack) throw Error(`Missing MERP-RMU pack ${packName}`);
  return organizeCompendiumPack(pack, language);
}

async function synchronizeCompendiumLibrariesNow({
  language = contentLanguage(),
  notify = false,
  // Use after source-driven localization: avoid rewriting all 455 documents
  // a second time. Folder names and open-compendium windows still refresh.
  skipDocumentLocalization = false
} = {}) {
  if (!game.user?.isGM) return { skipped: true, reason: "not-gm" };

  const effectiveLanguage = language === "en" ? "en" : "fr";
  const results = [];

  for (const packName of MERP_COMPENDIUM_PACKS) {
    const pack = modulePack(packName);
    if (!pack) {
      results.push({ pack: packName, skipped: true, reason: "missing-pack" });
      continue;
    }

    const label =
      MERP_COMPENDIUM_LABELS[packName]?.[effectiveLanguage] ??
      MERP_COMPENDIUM_LABELS[packName]?.en ??
      pack.title;

    const localized = skipDocumentLocalization
      ? { skipped: true, reason: "already-localized-by-source-sync" }
      : await localizeCompendiumPack(pack, effectiveLanguage);
    const organized = await organizeCompendiumPack(pack, effectiveLanguage);
    results.push({ pack: packName, label, localized, organized });
  }

  try {
    ui.compendium?.render?.({ force: true });
  } catch (_) {
    try { ui.compendium?.render?.(true); } catch (_) {}
  }

  for (const packName of MERP_COMPENDIUM_PACKS) {
    const pack = modulePack(packName);
    const rawApps = pack?.apps ?? [];
    const apps = Array.isArray(rawApps)
      ? rawApps
      : rawApps instanceof Map
        ? [...rawApps.values()]
        : typeof rawApps === "object"
          ? Object.values(rawApps)
          : [];

    for (const app of apps) {
      try {
        await app?.render?.({ force: true });
      } catch (_) {
        try { app?.render?.(true); } catch (_) {}
      }
    }
  }

  if (notify) {
    ui.notifications.info(
      `MERP UI : Compendiums synchronisés en ` +
      `${effectiveLanguage === "en" ? "anglais" : "français"}.`
    );
  }

  return { language: effectiveLanguage, packs: results };
}

export function synchronizeCompendiumLibraries(options = {}) {
  return queueCompendiumMaintenance(() => synchronizeCompendiumLibrariesNow(options));
}

function htmlRoot(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  if (html?.element instanceof HTMLElement) return html.element;
  return null;
}

export function localizedCompendiumLabel(packName, language = contentLanguage()) {
  const effectiveLanguage = language === "fr" ? "fr" : "en";
  return (
    MERP_COMPENDIUM_LABELS[packName]?.[effectiveLanguage] ??
    MERP_COMPENDIUM_LABELS[packName]?.en ??
    null
  );
}

function packNameFromCollection(collection) {
  const value = String(collection ?? "");
  if (!value) return null;
  const prefix = `${MODULE_ID}.`;
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

/**
 * Resolve ONLY a MERP-UI Compendium window. A JournalEntry or Item sheet
 * opened FROM a pack has a document.compendium property too, but must keep
 * its own document title.
 */
function compendiumWindowPackName(app) {
  const CompendiumApp = foundry?.applications?.sidebar?.apps?.Compendium;
  if (CompendiumApp && !(app instanceof CompendiumApp)) return null;

  const source = app?.collection;
  const collection = typeof source === "string"
    ? source
    : source?.collection ?? source?.metadata?.id ??
      (source?.metadata?.packageName && source?.metadata?.name
        ? `${source.metadata.packageName}.${source.metadata.name}` : null);

  if (typeof collection !== "string" || !collection.startsWith(`${MODULE_ID}.`)) {
    return null;
  }
  const name = packNameFromCollection(collection);
  return Object.hasOwn(MERP_COMPENDIUM_LABELS, name) ? name : null;
}

/**
 * Foundry V14 generates a Compendium window heading from app.title on EVERY
 * render. Repainting the DOM after render isn't sufficient: a subsequent
 * render can restore the untranslated label from module.json. Override the
 * application title GETTER, strictly for our nine packs, leaving every other
 * compendium and all document windows untouched.
 *
 * This changes only the displayed label. No pack configuration or LevelDB
 * document is written, and Foundry retains the original getter as fallback.
 */
const TITLE_GETTER_PATCH = Symbol.for("merp-ui.localized-compendium-title-v1");
export function installLocalizedCompendiumWindowTitleGetter() {
  const App = foundry?.applications?.sidebar?.apps?.Compendium;
  const proto = App?.prototype;
  if (!proto) return false;
  if (Object.hasOwn(proto, TITLE_GETTER_PATCH)) return true;

  let parent = proto;
  let original = null;
  while (parent && !original) {
    const descriptor = Object.getOwnPropertyDescriptor(parent, "title");
    if (typeof descriptor?.get === "function") original = descriptor;
    parent = Object.getPrototypeOf(parent);
  }
  if (!original) return false;

  Object.defineProperty(proto, "title", {
    configurable: true,
    enumerable: original.enumerable ?? false,
    get() {
      const name = compendiumWindowPackName(this);
      const translated = name && localizedCompendiumLabel(name);
      return translated ?? original.get.call(this);
    }
  });
  Object.defineProperty(proto, TITLE_GETTER_PATCH, { value: true });
  return true;
}

/** Repaint already-open Compendium windows when the MERP-UI language changes. */
export function refreshLocalizedCompendiumWindowTitles({ language = contentLanguage() } = {}) {
  installLocalizedCompendiumWindowTitleGetter();
  const candidates = new Set();
  for (const name of MERP_COMPENDIUM_PACKS) {
    const pack = modulePack(name);
    const apps = pack?.apps;
    if (apps instanceof Map || apps instanceof Set) {
      for (const app of apps.values()) candidates.add(app);
    } else if (Array.isArray(apps)) {
      for (const app of apps) candidates.add(app);
    } else if (apps && typeof apps === "object") {
      for (const app of Object.values(apps)) candidates.add(app);
    }
  }

  // ApplicationV2 also exposes a registry of live instances in V14.
  const App = foundry?.applications?.sidebar?.apps?.Compendium;
  const instances = App?.instances;
  if (instances instanceof Map || instances instanceof Set) {
    for (const app of instances.values()) candidates.add(app);
  } else if (Array.isArray(instances)) {
    for (const app of instances) candidates.add(app);
  }

  let updated = 0;
  for (const app of candidates) {
    const name = compendiumWindowPackName(app);
    if (!name) continue;
    const label = localizedCompendiumLabel(name, language);
    const heading = app?.window?.title ??
      app?.element?.querySelector?.(":scope > header .window-title");
    if (!heading || heading.textContent === label) continue;
    heading.textContent = label;
    heading.title = label;
    updated += 1;
  }
  return { language, updated };
}

export function localizeCompendiumDirectoryLabels(
  html,
  { language = contentLanguage() } = {}
) {
  const root = htmlRoot(html);
  if (!root) return { updated: 0 };

  let updated = 0;

  for (const [packName] of Object.entries(MERP_COMPENDIUM_LABELS)) {
    const collection = `${MODULE_ID}.${packName}`;
    const label = localizedCompendiumLabel(packName, language);
    if (!label) continue;

    const selectors = [
      `[data-pack="${collection}"]`,
      `[data-entry-id="${collection}"]`,
      `[data-collection="${collection}"]`,
      `[data-pack="${packName}"]`,
      `[data-entry-id="${packName}"]`
    ];

    const entries = new Set(
      selectors.flatMap((selector) => [...root.querySelectorAll(selector)])
    );

    for (const entry of entries) {
      const candidates = [
        entry.querySelector(".compendium-name"),
        entry.querySelector(".entry-name"),
        entry.querySelector(".document-name"),
        entry.querySelector("h3"),
        entry.querySelector("h4"),
        entry.querySelector("a")
      ].filter(Boolean);

      const target = candidates.find((element) => {
        const text = String(element.textContent ?? "").trim();
        return text.startsWith("MERP-RMU");
      }) ?? candidates[0];

      if (!target) continue;
      if (target.textContent !== label) {
        target.textContent = label;
        updated += 1;
      }
      target.setAttribute("title", label);
    }
  }

  return { updated };
}

/**
 * Localize the title of an OPEN compendium window without modifying pack
 * metadata or its documents. Foundry V14 passes the inner content to the
 * render hook; the window heading itself lives outside that content.
 * ApplicationV2.window.title is the supported reference to that heading.
 */
function localizeOpenCompendiumTitle(app, html) {
  installLocalizedCompendiumWindowTitleGetter();
  const packName = compendiumWindowPackName(app);
  if (!packName) return;

  const pack = modulePack(packName);
  const root = htmlRoot(html);
  const frame = app?.element instanceof HTMLElement
    ? app.element
    : root?.closest?.(".application") ?? null;

  // RC3: marquer les neuf fenêtres MERP-RMU pour la typographie compacte.
  // Ne jamais appliquer ce style aux compendiums RMU ou d’autres modules.
  frame?.classList?.add("merp-ui-compendium");

  if (pack?.documentName === "JournalEntry") {
    frame?.classList?.add("merp-ui-journal-compendium");
  }

  const paint = () => {
    const label = localizedCompendiumLabel(packName);
    if (!label) return;
    const title = app?.window?.title ??
      frame?.querySelector?.(":scope > header .window-title");
    if (title && title.textContent !== label) {
      title.textContent = label;
      title.title = label;
    }
  };
  paint();
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      if (app?.rendered !== false) paint();
    });
  }
}

export function registerCompendiumContentHooks() {
  // Modules can load before ApplicationV2 classes are finalized; retry at
  // init and ready as well as immediately, but never wrap the getter twice.
  installLocalizedCompendiumWindowTitleGetter();
  Hooks.once("init", installLocalizedCompendiumWindowTitleGetter);
  Hooks.once("ready", installLocalizedCompendiumWindowTitleGetter);

  Hooks.on("renderCompendiumDirectory", (app, html) => {
    localizeCompendiumDirectoryLabels(html);
  });

  // Foundry V13/V14 compendium windows use ApplicationV2. Their window titles
  // are not always updated by the legacy renderCompendium hook.
  Hooks.on("renderApplicationV2", (app, html) => {
    if (app?.collection || app?.options?.collection) {
      localizeOpenCompendiumTitle(app, html);
    }
  });

  Hooks.on("renderCompendium", (app, html) => {
    localizeOpenCompendiumTitle(app, html);

    const collection =
      app?.collection?.collection ??
      app?.document?.compendium?.collection ??
      app?.options?.collection ??
      null;
  });

  Hooks.on("preCreateItem", (item, data, options, userId) => {
    if (userId !== game.user?.id) return;
    if (!data?.flags?.[MODULE_ID]?.compendiumPack) return;
    const validation = validateCompendiumAgeDrop(data, { notify: true });
    if (!validation.allowed) return false;
  });

  Hooks.on("createItem", (item, options, userId) => {
    if (userId !== game.user?.id) return;
    if (options?.merpUiCompendiumMaterialize) return;
    if (!merpFlags(item)?.compendiumPack) return;

    materializeCompendiumItem(item, options).catch((error) => {
      console.error(
        `${MODULE_ID} | Impossible de matérialiser l’Item de Compendium`,
        item,
        error
      );
      ui.notifications.error(
        "MERP UI : impossible de finaliser le contenu glissé depuis le Compendium. Consultez F12."
      );
    });
  });

  Hooks.on("createJournalEntry", (journal, options, userId) => {
    if (userId !== game.user?.id) return;
    if (options?.merpUiCompendiumMaterialize) return;
    if (!merpFlags(journal)?.compendiumPack) return;

    materializeCompendiumJournal(journal, options).catch((error) => {
      console.error(
        `${MODULE_ID} | Impossible de localiser le Journal de Compendium`,
        journal,
        error
      );
    });
  });
}


/**
 * CLEAN-41f — Small immutable bilingual index derived from all distributed
 * Race/Culture/Profession definitions (93 canonical documents).  The earlier
 * helper used khazad.json, which does not contain all professions (including
 * the Honnin Priest), so completed character sheets were not all translated.
 * Loading this one compact index avoids reading all Compendium documents.
 */
let actorIdentityTranslationsPromise = null;
async function actorIdentityTranslations() {
  if (!actorIdentityTranslationsPromise) {
    const file = `modules/${MODULE_ID}/data/merp-rmu/identity-localizations.json`;
    const url = foundry?.utils?.getRoute ? foundry.utils.getRoute(file) : file;
    actorIdentityTranslationsPromise = fetch(url, {
      credentials: "same-origin", cache: "no-store"
    }).then(response => {
      if (!response.ok) throw new Error(`Identity translations: HTTP ${response.status}`);
      return response.json();
    }).then(data => {
      if (!Array.isArray(data?.entries)) throw new Error("Invalid identity translation index");
      return data.entries;
    }).catch(error => {
      actorIdentityTranslationsPromise = null;
      throw error;
    });
  }
  return actorIdentityTranslationsPromise;
}

/**
 * Translate only embedded Race / Culture / Profession Item *names*.  Never
 * change their RMU system data, rolls, skills, ranks, talents or the Actor's
 * editable name.  An explicit customized Item name is left untouched.
 * Both character-creation and finished Actors are handled identically.
 */
export async function relocalizeActorIdentityItems(_data, {
  language = contentLanguage()
} = {}) {
  const locale = language === "en" ? "en" : "fr";
  const definitions = await actorIdentityTranslations();
  const byKey = new Map();
  const byKnownName = new Map();
  for (const entry of definitions) {
    if (!["race", "culture", "profession"].includes(entry?.type)) continue;
    for (const key of entry.keys ?? []) {
      const lookup = `${entry.type}:${key}`;
      if (!byKey.has(lookup)) byKey.set(lookup, entry);
    }
    for (const name of new Set(Object.values(entry.names ?? {}))) {
      if (!name) continue;
      const lookup = `${entry.type}:${name}`;
      const previous = byKnownName.get(lookup) ?? [];
      previous.push(entry);
      byKnownName.set(lookup, previous);
    }
  }

  const result = { scanned: 0, updated: 0, actors: 0, unmatched: 0, errors: [] };
  for (const actor of game.actors?.contents ?? []) {
    const updates = [];
    for (const item of actor.items ?? []) {
      if (!["race", "culture", "profession"].includes(item.type)) continue;
      result.scanned++;
      const flags = item.flags?.[MODULE_ID] ?? {};
      const keys = [flags.compendiumSourceKey, flags.key, flags.canonicalKey]
        .filter(Boolean);
      const candidates = [];
      for (const key of keys) {
        const entry = byKey.get(`${item.type}:${key}`);
        if (entry && !candidates.includes(entry)) candidates.push(entry);
      }
      for (const entry of byKnownName.get(`${item.type}:${item.name}`) ?? []) {
        if (!candidates.includes(entry)) candidates.push(entry);
      }
      // Exact source-name match protects GM renames, even when an old Item
      // retains a canonicalKey or a Compendium origin flag.
      const exactMatches = candidates.filter(entry =>
        Object.values(entry.names ?? {}).includes(item.name) &&
        typeof entry.names?.[locale] === "string"
      );
      const translations = [...new Set(exactMatches.map(entry => entry.names[locale]))];
      // If two different sources share the old name but translate differently,
      // don't guess a target language label without unambiguous identity flags.
      if (translations.length !== 1) {
        result.unmatched++;
        continue;
      }
      const wanted = translations[0];
      if (item.name !== wanted) updates.push({ _id: item.id, name: wanted });
    }
    if (!updates.length) continue;
    try {
      await actor.updateEmbeddedDocuments("Item", updates, {
        merpUiLocalizationRefresh: true
      });
      result.updated += updates.length;
      result.actors++;
      // Some completed RMU sheets cache prepared header labels.  Explicitly
      // repaint an open sheet after its embedded Items have been updated.
      if (actor.sheet?.rendered) {
        try { actor.sheet.render({ force: true }); } catch (_) { /* sheet handles its own rendering */ }
      }
    } catch (error) {
      result.errors.push({ actor: actor.id, message: String(error) });
      console.warn(`${MODULE_ID} | Impossible de traduire les noms du personnage ${actor.name}`, error);
    }
  }
  return result;
}
