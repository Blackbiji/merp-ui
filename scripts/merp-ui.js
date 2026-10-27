import { buildWebpIconMigrationMap, migrateValueDeep } from "./merp-rmu/icon-path-migration.js";
import { createMerpAssetCatalog } from "./merp-rmu/asset-catalog.js";
import { localizeMerpHerbSheet } from "./merp-rmu/herb-sheet-localization.js";
import { resolveSharedSkill, resolveSharedSkillCategory, loadSharedSkillRegistry, loadSharedSkillCategoryRegistry } from "./skill-registry.js";
import { contentLanguage, localizeContentValue } from "./merp-rmu/localization.js";
import { registerSettingsUiLocalizationHooks, rerenderSettingsApplications } from "./merp-rmu/settings-ui-localization.js";
import { registerMerpUiCoreSettings } from "./merp-rmu/settings-registration.js";
import { dropcapAsset, observeJournalDropcaps } from "./merp-rmu/journal-dropcaps.js";
import { scheduleItemSheetMetadataLocalization } from "./merp-rmu/item-sheet-metadata.js";
import { applyCreationTalentTypography } from "./merp-rmu/creation-talents-typography.js";
import { localizeDunedainCreationTalentRows } from "./merp-rmu/dunedain-racial-talents.js";
import { decorateMerpCompendiumBrowser } from "./merp-rmu/compendium-browser-theme.js";

const MODULE_ID = "merp-ui";
const CATALOG_PATH = `modules/${MODULE_ID}/assets/catalog.json`;

const assetCatalog = createMerpAssetCatalog({
  path: CATALOG_PATH,
  resolveRoute: (path) => foundry?.utils?.getRoute ? foundry.utils.getRoute(path) : path
});
let typographyState = { family: "PragRoman", source: null, loaded: false };

async function resolvePragRomanUrl() {
  const path = `modules/${MODULE_ID}/fonts/PragRoman.ttf?v=1.6.0-rc.6.1`;
  return foundry?.utils?.getRoute ? foundry.utils.getRoute(path) : path;
}

async function loadPragRoman({ force = false } = {}) {
  const url = await resolvePragRomanUrl();
  try {
    if (!force && document.fonts.check('16px "PragRoman"')) {
      typographyState = { family: "PragRoman", source: url, loaded: true, reused: true };
      return foundry.utils.deepClone(typographyState);
    }

    const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 1024) {
      throw new Error(`Fichier de police anormalement petit (${buffer.byteLength} octets).`);
    }

    const face = new FontFace("PragRoman", buffer, {
      style: "normal",
      weight: "400",
      display: "swap"
    });

    const loadedFace = await face.load();

    for (const existing of [...document.fonts]) {
      if (existing.family.replaceAll('"', "") === "PragRoman" && existing !== loadedFace) {
        document.fonts.delete(existing);
      }
    }

    document.fonts.add(loadedFace);
    await document.fonts.ready;

    typographyState = {
      family: "PragRoman",
      source: url,
      loaded: true,
      bytes: buffer.byteLength,
      status: response.status,
      contentType: response.headers.get("content-type")
    };

    return foundry.utils.deepClone(typographyState);
  } catch (error) {
    typographyState = {
      family: "PragRoman",
      source: url,
      loaded: false,
      error: error?.message ?? String(error)
    };
    console.error(`${MODULE_ID} | Échec du chargement de PragRoman`, error);
    return foundry.utils.deepClone(typographyState);
  }
}

async function diagnosePragRoman() {
  const url = await resolvePragRomanUrl();
  try {
    const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
    const buffer = await response.arrayBuffer();
    return {
      family: "PragRoman",
      source: url,
      httpOk: response.ok,
      httpStatus: response.status,
      contentType: response.headers.get("content-type"),
      bytes: buffer.byteLength,
      loaded: typographyState.loaded,
      registeredFaces: [...document.fonts]
        .filter((font) => font.family.replaceAll('"', "") === "PragRoman")
        .map((font) => ({
          family: font.family,
          status: font.status,
          style: font.style,
          weight: font.weight
        }))
    };
  } catch (error) {
    return { family: "PragRoman", source: url, httpOk: false, loaded: false, error: String(error) };
  }
}

function getApplicationRoots(app, html) {
  const roots = new Set();

  const htmlRoot = html?.[0] ?? html;
  const appElement = app?.element?.[0] ?? app?.element;

  if (htmlRoot instanceof HTMLElement) roots.add(htmlRoot);
  if (appElement instanceof HTMLElement) roots.add(appElement);

  for (const candidate of [...roots]) {
    const application = candidate.closest?.(".application, .window-app");
    if (application instanceof HTMLElement) roots.add(application);
  }

  return [...roots];
}

