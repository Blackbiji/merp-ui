/**
 * Pure helpers for migrating MERP-UI icon references from PNG to WebP.
 * No Foundry globals or document updates: the caller owns catalog loading,
 * persistence, user notifications and dry-run handling.
 */
function normalizeAssetPath(path) {
  return String(path ?? "")
    .replace(/^\/+/, "")
    .split(/[?#]/, 1)[0]
    .toLowerCase();
}

export function buildWebpIconMigrationMap(catalog) {
  const map = new Map();

  for (const asset of catalog?.assets?.icons ?? []) {
    const webpPath = String(asset.path ?? "");
    if (!webpPath.toLowerCase().endsWith(".webp")) continue;

    const legacyPath = webpPath.replace(/\.webp$/i, ".png");
    map.set(normalizeAssetPath(legacyPath), webpPath);
  }

  return map;
}

function replaceLegacyIconPaths(value, migrationMap, stats) {
  if (typeof value !== "string" || !value.toLowerCase().includes(".png")) {
    return value;
  }

  return value.replace(
    /\/?modules\/merp-ui\/assets\/icons\/[^"'()<>\s]+?\.png(?:\?[^"'()<>\s]*)?(?:#[^"'()<>\s]*)?/gi,
    (matchedPath) => {
      const leadingSlash = matchedPath.startsWith("/");
      const suffixMatch = matchedPath.match(/([?#].*)$/);
      const suffix = suffixMatch?.[1] ?? "";
      const pathWithoutSuffix = matchedPath.replace(/[?#].*$/, "");
      const normalized = normalizeAssetPath(pathWithoutSuffix);
      const replacement = migrationMap.get(normalized);

      if (!replacement) {
        stats.unmatchedPaths.add(pathWithoutSuffix);
        return matchedPath;
      }

      stats.pathsChanged += 1;
      return `${leadingSlash ? "/" : ""}${replacement}${suffix}`;
    }
  );
}

export function migrateValueDeep(value, migrationMap, stats) {
  if (typeof value === "string") {
    const replaced = replaceLegacyIconPaths(value, migrationMap, stats);
    return { value: replaced, changed: replaced !== value };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const result = value.map((entry) => {
      const migrated = migrateValueDeep(entry, migrationMap, stats);
      changed ||= migrated.changed;
      return migrated.value;
    });
    return { value: result, changed };
  }

  if (value && typeof value === "object") {
    let changed = false;
    const result = {};

    for (const [key, entry] of Object.entries(value)) {
      const migrated = migrateValueDeep(entry, migrationMap, stats);
      changed ||= migrated.changed;
      result[key] = migrated.value;
    }

    return { value: result, changed };
  }

  return { value, changed: false };
}

