/**
 * MERP-UI Creature Lore — Foundry V14 / RMU.
 * Joueur -> jet RMU blind -> consultation MJ du Compendium -> MP narratif.
 * No mechanical result or lore source ID in public ChatMessages.
 */
const MODULE_ID = 'merp-ui';
const LORE_PACK = 'merp-ui.merp-ui-lore';
const DRAG_TYPE = 'application/x-merp-ui-lore';
const LORE = Object.freeze({
  region: {skill:'Region Lore', label:'Region Lore'},
  historic: {skill:'Historic Lore', label:'Historic Lore'},
  racial: {skill:'Racial Lore', label:'Racial Lore'}
});
const OUTCOMES = Object.freeze([
  ['absoluteFailure','Échec absolu'], ['failure','Échec'],
  ['partialSuccess','Réussite partielle'], ['success','Réussite'],
  ['absoluteSuccess','Réussite absolue']
]);
const inFlight = new Set();
// Tracks only the messages authored by this client during the active native RMU roll.
// Serialize native roll creation per client and keep correlation tokens private.
const safeRolls = new Set();
const escapeHTML = s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s=>String(s??'').trim().toLocaleLowerCase('fr');

const narrativeHTML = value=>String(value??'').split(/\n\s*\n/)
  .map(paragraph=>paragraph.trim()).filter(Boolean)
  .map(paragraph=>'<p><em>'+escapeHTML(paragraph)+'</em></p>').join('');

const flag = (doc,key)=>doc?.flags?.[MODULE_ID]?.creatureLoreChat?.[key];
const loreFlags = data=>({[MODULE_ID]:{creatureLoreChat:data}});
const rawLore = doc => doc?.flags?.[MODULE_ID]?.creatureLoreTable ?? doc?.flags?.[MODULE_ID]?.creatureLoreEntry ?? {};
const gmIds = ()=>game.users.filter(u=>u.isGM).map(u=>u.id);
const neutralSpeaker = ()=>({alias:'MERP-UI · Lore',actor:null,token:null,scene:null});
const warn = msg=>ui.notifications.warn('MERP-UI Lore — '+msg);
function fail(e, where) {console.error(`[${MODULE_ID}] ${where}`,e);ui.notifications.error(`MERP-UI Lore — ${e?.message??e}`);}
function authorId(message) {
  for(const ref of [message?.author,message?._source?.author,message?.user,message?._source?.user]) {
    const id=typeof ref==='string'?ref:ref?.id;
    if(id) return id;
  }
  return null;
}
function gmAuthored(message) {return !!game.users.get(authorId(message))?.isGM;}
function isOffer(message) {return flag(message,'kind')==='public-offer' && gmAuthored(message)
  && !!LORE[flag(message,'loreKey')] && /^[A-Za-z0-9]{16,32}$/.test(flag(message,'requestId')??'');}
