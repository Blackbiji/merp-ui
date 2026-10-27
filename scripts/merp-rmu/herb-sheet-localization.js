/**
 * MERP-UI herb Item sheet labels (FR/EN).
 * Presentation-only: modifies rendered text and option labels, never option
 * values, saved Item data, or the RMU system's calculation inputs.
 *
 * The root resolver is passed by merp-ui.js to share existing Foundry v1/v2
 * window discovery without introducing a circular dependency.
 */
import { contentLanguage } from "./localization.js";
import { enhanceHerbBiomeHelp } from "./herb-biomes.js";

// ---------------------------------------------------------------------------
// MERP-UI — Herb sheet display localization
// RMU stores technical values such as "Autumn", "Leaf", "Hard" and "apply".
// Do not rewrite those values: localize only their visible labels/options.
// ---------------------------------------------------------------------------
const HERB_SHEET_TEXT_FR = new Map([
  ["DESCRIPTION", "DESCRIPTION"],
  ["HERB", "HERBE"],
  ["COST / WEIGHT", "COÛT / POIDS"],
  ["Quantity", "Quantité"],
  ["Biome(s)", "Biome(s)"],
  ["Season(s)", "Saison(s)"],
  ["Find", "Trouver"],
  ["Form", "Forme"],
  ["Use", "Usage"],
  ["Addiction (%)", "Addiction (%)"],
  ["Cost", "Coût"],
  ["Weight", "Poids"]
]);

const HERB_SHEET_TEXT_EN = new Map([
  ["DESCRIPTION", "DESCRIPTION"],
  ["HERBE", "HERB"],
  ["COÛT / POIDS", "COST / WEIGHT"],
  ["Quantité", "Quantity"],
  ["Biome(s)", "Biome(s)"],
  ["Saison(s)", "Season(s)"],
  ["Trouver", "Find"],
  ["Forme", "Form"],
  ["Usage", "Use"],
  ["Addiction (%)", "Addiction (%)"],
  ["Coût", "Cost"],
  ["Poids", "Weight"]
]);

// Localize only the display of RMU season/date options. Never change option.value.
const HERB_SEASONS = {
  fr: new Map([
    ["Spring","Printemps"],["Summer","Été"],["Autumn","Automne"],["Winter","Hiver"],
    ["Printemps","Printemps"],["Été","Été"],["Automne","Automne"],["Hiver","Hiver"],
    ["All Year","Toute l’année"],["Year-round","Toute l’année"],["All seasons","Toutes les saisons"],
    ["Dry seasons","Saisons sèches"],["Wet seasons","Saisons humides"],["Rainy seasons","Saisons des pluies"],
    ["Near full moon (5 days)","Aux environs de la pleine lune (5 jours)"],
    ["1-3 weeks after rain","1 à 3 semaines après la pluie"],
    ["Sacred/Special Date","Date sacrée / particulière"],["Sacred Date","Date sacrée"],
    ["Special Date","Date particulière"],["Special","Particulier"],["Varies","Variable"],
    ["Near full moon","Aux environs de la pleine lune"],["Full moon","Pleine lune"],
    ["New moon","Nouvelle lune"],["After rain","Après la pluie"],
    ["Any season","Toute saison"],["Toute l’année","Toute l’année"]
  ]),
  en: new Map([
    ["Printemps","Spring"],["Été","Summer"],["Automne","Autumn"],["Hiver","Winter"],
    ["Spring","Spring"],["Summer","Summer"],["Autumn","Autumn"],["Winter","Winter"],
    ["Toute l’année","All Year"],["Toutes les saisons","All seasons"],
    ["Saisons sèches","Dry seasons"],["Saisons humides","Wet seasons"],
    ["Saisons des pluies","Rainy seasons"],
    ["Milieu à fin du printemps","Mid-to-late spring"],
    ["Printemps et début de l’été","Spring-early summer"],
    ["Milieu de l’été à début de l’automne","Mid-summer-early autumn"],
    ["Aux environs de la pleine lune (5 jours)","Near full moon (5 days)"],
    ["1 à 3 semaines après la pluie","1-3 weeks after rain"],
    ["Date sacrée / particulière","Sacred/Special Date"],["Date sacrée","Sacred Date"],
    ["Date particulière","Special Date"],["Particulier","Special"],["Variable","Varies"],
    ["Aux environs de la pleine lune","Near full moon"],["Pleine lune","Full moon"],
    ["Nouvelle lune","New moon"],["Après la pluie","After rain"],["Toute saison","Any season"]
  ])
};
const MERP_SEASON_FORMS = {
  spring:{bare:"Printemps",part:"du printemps",start:"Du printemps",end:"au printemps"},
  summer:{bare:"Été",part:"de l’été",start:"De l’été",end:"à l’été"},
  autumn:{bare:"Automne",part:"de l’automne",start:"De l’automne",end:"à l’automne"},
  winter:{bare:"Hiver",part:"de l’hiver",start:"De l’hiver",end:"à l’hiver"}
};
const MERP_SEASON_PHASES = {
  early:{single:"Début",start:"Du début",end:"au début"},
  mid:{single:"Milieu",start:"Du milieu",end:"au milieu"},
  late:{single:"Fin",start:"De la fin",end:"à la fin"}
};

