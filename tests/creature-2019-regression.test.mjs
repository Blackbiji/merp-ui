import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(path,'utf8');
const wolf = JSON.parse(read('source/creatures/actors/wolf.json'));
const warg = JSON.parse(read('source/creatures/actors/warg.json'));
const script = read('scripts/merp-rmu/creature-lore.js');
const locale = read('scripts/merp-rmu/creature-localization.js');
const sync = read('scripts/merp-rmu/content-sync.js');
const module = JSON.parse(read('module.json'));

test('2.0.19 uses the single working creature localiser', () => {
  assert.equal(module.version,'2.0.19');
  assert.match(script,/import \{ installCreatureActorLocalisation \} from '\.\/creature-localization\.js';/);
  assert.match(script,/installCreatureActorLocalisation\(\)/);
  assert.ok(!script.includes('DialogV2.alert'));
  assert.ok(script.includes('DialogV2.prompt'));
  assert.ok(script.includes('fallbackLanguage'));
  assert.ok(locale.includes('const CREATURE_NAMES = Object.freeze'));
  assert.ok(locale.includes("fr:'Loup', en:'Wolf'"));
  assert.ok(locale.includes("fr:'Ouargue', en:'Warg'"));
  assert.ok(locale.includes('function showActorName'));
  assert.ok(locale.includes('function refreshOpenSheets'));
  assert.ok(!locale.includes('original creature localiser'));
});
test('Culture post-write audit skips unsupported RMU editorial field only', () => {
  assert.ok(sync.includes("localized.type === 'culture'"));
  assert.ok(sync.includes('delete supportedSystem.culture;'));
  assert.ok(sync.includes("addChangedLeaves(patch, 'system', current.system ?? {}, supportedSystem)"));
});
test('Wolf/Warg share image and token artwork, preserving Warg combat token settings', () => {
  assert.equal(warg.img,wolf.img);
  assert.equal(warg.prototypeToken.texture.src,wolf.prototypeToken.texture.src);
  assert.equal(warg.prototypeToken.disposition,-1);
  assert.equal(warg.prototypeToken.width,2);
  assert.equal(warg.prototypeToken.height,2);
  assert.equal(warg.prototypeToken.name,'Warg');
  assert.equal(warg.items.length,28);
  assert.equal(wolf.items.length,27);
  assert.deepEqual(Object.keys(warg.flags['merp-ui'].creatureLore.lore).sort(),['racial','region']);
  assert.equal(warg.system.description.includes('data-merp-ui-lore="historic"'),false);
});
