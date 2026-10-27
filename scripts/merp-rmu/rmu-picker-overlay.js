/**
 * MERP-UI RC5 — habillage et localisation NON INTRUSIFS des sélecteurs RMU V14.
 * Ne modifie jamais game.i18n, les data-*, les valeurs des options, la sélection,
 * les listeners RMU, les acteurs ou les compendiums.
 */
import { loadSharedSkillRegistry, loadSharedSkillCategoryRegistry } from "../skill-registry.js";
import { contentLanguage } from "./localization.js";
import {
  actorMerpCultureKey, compatibleProfessionRows
} from "./profession-compatibility.js";

const TARGET_CLASSES = [
  "rmu-pick-list-dialog", "rmu-pick-race-dialog", "rmu-pick-culture-dialog",
  "rmu-pick-profession-dialog", "rmu-culture-skill-dialog", "rmu-add-untrained-skill-dialog"
];
const TITLES = [
  ["rmu-pick-race-dialog", "Choisir une race"],
  ["rmu-pick-culture-dialog", "Choisir une culture"],
  ["rmu-pick-profession-dialog", "Choisir une profession"],
  ["rmu-culture-skill-dialog", "Choisir une compétence culturelle"],
  ["rmu-add-untrained-skill-dialog", "Ajouter une compétence"]
];
const INSTRUCTIONS = new Map([
  ["rmu-pick-race-dialog", "Choisissez la race du personnage. Elle remplacera la race actuelle."],
  ["rmu-pick-culture-dialog", "Choisissez la culture du personnage. Elle remplacera la culture actuelle."],
  ["rmu-pick-profession-dialog", "Choisissez la profession du personnage. Elle remplacera la profession actuelle."]
]);
const FILTERS = Object.freeze({
  "": "Toutes", coreLaw: "Core Law", shadowWorld: "Shadow World",
  characterCompanion: "Character Companion", custom: "MERP", other: "MERP"
});
const TITLES_EN = new Map([
  ["rmu-pick-race-dialog", "Choose a race"],
  ["rmu-pick-culture-dialog", "Choose a culture"],
  ["rmu-pick-profession-dialog", "Choose a profession"],
  ["rmu-culture-skill-dialog", "Choose a cultural skill"],
  ["rmu-add-untrained-skill-dialog", "Add a skill"]
]);
const INSTRUCTIONS_EN = new Map([
  ["rmu-pick-race-dialog", "Choose the character's race. It will replace their current race."],
  ["rmu-pick-culture-dialog", "Choose the character's culture. It will replace their current culture."],
  ["rmu-pick-profession-dialog", "Choose the character's profession. It will replace their current profession."]
]);
const FILTERS_EN = Object.freeze({
  "": "All", coreLaw: "Core Law", shadowWorld: "Shadow World",
  characterCompanion: "Character Companion", custom: "MERP", other: "MERP"
});
const CHROME = new Map([
  ["Choose", "Choisir"], ["Cancel", "Annuler"], ["Add", "Ajouter"],
  ["Confirm", "Confirmer"], ["Select", "Sélectionner"],
  ["Skill", "Compétence"], ["Skill Category", "Catégorie de compétences"],
  ["Specialization", "Spécialisation"], ["Specialisation", "Spécialisation"],
  ["Language", "Langue"], ["Languages", "Langues"],
  ["All", "Toutes"], ["Custom", "MERP"],
  ["Stat Bonuses", "Bonus de caractéristiques"], ["Talents", "Talents"],
  ["Professional Skills", "Compétences professionnelles"],
  ["All skills added", "Toutes les compétences sont déjà ajoutées"]
]);
const observers = new WeakMap();
// Per-application guard: after the initial MERP switch, the player may freely
// choose any other native RMU filter without the overlay forcing MERP again.
const initialRaceFilterApplied = new WeakSet();
const initialCultureFilterApplied = new WeakSet();
let dictionaryPromise;

