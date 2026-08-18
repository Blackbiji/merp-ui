const MODULE_ID = "merp-ui";

/**
 * Thin compatibility boundary around RMU/Foundry compendium access.
 *
 * MERP-RMU content code should use these helpers instead of depending directly
 * on RMU pack/index implementation details.  This module deliberately contains
 * no MERP rules and performs no writes to native RMU compendiums.
 */
export function getRmuCompendium(packId) {
  return game.packs.get(packId) ?? null;
}

export async function getRmuCompendiumIndex(packId, fields = []) {
  const pack = getRmuCompendium(packId);
  if (!pack) return { pack: null, index: [] };
  const index = await pack.getIndex(fields.length ? { fields } : {});
  return { pack, index: [...index] };
}

export async function findRmuCompendiumDocument(packId, {
  id = null,
  name = null,
  type = null,
  fields = ["name", "type"],
  predicate = null
} = {}) {
  const pack = getRmuCompendium(packId);
  if (!pack) return null;

  if (id) {
    const direct = await pack.getDocument(id);
    if (direct) return direct;
  }

  const index = [...await pack.getIndex({ fields })];
  let hit = null;
  if (typeof predicate === "function") hit = index.find(predicate) ?? null;
  if (!hit && name && type) hit = index.find((entry) => entry.name === name && entry.type === type) ?? null;
  if (!hit && name) hit = index.find((entry) => entry.name === name) ?? null;
  return hit ? await pack.getDocument(hit._id) : null;
}

export function cloneRmuDocument(document) {
  if (!document) return null;
  const clone = document.toObject();
  delete clone._id;
  delete clone.folder;
  delete clone._stats;
  return clone;
}

export async function cloneRmuCompendiumDocument(packId, criteria = {}) {
  const document = await findRmuCompendiumDocument(packId, criteria);
  return cloneRmuDocument(document);
}

export function exposeRmuAdapterApi() {
  globalThis.MERPUI ??= {};
  globalThis.MERPUI.rmu ??= {};
  Object.assign(globalThis.MERPUI.rmu, {
    getCompendium: getRmuCompendium,
    getCompendiumIndex: getRmuCompendiumIndex,
    findCompendiumDocument: findRmuCompendiumDocument,
    cloneDocument: cloneRmuDocument,
    cloneCompendiumDocument: cloneRmuCompendiumDocument
  });
  console.debug?.(`${MODULE_ID} | RMU adapter ready`);
}
