# MERP-RMU Content Synchronization (Foundry V13–V14)

MERP-UI ships nine Compendiums with source definitions under `source/compendiums/`.
Foundry can persist these packs in LevelDB after importing the original `.db` seeds;
changing a `.db` or JSON file alone may not change an existing pack.

## For developers preparing a GitHub release

1. Modify the relevant **source JSON**; update localized French and English text.
2. Rebuild seed files using `npm run build:compendium-seeds:en` when needed.
3. Regenerate `source/compendiums/content-sync-manifest.json` with
   `npm run build:content-sync` (required after ANY Compendium JSON edit).
4. Run `npm run validate:content-sync` and `npm run test:content-sync`.
5. Ship `source/compendiums/` **including** the new sync manifest and source JSONs,
   `scripts/merp-rmu/content-sync.js`, and `scripts/merp-rmu-content.js`.

The fingerprint is SHA-256 over the ordered collection of all source-file hashes.
Its stable document IDs use the same deterministic algorithm as the seed builder.

## Runtime rules

* At startup in an RMU world, a GM checks the source fingerprint **and the applied
  locale** against a hidden per-world setting (`v2:<fingerprint>:<language>`).
  Identical revision and locale skip the expensive scan.
* Switching the content language queues a full synchronization after any ongoing
  request, so a FR request cannot silently reuse an EN run.
* When changed, the module examines its nine Compendiums, matching records by
  `flags.merp-ui.compendiumSourceKey` (never by translated document title).
* Only differences are applied. Existing document and page IDs are preserved;
  extra Journal pages are never deleted. The separate settings guide is preserved.
* New source records missing from an older Compendium can be created with their
  deterministic IDs, then placed into the appropriate Compendium folders.
* It restores the original Compendium edit lock even on failure and records the
  new fingerprint only after all packs succeed. Errors are logged to F12.
* The automatic pass does **not** modify World Items, embedded Actor items,
  personal Journals, or imported Journals other than the legacy Introduction
  updater still present for backward compatibility.

## Manual GM console commands (F12)

```js
await MERPUI.checkContent();               // dry-run across all Compendiums
await MERPUI.syncContent();                // force all Compendium source checks
await MERPUI.syncContent({packs:["merp-rmu-rules"]});
await MERPUI.syncImportedJournals();      // EXPLICITLY overwrite text on imported
                                          // journals with matching provenance flags
```

**Warning:** `syncImportedJournals` replaces MERP-RMU editorial text in existing
World Journals matched by their source flags. Back up your World if you have
edited those imported Journals. Actor Items are never modified by this tool.

## Limitations / release checks

These operations have been tested in a live Foundry environment for updates,
FR/EN locale changes, LevelDB entry creation, persistent document/page IDs, and
cleanup. Recheck on a clean installation before publishing a new release. It doesn't attempt
automatic deletion of records removed from source, or mutation of preexisting
ActiveEffect records. Both require a separate, reviewed migration so user data
and stable effect IDs are not lost. Updating a source JSON without rebuilding
the sync manifest will **not** trigger an automatic update.