function normalize(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("fr");
}
function add(map, source, translation) {
  const key = normalize(source);
  if (key && translation && normalize(translation) !== key) map.set(key, String(translation).trim());
}
function isFrench() {
  // Match the selected MERP-RMU editorial language, even when Foundry's UI
  // language differs. Using OR here left translated picker chrome stuck in FR.
  return contentLanguage() === "fr";
}
async function dictionary() {
  if (!dictionaryPromise) dictionaryPromise = (async () => {
    const [skills, categories] = await Promise.all([
      loadSharedSkillRegistry({locale: "fr"}), loadSharedSkillCategoryRegistry({locale: "fr"})
    ]);
    const names = new Map();
    const cats = new Map();
    const specs = new Map();
    // Existing, reviewed MERP-UI translations are authoritative.
    for (const item of skills.bySkillId.values()) {
      for (const key of [item.canonicalName, ...(item.aliases ?? [])]) add(names, key, item.name);
    }
    for (const item of categories.byCategoryId.values()) {
      for (const key of [item.canonicalName, ...(item.aliases ?? [])]) add(cats, key, item.name);
    }
    // Historical MERP-UI glossary aliases for skills otherwise untranslated.
    add(names, "Accounting", "Comptabilité");
    add(names, "Quarterstaff", "Bâton");
    // Fill missing translations from the official RMU French language resource,
    // without changing Foundry's active UI language or mutating RMU itself.
    try {
      const path = foundry?.utils?.getRoute?.("systems/rmu/lang/fr.json") ?? "systems/rmu/lang/fr.json";
      const response = await fetch(path);
      if (response.ok) {
        const json = await response.json();
        for (const [raw, translated] of Object.entries(json?.RMU?.Skills ?? {})) {
          if (!names.has(normalize(raw))) add(names, raw, translated);
        }
        for (const [raw, translated] of Object.entries(json?.RMU?.SkillCategory ?? {})) {
          if (!cats.has(normalize(raw))) add(cats, raw, translated);
        }
        for (const [raw, translated] of Object.entries(json?.RMU?.Specializations ?? {})) {
          add(specs, raw, translated);
        }
      }
    } catch (error) {
      console.debug("merp-ui | Ressource des libellés FR RMU indisponible", error);
    }
    return {names, cats, specs};
  })().catch(error => {dictionaryPromise = null; throw error;});
  return dictionaryPromise;
}
function getRoot(app, html) {
  const candidates = [app?.element, html?.[0], html];
  for (const el of candidates) {
    if (!(el instanceof HTMLElement)) continue;
    const root = el.closest(".application, .window-app") ?? el;
    if (TARGET_CLASSES.some(cls => root.classList.contains(cls)) ||
        TARGET_CLASSES.some(cls => el.classList.contains(cls))) return root;
  }
  return null;
}
function appType(root) {
  return TITLES.find(([className]) => root.classList.contains(className))?.[0] ?? null;
}
function replacePlainText(element, value) {
  if (element && element.textContent?.trim() !== value) element.textContent = value;
}
function translated(value, map) {
  const s = String(value ?? "");
  const lead = s.match(/^\s*/)?.[0] ?? "";
  const tail = s.match(/\s*$/)?.[0] ?? "";
  let base = s.trim().replace(/^RMU\.(?:Skills|SkillCategory|Specializations)\./i, "");
  const exact = map.get(normalize(base));
  if (exact) return lead + exact + tail;
  // Legacy bilingual labels, only strip English when the exact French label
  // matches an entry from the same trusted dictionary.
  const bilingual = base.match(/^(.*?)\s+\(([^()]+)\)$/);
  if (bilingual && map.get(normalize(bilingual[2])) === bilingual[1]) {
    return lead + bilingual[1] + tail;
  }
  return s;
}
function translateNode(node, table) {
  if (!node) return;
  const text = node.textContent;
  const after = translated(text, table);
  if (after !== text) node.textContent = after;
}
function localizeControls(root, dict) {
  for (const select of root.querySelectorAll("select")) {
    const field = select.name;
    const table = field === "category" ? dict.cats : field === "skill" ? dict.names : dict.specs;
    // Text only: never reorder, remove or reparent <option> nodes; RMU uses indices.
    for (const opt of select.options) translateNode(opt, table);
  }
  for (const opt of root.querySelectorAll(".rmu-combobox-option")) translateNode(opt, dict.specs);
  for (const field of root.querySelectorAll(".rmu-row-add-skill .rmu-label, .rmu-row-culture-skill .rmu-label")) {
    const t = field.textContent?.trim().replace(/:$/, "");
    const translatedLabel = CHROME.get(t) ?? (t === "Skill category" ? "Catégorie de compétences" : null);
    if (translatedLabel) replacePlainText(field, translatedLabel + ":");
  }
  for (const label of root.querySelectorAll(".rmu-row-add-skill span, .rmu-row-culture-skill span")) {
    translateNode(label, dict.cats);
    translateNode(label, dict.names);
  }
  for (const node of root.querySelectorAll(".rmu-pick-profession__skills")) {
    const heading = node.querySelector("b");
    if (heading) replacePlainText(heading, "Compétences professionnelles");
    for (const textNode of node.childNodes) {
      if (textNode.nodeType !== Node.TEXT_NODE) continue;
      const old = textNode.nodeValue;
      const value = old.split(/(,\s*)/).map(piece => translated(piece, dict.names)).join("");
      if (value !== old) textNode.nodeValue = value;
    }
  }
}
async function decorate(app, html) {
  const root = getRoot(app, html);
  if (!root) return;
  root.classList.add("merp-ui-rmu-picker");
  const type = appType(root);
  const fr = isFrench();
  // Décoration strictement visuelle, sur la liste native déjà rendue.
  // Les titres ne sont pas sélectionnables, les lignes restent intactes.
  decorateMerpRaceGroups(root);
  decorateMerpCultureGroups(root);
  // The source key itself is always the original RMU `custom`.
  const custom = root.querySelector('.rmu-pick-filter__chip[data-filter="custom"] span:first-child');
  if (custom) replacePlainText(custom, "MERP");
  const named = TITLES.find(([key]) => key === type);
  const title = fr ? named?.[1] : TITLES_EN.get(type);
  if (title) replacePlainText(root.querySelector(".window-title"), title);
  const note = root.querySelector(".rmu-settings-toolbar-note");
  const instruction = fr ? INSTRUCTIONS.get(type) : INSTRUCTIONS_EN.get(type);
  if (note && instruction) replacePlainText(note, instruction);
  for (const chip of root.querySelectorAll(".rmu-pick-filter__chip[data-filter]")) {
    const label = (fr ? FILTERS : FILTERS_EN)[chip.dataset.filter];
    if (label) replacePlainText(chip.querySelector("span:first-child"), label);
  }
  for (const button of root.querySelectorAll("button[data-action='apply'], button[data-action='cancel'], button.rmu-dlg-button-ok, button.rmu-dlg-button-cancel")) {
    const label = button.matches("[data-action='cancel'], .rmu-dlg-button-cancel")
      ? (fr ? "Annuler" : "Cancel")
      : root.classList.contains("rmu-pick-list-dialog")
        ? (fr ? "Choisir" : "Choose") : (fr ? "Ajouter" : "Add");
    const textSpan = button.querySelector("span") ?? null;
    if (textSpan) replacePlainText(textSpan, label);
    else {
      // Preserve RMU icons and click listeners; never replace the button.
      for (const n of button.childNodes) if (n.nodeType === Node.TEXT_NODE && n.nodeValue.trim()) n.nodeValue = " " + label;
    }
  }
  for (const heading of root.querySelectorAll(".rmu-pick-race__section > b")) {
    const source = heading.textContent.trim();
    const label = fr ? CHROME.get(source) : ({"Races communes":"Common races", "Races restreintes":"Restricted races"}[source]);
    if (label) replacePlainText(heading, label);
  }
  if (!fr) return;
  const dict = await dictionary();
  // A modal might have closed while dictionaries were loading.
  if (!root.isConnected) return;
  localizeControls(root, dict);
}
function register(app, html) {
  const root = getRoot(app, html);
  if (!root) return;
  // During the first opening of the RACE picker only, activate MERP through
  // RMU's own `data-action="filter"` control. Do not touch private state, the
  // selected UUID, the list entries, or the filter behavior of other pickers.
  // A WeakSet keyed by the dialog instance prevents repeat activation on
  // renders after the user has explicitly switched back to Core Law / All.
  if (root.classList.contains("rmu-pick-race-dialog") && !initialRaceFilterApplied.has(app)) {
    const merpChip = root.querySelector('.rmu-pick-filter__chip[data-filter="other"]');
    if (merpChip) {
      initialRaceFilterApplied.add(app);
      requestAnimationFrame(() => {
        if (!root.isConnected) return;
        const chip = root.querySelector('.rmu-pick-filter__chip[data-filter="other"]');
        if (chip && !chip.classList.contains("rmu-pick-filter__chip--active")) chip.click();
      });
    }
  }
  // The culture picker starts on MERP when the actor has a known MERP race.
  // We click the native RMU chip only ONCE per dialog instance; players retain
  // control of the tab thereafter. No selection or private dialog state is set.
  if (root.classList.contains("rmu-pick-culture-dialog") &&
      app._contextData?.merpUiCultureRace && !initialCultureFilterApplied.has(app)) {
    const merpChip = root.querySelector('.rmu-pick-filter__chip[data-filter="custom"]');
    if (merpChip) {
      initialCultureFilterApplied.add(app);
      requestAnimationFrame(() => {
        if (!root.isConnected) return;
        const chip = root.querySelector('.rmu-pick-filter__chip[data-filter="custom"]');
        if (chip && !chip.classList.contains("rmu-pick-filter__chip--active")) chip.click();
      });
    }
  }
  const apply = () => decorate(app, root).catch(error => console.warn("merp-ui | Localisation des fenêtres RMU", error));
  apply();
  if (observers.has(root)) return;
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {scheduled = false; if (root.isConnected) apply();});
  });
  observer.observe(root, {subtree: true, childList: true});
  observers.set(root, observer);
}
Hooks.on("renderApplicationV2", register);
Hooks.on("renderApplication", register);


