/**
 * MERP-UI bilingual RMU Item-sheet metadata renderer, clean rebuild.
 * Only text nodes and presentation attributes inside an Item window are edited.
 * No write to game.settings, Item documents, form values or Compendium packs.
 * Translation resources are same-origin, shipped with MERP-UI itself.
 */

const STATIC_FR_TO_EN = Object.freeze({
  "Groupes de Compétences": "Skill Groups",
  "Groupes de compétences": "Skill Groups",
  "Points d'Aptitude": "Aptitude Points",
  "Points d’Aptitude": "Aptitude Points",
  "Coût en PD": "DP Cost",
  "Basique": "Basic",
  "Ouverte": "Open",
  "Fermée": "Closed",
  "Cat. Compétence": "Skill Category",
  "Catégorie de Compétence": "Skill Category",
  "Caracs. de la Compétence": "Skill Characteristics",
  "Caractéristiques de la Compétence": "Skill Characteristics",
  "Compétence": "Skill",
  "Spécialisation:": "Specialization:",
  "Spécialisation": "Specialization",
  "Catégorie": "Category",
  "Coût en points de développement": "Development Point Cost",
  "Coût": "Cost",
  "Niveau": "Level",
  "Rang": "Rank",
  "Rangs": "Ranks",
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
  "Autres": "Other",
  "Variété raciale": "Racial Variety",
  "Variété de race": "Racial Variety",
  "Bonus en PD": "DP Bonus",
  "Bonus de PD": "DP Bonus",
  "PV de Base": "Base Hits",
  "PV de base": "Base Hits",
  "Récupération": "Recovery",
  "Taille": "Size",
  "Taille de base": "Base Height",
  "Poids de base": "Base Weight",
  "Allure": "Pace",
  "Espèce": "Species",
  "Résistances": "Resistances",
  "Humanoïdes": "Humanoids",
  "Masculin": "Male",
  "Féminin": "Female",
  "Moyenne": "Medium",
  "Moyen": "Medium",
  "Grande": "Large",
  "Petite": "Small",
  "Bonus de carac.": "Stat Bonuses",
  "Bonus de carac": "Stat Bonuses",
  "Herbe": "Herb",
  "Liste de Sorts": "Spell List",
  "Liste de sorts": "Spell List",
  "Théurgie": "Channeling",
  "Lanceur de Sorts": "Spell User",
  "Lanceur de Sorts Pur": "Pure Spell User",
  "Lanceur de Sorts Hybride": "Hybrid Spell User",
  "Lanceur de Sorts Semi": "Semi Spell User",
  "Lanceur de Sorts Semi-magique": "Semi Spell User",
  "Lanceur de Sorts Semi-Magique": "Semi Spell User",
  "Non Lanceur de Sorts": "Non-Spell User",
  "Sans magie": "Non-Spell User",
  "Listes de Base": "Base Lists",
  "Liste de Base": "Base List",
  "Listes de Base de Profession": "Profession Base Lists",
  "Aptitude Professionnelle": "Professional Aptitude",
  "Compétence Professionnelle": "Professional Skill",
  "Théurgie, Mentalisme": "Channeling, Mentalism",
  "Théurgie / Mentalisme": "Channeling / Mentalism",
  "Essence, Théurgie": "Essence, Channeling",
  "Théurgie, Essence": "Channeling, Essence",
  "Essence, Mentalisme": "Essence, Mentalism",
  "Mentalisme, Théurgie": "Mentalism, Channeling",
  "Théurgie, Mentalisme, Essence": "Channeling, Mentalism, Essence",
  "Ajustez jusqu'à zéro pour l'équilibre du jeu": "Adjust to zero for game balance",
  "Ajustez jusqu’à zéro pour l’équilibre du jeu": "Adjust to zero for game balance",
  "(Ajustez jusqu'à zéro pour l'équilibre du jeu)": "(Adjust to zero for game balance)",
  "(Ajustez jusqu’à zéro pour l’équilibre du jeu)": "(Adjust to zero for game balance)",
  "Santé": "Health",
  "Herbes": "Herbs",
  "Outils": "Tools",
  "Édition": "Editing",
  "Éditer": "Edit",
  "Modifier": "Edit",
  "Ajouter": "Add",
  "Supprimer": "Delete",
  "Retirer": "Remove",
  "Enregistrer": "Save",
  "Annuler": "Cancel",
  "Valider": "Confirm",
  "Confirmer": "Confirm",
  "Créer": "Create",
  "Choisir": "Choose",
  "Sélectionner": "Select",
  "Appliquer": "Apply",
  "Ouvrir": "Open",
  "Fermer": "Close",
  "Nombre": "Number",
  "Unité": "Unit",
  "Unités": "Units",
  "Points de vie": "Hits",
  "Points de Vie": "Hits",
  "PV": "Hits",
  "Agilité": "Agility",
  "Force": "Strength",
  "Rapidité": "Quickness",
  "Présence": "Presence",
  "Mémoire": "Memory",
  "Raisonnement": "Reasoning",
  "Empathie": "Empathy",
  "Autodiscipline": "Self Discipline",
  "Informations": "Information",
  "Informations générales": "General Information",
  "Général": "General",
  "Générale": "General",
  "Généraux": "General",
  "Détails": "Details",
  "Propriétés": "Properties",
  "Attributs": "Attributes",
  "Caractéristiques": "Characteristics",
  "Caractéristique": "Characteristic",
  "Statistiques": "Statistics",
  "Effets": "Effects",
  "Effets actifs": "Active Effects",
  "Modificateurs": "Modifiers",
  "Modificateur": "Modifier",
  "Historique": "History",
  "Biographie": "Biography",
  "Équipement": "Equipment",
  "Inventaire": "Inventory",
  "Création de personnage": "Character Creation",
  "Avantages": "Advantages",
  "Désavantages": "Disadvantages",
  "Prérequis": "Prerequisites",
  "Prérequis de Culture": "Culture Prerequisites",
  "Résumé": "Summary",
  "Liste": "List",
  "Listes de sorts": "Spell Lists",
  "Sorts": "Spells",
  "Sort": "Spell",
  "Magie": "Magic",
  "Domaine de magie": "Realm of Magic",
  "Royaume de magie": "Realm of Magic",
  "Royaume": "Realm",
  "Royaumes": "Realms",
  "Type de magie": "Magic Type",
  "Listes de base": "Base Lists",
  "Listes de sorts de base": "Base Spell Lists",
  "Listes ouvertes": "Open Lists",
  "Listes fermées": "Closed Lists",
  "Listes restreintes": "Restricted Lists",
  "Liste basique": "Base List",
  "Liste ouverte": "Open List",
  "Liste fermée": "Closed List",
  "Liste restreinte": "Restricted List",
  "Points de pouvoir": "Power Points",
  "Points de développement": "Development Points",
  "Points de développement (PD)": "Development Points (DP)",
  "PD dépensés": "DP Spent",
  "PD dépensé": "DP Spent",
  "PD": "DP",
  "Bonus de points de développement": "Development Point Bonus",
  "Coût en points": "Point Cost",
  "Coût de développement": "Development Cost",
  "Bonus de compétence": "Skill Bonus",
  "Bonus de compétences": "Skill Bonuses",
  "Bonus de caractéristique": "Stat Bonus",
  "Bonus de caractéristiques": "Stat Bonuses",
  "Bonus racial": "Racial Bonus",
  "Bonus raciaux": "Racial Bonuses",
  "Bonus de race": "Racial Bonus",
  "Compétences": "Skills",
  "Compétences culturelles": "Cultural Skills",
  "Rangs culturels": "Cultural Ranks",
  "Rangs de Culture": "Culture Ranks",
  "Groupe de formation": "Training Group",
  "Groupe d'entraînement": "Training Group",
  "Groupe d’entraînement": "Training Group",
  "Carac.": "Stats",
  "Caracs.": "Stats",
  "Spécialisations": "Specializations",
  "Spécialisation fixe": "Fixed Specialization",
  "Spécialisations fixes": "Fixed Specializations",
  "Automatique": "Automatic",
  "Compétence automatique": "Automatic Skill",
  "Compétence favorite": "Favorite Skill",
  "Profils": "Profiles",
  "Origine": "Origin",
  "Origines": "Origins",
  "Âge": "Age",
  "Âges": "Ages",
  "Âge de campagne": "Campaign Age",
  "Âges disponibles": "Available Ages",
  "Langues": "Languages",
  "Langue": "Language",
  "Langue de départ": "Starting Language",
  "Langues de départ": "Starting Languages",
  "Parlé": "Spoken",
  "Écrit": "Written",
  "Parler": "Spoken",
  "Écrire": "Written",
  "Rang parlé": "Spoken Rank",
  "Rang écrit": "Written Rank",
  "Rangs parlés": "Spoken Ranks",
  "Rangs écrits": "Written Ranks",
  "Talent et Défaut": "Talent & Flaw",
  "Défauts": "Flaws",
  "Talents / Défauts": "Talents / Flaws",
  "Talents et défauts": "Talents & Flaws",
  "Niveau du talent": "Talent Tier",
  "Niveau maximum": "Maximum Tier",
  "Nombre de niveaux": "Number of Tiers",
  "Palier": "Tier",
  "Paliers": "Tiers",
  "Palier maximum": "Maximum Tier",
  "Max. palier": "Max Tier",
  "Réduction": "Discount",
  "Remise": "Discount",
  "Durée de vie": "Lifespan",
  "Longévité": "Longevity",
  "Âge maximum": "Maximum Age",
  "Poids moyen": "Average Weight",
  "Taille moyenne": "Average Height",
  "Catégorie de créature": "Creature Category",
  "Type de créature": "Creature Type",
  "Variété de créature": "Creature Variety",
  "Catégorie raciale": "Racial Category",
  "Santé raciale": "Racial Health",
  "Régénération": "Regeneration",
  "Taux de récupération": "Recovery Rate",
  "Multiplicateur de récupération": "Recovery Multiplier",
  "Construction": "Build",
  "Corpulence": "Build",
  "Gabarit": "Frame",
  "Charpente": "Frame",
  "Morphologie": "Build",
  "Mouvement": "Movement",
  "Déplacement": "Movement",
  "Vitesse": "Speed",
  "Vitesse de déplacement": "Movement Speed",
  "Résistance": "Resistance",
  "Jet de résistance": "Resistance Roll",
  "Jets de résistance": "Resistance Rolls",
  "Jet de Résistance": "Resistance Roll",
  "Jets de Résistance": "Resistance Rolls",
  "Physique": "Physical",
  "Peur": "Fear",
  "Canalisation": "Channeling",
  "Mentalisme": "Mentalism",
  "Arcanique": "Arcane",
  "Sans profession": "Layman",
  "Guérisseur": "Healer",
  "Soigneur": "Lay Healer",
  "Rôdeur": "Ranger",
  "Guerrier": "Fighter",
  "Barbare": "Barbarian",
  "Voie": "Path",
  "Groupe de magie": "Spellcasting Group",
  "Aptitudes": "Abilities",
  "Capacités": "Abilities",
  "Fréquence": "Frequency",
  "Portée maximale": "Maximum Range",
  "Zone d'effet": "Area of Effect",
  "Zone d’effet": "Area of Effect",
  "Temps de préparation": "Preparation Time",
  "Temps d'incantation": "Casting Time",
  "Temps d’incantation": "Casting Time",
  "Durée d'effet": "Effect Duration",
  "Durée d’effet": "Effect Duration",
  "Cible(s)": "Target(s)",
  "Dégâts": "Damage",
  "Soins": "Healing",
  "Encombrement": "Encumbrance",
  "Saisons": "Seasons",
  "Saison": "Season",
  "Disponibilité": "Availability",
  "Rareté": "Rarity",
  "Formes": "Forms",
  "Utilisation": "Use",
  "Utilisations": "Uses",
  "Difficulté de recherche": "Finding Difficulty",
  "Difficulté pour trouver": "Finding Difficulty",
  "Dépendance (%)": "Addiction (%)",
  "Facteur d'addiction": "Addiction Factor",
  "Facteur d’addiction": "Addiction Factor",
  "Coût / Poids": "Cost / Weight",
  "Prix / Poids": "Cost / Weight",
  "Effet": "Effect",
  "Oui / Non": "Yes / No",
  "Actif": "Active",
  "Inactif": "Inactive",
  "Disponible": "Available",
  "Indisponible": "Unavailable",
  "À définir": "To be defined",
  "Aucune restriction": "No Restrictions",
  "Royaume des Armes": "Realm of Arms",
  "Semi Lanceur de Sorts": "Semi Spell User",
  "Pur Lanceur de Sorts": "Pure Spell User",
  "Lanceur de Sorts de Base": "Base Spell User",
  "Compétences Professionnelles": "Professional Skills",
  "Coût PD": "DP Cost",
  "Coût en Points": "Point Cost",
  "Cost DP": "DP Cost"
});
const normalize = value => String(value ?? "").normalize("NFC").replace(/\s+/g, " ").trim().toLocaleLowerCase();
const frToEn = new Map();
const enToFr = new Map();
for (const [french, english] of Object.entries(STATIC_FR_TO_EN)) {
  frToEn.set(normalize(french), english);
  // A stable preferred reverse translation; unchanged literals are excluded.
  if (!enToFr.has(normalize(english))) enToFr.set(normalize(english), french);
}

