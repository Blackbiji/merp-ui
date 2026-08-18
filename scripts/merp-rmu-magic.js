const MODULE_ID = "merp-ui";
const FLAG_SCOPE = MODULE_ID;

const SETTINGS = {
  enabled: "merpMagicAutomation",
  shadowActivity: "merpMagicShadowActivity",
  agePeriod: "merpMagicAgePeriod",
  region: "merpMagicRegion",
  corruptionAuto: "merpMagicCorruptionAuto",
  shadowWhisper: "merpMagicShadowWhisper"
};

const pendingCommandWords = new Map();
const corruptionContexts = new Map();
const processedSCRChatIds = new Set();

const RISK_BY_TYPE = Object.freeze({
  BE: { low: 25, medium: 35, high: 50, veryHigh: 75 },
  DE: { low: 15, medium: 25, high: 40, veryHigh: 65 },
  E:  { low: 0, medium: 10, high: 25, veryHigh: 50 },
  F:  { low: -5, medium: 5, high: 20, veryHigh: 45 },
  P:  { low: -15, medium: -5, high: 10, veryHigh: 35 },
  U:  { low: -20, medium: -10, high: 5, veryHigh: 30 },
  I:  { low: -25, medium: -15, high: 0, veryHigh: 25 }
});

const AGE_MODIFIERS = Object.freeze({
  neutral: 0,
  firstWar: 25,
  firstMorgothAscendant: 40,
  secondBeforeSauron: -10,
  secondSauronAscendant: 10,
  secondLastAlliance: 25,
  earlyThird: -15,
  midThird: 0,
  lateThird: 25,
  fourth: -25
});

const REGION_LABELS = Object.freeze({
  haven: "MERPUI.Settings.Magic.Region.Haven",
  civilizedUrban: "MERPUI.Settings.Magic.Region.CivilizedUrban",
  civilizedRural: "MERPUI.Settings.Magic.Region.CivilizedRural",
  frontierUrban: "MERPUI.Settings.Magic.Region.FrontierUrban",
  frontierRural: "MERPUI.Settings.Magic.Region.FrontierRural",
  wilderness: "MERPUI.Settings.Magic.Region.Wilderness",
  shadowLands: "MERPUI.Settings.Magic.Region.ShadowLands",
  shadowHold: "MERPUI.Settings.Magic.Region.ShadowHold"
});

const SHADOW_TABLE = Object.freeze({
  haven: [
    [5, "Nothing"], [20, "Nothing"], [30, "Nothing"], [40, "Nothing"], [50, "Nothing"], [60, "Nothing"], [70, "Nothing"],
    [80, "Sighting"], [90, "Sighting"], [100, "Spotting"], [150, "Spotting"], [200, "Kidnapping"], [Infinity, "Assassin"]
  ],
  civilizedUrban: [
    [5, "Nothing"], [20, "Nothing"], [30, "Sighting"], [40, "Sighting"], [50, "Sighting"], [60, "Spotting"], [70, "Spotting"],
    [80, "Ambush"], [90, "Kidnapping"], [100, "Assassin"], [150, "Kidnapping"], [200, "Assassin"], [Infinity, "Special"]
  ],
  civilizedRural: [
    [5, "Nothing"], [20, "Nothing"], [30, "Nothing"], [40, "Sighting"], [50, "Sighting"], [60, "Spotting"], [70, "Spotting"],
    [80, "Creature"], [90, "Ambush"], [100, "Assassin"], [150, "Kidnapping"], [200, "Assassin"], [Infinity, "Special"]
  ],
  frontierUrban: [
    [5, "Nothing"], [20, "Sighting"], [30, "Sighting"], [40, "Spotting"], [50, "Spotting"], [60, "Spotting"], [70, "Ambush"],
    [80, "Kidnapping"], [90, "Kidnapping"], [100, "Assassin"], [150, "Kidnapping"], [200, "Assassin"], [Infinity, "Special"]
  ],
  frontierRural: [
    [5, "Nothing"], [20, "Nothing"], [30, "Sighting"], [40, "Sighting"], [50, "Spotting"], [60, "Spotting"], [70, "Creature"],
    [80, "Creature"], [90, "Ambush"], [100, "Patrol"], [150, "Assassin"], [200, "Special"], [Infinity, "Special"]
  ],
  wilderness: [
    [5, "Nothing"], [20, "Nothing"], [30, "Nothing"], [40, "Sighting"], [50, "Spotting"], [60, "Creature"], [70, "Creature"],
    [80, "Creature"], [90, "Creature"], [100, "Ambush"], [150, "Patrol"], [200, "Special"], [Infinity, "Special"]
  ],
  shadowLands: [
    [5, "Nothing"], [20, "Sighting"], [30, "Spotting"], [40, "Spotting"], [50, "Creature"], [60, "Creature"], [70, "Patrol"],
    [80, "Patrol"], [90, "Ambush"], [100, "Army Unit"], [150, "Special"], [200, "Special"], [Infinity, "Special"]
  ],
  shadowHold: [
    [5, "Sighting"], [20, "Spotting"], [30, "Creature"], [40, "Creature"], [50, "Patrol"], [60, "Patrol"], [70, "Ambush"],
    [80, "Army Unit"], [90, "Army Unit"], [100, "Special"], [150, "Special"], [200, "Special"], [Infinity, "Special"]
  ]
});

