/**
 * MERP-UI: safe source-driven refresh of *existing* Compendium documents.
 * Works after Foundry migrates shipped NeDB seeds to persistent LevelDB:
 * those libraries will not otherwise change when a developer edits source JSON.
 *
 * - GM + RMU only; digest checked once per release (world setting).
 * - Documents matched ONLY by MERP-UI source key, never by translated name.
 * - No document/page deletion or recreation; original IDs and links survive.
 * - Journal source pages are updated in place, extra pages are preserved.
 * - World Items, character Items and GM-created Journals are never auto-edited.
 * - Import copies of Journals can be updated EXPLICITLY using worldJournals.
 * - Errors prevent the world fingerprint being committed (retry next login).
 */
import { contentLanguage, localizeManagedDocument } from './localization.js';
import { localizeJournalDocument } from './content-localization.js';
import { organizeUpdatedCompendium, queueCompendiumMaintenance } from './compendium-content.js';
import { equivalentJournalHtml } from './html-equivalence.js';

const MODULE_ID = 'merp-ui';
const FINGERPRINT_SETTING = 'merpRmuContentSourceFingerprint';
const MANIFEST_PATH = `modules/${MODULE_ID}/source/compendiums/content-sync-manifest.json`;
const OPTIONS = { render: false, merpUiCompendiumPackMaintenance: true, merpUiSourceSynchronization: true };
// Serialize updates instead of sharing an in-flight Promise across languages.
// In particular a FR request must never silently inherit a running EN sync.
let synchronizationQueue = Promise.resolve();
const SYNC_STATE_SCHEMA = 'v2';

export function registerMerpRmuContentSyncSettings() {
  if (!game.settings.settings.has(`${MODULE_ID}.${FINGERPRINT_SETTING}`)) {
    game.settings.register(MODULE_ID, FINGERPRINT_SETTING, {
      name: 'MERP-RMU — empreinte des contenus synchronisés',
      scope: 'world', config: false, type: String, default: ''
    });
  }
}

// CLEAN-42: session-only cache of immutable Compendium source JSON.
// Never cache Foundry Documents, localized results or mutable World data.
// Keeping the in-flight Promise also coalesces duplicate requests. Reloading
// Foundry naturally discards the cache; a changed manifest fingerprint clears
// it during the same session (for unusual hot-update workflows).
const sourceJsonCache = new Map();
const SOURCE_MANIFEST = 'source/compendiums/content-sync-manifest.json';
let lastSourceManifestFingerprint = null;
let sourceJsonCacheHits = 0;
let sourceJsonCacheMisses = 0;