function currentCreature(actor) {
  const data=actor?.flags?.['merp-ui']?.creatureLore;
  return actor?.type==='Creature' && typeof data?.key==='string' && data.key.length>0 && typeof data?.lore==='object';
}
function specialOf(item) {return String(item?.system?.specialization??item?.specialization??'').trim();}
function isSkill(item,loreKey) {
  if(!LORE[loreKey] || (item?.type && item.type!=='skill')) return false;
  const name=norm(item.name),special=norm(specialOf(item)),want=norm(LORE[loreKey].skill);
  return name===want || (name==='lore' && special.startsWith(want));
}
function choicesForUser(loreKey='region') {
  const output=[];
  for(const actor of game.actors.contents) {
    if(!actor.isOwner || actor.type==='Creature') continue;
    for(const item of actor.items) {
      if(!isSkill(item,loreKey)) continue;
      let specs=[];
      const explicit=specialOf(item);
      if(explicit) specs=[explicit];
      else if(item.system?.hasSpecialization) {
        specs=(item.system?.specializations??[]).map(v=>typeof v==='string'?v:(v?.name??v?.specialization??'')).filter(Boolean);
      } else specs=[''];
      for(const specialization of new Set(specs)) output.push({actorId:actor.id,itemId:item.id,specialization,
        actorName:actor.name,itemName:item.name});
    }
  }
  const assigned=game.user.character?.id;
  output.sort((a,b)=>Number(b.actorId===assigned)-Number(a.actorId===assigned)
    || a.actorName.localeCompare(b.actorName,'fr') || a.itemName.localeCompare(b.itemName,'fr'));
  return output;
}
async function chooseOption({title,lead,items,name='choice',ok='Valider',foot=''}) {
  if(!items.length) return null;
  const options=items.map((x,i)=>`<option value="${i}">${escapeHTML(x.label)}</option>`).join('');
  const form=await foundry.applications.api.DialogV2.input({
    window:{title},
    content:`<p>${escapeHTML(lead)}</p><div class="form-group"><label>${escapeHTML(title)}</label>
      <select name="${escapeHTML(name)}" required>${options}</select></div>
      ${foot?`<p class="hint">${escapeHTML(foot)}</p>`:''}`,
    ok:{label:ok},rejectClose:false
  });
  if(!form) return null;
  const raw=typeof form.get==='function'?form.get(name):form[name];
  if(raw===null||raw===undefined||raw==='')return null;
  const index=Number(raw);
  return Number.isInteger(index)?(items[index]??null):null;
}
async function publishOffer(actor,loreKey='region',familyHint=null) {
  if(familyHint && !(loreKey==='racial'&&['racial','cultural'].includes(familyHint)))
    throw new Error('Catégorie de Racial Lore invalide.');
  if(!game.user.isGM) return warn('Seul le Meneur peut proposer une connaissance.');
  if(!currentCreature(actor) || !actor.flags?.['merp-ui']?.creatureLore?.lore?.[loreKey]) {
    return warn('Aucune connaissance MERP-UI de ce type n’est déclarée sur cette créature.');
  }
  const requestId=foundry.utils.randomID(24);
  let privateRef=null;
  try {
    privateRef=await ChatMessage.create({author:game.user.id,speaker:neutralSpeaker(),whisper:gmIds(),
      content:`<p><strong>MERP-UI · Référence privée</strong> — ${escapeHTML(actor.name)}, ${escapeHTML(LORE[loreKey].label)}.</p>`,
      flags:loreFlags({kind:'private-reference',requestId,sourceActorUuid:actor.uuid,creatureKey:actor.flags['merp-ui'].creatureLore.key,loreKey,familyHint})});
    const offer=await ChatMessage.create({author:game.user.id,speaker:neutralSpeaker(),
      content:`<section class="merp-lore-chat-card" data-merp-lore-request="${requestId}">
        <header>MERP-UI · Appel aux connaissances</header>
        <p>Tu peux faire appel à tes connaissances : <strong>${escapeHTML(LORE[loreKey].label)}</strong>.</p>
        <button class="merp-lore-chat-roll" type="button">🎲 Lancer un jet secret RMU</button></section>`,
      flags:loreFlags({kind:'public-offer',requestId,loreKey})});
    ui.notifications.info('Demande Lore publiée : '+LORE[loreKey].label);
    return offer;
  } catch(e){if(privateRef)try{await privateRef.delete();}catch{};fail(e,'publication');return null;}
}
function findMessage(kind,requestId,predicate=()=>true){
  return game.messages.contents.find(m=>flag(m,'kind')===kind&&flag(m,'requestId')===requestId&&predicate(m));
}
async function playerBlindRoll(offer) {
  if(!isOffer(offer))return warn('Carte Lore non reconnue comme émise par un MJ.');
  const requestId=flag(offer,'requestId'),loreKey=flag(offer,'loreKey');
  const choice=await chooseOption({title:'Personnage et connaissance',lead:'Sélectionne un personnage que tu contrôles et une spécialisation présente sur sa fiche.',
    items:choicesForUser(loreKey).map(x=>({...x,label:`${x.actorName} — ${x.itemName}${x.specialization?' / '+x.specialization:''}`})),
    ok:'🎲 Lancer le jet RMU secret',foot:'Ton jet RMU est effectué ici, mais le résultat du chat est réservé au Meneur (mode blind).'});
  if(!choice)return;
  const actor=game.actors.get(choice.actorId),item=actor?.items?.get(choice.itemId);
  if(!actor?.isOwner||!isSkill(item,loreKey)||(!specialOf(item)&&choice.specialization&& !item.system?.specializations?.length)){
    return warn('Choix de compétence non autorisé ou modifié.');
  }
  const userId=game.user.id;
  // A visible acknowledgement is created BEFORE the native roll; it contains no result.
  // Prevents repeated clicks without needing a blind message visible to its author.
  const existing=findMessage('player-request',requestId,m=>authorId(m)===userId&&flag(m,'actorId')===actor.id);
  if(existing)return warn('Un jet a déjà été engagé pour ce personnage et cette invitation.');
  const pending=`${requestId}:${userId}:${actor.id}`;
  if(inFlight.has(pending))return;
  inFlight.add(pending);
  let started=null;
  try{
    const api=game.system?.api;
    if(typeof api?.rmuTokenSkillAction!=='function')throw new Error('API native RMU indisponible.');
    // Do not create a "started" message until the actual skill is known.
    const derived=await derivedSkillFor(actor,item,choice.specialization);
    const token=canvas?.tokens?.placeables?.find(t=>t.actor?.id===actor.id&&t.actor?.isOwner)??null;
    started=await ChatMessage.create({author:userId,speaker:neutralSpeaker(),
      whisper:[...new Set([...gmIds(),userId])],
      content:`<section class="merp-lore-chat-card merp-lore-pending" data-merp-lore-request="${requestId}">
        <header>MERP-UI · Consultation engagée</header>
        <p>${escapeHTML(actor.name)} — ${escapeHTML(LORE[loreKey].label)}${choice.specialization?' / '+escapeHTML(choice.specialization):''}</p>
        <p>Le jet est adressé au Meneur. Tu recevras les connaissances de ton personnage par message privé.</p></section>`,
      flags:loreFlags({kind:'player-request',requestId,actorId:actor.id,skillItemId:item.id,
        specialization:choice.specialization,loreKey})});
    if(!started)throw new Error('Impossible de publier la demande de jet.');
    // Actual RMU roll happens on the player's client. The guard makes every native
    // ChatMessage created synchronously within this API call blind BEFORE creation.
    const guarded=await rollNativeBlind(async ()=>api.rmuTokenSkillAction(token,derived,{
      actor,asLore:true,prompt:false,rollMode:'blind',messageMode:'blind'
    }));
    // IMPORTANT: On Foundry V14, a blind ChatMessage is normally NOT replicated
    // to its author. The player can therefore get zero messages from the
    // createChatMessage hook even when RMU published a perfectly good blind roll.
    // NEVER mark that as a failed roll. Let the GM client find and verify it.
    const localConfirmation=guarded.messages.length > 0 && guarded.messages.every(m=>
      m.blind && m.whisper.length>0 && m.whisper.every(id=>gmIds().includes(id)));
    const outcome=suggestedOutcome(guarded.value);
    await sendGMResult(started,outcome,localConfirmation,
      guarded.messages.length ? null : 'Carte aveugle non visible depuis le client joueur : contrôle à réaliser côté MJ.',
      guarded.messages.map(m=>m.id).filter(Boolean),guarded.rollToken);
    ui.notifications.info('Jet secret effectué. Les connaissances seront communiquées par message privé.');
  } catch(e){
    fail(e,'jet secret joueur');
    if(started)try{await sendGMResult(started,null,false,e?.message??String(e));}catch(err){fail(err,'compte rendu au MJ');}
  } finally{inFlight.delete(pending);}
}
/**
 * Force the *native RMU* chat output to Blind GM Roll, before its creation.
 * V14: core.messageMode, options.messageMode and the ChatMessage blind/whisper fields.
 * The temporary hook applies only to chat authored by this client inside this call.
 * The previous client mode is restored even when RMU throws.
 * Never use a post-publication message.update() as a privacy measure.
 */
