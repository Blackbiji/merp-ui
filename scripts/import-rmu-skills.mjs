import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const REGISTRY_PATH = path.join(ROOT, "translations/skills/source/skills-translation-work.json");
const WORK_PATH = path.join(ROOT, "translations/skills/source/skills.fr.work.json");

function slug(value) {
  return String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function readExport(exportPath) {
  const parsed = JSON.parse(await fs.readFile(exportPath, "utf8"));
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.skills)) return parsed.skills;
  if (Array.isArray(parsed.documents)) return parsed.documents;
  throw new Error("Le fichier exporté doit contenir un tableau de documents Item RMU.");
}

async function readLevelDb(systemPath) {
  let ClassicLevel;
  try { ({ ClassicLevel } = await import("classic-level")); }
  catch { throw new Error("classic-level n'est pas installé. Exécutez `npm install`, ou fournissez un export JSON de rmu.core."); }
  const dbPath = path.join(systemPath, "packs/core");
  const db = new ClassicLevel(dbPath, { valueEncoding: "json" });
  const docs = [];
  await db.open();
  try {
    for await (const [key, value] of db.iterator()) {
      if (!String(key).startsWith("!items!")) continue;
      if (value?.type === "skill") docs.push(value);
    }
  } finally { await db.close(); }
  return docs;
}

const input = process.argv[2];
if (!input) {
  console.error("Usage: npm run import:rmu-skills -- <export-rmu-core.json | chemin-du-systeme-rmu>");
  process.exit(1);
}
const stat = await fs.stat(input);
const docs = stat.isDirectory() ? await readLevelDb(input) : await readExport(input);
const registry = JSON.parse(await fs.readFile(REGISTRY_PATH, "utf8"));
const work = JSON.parse(await fs.readFile(WORK_PATH, "utf8"));
registry.skills ??= {}; work.skills ??= {};
let added = 0, updated = 0;

for (const doc of docs.filter((d) => d?.type === "skill")) {
  const name = doc.name || doc.system?.name;
  if (!name) continue;
  const officialUuid = `Compendium.rmu.core.Item.${doc._id}`;
  let skillId = Object.keys(registry.skills).find((id) => registry.skills[id].officialUuid === officialUuid || registry.skills[id].canonicalName === name);
  if (!skillId) { skillId = `rmu.skill.${slug(name)}`; added += 1; }
  else updated += 1;
  const previous = registry.skills[skillId] ?? {};
  registry.skills[skillId] = {
    ...previous,
    skillId,
    canonicalName: name,
    officialUuid,
    sourceType: "RMU",
    original: { name, description: doc.system?.description ?? null },
    aliases: [...new Set([name, ...(previous.aliases ?? [])])],
    rmu: {
      id: doc._id,
      systemName: doc.system?.name ?? null,
      category: doc.system?.category ?? null,
      trainingGroup: doc.system?.trainingGroup ?? null,
      stat: doc.system?.stat ?? null,
      specializationType: doc.system?.specializationType ?? null,
      hasSpecialization: doc.system?.hasSpecialization ?? false,
      fixedSpecializations: doc.system?.fixedSpecializations ?? false,
      specializations: doc.system?.specializations ?? [],
      autoSkill: doc.system?.autoSkill ?? false,
      folder: doc.folder ?? null
    },
    importedFrom: "rmu.core",
    importedAt: new Date().toISOString()
  };
  const previousWork = work.skills[skillId] ?? {};
  work.skills[skillId] = {
    ...previousWork,
    skillId,
    officialUuid,
    original: registry.skills[skillId].original,
    translation: previousWork.translation ?? previous.translation ?? { name: "", description: "" },
    status: previousWork.status ?? "draft",
    aliases: registry.skills[skillId].aliases,
    notes: previousWork.notes ?? "",
    alternatives: previousWork.alternatives ?? [],
    rmu: registry.skills[skillId].rmu,
    validatedBy: previousWork.validatedBy ?? "",
    validatedDate: previousWork.validatedDate ?? ""
  };
}
await fs.writeFile(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
await fs.writeFile(WORK_PATH, `${JSON.stringify(work, null, 2)}\n`, "utf8");
console.log(`${docs.length} document(s) skill lus; ${added} ajouté(s), ${updated} mis à jour.`);