async function fetchSourceJson(relativePath) {
  const url = `modules/${MODULE_ID}/${relativePath}`;
  const route = foundry?.utils?.getRoute ? foundry.utils.getRoute(url) : url;
  const response = await fetch(route, { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) throw Error(`${relativePath}: HTTP ${response.status}`);
  return response.json();
}

async function loadJson(relativePath) {
  if (!relativePath.startsWith('source/compendiums/')) {
    throw Error(`Invalid MERP-RMU source path: ${relativePath}`);
  }
  // Always read the small manifest afresh: its release fingerprint is our
  // invalidation key, and unlike the 455 sources it is fetched only once per sync.
  if (relativePath === SOURCE_MANIFEST) {
    const manifest = await fetchSourceJson(relativePath);
    const fingerprint = manifest?.fingerprint ?? null;
    if (lastSourceManifestFingerprint !== null &&
        fingerprint !== lastSourceManifestFingerprint) {
      sourceJsonCache.clear();
    }
    lastSourceManifestFingerprint = fingerprint;
    return manifest;
  }
  const cached = sourceJsonCache.get(relativePath);
  if (cached) {
    sourceJsonCacheHits++;
    return cached;
  }
  sourceJsonCacheMisses++;
  const pending = fetchSourceJson(relativePath).catch((error) => {
    // Failed requests must be retried normally at the next attempt.
    if (sourceJsonCache.get(relativePath) === pending) {
      sourceJsonCache.delete(relativePath);
    }
    throw error;
  });
  sourceJsonCache.set(relativePath, pending);
  return pending;
}

function equal(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }

/** Create narrow patches, preserving data outside the MERP-RMU source schema. */
function addChangedLeaves(patch, prefix, current, wanted) {
  // RMU Item descriptions are HTML, just like Journal page contents.
  // Foundry normalizes harmless serialization details (<br /> -> <br>,
  // & -> &amp;). Compare rendered HTML, otherwise Magician is rewritten
  // on every EN synchronization even when the description is unchanged.
  // Keep strict comparisons for all other Item fields, especially rules data.
  if (prefix === 'system.description' && equivalentJournalHtml(current, wanted)) return;
  if (isObject(wanted)) {
    for (const [key, value] of Object.entries(wanted)) {
      addChangedLeaves(patch, `${prefix}.${key}`, current?.[key], value);
    }
  } else if (!equal(current, wanted)) {
    patch[prefix] = wanted;
  }
}

function plannedItemUpdate(document, source, language) {
  const localized = localizeManagedDocument(source.document, source.localizations, language);
  const current = document.toObject();
  const patch = {};
  if (current.name !== localized.name) patch.name = localized.name;
  if (localized.img != null && current.img !== localized.img) patch.img = localized.img;
  if (localized.system) addChangedLeaves(patch, 'system', current.system ?? {}, localized.system);
  // The source may modify effects, but never remove user-added effects automatically.
  const original = localized.effects ?? [];
  if (original.length && !equal(original, current.effects?.slice?.(0, original.length))) {
    // Review these manually rather than replacing embedded Effect IDs.
    console.warn(`${MODULE_ID} | Effects require manual review: ${document.name}`);
  }
  return patch;
}

function plannedJournalUpdate(journal, source, language) {
  const localized = localizeJournalDocument(source.document, source.localizations, language);
  const currentPages = journal.pages?.contents ?? [];
  const sourcePages = localized.pages ?? [];
  const patch = {};
  const pages = [];
  if (journal.name !== localized.name) patch.name = localized.name;
  if (currentPages.length < sourcePages.length) {
    // Never invent new page IDs or shuffle existing pages. The GM can inspect it.
    throw Error(`${journal.name}: ${currentPages.length} pages in pack; ${sourcePages.length} required`);
  }
  // The original source order is stable. An imported extra page is kept as-is.
  for (let i = 0; i < sourcePages.length; i++) {
    const current = currentPages[i];
    const target = sourcePages[i];
    // A dedicated settings-guide localizer owns this seventh page. Never
    // overwrite or flip its locale as a side effect of source synchronization.
    if (current.flags?.[MODULE_ID]?.settingsGuidePage ||
        target.flags?.[MODULE_ID]?.settingsGuidePage) continue;
    const update = { _id: current.id };
    if (current.name !== target.name) update.name = target.name;
    if (target.text?.content !== undefined && !equivalentJournalHtml(current.text?.content, target.text.content)) {
      update['text.content'] = target.text.content;
    }
    if (target.title?.show === false && current.title?.show !== false) {
      update['title.show'] = false;
    }
    if (Object.keys(update).length > 1) pages.push(update);
  }
  return { patch, pages };
}

// Shared source metadata for both new compendium entries and existing ones.
// The caller chooses the build language: an existing seed keeps its original
// language, while a newly created entry records the current build language.
function sourceMetadataValues(source, packName, buildLanguage) {
  return {
    compendiumSourceKey: source.key,
    compendiumPack: packName,
    compendiumSourceFile: source.sourceFile ?? null,
    compendiumFolderKey: source.folderKey ?? null,
    compendiumBuildLanguage: buildLanguage,
    compendiumLocalizations: source.localizations ?? {},
    compendiumAgeVariants: source.ageVariants ?? null,
    compendiumFolderPath: source.compendiumFolderPath ?? { fr: [], en: [] },
    compendiumFolderKeyPath: source.compendiumFolderKeyPath ?? [],
    compendiumResolverBacked: Boolean(source.resolverBacked)
  };
}

function metadataPatch(doc, source, sourceRecord, packName, language) {
  const flags = doc.flags?.[MODULE_ID] ?? {};
  // Existing localization has its own lifecycle; preserve the built seed locale.
  const values = sourceMetadataValues(source, packName, flags.compendiumBuildLanguage ?? language);
  const patch = {};
  for (const [key, value] of Object.entries(values)) {
    if (!equal(flags[key], value)) patch[`flags.${MODULE_ID}.${key}`] = value;
  }

  // Foundry merges nested flag objects instead of removing absent keys.
  // Early RC5 culture seeds stored cultureRanks inside localization metadata.
  // That field is not present in the canonical localizations: remove it
  // explicitly, otherwise checkContent() reports the two Eriadorians forever.
  for (const locale of ['fr', 'en']) {
    const currentSystem = flags.compendiumLocalizations?.[locale]?.system;
    const sourceSystem = source.localizations?.[locale]?.system;
    if (Object.prototype.hasOwnProperty.call(currentSystem ?? {}, 'cultureRanks') &&
        !Object.prototype.hasOwnProperty.call(sourceSystem ?? {}, 'cultureRanks')) {
      patch[`flags.${MODULE_ID}.compendiumLocalizations.${locale}.system.-=cultureRanks`] = null;
    }
  }
  return patch;
}

/** Exported, pure planning functions for CI tests and future migrations. */
export function planSourceDocumentUpdate(doc, source, sourceRecord, packName, language) {
  if (!doc || !source?.document || source.key !== sourceRecord.key) throw Error('Invalid MERP-RMU source mapping');
  const journal = Array.isArray(source.document.pages);
  const plan = journal ? plannedJournalUpdate(doc, source, language)
    : { patch: plannedItemUpdate(doc, source, language), pages: [] };
  const metadata = metadataPatch(doc, source, sourceRecord, packName, language);
  const patch = { ...plan.patch, ...metadata };
  if (Object.keys(patch).length || plan.pages.length) {
    patch[`flags.${MODULE_ID}.compendiumSourceHash`] = sourceRecord.hash;
  }
  return { patch, pages: plan.pages };
}

/** An additional source shipped by a new release may be absent from an older
 * migrated LevelDB pack. Create it with the same stable ID as a fresh install. */
function createDataForSource(source, record, packName, language, type) {
  const data = type === 'JournalEntry'
    ? localizeJournalDocument(source.document, source.localizations, language)
    : localizeManagedDocument(source.document, source.localizations, language);
  data._id = record.id;
  delete data.folder; // New documents start at root; existing folder maintenance can move them.
  data.flags ??= {};
  data.flags[MODULE_ID] ??= {};
  Object.assign(data.flags[MODULE_ID], {
    ...sourceMetadataValues(source, packName, language),
    compendiumSourceHash: record.hash
  });
  if (type === 'JournalEntry') {
    for (const page of data.pages ?? []) {
      page.title ??= {};
      page.title.show = false;
    }
  }
  return data;
}

function hasChanges(plan) { return Boolean(Object.keys(plan.patch).length || plan.pages.length); }

/**
 * Apply a plan with an explicit database context. In particular, a
 * Compendium JournalEntry is a top-level pack document, whereas its
 * JournalEntryPages are embedded in that document. Calling update() on a
 * cached JournalEntry with an inherited/stale parent context can make
 * Foundry try to update a JournalEntry *inside* a JournalEntry.
 */
async function applyPlan(document, plan, { dryRun = false, pack = null } = {}) {
  if (dryRun || !hasChanges(plan)) return;

  if (Object.keys(plan.patch).length) {
    try {
      if (pack) {
        const cls = pack.documentName === 'JournalEntry' ? JournalEntry : Item;
        await cls.updateDocuments(
          [{ _id: document.id, ...plan.patch }],
          { ...OPTIONS, pack: pack.collection }
        );
      } else {
        await document.update(plan.patch, OPTIONS);
      }
    } catch (error) {
      throw Error(`metadata/top-level update: ${error.message}`, { cause: error });
    }
  }

  if (plan.pages.length) {
    try {
      const parent = pack ? await pack.getDocument(document.id) : document;
      if (!parent) throw Error(`JournalEntry ${document.id} unavailable after update`);
      // An embedded page must be updated with the Journal as its parent.
      await JournalEntryPage.updateDocuments(
        plan.pages, { ...OPTIONS, parent }
      );
    } catch (error) {
      throw Error(`JournalEntryPage update: ${error.message}`, { cause: error });
    }
  }
}

async function synchronizePack(packDefinition, { language, dryRun, worldJournals }) {
  const result = { pack: packDefinition.name, scanned: 0, changed: 0, created: 0, pageUpdates: 0, worldJournals: 0, skipped: 0, errors: [] };
  const pack = game.packs.get(`${MODULE_ID}.${packDefinition.name}`);
  if (!pack) { result.errors.push('Compendium missing'); return result; }
  const index = await pack.getIndex({ fields: ['flags.merp-ui.compendiumSourceKey', 'flags.merp-ui.key'] });
  const byKey = new Map();
  const ids = new Set([...index].map((entry) => entry._id));
  for (const row of index) {
    const flags = row.flags?.[MODULE_ID] ?? {};
    const key = flags.compendiumSourceKey ?? flags.key;
    if (key) byKey.set(key, row._id);
  }
  const proposed = [];
  for (const row of packDefinition.sources) {
    try {
      const id = byKey.get(row.key);
      if (!id && ids.has(row.id)) {
        result.errors.push(`${row.key}: document ID exists but provenance key is different`);
        continue;
      }
      const source = await loadJson(row.file);
      if (!id) {
        proposed.push({ create: createDataForSource(source, row, packDefinition.name, language, packDefinition.type) });
        continue;
      }
      const document = await pack.getDocument(id);
      if (!document) { result.errors.push(`${row.key}: unable to read document`); continue; }
      const plan = planSourceDocumentUpdate(document, source, row, packDefinition.name, language);
      result.scanned++;
      if (hasChanges(plan)) proposed.push({ document, plan });
      if (worldJournals && packDefinition.type === 'JournalEntry') {
        for (const journal of game.journal?.contents ?? []) {
          const flags = journal.flags?.[MODULE_ID] ?? {};
          if (flags.compendiumPack !== packDefinition.name || flags.compendiumSourceKey !== row.key) continue;
          const worldPlan = planSourceDocumentUpdate(journal, source, row, packDefinition.name, language);
          if (hasChanges(worldPlan)) {
            // An explicitly requested world refresh can replace editorial text,
            // but never adds/deletes documents or touches character Items.
            proposed.push({ document: journal, plan: worldPlan, world: true });
          }
        }
      }
    } catch (error) {
      result.errors.push(`${row.key}: ${error.message}`);
    }
  }
  if (!proposed.length) return result;
  const wasLocked = Boolean(pack.locked ?? pack.metadata?.locked);
  try {
    if (!dryRun && wasLocked) {
      if (typeof pack.configure !== 'function') throw Error('Compendium cannot be unlocked');
      await pack.configure({ locked: false });
    }
    for (const { document, plan, world, create } of proposed) {
      try {
        if (create) {
          if (!dryRun) {
            const cls = packDefinition.type === 'JournalEntry' ? JournalEntry : Item;
            await cls.create(create, {
              pack: pack.collection ?? `${MODULE_ID}.${packDefinition.name}`,
              keepId: true, keepEmbeddedIds: true,
              render: false, renderSheet: false,
              merpUiSourceSynchronization: true
            });
          }
          result.created++;
          continue;
        }
        await applyPlan(document, plan, { dryRun, pack: world ? null : pack });
        if (world) result.worldJournals++;
        else result.changed++;
        result.pageUpdates += plan.pages.length;
      } catch (error) {
        console.error(`${MODULE_ID} | Source synchronization failed`, {
          pack: packDefinition.name, document: create?.name ?? document?.name,
          id: document?.id ?? create?._id, error
        });
        result.errors.push(`${create?.name ?? document?.name}: ${error.message}`);
      }
    }
  } finally {
    if (!dryRun && wasLocked) await pack.configure({ locked: true });
  }
  // New source records enter the Compendium at its root, then receive the
  // same localized folder placement as existing records.
  // Race folder assignments can change without adding any documents (for
  // example moving the five common races into "Races Communes"). Reorganize
  // the Race pack after such source metadata updates too, in the same boot.
  if ((result.created || (packDefinition.name === 'merp-rmu-races' && result.changed)) && !dryRun) {
    try {
      await organizeUpdatedCompendium(packDefinition.name, language);
    } catch (error) {
      result.errors.push(`Folder organization: ${error.message}`);
    }
  }
  return result;
}

/**
 * CLEAN-26: retire the single MERP-UI copy of Starlights now provided by
 * native RMU Spell Law. The published LevelDB pack and worlds migrated before
 * CLEAN-26 can retain this one document even after its JSON source is removed.
 * Delete only the document with our stable ID AND original MERP-UI source key;
 * never delete a World Item, character list, or an unrelated GM-created item.
 */
async function retireObsoleteAstrologerStarlights({ dryRun = false } = {}) {
  const pack = game.packs.get(`${MODULE_ID}.merp-rmu-spell-lists`);
  if (!pack) throw Error('MERP-RMU spell-list compendium missing');
  const id = '3ektZqykfci9Eh17';
  const doc = await pack.getDocument(id);
  if (!doc) return { retired: 0 };
  const flags = doc.flags?.[MODULE_ID] ?? {};
  if ((flags.compendiumSourceKey ?? flags.key) !== 'astrologer-starlights') {
    throw Error('CLEAN-26: Starlights ID has unexpected provenance; no deletion performed');
  }
  if (dryRun) return { retired: 0, pendingRetirement: 1 };
  const locked = Boolean(pack.locked ?? pack.metadata?.locked);
  try {
    if (locked) {
      if (typeof pack.configure !== 'function') throw Error('Spell-list compendium cannot be unlocked');
      await pack.configure({ locked: false });
    }
    await Item.deleteDocuments([id], {
      ...OPTIONS, pack: pack.collection,
      merpUiObsoleteSourceRetirement: true
    });
  } finally {
    if (locked) await pack.configure({ locked: true });
  }
  console.info(`${MODULE_ID} | Retired MERP-UI duplicate Starlights; native RMU list preserved.`);
  return { retired: 1 };
}

/** RC5: verify ALL cultural source records at every GM startup.
 * The distributed LevelDB compendium may contain stale records even when the
 * world fingerprint and per-document source hashes match. Compare actual
 * source content rather than relying on fingerprints alone. Only the culture
 * pack is checked; other packs are untouched on an unchanged release.
 */
async function repairCultureCompendium(manifest, language, { dryRun = false } = {}) {
  const definition = manifest.packs.find(p => p.name === 'merp-rmu-cultures');
  if (!definition) return { pack: 'merp-rmu-cultures', errors: ['Culture source pack missing'] };
  const result = await synchronizePack(definition, { language, dryRun, worldJournals: false });
  if (!dryRun && !result.errors.length && (result.changed || result.created)) {
    // Verify with a fresh read/plan, detecting writes that did not persist.
    const verify = await synchronizePack(definition, { language, dryRun: true, worldJournals: false });
    if (verify.changed || verify.created || verify.errors.length) {
      result.errors.push(`Post-write audit: ${verify.changed} discrepancies, ${verify.created} missing, ${verify.errors.length} errors`);
    }
  }
  return result;
}

async function performSync({ force = false, dryRun = false, worldJournals = false, notify = false, packs = null, language = null } = {}) {
  if (!game.user?.isGM || game.system?.id !== 'rmu') return { skipped: true, reason: 'not-gm-or-rmu' };
  const manifest = await loadJson('source/compendiums/content-sync-manifest.json');
  // Run before the fingerprint fast path: older migrated packs can retain this source.
  const obsoleteSpellList = await retireObsoleteAstrologerStarlights({ dryRun });
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.packs)) throw Error('Invalid MERP-RMU sync manifest');
  // Compendiums contain one active editorial language at a time.  A source
  // fingerprint alone would incorrectly skip FR/EN switches, leaving 454+
  // documents in the previous language.  Track the *installed* locale too.
  const effectiveLanguage = language === 'en' ? 'en' : language === 'fr' ? 'fr' : contentLanguage();
  // A schema prefix invalidates previous versions' potentially stale stamps
  // once, without making every later startup rescan all 455 documents.
  const installedRevision = `${SYNC_STATE_SCHEMA}:${manifest.fingerprint}:${effectiveLanguage}`;
  const previous = game.settings.get(MODULE_ID, FINGERPRINT_SETTING);
  if (!force && !dryRun && !worldJournals && !packs && previous === installedRevision) {
    const guard = await repairCultureCompendium(manifest, effectiveLanguage);
    if (guard.errors?.length) console.warn(`${MODULE_ID} | Culture startup guard`, guard);
    return { skipped: true, reason: 'already-current', fingerprint: manifest.fingerprint,
      language: effectiveLanguage, cultureGuard: guard, obsoleteSpellList };
  }
  const selected = packs ? new Set(packs) : null;
  const results = [];
  for (const pack of manifest.packs) {
    if (selected && !selected.has(pack.name)) continue;
    try {
      results.push(await synchronizePack(pack, { language: effectiveLanguage, dryRun, worldJournals }));
    } catch (error) {
      results.push({ pack: pack.name, errors: [error.message] });
    }
  }
  // Verify the entire culture pack after a full startup synchronization.
  // Skip this extra pass for explicit pack operations, previews, or imported journals.
  if (!dryRun && !worldJournals && !selected) {
    try {
      results.push(await repairCultureCompendium(manifest, effectiveLanguage));
    } catch (error) {
      results.push({ pack: 'merp-rmu-cultures:culture-guard', errors: [error.message] });
    }
  }
  const totalErrors = results.reduce((n, r) => n + (r.errors?.length ?? 0), 0);
  const changed = results.reduce((n, r) => n + (r.changed ?? 0), 0);
  const created = results.reduce((n, r) => n + (r.created ?? 0), 0);
  const outcome = { fingerprint: manifest.fingerprint, language: effectiveLanguage, dryRun, changed, created, errors: totalErrors, obsoleteSpellList, packs: results };
  if (!dryRun && !worldJournals && !selected && !totalErrors) {
    await game.settings.set(MODULE_ID, FINGERPRINT_SETTING, installedRevision);
  }
  if (notify && ui?.notifications) {
    const msg = `MERP-UI : ${changed} actualisée(s), ${created} ajoutée(s), ${totalErrors} erreur(s).`;
    // Foundry notifications methods rely on their instance (`this`). Do not
    // extract them with a conditional expression: doing so loses the binding.
    // UI feedback must never invalidate a completed content synchronization.
    try {
      if (totalErrors) ui.notifications.warn(msg);
      else ui.notifications.info(msg);
    } catch (error) {
      console.warn(`${MODULE_ID} | Content sync notification failed`, error);
    }
  }
  if (totalErrors) console.warn(`${MODULE_ID} | Sync result with errors`, outcome);
  else console.log(`${MODULE_ID} | Content sync`, outcome);
  return outcome;
}

