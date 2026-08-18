import { contentLanguage } from "./localization.js";
import {
  enforceMerpRmuTopLevelItemFolderOrder,
  folderParentId,
  repairLanguagesJournalFolderName
} from "./content-folders.js";
import { removeEmptyLegacyTalentsFlawsFolder } from "./content-migrations.js";
import {
  clearLegacyMerpRmuSpellListPack,
  deduplicateWorldSpellLists
} from "./spell-list-migrations.js";
import { forceProfessionChassis } from "./professions.js";

const MODULE_ID = "merp-ui";
const ROOT_FOLDER = "MERP-RMU";
const SETTING = "merpRmu15MigrationVersion";
const CURRENT_VERSION = 1;

export function registerMerpRmu15MigrationSetting() {
  if (game.settings.settings.has(`${MODULE_ID}.${SETTING}`)) return;
  game.settings.register(MODULE_ID, SETTING, {
    name: "Version de migration MERP-RMU vers l’architecture 1.5",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });
}

async function cleanupLegacyRmssTalentItems() {
  const items = (game.items?.contents ?? []).filter((item) =>
    item.type === "talent" &&
    item.getFlag?.(MODULE_ID, "collection") === "rmss-frp-talents-flaws"
  );
  if (items.length) {
    await Item.deleteDocuments(
      items.map((item) => item.id),
      { merpUi15Migration: true }
    );
  }
  return { deletedItems: items.length };
}

export async function runMerpRmu15Migration({
  force = false,
  cleanupStartlight = null,
  notify = false
} = {}) {
  if (!game.user?.isGM || game.system?.id !== "rmu") {
    return { skipped: true, reason: "not-gm-or-rmu" };
  }

  const installed = Number(game.settings.get(MODULE_ID, SETTING) || 0);
  if (!force && installed >= CURRENT_VERSION) {
    return { skipped: true, reason: "already-current", version: installed };
  }

  const details = {};

  // Safe technical cleanup only: never identify a legacy Talent catalogue by
  // its visible translated name.
  details.legacyTalentItems = await cleanupLegacyRmssTalentItems();

  details.startlight = typeof cleanupStartlight === "function"
    ? await cleanupStartlight({ verbose: false })
    : { skipped: true, reason: "callback-unavailable" };

  details.legacySpellListPack = await clearLegacyMerpRmuSpellListPack();
  details.spellListDeduplication =
    await deduplicateWorldSpellLists({ verbose: false });

  details.professionChassis = await forceProfessionChassis({
    notify: false,
    includeEmbedded: true
  });

  details.languagesFolder = await repairLanguagesJournalFolderName({
    language: contentLanguage()
  });

  const itemRoot = (game.folders?.contents ?? []).find((folder) =>
    folder.type === "Item" &&
    folder.name === ROOT_FOLDER &&
    folderParentId(folder) === null
  ) ?? null;
  details.itemFolderOrder =
    await enforceMerpRmuTopLevelItemFolderOrder(itemRoot);

  details.emptyLegacyTalentFolder =
    await removeEmptyLegacyTalentsFlawsFolder();

  await game.settings.set(MODULE_ID, SETTING, CURRENT_VERSION);

  const result = { version: CURRENT_VERSION, details };
  if (notify) {
    ui.notifications.info(
      "MERP UI : migration du monde vers l’architecture MERP-RMU 1.5 terminée."
    );
  }
  console.log(`${MODULE_ID} | Migration 1.4.x → 1.5`, result);
  return result;
}
