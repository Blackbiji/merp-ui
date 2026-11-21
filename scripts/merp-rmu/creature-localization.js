/**
 * MERP-ui 2.0.18 — Wolf / Warg bilingual sheet presentation (clean V2).
 * The former Actor/Compendium document-writing localiser is RETIRED.
 * Description and Notes remain presentation-only; ONLY official creature
 * Actor.name fields may be synchronized in the MERP-ui bestiary and its
 * uncustomized World imports. All RMU mechanics and source texts are preserved.
 * The full British-English editorial translation is applied to rendered
 * Description and Gamesmaster Notes, keeping the original RMU data links,
 * Lore buttons, document permissions and optional user extensions intact.
 */
import { queueCompendiumMaintenance } from './compendium-content.js';

const MODULE = 'merp-ui';
const SOURCE_DIR = 'source/creatures/actors';
const translations = {
  wolf: {
    description: {
      headings: [
        'To read or paraphrase to the players',
        'Recognising the creature — Knowledge'
      ],
      paragraphs: [
        `<em>The beast before you resembles a large, dark-coated dog, but its build is leaner. It moves with remarkable suppleness. Its thick fur, mingling shades of grey, brown and tawny gold, covers a lithe and powerful frame. A broad head and tapering muzzle rise above a well-furred chest, whilst a long, bushy tail hangs low and follows the movement of its body.</em>`,
        `<em>Two triangular ears stand erect upon its head. Its slanting eyes catch the light with a pale amber gleam. From time to time its nostrils quiver and its muzzle lifts slightly, as though seeking to catch a scent upon the wind.</em>`,
        `Recognising an ordinary wolf chiefly calls upon Region Lore, with a specialisation corresponding to a region the character truly knows. Historic Lore and Racial Lore may provide further knowledge, according to the historical and cultural context. A character already familiar with the animal may recognise it without a roll.`,
        `<strong>Region Lore</strong> — The wolf's habitat, movements and behaviour in the territories known to the character.`,
        `<strong>Racial Lore — General Knowledge</strong> — What is commonly known about wolves, independently of the traditions of any particular people.`,
        `<strong>Cultural Lore — Cultures</strong> — Accounts, observations and beliefs passed down within the character's culture; the RMU skill used is Racial Lore.`,
        `<strong>Historic Lore</strong> — Historical knowledge and old testimonies concerning wolves.`
      ]
    },
    notes: {
      headings: [
        'For the Gamesmaster',
        'Nature and presence in Middle-earth',
        'Behaviour and portrayal',
        'RMU mechanics preserved'
      ],
      paragraphs: [
        `The wolf is a large wild canid whose constitution combines muscular strength, agility and endurance. Its slender body, borne upon long, sturdy legs, enables it to travel considerable distances and pursue prey across varied terrain. Its dense coat, ranging from light grey to dark brown and sometimes touched with tawny shades, affords effective protection against the cold. It possesses a highly developed sense of smell, keen hearing and teeth adapted to seizing and tearing apart the animals upon which it feeds.`,
        `Wolves inhabit forests, moorlands, mountain valleys and broad open country where their prey is found. They occur throughout many northern regions of Middle-earth, especially in wild lands still supporting substantial populations of deer and other herbivores. Their distribution varies with the availability of food, the seasons and the extent of human settlement. They generally live in family groups comprising a breeding pair and its offspring, although some individuals roam great distances alone.`,
        `Wolves feed chiefly upon wild mammals, from small rodents and hares to large herbivores. Hunting together enables family groups to pursue more formidable prey, relying upon speed, endurance and the coordinated movements of their members. Solitary animals usually seek smaller prey or take advantage of abandoned carcasses. Scent is essential both to finding food and to following tracks, whilst hearing allows wolves to detect sounds from far away. They communicate through posture, facial expression, calls and scent markings, the latter also serving to define their territories.`,
        `Travellers are most likely to encounter wolves along game trails, near grazing grounds and in sparsely settled country. Pawprints, trails, the remains of prey and distant howling all betray their presence. Wolves generally keep clear of groups of people, but their behaviour depends upon their familiarity with humans, the availability of food and the proximity of their young. In a fight they employ their mobility to close with an opponent, strike or unbalance it and deliver bites. When hunting or fighting together, they exploit their movements and mutual coordination.`,
        `The wolf is a <strong>level 5</strong> creature of <strong>Medium size</strong>, belonging to the carnivorous animals and the canid family. Its natural attacks include {{0}} (<em>Ram</em>), {{1}} (<em>Bite</em>) and {{2}} (<em>Claw</em>). The {{3}} talent allows it to combine a Ram and a Bite in a single attack sequence, in accordance with RMU rules.`,
        `Its abilities include {{0}}, {{1}}, which grants a +20 bonus to scent-based Perception tests, and {{2}}. {{3}} governs the creature's movement, whilst {{4}} represents its body's natural protection. Its combat values, resistances, skills and the effects of its talents remain those of the original RMU Actor.`
      ],
      linkNames: [
        ['Ram', 'Bite', 'Claw', 'Attack Sequence'],
        ['Group Instinct', 'Acute Smell', 'Hearing, Dog', 'Walking, Quadrupedal', 'Natural Armor']
      ]
    }
  },
  warg: {
    description: {
      headings: ['Recognising the creature — Knowledge'],
      paragraphs: [
        `Knowledge of Wargs may derive from several skills, depending upon the traditions, regions and historical events familiar to the character. Their resemblance to ordinary wolves can deceive an inexperienced observer; their intelligence, behaviour and the accounts told about them may, however, reveal their true nature. A character who has already encountered Wargs, or possesses direct knowledge of these creatures, may recognise them without needing to roll.`,
        `<strong>Racial Lore — Races</strong> — What the twelve races know of the nature, capabilities and behaviour of Wargs.`,
        `<strong>Cultural Lore — Cultures</strong> — The traditions of the sixty cultures; the RMU skill used remains Racial Lore.`,
        `<strong>Region Lore — Regions</strong> — The presence, movements and dangers of Wargs across the thirty-two regions.`
      ]
    },
    notes: {
      headings: [
        'NATURE AND ORIGINS',
        'APPEARANCE AND PHYSIQUE',
        'BEHAVIOUR AND ORGANISATION',
        'PRESENCE IN MIDDLE-EARTH',
        'PORTRAYAL AND USE IN PLAY',
        'SOURCES AND DISTINCTIONS'
      ],
      paragraphs: [
        `Among the creatures that haunt the wild lands of Middle-earth, Wargs occupy a singular place. Their outward appearance recalls that of great wolves: the elongated body, powerful limbs, formidable jaws and exceptionally keen senses. Yet this physical kinship conceals a more profound difference. A Warg is not merely an unusually large predator: it possesses an intelligence and a malevolent will of its own, together with a capacity for cooperation that clearly distinguishes it from ordinary animals. Where a wolf hunts to sustain itself, a Warg may act from cruelty, deliberate enmity or in pursuit of a purpose shared with its fellows.`,
        `In <em>The Hobbit</em>, Tolkien presents Wargs as beings capable of communicating in a language of their own, holding council and organising common undertakings. Their voices, made up of howls, growls and cries which other peoples generally cannot understand, nevertheless express precise intentions. Gandalf, who knows their tongue, can comprehend their speech and perceive the plans they exchange. Wargs have leaders, gather to deliberate and can prepare attacks without awaiting the commands of an outside master. Their ferocity therefore does not exclude thought, caution or a measure of collective discipline.`,
        `The traditions of MERP develop this evil nature by assigning it a particular supernatural origin. In <em>Creatures of Middle-earth</em>, Wargs are described as descendants of wolves subjected to an ancient curse, becoming larger, more fearsome and more intelligent than their ancestors. The supplement portrays them as creatures whose existence is prolonged by the presence of an undead spirit inhabiting their physical bodies. When a body is destroyed, the spirit escapes and the remains eventually disappear. This interpretation, specific to the roleplaying adaptation of Middle-earth, explains their classification as <em>Undead Wolves</em> without equating them with corpses animated by necromancy. Tolkien himself offers no such account of their origins, leaving their nature more mysterious.`,
        `A Warg has the general appearance of a wolf of immense proportions, but its frame is more heavily built, its chest deeper and its musculature especially developed around the shoulders, neck and hindquarters. Its massive head ends in a powerful muzzle, armed with fangs capable of inflicting terrible wounds. Coarse, abundant fur covers its body, usually in shades of dark grey, brown or black, though colour may vary between individuals. Its upright, mobile ears respond to the faintest sounds, whilst its eyes betray a sustained attentiveness not always apparent in wild animals.`,
        `MERP descriptions generally give Wargs a length of six to eight feet excluding the tail, or eight to eleven feet including it. These dimensions make them large enough for some individuals to carry an Orc rider. Yet their strength is not that of a heavy, ungainly beast: a Warg retains the flexibility and agility characteristic of canids, combined with a longer stride and remarkable stamina. It can cover substantial distances swiftly, pursue prey with tenacity and cross difficult terrain without readily losing its footing.`,
        `Its senses are among its greatest assets. Its keen smell allows it to follow tracks over great distances and recognise traces left by other creatures; its acute hearing detects quiet movements and far-off sounds. To these physical faculties is added an intelligence that allows it to turn perception into strategy. A Warg can distinguish vulnerable prey from a dangerous adversary, recognise an organised defence and delay an attack when circumstances are unfavourable. It should not be portrayed as a mindless beast driven solely by hunger or blind rage.`,
        `Wargs frequently live in groups whose cohesion goes beyond the passing association of predators. Their gatherings may take the form of organised packs under the authority of stronger or more experienced individuals. They communicate with one another, recognise the behaviour of their companions and coordinate their movements to watch a territory, pursue intruders or prepare an assault. Their ability to cooperate enables them to exploit an enemy's weaknesses: some distract their prey whilst others seek to outflank, isolate or cut off its retreat.`,
        `Their intelligence is not accompanied by any particular goodwill towards other peoples. Wargs may kill from necessity, but their hostility towards those they regard as enemies often extends far beyond the demands of survival. They are capable of harrying travellers, pursuing fugitives and repeatedly returning against an adversary whose defences they have tested. Yet their malice does not make them reckless in every circumstance. A Warg that is wounded, isolated or confronted by unexpected resistance may withdraw, rejoin its companions or await a better opportunity.`,
        `Their alliances with Orcs are among the most remarkable aspects of their behaviour. Tolkien describes joint ventures in which Goblins and Wargs unite to raid, hunt their enemies or attack isolated settlements. Some Wargs also consent to carry Orc warriors, forming a particularly formidable cavalry. Such cooperation does not mean that all Wargs are domesticated or subject to Orcish command. They retain their own organisation and may pursue aims distinct from those of their allies. Their association arises as much from common interests and shared hatred of the Free Peoples as from any true relationship of command.`,
        `Wargs are particularly associated with wild countries and territories in which the forces of the Shadow have established their lairs. Mountains, deep forests, seldom-visited valleys and vast uninhabited tracts provide refuge and routes of travel. Nearby Orc communities sometimes encourage their presence, but are by no means necessary to it. A pack may occupy a favourable territory for many years, follow the movements of allied forces or travel great distances in search of prey and opportunities for plunder.`,
        `In Tolkien's narratives, Wargs play an important part in the events related in <em>The Hobbit</em>. Their gathering with the Goblins reveals joint organisation and hostile intentions that go far beyond ordinary hunting. They also belong to the broader company of evil wolf-like creatures associated with wars and the movements of the Shadow's servants. MERP traditions extend this role by presenting Wargs as formidable military auxiliaries, employed as mounts, scouts or guardians of strategic places. Their speed, senses and intelligence make them especially capable of detecting an enemy's approach, pursuing fugitives and taking part in coordinated attacks.`,
        `Nevertheless, Wargs must be distinguished from other creatures which resemble them. Great wild wolves, however imposing, remain natural animals; war wolves may be beasts trained for combat; werewolves belong to a still different supernatural tradition associated with the ancient powers of Morgoth. The Warg stands apart from these categories: it possesses the appearance and some of the physical abilities of a great canid, but is distinguished by its intelligence, malevolence and, in the conception developed by MERP, the spiritual nature sustaining its existence. This distinction is essential to understanding its place among the creatures of Middle-earth.`,
        `The Warg differs from an ordinary wolf through the calculating intelligence and malevolent purpose that govern its actions. Its physical power is matched by an ability to observe, anticipate and exploit its adversaries' weaknesses. It may watch for a long time before revealing itself, break off a pursuit that would lead to its destruction or attempt to isolate a vulnerable member of a group. Within a pack, concerted movements, sudden changes of direction and cries exchanged between individuals may disclose a mutual understanding beyond the usual behaviour of wild animals.`,
        `Its supernatural nature, as imagined by MERP, deepens this impression of strangeness. It remains a tangible, bodily creature, able to leave tracks, cause wounds and suffer the blows of its enemies. Yet its hostile will, intelligence and the stories surrounding its disappearance after death evoke a different unease from that inspired by an ordinary predator. The Gamesmaster can convey this difference through behaviour rather than invariably resorting to spectacular manifestations: an intent, lingering gaze, a calculated retreat before unexpected resistance or a pack abruptly changing its tactics may suffice to suggest that the characters face something other than an animal.`,
        `The talents and characteristics of the RMU Actor determine its actual abilities in play. Its supernatural classification must not be taken as grounds for granting necromantic powers, transformations or immunities absent from its character sheet. Above all, the Warg remains an intelligent, swift and formidable opponent, whose danger arises as much from its judgement and cooperation with its fellows as from the strength of its jaws.`,
        `J. R. R. Tolkien — <em>The Hobbit</em>. The Wargs' intelligence, language, collective organisation, councils, alliances with Goblins and use as mounts.`,
        `ICE — <em>Creatures of Middle-earth</em>, second edition (1995), ‘Wargs’, p. 129. Accursed origins, dimensions, intelligence, ability to serve as mounts, guardians and scouts, and spiritual nature associated with the undead.`,
        `Gladney adaptation — <em>The Fate of Fennas Drúnin</em>. Level 8 Warg, classified as an <em>Undead Wolf</em>, with movement capabilities superior to those of an ordinary wolf.`
      ]
    }
  }
};


