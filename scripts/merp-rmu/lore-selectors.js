/**
 * MERP-UI / Lore selectors: transient character-creation UI only.
 * Keeps RMU's technical Skill names, actors, ranks and compendiums unchanged.
 * A category/subcategory selector writes the final specialization into RMU's
 * native dialog response; the native dialog still handles Add/Cancel.
 */

const MODULE = "merp-ui";
const CUSTOM = "__merp_custom__";
const entry = (value, fr, en = value, children = null) => ({ value, fr, en, children });

// Leaf values are stable technical English strings, irrespective of UI language.
const LORE = Object.freeze({
  "Historic Lore": [
    entry("First Age", "Premier Âge"),
    entry("Second Age", "Deuxième Âge"),
    entry("Third Age", "Troisième Âge"),
    entry("Regional History", "Histoire régionale", "Regional History", [
      entry("tbd", "À définir", "To be determined")
    ])
  ],
  "Creature Lore": [
    entry("Servants of the Enemy", "Forces de l’Ombre", "Servants of the Enemy", [
      entry("Orcs", "Orques (Yrch)", "Orcs (Yrch)", [
        entry("Snaga", "Snaga"),
        entry("Common Orcs", "Orques communs"),
        entry("Uruk-hai", "Uruk-hai")
      ]),
      entry("Trolls", "Trolls (Torog)", "Trolls (Torog)", [
        entry("Cave Trolls", "Trolls des Cavernes"),
        entry("Snow Trolls", "Trolls des Neiges"),
        entry("Hill Trolls", "Trolls des Collines"),
        entry("Mountain Trolls", "Trolls des Montagnes"),
        entry("Stone Trolls", "Trolls de Pierre"),
        entry("Olog-hai", "Olog-hai")
      ]),
      entry("Half-orcs and Orc-men", "Demi-orques et Hommes-orques")
    ]),
    entry("Undead and Spirits", "Morts-vivants et Esprits", "Undead and Spirits", [
      entry("Nazgul", "Nazgûl", "Nazgûl"),
      entry("Barrow-wights", "Êtres des Galgals"),
      entry("Wraiths and Ghosts", "Spectres et Fantômes"),
      entry("Vampires", "Vampires")
    ]),
    entry("Dragons", "Dragons", "Dragons", [
      entry("Fire-drakes", "Dragons de Feu (Urulóki)"),
      entry("Cold-drakes", "Dragons Froids"),
      entry("Winged Dragons", "Dragons Ailés"),
      entry("Long-worms", "Vers et Dragons Rampants")
    ]),
    entry("Great Beasts and Monsters", "Animaux géants et Créatures fabuleuses", "Great Beasts and Monsters", [
      entry("Great Eagles", "Grands Aigles"),
      entry("Great Spiders", "Araignées Géantes"),
      entry("Wargs", "Ouargues"),
      entry("Werewolves", "Loups-garous"),
      entry("Mumakil", "Mûmakil", "Mûmakil"),
      entry("Mearas", "Mearas"),
      entry("Watcher in the Water", "Guetteur de l’Eau")
    ]),
    entry("Higher Entities", "Entités supérieures", "Higher Entities", [
      entry("Balrogs", "Balrogs"),
      entry("Shadows of Angband", "Ombres d’Angband (MERP/ICE)", "Shadows of Angband (MERP/ICE)")
    ]),
    entry(CUSTOM, "Autre — À définir", "Other — Specify")
  ],
  "Racial Lore": [
    entry("Own Culture", "Culture d’origine", "Own Culture"),
    entry("Elves", "Elfes", "Elves", [
      entry("Vanyar", "Vanyar"), entry("Noldor", "Noldor"),
      entry("Teleri", "Teleri"), entry("Sindar", "Sindar"),
      entry("Nandor", "Nandor"), entry("Silvan Elves", "Elfes sylvains"),
      entry("Avari", "Avari"), entry("Penni", "Penni")
    ]),
    entry("Dwarves", "Nains", "Dwarves", [
      entry("Longbeards (Durin)", "Longues-Barbes (Durin)"),
      entry("Firebeards (Dwalin)", "Barbes-de-Feu (Dwálin)"),
      entry("Broadbeams (Thrar)", "Torses-Larges (Thrár)"),
      entry("House of Bavor", "Maison de Bávor"),
      entry("House of Thelor", "Maison de Thelór"),
      entry("House of Druin", "Maison de Drúin"),
      entry("House of Barin", "Maison de Barin")
    ]),
    entry("Men", "Hommes", "Men", [
      entry("Dunedain of Arnor", "Dúnedain d’Arnor"),
      entry("Dunedain of Gondor", "Dúnedain du Gondor"),
      entry("Rohirrim", "Rohirrim"), entry("Beornings", "Béornides"),
      entry("Northmen", "Hommes du Nord"), entry("Dunlendings", "Dunlendings"),
      entry("Easterlings", "Orientaux"), entry("Haradrim", "Haradrim"),
      entry("Druedain", "Drúedain")
    ]),
    entry("Hobbits", "Hobbits", "Hobbits", [
      entry("Harfoots", "Pieds-velus"), entry("Stoors", "Forts"), entry("Fallohides", "Pâles")
    ]),
    entry("Orcs", "Orcs", "Orcs", [entry("Common Orcs", "Orcs communs"), entry("Uruk-hai", "Uruk-hai")]),
    entry("Other Peoples", "Autres peuples", "Other Peoples", [
      entry("Umli", "Umli"), entry("Petty-dwarves", "Petits-Nains"),
      entry("Half-elves", "Demi-Elfes"), entry("Half-orcs", "Demi-Orcs"),
      entry("Trolls", "Trolls"), entry(CUSTOM, "Autre — À définir", "Other — Specify")
    ])
  ],
  "Region Lore": [
    entry("Starting Regions", "Régions de départ", "Starting Regions", [
      entry("Own", "Région d’origine", "Own Region"),
      entry("Neighboring", "Région voisine", "Neighboring Region")
    ]),
    entry("Eriador", "Eriador et Nord-Ouest", "Eriador and Northwest", [
      entry("Eriador", "Eriador — général"),
      entry("Arthedain", "Arthedain"), entry("Cardolan", "Cardolan"),
      entry("Rhudaur", "Rhudaur"), entry("Angmar", "Angmar"),
      entry("The Shire", "La Comté"), entry("Bree-land", "Pays de Bree"),
      entry("Dunland", "Pays de Dun"), entry("Forodwaith", "Forodwaith / Forochel"),
      entry("Eregion", "Eregion / Hollin")
    ]),
    entry("Gondor and Rohan", "Gondor et Rohan", "Gondor and Rohan", [
      entry("Gondor", "Gondor — général"), entry("Rohan / Calenardhon", "Rohan / Calenardhon"),
      entry("Isengard and Northern Gondor", "Isengard et Gondor septentrional"),
      entry("Belfalas / Dol Amroth", "Belfalas / Dol Amroth"),
      entry("Pelargir / Lebennin", "Pelargir / Lebennin"),
      entry("Southern Gondor", "Gondor méridional")
    ]),
    entry("Rhovanion", "Rhovanion et Montagnes Brumeuses", "Rhovanion and Misty Mountains", [
      entry("Rhovanion", "Rhovanion — général"),
      entry("Northern Mirkwood", "Forêt de Grand’Peur septentrionale"),
      entry("Southern Mirkwood", "Forêt de Grand’Peur méridionale"),
      entry("Lothlorien", "Lothlórien"), entry("Moria / Khazad-dum", "Moria / Khazad-dûm"),
      entry("Mount Gundabad", "Mont Gundabad"), entry("Grey Mountains", "Montagnes Grises / Ered Mithrin")
    ]),
    entry("Mordor and the East", "Mordor et l’Est", "Mordor and the East", [
      entry("Mordor", "Mordor — général"), entry("Gorgoroth", "Gorgoroth"),
      entry("Minas Ithil / Minas Morgul", "Minas Ithil / Minas Morgul"),
      entry("Rhun", "Rhûn / Mer de Rhûn")
    ]),
    entry("Far South", "Le lointain Sud", "Far South", [
      entry("Harad", "Harad — général"), entry("Umbar", "Umbar"),
      entry("Far Harad / Bozisha-Miraz", "Far Harad / Bozisha-Miraz"),
      entry("Greater Harad / Sirayn", "Greater Harad / Sirayn"),
      entry("Ardor", "Ardor (The Court of Ardor)")
    ]),
    entry(CUSTOM, "Autre région — À définir", "Other Region — Specify")
  ],
  "Materials Lore": [
    entry("Mithril", "Mithril"), entry("Metals", "Métaux"),
    entry("Wood", "Bois"), entry("Stone", "Pierre"),
    entry("Gems", "Gemmes"), entry("Fabrics", "Étoffes"),
    entry("Rare Materials", "Matériaux rares"),
    entry(CUSTOM, "Autre — À définir", "Other — Specify")
  ],
  "Religion/Philosophy": [
    entry("Eru and the Valar", "Eru et les Valar"),
    entry("Spiritual Traditions", "Traditions spirituelles des peuples"),
    entry("Cult of Morgoth", "Culte de Morgoth"),
    entry("Cult of Sauron", "Culte de Sauron"),
    entry("Specific Cults", "Cultes particuliers"),
    entry(CUSTOM, "Autre — À définir", "Other — Specify")
  ]
});

