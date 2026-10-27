/**
 * Identify and theme only MERP-UI's own Compendium pack browsers.
 * Supports Foundry V13 and V14's differing Compendium application props.
 * Does not alter document content, pack state or folder interactions.
 */
const PACK_PREFIX = "merp-ui.merp-rmu-";
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
  if (raw.startsWith(PACK_PREFIX)) return true;
  // Foundry's application IDs can be prefixed with "compendium-".
  return /(?:^|[._-])merp-ui\.merp-rmu-[a-z0-9-]+(?:$|[._-])/i.test(raw);
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
  const appTitle = text(app.title) || text(app.options?.window?.title);
  if (!appTitle) return null;
  const windows = roots.some(root =>
    root?.matches?.(".application, .window-app") || root?.querySelector?.(".window-header")
  );
  if (!windows) return null;
  for (const pack of packList(packs)) {
    const id = packId(pack);
    if (!isMerpPackId(id)) continue;
    if ([pack.title, pack.metadata?.label, pack.name].some(value => text(value) === appTitle)) {
      return id;
    }
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