const sourceCache = new Map();
const activeSheets = new Map();
const pendingNodes = new WeakMap();
let installed = false;
let lastError = null;
const supportedKeys = new Set(Object.keys(translations));
const CREATURE_PACK = `${MODULE}.merp-ui-creatures`;
const CREATURE_NAMES = Object.freeze({
  wolf: Object.freeze({fr:'Loup', en:'Wolf', aliases:['Loup / Wolf','Wolf / Loup','Loup','Wolf']}),
  warg: Object.freeze({fr:'Ouargue', en:'Warg', aliases:['Warg / Ouargue','Ouargue / Warg','Warg','Ouargue']})
});
const normalizedName = s => String(s??'').trim().toLocaleLowerCase('fr').replace(/\s+/g,' ');
const creatureKeyOf = actor => {
  const key=actor?.flags?.[MODULE]?.creatureLore?.key;
  return actor?.type==='Creature' && Object.hasOwn(CREATURE_NAMES,key) ? key : null;
};
const knownCreatureName = (name,key) => CREATURE_NAMES[key]?.aliases.some(
  alias => normalizedName(alias)===normalizedName(name)
) ?? false;
function localName(key,lang=language()) {
  return CREATURE_NAMES[key]?.[lang==='fr'?'fr':'en']??null;
}
function renameTextNode(node,key,lang) {
  const raw=node?.nodeValue??'';
  if(!knownCreatureName(raw,key) || raw.trim()===localName(key,lang))return false;
  node.nodeValue=raw.replace(raw.trim(),localName(key,lang));
  return true;
}
/** Sheet label: change only canonical names, never custom actor aliases. */
function showActorName(app,element,lang=language()) {
  const actor=sheetActor(app);
  const key=creatureKeyOf(actor);
  if (!key||!knownCreatureName(actor.name,key))return 0;
  let changed=0;
  const root=element.closest('.application,.app,.window-app')??element;
  for(const input of root.querySelectorAll('input[name="name"], input[data-field="name"]')) {
    if (knownCreatureName(input.value,key)&&input.value!==localName(key,lang)) {
      input.value=localName(key,lang);
      changed++;
    }
  }
  const scopes=[...root.querySelectorAll('.window-title,.sheet-header,.sheet-header-name,.actor-name,.document-name')];
  for(const section of scopes){
    if (section.matches('.document-name') && section.closest('.directory-item'))continue;
    const walker=document.createTreeWalker(section,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode()))if(renameTextNode(node,key,lang))changed++;
  }
  return changed;
}
function creaturePackWindow(app) {
  // Compendium Window only. Actor document sheets opened FROM a pack are not
  // pack browsers and must never have their whole sheet text walked here.
  if(app?.actor?.documentName==='Actor'||app?.document?.documentName==='Actor')return false;
  const collection=app?.collection;
  const id=typeof collection==='string'?collection:
    collection?.collection??collection?.metadata?.id??null;
  return id===CREATURE_PACK;
}
const indexObservers=new WeakMap();
const openPackRoots=new Set();
function repaintCreatureIndex(root,lang=language()) {
  if (!root?.isConnected)return 0;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node,changes=0;
  while((node=walker.nextNode())) {
    const within=node.parentElement?.closest?.(
      '.directory-item.document,.directory-item[data-entry-id],.directory-item[data-document-id],.entry-name,.document-name'
    );
    if (!within)continue;
    // No generic substring replacements: only the two exact canonical names.
    for(const key of Object.keys(CREATURE_NAMES)){
      if(renameTextNode(node,key,lang)){changes++;break;}
    }
  }
  return changes;
}
function watchCreatureIndex(root) {
  if(indexObservers.has(root))return;
  const observer=new MutationObserver(()=>{
    if(!root.isConnected){observer.disconnect();openPackRoots.delete(root);return;}
    repaintCreatureIndex(root);
  });
  observer.observe(root,{childList:true,characterData:true,subtree:true});
  indexObservers.set(root,observer);
  openPackRoots.add(root);
}
function applyPackNameDisplay(app,html){
  if(!creaturePackWindow(app))return false;
  const root=htmlRoot(app,html);
  if(!root)return false;
  repaintCreatureIndex(root);
  watchCreatureIndex(root);
  return true;
}
function refreshPackNameDisplay(lang=language()) {
  for(const root of openPackRoots) {
    if(root.isConnected)repaintCreatureIndex(root,lang);
    else openPackRoots.delete(root);
  }
}
/** Small, serialised, strictly limited name-only update. Never touches
 * description, notes, attributes, embedded items, tables, flags or folder IDs. */