async function rollNativeBlind(rollFn){
  const token=foundry.utils.randomID(24);
  if(safeRolls.size)throw new Error('Un autre jet secret MERP-UI est déjà engagé sur ce client.');
  safeRolls.add(token);
  let previousMode;
  const sent=new Map();
  let modeChanged=false;
  const guard=(doc,data,options,userId)=>{
    if(userId!==game.user.id || data?.flags?.[MODULE_ID]?.creatureLoreChat)return;
    // Marker is an opaque correlation token, NOT a mechanical result. Chat
    // creation remains private to the GM before saving the native message.
    doc.updateSource({blind:true,whisper:gmIds(),flags:{
      ...(doc.flags??data?.flags??{}),
      [MODULE_ID]:{...(doc.flags?.[MODULE_ID]??data?.flags?.[MODULE_ID]??{}),creatureLoreChat:{nativeRollToken:token}}
    }});
  };
  const captured=(message)=>{
    if(flag(message,'nativeRollToken')!==token)return;
    if(message.id)sent.set(message.id,message);
  };
  Hooks.on('preCreateChatMessage',guard);
  Hooks.on('createChatMessage',captured);
  try{
    previousMode=game.settings.get('core','messageMode');
    if(previousMode!=='blind'){
      await game.settings.set('core','messageMode','blind');
      modeChanged=true;
    }
    const value=await rollFn();
    // A created message (not a preCreate document) has its definitive ID.
    // Also scan game.messages in case the create hook arrived before registration.
    for(const message of game.messages.contents){
      if(flag(message,'nativeRollToken')===token&&message.id)sent.set(message.id,message);
    }
    return {value,rollToken:token,messages:[...sent.values()].map(m=>({
      id:m.id,blind:m.blind===true,whisper:[...(m.whisper??[])]
    }))};
  }finally{
    Hooks.off('preCreateChatMessage',guard);
    Hooks.off('createChatMessage',captured);
    try{if(modeChanged)await game.settings.set('core','messageMode',previousMode);}catch(e){
      console.error(`[${MODULE_ID}] Impossible de restaurer core.messageMode`,e);
      warn('Le mode de chat précédent n’a pas pu être restauré.');
    }
    safeRolls.delete(token);
  }
}
async function sendGMResult(started,suggested,verified,error,nativeMessageIds=[],rollToken=null){
  const info=flag(started,'requestId');
  if(!info||!LORE[flag(started,'loreKey')])throw new Error('Référence de demande invalide.');
  // For the GM only. The result category is stored only in a blind GM message.
  // A conscientious GM still verifies the suggested category against the native RMU card.
  await ChatMessage.create({author:game.user.id,speaker:neutralSpeaker(),
    ...ChatMessage.applyMode({
      content:`<section class="merp-lore-chat-card merp-lore-gm-request" data-merp-lore-request="${escapeHTML(info)}">
        <header>MJ · Jet de Lore effectué</header>
        <p>Le Meneur vérifie la carte RMU aveugle et consulte le compendium pour transmettre le résultat narratif au joueur. Si RMU ne fournit pas de degré reconnaissable, utilise le contrôle ci-dessous.</p>
        <button class="merp-lore-gm-review" type="button">MJ · Vérifier / envoyer la connaissance</button></section>`,
      flags:loreFlags({kind:'player-roll-complete',requestId:info,
        playerRequestId:started.id,actorId:flag(started,'actorId'),
        skillItemId:flag(started,'skillItemId'),specialization:flag(started,'specialization'),
        loreKey:flag(started,'loreKey'),suggestedOutcome:suggested,blindVerified:verified,
        nativeMessageIds:Array.isArray(nativeMessageIds)?nativeMessageIds:[],
        rollToken:typeof rollToken==='string'?rollToken:null,
        error:String(error??'')})
    },'blind')
  });
}
async function sourceFor(requestId) {
  const privateRef=findMessage('private-reference',requestId,m=>gmAuthored(m));
  if(!privateRef || !/^[A-Za-z0-9]{16,32}$/.test(requestId||'')) throw new Error('Référence MJ introuvable.');
  const sourceUuid=flag(privateRef,'sourceActorUuid');
  const creature=await fromUuid(sourceUuid);
  if(!currentCreature(creature)) throw new Error('Créature de la demande indisponible.');
  if(creature.flags['merp-ui'].creatureLore.key!==flag(privateRef,'creatureKey'))throw new Error('Référence de créature incohérente.');
  return {creature,loreKey:flag(privateRef,'loreKey'),familyHint:flag(privateRef,'familyHint')??null};
}
function skillMatches(derived,embedded,specialization) {
  if(!derived||!embedded)return false;
  const id=derived.id??derived._id??derived.itemId??derived.item?.id;
  return Boolean((id&&id===embedded.id) || (norm(derived.name)===norm(embedded.name) && specialOf(derived)===specialization));
}
async function derivedSkillFor(actor,item,specialization){
  if(typeof actor.hudDeriveExtendedData!=='function')throw new Error('RMU hudDeriveExtendedData() absent.');
  await actor.hudDeriveExtendedData();
  const skills=actor.system?._skills;
  if(!Array.isArray(skills))throw new Error('actor.system._skills ne contient pas le tableau attendu.');
  const matches=skills.filter(v=>skillMatches(v,item,specialization));
  if(matches.length===1)return matches[0];
  const exact=matches.filter(v=>specialOf(v)===specialization);
  if(exact.length===1)return exact[0];
  throw new Error('Impossible de sélectionner le skill RMU exact : '+item.name+' / '+specialization);
}
function flattenCandidates(resolved){
  const values=[];const visited=new WeakSet();
  const visit=(v,level=0)=>{
    if(v==null||level>3)return;
    if(typeof v==='string'){values.push(v);return;}
    if(typeof v!=='object'||visited.has(v))return;
    visited.add(v);
    for(const key of ['outcome','resultType','successLevel','successType','result','maneuverResult','resultName','label','name','title','text']){
      const child=v[key];
      if(typeof child==='string')values.push(child);
      else if(child&&typeof child==='object')visit(child,level+1);
    }
  };visit(resolved);return values;
}
function suggestedOutcome(resolved){
  for(const raw of flattenCandidates(resolved)){
    const s=norm(raw.replace(/([a-z])([A-Z])/g,'$1 $2')).replace(/[\s_\-]+/g,' ');
    if(/absolute failure|échec absolu|critical failure/.test(s))return 'absoluteFailure';
    if(/absolute success|réussite absolue|critical success/.test(s))return 'absoluteSuccess';
    if(/partial success|réussite partielle/.test(s))return 'partialSuccess';
    if(/\bfailure\b|\béchec\b/.test(s))return 'failure';
    if(/\bsuccess\b|\bréussite\b/.test(s))return 'success';
  }
  return null;
}
function cultureCandidates(actor){
  const candidates=[];
  const add=(v)=>{if(typeof v==='string'&&v.startsWith('culture-')&&!candidates.includes(v))candidates.push(v);};
  const f=actor.flags?.['merp-ui']??{};
  for(const x of [f.cultureKey,f.culture?.key,actor.system?.culture?.key,actor.system?.cultureKey])add(x);
  for(const item of actor.items??[]){
    if(item.type==='culture'||/culture/i.test(item.type??'')){
      add(item.flags?.['merp-ui']?.key);add(item.system?.cultureKey);add(item.system?.key);
    }
  }
  return candidates;
}
// A single private RollTable per creature; keep all Lore kinds inside it.
async function getCreatureTable(creatureKey){
  const pack=game.packs.get(LORE_PACK);
  if(!pack||pack.documentName!=='RollTable')throw new Error('Compendium Creature Lore introuvable.');
  const tables=(await pack.getDocuments()).filter(t=>rawLore(t).creatureKey===creatureKey);
  if(tables.length!==1||rawLore(tables[0]).loreKey!=='all')
    throw new Error('Une RollTable unique est requise pour '+creatureKey);
  const table=await pack.getDocument(tables[0].id);
  if(!table)throw new Error('Table de Lore inaccessible.');
  return table;
}
const loreFamily = result=>{
  const meta=rawLore(result);
  return meta.loreKind??(meta.loreKey==='racial'&&meta.cultureKey?.startsWith('culture-')?'cultural':meta.loreKey);
};
const loreLanguage=()=>{
  let selected=null;
  try{selected=globalThis.MERPUI?.contentLanguage?.();}catch{}
  return selected==='fr'||selected==='en'?selected:
    game.i18n?.lang?.startsWith('fr')?'fr':'en';
};
function translatedLore(entry){
  const meta=rawLore(entry),lang=loreLanguage();
  if(lang==='en'&&meta.englishTranslationStatus==='not-available')
    throw new Error('La traduction anglaise du Warg Racial Lore reste à valider.');
  const translated=meta.localizations?.[lang];
  return {text:translated?.text??entry.description,gmNote:translated?.gmNote??meta.gmNote};
}
async function getTableEntries(creatureKey,loreKey,variantKey='*',family=null){
  const table=await getCreatureTable(creatureKey);
  const kind=family??(loreKey==='racial'?(variantKey.startsWith('race-')?'racial':'cultural'):loreKey);
  const results=[...table.results].filter(result=>{
    const meta=rawLore(result);
    if(meta.loreKey!==loreKey||loreFamily(result)!==kind)return false;
    if(kind==='racial')return (meta.raceKey??'*')===variantKey;
    if(kind==='cultural')return (meta.cultureKey??'*')===variantKey;
    if(kind==='region')return (meta.regionKey??'*')===variantKey;
    return variantKey==='*';
  });
  return {table,results};
}
const raceAliases={
 'race-humans':['men','humans','hommes','humains','hildor'],
 'race-dunedain':['dunedain','dúnedain','dunedain of arnor','dunedain of gondor'],
 'race-elves':['elves','elfes','quendi'],
 'race-khazad':['dwarves','nains','khazad'],
 'race-hobbits':['hobbits','periannath'],
 'race-half-elves':['half-elves','demi-elfes','peredhil'],
 'race-petty-dwarves':['petty-dwarves','petits-nains','noegyth nibin'],
 'race-umli':['umli','demi-nains'],
 'race-orcs':['orcs','orques','yrch'],
 'race-half-orcs':['half-orcs','demi-orcs'],
 'race-trolls':['trolls','tereg'],
 'race-half-trolls':['half-trolls','demi-trolls']
};
const normalizedTopic =value=>norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\u2018\u2019]/g,"'").replace(/\s+/g,' ').trim();
async function pickRacialVariant(actor,creatureKey,specialization,{automatic=false,familyHint=null}={}){
  const table=await getCreatureTable(creatureKey);
  const races=new Map(),cultures=new Map();
  for(const result of table.results){
    const meta=rawLore(result);
    if(meta.loreKey!=='racial')continue;
    if(loreFamily(result)==='racial')races.set(meta.raceKey??'*',meta.raceLabel??meta.raceKey??'Général');
    if(loreFamily(result)==='cultural'&&meta.cultureKey?.startsWith('culture-'))
      cultures.set(meta.cultureKey,meta.cultureLabelFr??meta.cultureKey);
  }
  if(familyHint==='racial')cultures.clear();
  if(familyHint==='cultural')races.clear();
  const name=normalizedTopic(specialization);
  const matchingRace=[...races.keys()].filter(key=>
    key!=='*'&&raceAliases[key]?.some(alias=>normalizedTopic(alias)===name));
  if(matchingRace.length===1)return {kind:'racial',key:matchingRace[0]};
  const ownedCulture=cultureCandidates(actor).filter(key=>cultures.has(key));
  if(/^(own culture|culture d'origine|culture d’origine)$/.test(name)&&ownedCulture.length===1)
    return {kind:'cultural',key:ownedCulture[0]};
  if(name==='own culture'&&cultures.has('culture-half-elves') &&
    (actor.items??[]).some(i=>i.type==='race'&&/half[-\s]?elf|demi[-\s]?elf/i.test(i.name)))
    return {kind:'cultural',key:'culture-half-elves'};
  if(name){
    const matched=[...cultures].filter(([key,label])=>
      normalizedTopic(label)===name||
      normalizedTopic(key.replace(/^culture-/,'').replace(/-/g,' '))===name);
    if(matched.length===1)return {kind:'cultural',key:matched[0][0]};
  }
  if(creatureKey==='wolf'&&races.has('*'))return {kind:'racial',key:'*'};
  if(automatic)return null;
  const choices=[
    ...[...races].map(([key,label])=>({key:'racial:'+key,label:'Race — '+label})),
    ...[...cultures].map(([key,label])=>({key:'cultural:'+key,label:'Culture — '+label+
      (ownedCulture.includes(key)?' (du personnage)':'')}))
  ].sort((a,b)=>a.label.localeCompare(b.label,'fr'));
  if(!choices.length)throw new Error('Aucune variante raciale ou culturelle.');
  const selected=await chooseOption({
    title:'Racial Lore — Race ou culture',
    lead:'Confirme le domaine effectivement étudié par la compétence du personnage.',
    items:choices,ok:'Continuer'});
  if(!selected)return null;
  const i=selected.key.indexOf(':');
  return {kind:selected.key.slice(0,i),key:selected.key.slice(i+1)};
}

/**
 * Warg regional knowledge has 31 specific variants, unlike the Wolf's
 * existing general Region Lore. Choose by native RMU specialization when
 * unambiguous; otherwise ask the GM. Never send a random regional result.
 */
async function pickWargRegion(specialization,{automatic=false}={}) {
  const table=await getCreatureTable('warg');
  const regions=new Map();
  for(const entry of table.results){
    if(loreFamily(entry)!=='region')continue;
    const meta=rawLore(entry);
    if(meta.regionKey && !regions.has(meta.regionKey))
      regions.set(meta.regionKey,{key:meta.regionKey,label:(loreLanguage()==='fr'?meta.regionLabelFr:null)||meta.regionLabel||meta.regionKey});
  }
  const options=[...regions.values()].sort((a,b)=>a.label.localeCompare(b.label,'en'));
  if(options.length!==32)throw new Error('Warg Region Lore: 32 regional variants expected.');
  const normalise=value=>norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/^region lore\s*[:\/\-]?\s*/,'').trim();
  const desired=normalise(specialization);
  const matches=desired.length>2?options.filter(x=>{
    const key=normalise(x.label);
    return key===desired || key.startsWith(desired+' ') ||
      (key.includes(' — ') && key.split(' — ').some(part=>part===desired)) ||
      (desired.startsWith(key+' '));
  }):[];
  if(matches.length===1)return matches[0].key;
  if(automatic)return null;
  const chosen=await chooseOption({
    title:'Region Lore — Warg',lead:'Sélectionne le territoire correspondant au savoir du personnage.',
    items:options,ok:'Consulter la région',
    foot:'Cette sélection ne modifie pas le résultat du jet RMU.'
  });
  return chosen?.key??null;
}

async function pickOutcome(resolved){
  const preferred=suggestedOutcome(resolved);
  const choices=OUTCOMES.map(([key,label])=>({key,label:(key===preferred?'★ ':'')+label}));
  choices.sort((a,b)=>Number(b.key===preferred)-Number(a.key===preferred));
  return (await chooseOption({title:'Degré RMU constaté',
    lead:preferred?'Vérifie le résultat proposé ci-dessous sur la carte RMU MJ.':'Lis la carte de jet RMU (MJ) et sélectionne son véritable degré.',
    items:choices,ok:'Consulter la table',foot:'Ce choix ne relance aucun dé. Il confirme uniquement le résultat du jet existant.'}))?.key??null;
}
/**
 * The receiving GM checks that native RMU messages exist and are actually blind.
 * A client-provided outcome is never automatically used when the native RMU card
 * explicitly disagrees. Unrecognized or ambiguous outcomes require GM review.
 */
function nativeRollDiagnostics(complete,started){
  const ids=flag(complete,'nativeMessageIds');
  const token=flag(complete,'rollToken');
  const viaIds=Array.isArray(ids)?ids.map(id=>game.messages.get(id)).filter(Boolean):[];
  const viaToken=typeof token==='string'&&token.length>=16
    ?game.messages.contents.filter(m=>flag(m,'nativeRollToken')===token):[];
  const native=[...new Map([...viaIds,...viaToken].map(m=>[m.id,m])).values()];
  if(!native.length)return {verified:false,native,reason:'la carte du jet secret est introuvable côté MJ (marqueur de corrélation absent)'};
  if(native.some(m=>!m.blind || !Array.from(m.whisper??[]).length
    ||Array.from(m.whisper??[]).some(id=>!gmIds().includes(id))))
    return {verified:false,native,reason:'une carte RMU n’est pas blind/GM-only'};
  if(native.some(m=>authorId(m)!==authorId(started)))
    return {verified:false,native,reason:'les auteurs du jet et de la demande ne correspondent pas'};
  return {verified:true,native,reason:'ok'};
}
function confirmedOutcome(complete,started,{automatic=false}={}) {
  const nativeCheck=nativeRollDiagnostics(complete,started);
  if(!nativeCheck.verified)return null;
  const native=nativeCheck.native;
  const hint=flag(complete,'suggestedOutcome');
  const observations=[...new Set(native.map(m=>{
    const content=String(m.content??'').replace(/<[^>]*>/g,' ');
    // Use fields written by RMU in the message in addition to its HTML.
    // Never infer an outcome solely from a raw d100 without its modifiers.
    return suggestedOutcome({result:content}) || suggestedOutcome(m.flags?.rmu)
      || suggestedOutcome(m.system) || suggestedOutcome(m.rolls?.[0]?.options);
  }).filter(Boolean))];
  if(observations.length>1)return null;
  if(observations.length===1){
    if(hint&&hint!==observations[0])return null;
    return observations[0];
  }
  return OUTCOMES.some(([k])=>k===hint)?hint:null;
}
function primaryActiveGM() {
  return game.users.filter(u=>u.isGM&&u.active!==false).sort((a,b)=>a.id.localeCompare(b.id))[0]?.id??null;
}
async function gmReview(complete,{automatic=false}={}) {
  if(!game.user.isGM)return false;
  if(flag(complete,'kind')!=='player-roll-complete'){
    if(!automatic)warn('Ce message ne correspond pas à un jet Lore achevé.');
    return false;
  }
  const requestId=flag(complete,'requestId'),loreKey=flag(complete,'loreKey');
  const started=findMessage('player-request',requestId,m=>m.id===flag(complete,'playerRequestId'));
  if(!started)throw new Error('Demande du joueur introuvable.');
  if(authorId(complete)!==authorId(started))throw new Error('Auteur du compte rendu incohérent.');
  const requester=game.users.get(authorId(started));
  if(!requester||!LORE[loreKey])throw new Error('Demandeur ou compétence inconnu.');
  const offer=findMessage('public-offer',requestId,m=>isOffer(m)&&flag(m,'loreKey')===loreKey);
  if(!offer)throw new Error('Invitation du Meneur introuvable.');
  const source=await sourceFor(requestId);
  if(source.loreKey!==loreKey)throw new Error('La référence d’origine ne correspond pas.');
  const actor=game.actors.get(flag(started,'actorId'));
  const item=actor?.items?.get(flag(started,'skillItemId'));
  const specialization=flag(started,'specialization')??'';
  if(!actor||actor.type==='Creature'||!item||!isSkill(item,loreKey)||!actor.testUserPermission(requester,'OWNER'))
    throw new Error('Personnage ou compétence du joueur invalide.');
  if(specialOf(item)&&specialOf(item)!==specialization)throw new Error('Spécialisation incohérente.');
  const already=findMessage('gm-review',requestId,m=>flag(m,'playerRequestId')===started.id);
  if(already){
    if(!automatic){
      if(findMessage('player-reveal',requestId,m=>flag(m,'recipientUserId')===requester.id))warn('Le message narratif a déjà été transmis.');
      else await gmReveal(already);
    }
    return true;
  }
  // The player's blindVerified flag cannot be authoritative: blind messages
  // may be entirely absent from that client's game.messages collection.
  // Check the GM-visible native roll directly, including recipient and author.
  const nativeCheck=nativeRollDiagnostics(complete,started);
  if(!nativeCheck.verified){
    if(!automatic)warn('Aucune carte RMU aveugle ne correspond de façon sûre à cette demande : '+nativeCheck.reason);
    else console.warn(`[${MODULE_ID}] Envoi suspendu : ${nativeCheck.reason}`,{requestId,completionId:complete.id});
    return false;
  }
  const key='gm:'+complete.id;
  if(inFlight.has(key))return false;
  inFlight.add(key);
  try {
    const detected=confirmedOutcome(complete,started,{automatic});
    const outcome=automatic?detected:await pickOutcome(detected?{outcome:detected}:null);
    if(!outcome){
      if(automatic)console.warn(`[${MODULE_ID}] MP non envoyé : degré RMU introuvable (ne PAS déduire du d100 seul). Cliquer « MJ · Vérifier / envoyer la connaissance » sur la carte privée.`,{requestId,completeId:complete.id,rmuresult:flag(complete,'suggestedOutcome')});
      return false;
    }

    const creatureKey=source.creature.flags['merp-ui'].creatureLore.key;
    let variantKey='*',family=loreKey;
    if(loreKey==='racial'){
      const chosen=await pickRacialVariant(actor,creatureKey,specialization,{automatic,familyHint:source.familyHint});
      if(!chosen){
        if(automatic)console.info('[merp-ui] Racial Lore: spécialisation ambiguë; sélection MJ nécessaire.',{requestId,specialization});
        return false;
      }
      variantKey=chosen.key;family=chosen.kind;
    }
    if(loreKey==='region'&&creatureKey==='warg'){
      variantKey=await pickWargRegion(specialization,{automatic});
      if(!variantKey)return false;
    }
    const {table,results}=await getTableEntries(creatureKey,loreKey,variantKey,family);
    const found=results.filter(r=>rawLore(r).outcome===outcome);
    if(found.length!==1){
      if(automatic){console.warn(`[${MODULE_ID}] MP non envoyé : table sans résultat unique.`,{requestId,loreKey,family,variantKey,outcome,count:found.length});return false;}
      throw new Error(`Aucune entrée unique : ${family}/${variantKey}/${outcome} (${found.length}).`);
    }
    const entry=found[0],meta=rawLore(entry),narrative=translatedLore(entry);
    const review=await ChatMessage.create({author:game.user.id,speaker:neutralSpeaker(),
      ...ChatMessage.applyMode({
        content:`<section class="merp-lore-chat-card merp-lore-review" data-merp-lore-request="${requestId}">
          <header>MJ · Résultat de Lore (privé)</header>
          <p>${escapeHTML(actor.name)} · ${escapeHTML(LORE[loreKey].label)} / ${escapeHTML(specialization)}</p>
          <p><strong>Degré RMU :</strong> ${escapeHTML(outcome)} · <strong>Variante :</strong> ${escapeHTML(family+' / '+variantKey)}</p>
          <p><strong>Fiabilité :</strong> ${escapeHTML(meta.reliability)} · ${escapeHTML(narrative.gmNote)}</p>
          ${narrativeHTML(narrative.text)}
          <button class="merp-lore-gm-reveal" type="button">MJ · Vérifier / envoyer le MP narratif</button></section>`,
        flags:loreFlags({kind:'gm-review',requestId,playerRequestId:started.id,recipientId:requester.id,actorId:actor.id,
          loreKey,outcome,family,variantKey,text:narrative.text,reliability:meta.reliability,tableUuid:table.uuid})
      },'blind')
    });
    if(!review)throw new Error('Impossible de créer la carte privée du Meneur.');
    // Only the narrative paragraph reaches the player. No outcome, table level,
    // reliability or source UUID in content or in the message's public flags.
    await gmReveal(review);
    ui.notifications.info('Lore : connaissance transmise par MP, sans résultat ni fiabilité.');
    return true;
  }finally{inFlight.delete(key);}
}
async function gmReveal(review){
  if(!game.user.isGM||flag(review,'kind')!=='gm-review'||!gmAuthored(review))return;
  const requestId=flag(review,'requestId'),recipientId=flag(review,'recipientId');
  if(!findMessage('player-request',requestId,m=>m.id===flag(review,'playerRequestId')))
    throw new Error('Demande d’origine introuvable.');
  if(findMessage('player-reveal',requestId,m=>gmAuthored(m)&&flag(m,'recipientUserId')===recipientId))
    return warn('Cette connaissance a déjà été transmise.');
  const text=flag(review,'text');
  if(typeof text!=='string'||!text.trim())throw new Error('Texte narratif manquant.');
  const recipient=game.users.get(recipientId);
  if(!recipient)throw new Error('Joueur destinataire introuvable.');
  await ChatMessage.create({author:game.user.id,speaker:neutralSpeaker(),
    whisper:[...new Set([...gmIds(),recipient.id])],blind:false,
    // NO header, name, degree, success/failure, table reference or reliability.
    content:`<div class="merp-lore-private-text">${narrativeHTML(text)}</div>`,
    flags:loreFlags({kind:'player-reveal',requestId,recipientUserId:recipient.id})});
}
/** On an active GM client, automatically deliver the result after the player's blind roll. */
function autoOnCompletedMessage(message){
  if(!game.user.isGM||game.user.id!==primaryActiveGM())return;
  if(flag(message,'kind')!=='player-roll-complete'||!message.blind)return;
  void gmReview(message,{automatic:true}).then(ok=>{
    if(!ok)console.info(`[${MODULE_ID}] Résultat ou culture indéterminé : utiliser « MJ · Vérifier / envoyer la connaissance » sur la carte privée.`,message.id);
  }).catch(error=>fail(error,'envoi automatique au joueur'));
}
function addButtons(app,html){
  if(!game.user.isGM)return;
  const actor=app.actor??app.document;
  if(!currentCreature(actor))return;
  const element=html instanceof HTMLElement?html:html?.[0]??html?.element;
  if(!(element instanceof HTMLElement))return;
  for(const entry of element.querySelectorAll('.merp-ui-lore-entry[data-merp-ui-lore]')){
    const key=entry.dataset.merpUiLore;
    if(!LORE[key]||!actor.flags['merp-ui'].creatureLore.lore[key])continue;
    const kind=entry.dataset.merpUiLoreKind??(key==='racial'?'racial':key);
    let button=entry.querySelector('.merp-lore-propose');
    if(!button){
      button=document.createElement('button');
      button.type='button';button.className='merp-lore-propose';
      button.textContent='🎲 Proposer un jet';
      entry.append(' ',button);
    }
    if(button.dataset.merpLoreBound==='1')continue;
    button.dataset.merpLoreBound='1';button.draggable=true;
    button.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      void publishOffer(actor,key,kind==='cultural'||kind==='racial'?kind:null);
    });
    button.addEventListener('dragstart',event=>{
      event.stopPropagation();event.dataTransfer.effectAllowed='copy';
      event.dataTransfer.setData(DRAG_TYPE,JSON.stringify({
        sourceActorUuid:actor.uuid,loreKey:key,familyHint:kind==='cultural'||kind==='racial'?kind:null
      }));
    });
  }
  // Fallback for RMU Actor sheets without MERP-specific Lore rows.
  // UI-only: no changes to Actor Notes, Description, Items or RMU mechanics.
  if(!element.querySelector('.merp-ui-lore-entry[data-merp-ui-lore],.merp-ui-lore-offer-panel')){
    const active=Object.keys(LORE).filter(key=>actor.flags?.['merp-ui']?.creatureLore?.lore?.[key]);
    if(active.length){
      const panel=document.createElement('section');
      panel.className='merp-ui-lore-offer-panel';
      panel.style.cssText='padding:8px;margin:8px 0;border:1px solid var(--color-border-light-tertiary,#999);border-radius:4px';
      const heading=document.createElement('strong');
      heading.textContent='MERP-UI · Creature Lore';
      panel.append(heading);
      for(const key of active){
        const button=document.createElement('button');
        button.type='button';button.className='merp-lore-propose';
        button.textContent='🎲 '+LORE[key].label+' · Proposer un jet';
        button.addEventListener('click',event=>{
          event.preventDefault();event.stopPropagation();void publishOffer(actor,key);
        });
        panel.append(' ',button);
      }
      (element.querySelector('.sheet-body,.window-content,.application-content')??element).append(panel);
    }
  }
}
function isChatDropTarget(target){return target instanceof Element && !!target.closest('#chat,#chat-log,.chat-log,.chat-form,[data-tab="chat"],[data-sidebar-tab="chat"]');}
function handleDragOver(e){if(game.user.isGM&&isChatDropTarget(e.target)&&[...(e.dataTransfer?.types??[])].includes(DRAG_TYPE)){e.preventDefault();e.dataTransfer.dropEffect='copy';}}
async function handleDrop(e){if(!game.user.isGM||!isChatDropTarget(e.target))return;
  const raw=e.dataTransfer?.getData(DRAG_TYPE);if(!raw)return;
  e.preventDefault();e.stopImmediatePropagation();
  try{const obj=JSON.parse(raw);await publishOffer(await fromUuid(obj.sourceActorUuid),obj.loreKey,obj.familyHint??null);}catch(err){fail(err,'déposer Lore');}
}
function clickedMessage(btn,kind){
  const row=btn.closest('[data-message-id]');
  let msg=row?.dataset?.messageId?game.messages.get(row.dataset.messageId):null;
  const id=btn.closest('[data-merp-lore-request]')?.getAttribute('data-merp-lore-request');
  if(!msg&&id)msg=findMessage(kind,id);
  return msg;
}
function onChatClick(e){
  if(!(e.target instanceof Element))return;
  const b=e.target.closest('.merp-lore-chat-roll,.merp-lore-gm-review,.merp-lore-gm-reveal');
  if(!b||!b.closest('.merp-lore-chat-card'))return;
  e.preventDefault();e.stopPropagation();
  const isOfferBtn=b.classList.contains('merp-lore-chat-roll');
  const isReviewBtn=b.classList.contains('merp-lore-gm-review');
  if(!isOfferBtn&&!game.user.isGM)return;
  const kind=isOfferBtn?'public-offer':isReviewBtn?'player-roll-complete':'gm-review';
  const msg=clickedMessage(b,kind);
  if(!msg)return warn('Message d’origine introuvable. Recharge le chat.');
  const fn=isOfferBtn?playerBlindRoll:isReviewBtn?gmReview:gmReveal;
  void fn(msg).catch(err=>fail(err,kind));
}
Hooks.once('init',()=>{
  Hooks.on('renderActorSheetV2',addButtons);
  Hooks.on('renderActorSheet',addButtons);
  Hooks.on('renderApplicationV2',addButtons);
});

