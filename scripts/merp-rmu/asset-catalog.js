/**
 * MERP-UI asset catalog (icons, borders, dividers and decoration assets).
 * Data service only: no Foundry hooks, DOM updates or changes to catalog.json.
 *
 * Keep the loaded catalog in one place. All lookups deliberately retain their
 * original case-insensitive, substring-first matching order and return values.
 * `resolveRoute` is supplied by Foundry at initialization; `fetchCatalog` can
 * be injected for deterministic tests and defaults to the browser fetch.
 */
export function createMerpAssetCatalog({
  path,
  resolveRoute = (value) => value,
  fetchCatalog = (...args) => fetch(...args)
} = {}) {
  let catalog = null;

  async function load({ refresh = false } = {}) {
    if (catalog && !refresh) return catalog;
    const route = resolveRoute(path);
    const response = await fetchCatalog(route, { cache: refresh ? "no-store" : "default" });
    if (!response.ok) throw new Error(`Catalogue MERP UI introuvable : HTTP ${response.status}`);
    catalog = await response.json();
    return catalog;
  }

  // Shared matcher: both single-result and multi-result searches use precisely
  // the same original substring rules. Preserve source order and first match.
  function matchesAssetQuery(asset, term) {
    return [asset.name, asset.key, asset.category, ...(asset.tags ?? [])]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  }

  function findAsset(type, query) {
    const assets = catalog?.assets?.[type] ?? [];
    const term = String(query ?? "").trim().toLowerCase();
    return assets.find((asset) => matchesAssetQuery(asset, term)) ?? null;
  }

  function getAssetPath(type, query) {
    return findAsset(type, query)?.path ?? null;
  }

  function getIconPath(categoryOrQuery, optionalName = null) {
    if (optionalName === null) {
      return getAssetPath("icons", categoryOrQuery);
    }

    const category = String(categoryOrQuery ?? "").trim().toLowerCase();
    const name = String(optionalName ?? "").trim().toLowerCase();

    const asset = (catalog?.assets?.icons ?? []).find((entry) => {
      return (
        String(entry.category ?? "").toLowerCase() === category &&
        (
          String(entry.name ?? "").toLowerCase() === name ||
          String(entry.key ?? "").toLowerCase() === name
        )
      );
    });

    return asset?.path ?? null;
  }

  function searchAssets(query, type = null) {
    const term = String(query ?? "").trim().toLowerCase();
    const groups = type ? [type] : Object.keys(catalog?.assets ?? {});
    return groups.flatMap((group) =>
      (catalog?.assets?.[group] ?? [])
        .filter((asset) => matchesAssetQuery(asset, term))
        .map((asset) => ({ ...asset, type: group }))
    );
  }

  function category(type, categoryName) {
    return (catalog?.assets?.[type] ?? []).filter((asset) => asset.category === categoryName);
  }

  return Object.freeze({
    load,
    current: () => catalog,
    getAssetPath,
    getIconPath,
    findAsset,
    searchAssets,
    category
  });
}
