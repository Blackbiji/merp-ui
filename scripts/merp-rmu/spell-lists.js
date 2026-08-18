import {
  contentLanguage,
  flattenLocalizationUpdate,
  localizeManagedDocument,
  localizeManagedSpellListDocument,
  localizedPatchNeedsUpdate,
  localizedSpellListPatch
} from "./localization.js";
import {
  ensureConfiguredFolders,
  ensureItemFolder
} from "./content-folders.js";
import { getRmuCompendiumIndex } from "./rmu-adapter.js";
import {
  removeExactImportedSpellListDuplicates,
  spellListSignature
} from "./spell-list-utils.js";
import { repairHonninCanonicalPlacement } from "./honnin-beta.js";
import {
  findManagedItem,
  upsertManagedItem
} from "./managed-content.js";

const MODULE_ID = "merp-ui";
const ROOT_FOLDER = "MERP-RMU";
const DATA_PATH = `modules/${MODULE_ID}/data/merp-rmu/khazad.json`;
const NON_RMU_DATA_PATH = `modules/${MODULE_ID}/data/merp-rmu/non-rmu-spell-lists.json`;
const NATIVE_SPELL_TRANSLATIONS_PATH =
  `modules/${MODULE_ID}/data/merp-rmu/native-spell-translations.json`;

async function loadMerpRmuData() {
  const response = await fetch(DATA_PATH, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Unable to load ${DATA_PATH}: ${response.status}`);
  return response.json();
}

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

export function applyRmuRealmSpellListIcon(document) {
  const icon = rmuRealmSpellListIcon(document?.system?.realms);
  if (icon) document.img = icon;
  return document;
}


export async function loadNonRmuSpellListData() {
  const route = foundry?.utils?.getRoute ? foundry.utils.getRoute(NON_RMU_DATA_PATH) : NON_RMU_DATA_PATH;
  const response = await fetch(route, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Listes MERP-RMU non-RMU introuvables : HTTP ${response.status}`);
  return response.json();
}

let nativeSpellTranslationsCache = null;

export async function loadNativeSpellTranslations() {
  if (nativeSpellTranslationsCache) return nativeSpellTranslationsCache;
  const route = foundry?.utils?.getRoute
    ? foundry.utils.getRoute(NATIVE_SPELL_TRANSLATIONS_PATH)
    : NATIVE_SPELL_TRANSLATIONS_PATH;
  const response = await fetch(route, { cache: "no-store" });
  if (!response.ok) throw new Error(`Impossible de charger les traductions des sorts RMU natifs (${response.status})`);
  nativeSpellTranslationsCache = await response.json();
  return nativeSpellTranslationsCache;
}

export function applyNativeSpellTranslationOverlay(document, sourceListName, translations) {
  const result = foundry.utils.deepClone(document ?? {});
  if (contentLanguage() !== "fr") return result;

  const listTranslation = translations?.lists?.[sourceListName]?.fr;
  if (!listTranslation) return result;

  if (listTranslation.name) {
    result.name = listTranslation.name;
    result.system ??= {};
    result.system.name = listTranslation.name;
    result.system.label = listTranslation.name;
  }

  if (listTranslation.notes !== undefined) {
    result.system ??= {};
    result.system.notes = listTranslation.notes;
    result.system.notesLabel = `${result.name} — notes`;
  }

  if (Array.isArray(result.system?.spells)) {
    result.system.spells = result.system.spells.map((spell) => {
      const translated = listTranslation.spells?.[spell.name];
      if (!translated) return spell;
      const copy = foundry.utils.deepClone(spell);
      if (translated.name) {
        copy.name = translated.name;
        copy.spellName = translated.name;
      }
      if (translated.description !== undefined) copy.description = translated.description;
      copy.spellList = result.name;
      return copy;
    });
  }
  return result;
}

