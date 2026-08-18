import {
  cloneRmuDocument,
  findRmuCompendiumDocument
} from "./rmu-adapter.js";
import {
  contentLanguage,
  flattenLocalizationUpdate,
  localizeManagedDocument,
  localizeManagedSpellListDocument,
  localizedDocumentPatch,
  localizedPatchNeedsUpdate,
  localizedSpellListPatch
} from "./localization.js";

const MODULE_ID = "merp-ui";
const ROOT_FOLDER = "MERP-RMU";
const DATA_PATH = `modules/${MODULE_ID}/data/merp-rmu/honnin-priest-beta-v1.json`;
const VERSION_SETTING = "merpRmuHonninPriestBetaVersion";
const NON_RMU_PACK_ID = "world.merp-rmu-spell-lists";

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

function rmuRealmSpellListIcon(realms) {
  const key = Array.isArray(realms)
    ? realms.map((realm) => String(realm).trim()).filter(Boolean).join(",")
    : String(realms ?? "")
        .split(",")
        .map((realm) => realm.trim())
        .filter(Boolean)
        .join(",");
  return RMU_REALM_SPELL_LIST_ICONS[key] ?? null;
}

async function loadData() {
  const route = foundry?.utils?.getRoute ? foundry.utils.getRoute(DATA_PATH) : DATA_PATH;
  const response = await fetch(route, { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Données bêta du Prêtre Honnin introuvables : HTTP ${response.status}`);
  return response.json();
}

function parentId(folder) {
  return folder?.folder?.id ?? folder?.folder ?? null;
}

async function ensureItemFolder(name, parent = null) {
  const wantedParent = parent?.id ?? parent ?? null;
  let folder = game.folders.find((candidate) =>
    candidate.type === "Item" && candidate.name === name && parentId(candidate) === wantedParent
  );
  if (!folder) {
    folder = await Folder.create({
      name,
      type: "Item",
      folder: wantedParent,
      sorting: "a",
      sort: 0
    });
  }
  return folder;
}

async function ensureItemFolderPath(names) {
  let parent = null;
  for (const name of names ?? []) parent = await ensureItemFolder(name, parent);
  return parent;
}

function managedKey(document) {
  return document?.getFlag?.(MODULE_ID, "key") ?? document?.flags?.[MODULE_ID]?.key ?? null;
}

function actorCultureName(actor) {
  return [...(actor?.items ?? [])].find((item) => item.type === "culture")?.name ?? "";
}

function localizedFolderPath(entry) {
  return entry?.folderLocalizations?.[contentLanguage()]
    ?? entry?.folderPath
    ?? [ROOT_FOLDER];
}

async function upsertWorldItem(entry) {
  const folder = await ensureItemFolderPath(localizedFolderPath(entry));
  const key = entry.key;
  let item = game.items.find((candidate) =>
    candidate.getFlag?.(MODULE_ID, "key") === key &&
    candidate.getFlag?.(MODULE_ID, "collection") === "honnin-beta"
  );
  const source = localizeManagedDocument(entry.document, entry.localizations);
  delete source._id;
  source.folder = folder?.id ?? null;
  source.flags = foundry.utils.mergeObject(source.flags ?? {}, {
    [MODULE_ID]: { key, collection: "honnin-beta", beta: true }
  }, { inplace: false, overwrite: true, recursive: true });

  if (!item) {
    item = await Item.create(source, { merpUiHonninBetaInstall: true });
    return { action: "created", item };
  }

  await item.update({
    name: source.name,
    img: source.img,
    folder: source.folder,
    flags: source.flags,
    system: source.system
  }, { render: false, merpUiHonninBetaInstall: true });
  return { action: "updated", item };
}

function prepareSpellListDocument(entry) {
  const doc = localizeManagedSpellListDocument(
    entry.document,
    entry.localizations
  );
  const realmIcon = rmuRealmSpellListIcon(doc?.system?.realms);
  if (realmIcon) doc.img = realmIcon;
  delete doc._id;
  delete doc.folder;
  delete doc._stats;
  doc.flags = foundry.utils.mergeObject(doc.flags ?? {}, {
    [MODULE_ID]: { key: entry.key, collection: "honnin-beta", beta: true, compendiumManaged: true }
  }, { inplace: false, overwrite: true, recursive: true });
  return doc;
}

async function cloneNativeBaseList(def) {
  const sourceDocument = await findRmuCompendiumDocument("rmu-spell-law.spell-lists", {
    name: def.sourceName,
    type: "spell-list",
    fields: ["name", "type", "system.name", "system.profession", "system.realms", "system.listType"],
    predicate: (entry) =>
      entry.type === "spell-list" &&
      (entry.system?.name === def.sourceName || entry.name === def.sourceName) &&
      (!def.sourceProfession || entry.system?.profession === def.sourceProfession)
  });
  if (!sourceDocument) throw new Error(`Liste RMU source introuvable : ${def.sourceName}`);
  const doc = cloneRmuDocument(sourceDocument);

  const localized = def.localizations?.[contentLanguage()] ?? null;
  const visibleName = localized?.name ?? def.sourceName;
  doc.name = visibleName;
  doc.system = foundry.utils.deepClone(doc.system ?? {});
  doc.system.name = visibleName;
  doc.system.book = "MERP-RMU — Bêta / RMU Spell Law";
  doc.system.listType = "Base";
  doc.system.realms = "Channeling";
  doc.system.profession = "Honnin Priest";
  doc.system.label = visibleName;
  if (localized?.system) {
    doc.system = foundry.utils.mergeObject(
      doc.system,
      foundry.utils.deepClone(localized.system),
      { inplace: false, overwrite: true, recursive: true }
    );
  }
  if (Array.isArray(doc.system.spells)) {
    doc.system.spells = doc.system.spells.map((spell) => ({
      ...spell,
      spellList: visibleName,
      listType: "Base",
      profession: "Honnin Priest"
    }));
  }
  doc.flags = foundry.utils.mergeObject(doc.flags ?? {}, {
    [MODULE_ID]: {
      key: def.key,
      collection: "honnin-beta",
      beta: true,
      compendiumManaged: true,
      source: { type: "rmu-native-clone", sourceName: def.sourceName, sourceProfession: def.sourceProfession ?? null }
    }
  }, { inplace: false, overwrite: true, recursive: true });
  return doc;
}

async function ensureSpellLists(data) {
  let created = 0;
  let updated = 0;

  // Only the three Honnin-specific Lists are MERP-RMU world Items.
  // Animal Mastery, Herb Mastery and Nature's Lore remain native Spell Law lists.
  for (const entry of data.spellLists ?? []) {
    const folder = await ensureItemFolderPath(localizedFolderPath(entry));
    const document = prepareSpellListDocument(entry);
    document.folder = folder.id;
    document.flags = foundry.utils.mergeObject(document.flags ?? {}, {
      [MODULE_ID]: {
        key: entry.key,
        collection: "honnin-beta",
        customSpellList: true,
        nativeRMU: false
      }
    }, { inplace: false, overwrite: true, recursive: true });

    const existing = game.items.find((item) =>
      item.type === "spell-list" &&
      managedKey(item) === entry.key &&
      item.getFlag?.(MODULE_ID, "collection") === "honnin-beta"
    );

    if (!existing) {
      await Item.create(document, { renderSheet: false, merpUiHonninBetaInstall: true });
      created += 1;
    } else {
      const update = foundry.utils.deepClone(document);
      delete update.type;
      delete update._id;
      await existing.update(update, { render: false, merpUiHonninBetaInstall: true });
      updated += 1;
    }
  }
  return { created, updated, expected: (data.spellLists ?? []).length, source: "world" };
}

async function syncEmbeddedProfession(sourceProfession) {
  let updated = 0;
  if (!sourceProfession) return updated;
  const systemFields = [
    "book", "profession", "spellCastingGroup", "numberOfBaseLists", "realms",
    "skillDevelopmentCosts", "combatTrainingCosts", "professionalSkills", "description"
  ];
  for (const actor of game.actors?.contents ?? []) {
    for (const item of actor.items ?? []) {
      if (item.type !== "profession") continue;
      if (managedKey(item) !== "honnin-priest" && item.system?.profession !== "Honnin Priest") continue;
      const update = { name: sourceProfession.name, img: sourceProfession.img };
      for (const field of systemFields) update[`system.${field}`] = foundry.utils.deepClone(sourceProfession.system?.[field]);
      await item.update(update, { render: false, merpUiHonninBetaInstall: true });
      updated += 1;
    }
  }
  return updated;
}


export async function refreshHonninBetaLocalization({ notify = false } = {}) {
  if (!game.user?.isGM || game.system?.id !== "rmu") {
    return { skipped: true, reason: "not-gm-or-rmu" };
  }

  const data = await loadData();

  // Canonical Spell List placement is owned by the main MERP-RMU catalogue.
  // This refresh only localizes Honnin documents that already exist.
  const spellListIntegrity = { deferredToMainCatalog: true };

  let updated = 0;
  let unchanged = 0;
  let missing = 0;

  for (const entry of [data.profession, data.skill, ...(data.spellLists ?? [])].filter(Boolean)) {
    const item = game.items.find((candidate) =>
      managedKey(candidate) === entry.key &&
      candidate.getFlag?.(MODULE_ID, "collection") === "honnin-beta"
    );
    if (!item) { missing += 1; continue; }

    const patch = entry?.document?.system?.spells
      ? localizedSpellListPatch(entry)
      : localizedDocumentPatch(entry.localizations);

    if (!Object.keys(patch).length || !localizedPatchNeedsUpdate(item, patch)) {
      unchanged += 1;
      continue;
    }
    await item.update(flattenLocalizationUpdate(patch), {
      render: false,
      merpUiHonninBetaLocalization: true
    });
    updated += 1;
  }

  const result = {
    language: contentLanguage(),
    updated, unchanged, missing,
    total: 2 + (data.spellLists ?? []).length,
    spellListIntegrity
  };
  if (notify) console.log(`${MODULE_ID} | Honnin localisation`, result);
  return result;
}


async function deleteEmptyFolderBranchFrom(folder) {
  let current = folder;
  let deleted = 0;

  while (current && current.type === "Item") {
    const parent = current.folder ?? null;
    const hasItems = game.items.some((item) => item.folder?.id === current.id);
    const hasChildren = game.folders.some((child) => parentId(child) === current.id);
    const protectedFolder =
      current.getFlag?.(MODULE_ID, "collection") === "merp-rmu-folder" ||
      current.name === ROOT_FOLDER;

    if (hasItems || hasChildren || protectedFolder) break;
    await current.delete({ merpUiHonninFolderCleanup: true });
    deleted += 1;
    current = parent;
  }
  return deleted;
}

export async function repairHonninCanonicalPlacement({
  professionFolder = null,
  spellListFolder = null,
  notify = false
} = {}) {
  if (!game.user?.isGM || game.system?.id !== "rmu") {
    return { skipped: true, reason: "not-gm-or-rmu" };
  }

  const data = await loadData();
  let movedProfession = false;
  let createdLists = 0;
  let updatedLists = 0;
  let removedLegacyFolders = 0;

  const profession = game.items.find((item) =>
    managedKey(item) === data.profession?.key &&
    item.getFlag?.(MODULE_ID, "collection") === "honnin-beta"
  );

  if (profession && professionFolder?.id && profession.folder?.id !== professionFolder.id) {
    const oldFolder = profession.folder ?? null;
    await profession.update(
      { folder: professionFolder.id },
      { render: false, merpUiHonninCanonicalPlacement: true }
    );
    movedProfession = true;
    removedLegacyFolders += await deleteEmptyFolderBranchFrom(oldFolder);
  }

  if (spellListFolder?.id) {
    for (const entry of data.spellLists ?? []) {
      const document = prepareSpellListDocument(entry);
      document.folder = spellListFolder.id;
      document.flags = foundry.utils.mergeObject(document.flags ?? {}, {
        [MODULE_ID]: {
          key: entry.key,
          collection: "honnin-beta",
          customSpellList: true,
          nativeRMU: false
        }
      }, { inplace: false, overwrite: true, recursive: true });

      let item = game.items.find((candidate) =>
        candidate.type === "spell-list" &&
        managedKey(candidate) === entry.key &&
        candidate.getFlag?.(MODULE_ID, "collection") === "honnin-beta"
      );

      if (!item) {
        await Item.create(document, {
          renderSheet: false,
          merpUiHonninCanonicalPlacement: true
        });
        createdLists += 1;
      } else {
        const oldFolder = item.folder ?? null;
        const update = foundry.utils.deepClone(document);
        delete update.type;
        delete update._id;
        await item.update(update, {
          render: false,
          merpUiHonninCanonicalPlacement: true
        });
        updatedLists += 1;
        if (oldFolder?.id && oldFolder.id !== spellListFolder.id) {
          removedLegacyFolders += await deleteEmptyFolderBranchFrom(oldFolder);
        }
      }
    }
  }

  const result = {
    movedProfession,
    createdLists,
    updatedLists,
    removedLegacyFolders,
    expectedCustomLists: (data.spellLists ?? []).length
  };
  if (notify) {
    ui.notifications.info(
      `MERP UI : Honnin — ${createdLists} liste(s) créée(s), ${updatedLists} mise(s) à jour.`
    );
  }
  console.log(`${MODULE_ID} | Placement canonique Honnin`, result);
  return result;
}

export async function installHonninPriestBeta({ force = false, notify = false } = {}) {
  if (!game.user?.isGM || game.system?.id !== "rmu") return { skipped: true, reason: "not-gm-or-rmu" };
  const data = await loadData();
  const target = Number(data.version || 1);
  const installed = Number(game.settings.get(MODULE_ID, VERSION_SETTING) || 0);

  const professionExists = game.items.some((item) => managedKey(item) === data.profession?.key);
  const skillExists = game.items.some((item) => managedKey(item) === data.skill?.key);
  const expectedKeys = new Set((data.spellLists ?? []).map((x) => x.key));
  const foundKeys = new Set(
    game.items
      .filter((item) =>
        item.type === "spell-list" &&
        item.getFlag?.(MODULE_ID, "collection") === "honnin-beta"
      )
      .map((item) => managedKey(item))
  );
  const listsExist = [...expectedKeys].every((key) => foundKeys.has(key));
  if (!force && installed >= target && professionExists && skillExists && listsExist) {
    return refreshHonninBetaLocalization({ notify: false });
  }

  const professionResult = await upsertWorldItem(data.profession);
  const skillResult = await upsertWorldItem(data.skill);

  // Do not create Spell List folder paths here. Main MERP-RMU owns the
  // canonical folder tree and calls repairHonninCanonicalPlacement() with the
  // actual Folder documents.
  const spellLists = { deferredToMainCatalog: true, expected: (data.spellLists ?? []).length };
  const embeddedUpdated = await syncEmbeddedProfession(professionResult.item);
  await game.settings.set(MODULE_ID, VERSION_SETTING, target);
  const result = { version: target, profession: professionResult.action, skill: skillResult.action, spellLists, embeddedUpdated };
  if (notify) ui.notifications.info("MERP UI : Prêtre Honnin (Ônu) bêta et ses six Listes de base ont été installés.");
  console.log(`${MODULE_ID} | Prêtre Honnin (Ônu) bêta`, result);
  return result;
}

export function registerHonninBeta() {
  Hooks.once("init", () => {
    game.settings.register(MODULE_ID, VERSION_SETTING, {
      name: "Version bêta du Prêtre Honnin (Ônu)",
      scope: "world",
      config: false,
      type: Number,
      default: 0
    });
  });

  Hooks.once("ready", async () => {
    if (!game.user?.isGM || game.system?.id !== "rmu") return;

    const legacyWorld = (game.items?.contents ?? []).some((item) => {
      if (item.getFlag?.(MODULE_ID, "compendiumPack")) return false;
      const collection = item.getFlag?.(MODULE_ID, "collection");
      return typeof collection === "string" && collection.startsWith("merp-rmu");
    });
    if (!legacyWorld) return;

    try {
      await installHonninPriestBeta({ notify: false });
    } catch (error) {
      console.error(`${MODULE_ID} | Échec de l’installation du Prêtre Honnin bêta`, error);
      ui.notifications.error("MERP UI : impossible d’installer le Prêtre Honnin (Ônu) bêta. Consultez la console F12.");
    }
  });

  Hooks.on("preCreateItem", (item, data, options) => {
    try {
      if (options?.merpUiHonninBetaInstall) return;
      const actor = item?.parent;
      if (!actor || actor.documentName !== "Actor" || item.type !== "profession") return;
      const key = managedKey(item);
      const technical = item.system?.profession ?? data?.system?.profession ?? "";
      if (key !== "honnin-priest" && technical !== "Honnin Priest") return;
      if (/honnin|suzamatu/i.test(actorCultureName(actor))) return;
      ui.notifications.warn("MERP UI : la Profession Prêtre Honnin (Ônu) est réservée à la Culture Honnin — Suzamatu.");
      return false;
    } catch (error) {
      console.warn(`${MODULE_ID} | Impossible de vérifier la restriction du Prêtre Honnin`, error);
    }
  });

  globalThis.MERPUI = globalThis.MERPUI ?? {};
  globalThis.MERPUI.installHonninPriestBeta = (options = {}) =>
    installHonninPriestBeta({ ...options, force: options.force ?? true, notify: options.notify ?? true });
}