/**
 * Bind imported World Actors to the existing two Lore tables, never bundling
 * commercial RMU Actors. Names are exact to avoid false identification.
 */
async function enableLoreActor(actor,creatureKey){
  if(!game.user.isGM)throw new Error('Seul le Meneur peut activer Creature Lore.');
  if(typeof actor==='string')actor=game.actors.get(actor);
  if(!actor||actor.type!=='Creature')throw new Error('Un Actor RMU Creature est requis.');
  if(!['wolf','warg'].includes(creatureKey))throw new Error('Créature Lore inconnue.');
  const prev=actor.flags?.['merp-ui']?.creatureLore??{};
  if(prev.key&&prev.key!==creatureKey)
    throw new Error('Cette créature possède déjà une autre identité Lore.');
  const lore=creatureKey==='wolf'
    ?{racial:true,region:true,historic:true}
    :{racial:true,region:true};
  if(prev.key===creatureKey&&Object.keys(lore).every(key=>prev.lore?.[key]))return actor;
  await actor.update({'flags.merp-ui.creatureLore':{
    ...prev,key:creatureKey,lore:{...prev.lore,...lore}
  }});
  return actor;
}
const enableWargActor=actor=>enableLoreActor(actor,'warg');
const enableWolfActor=actor=>enableLoreActor(actor,'wolf');
const namedLoreKey=actor=>{
  if(actor?.type!=='Creature')return null;
  const name=String(actor.name??'').trim();
  if(/^(?:wolves|wolf|loups?)$/i.test(name))return 'wolf';
  if(/^(?:wargs?|ouargues?)$/i.test(name))return 'warg';
  return null;
};
async function enableNamedLoreCreatures(){
  if(!game.user.isGM||game.user.id!==primaryActiveGM())return;
  for(const actor of game.actors.contents){
    const creatureKey=namedLoreKey(actor);
    if(creatureKey)await enableLoreActor(actor,creatureKey);
  }
}

