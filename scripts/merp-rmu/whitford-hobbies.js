/**
 * Whitford adolescent Hobby ranks for all MERP-UI cultures (all Ages),
 * Separate from RMU cultureRanks and its 80-DP editor budget.
 * Elections are recorded on the embedded Culture, with no Skill Items added
 * until RMU has finished level-zero character creation.
 * RMU remains the rules engine; its own Skill picker resolves specializations.
 */
import { WHITFORD_HOBBY_QUOTAS } from "./whitford-hobby-quotas.js";

const MODULE = "merp-ui";
const FLAG = "whitfordHobbyElections";
const APPLIED = "whitfordHobbyApplied";
const MAX_PER_SKILL = 2;
const TARGET_KEYS = new Set(Object.keys(WHITFORD_HOBBY_QUOTAS));
// Static fallback names are shared across all render passes, rather than
// rebuilt for each embedded culture checked by hobbyCulture().
const EXCEPTIONAL_CULTURE_NAMES = Object.freeze({
  "sindar": "culture-elf-sindar",
  "nandor": "culture-elf-nandor",
  "teleri - falmari": "culture-teleri"
});
const PETTY_DWARF_NAMES = new Set([
  "petits-nains - noegyth nibin", "petits-nains (noegyth nibin)",
  "petty-dwarves - noegyth nibin", "petty dwarves - noegyth nibin",
  "petty-dwarves (noegyth nibin)"
]);
const mounted = Symbol.for("merp-ui.whitford-hobbies-installed");
const WORDS = {
  fr: {title:"Compétences de loisirs", available:"rangs disponibles", instructions:"Choisissez librement les compétences et leurs spécialisations (2 rangs maximum par spécialisation). Ces rangs sont distincts des 80 PD culturels.",none:"Aucun rang de loisir attribué.", add:"Ajouter une compétence de loisirs", ranks:"Rangs",remove:"Retirer",choose:"Compétence de loisir",next:"Suivant",cancel:"Annuler",missing:"Précisez la spécialisation de cette compétence de loisir.",limit:"Maximum 2 rangs de Hobby par spécialisation.",finish:"Attribuez les {count} rangs de loisir avant de terminer la création.",error:"Impossible d'attribuer ce rang de Hobby.",applyError:"Les rangs de Hobby n'ont pas pu être appliqués complètement. Voir F12."},
  en: {title:"Hobby Skills",available:"ranks remaining",instructions:"Allocate these free ranks to skills and specializations (maximum 2 ranks per specialization). They are separate from the 80 cultural DPs.",none:"No Hobby ranks allocated.",add:"Choose a Hobby skill",ranks:"Ranks",remove:"Remove",choose:"Hobby skill",next:"Next",cancel:"Cancel",missing:"Specify a specialization for this Hobby skill.",limit:"Maximum 2 Hobby ranks per specialization.",finish:"Allocate all {count} Hobby ranks before finishing creation.",error:"Unable to allocate this Hobby rank.",applyError:"Hobby ranks could not all be applied. See F12."}
};
const t = k => WORDS[String(game?.i18n?.lang??"fr").startsWith("fr")?"fr":"en"][k];
const applying = new Set();
let nativeDialog;
let skillsLib;
let cultureLib;

