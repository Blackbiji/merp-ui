/**
 * Dúnedain racial talents: bilingual localization with RMU-sized summaries.
 *
 * The catalogue retains the full editorial HTML (h1/h2 and its adaptation
 * notes). The actor's racial Talent, just like those of every other Race,
 * must display only the short rules-facing description in character creation.
 * Never modify ranks, costs, modifiers, effects, eligibility or actor identity.
 */
import { contentLanguage } from "./localization.js";

const MODULE_ID = "merp-ui";
const SOURCE = `modules/${MODULE_ID}/data/merp-rmu/talents-flaws-v2.json`;
export const DUNEDAIN_RACIAL_TALENT_KEYS = Object.freeze([
  "dunedain-longevity",
  "dunedain-disease-resistance",
  "dunedain-western-endurance"
]);
const keySet = new Set(DUNEDAIN_RACIAL_TALENT_KEYS);
/* Synchronous source text for preCreateItem: Foundry draws its creation row
 * before the async bilingual catalogue is necessarily available. Keep this
 * exact copy aligned with the three source paragraphs in talents-flaws-v2.json.
 * All long editorial entries remain preserved in that catalogue. */
const CREATION_TEXT = Object.freeze({
  "dunedain-longevity": {
    fr: "Les Dúnedain de sang relativement pur vivent généralement de 160 à 240 ans. Leur vigueur les accompagne longtemps, bien au-delà de l'âge atteint par la plupart des Hommes.",
    en: "Dúnedain of relatively pure ancestry generally live between 160 and 240 years. They retain their vigor well beyond the age reached by most Men."
  },
  "dunedain-disease-resistance": {
    fr: "L'héritage des Dúnedain leur donne une résistance naturelle aux maladies et aux affections provoquées par les privations.",
    en: "Their ancestry gives the Dúnedain a natural resistance to disease and to illnesses brought on by hardship or deprivation."
  },
  "dunedain-western-endurance": {
    fr: "Héritiers de Númenor, les Dúnedain supportent les longues marches, les veilles et les efforts prolongés grâce à leur constitution et à leur discipline.",
    en: "Heirs of Númenor, the Dúnedain endure long marches, sleepless watches, and sustained exertion through strength of body and discipline."
  }
});
const CREATION_NAMES = Object.freeze({
  "dunedain-longevity": {fr: "Longévité dúnadan", en: "Dúnedain Longevity"},
  "dunedain-disease-resistance": {fr: "Résistance aux maladies", en: "Disease Resistance"},
  "dunedain-western-endurance": {fr: "Endurance de l’Ouest", en: "Western Endurance"}
});
let dataPromise = null;

function sourceEntries() {
  if (!dataPromise) {
    const path = foundry?.utils?.getRoute ? foundry.utils.getRoute(SOURCE) : SOURCE;
    dataPromise = fetch(path, { cache: "no-store", credentials: "same-origin" })
      .then(response => {
        if (!response.ok) throw new Error(`Dúnedain Talent catalogue: HTTP ${response.status}`);
        return response.json();
      })
      .then(data => new Map((data.items ?? [])
        .filter(entry => keySet.has(entry.key))
        .map(entry => [entry.key, entry])))
      .catch(error => { dataPromise = null; throw error; });
  }
  return dataPromise;
}

function plain(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'").trim().toLowerCase();
}

export function identifyDunedainTalent(item, catalogue) {
  if (!item || item.type !== "talent") return null;
  const flaggedKey = item.flags?.[MODULE_ID]?.key;
  if (flaggedKey && !keySet.has(flaggedKey)) return null;
  const matches = [...catalogue.values()].filter(entry => {
    if (flaggedKey && flaggedKey !== entry.key) return false;
    const names = [entry.document?.name, entry.localizations?.fr?.name, entry.localizations?.en?.name];
    return names.some(name => name && plain(item.name) === plain(name));
  });
  return matches.length === 1 ? matches[0] : null;
}

/**
 * Return only the short narrative description.  The RMU creation table prints
 * this as a TEXT NODE in its own wrapper DIV (like Elven racial Talents), which
 * inherits the table's native ~9.5px typography. Its extra mechanical-value
 * P is authored by RMU separately at 16px and must never be changed.
 *
 * No H1/H2 headings, no P tag and no 16px inline style here.
 * Keep the full article in the source/Compendium unchanged.
 */
export function compactDunedainTalentDescription(entry, language) {
  const html = entry?.localizations?.[language === "en" ? "en" : "fr"]?.system?.description ?? "";
  const found = String(html).match(/<h2\b[^>]*>\s*Description\s*<\/h2>\s*<p\b[^>]*>([\s\S]*?)<\/p>/i);
  if (!found || /<[^>]+>/.test(found[1])) return null;
  // The authoritative source descriptions consist solely of plain text.
  return found[1].trim();
}

export function plannedDunedainTalentTranslation(item, catalogue, language) {
  const source = identifyDunedainTalent(item, catalogue);
  if (!source) return null;
  const localized = source.localizations?.[language === "en" ? "en" : "fr"];
  const compactDescription = compactDunedainTalentDescription(source, language);
  if (!localized?.name || !compactDescription) return null;
  const update = { _id: item.id };
  if (item.name !== localized.name) update.name = localized.name;
  if (item.system?.name !== localized.name) update["system.name"] = localized.name;
  if (item.system?.description !== compactDescription) {
    update["system.description"] = compactDescription;
  }
  return Object.keys(update).length > 1 ? update : null;
}

