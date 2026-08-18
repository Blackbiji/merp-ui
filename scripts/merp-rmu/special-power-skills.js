import {
  contentLanguage,
  localizeManagedDocument,
  localizedDocumentPatch,
  localizedPatchNeedsUpdate
} from "./localization.js";
import {
  ensureItemFolder,
  localizedFolderAliases,
  localizedFolderName
} from "./content-folders.js";

const MODULE_ID = "merp-ui";
const ROOT_FOLDER = "MERP-RMU";
const MERP_SPECIAL_POWER_SKILLS_PATH =
  `modules/${MODULE_ID}/data/merp-rmu/special-power-skills.json`;
const MERP_SPECIAL_POWER_SKILLS_SETTING = "merpRmuSpecialPowerSkillsVersion";

export const MERP_SPECIAL_POWER_SKILL_KEYS = new Set([
  "healing-songs",
  // Legacy 1.2.107–1.2.109 keys retained only for safe migration/results.
  "healing-song-blood",
  "healing-song-bone",
  "healing-song-sensory",
  "healing-song-muscle",
  "healing-song-cleansing",
  "healing-song-strengthening",
  "yavannas-song"
]);
const MERP_SPECIAL_POWER_CANONICAL_KEYS = new Set(["healing-songs", "yavannas-song"]);

const MERP_SPECIAL_POWER_TRANSLATIONS = {
  fr: {
    skills: {
      "Healing Songs": "Chants de Guérison",
      "Yavanna's Song": "Chant de Yavanna",
      "Tattooing": "Tatouage",
      "Chant du Sang": "Chant du Sang",
      "Chant des Os": "Chant des Os",
      "Chant des Sens": "Chant des Sens",
      "Chant des Muscles, Tendons et Ligaments": "Chant des Muscles, Tendons et Ligaments",
      "Chant de Purification": "Chant de Purification",
      "Chant de Fortification": "Chant de Fortification",
      "Chant de Yavanna": "Chant de Yavanna"
    },
    specializations: {
      "Blood Songs": "Chant du Sang",
      "Bone Songs": "Chant des Os",
      "Sensory Songs": "Chant des Sens",
      "Muscle/Tendon/Ligament Songs": "Chant des Muscles, Tendons et Ligaments",
      "Cleansing Songs": "Chant de Purification",
      "Strengthening Songs": "Chant de Fortification"
    }
  },
  en: {
    skills: {
      "Healing Songs": "Healing Songs",
      "Yavanna's Song": "Yavanna's Song",
      "Tattooing": "Tattooing",
      "Chant du Sang": "Blood Songs",
      "Chant des Os": "Bone Songs",
      "Chant des Sens": "Sensory Songs",
      "Chant des Muscles, Tendons et Ligaments": "Muscle/Tendon/Ligament Songs",
      "Chant de Purification": "Cleansing Songs",
      "Chant de Fortification": "Strengthening Songs",
      "Chant de Yavanna": "Yavanna's Song"
    },
    specializations: {
      "Blood Songs": "Blood Songs",
      "Bone Songs": "Bone Songs",
      "Sensory Songs": "Sensory Songs",
      "Muscle/Tendon/Ligament Songs": "Muscle/Tendon/Ligament Songs",
      "Cleansing Songs": "Cleansing Songs",
      "Strengthening Songs": "Strengthening Songs"
    }
  }
};

export function installMerpSpecialPowerSkillTranslations() {
  try {
    const translations = game?.i18n?.translations;
    if (!translations) return false;
    const labels = MERP_SPECIAL_POWER_TRANSLATIONS[contentLanguage()]
      ?? MERP_SPECIAL_POWER_TRANSLATIONS.fr;
    const dictionaries = [translations];
    const fallback = game?.i18n?._fallback ?? game?.i18n?.fallbackTranslations ?? null;
    if (fallback && typeof fallback === "object") dictionaries.push(fallback);
    for (const dictionary of dictionaries) {
      for (const [name, label] of Object.entries(labels.skills)) {
        foundry.utils.setProperty(dictionary, `RMU.Skills.${name}`, label);
      }
      for (const [name, label] of Object.entries(labels.specializations)) {
        foundry.utils.setProperty(dictionary, `RMU.Specializations.${name}`, label);
      }
    }
    return true;
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible d’installer les traductions des Chants MERP`, error);
    return false;
  }
}
// ---------------------------------------------------------------------------
// MERP-specific Power Manipulation skills (isolated from the main MERP-RMU
// schema installer so adding/editing these skills can never rewrite Professions).
// ---------------------------------------------------------------------------
export async function loadMerpSpecialPowerSkillData() {
  const response = await fetch(MERP_SPECIAL_POWER_SKILLS_PATH, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${MERP_SPECIAL_POWER_SKILLS_PATH}: ${response.status}`);
  return response.json();
}

