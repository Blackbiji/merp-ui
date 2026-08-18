import { removeExactImportedSpellListDuplicates, spellListSignature, spellListSystemFingerprint } from "./spell-list-utils.js";
const MODULE_ID = "merp-ui";
const LEGACY_PACK_ID = "world.merp-rmu-spell-lists";

export async function deduplicateWorldSpellLists({ verbose = false } = {}) {
  if (!game.user?.isGM) return { deleted: 0, groups: 0, skippedMissing: 0, details: [] };

  const groups = new Map();
  for (const item of game.items.filter((candidate) => candidate.type === "spell-list")) {
    const key = spellListSignature(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  let deleted = 0;
  let duplicateGroups = 0;
  let skippedMissing = 0;
  const details = [];

  for (const [signature, originalGroup] of groups.entries()) {
    // Work from live documents only. A prior synchronization pass may already have
    // deleted one of the documents which was present when the group was assembled.
    const group = originalGroup
      .map((item) => game.items.get(item.id))
      .filter(Boolean);
    if (group.length < 2) continue;
    duplicateGroups += 1;

    // Prefer a native RMU Compendium import over a MERP-UI mirror. Otherwise keep
    // the oldest document, which is the least surprising choice for existing worlds.
    group.sort((a, b) => {
      const aNative = Boolean(a._stats?.compendiumSource) && a.getFlag?.(MODULE_ID, "collection") !== "merp-rmu";
      const bNative = Boolean(b._stats?.compendiumSource) && b.getFlag?.(MODULE_ID, "collection") !== "merp-rmu";
      if (aNative !== bNative) return aNative ? -1 : 1;
      return Number(a._stats?.createdTime ?? 0) - Number(b._stats?.createdTime ?? 0);
    });

    const keeper = group[0];
    const removed = [];
    for (const extra of group.slice(1)) {
      const live = game.items.get(extra.id);
      if (!live) {
        skippedMissing += 1;
        continue;
      }
      try {
        await live.delete({ merpUiSpellListDeduplication: true });
        deleted += 1;
        removed.push(extra.id);
      } catch (error) {
        // Foundry v14 may report a stale world Item during a migration if another
        // synchronization step removed it milliseconds earlier. Missing documents
        // are safe to ignore; other errors are surfaced without aborting all groups.
        if (!game.items.get(extra.id)) {
          skippedMissing += 1;
          console.debug(`${MODULE_ID} | Liste déjà supprimée pendant le dédoublonnage : ${extra.id}`);
        } else {
          console.warn(`${MODULE_ID} | Impossible de supprimer le doublon de liste ${extra.name} (${extra.id})`, error);
        }
      }
    }

    if (removed.length || verbose) {
      details.push({
        signature,
        name: keeper.name,
        kept: keeper.id,
        removed,
        profession: keeper.system?.profession ?? "",
        listType: keeper.system?.listType ?? "",
        realms: keeper.system?.realms ?? ""
      });
    }
  }

  const result = { deleted, groups: duplicateGroups, skippedMissing, details };
  if (verbose) console.table(details.map((entry) => ({
    name: entry.name,
    listType: entry.listType,
    profession: entry.profession,
    realms: entry.realms,
    kept: entry.kept,
    removed: entry.removed.join(", ")
  })));
  return result;
}




export async function clearLegacyMerpRmuSpellListPack() {
  const pack = game.packs.get(LEGACY_PACK_ID);
  if (!pack) return { deleted: 0, pack: null };
  const wasLocked = pack.locked;
  await pack.configure({ locked: false });
  try {
    const docs = await pack.getDocuments();
    const managed = docs.filter((doc) =>
      doc.getFlag?.(MODULE_ID, "compendiumManaged") ||
      ["merp-rmu","honnin-beta"].includes(doc.getFlag?.(MODULE_ID, "collection"))
    );
    if (managed.length) {
      await Item.deleteDocuments(managed.map((doc)=>doc.id), { pack: pack.collection });
    }
    await pack.configure({ label: "MERP-RMU — Archive technique (vide)" });
    return { deleted: managed.length, pack: pack.collection };
  } finally {
    if (wasLocked) await pack.configure({ locked: true });
  }
}
