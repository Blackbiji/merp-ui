/**
 * MERP-UI 2.0.8 — compact Actor Talent/Flaw descriptions.
 * Loaded by the existing MERP-UI entry point (scripts/merp-ui.js).
 * RMU edit controls, costs, Actor and Item documents remain untouched.
 */
import { contentLanguage } from "./localization.js";

const SOURCE = ".rmu-talent-desc-row > .rmu-talent-desc";
const API_NAME = "__MERP_UI_TALENT_SHEET_TEST__";
const INSTALL_NAME = "__MERP_UI_TALENTS_208B_INSTALLED__";
const ENHANCED = "merp-ui-talent-enhanced";
const EXPANDED = "merp-ui-talent-expanded";
const ORIGINAL = "merp-ui-talent-original";
const VERSION = "2.0.8";

function compact(text) { return String(text ?? "").replace(/\s+/g, " ").trim(); }
export function excerpt(text, limit = 150) {
  const value = compact(text);
  if (value.length <= limit) return value;
  const cut = value.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return cut.slice(0, lastSpace > limit * .7 ? lastSpace : limit).trimEnd() + "…";
}
export function labels(lang) {
  return lang === "fr"
    ? { read: "Lire la description", close: "Réduire", preview: "Aperçu du Talent ou du Défaut" }
    : { read: "Read description", close: "Show less", preview: "Talent or Flaw preview" };
}
function put(el, key, value) {
  if (el.style.getPropertyValue(key) !== value || el.style.getPropertyPriority(key) !== "important")
    el.style.setProperty(key, value, "important");
}
function normalize(el) {
  const font = '"PragRoman", Georgia, serif';
  put(el, "font-family", font);
  put(el, "font-size", "13px");
  put(el, "line-height", "1.3");
  for (const node of el.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li,blockquote,div,span,strong,b,em")) {
    if (node.closest(".merp-ui-talent-preview, .merp-ui-talent-toggle")) continue;
    put(node, "font-family", font);
    put(node, "font-size", "13px");
    put(node, "line-height", "1.3");
    put(node, "text-shadow", "none");
    if (node.matches("h1,h2,h3,h4,h5,h6")) {
      put(node, "margin-top", "3px");
      put(node, "margin-bottom", "2px");
      put(node, "padding", "0px");
    } else if (node.matches("p")) {
      put(node, "margin-top", "2px");
      put(node, "margin-bottom", "4px");
    }
  }
}
function firstPreview(el) {
  const first = [...el.querySelectorAll("p")].find(p => {
    const s = compact(p.textContent);
    return s.length > 20 && !/^(no tiers|aucun rang)\b/i.test(s);
  });
  return excerpt(first?.textContent ?? el.textContent);
}
function addPreview(el) {
  const phrases = labels(contentLanguage());
  if (el.classList.contains(ENHANCED)) {
    const button = el.querySelector(":scope > .merp-ui-talent-toggle");
    if (button) {
      const label = el.classList.contains(EXPANDED) ? phrases.close : phrases.read;
      if (button.textContent !== label) button.textContent = label;
    }
    normalize(el);
    return;
  }
  const long = compact(el.textContent).length >= 100 || el.querySelectorAll("h1,h2,h3,h4,p").length >= 3;
  if (!long) {
    el.classList.add(ENHANCED);
    normalize(el);
    return;
  }
  const summary = firstPreview(el);
  const original = [...el.childNodes];
  for (const node of original) {
    if (node.nodeType === 1) {
      // Preserve any native control in a description cell.
      if (node.matches("a,button,input,[data-action]")) continue;
      node.classList.add(ORIGINAL);
    } else if (node.nodeType === 3 && compact(node.textContent)) {
      const wrapper = document.createElement("span");
      wrapper.className = ORIGINAL;
      node.replaceWith(wrapper);
      wrapper.append(node);
    }
  }
  const preview = document.createElement("div");
  preview.className = "merp-ui-talent-preview";
  preview.textContent = summary;
  preview.setAttribute("aria-label", phrases.preview);
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "merp-ui-talent-toggle";
  toggle.textContent = phrases.read;
  toggle.setAttribute("aria-expanded", "false");
  toggle.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    const expanded = el.classList.toggle(EXPANDED);
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.textContent = expanded ? labels(contentLanguage()).close : labels(contentLanguage()).read;
  });
  el.classList.add(ENHANCED);
  el.prepend(preview);
  el.append(toggle);
  normalize(el);
}
export function scanTalents(root = document) {
  let found = 0;
  let enhanced = 0;
  for (const el of root.querySelectorAll(SOURCE)) {
    if (el.closest(".rmu-character-creation-main")) continue;
    if (el.querySelector("textarea, [contenteditable='true'], .ProseMirror")) continue;
    found++;
    addPreview(el);
    if (el.classList.contains(ENHANCED)) enhanced++;
  }
  return { found, enhanced };
}
function status() {
  return {
    version: VERSION,
    installed: true,
    found: document.querySelectorAll(SOURCE).length,
    enhanced: document.querySelectorAll(`${SOURCE}.${ENHANCED}`).length,
    previewButtons: document.querySelectorAll(`${SOURCE} > .merp-ui-talent-toggle`).length,
  };
}

// A previous local test patch may also import this file from the manifest.
// The guard ensures a single observer and set of hooks.
if (!globalThis[INSTALL_NAME]) {
  const api = { version: VERSION, inspect: status, refresh: () => scanTalents(document) };
  globalThis[INSTALL_NAME] = api;
  globalThis[API_NAME] = api; // Console inspection remains available after release.
  let pending = false;
  let observer;
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      scanTalents(document);
    });
  }
  function observe() {
    if (observer || !document.body) return;
    observer = new MutationObserver(mutations => {
      if (mutations.some(m => {
        if (m.type === "attributes") return Boolean(m.target?.closest?.(SOURCE));
        return [...m.addedNodes].some(n => n.nodeType === 1 &&
          (n.matches?.(SOURCE) || n.querySelector?.(SOURCE)));
      })) schedule();
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["style"] });
    schedule();
  }
  Hooks.on("renderApplicationV2", schedule);
  Hooks.on("renderActorSheet", schedule);
  Hooks.on("renderApplication", schedule);
  if (game.ready) observe();
  else Hooks.once("ready", observe);
}