export function merpSpecialSkillKey(item) {
  return item?.getFlag?.(MODULE_ID, "key") ?? item?.flags?.[MODULE_ID]?.key ?? null;
}

export function merpActorRaceName(actor) {
  return [...(actor?.items ?? [])].find((item) => item.type === "race")?.name ?? "";
}

export function merpActorCultureName(actor) {
  return [...(actor?.items ?? [])].find((item) => item.type === "culture")?.name ?? "";
}

export function isMerpElfActor(actor) {
  return /elf|elfe|quendi/i.test(merpActorRaceName(actor));
}

export function merpSpecialPowerSkillAllowed(actor, itemOrKey) {
  const key = typeof itemOrKey === "string" ? itemOrKey : merpSpecialSkillKey(itemOrKey);
  if (!MERP_SPECIAL_POWER_SKILL_KEYS.has(key)) return true;
  if (key === "yavannas-song") {
    const culture = merpActorCultureName(actor);
    return /(^|\b)sindar(\b|$)|elfes?\s+sylvains?|silvan|sylvan/i.test(culture);
  }
  return isMerpElfActor(actor);
}

export async function installMerpSpecialPowerSkills({ force = false, notify = false } = {}) {
  if (!game.user?.isGM || game.system?.id !== "rmu") return { skipped: true, reason: "not-gm-or-rmu" };
  const data = await loadMerpSpecialPowerSkillData();
  const target = Number(data?.version || 1);
  const installed = Number(game.settings.get(MODULE_ID, MERP_SPECIAL_POWER_SKILLS_SETTING) || 0);

  // Do not trust the version setting alone. Versions 1.2.107-1.2.109 could
  // leave six standalone Healing Songs Items in the world while already
  // marking the special-skill data as current. The native-style + selector
  // requires one canonical blank-specialization parent Item.
  const worldSkills = game.items?.contents ?? [];
  const canonicalHealingPresent = worldSkills.some((item) =>
    item.type === "skill" &&
    merpSpecialSkillKey(item) === "healing-songs" &&
    String(item.system?.specialization ?? "").trim() === ""
  );
  const canonicalYavannaPresent = worldSkills.some((item) =>
    item.type === "skill" && merpSpecialSkillKey(item) === "yavannas-song"
  );
  const canonicalSetComplete = canonicalHealingPresent && canonicalYavannaPresent;
  if (!force && installed >= target && canonicalSetComplete) {
    const root = await ensureItemFolder(ROOT_FOLDER);
    const folderDefinition = {
      name: data?.folder || "Skills",
      localizations: data?.folderLocalizations ?? {}
    };
    const folder = await ensureItemFolder(
      localizedFolderName(folderDefinition),
      root,
      null,
      null,
      localizedFolderAliases(folderDefinition)
    );

    let updated = 0;
    let unchanged = 0;
    for (const entry of data?.items ?? []) {
      const item = (game.items?.contents ?? []).find((candidate) =>
        candidate.type === "skill" &&
        candidate.getFlag?.(MODULE_ID, "key") === entry.key
      );
      if (!item) continue;

      const patch = localizedDocumentPatch(entry.localizations);
      if (folder?.id && item.folder?.id !== folder.id) patch.folder = folder.id;
      if (!Object.keys(patch).length || !localizedPatchNeedsUpdate(item, patch)) {
        unchanged += 1;
        continue;
      }

      await item.update(foundry.utils.flattenObject(patch), {
        render: false,
        merpUiSpecialPowerSkillLocalization: true
      });
      updated += 1;
    }

    installMerpSpecialPowerSkillTranslations();
    return {
      version: installed,
      localizationOnly: true,
      updated,
      unchanged,
      language: contentLanguage()
    };
  }

  const root = await ensureItemFolder(ROOT_FOLDER);
  const folderDefinition = {
    name: data?.folder || "Skills",
    localizations: data?.folderLocalizations ?? {}
  };
  const folder = await ensureItemFolder(
    localizedFolderName(folderDefinition),
    root,
    null,
    null,
    localizedFolderAliases(folderDefinition)
  );
  const details = [];

  for (const entry of data?.items ?? []) {
    const key = entry?.key;
    const doc = localizeManagedDocument(entry?.document ?? {}, entry?.localizations);
    if (!key || doc?.type !== "skill") continue;
    doc.flags ??= {};
    doc.flags[MODULE_ID] ??= {};
    doc.flags[MODULE_ID].key = key;
    doc.flags[MODULE_ID].collection = "merp-special-power-skills";
    doc.folder = folder.id;

    // Prefer the stable MERP key.  Healing Songs deliberately share the same
    // Skill name and differ only by specialization, exactly like Melee Weapons
    // (Blade, Chain, etc.), so a name-only fallback would collapse all six.
    let item = (game.items?.contents ?? []).find((candidate) =>
      candidate.type === "skill" && candidate.getFlag?.(MODULE_ID, "key") === key
    );
    if (!item) {
      const wantedSpec = String(doc.system?.specialization ?? "");
      item = (game.items?.contents ?? []).find((candidate) =>
        candidate.type === "skill" &&
        candidate.name === doc.name &&
        candidate.system?.category === "Power Manipulation" &&
        String(candidate.system?.specialization ?? "") === wantedSpec
      );
    }

    if (!item) {
      item = await Item.create(doc, { renderSheet: false, merpUiSpecialPowerSkillInstall: true });
      details.push({ key, name: item?.name, action: "created" });
      continue;
    }

    // Dedicated dotted updates only. Never replace the whole system DataModel.
    const update = {
      name: doc.name,
      img: doc.img ?? item.img,
      folder: folder.id,
      "flags.merp-ui.key": key,
      "flags.merp-ui.collection": "merp-special-power-skills"
    };
    for (const [field, value] of Object.entries(doc.system ?? {})) {
      update[`system.${field}`] = foundry.utils.deepClone(value);
    }
    await item.update(update, { render: false, merpUiSpecialPowerSkillInstall: true });
    details.push({ key, name: item.name, action: "updated" });
  }

  // Remove only obsolete MERP-UI world templates. Never touch embedded Actor
  // skills here: developed specializations must retain their ranks. The legacy
  // templates are the six pre-parent Healing Songs definitions from 1.2.107-109.
  const legacyKeys = new Set([
    "healing-song-blood",
    "healing-song-bone",
    "healing-song-sensory",
    "healing-song-muscle",
    "healing-song-cleansing",
    "healing-song-strengthening"
  ]);
  const canonicalParents = (game.items?.contents ?? []).filter((item) =>
    item.type === "skill" &&
    merpSpecialSkillKey(item) === "healing-songs" &&
    String(item.system?.specialization ?? "").trim() === ""
  );
  const keepParentId = canonicalParents[0]?.id ?? null;
  const obsoleteWorldItems = (game.items?.contents ?? []).filter((item) => {
    if (item.type !== "skill") return false;
    const collection = item.getFlag?.(MODULE_ID, "collection") ?? item.flags?.[MODULE_ID]?.collection;
    if (collection !== "merp-special-power-skills") return false;
    const key = merpSpecialSkillKey(item);
    if (legacyKeys.has(key)) return true;
    // Also clean duplicate/non-parent items carrying the new shared key.
    if (key === "healing-songs") {
      const spec = String(item.system?.specialization ?? "").trim();
      return spec !== "" || (keepParentId && item.id !== keepParentId);
    }
    return false;
  });
  if (obsoleteWorldItems.length) {
    await Item.deleteDocuments(obsoleteWorldItems.map((item) => item.id), {
      render: false,
      merpUiSpecialPowerSkillInstall: true
    });
    for (const item of obsoleteWorldItems) {
      details.push({ key: merpSpecialSkillKey(item), name: item.name, action: "legacy-world-template-removed" });
    }
  }

  await game.settings.set(MODULE_ID, MERP_SPECIAL_POWER_SKILLS_SETTING, target);
  if (notify) ui.notifications.info(`MERP UI : Chants elfiques installés ; ${obsoleteWorldItems.length} ancien(s) modèle(s) Healing Songs nettoyé(s).`);
  return { installed: details.length, expected: 2, removedLegacyWorldItems: obsoleteWorldItems.length, details };
}

