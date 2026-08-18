const MODULE_ID = "merp-ui";
const ROOT_FOLDER = "MERP-RMU";
const SETTING = "merpRmuLegacyMigrationVersion";
const CURRENT_VERSION = 3;

function folderParentId(folder) {
  return folder?.folder?.id ?? folder?.folder ?? folder?.parent?.id ?? folder?._source?.folder ?? null;
}

export function registerMerpRmuLegacyMigrationSetting() {
  if (game.settings.settings.has(`${MODULE_ID}.${SETTING}`)) return;
  game.settings.register(MODULE_ID, SETTING, {
    name: "Version des migrations historiques MERP-RMU",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });
}

async function cleanupLegacyRmssTalentFlawImport() {
  if (!game.user?.isGM || game.system?.id !== "rmu") return { skipped: true, reason: "not-gm-or-rmu" };

  const managedItems = (game.items?.contents ?? []).filter((item) =>
    item.type === "talent" && item.getFlag?.(MODULE_ID, "collection") === "rmss-frp-talents-flaws"
  );
  if (managedItems.length) {
    await Item.deleteDocuments(managedItems.map((item) => item.id), { merpUiTalentFlawRollback: true });
  }

  const itemFolders = (game.folders?.contents ?? []).filter((folder) => folder.type === "Item");
  const rootFolders = itemFolders.filter((folder) => folder.name === ROOT_FOLDER);
  const rootIds = new Set(rootFolders.map((folder) => folder.id));

  const isUnderRoot = (folder) => {
    let current = folder;
    const seen = new Set();
    while (current && !seen.has(current.id)) {
      if (rootIds.has(current.id)) return true;
      seen.add(current.id);
      const pid = folderParentId(current);
      current = pid ? itemFolders.find((candidate) => candidate.id === pid) : null;
    }
    return false;
  };

  // Only the obsolete 1.2.117 catalogue used the English folder name.
  // The current catalogue is "Talents & Défauts" and must never be touched.
  const catalogues = itemFolders.filter((folder) => folder.name === "Talents & Flaws" && isUnderRoot(folder));
  const catalogueIds = new Set(catalogues.map((folder) => folder.id));
  const isUnderCatalogue = (folder) => {
    let current = folder;
    const seen = new Set();
    while (current && !seen.has(current.id)) {
      if (catalogueIds.has(current.id)) return true;
      seen.add(current.id);
      const pid = folderParentId(current);
      current = pid ? itemFolders.find((candidate) => candidate.id === pid) : null;
    }
    return false;
  };

  const foldersToDelete = itemFolders.filter(isUnderCatalogue);
  const depth = (folder) => {
    let d = 0;
    let current = folder;
    const seen = new Set();
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      const pid = folderParentId(current);
      current = pid ? itemFolders.find((candidate) => candidate.id === pid) : null;
      if (current) d += 1;
    }
    return d;
  };
  foldersToDelete.sort((a, b) => depth(b) - depth(a));
  for (const folder of foldersToDelete) {
    const live = game.folders?.get(folder.id);
    if (live) await live.delete({ merpUiTalentFlawRollback: true });
  }

  const result = { deletedItems: managedItems.length, deletedFolders: foldersToDelete.length };
  return result;
}


async function ensureJournalFolder(name, parent = null, sort = null) {
  const parentId = parent?.id ?? parent ?? null;
  let folder = (game.folders?.contents ?? []).find((candidate) =>
    candidate.type === "JournalEntry" &&
    candidate.name === name &&
    folderParentId(candidate) === parentId
  ) ?? null;
  if (!folder) {
    folder = await Folder.create({
      name,
      type: "JournalEntry",
      folder: parentId,
      sorting: "m",
      ...(Number.isFinite(sort) ? { sort } : {})
    }, { merpUiLegacyMigration: true });
  }
  return folder;
}

async function normalizeRulesJournalFolders() {
  const rulesRoot = (game.folders?.contents ?? []).find((folder) =>
    folder.type === "JournalEntry" &&
    folder.name === "Règles MERP - RMU" &&
    folderParentId(folder) === null
  ) ?? null;
  if (!rulesRoot) return { skipped: true, reason: "rules-root-missing", moved: 0 };

  const economyFolder = await ensureJournalFolder("Économie", rulesRoot, 30);
  const religionsFolder = await ensureJournalFolder("Religions", rulesRoot, 40);
  const targets = new Map([
    ["economie", economyFolder],
    ["religions", religionsFolder]
  ]);
  const names = new Map([
    ["Économie", "economie"],
    ["Economie", "economie"],
    ["Religions", "religions"],
    ["Religion", "religions"]
  ]);

  let moved = 0;
  const details = [];
  for (const journal of game.journal?.contents ?? []) {
    const collection = journal.getFlag?.(MODULE_ID, "collection");
    const flaggedKey = journal.getFlag?.(MODULE_ID, "key");
    const currentId = journal.folder?.id ?? journal.folder ?? null;

    // Older MERP-UI worlds may predate the merp-ui flags on these two rule
    // journals.  In that case use the canonical journal name, but only when
    // the entry already belongs to the MERP-RMU rules root (or is unfiled).
    let key = collection === "merp-rmu-rules" ? flaggedKey : null;
    if (!targets.has(key)) {
      const nameKey = names.get(journal.name);
      if (nameKey && (currentId === rulesRoot.id || currentId === null)) key = nameKey;
    }

    const target = targets.get(key);
    if (!target || currentId === target.id) continue;
    await journal.update({ folder: target.id }, { render: false, merpUiLegacyMigration: true });
    moved += 1;
    details.push({ journal: journal.name, folder: target.name });
  }

  return { moved, folders: [economyFolder.name, religionsFolder.name], details };
}

export async function runMerpRmuLegacyMigrations({ cleanupStartlight = null } = {}) {
  if (!game.user?.isGM || game.system?.id !== "rmu") return { skipped: true, reason: "not-gm-or-rmu" };
  const installed = Number(game.settings.get(MODULE_ID, SETTING) || 0);
  if (installed >= CURRENT_VERSION) return { skipped: true, reason: "already-current", version: installed };

  const details = [];
  let version = installed;

  if (version < 1) {
    const talentFlaws = await cleanupLegacyRmssTalentFlawImport();
    let startlight = { skipped: true, reason: "callback-unavailable" };
    if (typeof cleanupStartlight === "function") startlight = await cleanupStartlight({ verbose: false });
    details.push({ migration: 1, name: "legacy-cleanup-1.2.x", talentFlaws, startlight });
    version = 1;
    await game.settings.set(MODULE_ID, SETTING, version);
  }

  // Versions 2 and 3 performed the same folder normalization. Older worlds
  // only need the final normalized layout once, then can advance directly to 3.
  if (version < 3) {
    const rulesFolders = await normalizeRulesJournalFolders();
    details.push({
      migration: 3,
      name: "rules-journal-layout-1.3.2-1.3.3",
      rulesFolders
    });
    version = 3;
    await game.settings.set(MODULE_ID, SETTING, version);
  }

  const result = { version, details };
  return result;
}
