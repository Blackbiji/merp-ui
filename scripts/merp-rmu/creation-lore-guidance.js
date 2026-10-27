/* MERP-UI RC5 — creation guidance and conservative lore specialization.
 * Own / Neighboring retain their native RMU meaning. Never manufacture a region.
 */
const MODULE = 'merp-ui';
const pending = new Set();
const ownText = el => (el?.textContent ?? '').trim();
const lang = (fr,en) => game.i18n?.lang?.toLowerCase().startsWith('fr') ? fr : en;
const actorOf = app => app?.actor ?? app?.document;
function selectedSingle(actor, kind) {
  const items = [...(actor?.items ?? [])].filter(i => i.type === kind);
  return items.length === 1 ? items[0] : null;
}
function isUnresolved(spec) {return /^(?:tbd|to be determined)$/i.test(String(spec ?? '').trim());}
function autoSpecialization(actor, item) {
  const name = item.system?.name ?? item.name;
  if (name === 'Racial Lore') return selectedSingle(actor, 'race')?.name?.trim() || null;
  if (name === 'Region Lore') {
    // Region and Culture are different. Only an explicitly configured origin can name the region.
    const region = actor.getFlag?.(MODULE, 'originRegion') ?? actor.system?.originRegion;
    return typeof region === 'string' && region.trim() ? region.trim() : null;
  }
  return null;
}
function scheduleLoreResolve(actor) {
  if (!actor || actor.type?.toLowerCase() !== 'character' || Number(actor.system?.view ?? 0) !== 0 || pending.has(actor.id)) return;
  pending.add(actor.id);
  Promise.resolve().then(async () => {
    try {
      const changes = [];
      for (const item of actor.items ?? []) {
        if (item.type !== 'skill' || !isUnresolved(item.system?.specialization)) continue;
        const specialization = autoSpecialization(actor, item);
        if (specialization) changes.push({_id:item.id, 'system.specialization':specialization});
      }
      if (changes.length) await actor.updateEmbeddedDocuments('Item', changes, {merpUiLoreResolved:true});
    } catch(e) {console.warn(`${MODULE} | Lore specialization`, e);}
    finally { pending.delete(actor.id); }
  });
}
function appendGuidance(app, html) {
  if (app.constructor?.name !== 'CharacterSheetV2RMU') return;
  const actor = actorOf(app);
  if (actor?.type?.toLowerCase() !== 'character') return;
  const root = html instanceof HTMLElement ? html : app.element instanceof HTMLElement ? app.element : app.element?.[0];
  if (!root?.querySelector('.rmu-character-creation-main')) return;
  const instruction = [...root.querySelectorAll('.rmu-character-creation-main .rmu-card.with-legend')]
    .find(card => [...card.querySelectorAll('.rmu-legend-chip')].some(chip => /^instructions$/i.test(ownText(chip))));
  if (!instruction || instruction.querySelector('[data-merp-starting-knowledge]')) return;
  const panel = document.createElement('div');
  panel.className = 'merp-ui-starting-knowledge';
  panel.dataset.merpStartingKnowledge = 'true';
  panel.innerHTML = lang(
    '<strong>Langues et connaissances de départ</strong><p>Votre Race et votre Culture déterminent des langues et des connaissances déjà acquises. Leurs rangs sont attribués automatiquement lorsqu’ils sont prévus. Consultez les fiches de Race et de Culture pour connaître ces attributions. Les connaissances de région restent liées à votre région d’origine : précisez-la avec votre Meneur si nécessaire.</p>',
    '<strong>Starting languages and lore</strong><p>Your Race and Culture determine languages and knowledge already acquired. Their ranks are assigned automatically where specified. Consult your Race and Culture entries to see these grants. Region Lore refers to your actual home region: define it with your GM if needed.</p>'
  );
  instruction.append(panel);
}
export function registerCreationLoreGuidance() {
  Hooks.on('renderApplicationV2', (app, html) => {
    try {appendGuidance(app, html);} catch(e) {console.warn(`${MODULE} | Creation instructions`,e);}
  });
  Hooks.on('createItem', item => {if (item.parent?.documentName === 'Actor' && ['skill','race','culture'].includes(item.type)) scheduleLoreResolve(item.parent);});
  Hooks.on('updateActor', (actor, change, options) => {if (!options?.merpUiLoreResolved && ('flags' in change || 'system' in change)) scheduleLoreResolve(actor);});
  Hooks.once('ready', () => {for (const actor of game.actors ?? []) if(actor.type?.toLowerCase() === 'character') scheduleLoreResolve(actor);});
}
