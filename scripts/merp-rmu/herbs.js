import {
  contentLanguage,
  localizeManagedDocument
} from "./localization.js";
import {
  ensureItemFolder,
  ensureJournalFolder,
  folderParentId,
  localizedFolderAliases,
  localizedFolderName
} from "./content-folders.js";
import { refreshManagedDatasetLocalization } from "./content-localization.js";

const MODULE_ID = "merp-ui";
const ROOT_FOLDER = "MERP-RMU";
const MERP_HERBS_PATH = `modules/${MODULE_ID}/data/merp-rmu/herbs-v1.json`;
const MERP_HERBS_SETTING = "merpRmuHerbsVersion";
const MERP_HERBS_LANGUAGE_SETTING = "merpRmuHerbsLanguage";

export function registerMerpRmuHerbsSettings() {
  if (!game.settings.settings.has(`${MODULE_ID}.${MERP_HERBS_SETTING}`)) {
    game.settings.register(MODULE_ID, MERP_HERBS_SETTING, {
      name: "Version du catalogue d’Herbes MERP-RMU",
      scope: "world",
      config: false,
      type: Number,
      default: 0
    });
  }
  if (!game.settings.settings.has(`${MODULE_ID}.${MERP_HERBS_LANGUAGE_SETTING}`)) {
    game.settings.register(MODULE_ID, MERP_HERBS_LANGUAGE_SETTING, {
      name: "Langue installée du catalogue d’Herbes MERP-RMU",
      scope: "world",
      config: false,
      type: String,
      default: ""
    });
  }
}