function detectApplicationDocument(app, roots = []) {
  const document =
    app?.document ??
    app?.actor ??
    app?.item ??
    app?.journal ??
    app?.object ??
    app?.options?.document ??
    app?.options?.actor;

  const documentName =
    document?.documentName ??
    document?.constructor?.documentName ??
    app?.documentName ??
    app?.options?.documentName;

  const actorType =
    document?.type ??
    app?.actor?.type ??
    app?.document?.type;

  const classText = [
    app?.constructor?.name,
    app?.options?.id,
    ...(app?.options?.classes ?? []),
    ...roots.flatMap((root) => [...root.classList])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const isActor =
    documentName === "Actor" ||
    Boolean(app?.actor) ||
    classText.includes("actor") ||
    roots.some((root) =>
      root.matches?.(
        '.actor-sheet, .rmu-actor-sheet, .rmu.actor, [data-document-name="Actor"], [data-document-type="Actor"]'
      )
    );

  const isJournal =
    ["JournalEntry", "JournalEntryPage"].includes(documentName) ||
    classText.includes("journal");

  const isItem =
    documentName === "Item" ||
    Boolean(app?.item) ||
    classText.includes("item-sheet");

  return { document, documentName, actorType, isActor, isJournal, isItem };
}



function injectOriginalSkillNameIntoTooltip(tooltipElement, originalName) {
  if (!(tooltipElement instanceof HTMLElement) || !originalName) return;

  const currentTooltip = String(tooltipElement.dataset.tooltip ?? "").trim();
  if (!currentTooltip) return;

  const template = document.createElement("template");
  template.innerHTML = currentTooltip;

  const container =
    template.content.querySelector(".rmu-tooltip") ??
    template.content.firstElementChild;

  if (!(container instanceof HTMLElement)) return;

  container.querySelectorAll(".merp-ui-tooltip-original-name").forEach((element) => element.remove());

  const original = document.createElement("div");
  original.className = "merp-ui-tooltip-original-name";
  original.textContent = originalName;
  container.append(original);

  tooltipElement.dataset.tooltip = template.innerHTML;
  tooltipElement.dataset.merpUiOriginalSkillName = originalName;
}

async function enhanceSkillTooltipOriginalNames(root) {
  if (!(root instanceof HTMLElement)) return;
  if (game.i18n?.lang && !String(game.i18n.lang).toLowerCase().startsWith("fr")) return;

  const rows = root.querySelectorAll("tr[data-rmu-skill-name]");

  for (const row of rows) {
    const sourceName = String(row.dataset.rmuSkillName ?? "").trim();
    if (!sourceName) continue;

    const tooltipElement = row.querySelector("td.rmu-filter-field span[data-tooltip]");
    if (!(tooltipElement instanceof HTMLElement)) continue;

    let originalName = sourceName;

    try {
      const entry = await resolveSharedSkill({
        canonicalName: sourceName,
        name: sourceName,
        officialUuid: row.dataset.rmuSrcUuid || null
      });
      originalName = entry?.canonicalName || sourceName;
    } catch (error) {
      console.debug(`${MODULE_ID} | Nom VO introuvable dans le référentiel pour « ${sourceName} »`, error);
    }

    if (tooltipElement.dataset.merpUiOriginalSkillName === originalName) continue;
    injectOriginalSkillNameIntoTooltip(tooltipElement, originalName);
  }
}

function scheduleSkillTooltipEnhancement(app, html) {
  const roots = getApplicationRoots(app, html);

  for (const root of roots) {
    if (!root.classList.contains("merp-ui-actor")) continue;

    const run = () => {
      enhanceSkillTooltipOriginalNames(root).catch((error) => {
        console.error(`${MODULE_ID} | Échec de l’ajout du nom VO aux infobulles`, error);
      });
    };

    requestAnimationFrame(run);
    setTimeout(run, 120);
    setTimeout(run, 450);
  }
}


function bilingualSkillLabel(frLabel, enLabel) {
  const fr = String(frLabel ?? "").trim();
  const en = String(enLabel ?? "").trim();
  if (!fr) return en;
  if (!en || fr.localeCompare(en, "fr", { sensitivity: "base" }) === 0) return fr;
  if (fr.endsWith(`(${en})`)) return fr;
  return `${fr} (${en})`;
}

async function enhanceBilingualSkillLabels(root) {
  if (!(root instanceof HTMLElement)) return;
  if (game.i18n?.lang && !String(game.i18n.lang).toLowerCase().startsWith("fr")) return;

  const skills = await loadSharedSkillRegistry();
  const categories = await loadSharedSkillCategoryRegistry();

  for (const row of root.querySelectorAll("tr[data-rmu-skill-name]")) {
    if (!(row instanceof HTMLElement)) continue;
    const canonical = String(row.dataset.rmuSkillName ?? "").trim();
    if (!canonical) continue;
    const entry = skills.byName.get(canonical.toLowerCase()) ?? null;
    if (!entry?.name) continue;
    const target = row.querySelector("td.rmu-filter-field span[data-tooltip], td.rmu-filter-field span, td:nth-child(3)");
    if (!(target instanceof HTMLElement)) continue;
    target.textContent = bilingualSkillLabel(entry.name, entry.canonicalName || canonical);
    target.dataset.merpUiBilingualSkill = "true";
  }

  for (const row of root.querySelectorAll("tr.rmu-skill-group, tr[data-rmu-skill-group]")) {
    if (!(row instanceof HTMLElement)) continue;
    const canonical = String(row.dataset.rmuSkillGroup ?? "").trim();
    if (!canonical) continue;
    const entry = categories.byName.get(canonical.toLowerCase()) ?? null;
    if (!entry?.name) continue;
    const target = row.querySelector("td:nth-child(3)");
    if (!(target instanceof HTMLElement)) continue;
    target.textContent = bilingualSkillLabel(entry.name, entry.canonicalName || canonical);
    target.dataset.merpUiBilingualCategory = "true";
  }
}

function sortRenderedSkillCategories(root) {
  if (!(root instanceof HTMLElement)) return;
  if (game.i18n?.lang && !String(game.i18n.lang).toLowerCase().startsWith("fr")) return;

  for (const tbody of root.querySelectorAll("tbody")) {
    const rows = Array.from(tbody.children).filter((el) => el instanceof HTMLTableRowElement);
    const groupIndexes = rows.map((row, i) => row.matches("tr.rmu-skill-group, tr[data-rmu-skill-group]") ? i : -1).filter((i) => i >= 0);
    if (groupIndexes.length < 2) continue;

    const prefix = rows.slice(0, groupIndexes[0]);
    const blocks = groupIndexes.map((start, idx) => {
      const end = idx + 1 < groupIndexes.length ? groupIndexes[idx + 1] : rows.length;
      const blockRows = rows.slice(start, end);
      const groupRow = blockRows[0];
      const raw = String(groupRow.dataset.rmuSkillGroup ?? groupRow.textContent ?? "").trim();
      const label = String(groupRow.querySelector("td:nth-child(3)")?.textContent ?? raw).replace(/\s*\([^)]*\)\s*$/, "").trim();
      return { rows: blockRows, label };
    });

    blocks.sort((a, b) => a.label.localeCompare(b.label, "fr", { sensitivity: "base", ignorePunctuation: true }));
    const frag = document.createDocumentFragment();
    for (const row of prefix) frag.append(row);
    for (const block of blocks) for (const row of block.rows) frag.append(row);
    tbody.append(frag);
  }
}

