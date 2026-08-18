const MODULE_ID = "merp-ui";

let contentLanguageOverride = null;

export function contentLanguage() {
  if (contentLanguageOverride === "fr" || contentLanguageOverride === "en") {
    return contentLanguageOverride;
  }

  try {
    return game.settings.get(MODULE_ID, "contentLanguage") || "en";
  } catch (_error) {
    return "fr";
  }
}

export async function withContentLanguage(language, callback) {
  const normalized = language === "en" ? "en" : "fr";
  const previous = contentLanguageOverride;
  contentLanguageOverride = normalized;
  try {
    return await callback(normalized);
  } finally {
    contentLanguageOverride = previous;
  }
}

export function localizeContentValue(value, { fallback = "fr" } = {}) {
  if (value == null || typeof value === "string") return value ?? "";
  if (typeof value !== "object") return String(value);
  const language = contentLanguage();
  return value[language] ?? value[fallback] ?? value.fr ?? value.en ?? "";
}

export function localizeManagedDocument(document, localizations = null, language = contentLanguage()) {
  const base = foundry.utils.deepClone(document ?? {});
  if (!localizations || typeof localizations !== "object") return base;
  const normalized = language === "en" ? "en" : "fr";
  const localized = localizations[normalized] ?? null;
  if (!localized || typeof localized !== "object") return base;
  return foundry.utils.mergeObject(base, foundry.utils.deepClone(localized), {
    inplace: false, overwrite: true, recursive: true
  });
}

export function managedLocalization(localizations, language = contentLanguage()) {
  if (!localizations || typeof localizations !== "object") return null;
  const localized = localizations[language] ?? null;
  return localized && typeof localized === "object"
    ? foundry.utils.deepClone(localized)
    : null;
}

export function localizedDocumentPatch(localizations, language = contentLanguage()) {
  return managedLocalization(localizations, language) ?? {};
}

function comparableValue(value) {
  if (value == null) return value;
  if (typeof value?.toObject === "function") return value.toObject();
  return value;
}

export function localizedPatchNeedsUpdate(document, patch) {
  if (!document || !patch || typeof patch !== "object") return false;
  const flat = foundry.utils.flattenObject(patch);

  for (const [path, expected] of Object.entries(flat)) {
    const actual = comparableValue(foundry.utils.getProperty(document, path));
    if (foundry.utils.deepEqual) {
      if (!foundry.utils.deepEqual(actual, expected)) return true;
    } else if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      return true;
    }
  }

  return false;
}

export function localizeEmbeddedEntries(entries, language = contentLanguage()) {
  if (!Array.isArray(entries)) return [];

  return entries.map((entry) => {
    const base = foundry.utils.deepClone(entry ?? {});
    const localizations = base.localizations ?? null;
    delete base.localizations;

    const localized = managedLocalization(localizations, language);
    if (!localized) return base;

    return foundry.utils.mergeObject(base, localized, {
      inplace: false,
      overwrite: true,
      recursive: true
    });
  });
}

export function localizeManagedSpellListDocument(
  document,
  localizations = null,
  language = contentLanguage()
) {
  const base = foundry.utils.deepClone(document ?? {});
  const localized = managedLocalization(localizations, language);
  const result = localized
    ? foundry.utils.mergeObject(base, localized, {
        inplace: false,
        overwrite: true,
        recursive: true
      })
    : base;

  if (Array.isArray(base?.system?.spells)) {
    result.system ??= {};
    result.system.spells = localizeEmbeddedEntries(base.system.spells, language);

    const listName =
      result.system?.name ??
      result.name ??
      base.system?.name ??
      base.name ??
      null;

    if (listName) {
      result.system.spells = result.system.spells.map((spell) => ({
        ...spell,
        spellList: listName
      }));
    }
  }

  return result;
}

export function localizedSpellListPatch(
  entry,
  language = contentLanguage()
) {
  const patch = localizedDocumentPatch(entry?.localizations, language);

  const sourceSpells = entry?.document?.system?.spells;
  if (Array.isArray(sourceSpells)) {
    patch.system ??= {};
    patch.system.spells = localizeEmbeddedEntries(sourceSpells, language);

    const listName =
      patch.system?.name ??
      patch.name ??
      entry?.document?.system?.name ??
      entry?.document?.name ??
      null;

    if (listName) {
      patch.system.spells = patch.system.spells.map((spell) => ({
        ...spell,
        spellList: listName
      }));
    }
  }

  return patch;
}

export function flattenLocalizationUpdate(patch) {
  const source = foundry.utils.deepClone(patch ?? {});
  const arrays = [];

  const collectArrays = (value, path = "") => {
    if (Array.isArray(value)) {
      arrays.push([path, value]);
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      const childPath = path ? `${path}.${key}` : key;
      collectArrays(child, childPath);
    }
  };

  collectArrays(source);
  const flat = foundry.utils.flattenObject(source);

  // Foundry DataModel arrays are safest when replaced atomically. Remove any
  // index-level keys produced by flattenObject and restore the full array.
  for (const [path, value] of arrays) {
    if (!path) continue;
    for (const key of Object.keys(flat)) {
      if (key === path || key.startsWith(`${path}.`)) delete flat[key];
    }
    flat[path] = value;
  }

  return flat;
}