export async function loadMerpRmuHerbData() {
  const response = await fetch(MERP_HERBS_PATH, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${MERP_HERBS_PATH}: ${response.status}`);
  return response.json();
}

export function localizedHerbJournalName(data, language = contentLanguage()) {
  return data?.journal?.localizations?.[language]?.name ??
    data?.journal?.document?.name ??
    "Herbes & Substances — Guide du voyageur";
}

export function localizedHerbJournalSubfolderName(data, language = contentLanguage()) {
  return data?.journal?.subfolderLocalizations?.[language]?.name ??
    data?.journal?.subfolderName ??
    "Herbes & Substances";
}

export function localizedHerbJournalPayload(data, language = contentLanguage()) {
  const payload = foundry.utils.deepClone(data?.journal?.document ?? {});
  const localization = data?.journal?.localizations?.[language] ?? {};

  if (localization.name) payload.name = localization.name;

  if (Array.isArray(localization.pages) && Array.isArray(payload.pages)) {
    const byIndex = localization.pages;
    payload.pages = payload.pages.map((page, index) => {
      const localized = byIndex[index] ?? {};
      const copy = foundry.utils.deepClone(page);
      if (localized.name) copy.name = localized.name;
      if (localized.text?.content !== undefined) {
        copy.text ??= {};
        copy.text.content = localized.text.content;
      }
      return copy;
    });
  }

  return payload;
}

export async function refreshMerpRmuHerbJournalLocalization(data, { herbItemsByKey = null } = {}) {
  if (!data?.journal?.document) return { skipped: true, reason: "no-journal" };

  const language = contentLanguage();
  const herbRulesRootName = language === "en" ? "MERP-RMU Rules" : "Règles MERP - RMU";
  const rulesRoot = await ensureJournalFolder(
    herbRulesRootName,
    null,
    null,
    null,
    ["Règles MERP - RMU", "MERP-RMU Rules"]
  );

  const subfolderName = localizedHerbJournalSubfolderName(data, language);
  const subfolderAliases = [
    data.journal.subfolderName,
    ...Object.values(data.journal.subfolderLocalizations ?? {})
      .map((entry) => entry?.name)
      .filter(Boolean)
  ];
  const rulesFolder = data.journal.subfolderName
    ? await ensureJournalFolder(
        subfolderName,
        rulesRoot,
        100000,
        "m",
        subfolderAliases
      )
    : rulesRoot;

  const existingJournal = game.journal.find((journal) =>
    journal.getFlag?.(MODULE_ID, "key") === data.journal.key &&
    journal.getFlag?.(MODULE_ID, "collection") === "merp-rmu-herb-rules"
  );
  if (!existingJournal) return { skipped: true, reason: "journal-not-installed" };

  const resolveHerbLinks = (html) => String(html ?? "").replace(
    /\[\[HERB:([^|\]]+)\|([^\]]+)\]\]/g,
    (match, key, label) => {
      const item =
        herbItemsByKey?.get?.(key) ??
        game.items.find((candidate) =>
          candidate.getFlag?.(MODULE_ID, "key") === key &&
          candidate.getFlag?.(MODULE_ID, "collection") === "merp-rmu-herbs"
        );
      return item ? `@UUID[Item.${item.id}]{${label}}` : label;
    }
  );

  const payload = localizedHerbJournalPayload(data, language);
  payload.folder = rulesFolder.id;
  for (const page of payload.pages ?? []) {
    if (page?.type === "text" && page?.text?.content) {
      page.text.content = resolveHerbLinks(page.text.content);
    }
  }

  await existingJournal.delete({ merpUiHerbLocalizationRefresh: true });
  await JournalEntry.create(payload, { merpUiHerbLocalizationRefresh: true });

  return {
    language,
    name: payload.name,
    folder: rulesFolder.name,
    pages: payload.pages?.length ?? 0
  };
}

export async function installMerpRmuHerbs({ force = false, notify = false } = {}) {
  if (!game.user?.isGM || game.system?.id !== "rmu") return { skipped: true, reason: "not-gm-or-rmu" };

  const data = await loadMerpRmuHerbData();
  const targetVersion = Number(data?.version || 1);
  const language = contentLanguage();
  const installedVersion = Number(game.settings.get(MODULE_ID, MERP_HERBS_SETTING) || 0);

  if (!force && installedVersion >= targetVersion) {
    // Always compare the localized fields. A previous build may have stored
    // the language flag before every Herb Item/folder had actually switched.
    const merpRoot = game.folders.find((folder) =>
      folder.type === "Item" &&
      folder.name === ROOT_FOLDER &&
      folderParentId(folder) === null
    ) ?? null;

    const herbRootAliases = [
      data.rootFolder,
      ...Object.values(data.rootFolderLocalizations ?? {})
        .map((entry) => entry?.name)
        .filter(Boolean)
    ].filter(Boolean);

    let herbRoot = game.folders.find((folder) =>
      folder.type === "Item" &&
      herbRootAliases.includes(folder.name) &&
      folderParentId(folder) === merpRoot?.id
    ) ?? null;

    const desiredHerbRootName =
      data.rootFolderLocalizations?.[language]?.name ??
      data.rootFolder ??
      "Herbes & Substances";
    if (herbRoot && herbRoot.name !== desiredHerbRootName) {
      await herbRoot.update(
        { name: desiredHerbRootName },
        { render: false, merpUiLocalizationRefresh: true }
      );
    }

    const herbResult = await refreshManagedDatasetLocalization(data, {
      itemCollection: "merp-rmu-herbs",
      itemFolderRoot: herbRoot,
      notify: false,
      label: "Herbes MERP-RMU"
    });

    const herbJournalResult = await refreshMerpRmuHerbJournalLocalization(data);

    await game.settings.set(MODULE_ID, MERP_HERBS_LANGUAGE_SETTING, language);
    return {
      version: targetVersion,
      language,
      localizationOnly: true,
      herbJournal: herbJournalResult,
      ...herbResult
    };
  }

  const merpRoot = await ensureItemFolder(ROOT_FOLDER);
  const herbRootName =
    data.rootFolderLocalizations?.[language]?.name ??
    data.rootFolder ??
    "Herbes & Substances";
  const herbRootAliases = [
    data.rootFolder,
    ...Object.values(data.rootFolderLocalizations ?? {})
      .map((entry) => entry?.name)
      .filter(Boolean)
  ].filter(Boolean);
  const herbRoot = await ensureItemFolder(
    herbRootName,
    merpRoot,
    700000,
    "m",
    herbRootAliases
  );
  const folderMap = new Map();
  for (const def of data.folders ?? []) {
    const parent = def.parent ? folderMap.get(def.parent) : herbRoot;
    const folderName = localizedFolderName(def);
    const aliases = localizedFolderAliases(def);
    const folder = await ensureItemFolder(
      folderName,
      parent ?? herbRoot,
      def.sort ?? 0,
      "a",
      aliases
    );
    folderMap.set(def.key, folder);
  }

  let created = 0;
  let updated = 0;
  const herbItemsByKey = new Map();
  for (const entry of data.items ?? []) {
    const folder = folderMap.get(entry.folder) ?? herbRoot;
    const payload = localizeManagedDocument(entry.document, entry.localizations);
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
    const herbRulesRootName = contentLanguage() === "en" ? "MERP-RMU Rules" : "Règles MERP - RMU";
    const rulesRoot = await ensureJournalFolder(
      herbRulesRootName,
      null,
      null,
      null,
      ["Règles MERP - RMU", "MERP-RMU Rules"]
    );
    const herbSubfolderName = localizedHerbJournalSubfolderName(data, language);
    const herbSubfolderAliases = [
      data.journal.subfolderName,
      ...Object.values(data.journal.subfolderLocalizations ?? {})
        .map((entry) => entry?.name)
        .filter(Boolean)
    ];
    const rulesFolder = data.journal.subfolderName
      ? await ensureJournalFolder(
          herbSubfolderName,
          rulesRoot,
          100000,
          "m",
          herbSubfolderAliases
        )
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
    const journalPayload = localizedHerbJournalPayload(data, language);
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
  await game.settings.set(MODULE_ID, MERP_HERBS_LANGUAGE_SETTING, language);
  const result = { version: targetVersion, created, updated, journalCreated, journalUpdated, total: (data.items ?? []).length };
  if (notify) ui.notifications.info(`MERP UI : catalogue d’herbes installé (${result.total} entrées).`);
  console.log(`${MODULE_ID} | Herbes MERP-RMU`, result);
  return result;
}


let contentLanguageRefreshQueue = Promise.resolve();

