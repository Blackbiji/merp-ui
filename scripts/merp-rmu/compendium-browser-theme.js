/**
 * Identify and theme only MERP-UI's own Compendium pack browsers.
 * Supports Foundry V13 and V14's differing Compendium application props.
 * Does not alter document content, pack state or folder interactions.
 */
const PACK_PREFIXES = ["merp-ui.merp-rmu-", "merp-ui.merp-ui-"];
const THEME_CLASS = "merp-ui-compendium-browser";

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function packId(value) {
  if (typeof value === "string") return value;
  return text(value?.collection) || text(value?.metadata?.id) ||
    (text(value?.metadata?.packageName) && text(value?.metadata?.name)
      ? value.metadata.packageName + "." + value.metadata.name : "");
}

function isMerpPackId(value) {
  const raw = text(value);
  if (PACK_PREFIXES.some(prefix => raw.startsWith(prefix))) return true;
  // Foundry's application IDs can be prefixed with "compendium-".
  return /(?:^|[._-])merp-ui\.(?:merp-rmu|merp-ui)-[a-z0-9-]+(?:$|[._-])/i.test(raw);
}

function packList(packs) {
  if (!packs) return [];
  if (Array.isArray(packs)) return packs;
  if (Array.isArray(packs.contents)) return packs.contents;
  if (typeof packs.values === "function") return [...packs.values()];
  return [];
}

export function resolveMerpCompendiumBrowser(app, roots = [], packs = null) {
  if (!app) return null;
  const identity = [
    app.collection, app.pack, app.object,
    app.options?.collection, app.options?.pack,
    app.id, app.options?.id,
    ...roots.map(root => root?.id),
    ...roots.map(root => root?.dataset?.pack),
    ...roots.map(root => root?.dataset?.compendium)
  ];

  for (const candidate of identity) {
    const id = packId(candidate);
    if (isMerpPackId(id)) return id;
  }

  // V14 can wrap the CompendiumCollection in a DirectoryCollection.
  // Fall back to matching the actual title against *known registered packs*,
  // never an untrusted title prefix alone.
  // On some Foundry V13/V14 pack browser windows, app.title is absent
  // while the displayed title is present inside the native compendium-name.
  // Only exact matches against registered MERP-ui packs are accepted.
  const titles = [
    app.title, app.options?.window?.title,
    ...roots.flatMap(root => [
      root?.matches?.(".compendium-name") ? root.textContent : "",
      root?.querySelector?.(".header-banner .compendium-name strong")?.textContent,
      root?.querySelector?.(".directory-header .compendium-name strong")?.textContent,
      root?.querySelector?.(".compendium-name strong")?.textContent
    ])
  ].map(text).filter(Boolean);
  if (!titles.length) return null;
  const windows = roots.some(root =>
    root?.matches?.(".application, .window-app, .compendium-name") ||
    root?.querySelector?.(".window-header, .directory-header.compendium-header")
  );
  if (!windows) return null;
  for (const pack of packList(packs)) {
    const id = packId(pack);
    if (!isMerpPackId(id)) continue;
    if ([pack.title, pack.metadata?.label, pack.name].some(value =>
      titles.includes(text(value)))) return id;
  }
  return null;
}

export function decorateMerpCompendiumBrowser(app, roots = [], packs = null) {
  const id = resolveMerpCompendiumBrowser(app, roots, packs);
  if (!id) return false;
  app.classList?.add?.(THEME_CLASS);
  const all = new Set(roots);
  if (app.element?.nodeType === 1) all.add(app.element);
  for (const candidate of all) {
    const parent = candidate?.closest?.(".application, .window-app") ?? candidate;
    if (parent?.classList) {
      parent.classList.add(THEME_CLASS);
      if (parent.dataset) parent.dataset.merpUiCompendiumPack = id;
    }
  }
  return true;
}
