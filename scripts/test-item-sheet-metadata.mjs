import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { translateItemSheetLabel, loadItemSheetCategoryMaps } from "./merp-rmu/item-sheet-metadata.js";

const expectedEn = new Map([
  ["Cat. Compétence", "Skill Category"],
  ["Caracs. de la Compétence", "Skill Characteristics"],
  ["Compétence", "Skill"],
  ["Spécialisation:", "Specialization:"],
  ["Catégorie", "Category"],
  ["Coût en PD", "DP Cost"],
  ["Non", "No"],
  ["Oui", "Yes"],
  ["Modificateur restreint", "Restricted Modifier"]
]);
for (const [fr, en] of expectedEn) {
  assert.equal(translateItemSheetLabel(fr, "en"), en, fr);
  if (fr !== "Caracs. de la Compétence" && fr !== "Cat. Compétence") {
    assert.equal(translateItemSheetLabel(en, "fr"), fr, en);
  }
}
assert.equal(translateItemSheetLabel("Blood Songs", "en"), null);
assert.equal(translateItemSheetLabel("RS, RS, Em", "en"), null);
assert.equal(translateItemSheetLabel("-10", "en"), null);
assert.equal(translateItemSheetLabel("The Dúnedain are less vulnerable", "en"), null);

const content = JSON.parse(readFileSync(new URL("../translations/skill-categories/categories.fr.json", import.meta.url)));
globalThis.fetch = async () => ({ok:true,json:async () => content});
const categories = await loadItemSheetCategoryMaps();
assert.equal(translateItemSheetLabel("Manipulation de Pouvoir", "en", categories), "Power Manipulation");
assert.equal(translateItemSheetLabel("Power Manipulation", "fr", categories), "Manipulation de Pouvoir");
assert.equal(translateItemSheetLabel("Expertise Martiale", "en", categories), "Battle Expertise");
assert.equal(translateItemSheetLabel("Battle Expertise", "fr", categories), "Expertise Martiale");
console.log("Bilingual Item-sheet UI labels and categories validated; no data fields modified.");
