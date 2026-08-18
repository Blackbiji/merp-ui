const PROFESSION_TECHNICAL_KEYS = new Map([
  ["Magicien", "Magician"],
  ["Soigneur", "Soigneur"],
  ["Animiste", "Animist"],
  ["Rôdeur", "Rôdeur"],
  ["Barde", "Bard"],
  ["Devin", "Seer"],
  ["Astrologue", "Astrologer"],
  ["Razak-Zinul", "Razak-zinul"],
  ["Kekhavra", "Kekhavra"],
  ["Sorcier", "Sorcier"],
  ["Vracara", "Vracara"],
  ["Wegech", "Wegech"],
  ["Drughân", "Drughân"],
  ["Herutano", "Herutano"],
  ["Prêtre Honnin (Ônu)", "Honnin Priest"]
]);

const MERP_PRIME_STATS = new Map([
  ["Barbarian", ["St", "Co"]],
  ["Barbare", ["St", "Co"]],
  ["Fighter", ["Co", "St"]],
  ["Guerrier", ["Co", "St"]],
  ["Rogue", ["Ag", "St"]],
  ["Roublard", ["Ag", "St"]],
  ["Thief", ["Ag", "Qu"]],
  ["Voleur", ["Ag", "Qu"]],
  ["Layman", []],
  ["Sans Profession", []],
  ["Alchemist", ["Em", "Re"]],
  ["Alchimiste", ["Em", "Re"]],
  ["Magician", ["Em", "Re"]],
  ["Magicien", ["Em", "Re"]],
  ["Animist", ["In", "Me"]],
  ["Animiste", ["In", "Me"]],
  ["Razak-zinul", ["In", "Re"]],
  ["Razak-Zinul", ["In", "Re"]],
  ["Lay Healer", ["Pr", "SD"]],
  ["Soigneur", ["Pr", "SD"]],
  ["Seer", ["SD", "Pr"]],
  ["Devin", ["SD", "Pr"]],
  ["Ranger", ["Co", "In"]],
  ["Rôdeur", ["Co", "In"]],
  ["Astrologer", ["SD", "In", "Pr"]],
  ["Astrologue", ["SD", "In", "Pr"]],
  ["Kekhavra", ["In", "Pr", "SD"]],
  ["Sorcerer", ["Em", "In", "SD"]],
  ["Sorcier", ["Em", "In", "SD"]],
  ["Vracara", ["In", "Pr", "SD"]],
  ["Wegech", ["Em", "In", "SD"]],
  ["Drughân", ["In", "Me"]],
  ["Drughan", ["In", "Me"]],
  ["Bard", ["Me", "Pr"]],
  ["Barde", ["Me", "Pr"]],
  ["Herutano", ["Pr", "SD"]],
  ["Honnin Priest", ["In", "Me"]],
  ["Prêtre Honnin (Ônu)", ["In", "Me"]]
]);


export function expectedProfessionTechnicalKey(item, managedKey = null) {
  if (!item || item.type !== "profession") return null;
  const key = managedKey ?? item.getFlag?.("merp-ui", "key");
  if (key === "alchemist") return "Alchemist";
  if (key === "magician") return "Magician";
  if (key === "lay-healer") return "Soigneur";
  if (key === "animist") return "Animist";
  if (key === "ranger") return "Rôdeur";
  if (key === "bard") return "Bard";
  if (key === "seer") return "Seer";
  if (key === "astrologer") return "Astrologer";
  if (key === "razak-zinul") return "Razak-zinul";
  if (key === "kekhavra") return "Kekhavra";
  if (key === "sorcerer") return "Sorcier";
  if (key === "vracara") return "Vracara";
  if (key === "wegech") return "Wegech";
  if (key === "drughan") return "Drughân";
  if (key === "herutano") return "Herutano";
  if (key === "honnin-priest") return "Honnin Priest";
  return PROFESSION_TECHNICAL_KEYS.get(item.name) ?? null;
}

export function merpPrimeStatsForProfession(profession) {
  const key = profession?.profession ?? profession?.name ?? "";
  return MERP_PRIME_STATS.get(key) ?? null;
}

export function installMerpPrimeStatHelper() {
  if (!globalThis.Handlebars?.registerHelper) return false;
  Handlebars.registerHelper("isProfessionalSuggestedStat", function(system, statShortName) {
    const custom = merpPrimeStatsForProfession(system?._profession ?? null);
    if (custom) return custom.includes(statShortName);
    const suggested = system?._suggestedStatShortNames;
    return Array.isArray(suggested) && suggested.includes(statShortName);
  });
  return true;
}

export function normalizedSpellListIdentity(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}


export function actorProfessionTechnicalName(actor) {
  const professionItem = [...(actor?.items ?? [])].find((entry) => entry.type === "profession");
  return professionItem?.system?.profession ?? professionItem?.name ?? actor?.system?._profession?.profession ?? actor?.system?._profession?.name ?? "";
}



const SIX_OF_NINE_BASE_LIST_PROFESSIONS = new Set(["Herutano", "Razak-zinul"]);

export function limitedBaseSpellListsOnActor(actor, { excludeId = null } = {}) {
  const profession = actorProfessionTechnicalName(actor);
  if (!SIX_OF_NINE_BASE_LIST_PROFESSIONS.has(profession)) return [];
  return [...(actor?.items ?? [])].filter((entry) =>
    entry.id !== excludeId &&
    entry.type === "skill" &&
    entry.name === "Base Spell List"
  );
}


export function filterLimitedBaseSpellListChoices(groups, actor, { excludeId = null } = {}) {
  if (!Array.isArray(groups)) return groups;
  const profession = actorProfessionTechnicalName(actor);
  if (!SIX_OF_NINE_BASE_LIST_PROFESSIONS.has(profession)) return groups;

  const chosen = limitedBaseSpellListsOnActor(actor, { excludeId });

  const chosenNames = new Set(
    chosen
      .map((entry) => normalizedSpellListIdentity(entry.system?.specialization ?? entry.system?.spellListName))
      .filter(Boolean)
  );

  const limitReached = chosen.length >= 6;

  // Never mutate RMU's groups. Once the 6-list cap is reached, keep the
  // profession group but expose no remaining spell-list choice. RMU then
  // disables Add natively and leaves spellList/spellListUuid empty.
  return groups.map((group) => {
    if (group?.profession !== profession || !Array.isArray(group.spellLists)) return group;

    return {
      ...group,
      spellLists: limitReached
        ? []
        : group.spellLists.filter((spellList) =>
            !chosenNames.has(
              normalizedSpellListIdentity(spellList?.name ?? spellList?.system?.name ?? "")
            )
          )
    };
  });
}

