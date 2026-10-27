/**
 * RC5 — independent recovery of the validated MERP-RMU Compendium appearance.
 *
 * The original decorator in compendium-browser-theme.js is deliberately
 * left untouched. MERP-RMU's content entry point is already initialized in
 * installations where the visual entry point fails, so it can provide a
 * fallback for the parchment, Minas Tirith banner, and folder styling.
 * This code does not update documents, packs, languages, or game settings.
 */
import { decorateMerpCompendiumBrowser } from "./compendium-browser-theme.js";

function rootsFor(app, html) {
  const roots = new Set();
  const collect = (value) => {
    if (value?.nodeType === 1) roots.add(value);
    if (value?.[0]?.nodeType === 1) roots.add(value[0]);
    if (value?.element?.nodeType === 1) roots.add(value.element);
    // RMU render hooks may pass only the inner form, while the visible title
    // and frame headings live in the surrounding Foundry application.
    const element = value?.[0]?.nodeType === 1 ? value[0] : value;
    const window = element?.closest?.(".application, .window-app");
    if (window?.nodeType === 1) roots.add(window);
  };
  collect(html);
  collect(app?.element);
  const id = app?.id ?? app?.options?.id;
  if (typeof id === "string") collect(globalThis.document?.getElementById?.(id));
  return [...roots];
}

export function applyMerpCompendiumAppearance(app, html = null) {
  if (!app) return false;
  return decorateMerpCompendiumBrowser(app, rootsFor(app, html), globalThis.game?.packs);
}

let initialized = false;
export function installMerpCompendiumAppearanceRecovery() {
  if (initialized) return false;
  initialized = true;

  installItemLabelFallback();

  const apply = (app, html) => {
    if (!applyMerpCompendiumAppearance(app, html)) return;
    // Keep styling when Foundry V14 replaces the outer window DOM.
    globalThis.queueMicrotask?.(() => applyMerpCompendiumAppearance(app));
    globalThis.requestAnimationFrame?.(() => applyMerpCompendiumAppearance(app));
  };

  Hooks.on("renderApplicationV2", apply);
  Hooks.on("renderApplication", apply);
  Hooks.on("renderCompendium", apply);
  Hooks.once("ready", () => {
    for (const app of Object.values(globalThis.ui?.windows ?? {})) apply(app);
  });
  return true;
}


// RC5: Independent, display-only Item sheet translation fallback.
// The theme recovery above must remain operational even if translation fails.
// This uses existing MERP-UI dictionaries and never writes Item documents.
let itemTranslationServices = null;
function getItemTranslationServices() {
  if (!itemTranslationServices) {
    itemTranslationServices = Promise.all([
      import("./item-sheet-metadata.js"),
      import("./localization.js")
    ]).then(([labels, localization]) => ({
      translate: labels.scheduleItemSheetMetadataLocalization,
      getLanguage: localization.contentLanguage
    }));
  }
  return itemTranslationServices;
}

const ITEM_TITLE_PATTERN = /^\s*(?:Profession|Skill|Compétence|Race|Culture|Herbe|Herb|Liste de Sorts|Spell List|Talent|Défaut|Flaw)\s*:/iu;
function itemForSheet(app) {
  const candidates = [
    app?.document, app?.item, app?.object,
    app?.options?.document, app?.options?.item,
    app?.options?.object, app?.model?.document
  ];
  return candidates.find(candidate =>
    candidate?.documentName === "Item" ||
    candidate?.constructor?.documentName === "Item"
  ) ?? null;
}
function translateItemWindow(app, html = null) {
  const roots = rootsFor(app, html);
  const windowRoot = roots.find(element => element.matches?.(".application, .window-app"))
    ?? roots.find(element => element.querySelector?.(".window-header .window-title"))
    ?? roots[0];
  if (!windowRoot) return;
  const item = itemForSheet(app);
  const heading = windowRoot.querySelector?.(".window-header .window-title, header.window-header .window-title");
  // When RMU wraps its sheets, the Item may not be exposed on app.document.
  // Translate only a known Item-window header; never generic Foundry windows.
  if (!item && !ITEM_TITLE_PATTERN.test(String(heading?.textContent ?? ""))) return;

  getItemTranslationServices().then(({translate, getLanguage}) => {
    const apply = () => {
      // Re-evaluate the current DOM root: V2 replaces its element during render.
      const current = rootsFor(app, null);
      const root = current.find(element => element.matches?.(".application, .window-app"))
        ?? current.find(element => element.querySelector?.(".window-header .window-title"))
        ?? windowRoot;
      if (root.isConnected) translate(root, getLanguage, item);
    };
    apply();
    // Foundry can fire a render hook before its form has been attached. The
    // previous fallback silently skipped it. Retry after attachment, bounded.
    globalThis.requestAnimationFrame?.(apply);
    globalThis.setTimeout?.(apply, 120);
    globalThis.setTimeout?.(apply, 450);
  }).catch(error => console.warn("MERP-UI | Item label fallback unavailable", error));
}

function installItemLabelFallback() {
  // Independent from the visual entry point; deliberately do not rerender sheets.
  Hooks.on("renderApplicationV2", translateItemWindow);
  Hooks.on("renderApplication", translateItemWindow);
  Hooks.on("renderItemSheet", translateItemWindow);
  Hooks.on("updateSetting", setting => {
    if (setting?.key !== "merp-ui.contentLanguage") return;
    globalThis.queueMicrotask?.(() => {
      for (const app of Object.values(globalThis.ui?.windows ?? {})) {
        translateItemWindow(app);
      }
    });
  });
}
