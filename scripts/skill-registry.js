const MODULE_ID = "merp-ui";
const DEFAULT_LOCALE = "fr";
const skillCache = new Map();
const categoryCache = new Map();

export function normalizeSkillKey(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/^RMU\.(?:skills|categories|skillcategory)\./i, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

async function fetchCatalog(relativePath, { refresh = false } = {}) {
  const route = foundry?.utils?.getRoute ? foundry.utils.getRoute(relativePath) : relativePath;
  const response = await fetch(route, { cache: refresh ? "no-store" : "default" });
  if (!response.ok) throw new Error(`MERP-UI : catalogue introuvable (${response.status}) : ${route}`);
  return { raw: await response.json(), path: route };
}

export async function loadSharedSkillRegistry({ locale = DEFAULT_LOCALE, refresh = false } = {}) {
  if (!refresh && skillCache.has(locale)) return skillCache.get(locale);
  const relativePath = `modules/${MODULE_ID}/translations/skills/skills.${locale}.json`;
  const { raw, path } = await fetchCatalog(relativePath, { refresh });
  const bySkillId = new Map();
  const byName = new Map();

  for (const [canonicalName, value] of Object.entries(raw)) {
    if (canonicalName.startsWith("_") || !value || typeof value !== "object") continue;
    const entry = Object.freeze({
      skillId: String(value.skillId || `rmu.skill.${normalizeSkillKey(canonicalName).replace(/[^a-z0-9]+/g, "-")}`),
      officialUuid: value.officialUuid || null,
      canonicalName,
      name: typeof value.name === "string" ? value.name.trim() : "",
      description: value.description === null ? null : String(value.description ?? "").trim(),
      aliases: Array.isArray(value.aliases) ? value.aliases.filter(Boolean) : []
    });
    bySkillId.set(entry.skillId, entry);
    for (const alias of new Set([canonicalName, entry.name, ...entry.aliases])) {
      if (alias) byName.set(normalizeSkillKey(alias), entry);
    }
  }

  const catalog = Object.freeze({ locale, path, metadata: raw._meta ?? {}, raw, bySkillId, byName });
  skillCache.set(locale, catalog);
  return catalog;
}

export async function loadSharedSkillCategoryRegistry({ locale = DEFAULT_LOCALE, refresh = false } = {}) {
  if (!refresh && categoryCache.has(locale)) return categoryCache.get(locale);
  const relativePath = `modules/${MODULE_ID}/translations/skill-categories/categories.${locale}.json`;
  const { raw, path } = await fetchCatalog(relativePath, { refresh });
  const byCategoryId = new Map();
  const byName = new Map();

  for (const [canonicalName, value] of Object.entries(raw)) {
    if (canonicalName.startsWith("_") || !value || typeof value !== "object") continue;
    const entry = Object.freeze({
      categoryId: String(value.categoryId || `rmu.category.${normalizeSkillKey(canonicalName).replace(/[^a-z0-9]+/g, "-")}`),
      canonicalName,
      name: typeof value.name === "string" ? value.name.trim() : "",
      description: value.description === null ? null : String(value.description ?? "").trim(),
      aliases: Array.isArray(value.aliases) ? value.aliases.filter(Boolean) : []
    });
    byCategoryId.set(entry.categoryId, entry);
    for (const alias of new Set([canonicalName, entry.name, ...entry.aliases])) {
      if (alias) byName.set(normalizeSkillKey(alias), entry);
    }
  }

  const catalog = Object.freeze({ locale, path, metadata: raw._meta ?? {}, raw, byCategoryId, byName });
  categoryCache.set(locale, catalog);
  return catalog;
}

export function clearSharedSkillRegistryCache(locale = null) {
  if (locale) {
    skillCache.delete(locale);
    categoryCache.delete(locale);
  } else {
    skillCache.clear();
    categoryCache.clear();
  }
}

export async function resolveSharedSkill(query, { locale = DEFAULT_LOCALE } = {}) {
  const catalog = await loadSharedSkillRegistry({ locale });
  if (!query) return null;
  if (typeof query === "object") {
    if (query.skillId && catalog.bySkillId.has(query.skillId)) return catalog.bySkillId.get(query.skillId);
    for (const candidate of [query.officialUuid, query.canonicalName, query.name]) {
      if (!candidate) continue;
      const found = catalog.byName.get(normalizeSkillKey(candidate));
      if (found) return found;
    }
    return null;
  }
  return catalog.bySkillId.get(String(query)) ?? catalog.byName.get(normalizeSkillKey(query)) ?? null;
}

export async function resolveSharedSkillCategory(query, { locale = DEFAULT_LOCALE } = {}) {
  const catalog = await loadSharedSkillCategoryRegistry({ locale });
  if (!query) return null;
  if (typeof query === "object") {
    if (query.categoryId && catalog.byCategoryId.has(query.categoryId)) return catalog.byCategoryId.get(query.categoryId);
    for (const candidate of [query.canonicalName, query.name]) {
      if (!candidate) continue;
      const found = catalog.byName.get(normalizeSkillKey(candidate));
      if (found) return found;
    }
    return null;
  }
  return catalog.byCategoryId.get(String(query)) ?? catalog.byName.get(normalizeSkillKey(query)) ?? null;
}

Hooks.once("ready", async () => {
  try {
    const [skills, categories] = await Promise.all([
      loadSharedSkillRegistry(),
      loadSharedSkillCategoryRegistry()
    ]);
    globalThis.MERPUI ??= {};
    Object.assign(globalThis.MERPUI, {
      skills: Object.freeze({
        load: loadSharedSkillRegistry,
        resolve: resolveSharedSkill,
        clearCache: clearSharedSkillRegistryCache,
        normalize: normalizeSkillKey,
        get size() { return skills.bySkillId.size; }
      }),
      skillCategories: Object.freeze({
        load: loadSharedSkillCategoryRegistry,
        resolve: resolveSharedSkillCategory,
        clearCache: clearSharedSkillRegistryCache,
        normalize: normalizeSkillKey,
        get size() { return categories.byCategoryId.size; }
      })
    });
    console.log(`${MODULE_ID} | Référentiel partagé chargé (${skills.bySkillId.size} compétences, ${categories.byCategoryId.size} catégories).`);
  } catch (error) {
    console.error(`${MODULE_ID} | Échec du chargement du référentiel partagé`, error);
  }
});
