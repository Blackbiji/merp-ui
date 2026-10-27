const MODULE_ID = "merp-ui";

// Shared pure helpers for Spell List identity/comparison.
// These are runtime utilities, not migration logic.

export function spellListSignature(itemOrData) {
  const system = itemOrData?.system ?? {};
  return [
    itemOrData?.name ?? "",
    system.listType ?? "",
    system.profession ?? "",
    system.realms ?? ""
  ].join("\u0000");
}

export function spellListSystemFingerprint(item) {
  return JSON.stringify(item?.system?.toObject ? item.system.toObject() : (item?.system ?? {}));
}

export async function removeExactImportedSpellListDuplicates(candidates) {
  const groups = new Map();
  for (const item of candidates) {
    const source = item._stats?.compendiumSource ?? null;
    if (!source) continue;
    const key = `${source}\u0000${spellListSystemFingerprint(item)}`;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  let deleted = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => Number(a._stats?.createdTime ?? 0) - Number(b._stats?.createdTime ?? 0));
    const extras = group.slice(1);
    if (extras.length) {
      await Item.deleteDocuments(extras.map((item) => item.id));
      deleted += extras.length;
    }
  }
  return deleted;
}

// Remove duplicate world spell-list Items created by repeated full Compendium imports.
// RMU builds the Base/Open/Closed specialization menus from world Items, so each
// duplicate Item becomes a duplicate option in the UI. RMU identifies a spell-list
// specialization by its visible list identity (name + list type + profession + realm),
// so repeated imports may still differ in harmless metadata/system details while
// producing the same menu option. Deduplicate by that RMU identity. MERP variants
// remain distinct whenever their profession/list type/realm differs (e.g. Animist
// copies derived from Druid lists).

const RMU_REALM_SPELL_LIST_ICONS = Object.freeze({
  "Essence": "icons/magic/symbols/elements-air-earth-fire-water.webp",
  "Mentalism": "icons/magic/symbols/circled-gem-pink.webp",
  "Channeling": "icons/magic/symbols/rune-sigil-horned-white-purple.webp",
  "Channeling,Essence": "icons/magic/symbols/circle-ouroboros.webp",
  "Essence,Channeling": "icons/magic/symbols/circle-ouroboros.webp",
  "Essence,Mentalism": "icons/magic/symbols/rune-sigil-hook-white-red.webp",
  "Mentalism,Essence": "icons/magic/symbols/rune-sigil-hook-white-red.webp",
  "Channeling,Mentalism": "icons/magic/symbols/chevron-elipse-circle-blue.webp",
  "Mentalism,Channeling": "icons/magic/symbols/chevron-elipse-circle-blue.webp"
});

export function rmuRealmSpellListIcon(realms) {
  const key = Array.isArray(realms)
    ? realms.map((realm) => String(realm).trim()).filter(Boolean).join(",")
    : String(realms ?? "")
        .split(",")
        .map((realm) => realm.trim())
        .filter(Boolean)
        .join(",");
  return RMU_REALM_SPELL_LIST_ICONS[key] ?? null;
}
