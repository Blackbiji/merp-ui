import {
  contentLanguage,
  localizeManagedDocument
} from "./localization.js";
import { localizeJournalDocument } from "./content-localization.js";
import { resolveNativeProfessionDocument } from "./professions.js";
import { compactPendingActorIdentities, compactCreatedActorIdentity } from "./embedded-identity-compaction.js";

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

  // Apply Age-dependent RMU mechanics and source localization first, while
  // the original Compendium metadata is still available on the pending Item.
  // Afterwards compact ONLY Actor-embedded identity Items. World Items and
  // Compendiums keep their complete multilingual / historical reference data.
  let result;
  if (nativeProfessionDefinition(item)) {
    result = await resolveNativeProfession(item);
  } else if (compendiumAgeVariants(item)) {
    result = await applyAgeVariant(item);
  } else {
    result = await localizeImportedCompendiumItem(item);
  }

  // If a native chassis / Age variant failed to resolve, preserve metadata
  // so the GM can retry; never sacrifice character mechanics to save space.
  if (result?.action !== "source-missing" && result?.action !== "unavailable-age") {
    const compact = await compactCreatedActorIdentity(item);
    if (compact.compacted) result = { ...result, compact };
  }
  return result;
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
  "merp-rmu-races": { fr: "MERP-ui — Races", en: "MERP-ui — Races" },
  "merp-rmu-cultures": { fr: "MERP-ui — Cultures", en: "MERP-ui — Cultures" },
  "merp-rmu-professions": { fr: "MERP-ui — Professions", en: "MERP-ui — Professions" },
  "merp-rmu-skills": { fr: "MERP-ui — Compétences", en: "MERP-ui — Skills" },
  "merp-rmu-spell-lists": { fr: "MERP-ui — Listes de Sorts", en: "MERP-ui — Spell Lists" },
  "merp-rmu-talents-flaws": { fr: "MERP-ui — Talents & Défauts", en: "MERP-ui — Talents & Flaws" },
  "merp-rmu-herbs": { fr: "MERP-ui — Herbes & Substances", en: "MERP-ui — Herbs & Substances" },
  "merp-rmu-languages": { fr: "MERP-ui — Langues", en: "MERP-ui — Languages" },
  "merp-rmu-rules": { fr: "MERP-ui — Règles & Références", en: "MERP-ui — Rules & References" },
  "merp-ui-lore": { fr: "MERP-ui — Connaissance des créatures", en: "MERP-ui — Creature Lore" },
  "merp-ui-creatures": { fr: "MERP-ui — Bestiaire des Terres du Milieu", en: "MERP-ui — Creatures of Middle-earth" }
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