Hooks.once('ready',()=>{
  document.documentElement?.classList?.add(game.user.isGM?'merp-lore-gm-client':'merp-lore-player-client');
  if(game.system?.id!=='rmu'){console.warn(`[${MODULE_ID}] RMU requis.`);return;}
  document.addEventListener('click',onChatClick,true);
  Hooks.on('createChatMessage',autoOnCompletedMessage);
  // On MJ reconnection, resume completed but not-yet-delivered requests.
  if(game.user.isGM&&game.user.id===primaryActiveGM()) {
    for(const m of game.messages.contents.filter(x=>flag(x,'kind')==='player-roll-complete')) {
      const sent=findMessage('player-reveal',flag(m,'requestId'),x=>flag(x,'recipientUserId')===authorId(m));
      if(!sent)autoOnCompletedMessage(m);
    }
  }
  document.addEventListener('dragover',handleDragOver,true);
  document.addEventListener('drop',e=>void handleDrop(e),true);
  game.merpUiLore=Object.freeze({proposeFromActor:publishOffer,choicesForUser,activateWarg:enableWargActor,activateWolf:enableWolfActor});
  Hooks.on('createActor',actor=>{
    if(!game.user.isGM||game.user.id!==primaryActiveGM())return;
    const creatureKey=namedLoreKey(actor);
    if(creatureKey)void enableLoreActor(actor,creatureKey).catch(error=>fail(error,'liaison Creature Lore'));
  });
  void enableNamedLoreCreatures().catch(e=>fail(e,'liaison du bestiaire'));
  console.info(`[${MODULE_ID}] intégré : jet RMU aveugle, table de compendium privée, MP narratif.`);
});
