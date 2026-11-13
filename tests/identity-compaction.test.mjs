import test from "node:test";
import assert from "node:assert/strict";
import {
  compactEmbeddedIdentityData,
  compactPendingActorIdentities,
  compactCreatedActorIdentity
} from "../scripts/merp-rmu/embedded-identity-compaction.js";

const hugeText = "a".repeat(85_000);
function race() {
  return {
    type: "race", _id: "abc", name: "Humans (Hildor)",
    system: { health: { baseHits: 25 }, description: hugeText },
    flags: {
      "merp-ui": {
        compendiumPack: "merp-rmu-races",
        compendiumSourceKey: "race-humans",
        selectedCampaignAge: 3,
        compendiumAgeVariants: {
          1: { document: { system: { description: hugeText } } },
          2: { document: { system: { description: hugeText } } },
          3: { document: { system: { description: hugeText } } },
          4: { document: { system: { description: hugeText } } }
        },
        compendiumLocalizations: {
          fr: { system: { description: hugeText } },
          en: { system: { description: hugeText } }
        }
      },
      rmu: { other: 22 }
    }
  };
}

test("pure compaction strips historical prose but preserves RMU mechanics and Item IDs", () => {
  const input = race();
  const before = JSON.stringify(input);
  const output = compactEmbeddedIdentityData(input);
  assert.ok(output);
  assert.equal(output._id, input._id);
  assert.equal(output.system.health.baseHits, input.system.health.baseHits);
  assert.equal(output.system.description, "");
  assert.equal(output.flags["merp-ui"].selectedCampaignAge, 3);
  assert.equal(output.flags["merp-ui"].compendiumSourceKey, "race-humans");
  assert.deepEqual(output.flags.rmu, input.flags.rmu);
  assert.equal("compendiumAgeVariants" in output.flags["merp-ui"], false);
  assert.equal("compendiumLocalizations" in output.flags["merp-ui"], false);
  assert.equal(JSON.stringify(input), before, "Compendium source remains intact");
  assert.ok(JSON.stringify(output).length < before.length / 100);
});

test("unmanaged World and non-identity Item data are untouched", () => {
  assert.equal(compactEmbeddedIdentityData({
    type: "equipment", flags: { "merp-ui": { compendiumPack: "pack", compendiumAgeVariants: {} } }
  }), null);
  assert.equal(compactEmbeddedIdentityData({
    type: "race", flags: { rmu: { compendiumAgeVariants: {} } }
  }), null);
});

test("unresolved native profession information remains available for RMU resolution", () => {
  const profession = {
    type: "profession",
    flags: { "merp-ui": {
      compendiumPack: "merp-rmu-professions",
      nativeProfessionDefinition: { sourcePack: "rmu.core" },
      compendiumLocalizations: { en: { description: hugeText } }
    } }
  };
  const output = compactEmbeddedIdentityData(profession);
  assert.equal(output.flags["merp-ui"].nativeProfessionDefinition.sourcePack, "rmu.core");
});

test("Actor precreation compacts only MERP identity Items and preserves equipment", () => {
  const items = [race(), { _id: "sword", type: "equipment", name: "Sword", system: { damage: 99 } }];
  let updated = null;
  const actor = { toObject() { return { items }; }, updateSource(change) { updated = change; } };
  assert.equal(compactPendingActorIdentities(actor), 1);
  assert.equal(updated.items.length, 2);
  assert.deepEqual(updated.items[1], items[1]);
  assert.equal(updated.items[0].system.health.baseHits, items[0].system.health.baseHits);
  assert.equal(updated.items[0].system.description, "");
});

test("Actor createItem patch deletes only redundant flags and verifies deletion", async () => {
  const item = race();
  item.parent = { documentName: "Actor" };
  item.update = async changes => {
    assert.equal(changes["flags.merp-ui.-=compendiumAgeVariants"], null);
    assert.equal(changes["flags.merp-ui.-=compendiumLocalizations"], null);
    for (const key of Object.keys(changes)) {
      if (key.startsWith("flags.")) delete item.flags["merp-ui"][key.split("-=")[1]];
      else if (key === "system.description") item.system.description = "";
    }
  };
  const output = await compactCreatedActorIdentity(item);
  assert.deepEqual(output.removed, ["compendiumAgeVariants", "compendiumLocalizations"]);
});

test("small notes and basic identity metadata remain on Actor", () => {
  const item = { type: "culture", system: { description: "Small player note" },
    flags: { "merp-ui": { compendiumSourceKey: "culture-noldor", selectedCampaignAge: 2,
      compendiumLocalizations: { fr: { name: "Noldor" } } } } };
  const output = compactEmbeddedIdentityData(item);
  assert.equal(output.system.description, "Small player note");
  assert.equal(output.flags["merp-ui"].selectedCampaignAge, 2);
  assert.equal(output.flags["merp-ui"].compendiumSourceKey, "culture-noldor");
});