export async function upsertConfiguredNativeSpellLists(defs, folders) {
  const results = [];
  if (!defs?.length) return results;

  const nativeSpellTranslations = await loadNativeSpellTranslations();

  const { pack, index } = await getRmuCompendiumIndex("rmu-spell-law.spell-lists", [
    "name", "type", "system.profession", "system.realms", "system.listType"
  ]);
  if (!pack) {
    console.warn(`${MODULE_ID} | Compendium RMU Spell Law introuvable; listes RMU natives ignorées.`);
    return results;
  }

  for (const def of defs) {
    const folder = folders.get(def.folder);
    if (!folder) throw new Error(`Sous-dossier MERP-RMU inconnu pour liste RMU : ${def.folder}`);

    const hit = index.find((entry) =>
      entry.name === def.name &&
      (!def.sourceProfession || entry.system?.profession === def.sourceProfession)
    ) ?? index.find((entry) => entry.name === def.name);

    if (!hit) {
      console.warn(`${MODULE_ID} | Liste RMU native introuvable : ${def.name}`);
      continue;
    }

    const source = await pack.getDocument(hit._id);
    if (!source) continue;

    // If MERP-RMU uses the native RMU list unchanged (same technical profession
    // and realm), the official Compendium itself is the canonical source. Do not
    // create a world mirror, otherwise RMU displays the same specialization twice.
    const targetProfession = def.targetProfession ?? source.system?.profession;
    const targetRealm = def.realm ?? source.system?.realms;
    const unchangedNative =
      targetProfession === source.system?.profession &&
      targetRealm === source.system?.realms;
    if (unchangedNative) {
      const managed = findManagedItem(def.key);
      if (managed) await managed.delete();
      results.push({ action: "reused-compendium", item: source });
      continue;
    }

    let document = source.toObject();
    delete document._id;
    delete document.folder;
    delete document._stats;
    document.system = foundry.utils.deepClone(document.system ?? {});
    if (def.targetName) {
      document.name = def.targetName;
      document.system.name = def.targetName;
    }
    document.system.profession = def.targetProfession ?? document.system.profession;
    document.system.realms = def.realm ?? document.system.realms;
    document.system.listType = def.targetListType ?? document.system.listType;
    for (const spell of document.system.spells ?? []) {
      spell.profession = def.targetProfession ?? spell.profession;
      spell.listType = document.system.listType ?? spell.listType;
      spell.spellList = document.name;
    }

    // Apply MERP-UI's separate editorial translation layer. The RMU Spell Law
    // Compendium remains untouched and is always the mechanical source.
    document = applyNativeSpellTranslationOverlay(
      document,
      def.name,
      nativeSpellTranslations
    );

    document = localizeManagedDocument(document, def.localizations);
    for (const spell of document.system?.spells ?? []) spell.spellList = document.name;

    document.flags = foundry.utils.mergeObject(document.flags ?? {}, {
      [MODULE_ID]: {
        key: def.key,
        collection: "merp-rmu",
        contentVersion: 1,
        nativeRMU: true,
        source: {
          type: "rmu-native-spell-list",
          reference: source.uuid,
          merpMapping: def.merpMapping ?? "Direct RMU"
        }
      }
    }, { inplace: false, overwrite: true });

    const desiredSignature = spellListSignature(document);
    let equivalents = game.items.filter((item) => item.type === "spell-list" && spellListSignature(item) === desiredSignature);

    // Repeated "Import Compendium" operations can create byte-for-byte identical
    // spell-list Items. They otherwise appear several times in RMU's specialization picker.
    await removeExactImportedSpellListDuplicates(equivalents);
    equivalents = game.items.filter((item) => item.type === "spell-list" && spellListSignature(item) === desiredSignature);

    const managed = findManagedItem(def.key);
    const external = equivalents.find((item) => item.id !== managed?.id && item.getFlag(MODULE_ID, "collection") !== "merp-rmu");

    // If the user already imported the native RMU list into the world, use that copy.
    // Our managed mirror is only a fallback for worlds where Spell Law has not been imported.
    if (external) {
      if (managed) await managed.delete();
      results.push({ action: "reused", item: external });
      continue;
    }

    results.push(await upsertManagedItem({ key: def.key, document }, folder));
  }

  return results;
}

export function nonRmuSpellListEntries(data) {
  return (data.spellLists ?? data.items ?? []).filter((entry) =>
    entry.document?.type === "spell-list" &&
    entry.document?.flags?.[MODULE_ID]?.nativeRMU === false
  );
}