// Names from module.json are intentionally canonical and may be bilingual.
// Only what Foundry displays in a client is localized: never rewrite a pack,
// UUID, RollTable or embedded TableResult.
const MERP_ORIGINAL_BILINGUAL_LABELS = Object.freeze({
  "merp-ui-lore": "Connaissance des Créatures / Creature Lore",
  "merp-ui-creatures": "Bestiaire des Terres du Milieu / Creatures of Middle-earth"
});
const MERP_LORE_INDEX_TITLES = Object.freeze({
  "Loup / Wolf — Creature Lore": {
    fr: "Loup — Connaissance des créatures", en: "Wolf — Creature Lore"
  },
  "Warg / Ouargue — Creature Lore": {
    fr: "Ouargue — Connaissance des créatures", en: "Warg — Creature Lore"
  }
});

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
 * application title GETTER, strictly for MERP-UI's eleven packs, leaving every other
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
  applyLocalizedCompendiumPackTitles(language);
  const candidates = new Set();
  for (const name of Object.keys(MERP_COMPENDIUM_LABELS)) {
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

// Runtime-only pack titles: Foundry V14 renders the CompendiumDirectory from
// CompendiumCollection.title, NOT by inspecting the old sidebar DOM labels.
// Assign a getter to our own pack instances only; never call configure(),
// update(), or change the metadata persisted by Foundry.
const MERP_RUNTIME_TITLE = Symbol.for("merp-ui.compendium-display-title-v2");
export function applyLocalizedCompendiumPackTitles(language = contentLanguage()) {
  let updated = 0;
  for (const packName of Object.keys(MERP_COMPENDIUM_LABELS)) {
    const pack = modulePack(packName);
    if (!pack) continue;
    const label = localizedCompendiumLabel(packName, language);
    if (!label) continue;

    // The title getter is the API read by native V14 sidebar applications.
    // Leave the original CompendiumCollection prototype untouched.
    if (!pack[MERP_RUNTIME_TITLE]) {
      try {
        Object.defineProperty(pack, "title", {
          configurable: true,
          get() { return localizedCompendiumLabel(packName); }
        });
        Object.defineProperty(pack, MERP_RUNTIME_TITLE, { value: true });
      } catch (error) {
        console.warn(`${MODULE_ID} | Localized pack title getter unavailable for ${packName}`, error);
      }
    }
    // Some native partials read metadata.label rather than pack.title.
    // This is an in-memory UI field, not a module.json or database write.
    try {
      if (pack.metadata && pack.metadata.label !== label) pack.metadata.label = label;
    } catch (_) { /* guarded by the instance title getter above */ }
    updated++;
  }
  return { language, updated };
}

function merpCompendiumLabelAliases(language = contentLanguage()) {
  const aliases = new Map();
  // module.json still declares the legacy parent Pack Folder. Translate the
  // *directory caption* only: renaming the physical Folder may duplicate it
  // in existing Worlds and is not required to correct the sidebar.
  aliases.set("MERP-RMU", "MERP-ui");
  aliases.set("MERP-UI", "MERP-ui");
  for (const [packName, names] of Object.entries(MERP_COMPENDIUM_LABELS)) {
    const target = localizedCompendiumLabel(packName, language);
    // Also recognize the nine unmodified module.json labels (MERP-RMU) and
    // the previously displayed MERP-UI labels; change UI text only.
    const oldLabels = [names.fr, names.en, MERP_ORIGINAL_BILINGUAL_LABELS[packName]];
    for (const current of [names.fr, names.en]) {
      oldLabels.push(current.replace(/^MERP-ui — /u, "MERP-RMU — "));
      oldLabels.push(current.replace(/^MERP-ui — /u, "MERP-UI — "));
    }
    for (const oldName of oldLabels) {
      if (oldName && oldName !== target) aliases.set(oldName, target);
    }
  }
  return aliases;
}

function merpLoreIndexAliases(language = contentLanguage()) {
  const aliases = new Map();
  for (const [canonical, names] of Object.entries(MERP_LORE_INDEX_TITLES)) {
    const localized = names[language === "en" ? "en" : "fr"];
    for (const name of [canonical, names.fr, names.en]) {
      if (name !== localized) aliases.set(name, localized);
    }
  }
  return aliases;
}

// Text-node replacement keeps native Foundry icons, action buttons, anchors
// and event handlers intact (setting element.textContent would destroy them).
function repaintKnownCompendiumText(root, aliases) {
  if (!root?.ownerDocument?.createTreeWalker || !aliases.size) return 0;
  const walker = root.ownerDocument.createTreeWalker(root, 4); // SHOW_TEXT
  const changes = [];
  let node;
  while ((node = walker.nextNode())) {
    const raw = node.nodeValue ?? "";
    const trimmed = raw.trim();
    const target = aliases.get(trimmed);
    if (!target || !trimmed) continue;
    changes.push([node, raw.replace(trimmed, target)]);
  }
  for (const [textNode, value] of changes) textNode.nodeValue = value;
  return changes.length;
}

// Foundry V14 can lazily replace a directory row after the initial render.
// Install one observer per actual directory/root, with no polling and no
// observer attached to document.body or unrelated applications.
const MERP_LOCALE_OBSERVERS = new WeakMap();
function watchCompendiumDisplay(root, getAliases) {
  if (!root || typeof MutationObserver !== "function") return;
  let observer = MERP_LOCALE_OBSERVERS.get(root);
  if (observer) return;
  observer = new MutationObserver(() => {
    repaintKnownCompendiumText(root, getAliases());
  });
  observer.observe(root, { childList: true, characterData: true, subtree: true });
  MERP_LOCALE_OBSERVERS.set(root, observer);
}

export function localizeCompendiumDirectoryLabels(
  html,
  { language = contentLanguage() } = {}
) {
  const root = htmlRoot(html);
  if (!root) return { updated: 0 };
  applyLocalizedCompendiumPackTitles(language);
  const updated = repaintKnownCompendiumText(root, merpCompendiumLabelAliases(language));
  watchCompendiumDisplay(root, merpCompendiumLabelAliases);
  return { updated };
}

function localizeLoreCompendiumIndex(app, html) {
  if (compendiumWindowPackName(app) !== "merp-ui-lore") return;
  const root = htmlRoot(app?.element) ?? htmlRoot(html);
  if (!root) return;
  repaintKnownCompendiumText(root, merpLoreIndexAliases());
  watchCompendiumDisplay(root, merpLoreIndexAliases);
}

// The original Rules pack retains legacy journal and folder names. Render
// their labels using the selected MERP-ui *content* language, not Foundry's
// interface language. Keep Folder IDs, Journal names, source flags and pages.
const MERP_RULES_PRESENTATION_FR = "Présentation de MERP-ui";
const MERP_RULES_PRESENTATION_EN = "MERP-ui Presentation";
const MERP_RULES_PRESENTATION_ALIASES = [
  "MERP-RMU Presentation",
  "Présentation de MERP-RMU",
  "Présentation de MERP - RMU",
  MERP_RULES_PRESENTATION_FR,
  MERP_RULES_PRESENTATION_EN
];

export function localizedMerpRulesIndexName(name, language = contentLanguage()) {
  const source = String(name ?? "");
  const normalized = source.trim();
  // Both source and Foundry output can use a hyphen, en dash or em dash.
  const match = normalized.match(/^(0\s*[-–—]\s*)?(.+)$/u);
  const leading = match?.[1] ?? "";
  const value = match?.[2] ?? normalized;
  if (!MERP_RULES_PRESENTATION_ALIASES.includes(value)) return source;
  const target = language === "fr" ? MERP_RULES_PRESENTATION_FR : MERP_RULES_PRESENTATION_EN;
  return `${leading}${target}`;
}

function merpRulesIndexAliases(language = contentLanguage()) {
  const aliases = new Map();
  for (const name of MERP_RULES_PRESENTATION_ALIASES) {
    for (const variant of [name, `0 - ${name}`, `0 – ${name}`, `0 — ${name}`]) {
      const translated = localizedMerpRulesIndexName(variant, language);
      if (variant !== translated) aliases.set(variant, translated);
    }
  }
  return aliases;
}

function localizeMerpRulesCompendiumIndex(app, html) {
  if (compendiumWindowPackName(app) !== "merp-rmu-rules") return;
  const root = htmlRoot(app?.element) ?? htmlRoot(html);
  if (!root) return;
  repaintKnownCompendiumText(root, merpRulesIndexAliases());
  watchCompendiumDisplay(root, merpRulesIndexAliases);
}

// The native Bestiary keeps its source keys, folder documents and order.
// Change only the labels rendered in the two sections (and their 24 subfolders),
// using MERP-UI contentLanguage, not game.i18n.lang. No pack writes.
const BESTIARY_FOLDER_NUMBER = /^(\s*)[56]\.\d+(?:\.\d+)*\s*[—–-]\s*/u;
const BESTIARY_FOLDER_LABELS = [
  { fr: "Bestiaire animal", en: "Animal Glossary" },
  { fr: "Chauves-souris et Oiseaux", en: "Bats and Birds" },
  { fr: "Animaux aquatiques", en: "Water Beasts" },
  { fr: "Potili (Insectes et Araignées)", en: "Potili (Insects & Spiders)" },
  { fr: "Rávatsar (Amphibiens et Reptiles)", en: "Rávatsar (Amphibians & Reptiles)" },
  { fr: "Lassanakûni (Mangeurs de feuilles)", en: "Lassanakûni (Leaf-Eaters)" },
  { fr: "Animaux de monte et de trait", en: "Riding and Draft Animals" },
  { fr: "Apsanakûni (Carnivores)", en: "Apsanakûni (Meat-Eaters)" },
  { fr: "Autres animaux dangereux", en: "Other Dangerous Animals" },
  { fr: "Bestiaire monstrueux", en: "Monster Glossary" },
  { fr: "Monstres aquatiques démoniaques", en: "Demonic Water Monsters" },
  { fr: "Plantes animées", en: "Animate Plants" },
  { fr: "Démons", en: "Demons" },
  { fr: "Dragons", en: "Dragons" },
  { fr: "Dragons des cavernes", en: "Cave-drakes" },
  { fr: "Dragons froids", en: "Cold-drakes" },
  { fr: "Dragons de feu", en: "Fire-drakes" },
  { fr: "Dragons des eaux", en: "Water Drakes" },
  { fr: "Vers-garous", en: "Were-worms" },
  { fr: "Monstres volants", en: "Flying Monsters" },
  { fr: "Races géantes", en: "Giant Races" },
  { fr: "Géants", en: "Giants" },
  { fr: "Trolls", en: "Trolls" },
  { fr: "Créatures Pûkel", en: "Pûkel-creatures" },
  { fr: "Araignées et Insectes géants", en: "Giant Spiders and Insects" },
  { fr: "Êtres morts-vivants", en: "Undead Beings" },
];
// A reverse map also recognizes names already painted in FR or EN, so an
// open compendium can switch language without needing to reopen its folders.
const BESTIARY_FOLDER_NAMES = new Map();
for (const entry of BESTIARY_FOLDER_LABELS) {
  for (const variant of [entry.fr, entry.en,
    `${entry.fr} / ${entry.en}`, `${entry.en} / ${entry.fr}`]) {
    BESTIARY_FOLDER_NAMES.set(variant, entry);
  }
}

export function unnumberedBestiaryFolderName(name, language = contentLanguage()) {
  const raw = String(name ?? "");
  const unnumbered = raw.replace(BESTIARY_FOLDER_NUMBER, "$1");
  const candidate = unnumbered.trim();
  const names = BESTIARY_FOLDER_NAMES.get(candidate);
  if (!names) return unnumbered; // Still hide chapter numbers for future folders.
  const result = names[language === "en" ? "en" : "fr"];
  // Preserve whitespace around the original text node; only the caption
  // changes, never the Foundry folder element or its icon/interaction DOM.
  const leading = unnumbered.match(/^\s*/u)?.[0] ?? "";
  const trailing = unnumbered.match(/\s*$/u)?.[0] ?? "";
  return leading + result + trailing;
}

function repaintBestiaryFolderNames(root) {
  if (!root?.ownerDocument?.createTreeWalker) return 0;
  const walker = root.ownerDocument.createTreeWalker(root, 4); // SHOW_TEXT
  const changes = [];
  let node;
  while ((node = walker.nextNode())) {
    // Folder headers only: never change an Actor name, an index control or
    // an unrelated Compendium. Foundry V13/V14 both use folder elements.
    const folder = node.parentElement?.closest?.(
      ".folder-header, .folder-name, .folder-title, .directory-item.folder, li.folder"
    );
    if (!folder) continue;
    const source = node.nodeValue ?? "";
    const next = unnumberedBestiaryFolderName(source);
    if (next !== source) changes.push([node, next]);
  }
  for (const [node, next] of changes) node.nodeValue = next;
  return changes.length;
}

const MERP_BESTIARY_FOLDER_OBSERVERS = new WeakMap();
function watchBestiaryFolderNames(root) {
  if (!root || typeof MutationObserver !== "function") return;
  if (MERP_BESTIARY_FOLDER_OBSERVERS.has(root)) return;
  const observer = new MutationObserver(() => {
    repaintBestiaryFolderNames(root);
  });
  observer.observe(root, { childList: true, characterData: true, subtree: true });
  MERP_BESTIARY_FOLDER_OBSERVERS.set(root, observer);
}

function localizeBestiaryCompendiumIndex(app, html) {
  if (compendiumWindowPackName(app) !== "merp-ui-creatures") return;
  const root = htmlRoot(app?.element) ?? htmlRoot(html);
  if (!root) return;
  repaintBestiaryFolderNames(root);
  watchBestiaryFolderNames(root);
}

function refreshMerpCompendiumLabels() {
  applyLocalizedCompendiumPackTitles();
  const directory = ui?.compendium;
  localizeCompendiumDirectoryLabels(directory?.element);
  try { directory?.render?.({ force: true }); }
  catch (_) { try { directory?.render?.(true); } catch (_) {} }
  refreshLocalizedCompendiumWindowTitles();
  for (const app of Object.values(ui?.windows ?? {})) {
    localizeLoreCompendiumIndex(app, app?.element);
    localizeBestiaryCompendiumIndex(app, app?.element);
    localizeMerpRulesCompendiumIndex(app, app?.element);
  }
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
  applyLocalizedCompendiumPackTitles();
  localizeLoreCompendiumIndex(app, html);
  localizeBestiaryCompendiumIndex(app, html);
  localizeMerpRulesCompendiumIndex(app, html);

  const pack = modulePack(packName);
  const root = htmlRoot(html);
  const frame = app?.element instanceof HTMLElement
    ? app.element
    : root?.closest?.(".application") ?? null;

  // RC3: marquer les fenêtres des Compendiums MERP-UI pour la typographie compacte.
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
  Hooks.once("ready", () => {
    // Run after game.packs and ui.compendium exist, including clean Worlds.
    refreshMerpCompendiumLabels();
  });
  Hooks.on("updateSetting", (setting) => {
    if (setting?.key !== `${MODULE_ID}.contentLanguage`) return;
    queueMicrotask(refreshMerpCompendiumLabels);
  });

  Hooks.on("renderCompendiumDirectory", (app, html) => {
    localizeCompendiumDirectoryLabels(app?.element ?? html);
  });

  // Foundry V13/V14 compendium windows use ApplicationV2. Their window titles
  // are not always updated by the legacy renderCompendium hook.
  Hooks.on("renderApplicationV2", (app, html) => {
    if (app === ui?.compendium || app?.constructor?.name === "CompendiumDirectory") {
      localizeCompendiumDirectoryLabels(app?.element ?? html);
    }
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

  // A new Actor may arrive with pre-embedded MERP identities (including
  // the automatically injected Hildor race). Compact before the Actor is
  // persisted, without touching RMU system stats, skills or Item IDs.
  Hooks.on("preCreateActor", (actor, data, options, userId) => {
    if (userId !== game.user?.id || game.system?.id !== "rmu") return;
    try {
      compactPendingActorIdentities(actor);
    } catch (error) {
      console.warn(`${MODULE_ID} | Compaction des identités avant création d'Actor impossible`, error);
    }
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
