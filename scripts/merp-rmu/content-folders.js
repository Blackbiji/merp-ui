import { contentLanguage } from "./localization.js";

const MODULE_ID = "merp-ui";

export function folderParentId(folder) {
  return folder?.folder?.id ?? folder?.folder ?? null;
}

export async function ensureFolder(name, type, parent = null, sort = null, sorting = null, aliases = []) {
  const parentId = parent?.id ?? parent ?? null;
  const acceptedNames = new Set([name, ...(aliases ?? [])].filter(Boolean));
  let folder = game.folders.find((candidate) =>
    candidate.type === type &&
    acceptedNames.has(candidate.name) &&
    folderParentId(candidate) === parentId
  );

  if (!folder) {
    folder = await Folder.create({
      name,
      type,
      folder: parentId,
      sorting: sorting ?? "a",
      sort: sort ?? 0
    });
  } else {
    const update = {};
    if (folder.name !== name) update.name = name;
    if (sort !== null && folder.sort !== sort) update.sort = sort;
    if (sorting !== null && folder.sorting !== sorting) update.sorting = sorting;
    if (Object.keys(update).length) await folder.update(update);
  }

  return folder;
}

export async function ensureItemFolder(name, parent = null, sort = null, sorting = null, aliases = []) {
  return ensureFolder(name, "Item", parent, sort, sorting, aliases);
}

export async function ensureJournalFolder(name, parent = null, sort = null, sorting = null, aliases = []) {
  return ensureFolder(name, "JournalEntry", parent, sort, sorting, aliases);
}

export function localizedFolderName(definition) {
  const localized = definition?.localizations?.[contentLanguage()] ?? null;
  return localized?.name ?? definition?.name ?? "";
}

export function localizedFolderAliases(definition) {
  const names = new Set([definition?.name]);
  for (const localized of Object.values(definition?.localizations ?? {})) {
    if (localized?.name) names.add(localized.name);
  }
  return [...names].filter(Boolean);
}

export async function ensureConfiguredFolders(folderDefs, root, type = "Item") {
  const folders = new Map();
  const pending = [...folderDefs];

  while (pending.length) {
    let progressed = false;

    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const def = pending[index];
      const parent = def.parent ? folders.get(def.parent) : root;
      if (def.parent && !parent) continue;

            const folderName = localizedFolderName(def);
      const aliases = localizedFolderAliases(def);
      const folder = await ensureFolder(
        folderName,
        type,
        parent,
        def.sort ?? null,
        def.sorting ?? null,
        aliases
      );

      // Stable technical identity for cross-feature folder reuse. This prevents
      // standalone installers (e.g. Honnin) from recreating the same hierarchy
      // from display names that may differ by language/case.
      if (
        folder.getFlag?.(MODULE_ID, "folderKey") !== def.key ||
        folder.getFlag?.(MODULE_ID, "collection") !== "merp-rmu-folder"
      ) {
        await folder.update({
          [`flags.${MODULE_ID}.folderKey`]: def.key,
          [`flags.${MODULE_ID}.collection`]: "merp-rmu-folder"
        }, { render: false, merpUiFolderIdentity: true });
      }

      folders.set(def.key, folder);
      pending.splice(index, 1);
      progressed = true;
    }

    if (!progressed) {
      throw new Error(`Définition circulaire ou parent inconnu dans les dossiers MERP-RMU : ${
        pending.map((def) => def.key).join(", ")
      }`);
    }
  }

  return folders;
}

export function merpRmuTopLevelItemFolderIdentity(folder) {
  const technical = String(
    folder?.getFlag?.(MODULE_ID, "folderKey") ??
    folder?.getFlag?.(MODULE_ID, "key") ??
    ""
  ).toLocaleLowerCase();
  const name = String(folder?.name ?? "").trim().toLocaleLowerCase();

  if (technical === "races" || name === "races") return "races";
  if (technical === "cultures" || name === "cultures") return "cultures";
  if (technical === "professions" || name === "professions") return "professions";
  if (
    technical === "skills" ||
    name === "skills" ||
    name === "compétences" ||
    name === "competences"
  ) return "skills";
  if (
    technical === "spell-lists" ||
    name === "listes de sorts" ||
    name === "spell lists"
  ) return "spell-lists";
  if (
    technical.includes("talent") ||
    name === "talents & défauts" ||
    name === "talents & defauts" ||
    name === "talents & flaws"
  ) return "talents-flaws";
  if (
    technical.includes("herb") ||
    name === "herbes & substances" ||
    name === "herbs & substances"
  ) return "herbs-substances";
  return null;
}