export async function syncNonRmuWorldSpellLists(data, folders, { notify = false } = {}) {
  if (!game.user?.isGM) return { created: 0, updated: 0, missingFolders: [] };

  const entries = nonRmuSpellListEntries(data);
  let created = 0;
  let updated = 0;
  const missingFolders = [];

  for (const entry of entries) {
    const folder = folders?.get?.(entry.folder) ?? null;
    if (!folder) {
      missingFolders.push({ key: entry.key, folder: entry.folder });
      continue;
    }

    const prepared = applyRmuRealmSpellListIcon(
      localizeManagedSpellListDocument(entry.document, entry.localizations)
    );
    prepared.folder = folder.id;
    prepared.flags = foundry.utils.mergeObject(prepared.flags ?? {}, {
      [MODULE_ID]: {
        key: entry.key,
        collection: "merp-rmu",
        customSpellList: true,
        nativeRMU: false
      }
    }, { inplace: false, overwrite: true, recursive: true });

    const existing = game.items.find((item) =>
      item.type === "spell-list" &&
      item.getFlag?.(MODULE_ID, "key") === entry.key &&
      item.getFlag?.(MODULE_ID, "collection") === "merp-rmu"
    );

    if (!existing) {
      await Item.create(prepared, { renderSheet: false, merpUiCustomSpellListInstall: true });
      created += 1;
    } else {
      const update = foundry.utils.deepClone(prepared);
      delete update.type;
      delete update._id;
      await existing.update(update, { render: false, merpUiCustomSpellListInstall: true });
      updated += 1;
    }
  }

  if (notify && (created || updated)) {
    ui.notifications.info(`MERP UI : ${created} liste(s) MERP-RMU créée(s), ${updated} mise(s) à jour.`);
  }
  return { created, updated, total: entries.length, missingFolders };
}

export async function refreshNonRmuWorldSpellListLocalization(data = null) {
  data = data ?? await loadNonRmuSpellListData();
  let updated = 0;
  let unchanged = 0;
  let missing = 0;

  for (const entry of nonRmuSpellListEntries(data)) {
    const item = game.items.find((candidate) =>
      candidate.type === "spell-list" &&
      candidate.getFlag?.(MODULE_ID, "key") === entry.key &&
      candidate.getFlag?.(MODULE_ID, "collection") === "merp-rmu"
    );
    if (!item) { missing += 1; continue; }

    const patch = localizedSpellListPatch(entry);
    if (!Object.keys(patch).length || !localizedPatchNeedsUpdate(item, patch)) {
      unchanged += 1;
      continue;
    }
    await item.update(flattenLocalizationUpdate(patch), {
      render: false,
      merpUiCustomSpellListLocalization: true
    });
    updated += 1;
  }
  return { updated, unchanged, missing, total: nonRmuSpellListEntries(data).length };
}

export async function repairMerpRmuCustomSpellListCatalog({
  data = null,
  folders = null,
  notify = false
} = {}) {
  data = data ?? await loadMerpRmuData();

  if (!folders) {
    const root = await ensureItemFolder(ROOT_FOLDER);
    const folderDefs = (data.folders ?? []).map((folder) =>
      typeof folder === "string"
        ? { key: folder, name: folder, parent: null }
        : folder
    );
    folders = await ensureConfiguredFolders(folderDefs, root, "Item");
  }

  const nonRmuData = await loadNonRmuSpellListData();
  const converted = await syncNonRmuWorldSpellLists(nonRmuData, folders);

  const honnIn = await repairHonninCanonicalPlacement({
    professionFolder: folders.get("professions-pures-canalisation") ?? null,
    spellListFolder: folders.get("spell-lists-channeling-honnin") ?? null,
    notify: false
  });

  const expectedRazakKeys = nonRmuSpellListEntries(nonRmuData)
    .filter((entry) => entry.key.startsWith("razak-zinul-"))
    .map((entry) => entry.key);
  const presentRazakKeys = expectedRazakKeys.filter((key) =>
    game.items.some((item) =>
      item.type === "spell-list" &&
      item.getFlag?.(MODULE_ID, "key") === key
    )
  );

  const result = {
    converted,
    honnIn,
    razakZinul: {
      expected: expectedRazakKeys.length,
      present: presentRazakKeys.length,
      missing: expectedRazakKeys.filter((key) => !presentRazakKeys.includes(key))
    }
  };

  if (notify) {
    ui.notifications.info(
      `MERP UI : catalogue de listes réparé — Razak-Zinul ${result.razakZinul.present}/${result.razakZinul.expected}, Honnin ${honnIn.expectedCustomLists ?? 3}/3.`
    );
  }
  console.log(`${MODULE_ID} | Réparation catalogue Spell Lists`, result);
  return result;
}