export const MERP_LORE = LORE;

function leaves(nodes, values = []) {
  for (const node of nodes) {
    if (node.children?.length) leaves(node.children, values);
    else if (node.value !== CUSTOM) values.push(node.value);
  }
  return values;
}

function norm(value) {
  return String(value ?? "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}
function nameOf(skill) { return skill?.name ?? skill?.system?.name ?? ""; }
function loreName(skill) {
  const s = norm(nameOf(skill));
  for (const key of Object.keys(LORE)) if (norm(key) === s) return key;
  return null;
}
function language() {
  try { return globalThis.MERPUI?.contentLanguage?.() === "fr" ? "fr" : "en"; }
  catch { return game.i18n?.lang?.startsWith("fr") ? "fr" : "en"; }
}
function label(node) { return node[language()] ?? node.en ?? node.value; }
function text(fr, en) { return language() === "fr" ? fr : en; }
function setOptions(skill, key) {
  const opts = leaves(LORE[key]);
  // Mutate only the freshly prepared dialog row, never the cached Core compendium Item.
  skill.options = opts;
  if (Array.isArray(skill.specializations)) skill.specializations = [...opts];
  return opts;
}
// RMU 1.4.83 includes Religion/Philosophy inside Other Lores even when the
// culture already grants a separate Religion/Philosophy allocation. A second
// choice of the same skill (often both with "tbd") then creates duplicate Items.
// Limit this exclusion to the cultural Other Lores picker and to cultures with
// a positive, separate Religion/Philosophy grant. Keep EVERY cultural rank,
// profession cost, skill ID, and other Lore choice unchanged.
export function excludeDuplicateReligionInOtherLores(result, app) {
  if (app?._cultureGroup?.skillCategory !== "Lore" ||
      app?._cultureGroup?.skillGroup !== "Other Lores") return result;
  const cultureRanks = app?._actor?.system?._culture?.cultureRanks;
  if (!Array.isArray(cultureRanks) || !cultureRanks.some(row =>
    row?.skillCategory === "Lore" &&
    row?.skillGroup === "Religion/Philosophy" &&
    Number(row?.ranks ?? 0) > 0
  )) return result;
  const skills = result?.skills;
  if (!Array.isArray(skills?.Lore)) return result;
  skills.Lore = skills.Lore.filter(skill => !(
    skill?.category === "Lore" &&
    skill?.name === "Religion/Philosophy" &&
    skill?.trainingGroup === "Religion/Philosophy"
  ));
  if (!skills.Lore.length && Array.isArray(skills.categories)) {
    skills.categories = skills.categories.filter(category => category !== "Lore");
  }
  return result;
}

function patchOptionsResult(result, app) {
  if (!result?.skills || !Array.isArray(result.skills.categories)) return result;
  excludeDuplicateReligionInOtherLores(result, app);
  for (const category of result.skills.categories) {
    if (!Array.isArray(result.skills[category])) continue;
    result.skills[category] = result.skills[category].map(skill => {
      const key = loreName(skill);
      if (!key) return skill;
      const clone = { ...skill };
      setOptions(clone, key);
      return clone;
    });
  }
  return result;
}
function patchContext(app, data) {
  const skill = data?._selectedSkill;
  const key = loreName(skill);
  if (app.__merpLoreSkill !== key) {
    app.__merpLoreSpec = null;
    app.__merpLoreUserCustom = false;
    app.__merpLorePath = null;
    app.__merpLoreText = "";
  }
  app.__merpLoreSkill = key;
  if (!key) return data;
  const options = setOptions(skill, key);
  data._options = options;
  data._hasOptions = options.length > 0;
  if (typeof data._addButtonEnabled === "boolean") data._addButtonEnabled = true;
  let selected = String(app.__merpLoreSpec ?? app?._response?.specialization ?? app?._enteredSpecialization ?? "");
  if (selected && !options.includes(selected) && !app.__merpLoreUserCustom) {
    // An existing Actor may hold a previously valid free-form RMU topic.
    // Keep it editable instead of silently changing it to the first MERP leaf.
    app.__merpLoreUserCustom = true;
    app.__merpLoreText = selected;
  }
  if (!selected) selected = options[0] ?? "";
  app._enteredSpecialization = selected;
  if (app._response && typeof app._response === "object") app._response.specialization = selected;
  if (selected && options.includes(selected)) {
    app._selectedSpecialIndex = options.indexOf(selected);
    data._selectedSpecialIndex = app._selectedSpecialIndex;
  }
  app.__merpLoreSpec = selected;
  return data;
}

function findPath(nodes, value, path = []) {
  for (const node of nodes) {
    const here = [...path, node];
    if (node.value === value && !node.children?.length) return here;
    if (node.children?.length) {
      const found = findPath(node.children, value, here);
      if (found) return found;
    }
  }
  return null;
}
function rootOf(app, html) {
  for (const element of [app?.element, html?.[0], html]) {
    if (!(element instanceof HTMLElement)) continue;
    const root = element.closest(".application, .window-app") ?? element;
    if (root.classList.contains("rmu-culture-skill-dialog") ||
        root.classList.contains("rmu-add-untrained-skill-dialog")) return root;
  }
  return null;
}
function writeNative(app, specialization) {
  if (!specialization) return;
  app._enteredSpecialization = specialization;
  app.__merpLoreSpec = specialization;
  if (app._response && typeof app._response === "object") app._response.specialization = specialization;
  const skill = app?._selectedSkill;
  const index = skill?.options?.indexOf(specialization) ?? -1;
  if (index >= 0) app._selectedSpecialIndex = index;
}
function optionSelect(nodes, initial) {
  const select = document.createElement("select");
  select.className = "merp-lore-select";
  select.style.cssText = "width:100%; margin:4px 0; min-height:34px;";
  for (const node of nodes) {
    const opt = document.createElement("option");
    opt.value = node.value;
    opt.textContent = label(node);
    select.append(opt);
  }
  if (nodes.some(x => x.value === initial)) select.value = initial;
  return select;
}
function createSelector(app, root, key) {
  const old = root.querySelector("[data-merp-lore-picker]");
  // Every native RMU re-render can replace the whole skills card; do not retain
  // stale selections from the previous skill when its name changes.
  if (old?.dataset.skill === key) return;
  old?.remove();
  const host = root.querySelector(".rmu-row-culture-skill, .rmu-row-add-skill")
    ?? [...root.querySelectorAll(".rmu-card.with-legend")]
        .find(card => [...card.querySelectorAll("select")].length >= 1)
    ?? root.querySelector("form") ?? root;
  if (!host) return;

  const panel = document.createElement("div");
  panel.dataset.merpLorePicker = "true";
  panel.dataset.skill = key;
  panel.style.cssText = "padding:10px 12px; margin:8px 0; border:1px solid var(--color-border-light-tertiary, #a99); border-radius:6px; background:rgba(120,100,65,.06);";
  const heading = document.createElement("div");
  heading.style.cssText = "font-weight:700; margin:0 0 6px;";
  heading.textContent = text("Spécialisation MERP", "MERP specialization");
  panel.append(heading);
  const selectors = document.createElement("div");
  panel.append(selectors);
  const status = document.createElement("div");
  status.style.cssText = "margin-top:5px; font-size:.9em; opacity:.85;";
  panel.append(status);

  const persisted = app.__merpLoreSpec ?? "";
  let path = (Array.isArray(app.__merpLorePath) ? app.__merpLorePath : null)
    ?? findPath(LORE[key], persisted) ?? [];
  if (!path.length && app.__merpLoreUserCustom) {
    const walkCustom = nodes => {
      for (const node of nodes) {
        if (node.value === CUSTOM) return [node];
        if (node.children?.length) {
          const found = walkCustom(node.children);
          if (found) return [node, ...found];
        }
      }
      return null;
    };
    path = walkCustom(LORE[key]) ?? [];
  }
  if (!path.length) {
    let branch = LORE[key];
    while (branch?.length) {
      const node = branch[0]; path.push(node);
      branch = node.children;
    }
  }
  let customText = app.__merpLoreText ?? "";
  function renderLevel(depth) {
    selectors.replaceChildren();
    let branch = LORE[key];
    for (let i = 0; i < Math.max(1, path.length); i++) {
      if (!Array.isArray(branch) || !branch.length) break;
      const optionsAtLevel = branch;
      const picked = optionsAtLevel.find(n => n.value === path[i]?.value) ?? optionsAtLevel[0];
      const select = optionSelect(optionsAtLevel, picked.value);
      select.setAttribute("aria-label", text(`Niveau ${i + 1}`, `Level ${i + 1}`));
      select.addEventListener("change", () => {
        path = path.slice(0,i);
        const chosen = optionsAtLevel.find(n => n.value === select.value) ?? optionsAtLevel[0];
        app.__merpLoreUserCustom = chosen.value === CUSTOM;
        path.push(chosen);
        app.__merpLoreText = "";
        customText = "";
        let next = chosen.children;
        while (next?.length) { path.push(next[0]); next = next[0].children; }
        renderLevel(i);
      });
      selectors.append(select);
      branch = picked.children;
      if (branch?.length && i === path.length - 1) {
        path.push(branch[0]);
      }
    }
    app.__merpLorePath = [...path];
    const selected = path[path.length - 1];
    if (selected?.value === CUSTOM || selected?.value === "tbd") {
      const field = document.createElement("input");
      field.type = "text";
      field.placeholder = text("Précisez la spécialisation", "Enter specialization");
      field.value = customText;
      field.style.cssText = "width:100%; margin-top:5px;";
      field.addEventListener("input", () => {
        customText = field.value;
        app.__merpLoreText = customText;
        app.__merpLoreUserCustom = true;
        const value = customText.trim() || "tbd";
        writeNative(app, value);
        status.textContent = text("Spécialisation : ", "Specialization: ") + value;
      });
      selectors.append(field);
    }
    app.__merpLoreUserCustom = selected?.value === CUSTOM || selected?.value === "tbd";
    const value = app.__merpLoreUserCustom ? (customText.trim() || "tbd") : selected?.value;
    writeNative(app, value);
    status.textContent = text("Spécialisation : ", "Specialization: ") + (value ?? "");
  }
  renderLevel(0);
  host.append(panel);
}

function installOn(Proto, tag) {
  if (!Proto || Proto[tag]) return false;
  if (typeof Proto._getSkillSelectionOptions !== "function" ||
      typeof Proto._prepareContext !== "function") return false;
  const getOptions = Proto._getSkillSelectionOptions;
  const prepare = Proto._prepareContext;
  Proto._getSkillSelectionOptions = async function(...args) {
    const result = await getOptions.apply(this, args);
    return patchOptionsResult(result, this);
  };
  Proto._prepareContext = async function(...args) {
    const data = await prepare.apply(this, args);
    return patchContext(this, data);
  };
  Proto[tag] = true;
  return true;
}

export async function installMerpLoreSelectors() {
  if (game.system?.id !== "rmu") return false;
  const route = p => foundry?.utils?.getRoute?.(p) ?? `/${p}`;
  const paths = [
    "systems/rmu/module/apps/creation/add-untrained-skill-dialog-v2.js",
    "systems/rmu/module/apps/creation/culture-skill-dialog-v2.js"
  ];
  let installed = 0;
  for (const path of paths) {
    try {
      const mod = await import(route(path));
      if (installOn(mod.default?.prototype, "__merpLoreSelectors")) installed++;
    } catch (error) {
      console.warn(`${MODULE} | Lore: RMU dialog unavailable (${path})`, error);
    }
  }
  if (installed) console.info(`${MODULE} | MERP Lore selectors installed (${installed}/2)`);
  return installed === 2;
}

Hooks.on("renderApplicationV2", (app, html) => {
  try {
    const root = rootOf(app, html);
    if (!root) return;
    const key = app.__merpLoreSkill;
    const existing = root.querySelector("[data-merp-lore-picker]");
    if (!key) { existing?.remove(); return; }
    createSelector(app, root, key);
  } catch (error) {
    console.warn(`${MODULE} | Lore picker render`, error);
  }
});