async function enhanceSkillCategoryTooltips(root) {
  if (!(root instanceof HTMLElement)) return;
  if (game.i18n?.lang && !String(game.i18n.lang).toLowerCase().startsWith("fr")) return;

  /*
   * RMU rend les catégories dans des lignes .rmu-skill-group. Lorsque la valeur
   * interne de la catégorie est déjà traduite, le système tente parfois de
   * localiser une clé comme « RMU.SKILLCATEGORY.DISCIPLINE CORPORELLE » et
   * affiche la clé brute. Nous utilisons donc prioritairement l’attribut
   * data-rmu-skill-group, puis nettoyons toute clé i18n résiduelle.
   */
  const categoryTargets = new Map();

  for (const row of root.querySelectorAll("tr.rmu-skill-group, tr[data-rmu-skill-group]")) {
    if (!(row instanceof HTMLElement)) continue;
    const label = row.querySelector("td:nth-child(3)");
    if (!(label instanceof HTMLElement)) continue;
    categoryTargets.set(label, String(row.dataset.rmuSkillGroup || label.textContent || ""));
  }

  const selectors = [
    "[data-rmu-category-name]",
    ".rmu-skill-category",
    ".skill-category",
    ".category-name"
  ].join(",");

  for (const element of root.querySelectorAll(selectors)) {
    if (!(element instanceof HTMLElement)) continue;
    if (!categoryTargets.has(element)) {
      categoryTargets.set(element, String(element.dataset.rmuCategoryName || element.textContent || ""));
    }
  }

  for (const [element, rawName] of categoryTargets) {
    const visibleName = String(rawName || element.textContent || "")
      .replace(/^RMU\.(?:SKILLCATEGORY|CATEGORIES)\./i, "")
      .replace(/[★☆+−]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!visibleName) continue;

    let entry = null;
    try {
      entry = await resolveSharedSkillCategory({
        canonicalName: visibleName,
        name: visibleName
      });
    } catch (error) {
      console.debug(`${MODULE_ID} | Catégorie introuvable dans le référentiel : « ${visibleName} »`, error);
      continue;
    }
    if (!entry) continue;

    /* Remplace aussi les clés i18n brutes par le libellé français validé. */
    if (entry.name) {
      element.textContent = bilingualSkillLabel(entry.name, entry.canonicalName);
      element.dataset.rmuCategoryName = entry.canonicalName;
    }

    if (!entry.description) continue;

    const original = entry.canonicalName && entry.canonicalName !== entry.name
      ? `<div class="merp-ui-tooltip-original-name">${entry.canonicalName}</div>`
      : "";
    element.dataset.tooltip = `<div class="rmu-tooltip"><div class="merp-ui-category-tooltip-description">${entry.description}</div>${original}</div>`;
    element.dataset.tooltipDirection = element.dataset.tooltipDirection || "RIGHT";
    element.dataset.merpUiCategoryTooltip = entry.categoryId;
    element.classList.add("merp-ui-skill-category-tooltip");
  }
}
function scheduleSkillCategoryTooltipEnhancement(app, html) {
  for (const root of getApplicationRoots(app, html)) {
    if (!root.classList.contains("merp-ui-actor")) continue;
    const run = () => Promise.all([
      enhanceSkillCategoryTooltips(root),
      enhanceBilingualSkillLabels(root)
    ]).then(() => sortRenderedSkillCategories(root)).catch((error) =>
      console.error(`${MODULE_ID} | Échec des libellés bilingues / tri des catégories`, error)
    );
    requestAnimationFrame(run);
    setTimeout(run, 150);
    setTimeout(run, 500);
  }
}

function applyThemeClass(app, html) {
  if (!game.settings.get(MODULE_ID, "themeEnabled")) return;

  const roots = getApplicationRoots(app, html);
  const detection = detectApplicationDocument(app, roots);

  if (!detection.isActor && !detection.isJournal && !detection.isItem) return;

  for (const root of roots) {
    root.classList.add("merp-ui");

    if (detection.isActor) {
      root.classList.add("merp-ui-actor");
      root.dataset.documentName = "Actor";

      if (detection.actorType) {
        root.dataset.actorType = String(detection.actorType);
      }
    }

    if (detection.isJournal) root.classList.add("merp-ui-journal");
    if (detection.isItem) root.classList.add("merp-ui-item");
  }

  if (detection.isActor) {
    scheduleRmuActorNeutralization(app, html);
    scheduleSkillTooltipEnhancement(app, html);
  scheduleSkillCategoryTooltipEnhancement(app, html);
    requestAnimationFrame(() => {
      for (const root of getApplicationRoots(app, html)) {
        enhanceSkillTooltipOriginalNames(root).catch((error) => {
          console.error(`${MODULE_ID} | Échec de l’ajout du nom VO aux infobulles`, error);
        });
      }
      polishRmuActorFirstPage(app, html);
    });

    console.debug(`${MODULE_ID} | Thème Actor appliqué`, {
      app: app?.constructor?.name,
      actorType: detection.actorType,
      roots: roots.map((root) => root.className)
    });
  }
}


const CREATION_STATIC_TRANSLATIONS = new Map([
  ["Composition & Performance Art", "Composition et Arts de la Scène"],
  ["Crafting & Vocation", "Artisanat et Vocation"],
  ["Melee Weapons", "Armes de Mêlée"],
  ["Ranged Weapons", "Armes à Distance"],
  ["Shield", "Bouclier"],
  ["Unarmed", "Combat à Mains Nues"],
  ["Languages", "Langues"],
  ["Other Lores", "Autres Connaissances"],
  ["Base", "Basique"],
  ["Open", "Ouverte"],
  ["Closed", "Fermée"],
  ["Arcane", "Arcanique"],
  ["Restricted", "Restreinte"],
  ["Magical Ritual", "Rituel Magique"],
  ["Own Region", "Région d’origine"],
  ["Own", "Propre région"],
  ["Neighboring", "Région voisine"]
]);

let creationTranslationMapsPromise = null;
const creationObservers = new WeakMap();

async function getCreationTranslationMaps() {
  if (!creationTranslationMapsPromise) {
    creationTranslationMapsPromise = Promise.all([
      globalThis.MERPUI?.skills?.load?.() ?? import("./skill-registry.js").then((m) => m.loadSharedSkillRegistry()),
      globalThis.MERPUI?.skillCategories?.load?.() ?? import("./skill-registry.js").then((m) => m.loadSharedSkillCategoryRegistry())
    ]).then(([skills, categories]) => {
      const exact = new Map(CREATION_STATIC_TRANSLATIONS);
      for (const entry of skills.bySkillId.values()) {
        if (!entry.name) continue;
        const label = bilingualSkillLabel(entry.name, entry.canonicalName);
        exact.set(entry.canonicalName, label);
        for (const alias of entry.aliases ?? []) exact.set(alias, label);
      }
      for (const entry of categories.byCategoryId.values()) {
        if (!entry.name) continue;
        const label = bilingualSkillLabel(entry.name, entry.canonicalName);
        exact.set(entry.canonicalName, label);
        for (const alias of entry.aliases ?? []) exact.set(alias, label);
      }
      return exact;
    }).catch((error) => {
      creationTranslationMapsPromise = null;
      throw error;
    });
  }
  return creationTranslationMapsPromise;
}

