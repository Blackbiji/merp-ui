import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveMerpLoreTable, localizedMerpLoreTableTitle, decorateMerpLoreTableWindow}
  from '../scripts/merp-rmu/lore-table-window.js';

const doc = (species = 'wolf') => ({
  documentName: 'RollTable',
  name: species === 'wolf' ? 'Loup / Wolf — Creature Lore' : 'Warg / Ouargue — Creature Lore',
  pack: 'merp-ui.merp-ui-lore',
  flags: {'merp-ui': {creatureLoreTable: {creatureKey: species, loreKey: 'all'}}}
});
const app = species => ({document: doc(species)});

test('translation uses MERP-UI content language and never requires renaming documents', () => {
  assert.equal(localizedMerpLoreTableTitle('wolf', 'fr'), 'Loup — Connaissance des créatures');
  assert.equal(localizedMerpLoreTableTitle('wolf', 'en'), 'Wolf — Creature Lore');
  assert.equal(localizedMerpLoreTableTitle('warg', 'fr'), 'Ouargue — Connaissance des créatures');
  assert.equal(localizedMerpLoreTableTitle('warg', 'en'), 'Warg — Creature Lore');
  assert.equal(localizedMerpLoreTableTitle('other', 'fr'), null);
});

test('decorate only MERP-UI consolidated RollTables, never unrelated documents', () => {
  assert.equal(resolveMerpLoreTable(app('wolf')).species, 'wolf');
  assert.equal(resolveMerpLoreTable({...app('wolf'), document: {...doc('wolf'), pack:'other.tables'}}), null);
  assert.equal(resolveMerpLoreTable({document: {...doc('wolf'), documentName:'Item'}}), null);
  assert.equal(resolveMerpLoreTable({document: {...doc('wolf'), flags:{}}}), null);
});

test('the title changes in an already open sheet without changing persistent data', () => {
  const a = app('warg');
  const savedName = a.document.name;
  const state = {title:'', header:savedName, classes: new Set()};
  const windowTitle = {set textContent(value){state.title = value;}};
  const heading = {textContent:savedName, matches:()=>false, querySelector:()=>null};
  const root = {classList:{add:value=>state.classes.add(value)},
    closest:()=>null, querySelector:()=>windowTitle,
    querySelectorAll:()=>[heading]};
  assert.equal(decorateMerpLoreTableWindow(a,[root],'fr'), true);
  assert.equal(state.title, 'Table : Ouargue — Connaissance des créatures');
  assert.equal(heading.textContent, 'Ouargue — Connaissance des créatures');
  assert.equal(decorateMerpLoreTableWindow(a,[root],'en'), true);
  assert.equal(state.title, 'Rollable Table : Warg — Creature Lore');
  assert.equal(heading.textContent, 'Warg — Creature Lore');
  assert.equal(a.document.name, savedName);
  assert.ok(state.classes.has('merp-ui-lore-table-window'));
});
