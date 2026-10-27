/**
 * MERP-UI — professions compatibles selon la race et la culture du personnage.
 * Référence : Whitford Bates et collectif, MERP Character Creation Using
 * RMSS/RMFRP v2.5, fiches « Professions » des peuples et professions.
 *
 * Restrictions explicites uniquement : les omissions et professions rares ne
 * sont jamais transformées en interdictions sans source. Le Meneur peut les
 * désactiver dans les paramètres du monde. Aucun document RMU n'est modifié.
 */
const ID_TO_PROFESSION = Object.freeze({
  "ShFrQz1clFbvww21": "alchemist",
  "I8zeXj7LUv6E43Rp": "animist",
  "gK7MVK2bQNs2rhYZ": "astrologer",
  "R0PmJzcbid5aS7B7": "barbarian",
  "SCfSkXaByc7Dzrxq": "bard",
  "8CKiOZWT3zSQdNrK": "drughan",
  "IETUcvRptZkMm3dw": "fighter",
  "IQDFdx0YhJs4W2al": "herutano",
  "Nky1JVIxSrRZiMOK": "honnin-priest",
  "bHnBool4FvAfjKkA": "kekhavra",
  "XnaBdc8p2ajlt9Ms": "lay-healer",
  "MwjXWOQniT04mq7j": "layman",
  "KhsTmYdc2rYJSwaZ": "magician",
  "udsOP8QW8uXDECcw": "ranger",
  "dEHzL3WVX5GRAhIs": "razak-zinul",
  "UQ5gHIhlG4RydY0W": "rogue",
  "SAHjNg77NK4PNLPY": "seer",
  "Skc4u2D4o07MhsMT": "sorcerer",
  "brN002vUinm0BW72": "thief",
  "B24jAjjNwcpTllLK": "vracara",
  "uIs1WEyUPNgVYSRM": "wegech",
});
const SPECIAL_CULTURE = Object.freeze({
  "kekhavra": "culture-human-variags",
  "vracara": "culture-human-variags",
  "wegech": "culture-hillmen",
  "drughan": "culture-drughu",
  "honnin-priest": "culture-honnin"
});
const SPECIAL_RACE = Object.freeze({
  "razak-zinul": "race-khazad"
});
// Whitford explicitly says "Elven culture" for Herutano. Half-elves can
// legally select an Elven culture in MERP-UI and must not be excluded solely
// because their race ID is Peredhil.
const ELF_CULTURES = new Set([
  "culture-elf-avari", "culture-elf-nandor", "culture-elf-noldor",
  "culture-elf-silvan", "culture-elf-sindar", "culture-elf-vanyar",
  "culture-fuinar", "culture-kuorind", "culture-luindrim",
  "culture-pedi", "culture-penni", "culture-teleri"
]);
const SPELL_PROFESSIONS = new Set([
  "alchemist", "animist", "astrologer", "bard", "drughan", "herutano",
  "honnin-priest", "kekhavra", "lay-healer", "magician", "ranger",
  "razak-zinul", "seer", "sorcerer", "vracara", "wegech"
]);
// A profession is not removed for being merely rare or unusual.
const CULTURAL_DENY = Object.freeze({
  "culture-human-variags": new Set(["animist", "lay-healer"]),
  "culture-human-dorwinrim": new Set(["barbarian"]),
  "culture-human-dunedain-gondor": new Set(["barbarian"]),
  "culture-human-dunedain-lost-realm": new Set(["barbarian"]),
  "culture-human-gramuz": new Set(["barbarian"]),
  "culture-human-northmen-urban": new Set(["barbarian"]),
  "culture-human-rohirrim": new Set(["barbarian"]),
  "culture-human-haruze": new Set(["barbarian"]),
  "culture-half-orcs": new Set(["barbarian"])
});
const DRUGHU = new Set(["barbarian", "layman", "rogue", "ranger", "drughan"]);
const HILLMEN = new Set(["barbarian", "fighter", "rogue", "layman", "ranger", "wegech"]);
const BEFFRAEN = new Set(["barbarian", "layman", "rogue", "ranger", "animist"]);
// Nûm-raghke is classified as an Animist in Whitford; MERP-UI also
// provides the dedicated Honnin Priest adaptation of that tradition.
const HONNIN = new Set(["barbarian", "layman", "rogue", "ranger", "animist", "honnin-priest"]);
// Under Whitford, Trolls (including wild forms) may be Fighters/Barbarians;
// Half-trolls are Fighters only. Hobbits have four non-magical professions.
const STRICT_RACE = Object.freeze({
  "race-hobbits": new Set(["fighter", "rogue", "thief", "layman"]),
  "race-half-trolls": new Set(["fighter"]),
  "race-trolls": new Set(["fighter", "barbarian"])
});
const NATIVE_ALIASES = Object.freeze({
  "fighter": "fighter", "guerrier": "fighter", "barbarian": "barbarian", "barbare": "barbarian",
  "rogue": "rogue", "roublard": "rogue", "thief": "thief", "voleur": "thief",
  "layman": "layman", "sans profession": "layman", "alchemist": "alchemist", "alchimiste": "alchemist",
  "animist": "animist", "animiste": "animist", "astrologer": "astrologer", "astrologue": "astrologer",
  "bard": "bard", "barde": "bard", "lay healer": "lay-healer", "soigneur": "lay-healer",
  "magician": "magician", "magicien": "magician", "ranger": "ranger", "rôdeur": "ranger",
  "seer": "seer", "devin": "seer", "sorcerer": "sorcerer", "sorcier": "sorcerer",
  "drughan": "drughan", "drughân": "drughan", "herutano": "herutano",
  "kekhavra": "kekhavra", "razak-zinul": "razak-zinul", "vracara": "vracara",
  "wegech": "wegech", "prêtre honnin (ônu)": "honnin-priest"
});
const MERP_PREFIX = "Compendium.merp-ui.merp-rmu-professions.";
const RMU_PREFIX = "Compendium.rmu.core.";
function itemKey(item, prefix) {
  const f = item?.flags?.["merp-ui"] ?? {};
  const raw = String(f.canonicalKey ?? f.key ?? f.compendiumSourceKey ?? "");
  if (raw.startsWith(prefix)) return raw.replace(/-age-[1-4]$/, "");
  return null;
}
export function actorMerpCultureKey(actor) {
  const live = Array.from(actor?.items ?? []).filter(i => i?.type === "culture");
  const active = new Set(live.map(i => itemKey(i, "culture-")).filter(Boolean));
  // Do not guess if two cultures are present during character creation.
  if (active.size === 1) return active.values().next().value;
  if (active.size > 1) return null;
  if (!live.length) {
    const source = actor?.toObject?.()?.items ?? actor?._source?.items ?? [];
    const keys = new Set(source.filter(i => i?.type === "culture")
      .map(i => itemKey(i, "culture-")).filter(Boolean));
    if (keys.size === 1) return keys.values().next().value;
  }
  return null;
}
export function professionKeyOfRow(row) {
  const uuid = String(row?.uuid ?? "");
  if (uuid.startsWith(MERP_PREFIX)) {
    return ID_TO_PROFESSION[uuid.slice(MERP_PREFIX.length).replace(/^Item\./, "")] ?? null;
  }
  if (!uuid.startsWith(RMU_PREFIX)) return null;
  return NATIVE_ALIASES[String(row.name ?? "").trim().toLocaleLowerCase("fr")] ?? null;
}
export function evaluateProfession(raceKey, cultureKey, professionKey) {
  // Unknown profession identity: on exclusively enumerated peoples, deny it;
  // elsewhere do not pretend an unrecognized native RMU profession is forbidden.
  if (!raceKey) return {allowed: true, reason: "unknown-race"};
  if (!professionKey) return {
    allowed: !STRICT_RACE[raceKey] && !["culture-drughu", "culture-hillmen", "culture-beffraen", "culture-human-beffraen", "culture-honnin", "culture-olog-hai"].includes(cultureKey),
    reason: "unknown-profession"
  };
  const strict = STRICT_RACE[raceKey];
  if (strict && !strict.has(professionKey)) return {allowed: false, reason: "race-only"};
  const onlyCulture = SPECIAL_CULTURE[professionKey];
  if (onlyCulture && cultureKey !== onlyCulture) return {allowed: false, reason: "special-culture"};
  const onlyRace = SPECIAL_RACE[professionKey];
  if (onlyRace && raceKey !== onlyRace) return {allowed: false, reason: "special-race"};
  if (professionKey === "herutano" && raceKey !== "race-elves" &&
      !(raceKey === "race-half-elves" && ELF_CULTURES.has(cultureKey))) {
    return {allowed: false, reason: "elven-culture"};
  }
  if (cultureKey === "culture-drughu" && !DRUGHU.has(professionKey)) return {allowed: false, reason: "drughu"};
  if (cultureKey === "culture-human-beffraen" && !BEFFRAEN.has(professionKey))
    return {allowed: false, reason: "beffraen"};
  if (cultureKey === "culture-honnin" && !HONNIN.has(professionKey))
    return {allowed: false, reason: "honnin"};
  if (cultureKey === "culture-olog-hai" && professionKey !== "fighter")
    return {allowed: false, reason: "olog-hai"};
  // These constraints are explicitly present in the race/culture sections.
  if (raceKey === "race-khazad" &&
      (professionKey === "barbarian" || (SPELL_PROFESSIONS.has(professionKey) && professionKey !== "razak-zinul"))) {
    return {allowed: false, reason: "khazad"};
  }
  if (raceKey === "race-petty-dwarves" && (
    professionKey === "fighter" || professionKey === "alchemist" ||
    ["herutano", "kekhavra", "vracara", "wegech", "seer", "astrologer", "bard", "lay-healer"].includes(professionKey)
  )) return {allowed: false, reason: "petty-dwarves"};
  if (raceKey === "race-orcs" && professionKey === "barbarian") return {allowed: false, reason: "orcs"};
  if (raceKey === "race-elves" && professionKey === "barbarian") return {allowed: false, reason: "elves"};
  if (cultureKey === "culture-hillmen" && !HILLMEN.has(professionKey)) return {allowed: false, reason: "hillmen"};
  if (CULTURAL_DENY[cultureKey]?.has(professionKey)) return {allowed: false, reason: "culture"};
  return {allowed: true, reason: "ok"};
}
export function compatibleProfessionRows(rows, raceKey, cultureKey) {
  if (!Array.isArray(rows) || !raceKey) return rows;
  return rows.filter(row => evaluateProfession(raceKey, cultureKey, professionKeyOfRow(row)).allowed);
}
export const WHITFORD_COMPATIBILITY_DOCUMENTATION = Object.freeze({
  source: "Whitford Bates et collectif — MERP Character Creation Using RMSS/RMFRP v2.5",
  note: "Une restriction explicitement connue est appliquée; les professions rares restent admises.",
  conditionalSex: ["kekhavra", "vracara", "wegech", "drughan"],
  genderNote: "La source comporte également des restrictions de sexe non vérifiées automatiquement dans Foundry."
});
