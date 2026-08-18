import { contentLanguage } from "./localization.js";

const MODULE_ID = "merp-ui";

const TEXT = {
  en: {
    contentLanguage: ["MERP-RMU Content Language", "Selects the language used by MERP-RMU editorial content. Changes are applied immediately."],
    themeEnabled: ["Enable MERP UI theme", "Applies PragRoman and the MERP layout to Journals, Actors and Items."],
    defaultIconSize: ["Default MERP icon size", "Default size used for MERP icons."],
    campaignAge: ["MERP-RMU — Campaign Age", "Determines the age-specific variant applied when a MERP-RMU Race or Culture is dragged from a Compendium."],
    magicEnabled: ["MERP-RMU — Magic Consequences Automation", "Triggers the Risk of Attracting the Shadow after each RMU SCR and automatic Sorcery checks."],
    shadowActivity: ["MERP-RMU — Shadow Activity", ""],
    agePeriod: ["MERP-RMU — Period for Magic Risk", ""],
    region: ["MERP-RMU — Current Region Type", "Used to determine the consequence when the Shadow detects a spell."],
    corruptionAuto: ["MERP-RMU — Apply Corruption Points Automatically", ""],
    shadowWhisper: ["MERP-RMU — Keep Shadow Rolls Secret", "Risk and Corruption cards are whispered to GMs."]
  },
  fr: {
    contentLanguage: ["Langue du contenu MERP-RMU", "Choisit la langue utilisée par les contenus éditoriaux MERP-RMU. Les changements sont appliqués immédiatement."],
    themeEnabled: ["Activer le thème MERP UI", "Applique PragRoman et la mise en page MERP aux Journaux, Acteurs et Objets."],
    defaultIconSize: ["Taille par défaut des icônes MERP", "Taille utilisée par défaut pour les icônes MERP."],
    campaignAge: ["MERP-RMU — Âge de la campagne", "Détermine la variante propre à l’Âge appliquée lorsqu’une Race ou une Culture MERP-RMU est glissée depuis un Compendium."],
    magicEnabled: ["MERP-RMU — Automatisation des conséquences de la magie", "Déclenche le Risque d’attirer l’Ombre après chaque JLS RMU et les tests automatiques de Sorcellerie."],
    shadowActivity: ["MERP-RMU — Activité de l’Ombre", ""],
    agePeriod: ["MERP-RMU — Période pour le Risque magique", ""],
    region: ["MERP-RMU — Type de région actuel", "Utilisé pour déterminer la conséquence quand l’Ombre détecte un sort."],
    corruptionAuto: ["MERP-RMU — Appliquer automatiquement les Points de Corruption", ""],
    shadowWhisper: ["MERP-RMU — Garder les Jets de l’Ombre secrets", "Les cartes de Risque et de Corruption sont chuchotées aux MJ."]
  }
};

const OPTIONS = {
  campaignAge: {
    en: { "1":"First Age", "2":"Second Age", "3":"Third Age", "4":"Fourth Age" },
    fr: { "1":"Premier Âge", "2":"Deuxième Âge", "3":"Troisième Âge", "4":"Quatrième Âge" }
  },
  shadowActivity: {
    en: { low:"Low", medium:"Medium", high:"High", veryHigh:"Very High" },
    fr: { low:"Faible", medium:"Moyenne", high:"Élevée", veryHigh:"Très élevée" }
  },
  agePeriod: {
    en: { neutral:"Neutral / Other Period (+0)", firstWar:"First Age — War against Morgoth (+25)", firstMorgothAscendant:"First Age — Morgoth Ascendant (+40)", secondBeforeSauron:"Second Age — Before Sauron’s Rise (-10)", secondSauronAscendant:"Second Age — Sauron Ascendant (+10)", secondLastAlliance:"Second Age — War of the Last Alliance (+25)", earlyThird:"Early Third Age (-15)", midThird:"Middle Third Age (+0)", lateThird:"Late Third Age (+25)", fourth:"Fourth Age (-25)" },
    fr: { neutral:"Neutre / Autre période (+0)", firstWar:"Premier Âge — Guerre contre Morgoth (+25)", firstMorgothAscendant:"Premier Âge — Morgoth en pleine puissance (+40)", secondBeforeSauron:"Deuxième Âge — avant l’essor de Sauron (-10)", secondSauronAscendant:"Deuxième Âge — Sauron en puissance (+10)", secondLastAlliance:"Deuxième Âge — Guerre de la Dernière Alliance (+25)", earlyThird:"Début du Troisième Âge (-15)", midThird:"Milieu du Troisième Âge (+0)", lateThird:"Fin du Troisième Âge (+25)", fourth:"Quatrième Âge (-25)" }
  },
  region: {
    en: { haven:"Haven", civilizedUrban:"Civilized / Urban", civilizedRural:"Civilized / Rural", frontierUrban:"Frontier / Urban", frontierRural:"Frontier / Rural", wilderness:"Wilderness", shadowLands:"Shadow Lands", shadowHold:"Shadow Hold" },
    fr: { haven:"Havre", civilizedUrban:"Civilisé / Urbain", civilizedRural:"Civilisé / Rural", frontierUrban:"Frontière / Urbain", frontierRural:"Frontière / Rural", wilderness:"Terres Sauvages", shadowLands:"Terres de l’Ombre", shadowHold:"Bastion de l’Ombre" }
  }
};

