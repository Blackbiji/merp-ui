import { folderParentId } from "./content-folders.js";
import { localizeManagedDocument } from "./localization.js";
import { localizeJournalDocument } from "./content-localization.js";

const MODULE_ID = "merp-ui";
const ROOT_FOLDER = "MERP-RMU";

export function findManagedItem(key) {
  return game.items.find((item) =>
    item.getFlag(MODULE_ID, "key") === key &&
    item.getFlag(MODULE_ID, "collection") === "merp-rmu"
  );
}

export function prepareDocumentData(entry, folder) {
  const data = localizeManagedDocument(entry.document, entry.localizations);
  data.folder = folder.id;
  return data;
}

export async function upsertManagedItem(entry, folder) {
  const existing = findManagedItem(entry.key);
  const data = prepareDocumentData(entry, folder);

  if (!existing) {
    const created = await Item.create(data, { renderSheet: false });
    return { action: "created", item: created };
  }

  const update = foundry.utils.deepClone(data);
  delete update.type;
  await existing.update(update, { render: false });
  return { action: "updated", item: existing };
}


export function findManagedJournal(key) {
  return game.journal.find((journal) =>
    journal.getFlag(MODULE_ID, "key") === key &&
    journal.getFlag(MODULE_ID, "collection") === "merp-rmu-rules"
  );
}

export function prepareJournalData(entry, folder) {
  const data = localizeJournalDocument(entry.document, entry.localizations);
  data.folder = folder?.id ?? null;
  return data;
}

export async function upsertManagedJournal(entry, folder) {
  const existing = findManagedJournal(entry.key);
  const data = prepareJournalData(entry, folder);

  if (!existing) {
    const created = await JournalEntry.create(data, { renderSheet: false });
    return { action: "created", journal: created };
  }

  const update = foundry.utils.deepClone(data);
  await existing.update(update, { render: false, diff: false, recursive: false });
  return { action: "updated", journal: existing };
}

export function managedJournals() {
  return game.journal.filter((journal) =>
    journal.getFlag(MODULE_ID, "collection") === "merp-rmu-rules"
  );
}

export function managedItems() {
  return game.items.filter((item) =>
    item.getFlag(MODULE_ID, "collection") === "merp-rmu"
  );
}


export function folderLineageNames(item) {
  const names = [];
  let folder = item?.folder ?? null;
  const visited = new Set();

  while (folder && !visited.has(folder.id)) {
    visited.add(folder.id);
    names.push(folder.name);
    const parentId = folderParentId(folder);
    folder = parentId ? game.folders.get(parentId) : null;
  }

  return names;
}

export function ageFolderName(item) {
  return folderLineageNames(item).find((name) => /^(Premier|Deuxième|Troisième|Quatrième) Âge$/u.test(name)) ?? null;
}