export function localizeMerpHerbSeasonLabel(value, language) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const direct = HERB_SEASONS[language]?.get(raw);
  if (direct) return direct;
  const rain = raw.match(/^(\d+)(?:\s*[-–—]\s*(\d+))?\s+(days?|weeks?|months?)\s+after\s+(?:the\s+)?(?:rain|rainfall)$/i);
  const moon = raw.match(/^(near|around|at|during|before|after)\s+(?:the\s+)?(full|new|half|first quarter|last quarter)\s+moon(?:\s*\(\s*(\d+)\s+days?\s*\))?$/i);
  if (language === "fr" && rain) {
    const unit = rain[3].toLowerCase().replace(/s$/, "");
    const n = Number(rain[1]);
    const plural = !!rain[2] || n !== 1;
    const units = {day: plural ? "jours" : "jour",week: plural ? "semaines" : "semaine",month:"mois"};
    return `${rain[1]}${rain[2] ? " à " + rain[2] : ""} ${units[unit]} après la pluie`;
  }
  if (language === "fr" && moon) {
    const phases = {full:"la pleine lune",new:"la nouvelle lune",half:"la demi-lune",
      "first quarter":"le premier quartier lunaire","last quarter":"le dernier quartier lunaire"};
    const phase = phases[moon[2].toLowerCase()];
    const pos = moon[1].toLowerCase();
    const prefix = {near:"Aux environs de",around:"Aux environs de",at:"À",
      during:"Pendant",before:"Avant",after:"Après"}[pos];
    let label = `${prefix} ${phase}`;
    if (moon[3]) label += ` (${moon[3]} ${Number(moon[3])===1?"jour":"jours"})`;
    return label;
  }
  // Compound English windows: e.g. Autumn-early winter or late spring-mid-autumn.
  const matched = raw.match(/^(?:(early|mid|late)(?:-(early|mid|late))?[\s-]+)?(spring|summer|autumn|winter)(?:\s*[-–—]\s*(?:(early|mid|late)[\s-]+)?(spring|summer|autumn|winter))?$/i);
  if (!matched) return null;
  if (language === "en") return raw;
  if (language !== "fr") return null;
  const first = {phase:matched[1]?.toLowerCase(),phaseEnd:matched[2]?.toLowerCase(),season:matched[3].toLowerCase()};
  const second = matched[5] ? {phase:matched[4]?.toLowerCase(),season:matched[5].toLowerCase()} : null;
  const phrase = (part, place) => {
    const season = MERP_SEASON_FORMS[part.season];
    if (!part.phase) return season[place];
    return `${MERP_SEASON_PHASES[part.phase][place === "bare" ? "single" : place]} ${season.part}`;
  };
  if (!second) {
    if (first.phase && first.phaseEnd) {
      return `${MERP_SEASON_PHASES[first.phase].start} ${MERP_SEASON_PHASES[first.phaseEnd].end} ${MERP_SEASON_FORMS[first.season].part}`;
    }
    return phrase(first,"bare");
  }
  if (first.phaseEnd) return null;
  return `${phrase(first,"start")} ${phrase(second,"end")}`;
}

const HERB_DIFFICULTIES = {
  fr: new Map([
    ["Relax", "Sans difficulté"],
    ["Simple", "Simple"],
    ["Routine", "Routine"],
    ["Light", "Aisée"], ["Aisée", "Aisée"],
    ["Easy", "Facile"], ["Facile", "Facile"],
    ["Medium", "Moyenne"], ["Moyenne", "Moyenne"],
    ["Hard", "Difficile"], ["Difficile", "Difficile"],
    ["Very Hard", "Très Difficile"], ["Très Difficile", "Très Difficile"],
    ["Extremely Hard", "Extrêmement Difficile"], ["Extrêmement Difficile", "Extrêmement Difficile"],
    ["Sheer Folly", "Pure Folie"], ["Pure Folie", "Pure Folie"],
    ["Absurd", "Absurde"], ["Absurde", "Absurde"],
    ["Near Impossible", "Quasi Impossible"], ["Quasi Impossible", "Quasi Impossible"]
  ]),
  en: new Map([
    ["Sans difficulté", "Relax"], ["Relax", "Relax"],
    ["Simple", "Simple"],
    ["Routine", "Routine"],
    ["Aisée", "Light"], ["Light", "Light"],
    ["Facile", "Easy"], ["Easy", "Easy"],
    ["Moyenne", "Medium"], ["Medium", "Medium"],
    ["Difficile", "Hard"], ["Hard", "Hard"],
    ["Très Difficile", "Very Hard"], ["Very Hard", "Very Hard"],
    ["Extrêmement Difficile", "Extremely Hard"], ["Extremely Hard", "Extremely Hard"],
    ["Pure Folie", "Sheer Folly"], ["Sheer Folly", "Sheer Folly"],
    ["Absurde", "Absurd"], ["Absurd", "Absurd"],
    ["Quasi Impossible", "Near Impossible"], ["Near Impossible", "Near Impossible"]
  ])
};

