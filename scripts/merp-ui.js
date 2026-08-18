import { resolveSharedSkill, resolveSharedSkillCategory, loadSharedSkillRegistry, loadSharedSkillCategoryRegistry } from "./skill-registry.js";
import { contentLanguage, localizeContentValue } from "./merp-rmu/localization.js";
import { registerSettingsUiLocalizationHooks, rerenderSettingsApplications } from "./merp-rmu/settings-ui-localization.js";

const MODULE_ID = "merp-ui";
const CATALOG_PATH = `modules/${MODULE_ID}/assets/catalog.json`;

let catalog = null;
let typographyState = { family: "PragRoman", source: null, loaded: false };

async function resolvePragRomanUrl() {
  const path = `modules/${MODULE_ID}/fonts/PragRoman.ttf?v=1.6.0-rc.1`;
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

async function loadCatalog({ refresh = false } = {}) {
  if (catalog && !refresh) return catalog;
  const route = foundry?.utils?.getRoute ? foundry.utils.getRoute(CATALOG_PATH) : CATALOG_PATH;
  const response = await fetch(route, { cache: refresh ? "no-store" : "default" });
  if (!response.ok) throw new Error(`Catalogue MERP UI introuvable : HTTP ${response.status}`);
  catalog = await response.json();
  return catalog;
}


function getAssetPath(type, query) {
  return findAsset(type, query)?.path ?? null;
}

function getIconPath(categoryOrQuery, optionalName = null) {
  if (optionalName === null) {
    return getAssetPath("icons", categoryOrQuery);
  }

  const category = String(categoryOrQuery ?? "").trim().toLowerCase();
  const name = String(optionalName ?? "").trim().toLowerCase();

  const asset = (catalog?.assets?.icons ?? []).find((entry) => {
    return (
      String(entry.category ?? "").toLowerCase() === category &&
      (
        String(entry.name ?? "").toLowerCase() === name ||
        String(entry.key ?? "").toLowerCase() === name
      )
    );
  });

  return asset?.path ?? null;
}

function findAsset(type, query) {
  const assets = catalog?.assets?.[type] ?? [];
  const term = String(query ?? "").trim().toLowerCase();
  return assets.find((asset) => {
    const values = [asset.name, asset.key, asset.category, ...(asset.tags ?? [])]
      .filter(Boolean).map((value) => String(value).toLowerCase());
    return values.some((value) => value === term || value.includes(term));
  }) ?? null;
}

function searchAssets(query, type = null) {
  const term = String(query ?? "").trim().toLowerCase();
  const groups = type ? [type] : Object.keys(catalog?.assets ?? {});
  return groups.flatMap((group) =>
    (catalog?.assets?.[group] ?? [])
      .filter((asset) => {
        const values = [asset.name, asset.key, asset.category, ...(asset.tags ?? [])]
          .filter(Boolean).map((value) => String(value).toLowerCase());
        return values.some((value) => value.includes(term));
      })
      .map((asset) => ({ ...asset, type: group }))
  );
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

function normalizeProfessionSkillMarkers(root) {
  if (!(root instanceof HTMLElement)) return;

  for (const marker of root.querySelectorAll("span.rmu-profession-skill-marker")) {
    marker.textContent = "Comp. profess.";
    marker.setAttribute("aria-label", "Compétence professionnelle");
    marker.title = "Compétence professionnelle";
  }
}

function applyThemeClass(app, html) {
  if (!game.settings.get(MODULE_ID, "themeEnabled")) return;

  const roots = getApplicationRoots(app, html);
  const detection = detectApplicationDocument(app, roots);

  if (!detection.isActor && !detection.isJournal && !detection.isItem) return;

  for (const root of roots) {
    root.classList.add("merp-ui");
    normalizeProfessionSkillMarkers(root);

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
        normalizeProfessionSkillMarkers(root);
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
  const hasCreationTerms = /(Race|Culture|Profession|Development Points|Points de Développement)/i.test(text);
  const hasSkillTerms = /(Skill Category|Professional Skills|Compétences professionnelles|Combat Training)/i.test(text);
  return hasCreationTerms && hasSkillTerms;
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
  if (game.i18n?.lang && !String(game.i18n.lang).toLowerCase().startsWith("fr")) return;
  if (!isLikelyCharacterCreationApplication(app, root)) return;

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
    for (const o of [...placeholder, ...sortable]) select.append(o);
  }

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

function normalizeAssetPath(path) {
  return String(path ?? "")
    .replace(/^\/+/, "")
    .split(/[?#]/, 1)[0]
    .toLowerCase();
}

function buildWebpIconMigrationMap() {
  const map = new Map();

  for (const asset of catalog?.assets?.icons ?? []) {
    const webpPath = String(asset.path ?? "");
    if (!webpPath.toLowerCase().endsWith(".webp")) continue;

    const legacyPath = webpPath.replace(/\.webp$/i, ".png");
    map.set(normalizeAssetPath(legacyPath), webpPath);
  }

  return map;
}

function replaceLegacyIconPaths(value, migrationMap, stats) {
  if (typeof value !== "string" || !value.toLowerCase().includes(".png")) {
    return value;
  }

  return value.replace(
    /\/?modules\/merp-ui\/assets\/icons\/[^"'()<>\s]+?\.png(?:\?[^"'()<>\s]*)?(?:#[^"'()<>\s]*)?/gi,
    (matchedPath) => {
      const leadingSlash = matchedPath.startsWith("/");
      const suffixMatch = matchedPath.match(/([?#].*)$/);
      const suffix = suffixMatch?.[1] ?? "";
      const pathWithoutSuffix = matchedPath.replace(/[?#].*$/, "");
      const normalized = normalizeAssetPath(pathWithoutSuffix);
      const replacement = migrationMap.get(normalized);

      if (!replacement) {
        stats.unmatchedPaths.add(pathWithoutSuffix);
        return matchedPath;
      }

      stats.pathsChanged += 1;
      return `${leadingSlash ? "/" : ""}${replacement}${suffix}`;
    }
  );
}

function migrateValueDeep(value, migrationMap, stats) {
  if (typeof value === "string") {
    const replaced = replaceLegacyIconPaths(value, migrationMap, stats);
    return { value: replaced, changed: replaced !== value };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const result = value.map((entry) => {
      const migrated = migrateValueDeep(entry, migrationMap, stats);
      changed ||= migrated.changed;
      return migrated.value;
    });
    return { value: result, changed };
  }

  if (value && typeof value === "object") {
    let changed = false;
    const result = {};

    for (const [key, entry] of Object.entries(value)) {
      const migrated = migrateValueDeep(entry, migrationMap, stats);
      changed ||= migrated.changed;
      result[key] = migrated.value;
    }

    return { value: result, changed };
  }

  return { value, changed: false };
}

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

  if (!catalog) {
    await loadCatalog();
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

  const migrationMap = buildWebpIconMigrationMap();
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
  game.settings.register(MODULE_ID, "contentLanguage", {
    name: "MERPUI.Settings.ContentLanguage.Name",
    hint: "MERPUI.Settings.ContentLanguage.Hint",
    scope: "world", config: true, type: String,
    choices: {
      fr: "Français",
      en: "English"
    },
    default: "en",
    requiresReload: false,
    onChange: (value) => {
      queueMicrotask(async () => {
        try {
          await requestMerpRmuContentLanguageDirect(value, {
            notify: true,
            reason: "setting-onchange"
          });
        } catch (error) {
          console.error("merp-ui | Unable to apply content language", error);
          ui.notifications.error(
            "MERP UI : impossible d’appliquer immédiatement la langue choisie. Consultez la console F12."
          );
        }
      });
    }
  });
  game.settings.register(MODULE_ID, "themeEnabled", {
    name: "MERPUI.Settings.ThemeEnabled.Name",
    hint: "MERPUI.Settings.ThemeEnabled.Hint",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MODULE_ID, "defaultIconSize", {
    name: "MERPUI.Settings.DefaultIconSize.Name",
    hint: "MERPUI.Settings.DefaultIconSize.Hint",
    scope: "world", config: true, type: Number, default: 48
  });
  game.settings.register(MODULE_ID, "webpMigrationVersion", {
    name: "Version de migration WebP",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
});


Hooks.once("ready", async () => {
  typographyState = await loadPragRoman({ force: true });
  try { await loadCatalog(); } catch (error) { console.error(error); }

  globalThis.MERPUI = {
    ...(globalThis.MERPUI ?? {}),
    version: () => "1.6.0-rc.1",
    catalog: () => foundry.utils.deepClone(catalog),
    reload: async () => {
      await loadCatalog({ refresh: true });
      return foundry.utils.deepClone(catalog);
    },
    icon: (query, name = null) => getIconPath(query, name),
    assetPath: (type, query) => getAssetPath(type, query),
    dropcap: (letter) => findAsset("dropcaps", String(letter).toUpperCase())?.path ?? null,
    border: (query) => findAsset("borders", query)?.path ?? null,
    divider: (query) => findAsset("dividers", query)?.path ?? null,
    ornament: (query) => findAsset("ornaments", query)?.path ?? null,
    frame: (query) => findAsset("frames", query)?.path ?? null,
    parchment: (query) => findAsset("parchment", query)?.path ?? null,
    find: (type, query) => foundry.utils.deepClone(findAsset(type, query)),
    search: (query, type = null) => foundry.utils.deepClone(searchAssets(query, type)),
    category: (type, category) => foundry.utils.deepClone(
      (catalog?.assets?.[type] ?? []).filter((asset) => asset.category === category)
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


Hooks.on("renderJournalSheet", applyThemeClass);
Hooks.on("renderJournalEntrySheet", applyThemeClass);
Hooks.on("renderJournalTextPageSheet", applyThemeClass);
Hooks.on("renderItemSheet", applyThemeClass);

Hooks.on("renderActorSheet", applyThemeClass);
Hooks.on("renderActorSheetV2", applyThemeClass);
Hooks.on("renderCreatureSheet", applyThemeClass);
Hooks.on("renderRMUActorSheet", applyThemeClass);
Hooks.on("renderRMUCharacterSheet", applyThemeClass);
Hooks.on("renderRMUCreatureSheet", applyThemeClass);


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

const HERB_SEASONS = {
  fr: new Map([
    ["Spring", "Printemps"], ["Summer", "Été"], ["Autumn", "Automne"], ["Winter", "Hiver"],
    ["Printemps", "Printemps"], ["Été", "Été"], ["Automne", "Automne"], ["Hiver", "Hiver"],
    ["All Year", "Toute l’année"], ["Year-round", "Toute l’année"], ["Toute l’année", "Toute l’année"]
  ]),
  en: new Map([
    ["Printemps", "Spring"], ["Été", "Summer"], ["Automne", "Autumn"], ["Hiver", "Winter"],
    ["Spring", "Spring"], ["Summer", "Summer"], ["Autumn", "Autumn"], ["Winter", "Winter"],
    ["Toute l’année", "All Year"], ["All Year", "All Year"], ["Year-round", "All Year"]
  ])
};

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
    ["Bats","Chauves-souris"],["Scorpion","Scorpion"],["Spider","Araignée"],["Clams","Palourdes"],["Gas","Gaz"]
  ]),
  en: new Map([
    ["Fleur","Flower"],["Feuille","Leaf"],["Feuilles","Leaves"],["Racine","Root"],["Racine / Feuille","Root/Leaf"],
    ["Baie","Berry"],["Baies","Berries"],["Mousse","Moss"],["Champignon","Mushroom"],["Fruit","Fruit"],
    ["Lichen","Lichen"],["Gousse","Clove"],["Noix","Nut"],["Nodule","Nodule"],["Algue","Algae"],["Tige","Stem"],
    ["Roseau","Reed"],["Herbe","Grass"],["Nectar","Nectar"],["Graines","Seeds"],["Graine","Seed"],["Résine","Resin"],
    ["Pétale","Petal"],["Épine","Thorn"],["Fleurs","Flowers"],["Bourgeon","Bud"],["Mélange","Mixture"],["Pâte","Paste"],
    ["Liquide","Liquid"],["Bulbe","Bulb"],["Cône","Cone"],["Jus","Juice"],["Cactus","Cactus"],["Gland","Acorn"],
    ["Pollen","Pollen"],["Sang","Blood"],["Cristal","Crystal"],["Écorce","Bark"],["Crapaud","Toad"],["Chauve-souris","Bat"],
    ["Chauves-souris","Bats"],["Scorpion","Scorpion"],["Araignée","Spider"],["Palourdes","Clams"],["Gaz","Gas"]
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

function localizeHerbOption(option, map) {
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
  const translated = byValue ?? byText;
  if (translated) option.textContent = translated;
}

function localizeMerpHerbSheet(app, html) {
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
      for (const option of options) localizeHerbOption(option, map);

      // Force the closed select to repaint its newly localized selected option.
      const value = select.value;
      select.value = value;
    }
  }
}

Hooks.on("renderApplicationV2", (app, html) => {
  applyThemeClass(app, html);
  scheduleCharacterCreationLocalization(app, html);
});

/* Compatibilité avec les assistants RMU encore fondés sur Application v1. */
Hooks.on("renderApplication", (app, html) => {
  scheduleCharacterCreationLocalization(app, html);
});


Hooks.on("renderApplicationV2", (app, html) => localizeMerpHerbSheet(app, html));
Hooks.on("renderApplication", (app, html) => localizeMerpHerbSheet(app, html));