const richContent = [
  ".editor", ".editor-container", ".editor-content", ".description-content",
  ".item-description", ".rmu-prose", ".rmu-prose-content", ".rmu-prose-editor",
  ".ProseMirror", ".prosemirror", ".tiptap", ".merp-ui-herb-biome-panel",
  "[contenteditable]", "textarea", "input", "script", "style"
].join(",");

const windowTypes = new Map([
  ["herbe", ["Herbe", "Herb"]], ["herb", ["Herbe", "Herb"]],
  ["liste de sorts", ["Liste de Sorts", "Spell List"]], ["spell list", ["Liste de Sorts", "Spell List"]],
  ["compétence", ["Compétence", "Skill"]], ["skill", ["Compétence", "Skill"]],
  ["profession", ["Profession", "Profession"]],
  ["race", ["Race", "Race"]], ["culture", ["Culture", "Culture"]],
  ["talent", ["Talent", "Talent"]], ["défaut", ["Défaut", "Flaw"]],
  ["flaw", ["Défaut", "Flaw"]]
]);

/** Keep the Item name byte-for-byte unchanged. */
export function translateItemWindowTitle(value, language = "en") {
  const source = String(value ?? "");
  const match = source.match(/^(\s*)([^:\n]{2,36})(\s*:\s*)([^\n]+?)(\s*)$/u);
  if (!match) return null;
  const pair = windowTypes.get(normalize(match[2]));
  if (!pair) return null;
  const prefix = language === "fr" ? pair[0] : pair[1];
  const result = match[1] + prefix + match[3] + match[4] + match[5];
  return result === source ? null : result;
}

