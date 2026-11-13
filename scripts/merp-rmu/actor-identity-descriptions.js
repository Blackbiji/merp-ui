/**
 * MERP-UI — Race, Culture and Profession descriptions on finished RMU Actors.
 * Read-only, on-demand access to MERP compendiums. Never caches large texts
 * in the Actor or changes game rules / the Actor's embedded Item documents.
 * Foundry V14 / RMU 1.4.99, validated by the author.
 */
import { contentLanguage } from "./localization.js";

const MODULE_ID = "merp-ui";
const TYPES = Object.freeze({
  race: { pack: "merp-ui.merp-rmu-races", fr: "Race", en: "Race" },
  culture: { pack: "merp-ui.merp-rmu-cultures", fr: "Culture", en: "Culture" },
  profession: { pack: "merp-ui.merp-rmu-professions", fr: "Profession", en: "Profession" }
});
const TOOLBAR_CLASS = "merp-ui-identity-reference-links";
const STYLE_ID = "merp-ui-identity-reference-style";
function attachStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const link = document.createElement("link");
  link.id = STYLE_ID;
  link.rel = "stylesheet";
  const route = "modules/merp-ui/styles/merp-rmu-identity-reference.css";
  link.href = foundry?.utils?.getRoute?.(route) ?? `/${route}`;
  document.head.append(link);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", attachStyle, { once: true });
} else attachStyle();

function lang() { return contentLanguage() === "fr" ? "fr" : "en"; }
function getRoot(app, html) {
  // ApplicationV2 render hooks can pass partial content. Prefer the full app.
  const element = app?.element?.[0] ?? app?.element;
  const supplied = html?.[0] ?? html;
  const candidate = element instanceof HTMLElement ? element : supplied;
  if (!(candidate instanceof HTMLElement)) return null;
  return candidate.closest(".application, .window-app") ?? candidate;
}
function getActor(app) {
  const doc = app?.actor ?? app?._actor ?? app?.document ?? app?.object;
  return doc?.documentName === "Actor" && String(doc.type).toLowerCase() === "character" ? doc : null;
}
function cleanKey(value) { return String(value ?? "").trim().toLocaleLowerCase(); }
function ageFor(item) {
  const selected = Number(item.flags?.[MODULE_ID]?.selectedCampaignAge ?? 0);
  if (selected >= 1 && selected <= 4) return String(selected);
  try {
    const configured = Number(game.settings.get(MODULE_ID, "campaignAge"));
    return configured >= 1 && configured <= 4 ? String(configured) : "3";
  } catch { return "3"; }
}
function readableText(value) {
  return typeof value === "string" ? value.trim() : "";
}
function localizedSummary(base, localized, language) {
  const patch = localized?.[language] ?? {};
  return {
    title: readableText(patch?.name) || readableText(base?.name),
    description: readableText(patch?.system?.description) || readableText(base?.system?.description)
  };
}
function itemOrigin(item) {
  const sources = [
    item?._stats?.compendiumSource,
    item?.flags?.core?.sourceId,
    item?.flags?.rmu?.origin?.uuid
  ];
  return sources.find(s => typeof s === "string" && s.startsWith("Compendium.merp-ui.")) ?? null;
}
function isMerpManaged(item) {
  const flags = item.flags?.[MODULE_ID] ?? {};
  return Boolean(flags.compendiumPack || flags.compendiumSourceKey || itemOrigin(item));
}
async function getCompendiumDoc(item, type) {
  if (!isMerpManaged(item)) return null;
  const configuration = TYPES[type];
  const pack = game.packs.get(configuration.pack);
  if (!pack) return null;

  const uuid = itemOrigin(item);
  if (uuid?.startsWith(`Compendium.${configuration.pack}.`)) {
    try {
      const source = await fromUuid(uuid);
      if (source?.type === item.type) return source;
    } catch (error) {
      console.debug("merp-ui | Impossible de résoudre l'UUID de référence", error);
    }
  }

  const flags = item.flags?.[MODULE_ID] ?? {};
  const sourceKey = cleanKey(flags.compendiumSourceKey || flags.canonicalKey || flags.key);
  const index = await pack.getIndex({
    fields: ["flags.merp-ui.compendiumSourceKey", "flags.merp-ui.canonicalKey", "flags.merp-ui.key"]
  });
  const entries = [...index.values()];
  let found = null;
  if (sourceKey) {
    found = entries.find(row => {
      const meta = row.flags?.[MODULE_ID] ?? {};
      return [meta.compendiumSourceKey, meta.canonicalKey, meta.key,
        row["flags.merp-ui.compendiumSourceKey"]]
        .some(candidate => cleanKey(candidate) === sourceKey);
    });
  }
  if (!found) {
    const name = cleanKey(item.name);
    found = entries.find(row => row.type === type && cleanKey(row.name) === name);
  }
  return found?._id ? await pack.getDocument(found._id) : null;
}