export function synchronizeMerpRmuSources(options = {}) {
  // Capture the language now, before requests are queued. Manual diagnostics
  // follow the persisted World setting, not another task's temporary override.
  const configuredLanguage = game.settings.get(MODULE_ID, 'contentLanguage');
  const requestedLanguage = options.language === 'en' ? 'en'
    : options.language === 'fr' ? 'fr'
    : configuredLanguage === 'en' || configuredLanguage === 'fr'
      ? configuredLanguage : contentLanguage();
  const request = { ...options, language: requestedLanguage };
  // Share the same exclusive maintenance queue as the FR/EN library pass.
  // Keep the local queue to preserve source-request ordering and language.
  const operation = synchronizationQueue.then(() =>
    queueCompendiumMaintenance(async () => {
      const started = performance.now();
      const hitsBefore = sourceJsonCacheHits;
      const missesBefore = sourceJsonCacheMisses;
      try {
        return await performSync(request);
      } finally {
        // Diagnostic only: compare the duration and cache misses over successive
        // FR/EN switches in F12. No changes to the synchronization outcome.
        console.info(`${MODULE_ID} | CLEAN-42 source JSON cache`, {
          language: requestedLanguage,
          durationMs: Math.round(performance.now() - started),
          reused: sourceJsonCacheHits - hitsBefore,
          loaded: sourceJsonCacheMisses - missesBefore,
          cachedFiles: sourceJsonCache.size
        });
      }
    })
  );
  // A failed request must not block later retries or locale changes.
  synchronizationQueue = operation.catch(() => undefined);
  return operation;
}