async function writeCreatureNames(lang=language()) {
  if(!game.user?.isGM)return {skipped:true,reason:'not-gm'};
  // Multiple active GM clients must not compete for the same locked pack.
  const lead=[...(game.users?.contents??[])].filter(u=>u.isGM&&u.active!==false)
    .sort((a,b)=>a.id.localeCompare(b.id))[0];
  if(lead?.id!==game.user.id)return {skipped:true,reason:'another-gm-is-primary'};
  const report={language:lang,pack:0,world:0};
  const pack=game.packs.get(CREATURE_PACK);
  if(!pack)throw Error(`Bestiary pack missing: ${CREATURE_PACK}`);
  if(pack.documentName!=='Actor')throw Error('Creature pack is not an Actor compendium');
  const pending=(await pack.getDocuments()).filter(actor=>{
    const key=creatureKeyOf(actor);
    return key && knownCreatureName(actor.name,key) && actor.name!==localName(key,lang);
  });
  const wasLocked=Boolean(pack.locked??pack.metadata?.locked);
  if(pending.length){
    try{
      if(wasLocked)await pack.configure({locked:false});
      for(const actor of pending){
        const key=creatureKeyOf(actor);
        await actor.update({name:localName(key,lang)},
          {render:false,merpUiCompendiumPackMaintenance:true});
        report.pack++;
      }
    }finally{
      if(wasLocked)await pack.configure({locked:true});
    }
  }
  for(const actor of game.actors?.contents??[]){
    const key=creatureKeyOf(actor);
    if(!key || !knownCreatureName(actor.name,key) || actor.name===localName(key,lang))continue;
    await actor.update({name:localName(key,lang)},
      {render:false,merpUiCreatureNameLocalization:true});
    report.world++;
  }
  // Updates have already persisted. Ask the native directories/sheets to
  // repaint, instead of modifying index objects or source JSON by hand.
  refreshPackNameDisplay(lang);
  try {ui.actors?.render?.({force:true})} catch {try{ui.actors?.render?.(true)}catch{}}
  for(const app of Object.values(ui.windows??{})){
    if(creaturePackWindow(app)) {
      try{await app.render({force:true})}catch{try{await app.render(true)}catch{}}
    }
  }
  return report;
}
function queueCreatureNameSync(lang=language()){
  return queueCompendiumMaintenance(()=>writeCreatureNames(lang)).catch(error=>{
    lastError=error?.message??String(error);
    console.error(`[${MODULE}] Wolf/Warg name localisation failed`,error);
    return {error:lastError};
  });
}