const SHADOW_RESULTS = Object.freeze({
  Nothing: {
    fr: "Rien",
    description: "Aucune conséquence supplémentaire n’est déclenchée par le second jet."
  },
  Sighting: {
    fr: "Observation",
    description: "Les forces maléfiques de la zone savent qu’un sort a été lancé et connaissent la direction générale du lanceur. Cela peut déclencher une poursuite, ou une alerte générale dans les Terres/Bastions de l’Ombre."
  },
  Spotting: {
    fr: "Localisation",
    description: "Comme Sighting, mais au moins une force maléfique connaît la direction exacte et la distance approximative jusqu’au lanceur."
  },
  Creature: {
    fr: "Créature",
    description: "Une créature maléfique proche ressent le sort et commence à poursuivre, traquer, attaquer ou tenter une embuscade contre le lanceur."
  },
  Patrol: {
    fr: "Patrouille",
    description: "Comme Spotting, et au moins une patrouille maléfique organisée commence à poursuivre, traquer, attaquer ou tendre une embuscade au lanceur."
  },
  Ambush: {
    fr: "Embuscade",
    description: "Comme Spotting, et au moins une force maléfique est déjà en position de tenter de préparer une embuscade."
  },
  "Army Unit": {
    fr: "Unité militaire",
    description: "Comme Patrol, et au moins une force maléfique importante et organisée est en position d’attaquer directement le lanceur."
  },
  Kidnapping: {
    fr: "Enlèvement",
    description: "Comme Spotting, et au moins une des forces qui a ressenti le sort tentera de capturer le lanceur."
  },
  Assassin: {
    fr: "Assassin",
    description: "Comme Spotting, et au moins une des forces qui a ressenti le sort est un assassin maléfique qui tentera de tuer le lanceur."
  },
  Special: {
    fr: "Spécial",
    description: "Une réaction spéciale de l’Ombre est déclenchée. Le MJ détermine la force ou l’agent approprié à la région et aux circonstances, conformément aux indications de la table."
  }
});

const SORCERY_LISTS = new Set([
  "Curses", "Disease", "Necromancy", "Wounding",
  "Flesh Destruction", "Fluid Destruction", "Gas Destruction", "Mind Destruction", "Solid Destruction", "Soul Destruction",
  "Gate Mastery", "Dark Contacts", "Dark Summons", "Entity Summons", "Matter Disruption", "Physical Errosion", "Physical Erosion",
  "Mind Death", "Mind Disease", "Mind Domination", "Mind Erosion", "Mind Subverion", "Mind Subversion",
  "Mind Attack", "Mind Control"
]);

const CORRUPTION_TYPE_MOD = Object.freeze({ BE: -20, DE: -20, E: -15, F: -15, P: -5, U: -3, I: -1 });

function setting(key) {
  try { return game.settings.get(MODULE_ID, key); } catch (_) { return undefined; }
}

function activeGM() {
  return game.users?.filter((u) => u.active && u.isGM).sort((a, b) => String(a.id).localeCompare(String(b.id)))[0] ?? null;
}

