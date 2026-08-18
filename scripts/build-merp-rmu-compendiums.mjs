import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const MODULE_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const MANIFEST = JSON.parse(
  await fs.readFile(path.join(MODULE_ROOT, "source", "compendiums", "manifest.json"), "utf8")
);

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function deterministicId(packName, sourceKey) {
  const digest = crypto.createHash("sha256").update(`${packName}:${sourceKey}`).digest();
  let value = 0n;
  for (const byte of digest.subarray(0, 12)) value = (value << 8n) + BigInt(byte);
  let id = "";
  for (let i = 0; i < 16; i += 1) {
    id = BASE62[Number(value % 62n)] + id;
    value /= 62n;
  }
  return id;
}

function mergeDeep(base, overlay) {
  if (
    base == null || overlay == null ||
    Array.isArray(base) || Array.isArray(overlay) ||
    typeof base !== "object" || typeof overlay !== "object"
  ) return structuredClone(overlay);
  const out = structuredClone(base);
  for (const [key, value] of Object.entries(overlay)) {
    if (
      value && typeof value === "object" && !Array.isArray(value) &&
      out[key] && typeof out[key] === "object" && !Array.isArray(out[key])
    ) out[key] = mergeDeep(out[key], value);
    else out[key] = structuredClone(value);
  }
  return out;
}

async function readSources(pack) {
  const dir = path.join(MODULE_ROOT, pack.sourceDirectory);
  const names = (await fs.readdir(dir)).filter((n) => n.endsWith(".json")).sort();
  if (names.length !== pack.count) {
    throw new Error(`${pack.name}: expected ${pack.count} source files, got ${names.length}`);
  }
  return Promise.all(names.map(async (name) =>
    JSON.parse(await fs.readFile(path.join(dir, name), "utf8"))
  ));
}

function compile(source, pack, language) {
  const localized = source.localizations?.[language] ?? {};
  const doc = mergeDeep(source.document ?? {}, localized);
  doc._id = deterministicId(pack.name, source.key);
  delete doc.folder;

  doc.flags ??= {};
  doc.flags["merp-ui"] ??= {};
  Object.assign(doc.flags["merp-ui"], {
    compendiumSourceKey: source.key,
    compendiumPack: pack.name,
    compendiumSourceFile: source.sourceFile ?? null,
    compendiumFolderKey: source.folderKey ?? null,
    compendiumBuildLanguage: language,
    compendiumLocalizations: structuredClone(source.localizations ?? {}),
    compendiumAgeVariants: structuredClone(source.ageVariants ?? null),
    compendiumFolderPath: structuredClone(source.compendiumFolderPath ?? { fr: [], en: [] }),
    compendiumFolderKeyPath: structuredClone(source.compendiumFolderKeyPath ?? []),
    compendiumResolverBacked: Boolean(source.resolverBacked)
  });
  return doc;
}

const args = new Set(process.argv.slice(2));
const languageArg = [...args].find((a) => a.startsWith("--language="));
const language = languageArg?.split("=")[1] ?? "fr";
const check = args.has("--check");
if (!["fr", "en"].includes(language)) throw new Error(`Unsupported language ${language}`);

let total = 0;
for (const pack of MANIFEST.packs) {
  const sources = await readSources(pack);
  const docs = sources.map((source) => compile(source, pack, language));
  const ids = new Set();
  for (const doc of docs) {
    if (!doc._id || doc._id.length !== 16) throw new Error(`${pack.name}: invalid _id`);
    if (ids.has(doc._id)) throw new Error(`${pack.name}: duplicate _id ${doc._id}`);
    ids.add(doc._id);
    if (!doc.name) throw new Error(`${pack.name}: document without name ${doc._id}`);
    if (pack.type === "Item" && !doc.type) {
      throw new Error(`${pack.name}: incomplete Item ${doc._id}`);
    }
  }
  const body = docs.map((doc) => JSON.stringify(doc)).join("\n") + "\n";
  const output = path.join(MODULE_ROOT, pack.seedPath);

  if (check) {
    const current = await fs.readFile(output, "utf8");
    if (current !== body) throw new Error(`${pack.seedPath} is out of date`);
  } else {
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, body, "utf8");
  }
  total += docs.length;
  console.log(`${pack.name}: ${docs.length} → ${pack.seedPath}`);
}

console.log(
  `MERP-UI bootstrap Compendiums ${check ? "validated" : "built"}: ` +
  `${MANIFEST.packs.length} packs, ${total} Documents, language=${language}`
);
