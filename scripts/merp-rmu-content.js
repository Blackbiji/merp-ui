import {
  installMerpRmuTalentsFlaws,
  refreshTalentsFlawsLocalization,
  registerMerpRmuTalentsFlawsHooks,
  registerMerpRmuTalentsFlawsSetting
} from "./merp-rmu/talents-flaws.js";
import {
  removeEmptyLegacyTalentsFlawsFolder
} from "./merp-rmu/content-migrations.js";
import {
  enforceMerpRmuTopLevelItemFolderOrder,
  ensureConfiguredFolders,
  ensureItemFolder,
  ensureJournalFolder,
  folderParentId,
  localizedFolderAliases,
  localizedFolderName,
  repairLanguagesJournalFolderName
} from "./merp-rmu/content-folders.js";
import {
  applyManagedJournalLocalization,
  localizeJournalDocument,
  refreshManagedDatasetLocalization,
  rerenderLocalizedDirectories
} from "./merp-rmu/content-localization.js";
import {
  deduplicateWorldSpellLists
} from "./merp-rmu/spell-list-migrations.js";
import {
  removeExactImportedSpellListDuplicates,
  spellListSignature,
  spellListSystemFingerprint
} from "./merp-rmu/spell-list-utils.js";
import {
  normalizeCampaignLanguageKey,
  syncCultureLanguagesForActor,
  syncCultureLanguagesForAllActors,
  syncRmuCampaignLanguages
} from "./merp-rmu/culture-languages.js";
import {
  installMerpRmuHerbs,
  registerMerpRmuHerbsSettings
} from "./merp-rmu/herbs.js";
import {
  aliasesForManagedItem,
  buildJournalLinkAliases,
  buildManagedLinkAliases,
  findManagedItem,
  linkManagedDescriptions,
  linkManagedJournalPages,
  managedItems,
  managedJournals,
  prepareDocumentData,
  prepareJournalData,
  upsertManagedItem,
  upsertManagedJournal
} from "./merp-rmu/managed-content.js";
import {
  forceProfessionChassis,
  forceProfessionDescriptions,
  loadProfessionDescriptionData,
  normalizeEmbeddedProfessionTechnicalKey,
  professionDescriptionDefinitions,
  repairActorProfessionTechnicalKeys,
  upsertConfiguredNativeProfessions
} from "./merp-rmu/professions.js";
import {
  applyRmuRealmSpellListIcon,
  loadNonRmuSpellListData,
  nonRmuSpellListEntries,
  refreshNonRmuWorldSpellListLocalization,
  repairMerpRmuCustomSpellListCatalog,
  syncNonRmuWorldSpellLists,
  upsertConfiguredNativeSpellLists
} from "./merp-rmu/spell-lists.js";
import {
  MERP_SPECIAL_POWER_SKILL_KEYS,
  healingSongsDialogOptions,
  injectMerpSpecialPowerSkills,
  installMerpSpecialPowerManeuverResults,
  installMerpSpecialPowerSkillTranslations,
  installMerpSpecialPowerSkills,
  merpSpecialPowerSkillAllowed,
  merpSpecialSkillKey,
  prepareHealingSongsPlusControl,
  syncMerpSpecialPowerSkillsAllActors,
  syncMerpSpecialPowerSkillsForActor
} from "./merp-rmu/special-power-skills.js";
import { installMerpRmuIntroduction } from "./merp-rmu/introduction.js";
import {
  registerMerpRmu15MigrationSetting,
  runMerpRmu15Migration
} from "./merp-rmu/migration-1.5.js";
import {
  registerCompendiumContentHooks,
  registerCompendiumContentSettings,
  relocalizeImportedCompendiumItems,
  synchronizeCompendiumLibraries
} from "./merp-rmu/compendium-content.js";
import {
  maybePostWelcomeChat,
  registerWelcomeChatHooks,
  registerWelcomeChatSetting,
  repostWelcomeChatMessage,
  resetWelcomeChat
} from "./merp-rmu/welcome-chat.js";
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
import { repairHonninCanonicalPlacement, refreshHonninBetaLocalization, registerHonninBeta } from "./merp-rmu/honnin-beta.js";
import {
  contentLanguage,
  flattenLocalizationUpdate,
  localizeManagedDocument,
  localizeManagedSpellListDocument,
  localizedDocumentPatch,
  localizedPatchNeedsUpdate,
  localizedSpellListPatch,
  withContentLanguage
} from "./merp-rmu/localization.js";

