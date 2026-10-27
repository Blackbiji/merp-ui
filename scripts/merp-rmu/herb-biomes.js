/*
 * MERP-UI — Herb habitat code help.
 * Source: MERP Character Creation Using RMSS/RMFRP v2.5, p. 206.
 * Presentation only: never modifies item.system or its source codes.
 */
const CLIMATES = {
  a: ["Aride", "Arid"], c: ["Froid", "Cold"], e: ["Froid permanent", "Perpetually cold"],
  f: ["Glacial", "Severely cold"], h: ["Chaud et humide", "Hot and humid"],
  m: ["Tempéré doux", "Mild temperate"], s: ["Semi-aride", "Semi-arid"],
  t: ["Tempéré frais", "Cool temperate"]
};
const TERRAINS = {
  A: ["Haute montagne (étage alpin)", "Alpine"],
  B: ["Ravins et lits d’oueds", "Ravines and wadis"],
  C: ["Forêt de conifères", "Conifer forest"],
  D: ["Forêt de feuillus ou mixte", "Deciduous or mixed forest"],
  F: ["Berges et rivages d’eau douce", "Freshwater banks and shores"],
  G: ["Glacier ou champ de neige", "Glacier or snowfield"],
  H: ["Lande, broussailles et bruyères", "Heath, scrub and moor"],
  J: ["Jungle ou forêt pluviale", "Jungle or rainforest"],
  M: ["Montagne", "Mountain"],
  O: ["Littoral et rivages marins", "Sea coast and saltwater shore"],
  S: ["Prairie à herbes courtes", "Short-grass prairie"],
  T: ["Prairie à herbes hautes", "Tall-grass prairie"],
  U: ["Milieu souterrain", "Underground"],
  V: ["Milieu volcanique", "Volcanic"],
  W: ["Terres désolées", "Wasteland"],
  Z: ["Désert", "Desert"]
};
const DIFFICULTIES = {
  1: ["Routine", "Routine", "+30"],
  2: ["Facile", "Easy", "+20"],
  3: ["Aisée", "Light", "+10"],
  4: ["Moyenne", "Medium", "+0"],
  5: ["Difficile", "Hard", "−10"],
  6: ["Très difficile", "Very Hard", "−20"],
  7: ["Extrêmement difficile", "Extremely Hard", "−30"],
  8: ["Pure folie", "Sheer Folly", "−50"],
  9: ["Absurde", "Absurd", "−70"]
};
const REGIONS = {
  N: ["Nord d’Endor", "Northern Endor"],
  NW: ["Nord-Ouest d’Endor", "Northwestern Endor"],
  NE: ["Nord-Est d’Endor", "Northeastern Endor"],
  S: ["Sud d’Endor", "Southern Endor"],
  SW: ["Sud-Ouest d’Endor", "Southwestern Endor"],
  SE: ["Sud-Est d’Endor", "Southeastern Endor"],
  E: ["Est d’Endor", "Eastern Endor"],
  W: ["Ouest d’Endor", "Western Endor"],
  M: ["Centre d’Endor", "Central Endor"],
  U: ["Ensemble d’Endor", "Throughout Endor"]
};
const TRANSLATION = {
  fr: {
    help: "Codes de localisation des herbes — MERP",
    code: "Code de l’ouvrage", climate: "Climat", terrain: "Terrain / biome",
    difficulty: "Difficulté de découverte", region: "Région", missing: "Non précisé",
    legend: "Afficher la légende complète", explanation: "Codes de localisation des herbes — MERP",
    source: "Référence : MERP Character Creation Using RMSS/RMFRP v2.5, p. 206.",
    caution: "Ces codes proviennent de la table des herbes du document de Whittford. Ils décrivent la source sans modifier les données de la fiche.",
    sections: ["Climats", "Terrains", "Difficultés", "Régions"]
  },
  en: {
    help: "MERP herb location codes",
    code: "Source code", climate: "Climate", terrain: "Terrain / biome",
    difficulty: "Finding difficulty", region: "Region", missing: "Not specified",
    legend: "Show full code legend", explanation: "MERP herb location codes",
    source: "Source: MERP Character Creation Using RMSS/RMFRP v2.5, p. 206.",
    caution: "These codes come from the herb tables in Whittford’s document. They describe the source without changing the item’s data.",
    sections: ["Climates", "Terrain", "Difficulties", "Regions"]
  }
};

function word(table, key, lang) {
  const pair = table[String(key ?? "")];
  return pair ? pair[lang === "en" ? 1 : 0] : null;
}

