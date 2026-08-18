import {
  contentLanguage,
  localizedDocumentPatch,
  localizedPatchNeedsUpdate
} from "./localization.js";
import {
  folderParentId,
  localizedFolderAliases,
  localizedFolderName
} from "./content-folders.js";

const MODULE_ID = "merp-ui";

export function localizeJournalDocument(document, localizations = null, language = contentLanguage()) {
  const data = foundry.utils.deepClone(document ?? {});
  const normalized = language === "en" ? "en" : "fr";
  const localized = localizations?.[normalized] ?? null;
  if (!localized || typeof localized !== "object") return data;

  if (localized.name) data.name = localized.name;

  if (Array.isArray(localized.pages) && Array.isArray(data.pages)) {
    for (let index = 0; index < localized.pages.length; index += 1) {
      const sourcePage = localized.pages[index];
      const page = data.pages[index];
      if (!sourcePage || !page) continue;

      if (sourcePage.name) page.name = sourcePage.name;
      if (sourcePage.text?.content != null) {
        page.text = page.text ?? {};
        page.text.content = sourcePage.text.content;
      }
    }
  }

  return data;
}

export function managedDefinitionCollection(definition, fallback = null) {
  return definition?.document?.flags?.[MODULE_ID]?.collection
    ?? definition?.collection
    ?? fallback;
}

export function findManagedItemForDefinition(definition, fallbackCollection = null) {
  const collection = managedDefinitionCollection(definition, fallbackCollection);
  const byKey = game.items.filter((item) =>
    item.getFlag?.(MODULE_ID, "key") === definition?.key
  );
  return byKey.find((item) =>
    !collection || item.getFlag?.(MODULE_ID, "collection") === collection
  ) ?? byKey[0] ?? null;
}

export function findManagedJournalForDefinition(definition, fallbackCollection = null) {
  const collection = managedDefinitionCollection(definition, fallbackCollection);
  const byKey = game.journal.filter((journal) =>
    journal.getFlag?.(MODULE_ID, "key") === definition?.key
  );
  return byKey.find((journal) =>
    !collection || journal.getFlag?.(MODULE_ID, "collection") === collection
  ) ?? byKey[0] ?? null;
}

export async function applyManagedItemLocalization(definition, {
  fallbackCollection = null,
  updateOptions = {}
} = {}) {
  const patch = localizedDocumentPatch(definition?.localizations);
  if (!Object.keys(patch).length) return { action: "untranslated", item: null };

  const item = findManagedItemForDefinition(definition, fallbackCollection);
  if (!item) return { action: "missing", item: null };
  if (!localizedPatchNeedsUpdate(item, patch)) return { action: "unchanged", item };

  const flatPatch = foundry.utils.flattenObject(patch);
  await item.update(flatPatch, {
    render: false,
    merpUiLocalizationRefresh: true,
    ...updateOptions
  });
  return { action: "localized", item };
}

export async function applyManagedJournalLocalization(definition, {
  fallbackCollection = null
} = {}) {
  const patch = localizedDocumentPatch(definition?.localizations);
  if (!Object.keys(patch).length) return { action: "untranslated", journal: null, pages: 0 };

  const journal = findManagedJournalForDefinition(definition, fallbackCollection);
  if (!journal) return { action: "missing", journal: null, pages: 0 };

  let changed = false;
  if (patch.name && journal.name !== patch.name) {
    await journal.update(
      { name: patch.name },
      { render: false, merpUiLocalizationRefresh: true }
    );
    changed = true;
  }

  let pages = 0;
  if (Array.isArray(patch.pages)) {
    const pageUpdates = [];

    for (let index = 0; index < patch.pages.length; index += 1) {
      const localizedPage = patch.pages[index];
      const page = journal.pages?.contents?.[index] ?? journal.pages?.[index] ?? null;
      if (!localizedPage || !page) continue;

      const pageUpdate = { _id: page.id };
      let pageChanged = false;

      if (localizedPage.name != null && page.name !== localizedPage.name) {
        pageUpdate.name = localizedPage.name;
        pageChanged = true;
      }

      if (
        localizedPage.text?.content != null &&
        page.text?.content !== localizedPage.text.content
      ) {
        pageUpdate["text.content"] = localizedPage.text.content;
        pageChanged = true;
      }

      if (pageChanged) pageUpdates.push(pageUpdate);
    }

    if (pageUpdates.length) {
      await journal.updateEmbeddedDocuments("JournalEntryPage", pageUpdates, {
        render: false,
        merpUiLocalizationRefresh: true
      });
      pages = pageUpdates.length;
      changed = true;
    }
  }

  return {
    action: changed ? "localized" : "unchanged",
    journal,
    pages
  };
}

