/**
 * Visual-only decoration of MERP-UI's two consolidated Creature Lore RollTables.
 * Their persistent names, embedded results and compendium UUIDs never change.
 */
const LORE_PACK = 'merp-ui.merp-ui-lore';
const TITLES = Object.freeze({
  wolf: Object.freeze({fr: 'Loup — Connaissance des créatures', en: 'Wolf — Creature Lore'}),
  warg: Object.freeze({fr: 'Ouargue — Connaissance des créatures', en: 'Warg — Creature Lore'})
});

export function resolveMerpLoreTable(app) {
  const doc = app?.document ?? app?.object ?? app?.options?.document;
  if (doc?.documentName !== 'RollTable') return null;
  const species = doc.flags?.['merp-ui']?.creatureLoreTable?.creatureKey;
  if (!Object.hasOwn(TITLES, species)) return null;
  const pack = typeof doc.pack === 'string' ? doc.pack :
    (doc.pack?.collection ?? doc.collection?.collection ?? '');
  const uuid = String(doc.uuid ?? '');
  const appId = String(app?.id ?? app?.options?.id ?? '');
  // Only the MERP-UI private compendium: do not change unrelated RollTables.
  if (pack !== LORE_PACK && !uuid.startsWith(`Compendium.${LORE_PACK}.RollTable.`)
      && !appId.includes('merp-ui-lore')) return null;
  return {document: doc, species};
}

export function localizedMerpLoreTableTitle(species, language = 'fr') {
  return TITLES[species]?.[language === 'en' ? 'en' : 'fr'] ?? null;
}

export function decorateMerpLoreTableWindow(app, roots = [], language = 'fr') {
  const target = resolveMerpLoreTable(app);
  if (!target) return false;
  const {document: doc, species} = target;
  const title = localizedMerpLoreTableTitle(species, language);
  const prefix = language === 'en' ? 'Rollable Table' : 'Table';
  const acceptedTitles = new Set([doc.name, ...Object.values(TITLES[species])]);
  const all = new Set(roots);
  const appElement = app?.element?.[0] ?? app?.element;
  if (appElement?.nodeType === 1) all.add(appElement);
  for (const root of all) {
    const outer = root?.closest?.('.application, .window-app') ?? root;
    if (!outer?.classList) continue;
    outer.classList.add('merp-ui-lore-table-window');
    const windowTitle = outer.querySelector?.('.window-header .window-title');
    if (windowTitle) windowTitle.textContent = `${prefix} : ${title}`;
    // Read-only native Foundry sheets show the document name as a heading.
    // Never alter editable inputs, the RollTable document or its stored name.
    for (const heading of outer.querySelectorAll?.('.window-content h1, .sheet-header h1, .window-content .document-name') ?? []) {
      if (heading.matches?.('input, textarea, [contenteditable="true"]')) continue;
      if (acceptedTitles.has(heading.textContent?.trim()) && !heading.querySelector?.('input, textarea, button')) {
        heading.textContent = title;
      }
    }
  }
  return true;
}