let dictionariesPromise;
function resourcePath(path) {
  const local = `modules/merp-ui/${path}`;
  return globalThis.foundry?.utils?.getRoute?.(local) ?? local;
}

/** The same-origin JSON dictionaries bundled with the module are authoritative. */
export function loadItemSheetCategoryMaps() {
  if (dictionariesPromise) return dictionariesPromise;
  dictionariesPromise = Promise.all([
    fetch(resourcePath("translations/skill-categories/categories.fr.json"), { cache: "force-cache" }),
    fetch(resourcePath("translations/skills/skills.fr.json"), { cache: "force-cache" })
  ]).then(async responses => {
    if (responses.some(response => !response.ok)) throw new Error("Local skill dictionary unavailable");
    const [categories, skills] = await Promise.all(responses.map(response => response.json()));
    const categoryEn = new Map(), categoryFr = new Map();
    const skillEn = new Map(), skillFr = new Map();
    for (const [english, entry] of Object.entries(categories)) {
      if (english === "_meta" || !entry || typeof entry.name !== "string") continue;
      const french = entry.name;
      categoryEn.set(normalize(english), english);
      categoryEn.set(normalize(french), english);
      categoryFr.set(normalize(english), french);
      categoryFr.set(normalize(french), french);
      for (const alias of entry.aliases ?? []) {
        categoryEn.set(normalize(alias), english);
        categoryFr.set(normalize(alias), french);
      }
    }
    for (const [english, entry] of Object.entries(skills)) {
      if (english === "_meta" || !entry || typeof entry.name !== "string") continue;
      const french = entry.name;
      skillEn.set(normalize(english), english);
      skillEn.set(normalize(french), english);
      skillFr.set(normalize(english), french);
      skillFr.set(normalize(french), french);
      for (const alias of entry.aliases ?? []) {
        skillEn.set(normalize(alias), english);
        skillFr.set(normalize(alias), french);
      }
    }
    return { en: categoryEn, fr: categoryFr, skillNames: { en: skillEn, fr: skillFr } };
  }).catch(error => {
    console.warn("MERP-UI | French/English skill dictionaries unavailable", error);
    return { en: new Map(), fr: new Map(), skillNames: { en: new Map(), fr: new Map() } };
  });
  return dictionariesPromise;
}

