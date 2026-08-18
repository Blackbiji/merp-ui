import { contentLanguage } from "./localization.js";
import { getRmuCompendiumIndex } from "./rmu-adapter.js";

const MODULE_ID = "merp-ui";

export function normalizeCampaignLanguageKey(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[’'`´]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function localizedCampaignLanguageName(
  language,
  data,
  { languageCode = contentLanguage() } = {}
) {
  const technicalName = String(language?.name ?? "").trim();
  if (!technicalName) return technicalName;
  const registry = data?.metadata?.languageDisplayNames?.[languageCode] ?? {};
  return registry[technicalName] ?? technicalName;
}

export function campaignLanguageIdentityResolver(data) {
  const aliases = new Map();
  const displayNames = data?.metadata?.languageDisplayNames ?? {};

  const register = (visibleName, technicalName) => {
    const aliasKey = normalizeCampaignLanguageKey(visibleName);
    const technicalKey = normalizeCampaignLanguageKey(technicalName);
    if (!aliasKey || !technicalKey) return;
    aliases.set(aliasKey, technicalKey);
  };

  for (const registry of Object.values(displayNames)) {
    for (const [technicalName, visibleName] of Object.entries(registry ?? {})) {
      register(technicalName, technicalName);
      register(visibleName, technicalName);
    }
  }

  // Starting Languages are the authoritative technical vocabulary even if a
  // language has no translated display-name override.
  for (const entry of data?.items ?? []) {
    if (entry?.document?.type !== "culture") continue;
    const starting =
      entry?.document?.flags?.["merp-ui"]?.languages?.starting ?? [];
    for (const language of starting) {
      if (!language?.name) continue;
      register(language.name, language.name);
    }
  }

  return (language) => {
    const flagged = String(
      language?.flags?.merpUiTechnicalName ?? ""
    ).trim();
    if (flagged) return normalizeCampaignLanguageKey(flagged);

    const visible = normalizeCampaignLanguageKey(language?.name);
    return aliases.get(visible) ?? visible;
  };
}

export function merpRmuCampaignLanguagesFromCultures(
  data,
  { languageCode = contentLanguage() } = {}
) {
  const registry = new Map();

  for (const entry of data?.items ?? []) {
    if (entry?.document?.type !== "culture") continue;
    const starting = entry?.document?.flags?.["merp-ui"]?.languages?.starting ?? [];

    for (const language of starting) {
      if (!language?.name) continue;
      const key = normalizeCampaignLanguageKey(language.name);
      if (!key) continue;

      const signaledOnly =
        language.mode === "signaled" ||
        normalizeCampaignLanguageKey(language.name) === "waildyth";
      const visibleName = localizedCampaignLanguageName(language, data, {
        languageCode
      });
      const candidate = signaledOnly
        ? {
            name: visibleName,
            spoken: false,
            written: false,
            signaled: true,
            lipReading: false
          }
        : {
            name: visibleName,
            spoken: true,
            written: true,
            signaled: true,
            lipReading: true
          };

      candidate.flags = {
        ...(candidate.flags ?? {}),
        merpUiTechnicalName: language.name
      };

      if (!registry.has(key)) {
        registry.set(key, candidate);
        continue;
      }

      const current = registry.get(key);
      current.spoken ||= candidate.spoken;
      current.written ||= candidate.written;
      current.signaled ||= candidate.signaled;
      current.lipReading ||= candidate.lipReading;
    }
  }

  return [...registry.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

export async function syncRmuCampaignLanguages(
  data = null,
  {
    notify = false,
    language = contentLanguage()
  } = {}
) {
  if (!game.user?.isGM) return { skipped: true, reason: "not-gm" };
  if (game.system?.id !== "rmu") {
    return { skipped: true, reason: "wrong-system" };
  }

  if (!data) {
    throw new Error(
      "syncRmuCampaignLanguages requires the MERP-RMU dataset."
    );
  }

  const languageCode = language === "en" ? "en" : "fr";
  const generated = merpRmuCampaignLanguagesFromCultures(data, {
    languageCode
  });
  const existing = foundry.utils.deepClone(
    game.settings.get("rmu", "languages") ?? []
  );
  const identify = campaignLanguageIdentityResolver(data);

  const generatedByKey = new Map(
    generated.map((entry) => [identify(entry), entry])
  );

  // Group existing MERP-managed aliases before rebuilding the setting.
  // Old versions could leave both the FR and EN visible forms in the array.
  // They now collapse into one canonical entry per technical language.
  const managedGroups = new Map();
  const unmanaged = [];

  for (const entry of existing) {
    const key = identify(entry);
    const generatedLanguage = generatedByKey.get(key);

    if (!generatedLanguage) {
      unmanaged.push(entry);
      continue;
    }

    const group = managedGroups.get(key) ?? [];
    group.push(entry);
    managedGroups.set(key, group);
  }

  let renamed = 0;
  let flagsUpgraded = 0;
  let duplicatesRemoved = 0;

  const managed = [];

  for (const [key, generatedLanguage] of generatedByKey.entries()) {
    const group = managedGroups.get(key) ?? [];

    // Preserve any extra RMU fields carried by the oldest existing entry,
    // while making MERP-RMU authoritative for presentation/capabilities.
    const base = group[0] ?? {};

    if (group.length > 1) {
      duplicatesRemoved += group.length - 1;
    }

    if (group.length) {
      renamed += group.filter(
        (entry) => entry?.name !== generatedLanguage.name
      ).length;

      flagsUpgraded += group.filter(
        (entry) =>
          entry?.flags?.merpUiTechnicalName !==
          generatedLanguage?.flags?.merpUiTechnicalName
      ).length;
    }

    managed.push({
      ...base,
      name: generatedLanguage.name,
      spoken: generatedLanguage.spoken,
      written: generatedLanguage.written,
      signaled: generatedLanguage.signaled,
      lipReading: generatedLanguage.lipReading,
      flags: {
        ...(base.flags ?? {}),
        ...(generatedLanguage.flags ?? {})
      }
    });
  }

  // Languages unrelated to MERP-UI are never collapsed or rewritten.
  const merged = [...unmanaged, ...managed];

  // Keep the campaign list deterministic after labels change language.
  merged.sort((a, b) =>
    String(a?.name ?? "").localeCompare(
      String(b?.name ?? ""),
      languageCode,
      { sensitivity: "base" }
    )
  );

  const changed =
    JSON.stringify(existing) !== JSON.stringify(merged);

  if (changed) {
    await game.settings.set("rmu", "languages", merged);
  }

  const added = generated.filter((entry) => {
    const key = identify(entry);
    return !(managedGroups.get(key)?.length);
  });

  const result = {
    language: languageCode,
    generated: generated.length,
    existing: existing.length,
    added: added.length,
    updated: generated.length - added.length,
    renamed,
    flagsUpgraded,
    duplicatesRemoved,
    total: merged.length,
    changed,
    addedNames: added.map((entry) => entry.name)
  };

  if (notify) {
    ui.notifications.info(
      `MERP UI : Langues de Campagne — ${languageCode.toUpperCase()} ` +
      `(${renamed} renommée(s), ${duplicatesRemoved} doublon(s) supprimé(s), ` +
      `${added.length} ajoutée(s), ${merged.length} au total).`
    );
  }

  console.log(
    `${MODULE_ID} | Synchronisation Langues de Campagne`,
    result
  );
  return result;
}

export function actorMerpCulture(actor) {
  // The Culture embedded on an Actor may pre-date the Starting Languages
  // migration. Never require the embedded copy itself to contain language data.
  return [...(actor?.items ?? [])].find((item) => item.type === "culture") ?? null;
}

export function cultureReferenceItem(culture) {
  if (!culture) return null;

  const flags = culture.flags?.[MODULE_ID] ?? {};
  const technicalKey = String(flags.key ?? "").trim();
  const canonicalKey = String(flags.canonicalKey ?? "").trim();

  const worldCultures = (game.items?.contents ?? []).filter((item) =>
    item.type === "culture" &&
    item.getFlag?.(MODULE_ID, "collection") === "merp-rmu"
  );

  // Best identity: exact age-specific MERP-RMU key.
  if (technicalKey) {
    const exact = worldCultures.find((item) =>
      String(item.getFlag?.(MODULE_ID, "key") ?? "") === technicalKey
    );
    if (exact) return exact;
  }

  // Older embedded copies may only retain the canonical culture identity.
  if (canonicalKey) {
    const exactCanonical = worldCultures.find((item) =>
      String(item.getFlag?.(MODULE_ID, "canonicalKey") ?? "") === canonicalKey
    );
    if (exactCanonical) return exactCanonical;
  }

  // Last-resort migration path for very old Actors: match the stable technical
  // culture value before comparing the localized visible name.
  const technicalCulture = String(culture.system?.culture ?? "").trim();
  if (technicalCulture) {
    const technicalMatch = worldCultures.find((item) =>
      String(item.system?.culture ?? "").trim() === technicalCulture
    );
    if (technicalMatch) return technicalMatch;
  }

  return worldCultures.find((item) => item.name === culture.name) ?? null;
}

export function cultureStartingLanguages(culture) {
  const embedded = culture?.flags?.[MODULE_ID]?.languages;
  if (Array.isArray(embedded?.starting) && ["verified", "contextual-inference"].includes(embedded.sourceStatus)) {
    return embedded.starting;
  }

  const reference = cultureReferenceItem(culture);
  const referenceLanguages = reference?.flags?.[MODULE_ID]?.languages;
  if (
    Array.isArray(referenceLanguages?.starting) &&
    ["verified", "contextual-inference"].includes(referenceLanguages.sourceStatus)
  ) {
    return referenceLanguages.starting;
  }

  return [];
}

export function actorLanguageSkillIdentity(item) {
  if (item?.type !== "skill") return null;
  const name = String(item.name ?? item.system?.name ?? "").trim();
  if (name !== "Language Spoken" && name !== "Language Written") return null;
  const specialization = String(item.system?.specialization ?? "").trim();
  if (!specialization) return null;
  return `${name}::${normalizeCampaignLanguageKey(specialization)}`;
}

export async function rmuLanguageSkillSources() {
  const { pack, index } = await getRmuCompendiumIndex("rmu.core", [
    "name",
    "type",
    "system.name",
    "system.category",
    "system.specialization",
    "system.specializationType"
  ]);

  const result = {};
  for (const skillName of ["Language Spoken", "Language Written"]) {
    const hit = index.find((entry) =>
      entry.type === "skill" &&
      (entry.name === skillName || entry.system?.name === skillName)
    );
    if (!hit) throw new Error(`Compétence RMU native introuvable : ${skillName}`);
    result[skillName] = await pack.getDocument(hit._id);
  }
  return result;
}

export function embeddedCultureLanguageSkillData(source, specialization, cultureRanks) {
  const doc = source.toObject();
  delete doc._id;
  delete doc.folder;
  delete doc.ownership;
  delete doc.sort;
  delete doc._stats;

  doc.flags ??= {};
  doc.flags[MODULE_ID] ??= {};
  doc.flags[MODULE_ID].cultureLanguage = true;
  doc.flags[MODULE_ID].cultureLanguageSpecialization = specialization;
  doc.flags.rmu ??= {};
  doc.flags.rmu.origin = { uuid: source.uuid };

  doc.system ??= {};
  doc.system.specialization = specialization;
  doc.system.ranks = Number(doc.system.ranks ?? 0);
  doc.system.cultureRanks = Number(cultureRanks ?? 0);
  doc.system.levelUpRanks = Number(doc.system.levelUpRanks ?? 0);
  doc.system.favorite = false;
  return doc;
}

export async function syncCultureLanguagesForActor(actor, { notify = false } = {}) {
  if (!actor || actor.documentName !== "Actor" || actor.type !== "Character") {
    return { skipped: true, reason: "not-character" };
  }

  const culture = actorMerpCulture(actor);
  const cultureReference = cultureReferenceItem(culture);
  const starting = cultureStartingLanguages(culture);
  const desired = new Map();

  for (const language of starting) {
    const specialization = String(language?.name ?? "").trim();
    if (!specialization) continue;
    const spokenRanks = Number(language.spoken ?? 0);
    const writtenRanks = Number(language.written ?? 0);

    if (spokenRanks > 0 && language.mode !== "signaled") {
      desired.set(
        `Language Spoken::${normalizeCampaignLanguageKey(specialization)}`,
        { skillName: "Language Spoken", specialization, cultureRanks: spokenRanks }
      );
    }
    if (writtenRanks > 0 && language.mode !== "signaled") {
      desired.set(
        `Language Written::${normalizeCampaignLanguageKey(specialization)}`,
        { skillName: "Language Written", specialization, cultureRanks: writtenRanks }
      );
    }
  }

  const existingLanguageSkills = [...(actor.items ?? [])].filter((item) =>
    item.type === "skill" &&
    ["Language Spoken", "Language Written"].includes(String(item.name ?? item.system?.name ?? ""))
  );
  const existingByIdentity = new Map(
    existingLanguageSkills
      .map((item) => [actorLanguageSkillIdentity(item), item])
      .filter(([key]) => Boolean(key))
  );

  const sources = desired.size ? await rmuLanguageSkillSources() : {};
  const createData = [];
  let updated = 0;
  let cleared = 0;

  for (const [identity, wanted] of desired) {
    const current = existingByIdentity.get(identity);
    if (current) {
      const update = {};
      if (Number(current.system?.cultureRanks ?? 0) !== wanted.cultureRanks) {
        update["system.cultureRanks"] = wanted.cultureRanks;
      }
      if (current.getFlag?.(MODULE_ID, "cultureLanguage") !== true) {
        update[`flags.${MODULE_ID}.cultureLanguage`] = true;
      }
      if (current.getFlag?.(MODULE_ID, "cultureLanguageSpecialization") !== wanted.specialization) {
        update[`flags.${MODULE_ID}.cultureLanguageSpecialization`] = wanted.specialization;
      }
      if (Object.keys(update).length) {
        await current.update(update, { render: false, merpUiCultureLanguageSync: true });
        updated += 1;
      }
      continue;
    }

    createData.push(
      embeddedCultureLanguageSkillData(
        sources[wanted.skillName],
        wanted.specialization,
        wanted.cultureRanks
      )
    );
  }

  const created = createData.length
    ? await actor.createEmbeddedDocuments("Item", createData, {
        render: false,
        merpUiCultureLanguageSync: true
      })
    : [];

  for (const item of existingLanguageSkills) {
    const identity = actorLanguageSkillIdentity(item);
    if (desired.has(identity)) continue;
    if (item.getFlag?.(MODULE_ID, "cultureLanguage") !== true) continue;
    if (Number(item.system?.cultureRanks ?? 0) === 0) continue;

    const personalRanks =
      Number(item.system?.ranks ?? 0) +
      Number(item.system?.levelUpRanks ?? 0);

    if (personalRanks > 0) {
      await item.update(
        { "system.cultureRanks": 0 },
        { render: false, merpUiCultureLanguageSync: true }
      );
    } else {
      await item.delete({ render: false, merpUiCultureLanguageSync: true });
    }
    cleared += 1;
  }

  const result = {
    culture: culture?.name ?? null,
    referenceCulture: cultureReference?.name ?? null,
    embeddedHasStartingLanguages:
      Array.isArray(culture?.flags?.[MODULE_ID]?.languages?.starting) &&
      culture?.flags?.[MODULE_ID]?.languages?.sourceStatus === "verified",
    desired: desired.size,
    created: created.length,
    updated,
    cleared
  };
  if (notify && culture) {
    ui.notifications.info(
      `MERP UI : ${culture.name} — ${result.desired} compétence(s) linguistique(s) synchronisée(s).`
    );
  }
  console.log(`${MODULE_ID} | Langues de Culture Actor`, actor.name, result);
  return result;
}

export async function syncCultureLanguagesForAllActors({ notify = false } = {}) {
  if (!game.user?.isGM) return { skipped: true, reason: "not-gm" };
  const actors = (game.actors?.contents ?? []).filter((actor) => actor.type === "Character");
  const results = [];
  for (const actor of actors) {
    results.push(await syncCultureLanguagesForActor(actor));
  }
  if (notify) {
    ui.notifications.info(
      `MERP UI : langues de Culture synchronisées pour ${actors.length} personnage(s).`
    );
  }
  return { actors: actors.length, results };
}