const HERB_PREPARATIONS = {
  fr: new Map([
    ["Application", "Application"], ["apply", "Application"],
    ["Decoction", "Décoction"], ["Decoction", "Décoction"], ["brew", "Décoction"],
    ["Ingestion", "Ingestion"], ["ingest", "Ingestion"],
    ["Inhalation", "Inhalation"], ["inhale", "Inhalation"],
    ["Liquid", "Liquide"], ["Liquide", "Liquide"], ["liquid", "Liquide"],
    ["Paste", "Pâte"], ["Pâte", "Pâte"], ["paste", "Pâte"],
    ["Powder", "Poudre"], ["Poudre", "Poudre"], ["powder", "Poudre"],
    ["Injection", "Injection"], ["inject", "Injection"], ["injection", "Injection"],
    ["Wear", "Portée"], ["wear", "Portée"],
    ["Apply / Ingest", "Application / Ingestion"], ["apply/ingest", "Application / Ingestion"]
  ]),
  en: new Map([
    ["Application", "Application"], ["apply", "Application"],
    ["Décoction", "Decoction"], ["Decoction", "Decoction"], ["brew", "Decoction"],
    ["Ingestion", "Ingestion"], ["ingest", "Ingestion"],
    ["Inhalation", "Inhalation"], ["inhale", "Inhalation"],
    ["Liquide", "Liquid"], ["Liquid", "Liquid"], ["liquid", "Liquid"],
    ["Pâte", "Paste"], ["Paste", "Paste"], ["paste", "Paste"],
    ["Poudre", "Powder"], ["Powder", "Powder"], ["powder", "Powder"],
    ["Injection", "Injection"], ["inject", "Injection"], ["injection", "Injection"],
    ["Portée", "Wear"], ["Wear", "Wear"], ["wear", "Wear"],
    ["Application / Ingestion", "Apply / Ingest"], ["Apply / Ingest", "Apply / Ingest"], ["apply/ingest", "Apply / Ingest"]
  ])
};

const HERB_FORMS = {
  fr: new Map([
    ["Flower","Fleur"],["Leaf","Feuille"],["Leaves","Feuilles"],["Root","Racine"],["Root/Leaf","Racine / Feuille"],
    ["Berry","Baie"],["Berries","Baies"],["Moss","Mousse"],["Mushroom","Champignon"],["Fruit","Fruit"],
    ["Lichen","Lichen"],["Fungus","Champignon"],["Clove","Gousse"],["Nut","Noix"],["Nodule","Nodule"],
    ["Algae","Algue"],["Stem","Tige"],["Reed","Roseau"],["Stalk","Tige"],["Grass","Herbe"],["Nectar","Nectar"],
    ["Seeds","Graines"],["Seed","Graine"],["Resin","Résine"],["Petal","Pétale"],["Thorn","Épine"],["Flowers","Fleurs"],
    ["Bud","Bourgeon"],["Mixture","Mélange"],["Paste","Pâte"],["Liquid","Liquide"],["Bulb","Bulbe"],["Cone","Cône"],
    ["Juice","Jus"],["Herb","Herbe"],["Cactus","Cactus"],["Acorn","Gland"],["Spine","Épine"],["Blossom","Fleur"],
    ["Pollen","Pollen"],["Blood","Sang"],["Crystal","Cristal"],["Bark","Écorce"],["Toad","Crapaud"],["Bat","Chauve-souris"],
    ["Bats","Chauves-souris"],["Scorpion","Scorpion"],["Spider","Araignée"],["Clams","Palourdes"],["Gas","Gaz"],
    ["Varies","Variable"],["Bees","Abeilles"],["Drake","Dragonnet"],["Dragon","Dragon"],
    ["Fish","Poisson"],["Frog","Grenouille"],["Spore","Spore"],["Spores","Spores"],
    ["Shell","Coquille"],["Sap","Sève"],["Wood","Bois"]
  ]),
  en: new Map([
    ["Fleur","Flower"],["Feuille","Leaf"],["Feuilles","Leaves"],["Racine","Root"],["Racine / Feuille","Root/Leaf"],
    ["Baie","Berry"],["Baies","Berries"],["Mousse","Moss"],["Champignon","Mushroom"],["Fruit","Fruit"],
    ["Lichen","Lichen"],["Gousse","Clove"],["Noix","Nut"],["Nodule","Nodule"],["Algue","Algae"],["Tige","Stem"],
    ["Roseau","Reed"],["Herbe","Grass"],["Nectar","Nectar"],["Graines","Seeds"],["Graine","Seed"],["Résine","Resin"],
    ["Pétale","Petal"],["Épine","Thorn"],["Fleurs","Flowers"],["Bourgeon","Bud"],["Mélange","Mixture"],["Pâte","Paste"],
    ["Liquide","Liquid"],["Bulbe","Bulb"],["Cône","Cone"],["Jus","Juice"],["Cactus","Cactus"],["Gland","Acorn"],
    ["Pollen","Pollen"],["Sang","Blood"],["Cristal","Crystal"],["Écorce","Bark"],["Crapaud","Toad"],["Chauve-souris","Bat"],
    ["Chauves-souris","Bats"],["Scorpion","Scorpion"],["Araignée","Spider"],["Palourdes","Clams"],["Gaz","Gas"],
    ["Variable","Varies"],["Abeilles","Bees"],["Dragonnet","Drake"],["Dragon","Dragon"],
    ["Poisson","Fish"],["Grenouille","Frog"],["Spore","Spore"],["Spores","Spores"],
    ["Coquille","Shell"],["Sève","Sap"],["Bois","Wood"]
  ])
};