export function merpSpecialPowerSkillItems(actor) {
  return (game.items?.contents ?? []).filter((item) => {
    const key = merpSpecialSkillKey(item);
    return item.type === "skill" &&
      MERP_SPECIAL_POWER_CANONICAL_KEYS.has(key) &&
      merpSpecialPowerSkillAllowed(actor, item);
  });
}


export function merpSpecialSkillTotalRanks(item) {
  const system = item?.system ?? {};
  return Number(system.ranks || 0) + Number(system.cultureRanks || 0) + Number(system.levelUpRanks || 0);
}


export function healingSongsSourceItem() {
  return (game.items?.contents ?? []).find((item) =>
    item.type === "skill" && merpSpecialSkillKey(item) === "healing-songs"
  ) ?? null;
}

export function prepareHealingSongsPlusControl(context, actor) {
  if (!context?.system?._skillGroups || !actor || !isMerpElfActor(actor)) return false;
  const source = healingSongsSourceItem();
  if (!source) return false;
  let changed = false;
  for (const group of context.system._skillGroups ?? []) {
    for (const skill of group?.skills ?? []) {
      if (String(skill?.name ?? "") !== "Healing Songs") continue;
      if (String(skill?.specialization ?? "").trim() !== "") continue;
      // Make the zero-rank embedded template behave exactly like Directed Spell:
      // one parent row + native RMU add-specialization button.
      skill._undeveloped = true;
      skill._canDevelop = false;
      skill._disableSkillRoll = true;
      skill._originUUID = source.uuid;
      changed = true;
    }
  }
  return changed;
}

