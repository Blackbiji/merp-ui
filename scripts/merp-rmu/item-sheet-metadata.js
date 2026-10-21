/**
 * MERP-UI — bilingual display labels on RMU Item sheets.
 *
 * RMU owns the Item form fields and stores their canonical values. Only the
 * visible text is localized to the selected MERP-RMU content language.
 * Never write to an Item document, input.value, select.value or any data-* key.
 */

const LABELS = {
  "Cat. Compétence": "Skill Category",
  "Catégorie de Compétence": "Skill Category",
  "Caracs. de la Compétence": "Skill Characteristics",
  "Caractéristiques de la Compétence": "Skill Characteristics",
  "Compétence": "Skill",
  "Spécialisation:": "Specialization:",
  "Spécialisation": "Specialization",
  "Catégorie": "Category",
  "Coût en PD": "DP Cost",
  "Coût en points de développement": "Development Point Cost",
  "Coût": "Cost",
  "Description": "Description",
  "Niveau": "Level",
  "Type": "Type",
  "Rang": "Rank",
  "Rangs": "Ranks",
  "Bonus": "Bonus",
  "Poids": "Weight",
  "Quantité": "Quantity",
  "Prix": "Price",
  "Valeur": "Value",
  "Difficulté": "Difficulty",
  "Durée": "Duration",
  "Portée": "Range",
  "Cible": "Target",
  "Cibles": "Targets",
  "Préparation": "Preparation",
  "Saison(s)": "Season(s)",
  "Forme": "Form",
  "Usage": "Use",
  "Trouver": "Find",
  "Talents et Défauts": "Talents & Flaws",
  "Talent": "Talent",
  "Défaut": "Flaw",
  "Automatisation des règles": "Game Automation",
  "Automatisation du jeu": "Game Automation",
  "Modificateur restreint": "Restricted Modifier",
  "Modificateur de restriction": "Restricted Modifier",
  "Non": "No",
  "Oui": "Yes",
  "Aucun": "None",
  "Aucune": "None",
  "Autre": "Other",
  "Autres": "Other"
};

const EN_TO_FR = new Map();
const FR_TO_EN = new Map();
for (const [fr, en] of Object.entries(LABELS)) {
  FR_TO_EN.set(fr.toLocaleLowerCase("fr"), en);
  if (!EN_TO_FR.has(en.toLocaleLowerCase("en"))) {
    EN_TO_FR.set(en.toLocaleLowerCase("en"), fr);
  }
}
// The original English words already used by RMU can be left intact.
const SKIP = "script,style,textarea,input,[contenteditable],[contenteditable='true'],.ProseMirror,.prosemirror,.editor-content,.rmu-prose-editor,.tiptap,.merp-ui-herb-biome-panel";
const NAME = "merp-ui-item-metadata-translated";

export function translateItemSheetLabel(value, lang = "en", categories = null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const normalized = text.toLocaleLowerCase(lang === "en" ? "fr" : "en");
  const map = lang === "en" ? FR_TO_EN : EN_TO_FR;
  const mapped = map.get(normalized) ?? categories?.[lang]?.get(normalized) ?? null;
  return mapped && mapped !== text ? mapped : null;
}

let categoryMapsPromise = null;
export function loadItemSheetCategoryMaps() {
  if (!categoryMapsPromise) {
    const location = "modules/merp-ui/translations/skill-categories/categories.fr.json";
    const path = globalThis.foundry?.utils?.getRoute?.(location) ?? location;
    categoryMapsPromise = fetch(path, {cache:"force-cache"})
      .then(response => {
        if (!response.ok) throw new Error("Cannot load skill category names");
        return response.json();
      })
      .then(data => {
        const en = new Map(), fr = new Map();
        for (const [canonical, entry] of Object.entries(data)) {
          if (canonical === "_meta" || !entry?.name) continue;
          fr.set(canonical.toLocaleLowerCase("en"), entry.name);
          en.set(entry.name.toLocaleLowerCase("fr"), canonical);
          for (const alias of entry.aliases ?? []) {
            if (alias === canonical) continue;
            en.set(alias.toLocaleLowerCase("fr"), canonical);
          }
        }
        return {en, fr};
      })
      .catch(error => {
        console.warn("MERP-UI | Skill-category display translations unavailable", error);
        return {en: new Map(), fr: new Map()};
      });
  }
  return categoryMapsPromise;
}

function originalTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const result = [];
  while (walker.nextNode()) {
    const node = walker.currentNode, parent = node.parentElement;
    if (!parent || parent.closest(SKIP)) continue;
    const text = String(node.nodeValue ?? "").trim();
    // Avoid rewriting any content paragraphs, names and detailed rules.
    if (!text || text.length > 72) continue;
    result.push(node);
  }
  return result;
}

function changeVisibleText(node, language, categories) {
  const original = String(node.nodeValue ?? "");
  const trimmed = original.trim();
  const translated = translateItemSheetLabel(trimmed, language, categories);
  if (!translated) return false;
  const before = original.match(/^\s*/)?.[0] ?? "";
  const after = original.match(/\s*$/)?.[0] ?? "";
  node.nodeValue = before + translated + after;
  return true;
}

function isLabelOrMetadata(node, root) {
  const parent = node.parentElement;
  if (!parent) return false;
  if (parent.matches("label,dt,th,legend,option")) return true;
  if (parent.matches("span,strong,b,div,td,dd,.form-label,.field-label,.label,.value")) {
    // Only operate on short exact labels, not prose in the DESCRIPTION box.
    const sheetDescription = parent.closest(
      ".editor,.editor-container,.description-content,.item-description,.rmu-prose,.rmu-prose-content,[data-tab='description'],[data-group='description']"
    );
    return !sheetDescription;
  }
  return false;
}

/** Translate *displayed* field labels and select options for any RMU Item sheet. */
export function localizeItemSheetMetadata(root, lang = "en", categories = null) {
  if (!root?.querySelectorAll || typeof document === "undefined") return 0;
  const language = lang === "fr" ? "fr" : "en";
  let updated = 0;
  for (const node of originalTextNodes(root)) {
    if (isLabelOrMetadata(node, root) && changeVisibleText(node, language, categories)) {
      updated++;
    }
  }
  // Select-option text is localized without altering the value submitted to RMU.
  for (const option of root.querySelectorAll("select option")) {
    const label = translateItemSheetLabel(option.textContent, language, categories);
    if (label && option.textContent !== label) {
      option.textContent = label;
      updated++;
    }
  }
  if (updated) root.classList?.add(NAME);
  return updated;
}

const OBSERVERS = new WeakMap();
const PENDING = new WeakSet();
export function scheduleItemSheetMetadataLocalization(root, getLanguage) {
  if (!root?.querySelectorAll) return;
  const translate = async () => {
    const language = getLanguage() === "fr" ? "fr" : "en";
    const categories = await loadItemSheetCategoryMaps();
    if (!root.isConnected) return;
    localizeItemSheetMetadata(root, language, categories);
  };
  const apply = () => translate().catch(error =>
    console.warn("MERP-UI | Item sheet labels could not be localized", error)
  );
  apply();

  if (!OBSERVERS.has(root) && typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(() => {
      if (PENDING.has(root)) return;
      PENDING.add(root);
      requestAnimationFrame(() => {
        PENDING.delete(root);
        apply();
      });
    });
    observer.observe(root, {childList:true, subtree:true});
    OBSERVERS.set(root, observer);
  }
}