function cleanCreationLabel(value) {
  return String(value ?? "")
    .replace(/^RMU\.(?:SKILLCATEGORY|SKILL|SKILLS|CATEGORIES)\./i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyCharacterCreationApplication(app, root) {
  const signature = [
    app?.constructor?.name,
    app?.options?.id,
    app?.options?.tag,
    ...(app?.options?.classes ?? []),
    root?.id,
    root?.className
  ].filter(Boolean).join(" ").toLowerCase();

  if (/character.?creation|creation.?character|character.?builder|level.?up|advancement|development/.test(signature)) {
    return true;
  }

  const text = String(root?.textContent ?? "");
  if (/(?:création de personnage|character creation)/i.test(text) && /talent/i.test(text)) return true;
  const hasCreationTerms = /(Race|Culture|Profession|Development Points|Points de Développement)/i.test(text);
  const hasSkillTerms = /(Skill Category|Professional Skills|Compétences professionnelles|Combat Training)/i.test(text);
  return hasCreationTerms && hasSkillTerms;
}

/**
 * Only mark the RMU character-creation Talent table; its rich HTML headings
 * inherit near-white colors that are unreadable on the table's light background.
 */
function markCreationTalentTables(root) {
  for (const table of root.querySelectorAll("table, [role='table']")) {
    const header = table.querySelector("thead")
      ?? table.querySelector("tr:has(th)")
      ?? table.querySelector("[role='row']");
    const label = String(header?.textContent ?? "").replace(/\s+/g, " ").toLowerCase();
    if (/talent/.test(label) && /tier|rang|niveau/.test(label) && /descript/.test(label)) {
      table.classList.add("merp-ui-creation-talents-table");
    }
  }
}

function translateCreationText(raw, translations) {
  const original = String(raw ?? "");
  const leading = original.match(/^\s*/)?.[0] ?? "";
  const trailing = original.match(/\s*$/)?.[0] ?? "";
  const core = cleanCreationLabel(original);
  if (!core) return original;

  const direct = translations.get(core);
  if (direct) return `${leading}${direct}${trailing}`;

  /* Cas « Nom : spécialisation » sans modifier la valeur technique sous-jacente. */
  const colon = core.match(/^([^:]+):(.*)$/);
  if (colon) {
    const head = translations.get(cleanCreationLabel(colon[1]));
    if (head) return `${leading}${head} :${colon[2]}${trailing}`;
  }

  return original;
}

async function localizeCharacterCreationRoot(app, root) {
  if (!(root instanceof HTMLElement)) return;
  if (!isLikelyCharacterCreationApplication(app, root)) return;
  markCreationTalentTables(root);
  try {
    await localizeDunedainCreationTalentRows(root, contentLanguage());
  } catch (error) {
    console.warn(`${MODULE_ID} | Localisation des Talents dúnedain indisponible`, error);
  }
  applyCreationTalentTypography(root);
  // The mutation observer must also run in EN for asynchronously rendered tables.
  if (!creationObservers.has(root)) {
    let pending = false;
    const observer = new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        localizeCharacterCreationRoot(app, root).catch((error) =>
          console.error(`${MODULE_ID} | Échec de localisation dynamique de la création`, error)
        );
      });
    });
    observer.observe(root, { childList: true, subtree: true });
    creationObservers.set(root, observer);
  }

  if (game.i18n?.lang && !String(game.i18n.lang).toLowerCase().startsWith("fr")) return;

  const translations = await getCreationTranslationMaps();
  root.classList.add("merp-ui-character-creation-localized");

  /* Les valeurs, data-* et noms techniques ne sont jamais modifiés. */
  for (const option of root.querySelectorAll("option")) {
    const translated = translateCreationText(option.textContent, translations);
    if (translated !== option.textContent) {
      option.textContent = translated;
      option.dataset.merpUiLocalized = "true";
    }
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest("script, style, textarea, option, input, [contenteditable='true']")) {
        return NodeFilter.FILTER_REJECT;
      }
      return node.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const translated = translateCreationText(node.nodeValue, translations);
    if (translated !== node.nodeValue) node.nodeValue = translated;
  }

  for (const select of root.querySelectorAll("select")) {
    const opts = Array.from(select.options ?? []);
    if (opts.length < 3) continue;
    const categoryHits = opts.filter((o) => /RMU\.SkillCategory\.|Animaux|Vigilance|Artisanat|Connaissances|Manipulation de Pouvoir|Power Manipulation/i.test(`${o.value} ${o.textContent}`)).length;
    if (categoryHits < Math.max(2, Math.floor(opts.length / 3))) continue;
    const placeholder = opts.filter((o) => !o.value || o.disabled);
    const sortable = opts.filter((o) => o.value && !o.disabled);
    sortable.sort((a, b) => String(a.textContent ?? "").localeCompare(String(b.textContent ?? ""), "fr", { sensitivity: "base", ignorePunctuation: true }));
    const ordered = [...placeholder, ...sortable];
    // Reparenting an <option> emits childList mutations. Reappending options
    // already in order retriggers our MutationObserver on every animation frame.
    // Only touch the DOM when the order actually needs to change.
    const currentOrder = Array.from(select.options ?? []);
    if (ordered.some((option, index) => currentOrder[index] !== option)) {
      for (const option of ordered) select.append(option);
    }
  }

}

function scheduleCharacterCreationLocalization(app, html) {
  for (const root of getApplicationRoots(app, html)) {
    const run = () => localizeCharacterCreationRoot(app, root).catch((error) =>
      console.error(`${MODULE_ID} | Échec de localisation de la création de personnage`, error)
    );
    requestAnimationFrame(run);
    setTimeout(run, 120);
    setTimeout(run, 450);
  }
}