export function healingSongsDialogOptions(dialog) {
  const sourceDoc = healingSongsSourceItem();
  if (!sourceDoc || !dialog?._actor) return null;
  const sourceSystem = foundry.utils.deepClone(sourceDoc.system ?? {});
  const used = new Set(
    [...(dialog._actor.items ?? [])]
      .filter((item) => item.type === "skill" && String(item.system?.name ?? item.name ?? "") === "Healing Songs")
      .map((item) => String(item.system?.specialization ?? "").trim())
      .filter(Boolean)
  );
  sourceSystem.specializations = (sourceSystem.specializations ?? []).filter((spec) => !used.has(String(spec)));
  sourceSystem.fixedSpecializations = true;
  sourceSystem.hasSpecialization = true;
  const copy = {
    ...sourceSystem,
    sourceSkillUuid: sourceDoc.uuid,
    hasTrainingGroup: false
  };
  return {
    label: "RMU.Dialogs.CultureSkillDialog.Specialization.LabelSkill",
    hint: "RMU.Dialogs.CultureSkillDialog.Specialization.HintSkill",
    groups: typeof dialog._rollup === "function" ? dialog._rollup([copy]) : [{ category: "Power Manipulation", skills: [copy] }]
  };
}

export function makeEmbeddedMerpSpecialPowerSkill(source) {
  const doc = source.toObject();
  delete doc._id;
  delete doc.folder;
  delete doc.ownership;
  delete doc.sort;
  delete doc._stats;
  doc.flags ??= {};
  doc.flags[MODULE_ID] ??= {};
  doc.flags[MODULE_ID].autoEmbeddedSpecialPowerSkill = true;
  doc.flags.rmu ??= {};
  doc.flags.rmu.origin = { uuid: source.uuid };
  doc.system ??= {};
  doc.system.ranks = 0;
  doc.system.cultureRanks = 0;
  doc.system.levelUpRanks = 0;
  doc.system.favorite = false;
  return doc;
}