export async function applyFolderDefinitionLocalization(definition, type, parent = null) {
  if (!definition?.localizations) return { action: "untranslated", folder: null };

  const name = localizedFolderName(definition);
  const aliases = localizedFolderAliases(definition);
  const parentId = parent?.id ?? parent ?? null;

  const existing = game.folders.find((folder) =>
    folder.type === type &&
    aliases.includes(folder.name) &&
    folderParentId(folder) === parentId
  ) ?? null;

  if (!existing) return { action: "missing", folder: null };
  if (existing.name === name) return { action: "unchanged", folder: existing };

  await existing.update(
    { name },
    { render: false, merpUiLocalizationRefresh: true }
  );
  return { action: "localized", folder: existing };
}

export async function refreshManagedDatasetLocalization(data, {
  itemDefinitions = null,
  itemCollection = null,
  journalDefinitions = null,
  journalCollection = null,
  itemFolderRoot = null,
  journalFolderRoot = null,
  notify = false,
  label = "contenu MERP-RMU"
} = {}) {
  const itemDefs = itemDefinitions ?? [
    ...(data?.items ?? []),
    ...(data?.rmuNativeProfessions ?? []),
    ...(data?.rmuNativeSpellLists ?? [])
  ];
  const journalDefs = journalDefinitions ?? (data?.journals ?? []);

  const itemResults = [];
  for (const definition of itemDefs) {
    if (!definition?.localizations) continue;
    itemResults.push(await applyManagedItemLocalization(definition, {
      fallbackCollection: itemCollection
    }));
  }

  const journalResults = [];
  for (const definition of journalDefs) {
    if (!definition?.localizations) continue;
    journalResults.push(await applyManagedJournalLocalization(definition, {
      fallbackCollection: journalCollection
    }));
  }

  const folderResults = [];

  if (Array.isArray(data?.folders) && itemFolderRoot) {
    const definitions = data.folders.map((folder) =>
      typeof folder === "string" ? { key: folder, name: folder, parent: null } : folder
    );
    const known = new Map();

    for (const definition of definitions) {
      const parent = definition.parent
        ? known.get(definition.parent)
        : itemFolderRoot;
      const result = await applyFolderDefinitionLocalization(
        definition,
        "Item",
        parent ?? itemFolderRoot
      );
      if (result.folder) known.set(definition.key, result.folder);
      else {
        const aliases = localizedFolderAliases(definition);
        const parentId = (parent ?? itemFolderRoot)?.id ?? null;
        const existing = game.folders.find((folder) =>
          folder.type === "Item" &&
          aliases.includes(folder.name) &&
          folderParentId(folder) === parentId
        ) ?? null;
        if (existing) known.set(definition.key, existing);
      }
      folderResults.push(result);
    }
  }

  if (Array.isArray(data?.journalFolders) && journalFolderRoot) {
    const definitions = data.journalFolders.map((folder) =>
      typeof folder === "string" ? { key: folder, name: folder, parent: null } : folder
    );
    const known = new Map();

    for (const definition of definitions) {
      const parent = definition.parent
        ? known.get(definition.parent)
        : journalFolderRoot;
      const result = await applyFolderDefinitionLocalization(
        definition,
        "JournalEntry",
        parent ?? journalFolderRoot
      );
      if (result.folder) known.set(definition.key, result.folder);
      folderResults.push(result);
    }
  }

  const result = {
    language: contentLanguage(),
    localizedItems: itemResults.filter((entry) => entry.action === "localized").length,
    unchangedItems: itemResults.filter((entry) => entry.action === "unchanged").length,
    localizedJournals: journalResults.filter((entry) => entry.action === "localized").length,
    localizedPages: journalResults.reduce((sum, entry) => sum + (entry.pages ?? 0), 0),
    localizedFolders: folderResults.filter((entry) => entry.action === "localized").length
  };

  if (notify) {
    ui.notifications.info(
      `MERP UI : localisation ${result.language.toUpperCase()} appliquée ` +
      `(${result.localizedItems} Item(s), ${result.localizedJournals} Journal(aux), ` +
      `${result.localizedFolders} dossier(s)).`
    );
  }

  console.log(`${MODULE_ID} | ${label} — localisation`, result);
  return result;
}

export async function rerenderLocalizedDirectories() {
  const candidates = [
    ui?.items,
    ui?.journal,
    ui?.compendium,
    ui?.sidebar?.tabs?.items,
    ui?.sidebar?.tabs?.journal,
    ui?.sidebar?.tabs?.compendium
  ].filter(Boolean);

  const seen = new Set();
  for (const app of candidates) {
    if (seen.has(app)) continue;
    seen.add(app);

    try {
      const rendered = app.render?.({ force: true });
      if (rendered?.then) await rendered;
      continue;
    } catch (_error) {
      // Fall through to the legacy render signature.
    }

    try {
      const rendered = app.render?.(true);
      if (rendered?.then) await rendered;
    } catch (_error) {
      // Directory repaint is cosmetic; document localization has already run.
    }
  }
}