// RC5/B2: age-variant culture Items do not always preserve canonicalKey.
// Resolve ONLY identified Whitford cultures, never infer from race alone.
function cultureKey(culture) {
  if (culture?.type !== "culture") return null;
  const flags = culture.flags?.[MODULE] ?? {};
  // Exact, stable names in MERP-UI compendiums: these three are the
  // non-12-rank *common* elven cultures. Prefer their names if older actor
  // flags incorrectly point to a different (12-rank) elven culture.
  const normalizedName = String(culture.name ?? "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[\u2010-\u2015]/g, "-").replace(/\s+/g, " ").trim();
  if (Object.hasOwn(EXCEPTIONAL_CULTURE_NAMES, normalizedName))
    return EXCEPTIONAL_CULTURE_NAMES[normalizedName];
  const values = [flags.key, flags.canonicalKey, flags.compendiumSourceKey,
    flags.sourceAgeKey, flags.sourceKey];
  for (const value of values) {
    const key = String(value ?? "").trim().replace(/-age-[1-4]$/, "");
    if (TARGET_KEYS.has(key)) return key;
  }
  // Exact localized identity only; no partial or generic 'dwarf' matching.
  // The canonical name may survive even when an RMU import drops module flags.
  return PETTY_DWARF_NAMES.has(normalizedName) ? "culture-petty-dwarves" : null;
}
export function hobbyCulture(actor) {
  // There can be old imported cultures in the Actor: do not just inspect the first.
  const matches = Array.from(actor?.items ?? []).filter(i => cultureKey(i));
  return matches.length === 1 ? matches[0] : null;
}
export function hobbyLimit(culture) {
  const key = cultureKey(culture);
  if (!key) return 0;
  // The quota table is authoritative for every identified culture.  The
  // earlier hobbyRanksUnallocated field was initialised to 12 for our pilot
  // cultures and can be stale on old embedded Item data.  It is not a GM
  // override and must never supersede Sindar=8, Nandor=10 or Teleri=8.
  // A new explicit override flag may be used by a GM if intentionally set.
  const override = culture?.flags?.[MODULE]?.whitfordEducation?.hobbyRanksOverride;
  if (override !== undefined && override !== null && override !== "") {
    const n = Number(override);
    if (Number.isInteger(n) && n >= 0 && n <= 24) return n;
  }
  return WHITFORD_HOBBY_QUOTAS[key] ?? 0;
}
function elections(culture) {
  return Array.isArray(culture?.flags?.[MODULE]?.[FLAG]) ? culture.flags[MODULE][FLAG] : [];
}
function used(rows) { return rows.reduce((n, row) => n + (Number(row.ranks) || 0), 0); }
function same(a, b) {
  return a.skillCategory === b.skillCategory && a.skillName === b.skillName &&
    (a.trainingGroup || "") === (b.trainingGroup || "") &&
    (a.specialization || "") === (b.specialization || "") && (a.exotic || "") === (b.exotic || "");
}
const escapeHTML = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
function translate(prefix, name) {
  const key = `${prefix}${name ?? ""}`;
  const localized = game.i18n.localize(key);
  return localized !== key ? localized : String(name ?? "");
}
async function loadRmu() {
  const route = s => foundry?.utils?.getRoute?.(s) ?? `/${s}`;
  const [dialog, skills, culture] = await Promise.all([
    nativeDialog ??= import(route("systems/rmu/module/apps/creation/culture-skill-dialog-v2.js")),
    skillsLib ??= import(route("systems/rmu/module/rmu/skills/skills-compendium.js")),
    cultureLib ??= import(route("systems/rmu/module/rmu/character/culture.js"))
  ]);
  return { Dialog: dialog.default, Skills: skills, Culture: culture };
}
async function pickSkill(culture) {
  const { Skills } = await loadRmu();
  const skills = await Skills.getCachedSkills();
  const already = elections(culture);
  const seenSkills = new Set();
  const ordered = skills.filter(s => {
    const key = `${s.system?.category}|${s.system?.name}`;
    if (!s.system?.category || !s.system?.name || seenSkills.has(key)) return false;
    seenSkills.add(key);
    return true;
  })
    .filter(s => !already.some(r => r.skillCategory === s.system.category &&
      r.skillName === s.system.name && !r.specialization))
    .sort((a,b) => {
      const categoryA = translate("RMU.SkillCategory.", a.system.category);
      const categoryB = translate("RMU.SkillCategory.", b.system.category);
      return categoryA.localeCompare(categoryB,game.i18n.lang) ||
        translate("RMU.Skills.",a.system.name).localeCompare(translate("RMU.Skills.",b.system.name),game.i18n.lang);
    });
  if (!ordered.length) return null;
  let category = "";
  const parts=[];
  for (let i=0;i<ordered.length;i++) {
    const skill=ordered[i].system;
    if(skill.category!==category) {
      if (category) parts.push("</optgroup>");
      category=skill.category;
      parts.push(`<optgroup label="${escapeHTML(translate("RMU.SkillCategory.",category))}">`);
    }
    parts.push(`<option value="${i}">${escapeHTML(translate("RMU.Skills.",skill.name))}</option>`);
  }
  parts.push("</optgroup>");
  const result=await foundry.applications.api.DialogV2.wait({
    window:{title:t("title") + " — " + t("choose")},classes:["rmu-dialogv2-sheet"],
    content:`<label for="merp-hobby-skill">${escapeHTML(t("choose"))}</label><select id="merp-hobby-skill" style="width:100%">${parts.join("")}</select>`,
    buttons:[
      {action:"ok",label:t("next"),default:true,callback:(_e,_b,app)=>Number(app.element.querySelector("#merp-hobby-skill")?.value ?? -1)},
      {action:"cancel",label:t("cancel"),callback:()=>null}
    ],rejectClose:false
  });
  if (!Number.isInteger(result) || !ordered[result]) return null;
  return {category:ordered[result].system.category,skillName:ordered[result].system.name};
}
async function addHobby(sheet, culture) {
  const limit = hobbyLimit(culture);
  if (used(elections(culture)) >= limit) return;
  const selected = await pickSkill(culture);
  if (!selected) return;
  // Use RMU's native skill/specialization chooser, which creates NO Items.
  const { Dialog } = await loadRmu();
  const cat = selected.category;
  const group = {skillCategory:cat, skillName:selected.skillName, ranks:limit,
    elections:foundry.utils.deepClone(elections(culture)).filter(r=>r.skillCategory===cat)};
  const result = await Dialog.asPromise({actor:sheet.document, data:{category:cat, cultureData:{[cat]:group}}});
  if (!result?.skillName || !result?.skillCategory) return;
  if (result.specialization === "tbd") {
    ui.notifications.warn(t("missing"));
    return;
  }
  // The two dialogs above are asynchronous.  Read a fresh copy after they
  // close, so an abandoned/failed save cannot mutate Foundry's live flags,
  // and concurrent rank edits are not overwritten by a stale snapshot.
  if (!sheet.document.items.has(culture.id)) return;
  const rows = foundry.utils.deepClone(elections(culture));
  const currentLimit = hobbyLimit(culture);
  if (used(rows) >= currentLimit) return;
  const row = {skillCategory:result.skillCategory,skillName:result.skillName,
    trainingGroup:result.trainingGroup || null,specialization:result.specialization || null,
    exotic:result.exotic || null,ranks:1};
  const existing = rows.find(r=>same(r,row));
  if (existing) {
    const current = Number(existing.ranks) || 0;
    if (current >= MAX_PER_SKILL) {ui.notifications.warn(t("limit")); return;}
    existing.ranks = current + 1;
  } else rows.push(row);
  if (used(rows) > currentLimit) return;
  await culture.setFlag(MODULE,FLAG,rows);
}
async function updateHobby(culture, index, newRanks) {
  const rows = foundry.utils.deepClone(elections(culture));
  if (!rows[index]) return;
  const amount = Number(newRanks);
  if (!Number.isInteger(amount) || amount < 0 || amount > MAX_PER_SKILL) return false;
  rows[index].ranks = amount;
  const clean = rows.filter(r=>r.ranks>0);
  if (used(clean)>hobbyLimit(culture)) return false;
  await culture.setFlag(MODULE,FLAG,clean);
  return true;
}
function renderHobbies(sheet) {
  const culture = hobbyCulture(sheet.document);
  const root = sheet.element;
  const table = root?.querySelector(".rmu-culture-skill-elections-table");
  if (!culture || !table || Number(sheet.document.system.view) !== 0) return;
  const limit = hobbyLimit(culture);
  if (limit <= 0) return;
  const rows = elections(culture);
  const remaining = Math.max(0, limit-used(rows));
  table.parentElement?.querySelectorAll(":scope > .merp-whitford-hobbies").forEach(el => el.remove());
  const slot = document.createElement("section");
  slot.className = "merp-whitford-hobbies";
  slot.innerHTML = `<div class="merp-whitford-hobbies__head"><strong>${escapeHTML(t("title"))}</strong><span>${remaining} / ${limit} ${escapeHTML(t("available"))}</span></div>
    <p>${escapeHTML(t("instructions"))}</p>
    <div class="merp-whitford-hobbies__list">${rows.length ? rows.map((r,i)=>
      `<div class="merp-whitford-hobbies__line"><span>${escapeHTML(translate("RMU.SkillCategory.",r.skillCategory))} — ${escapeHTML(translate("RMU.Skills.",r.skillName))}${r.specialization?" : "+escapeHTML(translate("RMU.Specializations.",r.specialization)):""}</span><label>${escapeHTML(t("ranks"))} <span class="merp-whitford-hobbies__spinner"><input type="number" data-hobby-rank="${i}" min="0" max="2" step="1" value="${r.ranks}"></span></label><button type="button" data-hobby-remove="${i}" title="${escapeHTML(t("remove"))}">✕</button></div>`).join("") : `<em>${escapeHTML(t("none"))}</em>`}</div>
    <button type="button" class="merp-whitford-hobbies__add" ${remaining ? "" : "disabled"}>+ ${escapeHTML(t("add"))}</button>`;
  table.insertAdjacentElement("afterend",slot);
  const add = slot.querySelector(".merp-whitford-hobbies__add");
  add?.addEventListener("click",()=>{add.disabled=true;addHobby(sheet,culture).catch(e=>{console.error("merp-ui | Hobby",e);ui.notifications.error(t("error"));}).finally(()=>{if(add.isConnected)add.disabled=false;});});
  for (const field of slot.querySelectorAll("[data-hobby-rank]")) field.addEventListener("change",()=>updateHobby(culture,+field.dataset.hobbyRank,field.value).then(ok=>{if(ok===false) {field.value=elections(culture)[+field.dataset.hobbyRank]?.ranks??0;ui.notifications.warn(t("limit"));}}).catch(console.error));
  for (const button of slot.querySelectorAll("[data-hobby-remove]")) button.addEventListener("click",()=>updateHobby(culture,+button.dataset.hobbyRemove,0).catch(console.error));
}
async function applyHobbies(actor, culture) {
  if (!culture || culture.flags?.[MODULE]?.[APPLIED] === true) return;
  const rows = elections(culture);
  if (used(rows) !== hobbyLimit(culture) || actor.system.view === 0 || !actor.items.some(i=>i.type==="profession")) return;
  if (applying.has(actor.id)) return;
  applying.add(actor.id);
  try {
    const { Skills, Culture } = await loadRmu();
    const cached = await Skills.getCachedSkills();
    for (const row of rows) {
      const item = actor.items.find(i => i.type === "skill" && same({
        skillCategory:i.system.category, skillName:i.system.name, trainingGroup:i.system.trainingGroup,
        specialization:i.system.specialization, exotic:i.system.exotic
      }, row));
      if (item) {
        const already = Number(item.flags?.[MODULE]?.whitfordHobbyGranted || 0);
        const delta = row.ranks - already;
        if (delta > 0) await item.update({"system.cultureRanks":Number(item.system.cultureRanks || 0)+delta,
          [`flags.${MODULE}.whitfordHobbyGranted`]:row.ranks});
      } else {
        if (!cached.some(i=>i.system?.category===row.skillCategory && i.system?.name===row.skillName))
          throw new Error(`Compétence RMU introuvable: ${row.skillCategory}/${row.skillName}`);
        const docs = await Culture.prepareCultureSkillEmbeddedDocuments([row]);
        if (!docs.length) throw new Error(`Création Hobby impossible: ${row.skillName}`);
        docs[0].flags ??= {};
        docs[0].flags[MODULE] ??= {};
        docs[0].flags[MODULE].whitfordHobbyGranted = row.ranks;
        await actor.createEmbeddedDocuments("Item", [docs[0]]);
      }
    }
    await culture.setFlag(MODULE,APPLIED,true);
    console.info(`merp-ui | ${rows.length} compétences Hobby appliquées à ${actor.name} (${used(rows)} rangs)`);
  } catch(e) {
    console.error("merp-ui | Erreur d'attribution Hobby (réessayable)",e);
    ui.notifications.error(t("applyError"));
  } finally {applying.delete(actor.id);}
}
export async function installWhitfordHobbies() {
  if(game.system?.id!=="rmu") return false;
  const route=foundry?.utils?.getRoute?.("systems/rmu/module/apps/actor/character-sheet-v2.js") ?? "/systems/rmu/module/apps/actor/character-sheet-v2.js";
  const {default: Sheet} = await import(route);
  const proto = Sheet?.prototype;
  if(!proto || proto[mounted]) return !!proto;
  const nativeRender=proto._onRender;
  proto._onRender=function(...args) {
    const result=nativeRender.apply(this,args);
    try{renderHobbies(this);}catch(e){console.warn("merp-ui | Panneau Hobby indisponible",e);}
    return result;
  };
  const nativeFinish=proto._onFinishDevelopment;
  proto._onFinishDevelopment=async function(event) {
    const culture=hobbyCulture(this.document);
    if(culture && hobbyLimit(culture)>0 && used(elections(culture)) !== hobbyLimit(culture)) {
      event?.preventDefault?.();
      ui.notifications.warn(t("finish").replace("{count}", String(hobbyLimit(culture))));
      return;
    }
    const result=await nativeFinish.call(this,event);
    if(culture) await applyHobbies(this.document,culture);
    return result;
  };
  proto[mounted]=true;
  return true;
}
