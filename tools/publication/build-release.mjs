#!/usr/bin/env node
/**
 * MERP-UI release packaging for GitHub Actions (Ubuntu).
 * Produces an installable ZIP rooted at module.json, including all NINE
 * prebuilt LevelDB Compendiums. Never copy a running Foundry World's DB.
 * Does not change sources, Worlds or Compendium contents.
 */
import { existsSync, cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = process.cwd();
const module = JSON.parse(readFileSync("module.json", "utf8"));
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const expectedName = `merp-ui-${module.version}.zip`;
const outDir = resolve(root, "dist");
const output = join(outDir, expectedName);
const manifestRootFiles = ["module.json", "README.md", "LICENSE", "NOTICE.md", "CHANGELOG.md"];
const runtimeDirectories = ["assets", "data", "docs", "fonts", "lang", "packs", "scripts", "source", "styles", "templates", "translations"];
const excludedFile = name => /^(?:\.DS_Store|Thumbs\.db|desktop\.ini|\.gitkeep)$/i.test(name) ||
  /\.(?:zip|bak|old|tmp|pyc)$/i.test(name);

function check(ok, message) { if (!ok) throw new Error(message); }
check(module.id === "merp-ui", "Unexpected module ID");
check(module.version === pkg.version, "module/package version mismatch");
check(module.download === `https://github.com/Blackbiji/merp-ui/releases/download/v${module.version}/${expectedName}`,
  "module.download differs from the release ZIP URL");
check(module.packs?.length === 9, "Nine Compendiums are required");
for (const pack of module.packs) {
  const path = resolve(root, pack.path);
  check(path.startsWith(root + "/"), `Unsafe pack path: ${pack.path}`);
  check(existsSync(join(path, "CURRENT")), `${pack.name}: LevelDB CURRENT missing`);
  check(readdirSync(path).some(name => name.endsWith(".ldb")), `${pack.name}: LevelDB data missing`);
}
for (const relative of [...module.esmodules, ...module.styles, ...module.languages.map(x => x.path)]) {
  check(existsSync(join(root, relative)), `Missing runtime asset: ${relative}`);
}
for (const relative of ["scripts/merp-rmu/actor-identity-descriptions.js",
                        "styles/merp-rmu-identity-reference.css",
                        "scripts/merp-rmu/embedded-identity-compaction.js"]) {
  check(existsSync(join(root, relative)), `Missing 2.0.6 fix: ${relative}`);
}

mkdirSync(outDir, { recursive: true });
check(!existsSync(output), `Existing release archive: ${output}; refusing overwrite`);
const stage = mkdtempSync(join(tmpdir(), "merp-ui-release-"));
try {
  for (const relative of manifestRootFiles) {
    check(existsSync(join(root, relative)), `Missing release file: ${relative}`);
    cpSync(join(root, relative), join(stage, relative));
  }
  for (const relative of runtimeDirectories) {
    check(existsSync(join(root, relative)), `Missing release directory: ${relative}`);
    cpSync(join(root, relative), join(stage, relative), {
      recursive: true,
      filter: src => src === join(root, relative) || !excludedFile(src.split(/[\\/]/).at(-1))
    });
  }
  const selected = [...manifestRootFiles, ...runtimeDirectories];
  const command = spawnSync("zip", ["-q", "-r", "-9", output, ...selected], {
    cwd: stage, encoding: "utf8"
  });
  check(command.status === 0, `zip failed: ${command.error?.message || command.stderr}`);
  const inspect = spawnSync("unzip", ["-Z1", output], { encoding: "utf8" });
  check(inspect.status === 0, `cannot inspect ZIP: ${inspect.stderr}`);
  const entries = new Set(inspect.stdout.split(/\r?\n/).filter(Boolean));
  for (const relative of manifestRootFiles) check(entries.has(relative), `ZIP missing ${relative}`);
  for (const pack of module.packs) {
    check(entries.has(`${pack.path}/CURRENT`), `ZIP missing ${pack.name}/CURRENT`);
    check([...entries].some(e => e.startsWith(`${pack.path}/`) && e.endsWith(".ldb")),
      `ZIP missing ${pack.name} .ldb`);
  }
  check(![...entries].some(e => e.startsWith(".git/") || e.startsWith("node_modules/") ||
    e.startsWith(".github/") || e.startsWith("tools/") || e.startsWith("tests/") ||
    e.startsWith("dist/")), "Unexpected development files in ZIP");
  const bytes = readFileSync(output);
  console.log(JSON.stringify({
    file: output, version: module.version, files: entries.size, bytes: statSync(output).size,
    sha256: createHash("sha256").update(bytes).digest("hex")
  }, null, 2));
} finally {
  rmSync(stage, { recursive: true, force: true });
}
