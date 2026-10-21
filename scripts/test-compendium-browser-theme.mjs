import assert from "node:assert/strict";
import {
  resolveMerpCompendiumBrowser,
  decorateMerpCompendiumBrowser
} from "./merp-rmu/compendium-browser-theme.js";

const key = "merp-ui.merp-rmu-talents-flaws";
assert.equal(resolveMerpCompendiumBrowser({collection:{collection:key}}), key);
assert.equal(resolveMerpCompendiumBrowser({collection:key}), key);
assert.equal(resolveMerpCompendiumBrowser({pack:{metadata:{id:key}}}), key);
assert.ok(resolveMerpCompendiumBrowser({id:"compendium-" + key}));
assert.equal(resolveMerpCompendiumBrowser({collection:{collection:"rmu.core"}}), null);

const title="MERP-RMU — Talents & Défauts";
const root={
  nodeType:1, id:"", dataset:{},
  matches:(q)=>q.includes(".application"),
  classList:{list:new Set(), add(v){this.list.add(v);}, contains(v){return this.list.has(v);}},
  closest:()=>null
};
const packs=[{collection:key,title},{collection:"rmu.core",title:"RMU Core"}];
const app={title, element:root};
assert.equal(resolveMerpCompendiumBrowser(app,[root],packs),key);
assert.equal(decorateMerpCompendiumBrowser(app,[root],packs),true);
assert.equal(root.classList.contains("merp-ui-compendium-browser"),true);
assert.equal(root.dataset.merpUiCompendiumPack,key);

const other={title:"RMU Core",element:root};
root.classList.list.clear();
assert.equal(decorateMerpCompendiumBrowser(other,[root],packs),false);
assert.equal(root.classList.contains("merp-ui-compendium-browser"),false);
console.log("Compendium theme resolver: V13/V14 collection, id and title fallbacks OK.");