function isProcessingGM() {
  return game.user?.isGM && activeGM()?.id === game.user.id;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function spellFromMessage(message) {
  return message?.flags?.rmu?.scr?.spell ?? message?.flags?.rmu?.conditions?.spell ?? null;
}

function resultCodeFromMessage(message) {
  return Number(message?.flags?.rmu?.scr?.resultCode ?? 0);
}

function actorFromMessage(message) {
  const actorId = message?.speaker?.actor;
  return actorId ? game.actors.get(actorId) : null;
}

function commandKey(actorId, spell) {
  return `${actorId ?? ""}::${spell?._spellListName ?? spell?.spellList ?? ""}::${spell?.name ?? ""}`;
}

function getFastCastingCommandWord(spell, fastCastingMod) {
  if (spell?.isInstantaneous) {
    return { active: true, form: "word", label: "Mot de Commandement", fastCastingMod: "instantaneous", ap: 0, penalty: 0 };
  }
  const n = Number(fastCastingMod ?? 0);
  if (n <= -3) {
    return {
      active: true,
      form: "phrase",
      label: "Phrase de Commandement",
      fastCastingMod: String(n),
      ap: Math.max(0, 4 + n),
      penalty: 25 * n
    };
  }
  return { active: false };
}

function enhanceSpellDialog(app, renderedHtml = null) {
  if (app?.constructor?.name !== "SpellCastingDialogV2") return;
  const candidate = renderedHtml?.[0] ?? renderedHtml ?? app?.element?.[0] ?? app?.element;
  const root = candidate instanceof HTMLElement ? candidate : null;
  if (!root) return;

  const select = root.querySelector('select[name="fastCastingMod"]');
  if (!select) return;

  let note = root.querySelector(".merp-rmu-command-word-note");
  if (!note) {
    note = document.createElement("div");
    note.className = "merp-rmu-command-word-note";
    select.closest("div")?.append(note);
  }

  const updateNote = () => {
    const spell = app.spell;
    const info = getFastCastingCommandWord(spell, select.value);
    if (spell?.isInstantaneous) {
      note.innerHTML = `<strong>MERP-RMU — Mot de Commandement.</strong> Sort instantané : l’incantation peut prendre la forme d’un mot unique.`;
      note.hidden = false;
    } else if (info.active) {
      note.innerHTML = `<strong>MERP-RMU — Phrase de Commandement.</strong> Ce lancement en ${info.ap} PA (${info.penalty}) est interprété comme une Parole de Commandement, de cinq mots maximum.`;
      note.hidden = false;
    } else {
      note.hidden = true;
      note.textContent = "";
    }
  };
  updateNote();
  select.addEventListener("change", updateNote, { passive: true });

  const form = root.matches("form") ? root : root.querySelector("form");
  if (form && !form.dataset.merpRmuCommandBound) {
    form.dataset.merpRmuCommandBound = "1";
    form.addEventListener("submit", () => {
      const spell = app.spell;
      const actorId = app.ctx?.token?.actor?.id;
      const info = getFastCastingCommandWord(spell, select.value);
      pendingCommandWords.set(commandKey(actorId, spell), { ...info, at: Date.now() });
      setTimeout(() => {
        const key = commandKey(actorId, spell);
        const current = pendingCommandWords.get(key);
        if (current && Date.now() - current.at > 15000) pendingCommandWords.delete(key);
      }, 16000);
    }, { capture: true });
  }
}

async function annotateCommandWord(message) {
  if (!message?.flags?.rmu?.scr) return;
  if (message.getFlag(FLAG_SCOPE, "commandWord")) return;
  const spell = spellFromMessage(message);
  const actorId = message?.speaker?.actor;
  if (!spell || !actorId) return;
  const key = commandKey(actorId, spell);
  let info = pendingCommandWords.get(key);
  if (info) pendingCommandWords.delete(key);
  if (!info && spell.isInstantaneous) info = getFastCastingCommandWord(spell, "0");
  if (!info?.active) return;

  try {
    if (message.isOwner || game.user?.isGM || message.author?.id === game.user?.id) {
      await message.setFlag(FLAG_SCOPE, "commandWord", info);
    }
  } catch (error) {
    console.warn(`${MODULE_ID} | Impossible d’annoter la Parole de Commandement`, error);
  }
}

function riskFactorFor(spellType, activity) {
  const row = RISK_BY_TYPE[String(spellType ?? "").toUpperCase()];
  return row?.[activity] ?? 0;
}

function shadowConsequence(region, rollTotal) {
  const rows = SHADOW_TABLE[region] ?? SHADOW_TABLE.wilderness;
  for (const [max, label] of rows) if (rollTotal <= max) return label;
  return "Special";
}

function gmWhisperIds() {
  return game.users.filter((u) => u.isGM).map((u) => u.id);
}

async function createShadowCard({ message, actor, spell, roll, riskFactor, ageModifier, detected, consequenceRoll = null, consequence = null }) {
  const region = setting(SETTINGS.region) ?? "frontierRural";
  const activity = setting(SETTINGS.shadowActivity) ?? "medium";
  const period = setting(SETTINGS.agePeriod) ?? "midThird";
  const commandWord = message.getFlag(FLAG_SCOPE, "commandWord");
  const resultCode = resultCodeFromMessage(message);
  const outcome = resultCode > 0 ? "JLS réussi" : resultCode === 0 ? "JLS nul" : "Échec de JLS";
  const commandHtml = commandWord?.active
    ? `<p><strong>${escapeHtml(commandWord.label)} :</strong> ${commandWord.form === "word" ? "mot unique" : `${commandWord.ap} PA, ${commandWord.penalty}`}</p>`
    : "";
  const consequenceInfo = SHADOW_RESULTS[consequence] ?? null;
  const consequenceLabel = consequenceInfo
    ? `${consequence} — ${consequenceInfo.fr}`
    : (consequence ?? "—");
  const consequenceHtml = detected
    ? `<p class="merp-rmu-shadow-alert"><strong>L’Ombre a perçu l’usage de la magie.</strong></p>
       <p>Second jet — Spell Use Risk Chart : <strong>${consequenceRoll?.total ?? "—"}</strong> — <strong>${escapeHtml(consequenceLabel)}</strong> (${escapeHtml(REGION_LABELS[region] ?? region)}).</p>
       ${consequenceInfo ? `<p><strong>Conséquence :</strong> ${escapeHtml(consequenceInfo.description)}</p>` : ""}`
    : `<p><strong>Aucune détection par l’Ombre.</strong> Aucun second jet de conséquence.</p>`;
  const manualCorruption = !isSorcerySpell(spell)
    ? `<button type="button" class="merp-rmu-corruption-check" data-source-message-id="${message.id}"><i class="fas fa-skull"></i> Tester la Corruption (usage corrupteur)</button>`
    : "";

  const content = `<section class="merp-rmu-magic-card">
    <h3>MERP-RMU — Risque d’attirer l’Ombre</h3>
    <p><strong>${escapeHtml(actor?.name ?? "Lanceur")}</strong> — ${escapeHtml(spell?._translatedName ?? spell?.name ?? "Sort")} (${escapeHtml(spell?.spellType ?? "?")}, niv. ${Number(spell?.level ?? 0)})</p>
    <p>${outcome}. Type ${escapeHtml(spell?.spellType ?? "?")} : ${riskFactor >= 0 ? "+" : ""}${riskFactor}; période : ${ageModifier >= 0 ? "+" : ""}${ageModifier}; activité : ${escapeHtml(activity)}.</p>
    <p>Jet de Risque : <strong>${roll.total}</strong> ${detected ? "≥ 100" : "< 100"}.</p>
    ${commandHtml}
    ${consequenceHtml}
    ${manualCorruption}
  </section>`;

  return ChatMessage.create({
    speaker: message.speaker,
    whisper: setting(SETTINGS.shadowWhisper) === false ? null : gmWhisperIds(),
    content,
    flags: { [FLAG_SCOPE]: { magicCard: true, sourceMessageId: message.id } }
  });
}

function isSorcerySpell(spell) {
  if (!spell) return false;
  if (spell.flags?.[FLAG_SCOPE]?.sorcery === true || spell.flags?.["merp-rmu"]?.sorcery === true) return true;
  return SORCERY_LISTS.has(String(spell.spellList ?? spell._spellListName ?? "").trim());
}

function actorEmBonus(actor) {
  const v = actor?.system?._statBlock?.Em?.total ?? actor?.system?.stats?.Em?.bonus ?? 0;
  return Number(v) || 0;
}

function actorCorruptionRaceBonus(actor) {
  const override = actor?.getFlag?.(FLAG_SCOPE, "corruptionRaceBonus");
  if (Number.isFinite(Number(override))) return Number(override);
  const raceItem = actor?.items?.find((i) => i.type === "race");
  const racial = raceItem?.system?.resistance?.Essence ?? actor?.system?._race?.resistance?.Essence ?? 0;
  return Number(racial) || 0;
}

function isSorcererActor(actor) {
  if (!actor) return false;
  const profession = actor.items?.find?.((item) => item.type === "profession");
  const values = [
    profession?.name,
    profession?.system?.profession,
    actor.system?._profession?.name,
    actor.system?._profession?.profession
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());
  return values.includes("sorcier") || values.includes("sorcerer");
}

function corruptionDeltaFromMargin(margin, doubleSorcererGain = false) {
  let delta = 0;
  if (margin < 0) {
    const fail = Math.abs(margin);
    if (fail >= 101) delta = 5;
    else if (fail >= 51) delta = 4;
    else if (fail >= 26) delta = 3;
    else if (fail >= 11) delta = 2;
    else delta = 1;
    if (doubleSorcererGain) delta *= 2;
  } else {
    if (margin >= 101) delta = -4;
    else if (margin >= 51) delta = -3;
    else if (margin >= 26) delta = -2;
    else if (margin >= 11) delta = -1;
    else delta = 0;
  }
  return delta;
}

async function runCorruptionCheck(actor, spell, { sorcery = false, sourceMessageId = null } = {}) {
  if (!actor || !spell) return null;
  const currentCP = Number(actor.getFlag(FLAG_SCOPE, "corruptionPoints") ?? 0) || 0;
  const type = String(spell.spellType ?? "").toUpperCase();
  const typeMod = CORRUPTION_TYPE_MOD[type] ?? 0;
  const sorceryMod = sorcery ? -15 : 0;
  const emBonus = actorEmBonus(actor);
  const emMod = Math.max(-30, Math.min(30, 3 * emBonus));
  const racialBonus = actorCorruptionRaceBonus(actor);
  const attackLevelPenalty = -2 * Number(spell.level ?? 0);
  const totalModifier = typeMod + sorceryMod - currentCP + racialBonus + emMod + attackLevelPenalty;

  const roll = await new Roll(`1d100oe ${totalModifier >= 0 ? "+" : "-"} ${Math.abs(totalModifier)}`, {}, {
    rmuContext: "MERP-RMU.Corruption"
  }).evaluate();
  try { await game.dice3d?.showForRoll?.(roll, game.user, true, gmWhisperIds(), false); } catch (_) {}

  // RMU adaptation: corruption has no opposing SCR; use the standard RR fallback target of 50.
  const margin = Number(roll.total ?? 0) - 50;
  const sorcererDouble = sorcery && isSorcererActor(actor);
  const delta = corruptionDeltaFromMargin(margin, sorcererDouble);
  const nextCP = Math.max(0, currentCP + delta);
  if (setting(SETTINGS.corruptionAuto) !== false) {
    await actor.setFlag(FLAG_SCOPE, "corruptionPoints", nextCP);
  }

  const content = `<section class="merp-rmu-magic-card merp-rmu-corruption-card">
    <h3>MERP-RMU — Corruption</h3>
    <p><strong>${escapeHtml(actor.name)}</strong> — ${escapeHtml(spell._translatedName ?? spell.name)}${sorcery ? " — <strong>Sorcellerie</strong>" : ""}</p>
    <p>Modificateurs : type ${type} ${typeMod >= 0 ? "+" : ""}${typeMod}; ${sorcery ? "Sorcellerie -15; " : ""}PC actuels -${currentCP}; bonus racial ${racialBonus >= 0 ? "+" : ""}${racialBonus}; 3×Em ${emMod >= 0 ? "+" : ""}${emMod}; niveau d’attaque ${attackLevelPenalty}.</p>
    <p>RR de Corruption (adaptation RMU, seuil 50) : <strong>${roll.total}</strong> — ${margin >= 0 ? `réussite de ${margin}` : `échec de ${Math.abs(margin)}`}.</p>
    <p>Points de Corruption : <strong>${delta >= 0 ? "+" : ""}${delta}</strong> → total <strong>${nextCP}</strong>${sorcererDouble && delta > 0 ? " (Sorcier : gain de Corruption ×2 pour la Sorcellerie)" : ""}.</p>
  </section>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: gmWhisperIds(),
    content,
    flags: { [FLAG_SCOPE]: { corruptionResult: true, sourceMessageId, delta, total: nextCP, sorcery, sorcererDouble } }
  });

  return { roll, margin, delta, nextCP, sorcererDouble };
}

function messageFromSCREvent(eventData) {
  const chatId = eventData?.action?.chatId;
  return chatId ? game.messages?.get(chatId) ?? null : null;
}

function actorFromSCREvent(eventData) {
  const message = messageFromSCREvent(eventData);
  const fromMessage = actorFromMessage(message);
  if (fromMessage) return fromMessage;
  const tokenId = eventData?.attackerTokenId;
  const token = tokenId ? canvas?.tokens?.get(tokenId) : null;
  return token?.actor ?? null;
}

async function processSCREvent(eventData) {
  if (!setting(SETTINGS.enabled) || !isProcessingGM()) return;
  if (eventData?.action?.actionType !== "SCR") return;
  const chatId = eventData?.action?.chatId;
  if (!chatId || processedSCRChatIds.has(chatId)) return;

  const message = messageFromSCREvent(eventData);
  if (message?.getFlag?.(FLAG_SCOPE, "magicProcessed")) {
    processedSCRChatIds.add(chatId);
    return;
  }

  const spell = eventData?.spell ?? spellFromMessage(message);
  const actor = actorFromSCREvent(eventData);
  if (!spell || !actor) {
    console.warn(`${MODULE_ID} | SCR MERP ignoré : lanceur ou sort introuvable`, eventData);
    return;
  }

  processedSCRChatIds.add(chatId);
  try { await message?.setFlag?.(FLAG_SCOPE, "magicProcessed", true); } catch (_) {}

  // Recover the Word of Command selection from the launch dialog, if present.
  if (message) await annotateCommandWord(message);

  const activity = setting(SETTINGS.shadowActivity) ?? "medium";
  const period = setting(SETTINGS.agePeriod) ?? "midThird";
  const region = setting(SETTINGS.region) ?? "frontierRural";
  const riskFactor = riskFactorFor(spell.spellType, activity);
  const ageModifier = AGE_MODIFIERS[period] ?? 0;
  const modifier = riskFactor + ageModifier;
  const roll = await new Roll(`1d100oe ${modifier >= 0 ? "+" : "-"} ${Math.abs(modifier)}`, {}, {
    rmuContext: "MERP-RMU.ShadowRisk"
  }).evaluate();
  try { await game.dice3d?.showForRoll?.(roll, game.user, true, gmWhisperIds(), false); } catch (_) {}
  const detected = Number(roll.total ?? 0) >= 100;
  let consequenceRoll = null;
  let consequence = null;
  if (detected) {
    consequenceRoll = await new Roll("1d100oe", {}, { rmuContext: "MERP-RMU.ShadowConsequence" }).evaluate();
    consequence = shadowConsequence(region, Number(consequenceRoll.total ?? 0));
  }

  // createShadowCard expects a message-like object for flags/speaker; use the SCR chat message.
  if (message) {
    await createShadowCard({ message, actor, spell, roll, riskFactor, ageModifier, detected, consequenceRoll, consequence });
  } else {
    const synthetic = {
      id: chatId,
      speaker: ChatMessage.getSpeaker({ actor }),
      getFlag: () => null
    };
    await createShadowCard({ message: synthetic, actor, spell, roll, riskFactor, ageModifier, detected, consequenceRoll, consequence });
  }

  if (isSorcerySpell(spell)) {
    await runCorruptionCheck(actor, spell, { sorcery: true, sourceMessageId: chatId });
  }
}

async function processSCRMessage(message) {
  if (!setting(SETTINGS.enabled) || !isProcessingGM()) return;
  if (!message?.flags?.rmu?.scr) return;
  if (processedSCRChatIds.has(message.id)) return;
  if (message.getFlag(FLAG_SCOPE, "magicProcessed")) { processedSCRChatIds.add(message.id); return; }

  const spell = spellFromMessage(message);
  const actor = actorFromMessage(message);
  if (!spell || !actor) return;

  // Mark first so that socket echo / reconnect cannot duplicate the MERP roll.
  processedSCRChatIds.add(message.id);
  try { await message.setFlag(FLAG_SCOPE, "magicProcessed", true); } catch (_) {}

  const activity = setting(SETTINGS.shadowActivity) ?? "medium";
  const period = setting(SETTINGS.agePeriod) ?? "midThird";
  const region = setting(SETTINGS.region) ?? "frontierRural";
  const riskFactor = riskFactorFor(spell.spellType, activity);
  const ageModifier = AGE_MODIFIERS[period] ?? 0;
  const modifier = riskFactor + ageModifier;
  const roll = await new Roll(`1d100oe ${modifier >= 0 ? "+" : "-"} ${Math.abs(modifier)}`, {}, {
    rmuContext: "MERP-RMU.ShadowRisk"
  }).evaluate();
  try { await game.dice3d?.showForRoll?.(roll, game.user, true, gmWhisperIds(), false); } catch (_) {}
  const detected = Number(roll.total ?? 0) >= 100;
  let consequenceRoll = null;
  let consequence = null;
  if (detected) {
    consequenceRoll = await new Roll("1d100oe", {}, { rmuContext: "MERP-RMU.ShadowConsequence" }).evaluate();
    consequence = shadowConsequence(region, Number(consequenceRoll.total ?? 0));
  }

  await createShadowCard({ message, actor, spell, roll, riskFactor, ageModifier, detected, consequenceRoll, consequence });

  if (isSorcerySpell(spell)) {
    await runCorruptionCheck(actor, spell, { sorcery: true, sourceMessageId: message.id });
  }
}


function actorFromSheetApp(app) {
  const candidate = app?.actor ?? app?.document ?? app?.object ?? app?.ctx?.actor ?? null;
  if (candidate?.documentName === "Actor") return candidate;
  if (candidate?.actor?.documentName === "Actor") return candidate.actor;
  return null;
}

function sheetRoot(app, renderedHtml = null) {
  const candidate = renderedHtml?.[0] ?? renderedHtml ?? app?.element?.[0] ?? app?.element;
  return candidate instanceof HTMLElement ? candidate : null;
}

function findBleedingRow(root) {
  if (!root) return null;
  const localized = game.i18n.localize("RMU.Conditions.HPperRound");
  const rows = [...root.querySelectorAll(".rmu-field-row")];
  return rows.find((row) => {
    const text = row.textContent?.replace(/\s+/g, " ").trim() ?? "";
    return text.includes(localized) || text.includes("Saignement (PV/Rd)") || text.includes("Bleeding HP/Rd");
  }) ?? null;
}

function corruptionStatusLabel(points) {
  const cp = Math.max(0, Number(points) || 0);
  if (cp >= 100) return "Corrompu";
  if (cp >= 75) return "Très élevée";
  if (cp >= 50) return "Élevée";
  if (cp >= 25) return "Marquée";
  if (cp > 0) return "Faible";
  return "Aucune";
}

function injectCorruptionRow(root, actor) {
  if (!root || !actor || root.querySelector(".merp-rmu-corruption-row")) return false;
  const bleedingRow = findBleedingRow(root);
  if (!bleedingRow) return false;

  const points = Math.max(0, Number(actor.getFlag(FLAG_SCOPE, "corruptionPoints") ?? 0) || 0);
  const row = document.createElement("div");
  row.className = "rmu-field-row rmu-row-checkbox merp-rmu-corruption-row";
  row.dataset.merpRmuActorId = actor.id;
  row.innerHTML = `
    <input class="rmu-spinner merp-rmu-corruption-spinner"
           type="number" min="0" max="999" step="1"
           value="${points}" ${actor.isOwner ? "" : "disabled"}
           aria-label="Points de Corruption MERP-RMU">
    <label class="rmu-label merp-rmu-corruption-label">
      Corruption (PC)
      <i class="rmu-info-mdi rmu-mdi rmu-mdi-info-circle"
         data-tooltip="Points de Corruption MERP-RMU. À 100 PC ou plus, le personnage est considéré comme maléfique pour les effets qui ciblent le Mal."></i>
      <span class="merp-rmu-corruption-status">${escapeHtml(corruptionStatusLabel(points))}</span>
    </label>`;

  bleedingRow.insertAdjacentElement("afterend", row);

  const input = row.querySelector(".merp-rmu-corruption-spinner");
  input?.addEventListener("change", async (event) => {
    if (!actor.isOwner) return;
    const value = Math.max(0, Math.trunc(Number(event.currentTarget.value) || 0));
    event.currentTarget.value = String(value);
    row.querySelector(".merp-rmu-corruption-status").textContent = corruptionStatusLabel(value);
    try {
      await actor.setFlag(FLAG_SCOPE, "corruptionPoints", value);
    } catch (error) {
      console.error(`${MODULE_ID} | Impossible de modifier les Points de Corruption`, error);
      ui.notifications.error("MERP-RMU : impossible de modifier les Points de Corruption.");
    }
  });
  return true;
}

function enhanceActorConditionsWithCorruption(app, renderedHtml = null) {
  if (game.system?.id !== "rmu") return;
  const actor = actorFromSheetApp(app);
  if (!actor) return;
  const root = sheetRoot(app, renderedHtml);
  if (!root) return;

  // The RMU sheet lazily builds some tabs. Try immediately, then watch the sheet
  // until the Conditions/États markup containing the Bleeding row is inserted.
  if (injectCorruptionRow(root, actor)) return;
  if (root.dataset.merpRmuCorruptionObserver === "1") return;
  root.dataset.merpRmuCorruptionObserver = "1";

  const observer = new MutationObserver(() => {
    if (!root.isConnected) {
      observer.disconnect();
      return;
    }
    injectCorruptionRow(root, actor);
  });
  observer.observe(root, { childList: true, subtree: true });
}

function allOpenApplications() {
  const apps = new Set();
  try {
    for (const app of Object.values(globalThis.ui?.windows ?? {})) if (app) apps.add(app);
  } catch (_) {}
  try {
    const instances = globalThis.foundry?.applications?.instances;
    if (instances?.values) for (const app of instances.values()) if (app) apps.add(app);
    else if (instances && typeof instances === "object") for (const app of Object.values(instances)) if (app) apps.add(app);
  } catch (_) {}
  return [...apps];
}

function actorForDomNode(node) {
  if (!(node instanceof HTMLElement)) return null;

  // RMU v1.3.x / Foundry v14 encodes the Actor id directly in the AppV2 sheet id:
  // CharacterSheetV2RMU-Actor-<actorId>.  This remains available even when the
  // sheet application is not exposed through ui.windows / application registries.
  const sheetElement = node.closest('.application.sheet.rmu, .application[data-document-name="Actor"]');
  const sheetId = sheetElement?.id ?? "";
  const idMatch = sheetId.match(/(?:^|-)Actor-([A-Za-z0-9]+)$/);
  if (idMatch?.[1]) {
    const actor = game.actors.get(idMatch[1]);
    if (actor) return actor;
  }

  // Fallback for older RMU / Foundry sheet implementations.
  for (const app of allOpenApplications()) {
    const root = sheetRoot(app);
    if (!root || !root.contains(node)) continue;
    const actor = actorFromSheetApp(app);
    if (actor) return actor;
  }
  return null;
}

function scanVisibleSheetsForCorruption() {
  if (game.system?.id !== "rmu") return 0;
  let inserted = 0;

  // First use the application registry, which is the most reliable way to associate a sheet with its Actor.
  for (const app of allOpenApplications()) {
    const actor = actorFromSheetApp(app);
    const root = sheetRoot(app);
    if (actor && root && injectCorruptionRow(root, actor)) inserted += 1;
  }

  // RMU lazily renders the États tab. If its application is not exposed through the standard
  // Foundry registries, locate the bleeding row directly and resolve the owning sheet afterwards.
  for (const bleedingRow of [...document.querySelectorAll(".rmu-field-row")].filter((row) => {
    const text = row.textContent?.replace(/\s+/g, " ").trim() ?? "";
    return text.includes("Saignement (PV/Rd)") || text.includes("Bleeding HP/Rd");
  })) {
    const parent = bleedingRow.parentElement;
    if (!parent || parent.querySelector(".merp-rmu-corruption-row")) continue;
    const actor = actorForDomNode(bleedingRow);
    if (actor && injectCorruptionRow(parent, actor)) inserted += 1;
  }
  return inserted;
}

function installGlobalCorruptionObserver() {
  if (document.body?.dataset.merpRmuGlobalCorruptionObserver === "1") return;
  if (!document.body) return;
  document.body.dataset.merpRmuGlobalCorruptionObserver = "1";
  let queued = false;
  const scan = () => {
    queued = false;
    scanVisibleSheetsForCorruption();
  };
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(scan);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  scanVisibleSheetsForCorruption();
}

function refreshVisibleCorruption(actor) {
  if (!actor) return;
  scanVisibleSheetsForCorruption();
  const points = Math.max(0, Number(actor.getFlag(FLAG_SCOPE, "corruptionPoints") ?? 0) || 0);
  document.querySelectorAll(`.merp-rmu-corruption-row[data-merp-rmu-actor-id="${CSS.escape(actor.id)}"]`).forEach((row) => {
    const input = row.querySelector(".merp-rmu-corruption-spinner");
    if (input && document.activeElement !== input) input.value = String(points);
    const status = row.querySelector(".merp-rmu-corruption-status");
    if (status) status.textContent = corruptionStatusLabel(points);
  });
}

function bindMagicChatButtons(message, html) {
  const root = html?.[0] ?? html;
  if (!(root instanceof HTMLElement)) return;
  root.querySelectorAll(".merp-rmu-corruption-check").forEach((button) => {
    if (button.dataset.boundMerpRmu) return;
    button.dataset.boundMerpRmu = "1";
    button.addEventListener("click", async () => {
      if (!game.user?.isGM) return;
      const sourceId = button.dataset.sourceMessageId;
      const source = game.messages.get(sourceId);
      const actor = actorFromMessage(source);
      const spell = spellFromMessage(source);
      if (!actor || !spell) return ui.notifications.warn("MERP-RMU : contexte du sort introuvable.");
      button.disabled = true;
      try {
        await runCorruptionCheck(actor, spell, { sorcery: false, sourceMessageId: sourceId });
      } finally {
        button.disabled = false;
      }
    });
  });
}

function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.enabled, {
    name: "MERPUI.Settings.Magic.Enabled.Name",
    hint: "MERPUI.Settings.Magic.Enabled.Hint",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MODULE_ID, SETTINGS.shadowActivity, {
    name: "MERPUI.Settings.Magic.ShadowActivity.Name",
    scope: "world", config: true, type: String, default: "medium",
    choices: {
      low: "MERPUI.Settings.Magic.ShadowActivity.Low",
      medium: "MERPUI.Settings.Magic.ShadowActivity.Medium",
      high: "MERPUI.Settings.Magic.ShadowActivity.High",
      veryHigh: "MERPUI.Settings.Magic.ShadowActivity.VeryHigh"
    }
  });
  game.settings.register(MODULE_ID, SETTINGS.agePeriod, {
    name: "MERPUI.Settings.Magic.AgePeriod.Name",
    scope: "world", config: true, type: String, default: "midThird",
    choices: {
      neutral: "MERPUI.Settings.Magic.AgePeriod.Neutral",
      firstWar: "MERPUI.Settings.Magic.AgePeriod.FirstWar",
      firstMorgothAscendant: "MERPUI.Settings.Magic.AgePeriod.FirstMorgoth",
      secondBeforeSauron: "MERPUI.Settings.Magic.AgePeriod.SecondBeforeSauron",
      secondSauronAscendant: "MERPUI.Settings.Magic.AgePeriod.SecondSauron",
      secondLastAlliance: "MERPUI.Settings.Magic.AgePeriod.SecondLastAlliance",
      earlyThird: "MERPUI.Settings.Magic.AgePeriod.EarlyThird",
      midThird: "MERPUI.Settings.Magic.AgePeriod.MidThird",
      lateThird: "MERPUI.Settings.Magic.AgePeriod.LateThird",
      fourth: "MERPUI.Settings.Magic.AgePeriod.Fourth"
    }
  });
  game.settings.register(MODULE_ID, SETTINGS.region, {
    name: "MERPUI.Settings.Magic.Region.Name",
    hint: "MERPUI.Settings.Magic.Region.Hint",
    scope: "world", config: true, type: String, default: "frontierRural",
    choices: REGION_LABELS
  });
  game.settings.register(MODULE_ID, SETTINGS.corruptionAuto, {
    name: "MERPUI.Settings.Magic.CorruptionAuto.Name",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MODULE_ID, SETTINGS.shadowWhisper, {
    name: "MERPUI.Settings.Magic.ShadowWhisper.Name",
    hint: "MERPUI.Settings.Magic.ShadowWhisper.Hint",
    scope: "world", config: true, type: Boolean, default: true
  });
}

Hooks.once("init", registerSettings);

Hooks.on("renderActorSheet", (app, html) => enhanceActorConditionsWithCorruption(app, html));
Hooks.on("renderActorSheetV2", (app, html) => enhanceActorConditionsWithCorruption(app, html));
Hooks.on("renderRMUActorSheet", (app, html) => enhanceActorConditionsWithCorruption(app, html));
Hooks.on("renderRMUCharacterSheet", (app, html) => enhanceActorConditionsWithCorruption(app, html));
Hooks.on("renderApplicationV2", (app, html) => enhanceActorConditionsWithCorruption(app, html));
Hooks.on("updateActor", (actor) => refreshVisibleCorruption(actor));

Hooks.on("renderSpellCastingDialogV2", (app, html) => enhanceSpellDialog(app, html));
Hooks.on("renderApplicationV2", (app, html) => enhanceSpellDialog(app, html));
Hooks.on("renderApplication", (app, html) => enhanceSpellDialog(app, html));

// RMU exposes the resolved spell-casting event directly. This is the primary MERP hook.
Hooks.on("rmu.scr", async (eventData) => {
  if (game.system?.id !== "rmu") return;
  await processSCREvent(eventData);
});

// Fallback for worlds where RMU journaling is disabled: process the SCR ChatMessage.
Hooks.on("createChatMessage", async (message) => {
  if (game.system?.id !== "rmu") return;
  await annotateCommandWord(message);
  // Wait a tick so the dedicated rmu.scr hook gets priority and can mark the chat id.
  setTimeout(() => processSCRMessage(message), 0);
});

const chatRenderHook = globalThis.game?.release?.generation >= 13 ? "renderChatMessageHTML" : "renderChatMessage";
Hooks.on(chatRenderHook, (message, html) => bindMagicChatButtons(message, html));

Hooks.once("ready", () => {
  installGlobalCorruptionObserver();
  globalThis.MERPUI = globalThis.MERPUI ?? {};
  const magicApi = {
    processSCRMessage,
    runCorruptionCheck,
    isSorcerySpell,
    getCorruptionPoints: (actor) => Number(actor?.getFlag?.(FLAG_SCOPE, "corruptionPoints") ?? 0) || 0,
    setCorruptionPoints: (actor, value) => actor?.setFlag?.(FLAG_SCOPE, "corruptionPoints", Math.max(0, Number(value) || 0)),
    setCorruptionRaceBonus: (actor, value) => actor?.setFlag?.(FLAG_SCOPE, "corruptionRaceBonus", Number(value) || 0),
    sorceryLists: [...SORCERY_LISTS],
    riskTable: RISK_BY_TYPE,
    shadowTable: SHADOW_TABLE,
    shadowResults: SHADOW_RESULTS,
    refreshCorruptionUI: () => scanVisibleSheetsForCorruption(),
    diagnostics: () => ({
      enabled: setting(SETTINGS.enabled),
      shadowActivity: setting(SETTINGS.shadowActivity),
      agePeriod: setting(SETTINGS.agePeriod),
      region: setting(SETTINGS.region),
      isProcessingGM: isProcessingGM(),
      activeGM: activeGM()?.name ?? null,
      corruptionRows: document.querySelectorAll(".merp-rmu-corruption-row").length,
      bleedingRows: [...document.querySelectorAll(".rmu-field-row")].filter((row) => row.textContent?.includes("Saignement (PV/Rd)") || row.textContent?.includes("Bleeding HP/Rd")).length,
      processedSCR: processedSCRChatIds.size
    })
  };
  globalThis.MERPUI.magic = magicApi;
  // Some MERP UI ready initialization is asynchronous; re-attach the namespace after it settles
  // so a late replacement of globalThis.MERPUI cannot erase the magic API.
  setTimeout(() => {
    globalThis.MERPUI = globalThis.MERPUI ?? {};
    globalThis.MERPUI.magic = magicApi;
  }, 0);
  console.log(`${MODULE_ID} | Automatisations magiques MERP-RMU actives (hook rmu.scr + fallback ChatMessage)`);
});