export async function relocalizeActorDunedainTalents({ language = contentLanguage(), actor = null } = {}) {
  const catalogue = await sourceEntries();
  const result = { scanned: 0, updated: 0, actors: 0 };
  const actors = actor ? [actor] : [...(game.actors?.contents ?? [])];
  for (const character of actors) {
    if (!character?.updateEmbeddedDocuments) continue;
    const updates = [];
    for (const item of character.items ?? []) {
      if (item.type !== "talent") continue;
      result.scanned++;
      const patch = plannedDunedainTalentTranslation(item, catalogue, language);
      if (patch) updates.push(patch);
    }
    if (!updates.length) continue;
    await character.updateEmbeddedDocuments("Item", updates, {
      merpUiDunedainTalentLocalization: true
    });
    result.updated += updates.length;
    result.actors++;
    if (character.sheet?.rendered) character.sheet.render({ force: true });
  }
  return result;
}

/**
 * Repair pre-existing rich HTML rows while the async actor localization is
 * underway. The 5 source elements are replaced with ONE compact paragraph;
 * RMU's separate mechanical paragraphs ("--", bonuses, etc.) survive.
 * Running twice, or switching FR/EN repeatedly, is idempotent.
 */
export async function localizeDunedainCreationTalentRows(root, language = contentLanguage()) {
  if (!root?.querySelectorAll) return 0;
  const catalogue = await sourceEntries();
  const locale = language === "en" ? "en" : "fr";
  let updated = 0;
  for (const table of root.querySelectorAll(".merp-ui-creation-talents-table")) {
    for (const row of table.querySelectorAll("tr,[role='row']")) {
      const cells = [...row.children].filter(el => el.matches?.("td,[role='cell']"));
      if (cells.length < 3) continue;
      const nameCell = cells[0];
      const identity = plain(nameCell.textContent);
      const entry = [...catalogue.values()].find(candidate =>
        [candidate.document?.name, candidate.localizations?.fr?.name, candidate.localizations?.en?.name]
          .some(name => plain(name) === identity)
      );
      if (!entry) continue;
      const localized = entry.localizations?.[locale];
      const summary = compactDunedainTalentDescription(entry, locale);
      if (!localized?.name || !summary) continue;
      const descriptionCell = cells.slice(2).find(cell => cell.querySelector("h1,h2,p")) ?? cells.at(-1);
      if (!descriptionCell) continue;
      if (nameCell.textContent.trim() !== localized.name) {
        nameCell.textContent = localized.name;
        updated++;
      }
      // RMU uses a DIV containing direct descriptive TEXT plus a separate
      // P for its mechanical value.  Do not insert a P around our prose.
      const authored = [...descriptionCell.querySelectorAll("h1,h2,p")];
      const candidate = authored.find(node => node.tagName === "H1")?.parentElement
        ?? descriptionCell.querySelector("div") ?? descriptionCell;
      const article = [...candidate.children].filter(node => node.matches?.("h1,h2,p"));
      const isRichArticle = article.length >= 5 &&
        ["H1","H2","P","H2","P"].every((tag,i) => article[i].tagName === tag);
      if (isRichArticle) {
        article[0].before(document.createTextNode(summary));
        for (const node of article.slice(0,5)) node.remove();
        updated++;
      } else {
        // Clean up descriptions created by RC6.4-6.6, which are P elements
        // with forced 16px typography. Mechanical P nodes have a B child;
        // never touch them or their contents.
        const oldSummary = [...candidate.children].find(node =>
          node.tagName === "P" && !node.querySelector("b,strong") &&
          node.getAttribute("style")?.includes("font-size: 16px")
        );
        if (oldSummary) {
          oldSummary.replaceWith(document.createTextNode(summary));
          updated++;
        } else {
          const textNode = [...candidate.childNodes].find(node =>
            node.nodeType === 3 && node.nodeValue.trim().length > 8
          );
          if (textNode && textNode.nodeValue.trim() !== summary) {
            textNode.nodeValue = summary;
            updated++;
          }
        }
      }
    }
  }
  return updated;
}

let registered = false;
export function registerDunedainTalentLocalizationHooks() {
  if (registered) return;
  registered = true;
  // Do not let RMU ever render the enormous catalogue HTML in the actor's
  // Talent table, not even during the first frame before createItem finishes.
  Hooks.on("preCreateItem", (item, data, options) => {
    if (options?.merpUiDunedainTalentLocalization) return;
    if (item?.type !== "talent" || item?.parent?.documentName !== "Actor") return;
    const key = item.flags?.[MODULE_ID]?.key;
    if (!keySet.has(key) || typeof item.updateSource !== "function") return;
    const locale = contentLanguage() === "en" ? "en" : "fr";
    const text = CREATION_TEXT[key]?.[locale];
    if (!text) return;
    item.updateSource({ name: CREATION_NAMES[key][locale], system: { description: text } });
  });
  Hooks.on("createItem", (item, options, userId) => {
    if (options?.merpUiDunedainTalentLocalization || userId !== game.user?.id) return;
    if (item.type !== "talent" || item.parent?.documentName !== "Actor") return;
    const key = item.flags?.[MODULE_ID]?.key;
    // Only touch the three racial Talents, never other ancestry options.
    if (!keySet.has(key)) return;
    relocalizeActorDunedainTalents({ actor: item.parent }).catch(error =>
      console.error(`${MODULE_ID} | Dúnedain Talent localization`, error));
  });
}