function parseCssRgb(value) {
  const match = String(value ?? "").match(
    /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/
  );
  if (!match) return null;

  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4])
  };
}

function luminance({ r, g, b }) {
  return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

function isRmuBlue({ r, g, b, a = 1 }) {
  if (a < 0.15) return false;

  const clearlyBlue =
    b >= 75 &&
    b > r * 1.18 &&
    b > g * 1.06;

  const darkNavy =
    b >= 45 &&
    b > r * 1.35 &&
    b > g * 1.12 &&
    luminance({ r, g, b }) < 120;

  return clearlyBlue || darkNavy;
}

function shouldIgnoreGreyPass(element) {
  return element.matches?.(
    [
      "i",
      "svg",
      "path",
      ".fa",
      ".fas",
      ".far",
      ".fal",
      ".fat",
      ".fad",
      ".fab",
      ".fa-solid",
      ".fa-regular",
      ".fa-brands",
      "[class^='fa-']",
      "[class*=' fa-']",
      ".badge",
      ".tag",
      ".pro",
      ".roy",
      ".success",
      ".danger",
      ".warning"
    ].join(",")
  );
}

function neutralizeRmuActorColors(root) {
  if (!(root instanceof HTMLElement)) return;

  const elements = [root, ...root.querySelectorAll("*")];

  for (const element of elements) {
    if (!(element instanceof HTMLElement) || shouldIgnoreGreyPass(element)) continue;

    const style = getComputedStyle(element);
    const background = parseCssRgb(style.backgroundColor);
    const color = parseCssRgb(style.color);

    if (background && isRmuBlue(background)) {
      const isLargeSurface =
        element.clientWidth > 180 ||
        element.clientHeight > 34 ||
        /header|banner|section|category|group|panel|status|filter|resource/i.test(
          element.className
        );

      element.classList.add(
        isLargeSurface ? "merp-ui-grey-surface" : "merp-ui-grey-surface-soft"
      );
    }

    /*
     * Texte clair sur fond clair : cas observé dans « Traits supplémentaires ».
     * On ne corrige que les éléments textuels de petite taille.
     */
    if (
      color &&
      background &&
      color.a > 0.5 &&
      luminance(color) > 205 &&
      luminance(background) > 165 &&
      element.children.length <= 2
    ) {
      element.classList.add("merp-ui-dark-text");
    }
  }
}

function scheduleRmuActorNeutralization(app, html) {
  const roots = getApplicationRoots(app, html);

  for (const root of roots) {
    if (!root.classList.contains("merp-ui-actor")) continue;

    requestAnimationFrame(() => {
      neutralizeRmuActorColors(root);

      setTimeout(() => neutralizeRmuActorColors(root), 120);
      setTimeout(() => neutralizeRmuActorColors(root), 450);
    });
  }
}


const WEBP_MIGRATION_VERSION = "0.9.10";


function getEmbeddedDocumentFields(document) {
  const metadata = document?.constructor?.metadata?.embedded ?? {};
  return new Set(Object.values(metadata));
}

async function migrateDocumentWebp(document, migrationMap, stats, { dryRun = false } = {}) {
  if (!document?.toObject) return;

  const source = document.toObject();
  const embeddedFields = getEmbeddedDocumentFields(document);

  for (const field of embeddedFields) {
    delete source[field];
  }

  const migrated = migrateValueDeep(source, migrationMap, stats);

  if (migrated.changed) {
    stats.documentsChanged += 1;
    stats.changedDocuments.push({
      documentName: document.documentName,
      name: document.name ?? document.id,
      uuid: document.uuid
    });

    if (!dryRun) {
      const changes = foundry.utils.diffObject(source, migrated.value);
      if (!foundry.utils.isEmpty(changes)) {
        await document.update(changes, {
          diff: true,
          recursive: true,
          render: false,
          merpUiWebpMigration: true
        });
      }
    }
  }

  const embeddedMetadata = document?.constructor?.metadata?.embedded ?? {};

  for (const embeddedName of Object.keys(embeddedMetadata)) {
    let collection;

    try {
      collection = document.getEmbeddedCollection?.(embeddedName);
    } catch {
      collection = null;
    }

    if (!collection) continue;

    for (const embeddedDocument of collection) {
      await migrateDocumentWebp(
        embeddedDocument,
        migrationMap,
        stats,
        { dryRun }
      );
    }
  }
}

function getWorldDocumentCollections() {
  return [
    game.scenes,
    game.actors,
    game.items,
    game.journal,
    game.tables,
    game.cards,
    game.playlists,
    game.macros
  ].filter(Boolean);
}

async function migrateWorldIconsToWebp({
  dryRun = false,
  force = false,
  notify = true
} = {}) {
  if (!game.user?.isGM) {
    throw new Error("La migration WebP doit être lancée par un MJ.");
  }

  if (!assetCatalog.current()) {
    await assetCatalog.load();
  }

  const completedVersion = game.settings.get(
    MODULE_ID,
    "webpMigrationVersion"
  );

  if (!force && !dryRun && completedVersion === WEBP_MIGRATION_VERSION) {
    return {
      skipped: true,
      reason: "already-completed",
      version: completedVersion
    };
  }

  const migrationMap = buildWebpIconMigrationMap(assetCatalog.current());
  const stats = {
    dryRun,
    iconsAvailable: migrationMap.size,
    documentsScanned: 0,
    documentsChanged: 0,
    pathsChanged: 0,
    changedDocuments: [],
    unmatchedPaths: new Set()
  };

  if (notify && !dryRun) {
    ui.notifications.info(
      "MERP UI : migration des icônes PNG vers WebP en cours…"
    );
  }

  for (const collection of getWorldDocumentCollections()) {
    for (const document of collection) {
      stats.documentsScanned += 1;
      await migrateDocumentWebp(document, migrationMap, stats, { dryRun });
    }
  }

  const result = {
    dryRun,
    iconsAvailable: stats.iconsAvailable,
    documentsScanned: stats.documentsScanned,
    documentsChanged: stats.documentsChanged,
    pathsChanged: stats.pathsChanged,
    changedDocuments: stats.changedDocuments,
    unmatchedPaths: [...stats.unmatchedPaths].sort()
  };

  if (!dryRun) {
    await game.settings.set(
      MODULE_ID,
      "webpMigrationVersion",
      WEBP_MIGRATION_VERSION
    );

    if (notify) {
      const message = stats.pathsChanged
        ? `MERP UI : ${stats.pathsChanged} chemin(s) d’icône mis à jour dans ${stats.documentsChanged} document(s).`
        : "MERP UI : aucun ancien chemin PNG à migrer.";

      ui.notifications.info(message);
    }
  }

  console.log(`${MODULE_ID} | Résultat migration WebP`, result);
  return result;
}


function normalizeMerpUiLabel(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .replace(/[:.]+$/g, "")
    .trim()
    .toLocaleLowerCase("fr");
}

function findNearestRow(element, root) {
  let current = element;

  while (
    current &&
    current !== root &&
    current.parentElement !== root
  ) {
    const parent = current.parentElement;
    if (!parent) break;

    const rect = parent.getBoundingClientRect();
    const childCount = parent.children.length;

    if (
      childCount >= 2 &&
      rect.width >= 100 &&
      rect.height <= 55
    ) {
      return parent;
    }

    current = parent;
  }

  return element.parentElement;
}

function findTextElement(root, acceptedLabels) {
  const accepted = new Set(
    acceptedLabels.map((label) => normalizeMerpUiLabel(label))
  );

  return [...root.querySelectorAll(
    "label, span, div, p, strong, em, button, input"
  )].find((element) => {
    if (!(element instanceof HTMLElement)) return false;

    const value =
      element instanceof HTMLInputElement
        ? element.value
        : element.textContent;

    return accepted.has(normalizeMerpUiLabel(value));
  }) ?? null;
}

function tagPrimaryResourceStack(root) {
  const definitions = [
    { key: "pv", labels: ["PV"] },
    { key: "pp", labels: ["PP"] },
    { key: "vdb", labels: ["VDB"] },
    { key: "initiative", labels: ["Initiative"] }
  ];

  const rows = [];

  for (const definition of definitions) {
    const label = findTextElement(root, definition.labels);
    if (!label) continue;

    const row = findNearestRow(label, root);
    if (!(row instanceof HTMLElement)) continue;

    row.classList.add("merp-ui-resource-row");
    label.classList.add("merp-ui-resource-label");
    label.dataset.merpUiResource = definition.key;

    const valueCandidate = [...row.children].find((child) => {
      return (
        child !== label &&
        !child.contains(label) &&
        child instanceof HTMLElement
      );
    });

    if (valueCandidate instanceof HTMLElement) {
      valueCandidate.classList.add("merp-ui-resource-value");
    }

    rows.push(row);
  }

  if (rows.length < 3) return;

  let commonParent = rows[0].parentElement;
  while (
    commonParent &&
    !rows.every((row) => commonParent.contains(row))
  ) {
    commonParent = commonParent.parentElement;
  }

  if (commonParent instanceof HTMLElement) {
    commonParent.classList.add(
      "merp-ui-primary-resource-stack",
      "merp-ui-actor-header-polish"
    );
  }
}

function tagActorHeaderFields(root) {
  const actorName = findTextElement(root, [
    root.closest?.(".application")?.querySelector?.(".window-title")?.textContent ?? ""
  ]);

  const nameInput = [...root.querySelectorAll('input[type="text"]')].find(
    (input) => input.value === root.closest?.(".application")?.document?.name
  );

  if (nameInput instanceof HTMLElement) {
    nameInput.classList.add("merp-ui-actor-name-field");
  }

  const sizeLabels = ["Minuscule", "Petit", "Moyen", "Grand", "Énorme", "Gigantesque"];
  const sizeField = findTextElement(root, sizeLabels);
  if (sizeField instanceof HTMLElement) {
    sizeField.classList.add("merp-ui-actor-size-field");
  }

  const levelButton = findTextElement(root, ["Changement de Niveau"]);
  if (levelButton instanceof HTMLElement) {
    const button = levelButton.closest("button") ?? levelButton;
    button.classList.add("merp-ui-level-change-button");
  }

  const levelLabel = findTextElement(root, ["Niveau"]);
  if (levelLabel instanceof HTMLElement) {
    levelLabel.classList.add("merp-ui-level-label");
    const row = findNearestRow(levelLabel, root);
    row?.classList?.add("merp-ui-actor-header-polish");
  }

  const xpLabel = findTextElement(root, ["PX"]);
  if (xpLabel instanceof HTMLElement) {
    xpLabel.classList.add("merp-ui-level-label");
  }
}

function tagSupplementaryTraits(root) {
  const heading = findTextElement(root, [
    "Traits supplémentaires",
    "Traits Supplementaires",
    "Additional Traits"
  ]);

  if (!(heading instanceof HTMLElement)) return;

  let section = heading.closest(
    "section, article, fieldset, .panel, .section, .category, .group"
  );

  if (!(section instanceof HTMLElement)) {
    section = heading.parentElement?.parentElement ?? heading.parentElement;
  }

  if (!(section instanceof HTMLElement)) return;

  section.classList.add("merp-ui-supplementary-traits");

  const rows = [...section.querySelectorAll(
    ".form-group, .form-field, .field, .property, .trait, .trait-row, dl > div"
  )];

  for (const row of rows) {
    if (!(row instanceof HTMLElement)) continue;

    const children = [...row.children].filter(
      (child) => child instanceof HTMLElement
    );

    if (children.length < 2) continue;

    row.classList.add("merp-ui-trait-row");
    children[0].classList.add("merp-ui-trait-label");
    children[1].classList.add("merp-ui-trait-value");
  }

  /*
   * Fallback pour les structures sans classes sémantiques :
   * on détecte les couples label/valeur voisins.
   */
  if (!section.querySelector(".merp-ui-trait-row")) {
    const labels = [...section.querySelectorAll("label, dt")];

    for (const label of labels) {
      if (!(label instanceof HTMLElement)) continue;

      const row = findNearestRow(label, section);
      if (!(row instanceof HTMLElement)) continue;

      const children = [...row.children].filter(
        (child) => child instanceof HTMLElement
      );
      if (children.length < 2) continue;

      row.classList.add("merp-ui-trait-row");
      children[0].classList.add("merp-ui-trait-label");
      children[1].classList.add("merp-ui-trait-value");
    }
  }
}

function polishRmuActorFirstPage(app, html) {
  const roots = getApplicationRoots(app, html);

  for (const root of roots) {
    if (!root.classList.contains("merp-ui-actor")) continue;

    root.classList.add("merp-ui-actor-header-polish");
    tagPrimaryResourceStack(root);
    tagActorHeaderFields(root);
    tagSupplementaryTraits(root);
  }
}



let merpRmuLanguageModulePromise = null;

async function requestMerpRmuContentLanguageDirect(value, options = {}) {
  const normalized = value === "en" ? "en" : "fr";

  // Fast path when the content module has already exposed its API.
  const exposed = globalThis.MERPUI?.requestContentLanguage;
  if (typeof exposed === "function") {
    return exposed(normalized, options);
  }

  // Timing-safe path: import the actual content module directly instead of
  // depending on global exposure order between Foundry module entry points.
  merpRmuLanguageModulePromise ??= import(
    "./merp-rmu-content.js"
  );

  const contentModule = await merpRmuLanguageModulePromise;
  const direct = contentModule?.requestMerpRmuContentLanguageChange;
  if (typeof direct !== "function") {
    throw new Error(
      "requestMerpRmuContentLanguageChange() is unavailable from merp-rmu-content.js"
    );
  }

  const result = await direct(normalized, options);
  rerenderSettingsApplications();
  return result;
}

registerSettingsUiLocalizationHooks();

Hooks.once("init", () => {
  registerMerpUiCoreSettings({
    onLanguageChange: (value) => requestMerpRmuContentLanguageDirect(value, {
      notify: true,
      reason: "setting-onchange"
    })
  });
});

Hooks.once("ready", async () => {
  typographyState = await loadPragRoman({ force: true });
  try { await assetCatalog.load(); } catch (error) { console.error(error); }

  globalThis.MERPUI = {
    ...(globalThis.MERPUI ?? {}),
    version: () => "1.6.0-rc.6.1",
    catalog: () => foundry.utils.deepClone(assetCatalog.current()),
    reload: async () => {
      await assetCatalog.load({ refresh: true });
      return foundry.utils.deepClone(assetCatalog.current());
    },
    icon: (query, name = null) => assetCatalog.getIconPath(query, name),
    assetPath: (type, query) => assetCatalog.getAssetPath(type, query),
    dropcap: (letter) => dropcapAsset(letter),
    border: (query) => assetCatalog.getAssetPath("borders", query),
    divider: (query) => assetCatalog.getAssetPath("dividers", query),
    ornament: (query) => assetCatalog.getAssetPath("ornaments", query),
    frame: (query) => assetCatalog.getAssetPath("frames", query),
    parchment: (query) => assetCatalog.getAssetPath("parchment", query),
    find: (type, query) => foundry.utils.deepClone(assetCatalog.findAsset(type, query)),
    search: (query, type = null) => foundry.utils.deepClone(assetCatalog.searchAssets(query, type)),
    category: (type, category) => foundry.utils.deepClone(
      assetCatalog.category(type, category)
    ),
    defaultIconSize: () => game.settings.get(MODULE_ID, "defaultIconSize"),
    contentLanguage: () => contentLanguage(),
    localizeContent: (value, options = {}) => localizeContentValue(value, options),
    loadTypography: (options = {}) => loadPragRoman(options),
    typography: () => foundry.utils.deepClone(typographyState),
    diagnoseTypography: diagnosePragRoman,
    migrateWebP: (options = {}) => migrateWorldIconsToWebp(options),
    previewWebPMigration: () => migrateWorldIconsToWebp({
      dryRun: true,
      force: true,
      notify: false
    })
  };

  console.log(`${MODULE_ID} | Framework 1.2.7 chargé — PragRoman ${typographyState.loaded ? "active" : "en échec"}`);

  if (game.user?.isGM) {
    try {
      await migrateWorldIconsToWebp();
    } catch (error) {
      console.error(`${MODULE_ID} | Échec de la migration WebP`, error);
      ui.notifications.error(
        "MERP UI : la migration WebP a rencontré une erreur. Consultez la console F12."
      );
    }
  }
});


function prepareJournalDropcaps(app, html) {
  if (!game.settings.get(MODULE_ID, "themeEnabled")) return;
  const roots = getApplicationRoots(app, html);
  if (!detectApplicationDocument(app, roots).isJournal) return;
  // L'application complète (et non une partie temporaire) persiste durant
  // les changements de pages V13/V14.
  const applicationRoot = app?.element?.[0] ?? app?.element ??
    roots.find((root) => root.matches?.(".application, .window-app")) ?? roots[0];
  if (applicationRoot instanceof HTMLElement) observeJournalDropcaps(applicationRoot);
}

Hooks.on("renderJournalSheet", applyThemeClass);
Hooks.on("renderJournalEntrySheet", applyThemeClass);
Hooks.on("renderJournalTextPageSheet", applyThemeClass);
Hooks.on("renderJournalSheet", prepareJournalDropcaps);
Hooks.on("renderJournalEntrySheet", prepareJournalDropcaps);
Hooks.on("renderJournalTextPageSheet", prepareJournalDropcaps);
Hooks.on("renderJournalEntryPageTextSheet", prepareJournalDropcaps);

Hooks.on("renderItemSheet", applyThemeClass);

Hooks.on("renderActorSheet", applyThemeClass);
Hooks.on("renderActorSheetV2", applyThemeClass);
Hooks.on("renderCreatureSheet", applyThemeClass);
Hooks.on("renderRMUActorSheet", applyThemeClass);
Hooks.on("renderRMUCharacterSheet", applyThemeClass);
Hooks.on("renderRMUCreatureSheet", applyThemeClass);


Hooks.on("renderApplicationV2", (app, html) => {
  applyThemeClass(app, html);
  prepareJournalDropcaps(app, html);
  scheduleCharacterCreationLocalization(app, html);
});

/* Compatibilité avec les assistants RMU encore fondés sur Application v1. */
Hooks.on("renderApplication", (app, html) => {
  scheduleCharacterCreationLocalization(app, html);
});


Hooks.on("renderApplicationV2", (app, html) => localizeMerpHerbSheet(app, html, getApplicationRoots));
Hooks.on("renderApplication", (app, html) => localizeMerpHerbSheet(app, html, getApplicationRoots));

/**
 * Translate Item sheet chrome in the MERP-RMU content language (FR/EN).
 * This does not depend on the Foundry UI language and never updates Item data.
 */
// RC5: match the main description title to the paragraph font on all eight
// MERP-RMU Skills, while styling intertitles only on the two longer Skills.
// Match known FR/EN headings to leave RMU's other sheet controls alone.
const MERP_SKILL_DESCRIPTION_TITLES = {
  "healing-song-blood": ["Chant du Sang (Blood Songs)", "Blood Songs"],
  "healing-song-bone": ["Chant des Os (Bone Songs)", "Bone Songs"],
  "healing-song-cleansing": ["Chant de Purification (Cleansing Songs)", "Cleansing Songs"],
  "healing-song-muscle": ["Chant des Muscles, Tendons et Ligaments (Muscle/Tendon/Ligament Songs)", "Muscle/Tendon/Ligament Songs"],
  "healing-song-sensory": ["Chant des Sens (Sensory Songs)", "Sensory Songs"],
  "healing-song-strengthening": ["Chant de Fortification (Strengthening Songs)", "Strengthening Songs"],
  "healing-songs": ["Chants de Guérison (Healing Songs)", "Healing Songs"],
  "yavannas-song": ["Chant de Yavanna (Yavanna’s Song)", "Yavanna's Song"]
};
const normalizeMerpSkillHeading = (value) =>
  String(value ?? "").replace(/\s+/g, " ").trim().replace(/[’‘]/g, "'").toLocaleLowerCase();

const MERP_LONG_SKILL_HEADINGS = {
  "healing-songs": new Set([
    "spécialisations", "specializations", "résolution", "resolution",
    "modificateurs", "modifiers", "table des chants de guérison", "healing songs table"
  ]),
  "yavannas-song": new Set([
    "un chant de chœurs", "a song of choirs", "résolution", "resolution",
    "modificateurs", "modifiers", "table du chant de yavanna", "yavanna's song table"
  ])
};

function polishMerpSpecialSkillIntertitles(item, root) {
  if (item?.documentName !== "Item" || item?.type !== "skill" || !root?.querySelectorAll) return 0;
  const flags = item.flags?.["merp-ui"] ?? {};
  const key = flags.compendiumSourceKey ?? flags.key;
  const mainTitles = MERP_SKILL_DESCRIPTION_TITLES[key];
  if (!mainTitles) return 0;
  const mainMatches = new Set(mainTitles.map(normalizeMerpSkillHeading));
  const allowed = MERP_LONG_SKILL_HEADINGS[key];

  let count = 0;
  for (const heading of root.querySelectorAll("h1, h2, h3")) {
    const title = normalizeMerpSkillHeading(heading.textContent);
    const isMainTitle = heading.matches("h1");
    if (isMainTitle ? !mainMatches.has(title) : !allowed?.has(title)) continue;

    // Prefer the nearest rich-text container. Do not use fonts from sheet controls.
    const content = heading.closest(
      ".editor-content, .ProseMirror, .prosemirror, .rmu-prose-editor, .description"
    ) ?? heading.parentElement;
    const paragraph = [...(content?.querySelectorAll("p") ?? [])]
      .find(p => String(p.textContent ?? "").trim().length >= 30);
    if (!paragraph) continue;

    const bodyStyle = getComputedStyle(paragraph);
    const bodyPx = Number.parseFloat(bodyStyle.fontSize);
    if (!Number.isFinite(bodyPx) || bodyPx < 10 || bodyPx > 25) continue;

    // Inline priorities override RMU's editor heading defaults without changing
    // the body text or any stored Skill content, in either content language.
    heading.style.setProperty("font-size", (bodyPx + (isMainTitle ? 4 : 2)).toFixed(1) + "px", "important");
    heading.style.setProperty("font-family", bodyStyle.fontFamily, "important");
    heading.style.setProperty("font-weight", "700", "important");
    heading.style.setProperty("font-variant", "normal", "important");
    heading.style.setProperty("text-transform", "none", "important");
    heading.style.setProperty("letter-spacing", "normal", "important");
    heading.style.setProperty("line-height", "1.25", "important");
    heading.style.setProperty("margin", isMainTitle ? "7px 0 8px" : "10px 0 5px", "important");
    count++;
  }
  return count;
}

function localizeRmuItemSheetChrome(app, html) {
  const roots = getApplicationRoots(app, html);
  const application = detectApplicationDocument(app, roots);
  if (!application.isItem || application.documentName === "Actor" ||
      application.documentName === "JournalEntry" || application.documentName === "JournalEntryPage") return;
  const root = roots.find(element => element.matches?.(".application, .window-app")) ?? roots[0];
  if (!root) return;
  scheduleItemSheetMetadataLocalization(root, contentLanguage, application.document);
  // Item rich-text editors may appear after the initial render.
  const restyle = () => polishMerpSpecialSkillIntertitles(application.document, root);
  requestAnimationFrame(restyle);
  setTimeout(restyle, 140);
  setTimeout(restyle, 420);
}
Hooks.on("renderApplicationV2", localizeRmuItemSheetChrome);
Hooks.on("renderApplication", localizeRmuItemSheetChrome);
Hooks.on("renderItemSheet", localizeRmuItemSheetChrome);

// The MERP-RMU content language is independent from Foundry's UI language.
// Re-translate chrome on already open Item windows after a FR/EN setting switch.
// Existing windows are not reopened and their form values remain untouched.
Hooks.on("updateSetting", (setting) => {
  if (setting?.key !== `${MODULE_ID}.contentLanguage`) return;
  queueMicrotask(() => {
    for (const app of Object.values(ui?.windows ?? {})) {
      const roots = getApplicationRoots(app, app?.element);
      const application = detectApplicationDocument(app, roots);
      if (!application.isItem || application.isActor || application.isJournal) continue;
      const root = roots.find(el => el.matches?.(".application, .window-app")) ?? roots[0];
      if (root) scheduleItemSheetMetadataLocalization(root, contentLanguage, application.document);
    }
  });
});


// RC5 — Apply the Journal-inspired theme only to our own Compendium packs.
function themeMerpCompendiumWindow(app, html) {
  decorateMerpCompendiumBrowser(app, getApplicationRoots(app, html), game?.packs);
}
Hooks.on("renderApplicationV2", themeMerpCompendiumWindow);
Hooks.on("renderApplication", themeMerpCompendiumWindow);
Hooks.on("renderCompendium", themeMerpCompendiumWindow);