function staticTranslation(value, language) {
  const source = String(value ?? "");
  const match = source.match(/^(.*?)(\s*[:：])?$/u);
  if (!match) return null;
  const body = match[1].trim(), suffix = match[2] ?? "";
  const translated = (language === "fr" ? enToFr : frToEn).get(normalize(body));
  if (!translated) return null;
  const uppercase = /[A-Za-zÀ-ÿ]/u.test(body) && body === body.toLocaleUpperCase();
  const result = (uppercase ? translated.toLocaleUpperCase() : translated) + suffix;
  return result === source ? null : result;
}

function computedTranslation(value, language) {
  const text = String(value ?? "").trim();
  // Do not modify numerical content; translate only literal text around numbers.
  const aptitude = text.match(/^(Aptitude Professionnelle|Professional Aptitude)(\s+)([+-]?\d+)(\s*)(?:\((.+)\))?$/iu);
  if (aptitude) {
    const hint = aptitude[5] ? staticTranslation(aptitude[5], language) ?? aptitude[5] : null;
    const out = `${language === "fr" ? "Aptitude Professionnelle" : "Professional Aptitude"}${aptitude[2]}${aptitude[3]}${hint ? `${aptitude[4]}(${hint})` : ""}`;
    return out !== text ? out : null;
  }
  const prof = text.match(/^(Compétences Professionnelles|Professional Skills)(\s+)(\d+)(\s+)(sur|of)(\s+)(\d+)$/iu);
  if (prof) {
    const out = `${language === "fr" ? "Compétences Professionnelles" : "Professional Skills"}${prof[2]}${prof[3]}${prof[4]}${language === "fr" ? "sur" : "of"}${prof[6]}${prof[7]}`;
    return out !== text ? out : null;
  }
  const baseList = text.match(/^([+-]?\d+)(\s+)(Listes? de Base|Base Lists?)$/iu);
  if (baseList) {
    const singular = /\b(Liste de Base|Base List)$/iu.test(baseList[3]);
    const unit = language === "fr" ? (singular ? "Liste de Base" : "Listes de Base") : (singular ? "Base List" : "Base Lists");
    const out = baseList[1] + baseList[2] + unit;
    return out === text ? null : out;
  }
  // Dynamic table heading can contain a count, e.g. Aptitude (4).
  const trait = text.match(/^(Aptitude)(\s*\(\s*[+-]?\d+\s*\))$/iu);
  if (trait) return null; // The word is shared by FR and EN.
  return null;
}