export { removeEmptyLegacyTalentsFlawsFolder };

const MODULE_ID = "merp-ui";
let contentLanguageRefreshQueue = Promise.resolve();
let lastRequestedContentLanguage = null;
let lastRequestedContentLanguageAt = 0;
registerMerpRmuTalentsFlawsHooks();
registerHonninBeta();
registerCompendiumContentHooks();
registerWelcomeChatHooks();
const DATA_PATH = `modules/${MODULE_ID}/data/merp-rmu/khazad.json`;
const MERP_INTRODUCTION_SETTING = "merpRmuIntroductionVersion";
const MERP_INTRODUCTION_LANGUAGE_SETTING = "merpRmuIntroductionLanguage";

const ROOT_FOLDER = "MERP-RMU";
const INSTALL_SETTING = "merpRmuContentVersion";
const MERP_MANAGED_JOURNAL_COLLECTIONS_WITH_INLINE_TITLES = new Set([
  "merp-rmu-rules",
  "merp-rmu-introduction",
  "merp-rmu-herb-rules"
]);
const INSTALL_LANGUAGE_SETTING = "merpRmuContentLanguage";
const PROFESSION_DESCRIPTION_LANGUAGE_SETTING = "merpRmuProfessionDescriptionLanguage";
const PROFESSION_DESCRIPTION_SETTING = "merpRmuProfessionDescriptionVersion";
const MERP_SPECIAL_POWER_SKILLS_SETTING = "merpRmuSpecialPowerSkillsVersion";

async function loadMerpRmuData() {
  const route = foundry?.utils?.getRoute ? foundry.utils.getRoute(DATA_PATH) : DATA_PATH;
  const response = await fetch(route, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Données MERP-RMU introuvables : HTTP ${response.status}`);
  return response.json();
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

async function refreshMerpRmuLocalization({ data = null, notify = true } = {}) {
  if (!game.user?.isGM) return { skipped: true, reason: "not-gm" };
  if (game.system?.id !== "rmu") return { skipped: true, reason: "wrong-system" };

  data = data ?? await loadMerpRmuData();
  const language = contentLanguage();

  const itemRoot = game.folders.find((folder) =>
    folder.type === "Item" &&
    folder.name === ROOT_FOLDER &&
    folderParentId(folder) === null
  ) ?? null;

  const rulesRootName = language === "en" ? "MERP-RMU Rules" : "Règles MERP - RMU";
  const rulesRoot = await ensureJournalFolder(
    rulesRootName,
    null,
    null,
    null,
    ["Règles MERP - RMU", "MERP-RMU Rules"]
  );

  const result = await refreshManagedDatasetLocalization(data, {
    itemCollection: "merp-rmu",
    journalCollection: "merp-rmu-rules",
    itemFolderRoot: itemRoot,
    journalFolderRoot: rulesRoot,
    notify,
    label: "MERP-RMU"
  });

  if (itemRoot && Array.isArray(data?.folders)) {
    const folderDefs = data.folders.map((folder) =>
      typeof folder === "string" ? { key: folder, name: folder, parent: null } : folder
    );
    const folders = await ensureConfiguredFolders(folderDefs, itemRoot, "Item");
    result.nativeSpellLists = await upsertConfiguredNativeSpellLists(
      data.rmuNativeSpellLists ?? [],
      folders
    );
  }

  result.campaignLanguages = await syncRmuCampaignLanguages(data, {
    notify: false,
    language
  });

  // Current-state UI invariants, not historical migrations:
  // - keep the validated top-level Item order after translated folder names change;
  // - canonicalize the special Languages/Langues journal folder which predates
  //   the generic folder-localization model.
  result.itemFolderOrder = await enforceMerpRmuTopLevelItemFolderOrder(itemRoot);
  result.languagesFolder = await repairLanguagesJournalFolderName({ language });

  await game.settings.set(MODULE_ID, INSTALL_LANGUAGE_SETTING, language);

  // Main Profession Items already received the localized description above.
  // Mark the independent editorial description layer current only when its
  // version itself is already current; a genuine prose update must still run.
  try {
    const descriptionData = await loadProfessionDescriptionData();
    const descriptionTarget = Number(descriptionData?.version || 1);
    const descriptionInstalled = Number(
      game.settings.get(MODULE_ID, PROFESSION_DESCRIPTION_SETTING) || 0
    );
    if (descriptionInstalled >= descriptionTarget) {
      await game.settings.set(
        MODULE_ID,
        PROFESSION_DESCRIPTION_LANGUAGE_SETTING,
        language
      );
    }
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible de synchroniser l’état de langue des Professions`, error);
  }

  return result;
}