export async function syncMerpSpecialPowerSkillsForActor(actor, { notify = false } = {}) {
  if (!actor || actor.documentName !== "Actor" || actor.type !== "Character") {
    return { skipped: true, reason: "not-character" };
  }

  // These Skills are deliberately embedded on eligible Actors because RMU 1.3.5
  // builds its undeveloped-skill catalogue exclusively from the rmu.core Compendium.
  // World Item skills therefore cannot appear on the Character sheet by themselves.
  const desiredSources = merpSpecialPowerSkillItems(actor);
  const desiredKeys = new Set(desiredSources.map(merpSpecialSkillKey));
  const existing = [...(actor.items ?? [])].filter((item) =>
    item.type === "skill" && MERP_SPECIAL_POWER_SKILL_KEYS.has(merpSpecialSkillKey(item))
  );

  const createData = [];
  for (const source of desiredSources) {
    const key = merpSpecialSkillKey(source);
    const wantedSpec = String(source.system?.specialization ?? "").trim();

    // Healing Songs is a parent Skill with specializations.  Learned songs and
    // the zero-rank parent deliberately share the same MERP key, so a key-only
    // duplicate check would incorrectly suppress the parent as soon as any song
    // had been learned.  Identity must include the specialization.
    const duplicateByIdentity = [...(actor.items ?? [])].some((item) =>
      item.type === "skill" &&
      merpSpecialSkillKey(item) === key &&
      item.system?.category === "Power Manipulation" &&
      String(item.system?.specialization ?? "").trim() === wantedSpec
    );
    if (duplicateByIdentity) continue;
    createData.push(makeEmbeddedMerpSpecialPowerSkill(source));
  }

  // Migrate existing 1.2.107/108 standalone Chants in place.  Each Healing
  // Song becomes a specialization of the single Healing Songs Skill while
  // preserving its ranks and all player advancement.
  let migrated = 0;
  for (const source of desiredSources) {
    const key = merpSpecialSkillKey(source);
    const current = existing.find((item) => merpSpecialSkillKey(item) === key);
    if (!current) continue;
    const update = {};
    if (current.name !== source.name) update.name = source.name;
    for (const field of ["name", "category", "trainingGroup", "stat", "description", "specialization", "specializationType", "hasSpecialization", "fixedSpecializations", "specializations", "autoSkill"]) {
      const wanted = foundry.utils.deepClone(source.system?.[field]);
      if (wanted === undefined) continue;
      update[`system.${field}`] = wanted;
    }
    if (Object.keys(update).length) {
      await current.update(update, { render: false, merpUiSpecialPowerSkillSync: true });
      migrated += 1;
    }
  }

  let created = [];
  if (createData.length) {
    created = await actor.createEmbeddedDocuments("Item", createData, {
      render: false,
      merpUiSpecialPowerSkillSync: true
    });
  }

  // If Race/Culture changes during character creation, remove only untouched
  // automatically embedded Skills that are no longer legal. Never delete ranks.
  const removable = existing.filter((item) => {
    if (item.getFlag?.(MODULE_ID, "autoEmbeddedSpecialPowerSkill") !== true) return false;
    if (merpSpecialSkillTotalRanks(item) !== 0) return false;

    const key = merpSpecialSkillKey(item);
    const spec = String(item.system?.specialization ?? "").trim();

    // Remove legacy auto-created zero-rank Healing Songs specializations from
    // 1.2.107-1.2.109.  The single blank-specialization parent now owns the +
    // selector.  Never remove a developed specialization.
    if (key === "healing-songs" && spec !== "") return true;
    return !desiredKeys.has(key);
  });
  if (removable.length) {
    await actor.deleteEmbeddedDocuments("Item", removable.map((item) => item.id), {
      render: false,
      merpUiSpecialPowerSkillSync: true
    });
  }

  if ((created.length || removable.length) && actor.sheet?.rendered) actor.sheet.render(false);
  if (notify) {
    ui.notifications.info(`MERP UI : ${created.length} Chant(s) ajouté(s), ${migrated} migré(s), ${removable.length} retiré(s) sur ${actor.name}.`);
  }
  return {
    actor: actor.name,
    eligible: desiredSources.length,
    created: created.length,
    migrated,
    removed: removable.length
  };
}

export async function syncMerpSpecialPowerSkillsAllActors({ notify = false } = {}) {
  const details = [];
  for (const actor of game.actors?.contents ?? []) {
    if (actor.type !== "Character") continue;
    details.push(await syncMerpSpecialPowerSkillsForActor(actor, { notify: false }));
  }
  if (notify) ui.notifications.info(`MERP UI : Chants elfiques synchronisés sur ${details.length} personnage(s).`);
  return { actors: details.length, details };
}

export function makeMerpSkillOption(item) {
  const system = foundry.utils.deepClone(item.system ?? {});
  return {
    ...system,
    name: system.name || item.name,
    category: system.category || "Power Manipulation",
    sourceSkillUuid: item.uuid,
    uuid: item.uuid,
    _id: item.id,
    hasTrainingGroup: false,
    options: Array.isArray(system.options) ? system.options : []
  };
}