async function descriptionFor(item, type) {
  const language = lang();
  const age = ageFor(item);
  const doc = await getCompendiumDoc(item, type);
  if (doc) {
    const flags = doc.flags?.[MODULE_ID] ?? {};
    const variants = flags.compendiumAgeVariants;
    if (variants && Object.keys(variants).length) {
      const variant = variants[age];
      if (!variant?.document) {
        return { title: doc.name, age, language, description: "", ageUnavailable: true };
      }
      const result = localizedSummary(variant.document, variant.localizations, language);
      return { ...result, age, language, source: "compendium" };
    }
    const result = localizedSummary(doc, flags.compendiumLocalizations, language);
    return { ...result, age, language, source: "compendium" };
  }

  // RMU-native fallback or a missing/permission-restricted MERP compendium.
  return {
    title: item.name,
    description: readableText(item.system?.description),
    age,
    language,
    source: "embedded"
  };
}

async function showDescription(actor, type) {
  const item = actor.items?.find(x => String(x.type).toLowerCase() === type);
  if (!item) return;
  const language = lang();
  const isFr = language === "fr";
  const label = TYPES[type][language];
  try {
    const reference = await descriptionFor(item, type);
    if (reference.ageUnavailable) {
      ui.notifications.warn(isFr
        ? `${label} : description indisponible pour le ${reference.age}e Âge.`
        : `${label}: no description for Age ${reference.age}.`);
      return;
    }
    if (!reference.description) {
      ui.notifications.info(isFr
        ? `${label} : aucun texte descriptif disponible pour « ${item.name} ».`
        : `${label}: no description available for “${item.name}”.`);
      return;
    }
    const title = `${label} — ${reference.title || item.name}`;
    const note = isFr
      ? `Lecture de référence · ${reference.age}e Âge · ${language.toUpperCase()}`
      : `Reference reading · Age ${reference.age} · ${language.toUpperCase()}`;
    const escape = s => String(s).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
    const content = `<div class="merp-ui-identity-reference-body">
      <p class="merp-ui-identity-reference-meta">${escape(note)}</p>
      <div class="merp-ui-identity-reference-text">${reference.description}</div>
    </div>`;
    new foundry.applications.api.DialogV2({
      window: { title },
      classes: ["merp-ui-identity-reference-dialog"],
      position: { width: 830, height: 650 },
      content,
      buttons: [{ action: "close", label: isFr ? "Fermer" : "Close", default: true }]
    }).render({ force: true });
  } catch (error) {
    console.error(`merp-ui | Lecture ${type} impossible`, error);
    ui.notifications.error(isFr
      ? `${label} : impossible de charger la description (voir F12).`
      : `${label}: unable to load description (see F12).`);
  }
}

function placeToolbar(root, toolbar) {
  // Never insert into the Foundry V14 title bar.
  const content = root.matches(".window-content")
    ? root
    : root.querySelector(".window-content");
  if (!(content instanceof HTMLElement)) return false;
  const navigation = content.querySelector(".rmu-navigation");
  const sheetHeader = content.querySelector(
    ".sheet-header, .rmu-actor-header, .rmu-sheet-header"
  );
  if (navigation && !navigation.closest(".window-header")) {
    navigation.insertAdjacentElement("beforebegin", toolbar);
  } else if (sheetHeader && !sheetHeader.closest(".window-header")) {
    sheetHeader.insertAdjacentElement("afterend", toolbar);
  } else {
    content.prepend(toolbar);
  }
  return true;
}

function installLinks(app, html) {
  const actor = getActor(app);
  const root = getRoot(app, html);
  if (!actor || !root || game.system?.id !== "rmu") return;
  const present = Object.keys(TYPES).filter(type =>
    actor.items?.some(item => String(item.type).toLowerCase() === type)
  );
  if (!present.length) return;
  const existing = root.querySelector(`.${TOOLBAR_CLASS}`);
  if (existing) {
    placeToolbar(root, existing);
    return;
  }

  const toolbar = document.createElement("div");
  toolbar.className = TOOLBAR_CLASS;
  toolbar.setAttribute("role", "group");
  toolbar.setAttribute("aria-label", lang() === "fr" ? "Descriptions du personnage" : "Character descriptions");

  for (const type of present) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "merp-ui-identity-reference-button";
    button.setAttribute("aria-label", lang() === "fr"
      ? `Lire la description : ${TYPES[type].fr}`
      : `Read description: ${TYPES[type].en}`);
    button.title = button.getAttribute("aria-label");
    const icon = document.createElement("i");
    icon.className = "fa-solid fa-book-open";
    icon.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.textContent = TYPES[type][lang()];
    button.append(icon, text);
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      showDescription(actor, type);
    });
    toolbar.append(button);
  }
  placeToolbar(root, toolbar);
}

Hooks.on("renderApplicationV2", installLinks);
Hooks.on("renderActorSheet", installLinks);
