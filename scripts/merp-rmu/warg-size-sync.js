/**
 * MERP-UI — Warg Large/2x2 synchronization, Foundry V14 + RMU.
 * Changes ONLY Warg size and the lore flags. No RMU combat mechanics, Items,
 * talents, resistances, armor or actor description are modified.
 */
const MODULE='merp-ui';
function isWarg(actor){
 if(actor?.type!=='Creature')return false;
 const f=actor.flags?.[MODULE]??{};
 const key=f.creatureLore?.key??f.creatureLoreDraft?.key;
 return key==='warg'||(key==null&&String(actor.name).trim().toLowerCase()==='warg');
}
function loreConfig(actor){
 const f=actor.flags?.[MODULE]??{};
 const draft=f.creatureLoreDraft;
 if(f.creatureLore?.key==='warg')return null;
 if(draft?.key==='warg'&&draft.lore){
  return {schemaVersion:1,key:'warg',language:'fr',source:'MERP-UI Warg Lore V3.2',
    lore:{racial:draft.lore.racial,region:draft.lore.region}};
 }
 return {schemaVersion:1,key:'warg',language:'fr',source:'MERP-UI Warg Lore V3.2',
   lore:{racial:{skill:'Racial Lore',tableFlag:'warg:racial'},
         region:{skill:'Region Lore',tableFlag:'warg:region'}}};
}
async function fixTokenSizes({scenes=true}={}){
 if(!game.user.isGM)throw new Error('MERP-UI: GM only.');
 const targets=[...game.actors.contents].filter(isWarg);
 let modifiedActors=0,modifiedTokens=0;
 for(const actor of targets){
  const patch={};
  if(actor.system?.appearance?.size!=='L')patch['system.appearance.size']='L';
  if(actor.prototypeToken.width!==2)patch['prototypeToken.width']=2;
  if(actor.prototypeToken.height!==2)patch['prototypeToken.height']=2;
  const lore=loreConfig(actor);
  if(lore)patch['flags.merp-ui.creatureLore']=lore;
  if(Object.keys(patch).length){await actor.update(patch);modifiedActors++;}
 }
 if(scenes&&targets.length){
  const ids=new Set(targets.map(a=>a.id));
  for(const scene of game.scenes.contents){
   const patches=[...scene.tokens].filter(t=>ids.has(t.actorId)&&t.width===1&&t.height===1)
     .map(t=>({_id:t.id,width:2,height:2}));
   if(patches.length){await scene.updateEmbeddedDocuments('Token',patches);modifiedTokens+=patches.length;}
  }
 }
 return {matchedActors:targets.length,modifiedActors,modifiedTokens,
   requiredSize:'L',tokenWidth:2,tokenHeight:2};
}
Hooks.once('ready',()=>{
 if(game.system?.id!=='rmu'||!game.user.isGM)return;
 game.merpUiWarg=Object.freeze({fixTokenSizes});
 // The user explicitly requested Warg tokens to be Large. Idempotent:
 // existing Large tokens and all other creatures are untouched.
 const activeGMs=game.users.filter(u=>u.isGM&&u.active!==false).sort((a,b)=>a.id.localeCompare(b.id));
 if(activeGMs[0]?.id!==game.user.id)return;
 void fixTokenSizes().then(result=>{
  if(result.modifiedActors||result.modifiedTokens)
    console.info('[merp-ui] Warg Large token migration',result);
 }).catch(error=>console.error('[merp-ui] Warg Large token migration failed',error));
});