export async function enforceMerpRmuTopLevelItemFolderOrder(itemRoot) {
  if (!itemRoot) return { skipped: true, reason: "no-item-root" };

  const wanted = [
    ["races", 10000],
    ["cultures", 20000],
    ["professions", 30000],
    ["skills", 40000],
    ["spell-lists", 50000],
    ["talents-flaws", 60000],
    ["herbs-substances", 70000]
  ];

  // Foundry orders children using the parent's sorting mode. The parent must
  // therefore be manual, while each child receives a stable sort value.
  if (itemRoot.sorting !== "m") {
    await itemRoot.update(
      { sorting: "m" },
      { render: false, merpUiFolderOrderRepair: true }
    );
  }

  const children = (game.folders?.contents ?? []).filter((folder) =>
    folder.type === "Item" && folderParentId(folder) === itemRoot.id
  );

  const details = [];
  for (const [identity, sort] of wanted) {
    const folder = children.find(
      (candidate) => merpRmuTopLevelItemFolderIdentity(candidate) === identity
    );
    if (!folder) {
      details.push({ identity, found: false });
      continue;
    }

    const update = {};
    if (Number(folder.sort ?? 0) !== sort) update.sort = sort;
    if (folder.sorting !== "m") update.sorting = "m";

    if (Object.keys(update).length) {
      await folder.update(
        update,
        { render: false, merpUiFolderOrderRepair: true }
      );
    }
    details.push({
      identity,
      found: true,
      name: folder.name,
      sort
    });
  }

  return {
    expected: wanted.length,
    found: details.filter((entry) => entry.found).length,
    details
  };
}

export async function repairLanguagesJournalFolderName({ language = contentLanguage() } = {}) {
  const desiredName = language === "en" ? "Languages" : "Langues";
  const rootName = language === "en" ? "MERP-RMU Rules" : "Règles MERP - RMU";

  const root = game.folders.find((folder) =>
    folder.type === "JournalEntry" &&
    folderParentId(folder) === null &&
    ["MERP-RMU Rules", "Règles MERP - RMU"].includes(folder.name)
  ) ?? await ensureJournalFolder(
    rootName,
    null,
    null,
    null,
    ["MERP-RMU Rules", "Règles MERP - RMU"]
  );

  const aliases = new Set(["Langues", "Langages", "Languages"]);
  const candidates = (game.folders?.contents ?? []).filter((folder) =>
    folder.type === "JournalEntry" &&
    folderParentId(folder) === root.id &&
    (
      folder.getFlag?.(MODULE_ID, "folderKey") === "regles-langages" ||
      aliases.has(folder.name)
    )
  );

  // Identify the folder that actually contains the managed language journals.
  const languageJournals = (game.journal?.contents ?? []).filter((journal) =>
    journal.getFlag?.(MODULE_ID, "collection") === "merp-rmu-rules" &&
    journal.getFlag?.(MODULE_ID, "section") === "langages"
  );

  const journalFolderCounts = new Map();
  for (const journal of languageJournals) {
    const folderId = journal.folder?.id ?? journal.folder ?? null;
    if (!folderId) continue;
    journalFolderCounts.set(
      folderId,
      (journalFolderCounts.get(folderId) ?? 0) + 1
    );
  }

  let canonical = candidates
    .slice()
    .sort((a, b) =>
      (journalFolderCounts.get(b.id) ?? 0) - (journalFolderCounts.get(a.id) ?? 0)
    )[0] ?? null;

  if (!canonical) {
    canonical = await Folder.create({
      name: desiredName,
      type: "JournalEntry",
      folder: root.id,
      sorting: "a",
      sort: 20,
      flags: {
        [MODULE_ID]: {
          folderKey: "regles-langages",
          collection: "merp-rmu-folder"
        }
      }
    });
  }

  // Move every managed language journal into the canonical folder.
  let moved = 0;
  for (const journal of languageJournals) {
    const currentFolderId = journal.folder?.id ?? journal.folder ?? null;
    if (currentFolderId !== canonical.id) {
      await journal.update(
        { folder: canonical.id },
        { render: false, merpUiLanguagesFolderRepair: true }
      );
      moved += 1;
    }
  }

  // Canonicalize name, identity, and ordering.
  const update = {};
  if (canonical.name !== desiredName) update.name = desiredName;
  if (Number(canonical.sort ?? 0) !== 20) update.sort = 20;
  if (canonical.sorting !== "a") update.sorting = "a";
  if (canonical.getFlag?.(MODULE_ID, "folderKey") !== "regles-langages") {
    update[`flags.${MODULE_ID}.folderKey`] = "regles-langages";
  }
  if (canonical.getFlag?.(MODULE_ID, "collection") !== "merp-rmu-folder") {
    update[`flags.${MODULE_ID}.collection`] = "merp-rmu-folder";
  }
  if (Object.keys(update).length) {
    await canonical.update(
      update,
      { render: false, merpUiLanguagesFolderRepair: true }
    );
  }

  // Remove only duplicate alias folders which are empty after the move.
  let deletedDuplicates = 0;
  for (const duplicate of candidates) {
    if (duplicate.id === canonical.id) continue;

    const hasJournalChildren = (game.journal?.contents ?? []).some((journal) => {
      const folderId = journal.folder?.id ?? journal.folder ?? null;
      return folderId === duplicate.id;
    });
    const hasFolderChildren = (game.folders?.contents ?? []).some((folder) =>
      folderParentId(folder) === duplicate.id
    );

    if (!hasJournalChildren && !hasFolderChildren) {
      await duplicate.delete({ merpUiLanguagesFolderRepair: true });
      deletedDuplicates += 1;
    }
  }

  return {
    action: Object.keys(update).length ? "updated" : "unchanged",
    name: canonical.name,
    language,
    folderId: canonical.id,
    managedLanguageJournals: languageJournals.length,
    moved,
    duplicateCandidates: candidates.length,
    deletedDuplicates
  };
}