function categoryName(value, language, dictionaries) {
  if (!dictionaries) return null;
  const text = String(value ?? "").trim();
  const parenthesized = text.match(/^(.+?)\s*\(([^()]+)\)$/u);
  const stripped = parenthesized ? parenthesized[1].trim() : text;
  const map = dictionaries[language];
  // Prefer the canonical English key, if present in a bilingual category label.
  return (parenthesized && map.get(normalize(parenthesized[2]))) || map.get(normalize(stripped)) || null;
}

function professionalSkillTranslation(value, language, dictionaries) {
  if (!dictionaries?.skillNames) return null;
  const text = String(value ?? "").trim();
  const parts = text.match(/^(.+?)(\s*[:：]\s*)([^:\n]+)$/u);
  if (parts) {
    const cat = categoryName(parts[1], language, dictionaries);
    const skill = dictionaries.skillNames[language].get(normalize(parts[3]))
      ?? staticTranslation(parts[3], language);
    if (!cat || !skill) return null;
    const result = cat + parts[2] + skill;
    return result === text ? null : result;
  }
  const category = categoryName(text, language, dictionaries);
  return category && category !== text ? category : null;
}

/** Pure function for isolated tests and other MERP-UI UI surfaces. */
export function translateItemSheetLabel(value, lang = "en", dictionaries = null) {
  const source = String(value ?? "");
  if (!source.trim() || source.length > 240 || /[<>]/u.test(source)) return null;
  const language = lang === "fr" ? "fr" : "en";
  const line = source.trim();
  const replacement = computedTranslation(line, language)
    ?? professionalSkillTranslation(line, language, dictionaries)
    ?? staticTranslation(line, language);
  if (replacement && replacement !== line) return replacement;
  if (!source.includes("\n")) return null;
  const lines = source.split("\n");
  if (lines.length > 5) return null;
  const translatedLines = lines.map(part => {
    const trimmed = part.trim();
    const translated = computedTranslation(trimmed, language)
      ?? professionalSkillTranslation(trimmed, language, dictionaries)
      ?? staticTranslation(trimmed, language);
    return translated ? part.replace(trimmed, translated) : part;
  });
  const result = translatedLines.join("\n");
  return result === source ? null : result;
}