export function decodeHerbHabitat(item, lang = "fr") {
  const f = item?.flags?.["merp-ui"] ?? item?.document?.flags?.["merp-ui"] ?? {};
  const system = item?.system ?? item?.document?.system ?? {};
  const raw = String(f.sourceCode ?? "").trim();
  // Some historical entries omit the region; other exceptional entries
  // contain a proper-name location instead of the four-part code.
  const parsed = raw.match(/^([a-z])-([A-Z])-([1-9])(?:-([A-Z]{1,2}))?$/);
  const climate = f.climateCode ?? parsed?.[1] ?? "";
  const terrain = f.localeCode ?? parsed?.[2] ?? system.biome ?? "";
  const difficulty = parsed?.[3] ?? "";
  const region = f.regionCode ?? parsed?.[4] ?? "";
  const index = lang === "en" ? 1 : 0;
  const d = DIFFICULTIES[difficulty];
  return {
    sourceCode: raw,
    climateCode: climate,
    terrainCode: terrain,
    difficultyCode: difficulty,
    regionCode: region,
    climate: word(CLIMATES, climate, lang),
    terrain: word(TERRAINS, terrain, lang),
    difficulty: d ? d[index] + " (" + d[2] + ")" : null,
    region: word(REGIONS, region, lang)
  };
}

function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = String(text);
  return element;
}
function row(label, value) {
  const dt = make("dt", "", label);
  const dd = make("dd", "", value);
  return [dt, dd];
}
function legendSection(title, data, lang, difficulty = false) {
  const section = make("section", "merp-ui-herb-biome-legend-section");
  section.append(make("h4", "", title));
  const dl = make("dl", "merp-ui-herb-biome-code-list");
  Object.entries(data).forEach(([code, values]) => {
    const label = values[lang === "en" ? 1 : 0];
    const text = difficulty ? label + " (" + values[2] + ")" : label;
    dl.append(...row(code, text));
  });
  section.append(dl);
  return section;
}
function buildExplanation(habitat, lang) {
  const tr = TRANSLATION[lang];
  const wrapper = make("div", "merp-ui-herb-biome-explanation");
  wrapper.append(make("h3", "", tr.explanation));
  if (habitat.sourceCode) {
    const code = make("p", "merp-ui-herb-biome-source-code");
    code.append(make("span", "", tr.code + " : "));
    code.append(make("code", "", habitat.sourceCode));
    wrapper.append(code);
  }
  const dl = make("dl", "merp-ui-herb-biome-detail");
  const entries = [
    [tr.climate, habitat.climateCode, habitat.climate],
    [tr.terrain, habitat.terrainCode, habitat.terrain],
    [tr.difficulty, habitat.difficultyCode, habitat.difficulty],
    [tr.region, habitat.regionCode, habitat.region]
  ];
  entries.forEach(([label, code, value]) => {
    const display = code && value ? code + " — " + value : value || tr.missing;
    dl.append(...row(label, display));
  });
  wrapper.append(dl);
  const full = make("details", "merp-ui-herb-biome-legend");
  full.append(make("summary", "", tr.legend));
  const all = make("div", "merp-ui-herb-biome-legend-grid");
  all.append(
    legendSection(tr.sections[0], CLIMATES, lang),
    legendSection(tr.sections[1], TERRAINS, lang),
    legendSection(tr.sections[2], DIFFICULTIES, lang, true),
    legendSection(tr.sections[3], REGIONS, lang)
  );
  full.append(all);
  wrapper.append(full, make("p", "merp-ui-herb-biome-footnote", tr.caution),
    make("p", "merp-ui-herb-biome-source", tr.source));
  return wrapper;
}
function findBiomeLabel(root) {
  // Prefer an explicit label for system.biome if available.
  const field = root.querySelector('[name="system.biome"], [name$=".biome"]');
  const group = field?.closest(".form-group, .form-field, .form-row");
  let label = group?.querySelector("label, .form-label");
  if (label) return label;
  const labels = root.querySelectorAll("label, .form-label, dt, th");
  return [...labels].find(node => /^\s*(?:biome(?:\(s\)|s)?|biôme(?:\(s\)|s)?)\s*:?\s*$/i.test(node.textContent ?? "")) ?? null;
}

/** Show an accessible information control beside "Biome(s)" on an RMU herb sheet. */
export function enhanceHerbBiomeHelp(root, item, lang = "fr") {
  if (!root?.querySelector || item?.type !== "herb") return false;
  const label = findBiomeLabel(root);
  if (!label) return false;
  if (root.querySelector(".merp-ui-herb-biome-help")) return true;
  const language = lang === "en" ? "en" : "fr";
  const tr = TRANSLATION[language];
  const habitat = decodeHerbHabitat(item, language);
  const control = make("button", "merp-ui-herb-biome-help", "ⓘ");
  control.type = "button";
  control.title = [
    tr.help,
    tr.climate + ": " + (habitat.climate ?? tr.missing),
    tr.terrain + ": " + (habitat.terrain ?? tr.missing),
    tr.difficulty + ": " + (habitat.difficulty ?? tr.missing),
    tr.region + ": " + (habitat.region ?? tr.missing)
  ].join("\n");
  control.setAttribute("aria-label", tr.help);
  control.setAttribute("aria-expanded", "false");
  label.append(" ", control);

  const panel = make("div", "merp-ui-herb-biome-panel");
  panel.hidden = true;
  panel.append(buildExplanation(habitat, language));
  // Sibling after the labelled group: no overlay clipping or text obstruction.
  const target = label.closest(".form-group, .form-field, .form-row") ?? label;
  target.insertAdjacentElement("afterend", panel);
  control.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    panel.hidden = !panel.hidden;
    control.setAttribute("aria-expanded", String(!panel.hidden));
  });
  return true;
}