function merpUiHerbSheetDocument(app) {
  return app?.document ?? app?.item ?? app?.object ?? null;
}

function replaceHerbSheetExactText(root, translations) {
  if (!root || !translations?.size) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const raw = node.nodeValue ?? "";
    const trimmed = raw.trim();
    if (!trimmed || !translations.has(trimmed)) continue;
    const leading = raw.match(/^\s*/)?.[0] ?? "";
    const trailing = raw.match(/\s*$/)?.[0] ?? "";
    node.nodeValue = `${leading}${translations.get(trimmed)}${trailing}`;
  }
}

export function localizeHerbOption(option, map, { season = false, language = "fr" } = {}) {
  if (!option || !map) return;
  const raw = (option.textContent ?? "").trim();
  if (!raw) return;

  // Difficulty options carry their numeric modifier after the label.
  const difficulty = raw.match(/^(.*?)\s*(\([+-]?\d+\))$/);
  if (difficulty) {
    const label = difficulty[1].trim();
    const translated = map.get(label);
    if (translated) option.textContent = `${translated} ${difficulty[2]}`;
    return;
  }

  const byValue = map.get(String(option.value ?? "").trim());
  const byText = map.get(raw);
  const translated = byValue ?? byText ?? (season ? localizeMerpHerbSeasonLabel(option.value || raw, language) : null);
  if (translated) option.textContent = translated;
}

export function localizeMerpHerbSheet(app, html, getApplicationRoots) {
  const item = merpUiHerbSheetDocument(app);
  if (item?.documentName !== "Item" || item?.type !== "herb") return;

  const language = contentLanguage();
  const textMap = language === "en" ? HERB_SHEET_TEXT_EN : HERB_SHEET_TEXT_FR;
  const seasonMap = HERB_SEASONS[language];
  const difficultyMap = HERB_DIFFICULTIES[language];
  const prepMap = HERB_PREPARATIONS[language];
  const formMap = HERB_FORMS[language];

  for (const root of getApplicationRoots(app, html)) {
    replaceHerbSheetExactText(root, textMap);

    for (const select of root.querySelectorAll("select")) {
      const options = [...select.options];
      const text = options.map((option) => `${option.value} ${option.textContent}`).join(" | ");

      let map = null;
      if (/(Spring|Summer|Autumn|Winter|Printemps|Été|Automne|Hiver)/i.test(text)) map = seasonMap;
      else if (/(Sheer Folly|Pure Folie|Near Impossible|Quasi Impossible|Very Hard|Très Difficile)/i.test(text)) map = difficultyMap;
      else if (/(apply|brew|ingest|Application|Decoction|Décoction|Ingestion|Pâte|Powder)/i.test(text)) map = prepMap;
      else if (/(Leaf|Flower|Root|Mushroom|Feuille|Fleur|Racine|Champignon|Nectar|Bulb|Bulbe)/i.test(text)) map = formMap;

      if (!map) continue;
      for (const option of options) localizeHerbOption(option, map, { season: map === seasonMap, language });

      // Force the closed select to repaint its newly localized selected option.
      const value = select.value;
      select.value = value;
    }

    enhanceHerbBiomeHelp(root, item, language);
  }
}