function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}
function language() {
  try { return game.settings.get(MODULE, 'contentLanguage') === 'fr' ? 'fr' : 'en'; }
  catch { return 'en'; }
}
function htmlRoot(app, html) {
  const value = html instanceof HTMLElement ? html : html?.[0] ?? html?.element ?? app?.element;
  return value instanceof HTMLElement ? value : null;
}
function sheetActor(app) {
  const candidate = app?.actor ?? app?.document;
  return candidate?.type === 'Creature' ? candidate : null;
}
function sourceFromActor(actor, key) {
  const saved = actor?.flags?.[MODULE]?.creatureNarratives?.fr;
  if (saved?.description?.includes('Reconnaître la créature') && saved?.notes) return saved;
  const description = actor?.system?.description ?? '';
  const notes = actor?.system?.notes ?? '';
  if (description.includes('Reconnaître la créature') &&
      description.includes(`data-merp-ui-creature="${key}"`) && notes) {
    return {description, notes};
  }
  return null;
}
async function frenchSource(key, actor) {
  if (!supportedKeys.has(key)) throw Error(`Unknown creature: ${key}`);
  let task = sourceCache.get(key);
  if (!task) {
    task = (async () => {
      const path = `modules/${MODULE}/${SOURCE_DIR}/${key}.json`;
      const url = foundry.utils.getRoute ? foundry.utils.getRoute(path) : path;
      const response = await fetch(url, {cache:'no-store', credentials:'same-origin'});
      if (!response.ok) throw Error(`${key} source: HTTP ${response.status}`);
      const json = await response.json();
      const result = {description:json?.system?.description,notes:json?.system?.notes};
      if (!result.description?.includes(`data-merp-ui-creature="${key}"`) || !result.notes)
        throw Error(`${key}: canonical French Description/Notes missing`);
      return result;
    })();
    sourceCache.set(key, task);
  }
  try { return await task; }
  catch (error) {
    sourceCache.delete(key);
    const fallback = sourceFromActor(actor, key);
    if (fallback) {
      console.warn(`[${MODULE}] ${key}: using French Actor content as source`, error);
      return fallback;
    }
    throw error;
  }
}
function translatedSection(frenchHtml, key, field, lang) {
  if (lang === 'fr') return frenchHtml;
  const data = translations[key]?.[field];
  if (!data) throw Error(`Translation missing: ${key}/${field}`);
  const document = new DOMParser().parseFromString(frenchHtml,'text/html');
  const element = document.querySelector(`section[data-merp-ui-creature="${key}"]`);
  if (!element) throw Error(`${key}/${field}: canonical section missing`);
  const heads = [...element.querySelectorAll('h2,h3')];
  const paragraphs = [...element.querySelectorAll('p')];
  if (heads.length !== data.headings.length || paragraphs.length !== data.paragraphs.length)
    throw Error(`${key}/${field}: incompatible source layout (${heads.length} headings, ${paragraphs.length} paragraphs)`);
  heads.forEach((heading,index) => heading.textContent=data.headings[index]);
  paragraphs.forEach((paragraph,index) => {
    const oldButtons = [...paragraph.querySelectorAll('button')];
    const links = [...paragraph.querySelectorAll('a')];
    const template = data.paragraphs[index];
    if (links.length) {
      const names=data.linkNames?.[index - (data.paragraphs.length-data.linkNames.length)] ?? [];
      const bits=template.split(/\{\{(\d+)\}\}/g);
      paragraph.replaceChildren();
      for (let i=0;i<bits.length;i++) {
        if (i % 2) {
          const n=Number(bits[i]);
          if (!links[n] || !names[n]) throw Error(`${key}/${field}: lost RMU link ${n}`);
          const link=links[n];
          link.textContent=names[n];
          paragraph.append(link);
        } else if (bits[i]) {
          const holder=document.createElement('template');
          holder.innerHTML=bits[i];
          paragraph.append(...holder.content.childNodes);
        }
      }
    } else {
      paragraph.innerHTML=template;
    }
    for (const oldButton of oldButtons) {
      oldButton.textContent='🎲 Offer a roll';
      paragraph.append(' ',oldButton);
    }
  });
  return element.outerHTML;
}
function fieldOf(section) {
  return section.classList.contains('merp-ui-wolf-notes') ||
    section.classList.contains('merp-ui-warg-notes') ? 'notes' : 'description';
}
function updateVisibleSection(section, sourceHtml, key, lang) {
  const parsed = new DOMParser().parseFromString(sourceHtml,'text/html');
  const wanted = parsed.querySelector(`section[data-merp-ui-creature="${key}"]`);
  if (!wanted) throw Error(`${key}: translated section missing`);
  const displayedHeads=[...section.querySelectorAll('h2,h3')];
  const wantedHeads=[...wanted.querySelectorAll('h2,h3')];
  const displayedParas=[...section.querySelectorAll('p')];
  const wantedParas=[...wanted.querySelectorAll('p')];
  if (displayedHeads.length!==wantedHeads.length || displayedParas.length!==wantedParas.length)
    throw Error(`${key}: sheet content has a different structure; not overwriting custom material`);
  displayedHeads.forEach((heading,i)=>heading.textContent=wantedHeads[i].textContent);
  displayedParas.forEach((paragraph,i)=>{
    // Keep the ACTUAL interactive buttons and their event listeners, not clones.
    const controls=[...paragraph.querySelectorAll('button')];
    controls.forEach(b=>b.remove());
    const newHTML=wantedParas[i].cloneNode(true);
    const translatedButtons=[...newHTML.querySelectorAll('button')];
    translatedButtons.forEach(b=>b.remove());
    // Do not overwrite the current DOM's disabled state or event listeners.
    if (paragraph.innerHTML!==newHTML.innerHTML) paragraph.innerHTML=newHTML.innerHTML;
    if (controls.length || translatedButtons.length) {
      const list=controls.length ? controls : translatedButtons;
      list.forEach((button,j)=>{
        button.textContent=translatedButtons[j]?.textContent ?? (lang==='fr'?'🎲 Proposer un jet':'🎲 Offer a roll');
        paragraph.append(' ',button);
      });
    }
  });
  section.dataset.merpUiContentLang=lang;
}
function ensureWatching(app,element) {
  const existing=activeSheets.get(app);
  if (existing?.element===element)return;
  existing?.observer?.disconnect();
  const observer=new MutationObserver(()=>{
    if (!element.isConnected) {
      observer.disconnect();
      activeSheets.delete(app);
      return;
    }
    // RMU may insert the Description/Notes tab after the initial render.
    // Avoid recursive work on mutations caused by our own repaint.
    const lang=language();
    const unseen=[...element.querySelectorAll('section[data-merp-ui-creature]')]
      .some(s=>supportedKeys.has(s.dataset.merpUiCreature) && s.dataset.merpUiContentLang!==lang);
    if (unseen) void attempt(app,element,lang);
  });
  observer.observe(element,{subtree:true,childList:true});
  activeSheets.set(app,{element,observer});
}
async function localizeRendered(app, html, desiredLanguage=language()) {
  const element=htmlRoot(app,html);
  const actor=sheetActor(app);
  if (!element || !actor) return {skipped:true};
  showActorName(app,element,desiredLanguage);
  const sections=[...element.querySelectorAll('section[data-merp-ui-creature]')]
    .filter(s=>supportedKeys.has(s.dataset.merpUiCreature));
  if (!sections.length && !supportedKeys.has(actor.flags?.[MODULE]?.creatureLore?.key))
    return {skipped:true};
  ensureWatching(app,element);
  if (!sections.length) return {skipped:true,reason:'awaiting-tab-content'};
  const pending=sections.filter(section=>section.dataset.merpUiContentLang!==desiredLanguage);
  if (!pending.length) return {skipped:true,reason:'already-localized'};
  const operation=(pendingNodes.get(element)??0)+1;
  pendingNodes.set(element,operation);
  const keys=[...new Set(pending.map(s=>s.dataset.merpUiCreature))];
  const sources=new Map();
  for (const key of keys) sources.set(key,await frenchSource(key,actor));
  // A later render/switch may have superseded the asynchronous fetch.
  if (pendingNodes.get(element)!==operation || !element.isConnected)
    return {skipped:true,reason:'superseded-or-detached'};
  let updated=0;
  for (const section of pending) {
    const key=section.dataset.merpUiCreature;
    const field=fieldOf(section);
    const original=sources.get(key)?.[field];
    if (!original) throw Error(`${key}/${field}: French source missing`);
    updateVisibleSection(section,translatedSection(original,key,field,desiredLanguage),key,desiredLanguage);
    updated++;
  }
  return {language:desiredLanguage,updated};
}
function attempt(app,html,locale) {
  return localizeRendered(app,html,locale).catch(error=>{
    lastError=error?.message??String(error);
    console.error(`[${MODULE}] Wolf/Warg sheet localisation failed`,error);
    return {error:lastError};
  });
}
async function refreshOpenSheets(lang=language()) {
  const operations=[];
  for (const [app,{element,observer}] of activeSheets) {
    if (!element?.isConnected) {
      observer?.disconnect();
      activeSheets.delete(app);
      continue;
    }
    operations.push(attempt(app,element,lang));
  }
  return Promise.all(operations);
}
function onRender(app,html) {
  if(applyPackNameDisplay(app,html))return;
  void attempt(app,html);
}
function onClose(app) {
  activeSheets.get(app)?.observer?.disconnect();
  activeSheets.delete(app);
}
export function installCreatureActorLocalisation() {
  if (installed) return;
  installed=true;
  // Register independently of GM status: translation is visual and readable
  // by Players, without any writes to Compendiums or World documents.
  Hooks.on('renderActorSheetV2',onRender);
  Hooks.on('renderActorSheet',onRender);
  Hooks.on('renderApplicationV2',onRender);
  Hooks.on('closeActorSheetV2',onClose);
  Hooks.on('closeActorSheet',onClose);
  Hooks.on('closeApplicationV2',onClose);
  Hooks.once('ready',()=>{
    game.merpUiCreatureLocale=Object.freeze({
      refresh:()=>refreshOpenSheets(),
      status:()=>({installed,language:language(),openSheets:activeSheets.size,lastError}),
      names:()=>({wolf:localName('wolf'),warg:localName('warg')}),
      syncNames:()=>queueCreatureNameSync(language())
    });
    Hooks.on('updateSetting',setting=>{
      if ((setting?.key ?? setting?._source?.key)!==`${MODULE}.contentLanguage`)return;
      // Core has saved the new value before repainting the open sheets.
      queueMicrotask(()=>{
        const lang=language();
        void refreshOpenSheets(lang);
        refreshPackNameDisplay(lang);
        void queueCreatureNameSync(lang);
      });
    });
    // First login/fresh compendium: normalise the two built-in bilingual names.
    void queueCreatureNameSync(language());
    console.info(`[${MODULE}] Wolf/Warg names + narratives follow content language (name-only persistence).`);
  });
}
