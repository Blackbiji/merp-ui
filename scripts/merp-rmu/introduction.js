import { contentLanguage } from "./localization.js";
import {
  ensureJournalFolder,
  folderParentId,
  localizedFolderAliases,
  localizedFolderName
} from "./content-folders.js";
import {
  applyManagedJournalLocalization,
  localizeJournalDocument
} from "./content-localization.js";

const MODULE_ID = "merp-ui";
const ROOT_FOLDER = "MERP-RMU";
const MERP_INTRODUCTION_PATH =
  `modules/${MODULE_ID}/data/merp-rmu/introduction-v1.json`;
const MERP_INTRODUCTION_SETTING = "merpRmuIntroductionVersion";
const MERP_INTRODUCTION_LANGUAGE_SETTING = "merpRmuIntroductionLanguage";

export async function loadMerpRmuIntroductionData() {
  const route = foundry?.utils?.getRoute ? foundry.utils.getRoute(MERP_INTRODUCTION_PATH) : MERP_INTRODUCTION_PATH;
  const response = await fetch(route, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Unable to load ${MERP_INTRODUCTION_PATH}: ${response.status}`);
  return response.json();
}

export async function installMerpRmuIntroduction({ force = false, notify = false } = {}) {
  if (!game.user?.isGM || game.system?.id !== "rmu") return { skipped: true, reason: "not-gm-or-rmu" };

  const data = await loadMerpRmuIntroductionData();
  const targetVersion = Number(data?.version || 1);
  const language = contentLanguage();
  const installedVersion = Number(game.settings.get(MODULE_ID, MERP_INTRODUCTION_SETTING) || 0);
  // Compare the actual Journal/page fields rather than trusting a language flag.
  // existing Journal/page fields below so a partially localised old world
  // repairs itself without rebuilding the Journal.

  // If a Journal folder named MERP-RMU already exists, place the introduction
  // inside it. Otherwise keep the introduction at the Journal root, where it
  // remains the first thematic folder alongside Magie, Religion and Économie.
  const journalRoot = game.folders.find((folder) =>
    folder.type === "JournalEntry" &&
    folder.name === ROOT_FOLDER &&
    folderParentId(folder) === null
  ) ?? null;

  const introFolderName = localizedFolderName(data.folder ?? { name: "Présentation de MERP-RMU" });
  const introFolderAliases = localizedFolderAliases(data.folder ?? { name: "Présentation de MERP-RMU" });
  const folder = await ensureJournalFolder(
    introFolderName || "Présentation de MERP-RMU",
    journalRoot,
    data.folder?.sort ?? -100000,
    data.folder?.sorting ?? "m",
    introFolderAliases
  );

  const key = data.journal?.key || "merp-rmu-introduction";
  const collection = data.journal?.collection || "merp-rmu-introduction";
  const existing = game.journal.find((journal) =>
    journal.getFlag?.(MODULE_ID, "key") === key &&
    journal.getFlag?.(MODULE_ID, "collection") === collection
  );

  const payload = localizeJournalDocument(data.journal?.document ?? {}, data.journal?.localizations);
  payload.folder = folder.id;
  payload.flags = foundry.utils.mergeObject(payload.flags ?? {}, {
    [MODULE_ID]: { key, collection, contentVersion: targetVersion }
  }, { inplace: false, overwrite: true, recursive: true });

  let action = "created";

  if (
    existing &&
    !force &&
    installedVersion >= targetVersion
  ) {
    const localized = await applyManagedJournalLocalization(data.journal, {
      fallbackCollection: collection
    });
    if (existing.folder?.id !== folder.id) {
      await existing.update(
        { folder: folder.id },
        { render: false, merpUiLocalizationRefresh: true }
      );
    }
    action = localized.action === "localized" ? "localized" : "unchanged";
  } else {
    if (existing) {
      // Genuine content-version updates still rebuild this small editorial
      // Journal so page order and formatting stay deterministic.
      await existing.delete({ merpUiIntroductionInstall: true });
      action = "updated";
    }
    await JournalEntry.create(payload, { merpUiIntroductionInstall: true });
  }

  await game.settings.set(MODULE_ID, MERP_INTRODUCTION_SETTING, targetVersion);
  await game.settings.set(MODULE_ID, MERP_INTRODUCTION_LANGUAGE_SETTING, language);

  const result = {
    version: targetVersion,
    language,
    action,
    folder: folder.name,
    pages: payload.pages?.length ?? 0
  };
  if (notify) ui.notifications.info(`MERP UI : introduction MERP-RMU ${action === "created" ? "installée" : "mise à jour"}.`);
  console.log(`${MODULE_ID} | Introduction MERP-RMU`, result);
  return result;
}