const SETTINGS = {
  contentLanguage: "contentLanguage",
  themeEnabled: "themeEnabled",
  defaultIconSize: "defaultIconSize",
  campaignAge: "campaignAge",
  magicEnabled: "merpMagicAutomation",
  shadowActivity: "merpMagicShadowActivity",
  agePeriod: "merpMagicAgePeriod",
  region: "merpMagicRegion",
  corruptionAuto: "merpMagicCorruptionAuto",
  shadowWhisper: "merpMagicShadowWhisper"
};

function rootElement(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  if (html?.element instanceof HTMLElement) return html.element;
  return null;
}

function settingControl(root, settingKey) {
  const full = `${MODULE_ID}.${settingKey}`;
  const escape = globalThis.CSS?.escape ?? ((value) => String(value).replace(/([.#:[\],=])/g, "\\$1"));
  return root.querySelector(`[name="${escape(full)}"]`)
    ?? root.querySelector(`[name="${escape(settingKey)}"]`)
    ?? null;
}

function localizeGroup(root, logicalKey, settingKey, language) {
  const control = settingControl(root, settingKey);
  if (!control) return 0;
  const group = control.closest(".form-group") ?? control.parentElement?.parentElement ?? null;
  if (!group) return 0;
  const [name, hint] = TEXT[language][logicalKey];
  const label = group.querySelector("label, .setting-name, h4, h3");
  if (label && name) label.textContent = name;
  const hintEl = group.querySelector(".hint, .notes, p.hint, p.notes");
  if (hintEl && hint !== undefined) hintEl.textContent = hint;
  const map = OPTIONS[logicalKey]?.[language];
  if (map && control.tagName === "SELECT") {
    for (const option of control.options) {
      if (Object.prototype.hasOwnProperty.call(map, option.value)) option.textContent = map[option.value];
    }
  }
  return 1;
}

export function localizeMerpUiSettings(html, language = contentLanguage()) {
  const root = rootElement(html);
  if (!root) return { updated: 0 };
  const lang = language === "fr" ? "fr" : "en";
  let updated = 0;
  for (const [logicalKey, settingKey] of Object.entries(SETTINGS)) {
    updated += localizeGroup(root, logicalKey, settingKey, lang);
  }
  return { updated, language: lang };
}

export function registerSettingsUiLocalizationHooks() {
  const apply = (app, html) => {
    const name = app?.constructor?.name ?? "";
    if (!/Settings|Config/i.test(name)) return;
    localizeMerpUiSettings(html);
  };
  Hooks.on("renderSettingsConfig", apply);
  Hooks.on("renderGameSettings", apply);
  Hooks.on("renderApplicationV2", apply);
}

export function rerenderSettingsApplications() {
  const windows = Object.values(ui.windows ?? {});
  for (const app of windows) {
    const name = app?.constructor?.name ?? "";
    if (!/Settings|Config/i.test(name)) continue;
    try { app.render?.({ force: true }); } catch (_) {
      try { app.render?.(true); } catch (_) {}
    }
  }
}
