import { contentLanguage } from "./localization.js";
import { equivalentJournalHtml } from "./html-equivalence.js";
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
  // Compare the Journal and its pages directly: a stored version number
  // alone cannot confirm that an imported World Journal is up to date.

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
  if (existing) {
    // Preserve World Journal and embedded page IDs (including their links),
    // even for a content-version upgrade or an explicit forced refresh.
    const localized = await applyManagedJournalLocalization(data.journal, {
      fallbackCollection: collection
    });
    const changes = {};
    if (existing.folder?.id !== folder.id) changes.folder = folder.id;
    if (Number(existing.getFlag?.(MODULE_ID, "contentVersion") || 0) !== targetVersion) {
      changes[`flags.${MODULE_ID}.contentVersion`] = targetVersion;
    }
    if (Object.keys(changes).length) {
      await existing.update(changes, {
        render: false,
        merpUiLocalizationRefresh: true
      });
    }
    action = localized.action === "localized" || Object.keys(changes).length
      ? "updated" : "unchanged";
  } else {
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


// 1.6 RC1 — Synchronize the Introduction after the NeDB seed has already
// been migrated to a persistent LevelDB Compendium. Updating the seed JSON
// alone cannot update a Compendium or an imported World Journal.
const MERP_INTRODUCTION_COMPENDIUM_SOURCE_PATH =
  `modules/${MODULE_ID}/source/compendiums/merp-rmu-rules/merp-rmu-introduction.json`;
const MERP_INTRODUCTION_COMPENDIUM_ID = `${MODULE_ID}.merp-rmu-rules`;

async function loadIntroductionCompendiumSource() {
  const route = foundry?.utils?.getRoute
    ? foundry.utils.getRoute(MERP_INTRODUCTION_COMPENDIUM_SOURCE_PATH)
    : MERP_INTRODUCTION_COMPENDIUM_SOURCE_PATH;
  const response = await fetch(route, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) {
    throw new Error(
      `Unable to load ${MERP_INTRODUCTION_COMPENDIUM_SOURCE_PATH}: ${response.status}`
    );
  }
  return response.json();
}

function introductionUpdatePlan(journal, source, language, targetVersion, {
  compendium = false
} = {}) {
  const localized = localizeJournalDocument(
    source.document, source.localizations, language
  );
  // The Compendium also has a seventh, independent settings guide page.
  // Do not alter it, nor any extra pages added to an imported Journal.
  const expectedPages = localized.pages?.slice(0, 6) ?? [];
  const existingPages = journal.pages?.contents ?? [];
  if (expectedPages.length !== 6 || existingPages.length < 6) {
    throw new Error(
      `Introduction page mismatch in ${journal.name}: ` +
      `${existingPages.length} existing / ${expectedPages.length} expected`
    );
  }

  const pageUpdates = [];
  for (let i = 0; i < expectedPages.length; i += 1) {
    const current = existingPages[i];
    const expected = expectedPages[i];
    const update = { _id: current.id };
    if (current.name !== expected.name) update.name = expected.name;
    if (!equivalentJournalHtml(current.text?.content, expected.text?.content)) {
      update["text.content"] = expected.text.content;
    }
    if (Object.keys(update).length > 1) pageUpdates.push(update);
  }

  const update = {};
  if (journal.name !== localized.name) update.name = localized.name;
  if (Number(journal.getFlag?.(MODULE_ID, "contentVersion") || 0) !== targetVersion) {
    update[`flags.${MODULE_ID}.contentVersion`] = targetVersion;
  }
  if (compendium || journal.getFlag?.(MODULE_ID, "compendiumPack")) {
    const previous = journal.getFlag?.(MODULE_ID, "compendiumLocalizations") ?? {};
    if (JSON.stringify(previous) !== JSON.stringify(source.localizations)) {
      update[`flags.${MODULE_ID}.compendiumLocalizations`] = source.localizations;
    }
  }
  return { update, pageUpdates };
}

async function applyIntroductionUpdate(journal, source, language, targetVersion, options = {}) {
  const plan = introductionUpdatePlan(journal, source, language, targetVersion, options);
  const documentChanged = Object.keys(plan.update).length > 0;
  if (documentChanged) {
    await journal.update(plan.update, {
      render: false,
      merpUiIntroductionRefresh: true,
      merpUiCompendiumPackMaintenance: true
    });
  }
  if (plan.pageUpdates.length) {
    await journal.updateEmbeddedDocuments("JournalEntryPage", plan.pageUpdates, {
      render: false,
      merpUiIntroductionRefresh: true,
      merpUiCompendiumPackMaintenance: true
    });
  }
  return {
    changed: documentChanged || plan.pageUpdates.length > 0,
    pagesUpdated: plan.pageUpdates.length
  };
}

/**
 * Refresh only the existing, managed Introduction in Compendium and World.
 * Never create a World Journal in a Compendium-first World, never remove or
 * recreate an existing Journal (which would break links), and never overwrite
 * the Compendium's seventh settings guide page.
 */
export async function synchronizeMerpRmuIntroduction({ notify = false } = {}) {
  if (!game.user?.isGM || game.system?.id !== "rmu") {
    return { skipped: true, reason: "not-gm-or-rmu" };
  }

  const source = await loadIntroductionCompendiumSource();
  const language = contentLanguage();
  const targetVersion = Number(source.document?.flags?.[MODULE_ID]?.contentVersion || 1);
  const result = {
    language,
    version: targetVersion,
    compendium: "missing",
    worldJournals: 0,
    worldPagesUpdated: 0
  };

  const pack = game.packs?.get(MERP_INTRODUCTION_COMPENDIUM_ID) ?? null;
  if (pack) {
    const index = await pack.getIndex({
      fields: [
        "name",
        `flags.${MODULE_ID}.compendiumSourceKey`,
        `flags.${MODULE_ID}.key`
      ]
    });
    const entry = [...index].find((item) => {
      const flags = item.flags?.[MODULE_ID] ?? {};
      return flags.compendiumSourceKey === source.key || flags.key === source.key;
    });
    if (entry) {
      const journal = await pack.getDocument(entry._id);
      if (journal) {
        const plan = introductionUpdatePlan(journal, source, language, targetVersion, {
          compendium: true
        });
        if (Object.keys(plan.update).length || plan.pageUpdates.length) {
          const wasLocked = Boolean(pack.locked ?? pack.metadata?.locked);
          if (wasLocked) {
            if (typeof pack.configure !== "function") {
              throw new Error(`Unable to unlock Compendium ${MERP_INTRODUCTION_COMPENDIUM_ID}`);
            }
            await pack.configure({ locked: false });
          }
          try {
            result.compendium = await applyIntroductionUpdate(
              journal, source, language, targetVersion, { compendium: true }
            );
          } finally {
            if (wasLocked) await pack.configure({ locked: true });
          }
        } else {
          result.compendium = { changed: false, pagesUpdated: 0 };
        }
      }
    } else {
      console.warn(`${MODULE_ID} | Introduction absent from ${MERP_INTRODUCTION_COMPENDIUM_ID}`);
      result.compendium = "introduction-not-found";
    }
  }

  // Update copies imported into the World, including old 1.5 managed Journals.
  // Identify them by their MERP-UI provenance, not by title alone.
  for (const journal of game.journal?.contents ?? []) {
    const flags = journal.flags?.[MODULE_ID] ?? {};
    const matches = flags.compendiumSourceKey === source.key ||
      (flags.key === source.key && flags.collection === "merp-rmu-introduction");
    if (!matches) continue;
    const updated = await applyIntroductionUpdate(
      journal, source, language, targetVersion
    );
    result.worldJournals += 1;
    result.worldPagesUpdated += updated.pagesUpdated;
  }

  if (notify) {
    ui.notifications.info(
      `MERP UI : présentation vérifiée (${result.worldJournals} ` +
      `Journal(aux) du monde, ${result.worldPagesUpdated} page(s) mises à jour).`
    );
  }
  console.log(`${MODULE_ID} | Introduction synchronization`, result);
  return result;
}