export async function installMerpRmuContent({ force = false, notify = true } = {}) {
  if (!game.user?.isGM) return { skipped: true, reason: "not-gm" };
  if (game.system?.id !== "rmu") return { skipped: true, reason: "wrong-system" };

  const data = await loadMerpRmuData();
  const installedVersion = Number(game.settings.get(MODULE_ID, INSTALL_SETTING) || 0);
  const targetVersion = Number(data.schemaVersion || 1);

  const language = contentLanguage();

  if (!force && installedVersion >= targetVersion) {
    const localization = await refreshMerpRmuLocalization({
      data,
      notify: false
    });
    return {
      ...localization,
      alreadyCurrent: true
    };
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

  // MERP-RMU-only Spell Lists are functional world Items. Native RMU lists
  // remain in Spell Law and are never duplicated here.
  const nonRmuData = await loadNonRmuSpellListData();
  const customSpellLists = await syncNonRmuWorldSpellLists(
    nonRmuData,
    folders,
    { notify: false }
  );
  const honnInSpellLists = await repairHonninCanonicalPlacement({
    professionFolder: folders.get("professions-pures-canalisation") ?? null,
    spellListFolder: folders.get("spell-lists-channeling-honnin") ?? null,
    notify: false
  });

  const validKeys = new Set([
    ...(data.items ?? []).map((entry) => entry.key),
    ...(data.rmuNativeProfessions ?? []).map((entry) => entry.key),
    ...(data.rmuNativeSpellLists ?? []).map((entry) => entry.key),
    ...nonRmuSpellListEntries(nonRmuData).map((entry) => entry.key)
  ]);
  const deleted = data.pruneManagedItems ? await pruneManagedItems(validKeys) : 0;
  const linkedDescriptions = await linkManagedDescriptions();

  let journalResults = [];
  let deletedJournals = 0;
  let linkedJournalPages = 0;
  if ((data.journals ?? []).length || (data.journalFolders ?? []).length) {
    const journalRootName = contentLanguage() === "en" ? "MERP-RMU Rules" : "Règles MERP - RMU";
    const journalRoot = await ensureJournalFolder(
      journalRootName,
      null,
      null,
      null,
      ["Règles MERP - RMU", "MERP-RMU Rules"]
    );
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
  const campaignLanguages = await syncRmuCampaignLanguages(data, { notify: false });
  const languagesFolder = await repairLanguagesJournalFolderName({
    language: contentLanguage()
  });
  const merpRmuItemRoot = game.folders.find((folder) =>
    folder.type === "Item" &&
    ["MERP-RMU", "MERP - RMU"].includes(folder.name) &&
    !folderParentId(folder)
  ) ?? null;
  const itemFolderOrder = await enforceMerpRmuTopLevelItemFolderOrder(merpRmuItemRoot);
  await game.settings.set(MODULE_ID, INSTALL_SETTING, targetVersion);
  await game.settings.set(MODULE_ID, INSTALL_LANGUAGE_SETTING, language);
  const summary = {
    version: targetVersion,
    created: results.filter((result) => result.action === "created").length,
    updated: results.filter((result) => result.action === "updated").length,
    deleted,
    linkedDescriptions,
    journalCreated: journalResults.filter((result) => result.action === "created").length,
    journalUpdated: journalResults.filter((result) => result.action === "updated").length,
    deletedJournals,
    linkedJournalPages,
    repairedActorProfessions,
    campaignLanguages,
    languagesFolder,
    itemFolderOrder,
    professionChassis,
    customSpellLists,
    honnInSpellLists,
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
  registerMerpRmuHerbsSettings();
  registerMerpRmu15MigrationSetting();
  registerCompendiumContentSettings();
  registerWelcomeChatSetting();
  game.settings.register(MODULE_ID, INSTALL_SETTING, {
    name: "Version des données MERP-RMU",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });
  game.settings.register(MODULE_ID, INSTALL_LANGUAGE_SETTING, {
    name: "Langue du contenu MERP-RMU installé", scope: "world", config: false, type: String, default: ""
  });
  game.settings.register(MODULE_ID, PROFESSION_DESCRIPTION_LANGUAGE_SETTING, {
    name: "Langue des descriptions de professions MERP-RMU", scope: "world", config: false, type: String, default: ""
  });
  game.settings.register(MODULE_ID, PROFESSION_DESCRIPTION_SETTING, {
    name: "Version éditoriale des descriptions de Professions MERP-RMU",
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
  game.settings.register(MODULE_ID, MERP_INTRODUCTION_LANGUAGE_SETTING, {
    name: "Langue installée de l’introduction MERP-RMU",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
});


function hasLegacyMerpRmuWorldContent() {
  return (game.items?.contents ?? []).some((item) => {
    // Items explicitly imported from the new Compendiums are not evidence of
    // the old 1.5 World-installed catalogue.
    if (item.getFlag?.(MODULE_ID, "compendiumPack")) return false;
    const collection = item.getFlag?.(MODULE_ID, "collection");
    return typeof collection === "string" && collection.startsWith("merp-rmu");
  });
}

Hooks.once("ready", async () => {
  if (game.system?.id !== "rmu") return;
  installMerpPrimeStatHelper();
  await installRmuCreationPrototypeFixes();
  await installMerpSpecialPowerManeuverResults();

});

Hooks.once("ready", async () => {
  if (!game.user?.isGM || game.system?.id !== "rmu") return;

  const legacyWorld = hasLegacyMerpRmuWorldContent();

  // 1.6 is Compendium-first. A fresh World receives no MERP-RMU Items or
  // Journals automatically. Existing 1.5 Worlds keep their Documents intact.
  if (legacyWorld) {
    console.log(
      `${MODULE_ID} | Monde MERP-RMU existant détecté : contenu World conservé, ` +
      "aucune réinstallation automatique."
    );

    try {
      await applyMerpRmuContentLanguage({
        notify: false,
        reason: "ready-existing-world"
      });
    } catch (error) {
      console.error(`${MODULE_ID} | Échec du contrôle de langue du monde existant`, error);
    }

    try {
      await syncCultureLanguagesForAllActors({ notify: false });
    } catch (error) {
      console.warn(
        `${MODULE_ID} | Impossible de synchroniser les langues de Culture des personnages`,
        error
      );
    }
  } else {
    console.log(
      `${MODULE_ID} | Monde neuf : mode Compendium-first actif. ` +
      "Aucun contenu MERP-RMU n’est copié automatiquement dans le World."
    );

    try {
      await synchronizeCompendiumLibraries({
        language: contentLanguage(),
        notify: false
      });
    } catch (error) {
      console.warn(`${MODULE_ID} | Impossible de préparer les Compendiums`, error);
    }

    try {
      const data = await loadMerpRmuData();
      await syncRmuCampaignLanguages(data, {
        notify: false,
        language: contentLanguage()
      });
    } catch (error) {
      console.warn(`${MODULE_ID} | Impossible de préparer les Langues de Campagne`, error);
    }
  }

  try {
    await maybePostWelcomeChat();
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible de publier le message de bienvenue`, error);
  }
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

// Generic Item lifecycle orchestration belongs here rather than in the
// Culture-language domain: these hooks coordinate Professions, Races,
// Cultures, Special Power Skills and the historical STARTLIGHT guard.
Hooks.on("createItem", async (item, options) => {
  if (options?.merpUiProfessionNormalization || options?.merpUiProfessionChassisRestore ||
      options?.merpUiStartlightCleanup || options?.merpUiSpecialPowerSkillSync ||
      options?.merpUiCultureLanguageSync) return;
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
      if (item.parent?.documentName === "Actor") {
        await syncMerpSpecialPowerSkillsForActor(item.parent);
        await syncCultureLanguagesForActor(item.parent);
      }
    } else if (item.type === "race" && item.parent?.documentName === "Actor") {
      await syncMerpSpecialPowerSkillsForActor(item.parent);
    }
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible de normaliser/nettoyer l’Item créé`, error);
  }
});

Hooks.on("updateItem", async (item, changes, options) => {
  if (options?.merpUiProfessionNormalization || options?.merpUiProfessionChassisRestore ||
options?.merpUiSpecialPowerSkillSync || options?.merpUiCultureLanguageSync) return;
  if (!item.parent || item.parent.documentName !== "Actor") return;

  try {
    if (item.type === "profession") {
      await normalizeEmbeddedProfessionTechnicalKey(item);
    } else if (item.type === "culture") {
      await syncMerpSpecialPowerSkillsForActor(item.parent);
      await syncCultureLanguagesForActor(item.parent);
    } else if (item.type === "race") {
      await syncMerpSpecialPowerSkillsForActor(item.parent);
    }
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible de normaliser l’Item embarqué`, error);
  }
});


Hooks.on("deleteItem", async (item, options) => {
  if (options?.merpUiSpecialPowerSkillSync || options?.merpUiCultureLanguageSync) return;
  const actor = item?.parent;
  if (!actor || actor.documentName !== "Actor" || !["race", "culture"].includes(item.type)) return;
  queueMicrotask(async () => {
    try {
      await syncMerpSpecialPowerSkillsForActor(actor);
      if (item.type === "culture") await syncCultureLanguagesForActor(actor);
    } catch (error) {
      console.warn(`${MODULE_ID} | Impossible de synchroniser Race/Culture après suppression`, error);
    }
  });
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


async function applyMerpRmuContentLanguageNow({
  language = null,
  notify = false,
  reason = "manual"
} = {}) {
  if (!game.user?.isGM) return { skipped: true, reason: "not-gm" };
  if (game.system?.id !== "rmu") return { skipped: true, reason: "wrong-system" };

  const requestedLanguage =
    language === "en" ? "en" :
    language === "fr" ? "fr" :
    contentLanguage();

  return withContentLanguage(requestedLanguage, async (effectiveLanguage) => {
    const result = {
      language: effectiveLanguage,
      reason
    };

    // Fresh 1.6 Worlds are Compendium-first. Language changes only affect
    // Campaign Languages and Documents the user has explicitly imported.
    // They must never call the legacy World installers.
    if (!hasLegacyMerpRmuWorldContent()) {
      const mainData = await loadMerpRmuData();
      result.campaignLanguages = await syncRmuCampaignLanguages(mainData, {
        notify: false,
        language: effectiveLanguage
      });
      result.compendiums = await synchronizeCompendiumLibraries({
        language: effectiveLanguage,
        notify: false
      });
      result.importedCompendiumItems =
        await relocalizeImportedCompendiumItems({ notify: false });

      if (game.user?.isGM) {
        result.welcomeChat = await repostWelcomeChatMessage({
          language: effectiveLanguage
        });
      }

      await rerenderLocalizedDirectories();

      if (notify) {
        ui.notifications.info(
          `MERP UI : contenu importé basculé en ` +
          `${effectiveLanguage === "en" ? "anglais" : "français"}.`
        );
      }
      return result;
    }

    // Every nested localization helper sees the exact language received
    // from the setting callback. Language switching is now editorial only:
    // it no longer recreates, deduplicates, or migrates Spell Lists.
    const mainData = await loadMerpRmuData();
    result.main = await refreshMerpRmuLocalization({
      data: mainData,
      notify: false
    });

    installMerpSpecialPowerSkillTranslations();
    result.specialPowerSkills = await installMerpSpecialPowerSkills({
      force: false,
      notify: false
    });

    result.presentation = await installMerpRmuIntroduction({
      force: false,
      notify: false
    });

    result.herbs = await installMerpRmuHerbs({
      force: false,
      notify: false
    });

    result.talentsFlaws = await refreshTalentsFlawsLocalization(
      null,
      { notify: false }
    );

    result.convertedSpellLists = await refreshNonRmuWorldSpellListLocalization();

    result.honninSpellLists = await refreshHonninBetaLocalization({
      notify: false
    });

    if (game.user?.isGM) {
      result.welcomeChat = await repostWelcomeChatMessage({
        language: effectiveLanguage
      });
    }

    // Document updates are done with render:false for speed. Explicitly repaint
    // the open directories once, after the whole transaction, so folder and
    // Item names change on screen immediately.
    await rerenderLocalizedDirectories();

    if (notify) {
      ui.notifications.info(
        `MERP UI : contenu basculé en ${effectiveLanguage === "en" ? "anglais" : "français"}.`
      );
    }

    console.log(
      `${MODULE_ID} | Langue appliquée ${effectiveLanguage.toUpperCase()} (${reason})`,
      result
    );
    return result;
  });
}

export function applyMerpRmuContentLanguage(options = {}) {
  // Foundry settings can fire quickly and several documents may render while
  // updates are in progress. Serialize language refreshes instead of stacking
  // competing update passes.
  const run = () => applyMerpRmuContentLanguageNow(options);
  contentLanguageRefreshQueue = contentLanguageRefreshQueue.then(run, run);
  return contentLanguageRefreshQueue;
}

export function requestMerpRmuContentLanguageChange(language, {
  notify = true,
  reason = "setting-change"
} = {}) {
  const normalized = language === "en" ? "en" : "fr";
  const now = Date.now();

  // A single settings write can produce both onChange and updateSetting.
  // Collapse the duplicate signals but preserve genuinely separate changes.
  if (
    lastRequestedContentLanguage === normalized &&
    (now - lastRequestedContentLanguageAt) < 1500
  ) {
    return contentLanguageRefreshQueue;
  }

  lastRequestedContentLanguage = normalized;
  lastRequestedContentLanguageAt = now;

  return applyMerpRmuContentLanguage({
    language: normalized,
    notify,
    reason
  });
}

function exposeMerpRmuContentApi() {
  globalThis.MERPUI = globalThis.MERPUI ?? {};
  globalThis.MERPUI.installMerpRmuContent = (options = {}) =>
    installMerpRmuContent({ ...options, force: options.force ?? true });
  globalThis.MERPUI.applyContentLanguage = (options = {}) =>
    applyMerpRmuContentLanguage({
      ...options,
      notify: options.notify ?? true
    });
  globalThis.MERPUI.requestContentLanguage = (language, options = {}) =>
    requestMerpRmuContentLanguageChange(language, {
      ...options,
      notify: options.notify ?? true
    });
  // Compatibility alias for console commands used by earlier builds.
  globalThis.MERPUI.refreshLocalization = globalThis.MERPUI.applyContentLanguage;
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
  globalThis.MERPUI.exportNativeSpellTranslationSources = async () => {
    const data = await loadMerpRmuData();
    const wantedNames = [...new Set(
      (data.rmuNativeSpellLists ?? []).map((entry) => entry.name).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));

    const { pack, index } = await getRmuCompendiumIndex("rmu-spell-law.spell-lists", [
      "name",
      "type",
      "system.name",
      "system.realms",
      "system.profession",
      "system.listType"
    ]);

    const output = {
      generatedAt: new Date().toISOString(),
      source: pack.collection,
      count: wantedNames.length,
      lists: {}
    };

    for (const name of wantedNames) {
      const hit = index.find((entry) =>
        (entry.name ?? entry.system?.name) === name
      );
      if (!hit) {
        output.lists[name] = { missing: true };
        continue;
      }

      const source = await pack.getDocument(hit._id);
      output.lists[name] = {
        name: source.name,
        img: source.img,
        system: {
          name: source.system?.name,
          listType: source.system?.listType,
          realms: source.system?.realms,
          profession: source.system?.profession,
          notes: source.system?.notes ?? "",
          spells: foundry.utils.deepClone(source.system?.spells ?? [])
        }
      };
    }

    const json = JSON.stringify(output, null, 2);
    console.log("MERP UI | Native Spell translation sources", output);
    console.log(json);

    try {
      await navigator.clipboard.writeText(json);
      ui.notifications.info(
        `MERP UI : ${wantedNames.length} listes RMU natives exportées dans le presse-papiers.`
      );
    } catch {
      ui.notifications.warn(
        "MERP UI : export affiché dans la console ; copie automatique impossible."
      );
    }

    return output;
  };

  globalThis.MERPUI.fixLanguagesFolder = async () =>
    repairLanguagesJournalFolderName({ language: contentLanguage() });

  globalThis.MERPUI.fixItemFolderOrder = async () => {
    const itemRoot = game.folders.find((folder) =>
      folder.type === "Item" && ["MERP-RMU", "MERP - RMU"].includes(folder.name)
    );
    return enforceMerpRmuTopLevelItemFolderOrder(itemRoot);
  };
  globalThis.MERPUI.syncCampaignLanguages = async (options = {}) =>
    syncRmuCampaignLanguages(await loadMerpRmuData(), {
      notify: options.notify ?? true
    });
  globalThis.MERPUI.syncCultureLanguages = async (actor = null, options = {}) => {
    if (actor) return syncCultureLanguagesForActor(actor, { notify: options.notify ?? true });
    return syncCultureLanguagesForAllActors({ notify: options.notify ?? true });
  };
  globalThis.MERPUI.repairCustomSpellLists = async (options = {}) =>
    repairMerpRmuCustomSpellListCatalog({
      notify: options.notify ?? true
    });
  globalThis.MERPUI.syncNonRmuSpellListPack = async () => {
    console.warn(
      "merp-ui | syncNonRmuSpellListPack est obsolète : exécution de la migration de monde MERP-RMU 1.5."
    );
    return runMerpRmu15Migration({
      force: true,
      cleanupStartlight: cleanupInvalidStartlightArtifacts,
      notify: false
    });
  };
  globalThis.MERPUI.migrateSpellListArchitecture = (options = {}) =>
    runMerpRmu15Migration({
      force: options.force ?? true,
      cleanupStartlight: cleanupInvalidStartlightArtifacts,
      notify: options.notify ?? false
    });
  globalThis.MERPUI.migrateTo15 = (options = {}) =>
    runMerpRmu15Migration({
      force: options.force ?? true,
      cleanupStartlight: cleanupInvalidStartlightArtifacts,
      notify: options.notify ?? true
    });
  globalThis.MERPUI.deduplicateSpellLists = (options = {}) =>
    deduplicateWorldSpellLists({ verbose: options.verbose ?? true });
  globalThis.MERPUI.cleanupStartlight = (options = {}) =>
    cleanupInvalidStartlightArtifacts({ verbose: options.verbose ?? true });
  globalThis.MERPUI.installIntroduction = (options = {}) =>
    installMerpRmuIntroduction({ ...options, force: options.force ?? true, notify: options.notify ?? true });
  globalThis.MERPUI.installHerbs = (options = {}) =>
    installMerpRmuHerbs({ ...options, force: options.force ?? true, notify: options.notify ?? true });
  globalThis.MERPUI.resetWelcomeChat = () =>
    resetWelcomeChat();
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