export function normalizeLinkLabel(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[’']/gu, "’")
    .trim();
}

export function aliasesForManagedItem(item) {
  const aliases = new Set([item.name]);
  const name = item.name;

  if (name.includes(" — ")) {
    const [left, right] = name.split(" — ", 2);
    aliases.add(left.trim());
    for (const part of right.split(/\s*\/\s*/u)) aliases.add(part.trim());
  }

  const paren = name.match(/^(.+?)\s*\((.+)\)$/u);
  if (paren) {
    aliases.add(paren[1].trim());
    for (const part of paren[2].split(/\s*\/\s*/u)) aliases.add(part.trim());
  }

  const explicitAliases = {
    "Guerrier": ["Guerrier", "Fighter"],
    "Barbare": ["Barbare", "Barbarian"],
    "Roublard": ["Roublard", "Rogue"],
    "Voleur": ["Voleur", "Thief"],
    "Sans Profession": ["Sans Profession", "Layman"],
    "Alchimiste": ["Alchimiste", "Alchemist"],
    "Magicien": ["Magicien", "Magician"],
    "Soigneur": ["Soigneur", "Lay Healer"],
    "Animiste": ["Animiste", "Animist"],
    "Rôdeur": ["Rôdeur", "Ranger"],
    "Barde": ["Barde", "Bard"],
    "Devin": ["Devin", "Seer"],
    "Astrologue": ["Astrologue", "Astrologer"],
    "Razak-Zinul": ["Razak-Zinul", "Razak-zinul"],
    "Kekhavra": ["Kekhavra"],
    "Sorcier": ["Sorcier", "Sorcerer"],
    "Vracara": ["Vracara"],
    "Wegech": ["Wegech"],
    "Drughân": ["Drughân", "Drughan"],
    "Herutano": ["Herutano", "Herutanor"],
    "Prêtre Honnin (Ônu)": ["Prêtre Honnin", "Ônu", "Honnin Priest"],
    "Petits-Nains — Noegyth Nibin": ["Petits-Nains", "Noegyth Nibin"],
    "Orcs communs — Yrch": ["Orcs communs", "Yrch"],
    "Uruk-hai — Grands Orcs": ["Uruk-hai", "Grands Orcs"],
    "Demi-Orcs — Perorch / Piryrch": ["Demi-Orcs", "Perorch", "Piryrch"],
    "Trolls des Cavernes": ["Trolls des Cavernes"],
    "Trolls des Forêts": ["Trolls des Forêts"],
    "Trolls des Collines": ["Trolls des Collines"],
    "Trolls des Neiges": ["Trolls des Neiges"],
    "Trolls de Pierre": ["Trolls de Pierre"],
    "Olog-hai — Trolls Noirs": ["Olog-hai", "Olog", "Trolls Noirs"],
    "Demi-Trolls — Pertorog / Pirtereg": ["Demi-Trolls", "Pertorog", "Pirtereg"],

    "Khazâd (Naugrim)": ["Khazâd", "Naugrim", "Nains"],
    "Humains (Hildor)": ["Humains", "Hildor"],
    "Elfes (Quendi)": ["Elfes", "Quendi"],
    "Hobbits (Periannath)": ["Hobbits", "Periannath"],
    "Demi-Elfes (Peredhil)": ["Demi-Elfes", "Peredhil"],
    "Umli (Demi-Nains)": ["Umli", "Demi-Nains"],
    "Petits-Nains (Noegyth Nibin)": ["Petits-Nains", "Noegyth Nibin"],
    "Orcs (Yrch)": ["Orcs", "Yrch"],
    "Trolls (Tereg)": ["Trolls", "Tereg"],
    "Drúedain / Woses — Drughu": ["Drúedain", "Woses", "Drughu"],
    "Daen Lintis — Dunlendings": ["Daen Lintis", "Dunlendings", "Dunlending"],
    "Gimútéothraim — Éothraim": ["Gimútéothraim", "Éothraim"],
    "Hommes des Collines — Hillmen": ["Hommes des Collines", "Hillmen"],
    "Luindrim — Foredhil / Iaurwaith": ["Luindrim", "Foredhil", "Iaurwaith"],
    "Narodbrijig — Peuple des Collines": ["Narodbrijig"],
    "Covsheknarod — Êluzan": ["Covsheknarod", "Êluzan"],
    "Honnin — Suzamatu": ["Honnin", "Suzamatu"],
    "Kuorind — Ûshasai": ["Kuorind", "Ûshasai"],
    "Pêdi — Jashcâi": ["Pêdi", "Jashcâi"],
    "Teleri — Falmari": ["Teleri", "Falmari"],
    "Maison de Bávor — Barbes-Raides": ["Maison de Bávor", "Barbes-Raides"],
    "Maison de Thelór — Poings-de-Fer": ["Maison de Thelór", "Poings-de-Fer"],
    "Maison de Drúin — Pieds-de-Pierre": ["Maison de Drúin", "Pieds-de-Pierre"],
    "Maison de Barin — Mèches-Noires": ["Maison de Barin", "Mèches-Noires"],
    "Maison de Durin — Longues-Barbes": ["Maison de Durin", "Longues-Barbes"],
    "Maisons de Dwálin et de Thrár — Barbes-de-Feu et Torses-Larges": [
      "Maisons de Dwálin et de Thrár", "Maison de Dwálin", "Maison de Thrár",
      "Barbes-de-Feu", "Torses-Larges"
    ]
  };

  for (const alias of explicitAliases[name] ?? []) aliases.add(alias);
  return [...aliases].map(normalizeLinkLabel).filter((alias) => alias.length >= 4);
}

export function chooseLinkTarget(sourceItem, candidates) {
  if (!candidates.length) return null;
  const sourceAge = ageFolderName(sourceItem);
  return candidates.find((candidate) => ageFolderName(candidate) === sourceAge) ?? candidates[0];
}

export function buildManagedLinkAliases(sourceItem, items) {
  const aliases = new Map();

  for (const target of items) {
    if (target.id === sourceItem.id) continue;
    for (const alias of aliasesForManagedItem(target)) {
      const key = alias.toLocaleLowerCase("fr");
      const list = aliases.get(key) ?? { label: alias, targets: [] };
      list.targets.push(target);
      if (alias.length > list.label.length) list.label = alias;
      aliases.set(key, list);
    }
  }

  return [...aliases.values()]
    .map((entry) => ({
      label: entry.label,
      target: chooseLinkTarget(sourceItem, entry.targets)
    }))
    .filter((entry) => entry.target)
    .sort((a, b) => b.label.length - a.label.length);
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export function linkTextNode(text, aliases, usedTargetIds) {
  let remaining = text;
  const chunks = [];

  while (remaining.length) {
    let best = null;

    for (const entry of aliases) {
      if (usedTargetIds.has(entry.target.id)) continue;
      const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(entry.label)})(?=$|[^\\p{L}\\p{N}])`, "iu");
      const match = remaining.match(pattern);
      if (!match) continue;
      const start = (match.index ?? 0) + match[1].length;
      if (!best || start < best.start || (start === best.start && match[2].length > best.match.length)) {
        best = { entry, start, match: match[2] };
      }
    }

    if (!best) {
      chunks.push(remaining);
      break;
    }

    chunks.push(remaining.slice(0, best.start));
    chunks.push(`@UUID[Item.${best.entry.target.id}]{${best.match}}`);
    usedTargetIds.add(best.entry.target.id);
    remaining = remaining.slice(best.start + best.match.length);
  }

  return chunks.join("");
}

export function enrichManagedDescriptionLinks(sourceItem, html, items) {
  if (!html || typeof html !== "string" || !globalThis.DOMParser) return html;
  const aliases = buildManagedLinkAliases(sourceItem, items);
  if (!aliases.length) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="merp-link-root">${html}</div>`, "text/html");
  const root = doc.querySelector("#merp-link-root");
  if (!root) return html;

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  const usedTargetIds = new Set();
  for (const node of nodes) {
    const parentTag = node.parentElement?.tagName?.toLowerCase();
    if (["a", "code", "pre", "script", "style", "h1"].includes(parentTag)) continue;
    if (!node.nodeValue?.trim()) continue;
    node.nodeValue = linkTextNode(node.nodeValue, aliases, usedTargetIds);
  }

  return root.innerHTML;
}

export async function linkManagedDescriptions() {
  const items = managedItems();
  let updated = 0;

  for (const item of items) {
    const description = item.system?.description;
    if (!description || typeof description !== "string") continue;
    const linked = enrichManagedDescriptionLinks(item, description, items);
    if (linked === description) continue;
    await item.update({ "system.description": linked }, { render: false });
    updated += 1;
  }

  return updated;
}

export function buildJournalLinkAliases(sourceJournal, journals, items) {
  const aliases = [];
  for (const journal of journals) {
    if (journal.id === sourceJournal.id) continue;
    aliases.push({ label: normalizeLinkLabel(journal.name), uuid: `JournalEntry.${journal.id}`, targetId: `J:${journal.id}` });
  }
  for (const item of items) {
    for (const alias of aliasesForManagedItem(item)) {
      aliases.push({ label: alias, uuid: `Item.${item.id}`, targetId: `I:${item.id}` });
    }
  }
  return aliases.filter((entry) => entry.label.length >= 4).sort((a, b) => b.label.length - a.label.length);
}

export function linkTextNodeToDocuments(text, aliases, usedTargetIds) {
  let remaining = text;
  const chunks = [];
  while (remaining.length) {
    let best = null;
    for (const entry of aliases) {
      if (usedTargetIds.has(entry.targetId)) continue;
      const pattern = new RegExp(`(^|[^\p{L}\p{N}])(${escapeRegExp(entry.label)})(?=$|[^\p{L}\p{N}])`, "iu");
      const match = remaining.match(pattern);
      if (!match) continue;
      const start = (match.index ?? 0) + match[1].length;
      if (!best || start < best.start || (start === best.start && match[2].length > best.match.length)) {
        best = { entry, start, match: match[2] };
      }
    }
    if (!best) { chunks.push(remaining); break; }
    chunks.push(remaining.slice(0, best.start));
    chunks.push(`@UUID[${best.entry.uuid}]{${best.match}}`);
    usedTargetIds.add(best.entry.targetId);
    remaining = remaining.slice(best.start + best.match.length);
  }
  return chunks.join("");
}

export function enrichJournalHtmlLinks(sourceJournal, html, journals, items) {
  if (!html || typeof html !== "string" || !globalThis.DOMParser) return html;
  const aliases = buildJournalLinkAliases(sourceJournal, journals, items);
  if (!aliases.length) return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="merp-journal-link-root">${html}</div>`, "text/html");
  const root = doc.querySelector("#merp-journal-link-root");
  if (!root) return html;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  const usedTargetIds = new Set();
  for (const node of nodes) {
    const parentTag = node.parentElement?.tagName?.toLowerCase();
    if (["a", "code", "pre", "script", "style", "h1"].includes(parentTag)) continue;
    if (!node.nodeValue?.trim()) continue;
    node.nodeValue = linkTextNodeToDocuments(node.nodeValue, aliases, usedTargetIds);
  }
  return root.innerHTML;
}

export async function linkManagedJournalPages() {
  const journals = managedJournals();
  const items = managedItems();
  let updated = 0;
  for (const journal of journals) {
    const pageUpdates = [];
    for (const page of journal.pages ?? []) {
      if (page.type !== "text") continue;
      const content = page.text?.content;
      if (!content) continue;
      const linked = enrichJournalHtmlLinks(journal, content, journals, items);
      if (linked !== content) pageUpdates.push({ _id: page.id, "text.content": linked });
    }
    if (pageUpdates.length) {
      await journal.updateEmbeddedDocuments("JournalEntryPage", pageUpdates);
      updated += pageUpdates.length;
    }
  }
  return updated;
}