export function pushUniqueMerpSkillOptions(array, additions) {
  if (!Array.isArray(array)) return false;
  const names = new Set(array.map((entry) => String(entry?.name ?? entry?.skillName ?? "").trim().toLocaleLowerCase("fr")));
  let changed = false;
  for (const addition of additions) {
    const name = String(addition?.name ?? "").trim().toLocaleLowerCase("fr");
    if (!name || names.has(name)) continue;
    array.push(foundry.utils.deepClone(addition));
    names.add(name);
    changed = true;
  }
  return changed;
}

export function injectMerpSpecialPowerSkills(result, actor, sourceCategory = null) {
  if (!result || !actor) return result;
  const additions = merpSpecialPowerSkillItems(actor).map(makeMerpSkillOption);
  if (!additions.length) return result;

  const visit = (node, inheritedCategory = null, depth = 0) => {
    if (!node || depth > 6) return false;
    let changed = false;

    if (Array.isArray(node)) {
      const isPower = String(inheritedCategory ?? sourceCategory ?? "").toLowerCase() === "power manipulation";

      // RMU uses arrays both for collections of Skill choices and for an
      // individual Skill's specialization values. A specialization array is
      // made of strings and must never receive complete Skill objects.
      const isSpecializationArray = node.some((entry) => typeof entry === "string");

      if (isPower && !isSpecializationArray) {
        changed = pushUniqueMerpSkillOptions(node, additions) || changed;
      }

      for (const entry of node) {
        if (entry && typeof entry === "object") {
          changed = visit(entry, inheritedCategory, depth + 1) || changed;
        }
      }
      return changed;
    }

    if (typeof node !== "object") return false;

    const category = node.category ?? node.skillCategory ?? node.name ?? inheritedCategory;
    const isPower = String(category ?? "").toLowerCase() === "power manipulation";

    const isSkillNode =
      typeof node.name === "string" &&
      typeof node.category === "string" &&
      (
        "stat" in node ||
        "sourceSkillUuid" in node ||
        "specializationType" in node ||
        "hasSpecialization" in node
      );

    for (const key of ["skills", "options", "items", "entries"]) {
      const values = node[key];
      if (!Array.isArray(values) || !isPower) continue;

      // On an individual Skill, `options` is the specialization list even if
      // it is still empty during an early RMU preparation pass.
      if (key === "options" && isSkillNode) continue;

      // Defensive guard for already-populated specialization arrays.
      if (key === "options" && values.some((entry) => typeof entry === "string")) continue;

      changed = pushUniqueMerpSkillOptions(values, additions) || changed;
    }

    for (const [key, value] of Object.entries(node)) {
      if (["skills", "options", "items", "entries"].includes(key)) continue;
      if (value && typeof value === "object") changed = visit(value, category, depth + 1) || changed;
    }
    return changed;
  };

  visit(result, sourceCategory, 0);
  return result;
}

const HEALING_SONG_RESULTS = {
  "Spectacular Failure": "Une dissonance entre dans le chant sans être perçue avant sa conclusion. La puissance curative s’inverse et la maladie ou la blessure s’aggrave, éventuellement jusqu’à mettre la vie du patient en danger. Le chanteur subit également un jet d’Échec de Sort sans modificateur.",
  "Absolute Failure": "Une dissonance rend cette affection impossible à guérir par chant, méditation ou sort. Il faut désormais recourir à une guérison ordinaire ou aux herbes.",
  "Failure": "Cette maladie ou cette blessure dépasse la capacité de ce chanteur. D’autres méthodes ou d’autres chanteurs peuvent être tentés.",
  "Unusual Event": "La combinaison du patient, du chant et des chanteurs produit une magie rare. Le chanteur principal peut interrompre le chant — tous les participants subissent alors un jet sur la table de Force des Échecs de Sort — ou poursuivre, avec des conséquences inhabituelles déterminées par le MJ.",
  "Partial Success": "La guérison s’avère difficile. Choisissez un effet de guérison approprié d’un niveau au plus égal aux rangs de cette Compétence, et non à son bonus, ou laissez le MJ choisir l’effet.",
  "Unusual Success": "Cette combinaison de chanteurs, de patient et de chant guérit et fortifie le patient au-delà de la portée normale de la Compétence ; l’effet exact relève du MJ.",
  "Near Success": "La guérison s’avère difficile. Choisissez un effet de guérison approprié d’un niveau au plus égal à la moitié des rangs de cette Compétence, et non à son bonus, ou laissez le MJ choisir l’effet.",
  "Success": "Le chant réussit. Choisissez un effet de guérison approprié d’un niveau au plus égal aux rangs de cette Compétence, et non à son bonus, ou laissez le MJ choisir l’effet.",
  "Absolute Success": "En tissant des paroles de pouvoir dans le chant, vous guérissez complètement l’affection."
};

