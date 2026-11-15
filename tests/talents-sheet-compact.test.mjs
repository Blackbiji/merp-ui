import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The production UI file is imported as-is, with only the Foundry globals
// required for hook registration stubbed. This checks the real loaded module.
globalThis.Hooks = { on() {}, once() {} };
globalThis.game = { ready: false };
globalThis.document = { querySelectorAll: () => [] };
const { excerpt, labels, scanTalents } = await import("../scripts/merp-rmu/talents-sheet-compact.js");

test("the Foundry entrypoint loads the 2.0.8 preview code", () => {
  const source = readFileSync(new URL("../scripts/merp-ui.js", import.meta.url), "utf8");
  assert.match(source, /import "\.\/merp-rmu\/talents-sheet-compact\.js"/);
  assert.equal(globalThis.__MERP_UI_TALENT_SHEET_TEST__?.version, "2.0.8");
  assert.equal(globalThis.__MERP_UI_TALENT_SHEET_TEST__?.installed, undefined);
  assert.equal(globalThis.__MERP_UI_TALENT_SHEET_TEST__?.inspect().installed, true);
});

test("excerpt returns short text unchanged and cuts long text at a word boundary", () => {
  assert.equal(excerpt("  A   short   description  "), "A short description");
  const result = excerpt("This is a long description that should be cut at a word boundary.", 22);
  assert.ok(result.length <= 23);
  assert.ok(result.endsWith("…"));
  assert.ok(!result.includes("  "));
});

test("the controls follow MERP-UI content language", () => {
  assert.equal(labels("fr").read, "Lire la description");
  assert.equal(labels("en").read, "Read description");
  assert.equal(labels("fr").close, "Réduire");
});

test("a one-line RMU Talent remains unchanged mechanically", () => {
  const classes = new Set();
  const makeStyle = () => {
    const values = new Map();
    return {
      getPropertyValue: key => values.get(key)?.value ?? "",
      getPropertyPriority: key => values.get(key)?.priority ?? "",
      setProperty: (key, value, priority) => values.set(key, { value, priority })
    };
  };
  const element = {
    textContent: "A short description",
    childNodes: [],
    classList: { add: c => classes.add(c), contains: c => classes.has(c) },
    style: makeStyle(),
    closest: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  const root = { querySelectorAll: selector => {
    assert.equal(selector, ".rmu-talent-desc-row > .rmu-talent-desc");
    return [element];
  } };
  assert.deepEqual(scanTalents(root), { found: 1, enhanced: 1 });
  assert.equal(classes.has("merp-ui-talent-enhanced"), true);
  assert.equal(element.style.getPropertyValue("font-size"), "13px");
  assert.equal(element.style.getPropertyPriority("font-size"), "important");
});

test("styling is strictly scoped to the Actor Talent description container", () => {
  const css = readFileSync(new URL("../styles/merp-content-components.css", import.meta.url), "utf8");
  const marker = "MERP-UI 2.0.8 — Compact Actor Talents";
  const start = css.indexOf(marker);
  assert.ok(start >= 0);
  const addition = css.slice(start);
  assert.match(addition, /\.rmu-talent-desc-row > \.rmu-talent-desc\.merp-ui-talent-enhanced/);
  assert.match(addition, /\.merp-ui-talent-original \{ display: none !important;/);
  assert.match(addition, /\.merp-ui-talent-expanded/);
  assert.match(addition, /13px\/1\.3 "PragRoman"/);
});

test("no Talent document, Actor item, DP or RMU cost changes are introduced", () => {
  const js = readFileSync(new URL("../scripts/merp-rmu/talents-sheet-compact.js", import.meta.url), "utf8");
  assert.doesNotMatch(js, /actor\.update\(|item\.update\(|\.setFlag\(|\.delete\(/);
  assert.match(js, /\.rmu-talent-desc-row > \.rmu-talent-desc/);
  assert.match(js, /event\.stopPropagation\(\)/);
});