function translateWindowTitle(root, language) {
  let count = 0;
  for (const node of root.querySelectorAll(".window-header .window-title, header.window-header .window-title")) {
    const translated = translateItemWindowTitle(node.textContent, language);
    if (translated) { node.textContent = translated; count++; }
  }
  return count;
}

function presentationTextNode(node) {
  const parent = node.parentElement;
  if (!parent || parent.closest(richContent)) return false;
  return parent.matches("label,dt,dd,th,td,legend,option,h1,h2,h3,h4,h5,h6,summary,header,button,small,span,strong,b,div,p,a,.form-label,.field-label,.label,.value");
}

/** Do not update contenteditable, rich text or any editable form control. */
export function localizeItemSheetMetadata(root, lang = "en", dictionaries = null) {
  if (!root?.querySelectorAll || typeof document === "undefined") return 0;
  const language = lang === "fr" ? "fr" : "en";
  let changed = translateWindowTitle(root, language);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const toTranslate = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (String(node.nodeValue ?? "").trim().length > 0 &&
        String(node.nodeValue ?? "").trim().length <= 240 && presentationTextNode(node)) {
      toTranslate.push(node);
    }
  }
  for (const node of toTranslate) {
    const original = String(node.nodeValue ?? "");
    const trimmed = original.trim();
    const result = translateItemSheetLabel(trimmed, language, dictionaries);
    if (!result || result === trimmed) continue;
    const leading = original.match(/^\s*/u)?.[0] ?? "";
    const trailing = original.match(/\s*$/u)?.[0] ?? "";
    node.nodeValue = leading + result + trailing;
    changed++;
  }
  // Editable controls' values stay untouched. Only visible option captions change.
  for (const option of root.querySelectorAll("select option")) {
    const replacement = translateItemSheetLabel(option.textContent, language, dictionaries);
    if (replacement) { option.textContent = replacement; changed++; }
  }
  for (const element of root.querySelectorAll("[title],[aria-label],[placeholder]")) {
    if (element.closest(richContent)) continue;
    for (const attribute of ["title", "aria-label", "placeholder"]) {
      if (!element.hasAttribute(attribute)) continue;
      const translation = translateItemSheetLabel(element.getAttribute(attribute), language, dictionaries);
      if (translation) { element.setAttribute(attribute, translation); changed++; }
    }
  }
  return changed;
}

const states = new WeakMap();
/** Hook entry point compatible with both Foundry V13 and V14. */
export function scheduleItemSheetMetadataLocalization(root, languageGetter) {
  if (!root?.querySelectorAll || typeof languageGetter !== "function") return;
  let state = states.get(root);
  if (!state) {
    state = { active: false, pending: false, observer: null, lastLanguage: null };
    states.set(root, state);
  }
  const apply = async () => {
    if (state.active) return;
    state.active = true;
    try {
      const dictionaries = await loadItemSheetCategoryMaps();
      if (!root.isConnected) return;
      const language = languageGetter() === "fr" ? "fr" : "en";
      localizeItemSheetMetadata(root, language, dictionaries);
      state.lastLanguage = language;
    } catch (error) {
      console.warn("MERP-UI | Item metadata display translation error", error);
    } finally {
      state.active = false;
    }
  };
  if (!state.pending) {
    state.pending = true;
    Promise.resolve().then(apply).finally(() => { state.pending = false; });
  }
  if (!state.observer && typeof MutationObserver !== "undefined") {
    state.observer = new MutationObserver(() => {
      if (state.pending || state.active) return;
      state.pending = true;
      requestAnimationFrame(() => {
        Promise.resolve().then(apply).finally(() => { state.pending = false; });
      });
    });
    state.observer.observe(root, { subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ["title", "aria-label", "placeholder"] });
  }
}