const YAVANNA_SONG_RESULTS = {
  "Spectacular Failure": "Une dissonance inverse la puissance de l’herbe : elle agit désormais comme un poison. Un jet réussi de Connaissance des Herbes est nécessaire pour remarquer l’altération.",
  "Blunder": "Une dissonance inverse la puissance de l’herbe : elle agit désormais comme un poison. Un jet réussi de Connaissance des Herbes est nécessaire pour remarquer l’altération.",
  "Absolute Failure": "Une dissonance dissipe la puissance de l’herbe. Un jet réussi de Connaissance des Herbes est nécessaire pour le remarquer.",
  "Failure": "Le chant n’a aucun effet. Un autre chanteur peut tenter sa chance.",
  "Unusual Event": "La combinaison de l’herbe et du chant modifie sa nature d’une manière inhabituelle, déterminée par le MJ. Une Manœuvre réussie d’Herboristerie révèle qu’une altération a eu lieu, sans nécessairement en dévoiler l’effet exact.",
  "Partial Success": "L’herbe se conserve trois fois plus longtemps que normalement.",
  "Unusual Success": "Si l’herbe n’a pas encore été cueillie, elle évolue vers une nouvelle variété déterminée par le MJ et peut se reproduire si elle est cultivée avec soin. Si elle était déjà cueillie, traitez ce résultat comme un Événement Inhabituel.",
  "Near Success": "L’herbe se conserve trois fois plus longtemps et son efficacité est doublée.",
  "Success": "L’herbe se conserve quatre fois plus longtemps et son efficacité est doublée.",
  "Absolute Success": "Les paroles de pouvoir exaltent la vertu naturelle de l’herbe : elle se conserve vingt fois plus longtemps ou double sa vertu immédiate, selon ce qui convient à l’herbe."
};

export function merpSpecialManeuverDecision(decision) {
  const text = String(decision ?? "");
  if (/Unusual Event/i.test(text) && /Success/i.test(text)) return "Unusual Success";
  if (/Unusual Event/i.test(text)) return "Unusual Event";
  if (/Blunder/i.test(text)) return "Blunder";
  for (const key of ["Spectacular Failure", "Absolute Failure", "Absolute Success", "Partial Success", "Near Success", "Success", "Failure"]) {
    if (text.includes(key)) return key;
  }
  return text;
}

export async function installMerpSpecialPowerManeuverResults() {
  try {
    const route = (path) => foundry?.utils?.getRoute ? foundry.utils.getRoute(path) : `/${path}`;
    const mod = await import(route("systems/rmu/module/rmu/maneuvers/maneuvers.js"));
    const proto = mod?.Maneuver?.prototype;
    if (!proto || proto.__merpUiSpecialPowerResults || typeof proto.resolveManeuver !== "function") return false;
    const original = proto.resolveManeuver;
    proto.resolveManeuver = async function(roll, skill, options) {
      const result = await original.call(this, roll, skill, options);
      const actor = this?._actor;
      const skillName = String(skill?.name ?? skill?.system?.name ?? "");
      const skillSpec = String(skill?.specialization ?? skill?.system?.specialization ?? "");
      const candidates = [...(actor?.items ?? [])].filter((candidate) =>
        candidate.type === "skill" &&
        (String(candidate.system?.name ?? "") === skillName || String(candidate.name ?? "") === skillName)
      );
      const item = (skillSpec && candidates.find((candidate) => String(candidate.system?.specialization ?? "") === skillSpec)) || candidates[0];
      const key = merpSpecialSkillKey(item);
      if (!MERP_SPECIAL_POWER_SKILL_KEYS.has(key)) return result;
      const decision = merpSpecialManeuverDecision(result?.decision);
      const table = key === "yavannas-song" ? YAVANNA_SONG_RESULTS : HEALING_SONG_RESULTS;
      if (table[decision]) {
        result.decision = decision;
        result.description = table[decision];
        result.tableName = key === "yavannas-song" ? "Chant de Yavanna — Table MERP" : "Chants de Guérison — Table MERP";
        result.effects = [];
      }
      return result;
    };
    proto.__merpUiSpecialPowerResults = true;
    return true;
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible d’installer les tables spéciales de chants`, error);
    return false;
  }
}

