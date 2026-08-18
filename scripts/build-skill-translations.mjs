import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SOURCE = path.join(ROOT, "translations/skills/source/skills.fr.work.json");
const OUTPUT = path.join(ROOT, "translations/skills/skills.fr.json");
const checkOnly = process.argv.includes("--check");

const work = JSON.parse(await fs.readFile(SOURCE, "utf8"));
const errors = [];
const warnings = [];
const output = {
  _meta: {
    schemaVersion: 2,
    locale: work._meta?.locale ?? "fr",
    moduleVersion: "1.2.0",
    scope: "shared",
    generated: true,
    source: "translations/skills/source/skills.fr.work.json"
  }
};

for (const [skillId, entry] of Object.entries(work.skills ?? {})) {
  if (!entry?.original?.name) errors.push(`${skillId}: original.name manquant`);
  if (!entry?.translation?.name) warnings.push(`${skillId}: traduction du nom manquante`);
  if (entry?.status !== "validated") warnings.push(`${skillId}: statut ${entry?.status ?? "absent"}`);
  const canonical = entry?.original?.name;
  if (!canonical) continue;
  output[canonical] = {
    skillId,
    officialUuid: entry.officialUuid ?? null,
    name: entry.translation?.name ?? canonical,
    description: entry.translation?.description ?? null,
    aliases: [...new Set([canonical, entry.translation?.name, ...(entry.aliases ?? [])].filter(Boolean))]
  };
}

if (errors.length) {
  console.error(errors.map((x) => `ERREUR: ${x}`).join("\n"));
  process.exit(1);
}
if (warnings.length) console.warn(warnings.map((x) => `AVERTISSEMENT: ${x}`).join("\n"));
if (!checkOnly) await fs.writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`${Object.keys(output).length - 1} compétence(s) ${checkOnly ? "vérifiée(s)" : "générée(s)"}.`);
