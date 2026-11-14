import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  creationDestination,
  hasCreationTalents,
  shouldShowEmptyTalentsStep,
  creationTalentsCopy
} from "../scripts/merp-rmu/creation-talents-order.js";

const newActor = (items = [], view = 0) => ({
  type: "Character",
  system: { view },
  items
});

test("RMU creation passes through Talents & Flaws before Combat Training in both directions", () => {
  assert.equal(creationDestination(3, 1), 5);
  assert.equal(creationDestination(5, -1), 3);
  assert.equal(creationDestination(5, 1), 4);
  assert.equal(creationDestination(4, -1), 5);
});

test("characters without racial Talents still see the creation stage", () => {
  const a = newActor();
  assert.equal(hasCreationTalents(a), false);
  assert.equal(shouldShowEmptyTalentsStep(a, 5), true);
  assert.equal(shouldShowEmptyTalentsStep(a, 4), false);
});

test("a native racial Talent or Flaw leaves the native RMU table authoritative", () => {
  assert.equal(hasCreationTalents(newActor([{ type: "talent" }])), true);
  assert.equal(shouldShowEmptyTalentsStep(newActor([{ type: "flaw" }]), 5), false);
  assert.equal(shouldShowEmptyTalentsStep(newActor([{ type: "talent" }]), 5), false);
});

test("no extra panel is added after creation is complete", () => {
  assert.equal(shouldShowEmptyTalentsStep(newActor([], 1), 5), false);
  assert.equal(shouldShowEmptyTalentsStep({ ...newActor(), type: "NPC" }, 5), false);
});

test("Talents and Flaws copy has complete FR/EN texts", () => {
  const fr = creationTalentsCopy("fr");
  const en = creationTalentsCopy("en");
  for (const key of ["title", "lead", "guidance", "button", "footnote", "notFound"]) {
    assert.ok(fr[key]?.length > 10, `French ${key} missing`);
    assert.ok(en[key]?.length > 10, `English ${key} missing`);
  }
  assert.match(fr.button, /Consulter/);
  assert.match(en.button, /Browse/);
});

test("compact PragRoman typography is scoped to the empty Talents step", () => {
  const css = readFileSync(new URL("../styles/merp-rmu-sheets.css", import.meta.url), "utf8");
  assert.match(css, /\.merp-ui-creation-empty-talents/);
  assert.match(css, /\.merp-ui-talents-step-typography/);
  assert.match(css, /font-family:\s*"PragRoman"/);
  assert.match(css, /font-size:\s*11px/);
  assert.match(css, /font-size:\s*13px/);
});

test("Compendium typography uses proportional row rhythm rather than fixed heights", () => {
  const css = readFileSync(new URL("../styles/merp-content-components.css", import.meta.url), "utf8");
  const marker = css.indexOf("MERP-UI 2.0.7 candidate");
  assert.ok(marker > 0);
  const excerpt = css.slice(marker, css.indexOf("/* Do not theme any other module", marker));
  assert.match(excerpt, /--merp-c-row-font-size:\s*15px/);
  assert.match(excerpt, /--merp-c-row-space:\s*\.62em/);
  assert.match(excerpt, /padding-block:\s*var\(--merp-c-row-space\)/);
  assert.match(excerpt, /height:\s*auto/);
  assert.doesNotMatch(excerpt, /min-height:\s*[1-9]\d*px/);
});