/**
 * Garde-fou d'affichage pour le sélecteur natif de races RMU 1.4.80.
 *
 * RMU collecte à la fois les races de compendiums et les Items de la Sidebar :
 * une copie d'une race MERP apparaît donc plusieurs fois sous le même nom.
 * Nous dédoublonnons uniquement les lignes de CE sélecteur avant son premier
 * rendu, sans modifier les documents, UUID, actions ni Compendiums RMU.
 *
 * L'ordre de priorité est : Compendium MERP-UI, Compendium système RMU,
 * autre Compendium, et enfin copie de la Sidebar.
 */
function raceKey(name) {
  const key = String(name ?? "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/[\u2010-\u2015]/g, "-")
    .toLocaleLowerCase("fr")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ").trim();
  // Equivalences de libellé strictes, uniquement pour les races explicitement
  // présentes à la fois en RMU classique et en MERP-UI.
  const equivalences = {
    "half elf": "race:peredhil", "half elves": "race:peredhil",
    "demi elfe": "race:peredhil", "demi elfes": "race:peredhil",
    "demi elfes (peredhil)": "race:peredhil",
    "half orc": "race:perorch", "half orcs": "race:perorch",
    "demi orc": "race:perorch", "demi orcs": "race:perorch",
    "demi orcs (perorch / piryrch)": "race:perorch",
    "half troll": "race:pertorog", "half trolls": "race:pertorog",
    "demi troll": "race:pertorog", "demi trolls": "race:pertorog",
    "demi trolls (pertorog / pirtereg)": "race:pertorog"
  };
  return equivalences[key] ?? key;
}

/**
 * Sections du filtre MERP : simple regroupement des 12 races du Compendium.
 * Les groupes reflètent les flags `restricted` des documents RC5 ; ils ne
 * modifient aucune restriction, sélection ni donnée de personnage.
 */
const MERP_COMMON_RACE_NAMES = [
  "Dúnedain", "Elfes (Quendi)", "Hobbits (Periannath)",
  "Humains (Hildor)", "Khazâd (Naugrim)"
];
const MERP_RESTRICTED_RACE_NAMES = [
  "Demi-Elfes (Peredhil)", "Demi-Orcs (Perorch / Piryrch)",
  "Demi-Trolls (Pertorog / Pirtereg)", "Orcs (Yrch)",
  "Petits-Nains (Noegyth Nibin)", "Trolls (Tereg)", "Umli (Demi-Nains)"
];
const merpCommonRaceKeys = new Set(MERP_COMMON_RACE_NAMES.map(raceKey));
const merpRestrictedRaceKeys = new Set(MERP_RESTRICTED_RACE_NAMES.map(raceKey));
// CLEAN-40b — Identifiants pérennes du manifeste des races MERP-UI.
// Le libellé affiché peut changer de langue (Half-elves / Demi-Elfes,
// Hobbits (Kuduk) / Hobbits (Periannath), etc.) : ne pas fonder le
// regroupement visuel uniquement sur le nom traduit.
const merpRaceGroupsByDocumentId = new Map([
  ["vzZNfW8qL1xZo2vf", "common"], // race-dunedain
  ["zZMHi3lxYnhJg3ll", "common"], // race-elves
  ["LzwoGqATeDSpI80v", "restricted"], // race-half-elves
  ["0u6pxpphsyqHTuiY", "restricted"], // race-half-orcs
  ["7kmi0Bqm8es8s3qg", "restricted"], // race-half-trolls
  ["uUOsdOkYGsokrrct", "common"], // race-hobbits
  ["WRq9ldgFiYPvVoyV", "common"], // race-humans
  ["x2xpUwYnd5COJSIm", "common"], // race-khazad
  ["g485mtWSGtGiGoVW", "restricted"], // race-orcs
  ["c6G0B1T8jDTiC18T", "restricted"], // race-petty-dwarves
  ["VpKSYVGqNTxXjZWS", "restricted"], // race-trolls
  ["1E9fwMzQBK8Qkp3P", "restricted"], // race-umli
]);
const merpRaceGroupsByUuid = new Map();
function merpRaceGroup(row) {
  const uuid = String(row?.uuid ?? "");
  if (!/^Compendium\.merp-ui\.merp-rmu-races\./i.test(uuid)) return null;
  const documentId = uuid.split(".").at(-1);
  const groupById = merpRaceGroupsByDocumentId.get(documentId);
  if (groupById) return groupById;
  // Fallback pour les anciens UUID ou les compendiums reconstruits.
  const key = raceKey(row.name);
  if (merpCommonRaceKeys.has(key)) return "common";
  if (merpRestrictedRaceKeys.has(key)) return "restricted";
  return null;
}
/**
 * Déplace UNIQUEMENT les races MERP entre leurs propres emplacements dans la
 * liste RMU. Son tableau et son ordre restent ceux de RMU pour la navigation
 * clavier : aucune option fictive, aucun remplacement d'UUID.
 */
function groupMerpRaceRows(rows) {
  const grouped = rows.filter(row => merpRaceGroup(row));
  if (grouped.length < 2) return rows;
  const ordered = [
    ...grouped.filter(row => merpRaceGroup(row) === "common"),
    ...grouped.filter(row => merpRaceGroup(row) === "restricted")
  ];
  let index = 0;
  return rows.map(row => merpRaceGroup(row) ? ordered[index++] : row);
}
/**
 * Ajoute deux titres NON cliquables dans la liste déjà rendue. Aucun élément
 * de race n'est déplacé et aucun handler de sélection RMU n'est intercepté.
 * Un observer peut relancer cette méthode : elle est entièrement idempotente.
 */
function decorateMerpRaceGroups(root) {
  if (!root?.classList?.contains("rmu-pick-race-dialog")) return;
  const list = root.querySelector(".rmu-spec-skill-list");
  if (!list) return;
  const activeMerp = !!root.querySelector(
    '.rmu-pick-filter__chip[data-filter="other"].rmu-pick-filter__chip--active'
  );
  const headings = list.querySelectorAll(":scope > .merp-ui-race-section-heading");
  if (!activeMerp) {
    for (const heading of headings) heading.remove();
    return;
  }
  const labels = isFrench() ? {
    common: "Races communes", restricted: "Races restreintes"
  } : {
    common: "Common races", restricted: "Restricted races"
  };
  const seen = new Set();
  for (const item of list.querySelectorAll(":scope > .rmu-spec-skill-item[data-uuid]")) {
    const group = merpRaceGroupsByUuid.get(item.dataset.uuid);
    if (!group || seen.has(group)) continue;
    seen.add(group);
    const prior = item.previousElementSibling;
    if (prior?.classList.contains("merp-ui-race-section-heading") && prior.dataset.group === group) {
      if (prior.textContent !== labels[group]) prior.textContent = labels[group];
      continue;
    }
    const heading = document.createElement("div");
    heading.className = "merp-ui-race-section-heading";
    heading.dataset.group = group;
    heading.textContent = labels[group];
    heading.setAttribute("role", "heading");
    heading.setAttribute("aria-level", "3");
    item.before(heading);
  }
  // Nettoyage défensif : les titres ne doivent pas persister après un filtrage
  // ou un rendu différent de RMU.
  for (const heading of list.querySelectorAll(":scope > .merp-ui-race-section-heading")) {
    if (!seen.has(heading.dataset.group)) heading.remove();
  }
}

function raceSourcePriority(row) {
  const uuid = String(row?.uuid ?? "");
  if (/^Compendium\.merp-ui\.merp-rmu-races\./i.test(uuid)) return 400;
  if (/^Compendium\.rmu\./i.test(uuid)) return 300;
  if (/^Compendium\./i.test(uuid)) return 200;
  if (/^Item\./i.test(uuid)) return 100;
  return 0;
}
function withoutDuplicateRaces(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return rows;
  const winners = new Map();
  for (const row of rows) {
    const key = raceKey(row?.name);
    if (!key) continue;
    const incumbent = winners.get(key);
    if (!incumbent || raceSourcePriority(row) > raceSourcePriority(incumbent)) {
      winners.set(key, row);
    }
  }
  // Le tri, les UUID et les autres champs sont intacts pour toutes les lignes
  // conservées. Les compteurs RMU sont recalculés depuis cette liste filtrée.
  const visible = rows.filter(row => winners.get(raceKey(row?.name)) === row);
  return {visible, winners};
}
async function installRacePickerDeduplication() {
  try {
    const path = foundry.utils.getRoute("systems/rmu/module/apps/creation/pick-race-dialog-v2.js");
    const {default: RacePicker} = await import(path);
    const proto = RacePicker?.prototype;
    const original = proto?._loadRows;
    if (typeof original !== "function" || original.__merpUiDedupRaces) return;
    const patched = async function (...args) {
      const rows = await original.apply(this, args);
      const dedup = withoutDuplicateRaces(rows);
      if (!dedup?.visible) return rows;
      const selectedUuid = this._contextData?.selectedUuid;
      if (selectedUuid && !dedup.visible.some(row => row.uuid === selectedUuid)) {
        const originalSelected = rows.find(row => row.uuid === selectedUuid);
        const replacement = originalSelected && dedup.winners.get(raceKey(originalSelected.name));
        if (replacement) this._contextData.selectedUuid = replacement.uuid;
      }
      const grouped = groupMerpRaceRows(dedup.visible);
      for (const row of grouped) {
        const group = merpRaceGroup(row);
        if (group) merpRaceGroupsByUuid.set(row.uuid, group);
      }
      return grouped;
    };
    patched.__merpUiDedupRaces = true;
    proto._loadRows = patched;
  } catch (error) {
    // Sécurité : si une version ultérieure de RMU change son API, son
    // sélecteur reste fonctionnel, simplement sans dédoublonnage.
    console.warn("merp-ui | Déduplication des races non activée", error);
  }
}
if (game?.ready) void installRacePickerDeduplication();
else Hooks.once("ready", installRacePickerDeduplication);


/**
 * Culture picker — strict race compatibility, without changing Foundry Items.
 * The 60 canonical culture IDs below were read from RC5's Compendium
 * sync manifest and raceCanonicalKey flags. A Source/Sidebar clone never
 * becomes eligible by masquerading under the same visible name.
 *
 * Half-Elves deliberately have no separate culture: all Human, Dúnedain and
 * Elven cultures are offered. There is no arbitrary override for other races.
 * When a race comes from RMU and cannot be mapped to MERP's canonical races,
 * RMU's native culture picker remains unmodified (safe fallback).
 */
const MERP_CULTURE_RACE_BY_DOCUMENT_ID = Object.freeze({
  "0B0FbZdZugbtCmQY": "race-humans",
  "0teQd5tG7D5c1r3Q": "race-humans",
  "12Q130weGoIxuSTg": "race-khazad",
  "4kBEFh8jxaYv36Vr": "race-humans",
  "5GeTYDzVFVd7HPQY": "race-half-trolls",
  "5ShJBFUu0gbp2KIc": "race-humans",
  "7EBXop4mW56cn6gx": "race-trolls",
  "7GWMOY0MnGX62wzk": "race-humans",
  "9XRMiJVRJEQO4YDG": "race-humans",
  "ADjanIPgXY3A3OrO": "race-khazad",
  "AT4kBQOLpcx4lgqN": "race-humans",
  "G1x81j3LmKIMekuO": "race-humans",
  "AwLyAhIAPABR53qo": "race-humans",
  "C05Rpqj0ycBQFQ2v": "race-khazad",
  "CSQlOUsoMJHSa9oT": "race-hobbits",
  "G2kPQqTepHDWR9uI": "race-umli",
  "GjKcXowjzUje2HHK": "race-khazad",
  "I7ICKuHoXXSjpl3y": "race-hobbits",
  "JTLVogvuUN1UAtom": "race-humans",
  "KIvTmHdmfAH9JSSF": "race-hobbits",
  "Kt85I3gXBOQdOT1j": "race-elves",
  "LgCghCVn2OjpcOaq": "race-elves",
  "OwIZDDkDkHYvap8Y": "race-humans",
  "PZtshvv99J9f2MJM": "race-humans",
  "QCe0JdmwKGQdiijd": "race-humans",
  "QDewryFiqou5mnkb": "race-humans",
  "QGzg19pTQRmGBNjy": "race-dunedain",
  "RUJWnXU0In9XkAlv": "race-trolls",
  "Rd4o48gIj3veiQk5": "race-elves",
  "RfZKgvwPbxgFrsax": "race-humans",
  "SZTaJvIZtpQZEEuQ": "race-elves",
  "ScA1z5czmv401VHf": "race-elves",
  "Tb14kQ6LvKBbNEFp": "race-trolls",
  "TuLpKNh20AwM2ceU": "race-trolls",
  "TubVoNyFLatTbbfG": "race-humans",
  "TvDpFsDzMHHbFHaP": "race-orcs",
  "U684UB0iD2BG4i2L": "race-elves",
  "VR5WGK6joWFEhsGE": "race-humans",
  "WisNTTuhWo75IuxL": "race-elves",
  "XU5DuXd2u5u7ozDi": "race-humans",
  "YA51DKFdAm1io0NV": "race-khazad",
  "YyG1vwGj8l9mC09N": "race-elves",
  "Zy0kOZoUGopGoZ78": "race-humans",
  "aKlO3tplKXOnkTvk": "race-dunedain",
  "aazoaONTqXxqYxcP": "race-elves",
  "c3MJoRFe7M6Iutpk": "race-humans",
  "cCAyAIOjDkJTa2aD": "race-trolls",
  "cKiV9yKKXIT6m2AY": "race-elves",
  "d93hNPa9vZ5SYoF1": "race-humans",
  "dtMO13STeWNIGz6u": "race-elves",
  "hd6MCcBLbDlg5QF7": "race-khazad",
  "jFuy6nJIKFNv0LXi": "race-petty-dwarves",
  "jbOuzV6dmXz4wpZD": "race-humans",
  "kVTXvP0jdolL5aYF": "race-humans",
  "pQIC64RG9CVnN5sH": "race-orcs",
  "pkZrtHlEqKYQVwJq": "race-humans",
  "uRLV7PuebdpHYQIP": "race-dunedain",
  "uw0sjGAjdnMlLt07": "race-elves",
  "yHhTdyh6EmZUjsld": "race-half-orcs",
  "ybVxCk0cqLy1XbE8": "race-trolls",
});

const MERP_RACE_KEYS = new Set([
  "race-humans", "race-dunedain", "race-elves", "race-hobbits",
  "race-khazad", "race-half-elves", "race-half-orcs", "race-half-trolls",
  "race-orcs", "race-petty-dwarves", "race-trolls", "race-umli"
]);
const MERP_CULTURE_GROUP_ORDER = Object.freeze([
  "race-humans", "race-dunedain", "race-elves", "race-hobbits",
  "race-khazad", "race-half-orcs", "race-half-trolls", "race-orcs",
  "race-petty-dwarves", "race-trolls", "race-umli"
]);
const MERP_CULTURE_GROUP_FR = Object.freeze({
  "race-humans": "Cultures humaines",
  "race-dunedain": "Cultures des Dúnedain",
  "race-elves": "Cultures elfiques",
  "race-hobbits": "Cultures des Hobbits",
  "race-khazad": "Cultures des Khazâd",
  "race-half-orcs": "Cultures des Demi-Orcs",
  "race-half-trolls": "Cultures des Demi-Trolls",
  "race-orcs": "Cultures des Orcs",
  "race-petty-dwarves": "Cultures des Petits-Nains",
  "race-trolls": "Cultures des Trolls",
  "race-umli": "Cultures des Umli"
});
const MERP_CULTURE_GROUP_EN = Object.freeze({
  "race-humans": "Human cultures",
  "race-dunedain": "Dúnedain cultures",
  "race-elves": "Elven cultures",
  "race-hobbits": "Hobbit cultures",
  "race-khazad": "Khazâd cultures",
  "race-half-orcs": "Half-Orc cultures",
  "race-half-trolls": "Half-Troll cultures",
  "race-orcs": "Orc cultures",
  "race-petty-dwarves": "Petty-Dwarf cultures",
  "race-trolls": "Troll cultures",
  "race-umli": "Umli cultures"
});
const merpCultureGroupsByUuid = new Map();

/** A bounded race-name fallback for historical Petits-Nains variants.
 * Accept punctuation and accent changes, not generic dwarf/khazad names.
 * Race Item flags remain authoritative for all other named MERP races.
 */
function isPettyDwarfRaceName(name) {
  const normalized = String(name ?? "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ").trim();
  return /^(?:petits? nains?|petty dwarves?|noegyth nibin)(?: \(noegyth nibin\)| noegyth nibin)?$/.test(normalized);
}
function normalizeRaceCanonicalKey(raceItem) {
  const flags = raceItem?.flags?.["merp-ui"] ?? {};
  const raw = String(flags.canonicalKey ?? flags.key ?? flags.compendiumSourceKey ?? "")
    .trim().replace(/-age-[1-4]$/, "");
  if (MERP_RACE_KEYS.has(raw)) return raw;
  if (isPettyDwarfRaceName(raceItem?.name)) return "race-petty-dwarves";
  // Strict mapping for exact MERP race names if a world copy has lost its flags.
  // No heuristic matching on partial strings ("elf", "man", etc).
  const byName = new Map([
    ["Dúnedain", "race-dunedain"],
    ["Elfes (Quendi)", "race-elves"],
    ["Humains (Hildor)", "race-humans"],
    ["Demi-Elfes (Peredhil)", "race-half-elves"],
    ["Hobbits (Periannath)", "race-hobbits"],
    ["Khazâd (Naugrim)", "race-khazad"],
    ["Demi-Orcs (Perorch / Piryrch)", "race-half-orcs"],
    ["Demi-Trolls (Pertorog / Pirtereg)", "race-half-trolls"],
    ["Orcs (Yrch)", "race-orcs"],
    ["Trolls (Tereg)", "race-trolls"],
    ["Petits-Nains (Noegyth Nibin)", "race-petty-dwarves"],
    ["Umli (Demi-Nains)", "race-umli"]
  ]);
  return byName.get(String(raceItem?.name ?? "")) ?? null;
}

/**
 * Select the actor's ACTUAL current race. Foundry's prepared system._header
 * may expose the displayed race earlier than the three backing collections.
 * Never union current Items with stale _source Items before resolving identity:
 * a recently replaced default Hildor race can otherwise look like a second
 * active race and silently disable the filter.
 */
function currentActorMerpRaceKey(actor) {
  if (!actor) return null;
  const live = Array.from(actor.items ?? []).filter(item => item?.type === "race");
  const source = (actor.toObject?.()?.items ?? actor._source?.items ?? [])
    .filter(item => item?.type === "race");
  const liveKeys = new Set(live.map(normalizeRaceCanonicalKey).filter(Boolean));

  // Prepared RMU header is the displayed current race. It resolves, among
  // other cases, a stale default Human alongside a newly selected MERP race.
  const prepared = [
    actor.system?._header?._raceName,
    actor.system?._race?.name,
    actor.system?._raceName,
    actor.system?.race?.name,
    actor.system?.raceName,
    typeof actor.system?.race === "string" ? actor.system.race : null
  ];
  for (const label of prepared) {
    if (!label || typeof label !== "string") continue;
    const key = normalizeRaceCanonicalKey({name: label});
    if (key && (liveKeys.size === 0 || liveKeys.has(key))) return key;
  }
  if (liveKeys.size === 1) return liveKeys.values().next().value;
  if (liveKeys.size > 1) {
    console.warn("merp-ui | Plusieurs races MERP actives : sélection culturelle bloquée", {
      actor: actor.name, races: live.map(item => ({name: item.name,
        key: item.flags?.["merp-ui"]?.canonicalKey ?? item.flags?.["merp-ui"]?.key}))
    });
    return null;
  }
  // Only consult source snapshots when no live race is available: source data
  // is useful during creation, but can lag behind an actual Item replacement.
  if (!live.length) {
    const keys = new Set(source.map(normalizeRaceCanonicalKey).filter(Boolean));
    if (keys.size === 1) return keys.values().next().value;
  }
  return null;
}

function hasUnresolvedMerpRace(actor) {
  const races = Array.from(actor?.items ?? []).filter(item => item?.type === "race");
  return races.some(item => {
    const f = item.flags?.["merp-ui"] ?? {};
    return String(f.canonicalKey ?? f.key ?? "").startsWith("race-") ||
      isPettyDwarfRaceName(item.name);
  });
}

function allowedMerpCultureRaces(raceKey) {
  if (raceKey === "race-half-elves") {
    return new Set(["race-humans", "race-dunedain", "race-elves"]);
  }
  return new Set([raceKey]);
}

function merpCultureGroup(row) {
  const uuid = String(row?.uuid ?? "");
  const prefix = "Compendium.merp-ui.merp-rmu-cultures.";
  if (!uuid.startsWith(prefix)) return null;
  const id = uuid.slice(prefix.length).replace(/^Item\./, "");
  return MERP_CULTURE_RACE_BY_DOCUMENT_ID[id] ?? null;
}

/** Unchanged RMU rows as objects, filtered BEFORE native arrow-key selection. */
function compatibleMerpCultureRows(rows, raceKey) {
  if (!Array.isArray(rows) || !MERP_RACE_KEYS.has(raceKey)) return rows;
  const allowed = allowedMerpCultureRaces(raceKey);
  const relevant = rows.filter(row => allowed.has(merpCultureGroup(row)));
  // Sort only the already-filtered MERP culture rows; their UUIDs, names,
  // sources and native click handlers are never modified.
  relevant.sort((a, b) => {
    const x = MERP_CULTURE_GROUP_ORDER.indexOf(merpCultureGroup(a));
    const y = MERP_CULTURE_GROUP_ORDER.indexOf(merpCultureGroup(b));
    return x - y; // native RMU sorted order remains stable within each group
  });
  for (const row of relevant) merpCultureGroupsByUuid.set(row.uuid, merpCultureGroup(row));
  return relevant;
}

/** Add visible section titles WITHOUT adding fake selectable rows. */
function decorateMerpCultureGroups(root) {
  if (!root?.classList?.contains("rmu-pick-culture-dialog")) return;
  const list = root.querySelector(".rmu-spec-skill-list");
  if (!list) return;
  const activeMerp = !!root.querySelector(
    '.rmu-pick-filter__chip[data-filter="custom"].rmu-pick-filter__chip--active'
  );
  const headings = list.querySelectorAll(":scope > .merp-ui-culture-section-heading");
  if (!activeMerp) {
    for (const heading of headings) heading.remove();
    return;
  }
  const labels = isFrench() ? MERP_CULTURE_GROUP_FR : MERP_CULTURE_GROUP_EN;
  const firstRows = new Map();
  for (const item of list.querySelectorAll(":scope > .rmu-spec-skill-item[data-uuid]")) {
    const group = merpCultureGroupsByUuid.get(item.dataset.uuid);
    if (group && !firstRows.has(group)) firstRows.set(group, item);
  }
  // Remove stale or misplaced headings. Idempotent under MutationObserver.
  for (const heading of headings) {
    if (heading.nextElementSibling !== firstRows.get(heading.dataset.group)) heading.remove();
  }
  for (const [group, first] of firstRows) {
    const previous = first.previousElementSibling;
    if (previous?.classList?.contains("merp-ui-culture-section-heading") &&
        previous.dataset.group === group) {
      if (previous.textContent !== labels[group]) previous.textContent = labels[group];
      continue;
    }
    const heading = document.createElement("div");
    heading.className = "merp-ui-culture-section-heading";
    heading.dataset.group = group;
    heading.textContent = labels[group];
    heading.setAttribute("role", "heading");
    heading.setAttribute("aria-level", "3");
    first.before(heading);
  }
}

/**
 * Pass the CURRENT actor race into the culture dialog through contextData.
 * We use a temporary subclass rather than a global current-actor variable:
 * two players opening different sheets cannot leak their race constraints.
 * The native _pickCreationItem still creates/replaces the Item itself.
 */
async function installCulturePickerCompatibility() {
  try {
    const [sheetModule, pickerModule] = await Promise.all([
      import(foundry.utils.getRoute("systems/rmu/module/apps/actor/character-sheet-v2.js")),
      import(foundry.utils.getRoute("systems/rmu/module/apps/creation/pick-culture-dialog-v2.js"))
    ]);
    const sheetProto = sheetModule.default?.prototype;
    const pickerProto = pickerModule.default?.prototype;
    const basePick = sheetProto?._pickCreationItem;
    const baseRows = pickerProto?._loadRows;
    const baseContext = pickerProto?._prepareContext;
    if (typeof basePick !== "function" || typeof baseRows !== "function" ||
        typeof baseContext !== "function") {
      console.warn("merp-ui | Sélecteur culturel : méthodes RMU introuvables");
      return;
    }

    if (!baseRows.__merpUiCultureFilter) {
      const filteredRows = async function (...args) {
        const rows = await baseRows.apply(this, args);
        return compatibleMerpCultureRows(rows, this._contextData?.merpUiCultureRace);
      };
      filteredRows.__merpUiCultureFilter = true;
      pickerProto._loadRows = filteredRows;
    }

    // Native RMU's private filter state is initialized FROM this public getter
    // on the FIRST render. Unlike delayed .click(), it cannot flash "Toutes".
    // RMU races without MERP identity keep their usual initial "Toutes" tab.
    const descriptor = Object.getOwnPropertyDescriptor(pickerProto, "_defaultFilter");
    if (!descriptor?.get?.__merpUiCultureDefault) {
      const getMerpCultureDefault = function () {
        return MERP_RACE_KEYS.has(this._contextData?.merpUiCultureRace) ? "custom" : "";
      };
      getMerpCultureDefault.__merpUiCultureDefault = true;
      Object.defineProperty(pickerProto, "_defaultFilter", {
        configurable: true, get: getMerpCultureDefault
      });
    }

    if (!baseContext.__merpUiCulturePills) {
      const withCulturePills = async function (...args) {
        const context = await baseContext.apply(this, args);
        if (!MERP_RACE_KEYS.has(this._contextData?.merpUiCultureRace)) return context;
        // The only available source is the compatible MERP culture pack.
        // Do not expose "Toutes" or unrelated Core Law/Sidebar categories.
        return { ...context, filters: (context.filters ?? []).filter(f => f.key === "custom") };
      };
      withCulturePills.__merpUiCulturePills = true;
      pickerProto._prepareContext = withCulturePills;
    }

    if (!basePick.__merpUiCultureRaceContext) {
      const withRace = function (type, dialogClass, dialogKey, fields, rowOf, read) {
        if (type !== "culture" || dialogKey !== "PickCultureDialog") {
          return basePick.call(this, type, dialogClass, dialogKey, fields, rowOf, read);
        }
        const raceKey = currentActorMerpRaceKey(this.document);
        if (!raceKey) {
          // Native RMU races keep the native list. A MERP race with ambiguous
          // identity must NEVER fall back silently to unrestricted "Toutes".
          if (hasUnresolvedMerpRace(this.document)) {
            console.warn("merp-ui | Culture bloquée : race MERP ambigüe", {
              actor: this.document?.name, races: Array.from(this.document?.items ?? [])
                .filter(i => i.type === "race").map(i => ({name: i.name, flags: i.flags?.["merp-ui"]}))
            });
            ui.notifications.warn("MERP-UI : race MERP ambiguë. Vérifier les Items de race avant de choisir une culture.");
            return null;
          }
          console.info("merp-ui | Sélecteur culturel RMU natif (race hors MERP)", {
            actor: this.document?.name
          });
          return basePick.call(this, type, dialogClass, dialogKey, fields, rowOf, read);
        }
        class MerpCultureDialogForActor extends dialogClass {
          static asPromise(contextData, window, options = {}) {
            const rows = compatibleMerpCultureRows(contextData?.rows ?? [], raceKey);
            if (!rows.length) {
              console.error("merp-ui | Aucune culture MERP compatible disponible", {raceKey});
              ui.notifications.error("MERP-UI : aucune culture compatible trouvée dans le Compendium MERP.");
              return Promise.resolve(null);
            }
            const selectedUuid = rows.some(row => row.uuid === contextData?.selectedUuid)
              ? contextData.selectedUuid : rows[0].uuid;
            console.info("merp-ui | Filtre culturel MERP appliqué", {
              race: raceKey, choix: rows.length, initial: "MERP",
              cultures: rows.map(row => row.name)
            });
            return super.asPromise({
              ...contextData, rows, selectedUuid, merpUiCultureRace: raceKey
            }, window, options);
          }
        }
        return basePick.call(this, type, MerpCultureDialogForActor, dialogKey, fields, rowOf, read);
      };
      withRace.__merpUiCultureRaceContext = true;
      sheetProto._pickCreationItem = withRace;
    }
    console.info("merp-ui | Filtre culturel installé : races MERP strictes, onglet MERP initial");
  } catch (error) {
    console.error("merp-ui | Filtrage des cultures non activé", error);
  }
}
if (game?.ready) void installCulturePickerCompatibility();
else Hooks.once("ready", installCulturePickerCompatibility);


/**
 * Professions — two source tabs, MERP and native RMU Core Law.
 *
 * MERP-UI is an optional presentation layer over RMU's V14 picker: its native
 * _loadRows, _prepareContext, onFilter, onSelect, onApply and _detailOf continue
 * to own selection, descriptions and creation.  The only classification is the
 * *source UUID*, never translated names or historical mechanical similarity.
 *
 * World/sidebar clones and foreign third-party packs are deliberately omitted
 * from these two tabs, preventing duplicates of managed MERP entries. The
 * original RMU picker is used unchanged when neither known source is present.
 * This does NOT restrict native RMU professions, even if a MERP counterpart
 * exists in the other tab: players can still explicitly choose RMU Core Law.
 */
// CLEAN-41 — World option: strict documented compatibility by default.
function decorateWhitfordProfessionNote(root, app) {
  if (!root?.classList?.contains("rmu-pick-profession-dialog")) return;
  const scope = app?._contextData?.merpUiProfessionCompatibility;
  const existing = root.querySelector(".merp-ui-profession-compat-note");
  if (!scope || !professionCompatibilityEnabled()) { existing?.remove(); return; }
  const specialGender = ["culture-human-variags", "culture-hillmen", "culture-drughu",
    "culture-common-orcs", "culture-uruk-hai"].includes(scope.cultureKey);
  const fr = isFrench();
  const text = specialGender
    ? (fr
      ? "Professions selon Whitford (race et culture). Certaines traditions réservent une profession à un sexe : vérification par le Meneur. Dérogation possible dans les paramètres du module."
      : "Whitford race/culture professions. Some traditions have gender-specific requirements: GM review required. The GM may override this in module settings.")
    : (fr
      ? "Professions compatibles avec la race et la culture selon Whitford. Le Meneur peut désactiver le filtre dans les paramètres du module."
      : "Professions compatible with this race and culture (Whitford). The GM may disable this filter in module settings.");
  let note = existing;
  if (!note) {
    const list = root.querySelector(".rmu-spec-skill-list");
    if (!list) return;
    note = document.createElement("p");
    note.className = "merp-ui-profession-compat-note";
    list.before(note);
  }
  if (note.textContent !== text) note.textContent = text;
}

const PROFESSION_COMPAT_SETTING = "whitfordProfessionCompatibility";
function registerProfessionCompatibilitySetting() {
  if (game.settings.settings?.has?.(`merp-ui.${PROFESSION_COMPAT_SETTING}`)) return;
  game.settings.register("merp-ui", PROFESSION_COMPAT_SETTING, {
    name: "MERPUI.Settings.WhitfordProfessionCompatibility.Name",
    hint: "MERPUI.Settings.WhitfordProfessionCompatibility.Hint",
    scope: "world", config: true, type: Boolean, default: true
  });
}
if (game?.ready) registerProfessionCompatibilitySetting();
else Hooks.once("init", registerProfessionCompatibilitySetting);
function professionCompatibilityEnabled() {
  try { return game.settings.get("merp-ui", PROFESSION_COMPAT_SETTING) !== false; }
  catch { return true; }
}

const MERP_PROFESSION_PACK_PREFIX = "Compendium.merp-ui.merp-rmu-professions.";
const RMU_CORE_PROFESSION_PACK_PREFIX = "Compendium.rmu.core.";

function professionSourceTab(row) {
  const uuid = String(row?.uuid ?? "");
  if (uuid.startsWith(MERP_PROFESSION_PACK_PREFIX)) return "merp";
  if (uuid.startsWith(RMU_CORE_PROFESSION_PACK_PREFIX)) return "rmu";
  return null;
}

async function installProfessionPickerTabs() {
  try {
    const [professionModule, sheetModule] = await Promise.all([
      import(foundry.utils.getRoute("systems/rmu/module/apps/creation/pick-profession-dialog-v2.js")),
      import(foundry.utils.getRoute("systems/rmu/module/apps/actor/character-sheet-v2.js"))
    ]);
    const ProfessionPicker = professionModule.default;
    const sheetProto = sheetModule.default?.prototype;
    const proto = ProfessionPicker?.prototype;
    const originalRows = proto?._loadRows;
    const originalOptions = proto?._filterOptions;
    const originalContext = proto?._prepareContext;
    if (typeof originalRows !== "function" ||
        typeof originalOptions !== "function" ||
        typeof originalContext !== "function" ||
        originalRows.__merpUiSourceTabs) return;

    const withTabs = async function (...args) {
      const loaded = await originalRows.apply(this, args);
      if (!Array.isArray(loaded)) return loaded;
      const scope = this._contextData?.merpUiProfessionCompatibility;
      const rows = scope && professionCompatibilityEnabled()
        ? compatibleProfessionRows(loaded, scope.raceKey, scope.cultureKey)
        : loaded;
      const knownRows = rows.flatMap(row => {
        const tab = professionSourceTab(row);
        return tab ? [{ ...row, filter: tab }] : [];
      });
      if (!knownRows.length) {
        // Future RMU implementations or missing/disabled packs: leave its
        // native rows, original casting filters and original default intact.
        this._contextData.merpUiProfessionSourceTabs = false;
        return rows;
      }
      this._contextData.merpUiProfessionSourceTabs = true;
      this._contextData.merpUiProfessionHasMerp = knownRows.some(row => row.filter === "merp");
      // Preserve native rows and UUIDs so character creation still goes
      // through RMU's _onDropItem, not a MERP-UI replacement workflow.
      return knownRows;
    };
    withTabs.__merpUiSourceTabs = true;
    proto._loadRows = withTabs;

    proto._filterOptions = function (...args) {
      if (!this._contextData?.merpUiProfessionSourceTabs) {
        return originalOptions.apply(this, args);
      }
      return [
        { key: "merp", label: "MERP" },
        { key: "rmu", label: "RMU" }
      ];
    };

    // In the native PickListDialog, #filter is private. The public extension
    // point _defaultFilter is used instead of touching or simulating state.
    // If a character already has an RMU profession, the native picker itself
    // opens on that row's tab; new characters start on MERP.
    Object.defineProperty(proto, "_defaultFilter", {
      configurable: true,
      get() {
        if (!this._contextData?.merpUiProfessionSourceTabs) return "";
        return this._contextData.merpUiProfessionHasMerp ? "merp" : "rmu";
      }
    });

    const withTwoTabs = async function (...args) {
      const context = await originalContext.apply(this, args);
      if (!this._contextData?.merpUiProfessionSourceTabs) return context;
      // Native RMU always prepends its 'All' filter. Hide that option only
      // for professions so the two sources remain visually separate.
      return { ...context, filters: (context.filters ?? []).filter(f => f.key !== "") };
    };
    withTwoTabs.__merpUiSourceTabs = true;
    proto._prepareContext = withTwoTabs;

    // Pass the current ACTOR's race/culture to RMU's native picker. This avoids
    // leaking restrictions across sheets, users, source tabs and translations.
    // The original RMU onApply, Item drops and profession rules stay untouched.
    const parentPick = sheetProto?._pickCreationItem;
    if (typeof parentPick === "function" && !parentPick.__merpUiWhitfordProfessionFilter) {
      const pickWithCompatibility = function(type, dialogClass, dialogKey, fields, rowOf, read) {
        if (type !== "profession" || dialogKey !== "PickProfessionDialog" ||
            !professionCompatibilityEnabled()) {
          return parentPick.call(this, type, dialogClass, dialogKey, fields, rowOf, read);
        }
        const raceKey = currentActorMerpRaceKey(this.document);
        const cultureKey = actorMerpCultureKey(this.document);
        if (!raceKey) {
          if (hasUnresolvedMerpRace(this.document)) {
            ui.notifications.warn(isFrench()
              ? "MERP-UI : race MERP ambiguë. Vérifiez la race avant de choisir une profession."
              : "MERP-UI: ambiguous MERP race. Check the character race before choosing a profession.");
            return null;
          }
          return parentPick.call(this, type, dialogClass, dialogKey, fields, rowOf, read);
        }
        class MerpProfessionDialogForActor extends dialogClass {
          static asPromise(contextData, window, options = {}) {
            const scope = {raceKey, cultureKey};
            const available = compatibleProfessionRows(contextData?.rows ?? [], raceKey, cultureKey);
            if (!available.length) {
              ui.notifications.warn(isFrench()
                ? "MERP-UI : aucune profession compatible avec cette race/culture. Le Meneur peut désactiver la restriction dans les paramètres."
                : "MERP-UI: no compatible profession for this race/culture. The GM may disable the restriction in module settings.");
              return Promise.resolve(null);
            }
            const selectedUuid = available.some(r => r.uuid === contextData?.selectedUuid)
              ? contextData.selectedUuid : available[0].uuid;
            console.info("merp-ui | Compatibilité Whitford des professions", {
              race: raceKey, culture: cultureKey, choices: available.length
            });
            return super.asPromise({
              ...contextData, rows: available, selectedUuid,
              merpUiProfessionCompatibility: scope
            }, window, options);
          }
        }
        return parentPick.call(this, type, MerpProfessionDialogForActor, dialogKey, fields, rowOf, read);
      };
      pickWithCompatibility.__merpUiWhitfordProfessionFilter = true;
      sheetProto._pickCreationItem = pickWithCompatibility;
    }
    console.info("merp-ui | Filtre Whitford Race/Culture/Profession installé");
  } catch (error) {
    console.warn("merp-ui | Onglets Professions MERP/RMU non activés ; sélecteur RMU conservé", error);
  }
}
if (game?.ready) void installProfessionPickerTabs();
else Hooks.once("ready", installProfessionPickerTabs);
