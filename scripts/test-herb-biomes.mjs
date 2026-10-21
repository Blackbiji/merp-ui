import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodeHerbHabitat } from "./merp-rmu/herb-biomes.js";

const file = new URL("../data/merp-rmu/herbs-v1.json", import.meta.url);
const items = JSON.parse(readFileSync(file, "utf8")).items;
assert.equal(items.length, 187);

let decodedTerrain = 0;
for (const entry of items) {
  const item = entry.document;
  const data = decodeHerbHabitat(item, "fr");
  const source = item.flags?.["merp-ui"] ?? {};
  if (source.localeCode || item.system.biome) {
    assert.ok(data.terrain, "unknown biome for " + entry.key);
    decodedTerrain++;
  }
  if (source.climateCode) assert.ok(data.climate, "unknown climate for " + entry.key);
  if (source.regionCode) assert.ok(data.region, "unknown region for " + entry.key);
  // This helper is presentation only.
  assert.equal(item.system.biome, entry.document.system.biome);
}
const first = decodeHerbHabitat({
  type: "herb",
  flags: {"merp-ui":{sourceCode:"a-Z-5-U"}},
  system: {biome:"Z"}
}, "fr");
assert.equal(first.climate, "Aride");
assert.equal(first.terrain, "Désert");
assert.equal(first.difficulty, "Difficile (−10)");
assert.equal(first.region, "Ensemble d’Endor");

const en = decodeHerbHabitat({
  flags: {"merp-ui":{sourceCode:"m-D-6-NW"}},
  system: {biome:"D"}
}, "en");
assert.equal(en.terrain, "Deciduous or mixed forest");
assert.equal(en.difficulty, "Very Hard (−20)");
assert.equal(en.region, "Northwestern Endor");

const partial = decodeHerbHabitat({
  flags: {"merp-ui":{sourceCode:"c-F-2"}},
  system: {biome:"F"}
}, "fr");
assert.equal(partial.terrain, "Berges et rivages d’eau douce");
assert.equal(partial.region, null);
assert.equal(partial.difficulty, "Facile (+20)");

const exceptional = decodeHerbHabitat({
  flags: {"merp-ui":{sourceCode:"Woses-NW"}},
  system: {biome:""}
}, "fr");
assert.equal(exceptional.difficulty, null);
assert.equal(exceptional.climate, null);

console.log("Herb habitat help validated: " + decodedTerrain + " terrain codes from " + items.length + " entries; incomplete historical codes left unspecified.");
