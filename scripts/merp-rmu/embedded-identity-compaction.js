/**
 * MERP-UI — compact Race/Culture/Profession Items embedded in an Actor.
 * Full multilingual Age variants remain in the MERP-RMU Compendiums.
 * This never changes RMU mechanical data, Item IDs or Actor statistics.
 * It intentionally does not run on Compendium or World Items.
 */
const MODULE_ID = "merp-ui";
const IDENTITY_TYPES = new Set(["race", "culture", "profession"]);

// Both formats exist in the MERP-ui Compendium source documents:
//  - compendiumAgeVariants / compendiumLocalizations: generated metadata
//  - ageVariants / localizations: legacy/editorial source metadata
// Dropping only the former left complete literary chapters in newly created
// Actors, notably their automatic initial Humans (Hildor) Race.
const BULKY_FLAGS = [
  "compendiumAgeVariants",
  "compendiumLocalizations",
  "ageVariants",
  "localizations"
];

function isManagedIdentity(data) {
  if (!data || !IDENTITY_TYPES.has(data.type)) return false;
  const flags = data.flags?.[MODULE_ID];
  return Boolean(flags && typeof flags === "object" &&
    (flags.compendiumPack || flags.compendiumSourceKey));
}

/** Pure data transformer. A null result means no changes are necessary. */
export function compactEmbeddedIdentityData(data) {
  if (!isManagedIdentity(data)) return null;
  const flags = data.flags[MODULE_ID];
  const compact = { ...flags };
  let changed = false;
  for (const field of BULKY_FLAGS) {
    if (Object.hasOwn(compact, field)) {
      delete compact[field];
      changed = true;
    }
  }
  // Resolve RMU's native profession chassis BEFORE dropping this definition.
  if (data.type === "profession" && flags.resolvedFromCompendium &&
      Object.hasOwn(compact, "nativeProfessionDefinition")) {
    delete compact.nativeProfessionDefinition;
    changed = true;
  }

  // Managed identity descriptions are reference text: the Race, Culture and
  // Profession sheet buttons read them from the Compendium on demand. Never
  // duplicate any length of this text in the Actor (including short entries).
  const trimDescription = typeof data.system?.description === "string" &&
    data.system.description.length > 0;
  if (!changed && !trimDescription) return null;
  return {
    ...data,
    ...(trimDescription ? { system: { ...data.system, description: "" } } : {}),
    flags: { ...data.flags, [MODULE_ID]: compact }
  };
}

/** Compact embedded identity items of a new Actor before its first save. */
export function compactPendingActorIdentities(actor) {
  const source = actor?.toObject?.();
  if (!Array.isArray(source?.items)) return 0;
  let changed = 0;
  const items = source.items.map(item => {
    const compact = compactEmbeddedIdentityData(item);
    if (compact) { changed++; return compact; }
    return item;
  });
  if (changed) actor.updateSource({ items });
  return changed;
}

/** Compact an Item after the native MERP/RMU materialization has finished. */
export async function compactCreatedActorIdentity(item) {
  if (!item?.parent || item.parent.documentName !== "Actor" ||
      !isManagedIdentity(item)) return { compacted: false };
  const flags = item.flags[MODULE_ID];
  const removals = BULKY_FLAGS.filter(key => Object.hasOwn(flags, key));
  if (item.type === "profession" && flags.resolvedFromCompendium &&
      Object.hasOwn(flags, "nativeProfessionDefinition")) {
    removals.push("nativeProfessionDefinition");
  }
  const trimDescription = typeof item.system?.description === "string" &&
    item.system.description.length > 0;
  if (!removals.length && !trimDescription) return { compacted: false };
  const changes = {};
  if (trimDescription) changes["system.description"] = "";
  for (const key of removals) changes[`flags.${MODULE_ID}.-=${key}`] = null;
  await item.update(changes, {
    render: false,
    merpUiCompendiumMaterialize: true,
    merpUiIdentityCompaction: true
  });
  // Do not report success if the data-model rejected a flag deletion.
  const remaining = removals.filter(key => Object.hasOwn(item.flags?.[MODULE_ID] ?? {}, key));
  if (remaining.length) {
    throw new Error(`Compactage incomplet pour ${item.name}: ${remaining.join(", ")}`);
  }
  if (trimDescription && item.system?.description) {
    throw new Error(`Compactage incomplet pour ${item.name}: system.description`);
  }
  return { compacted: true, removed: removals, descriptionTrimmed: trimDescription };
}
