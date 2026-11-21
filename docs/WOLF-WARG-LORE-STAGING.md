# Creature Lore — bilingual staging (not a release)

This branch stages the Wolf and Warg Creature Lore compendium changes ahead of the author's final addition. Do not merge or publish a GitHub Release until that step is complete.

## Scope
- Wolf: 535 linked TableResults in one existing RollTable (UUID preserved), comprising 12 major races (60), 61 named cultures (305), a general Racial Lore entry (5), 32 regions (160), and Historic Lore (5).
- Every Wolf result has complete British English and French narratives and language-specific, GM-only editorial notes.
- Warg: the existing one RollTable and all 520 TableResults remain byte-for-byte unchanged.
- Together: 2 RollTables and 1,055 TableResults.
- The 235 existing Wolf TableResult UUIDs remain stable; 300 new children are added deterministically. The generic region results are reused for Eriador general.
- Wolf regional choice is enabled in the GM workflow; Warg regional choice remains available.
- No creature Actor, RMU roll rule, other compendium or Foundry World is changed.

## Warg translation caveat (pre-existing)
Warg French lore is complete. The Warg's 60 major-race entries still have French-only narratives, and the five Arthedain English narratives remain marked pending editorial review in the existing sources. The migration does not silently substitute Wolf lore for these Warg passages.

## Build
The checked-in 2.0.17 baseline is reconstructed by the existing scripts, then `tools/publication/upgrade-wolf-lore-bilingual-2.0.18.mjs` applies the migration offline before lossless LevelDB compaction. Both publication and staging CI workflows include this step. All count assertions have been adjusted to 1,055; the Warg preservation check is part of the migration.

On this staging branch, the CI push trigger produces an installable release candidate as a workflow artifact without creating a public release.

## Before the official release
Apply the author's last addition; update `module.json`, `package.json`, the release version guard and release notes; verify all tests and the Foundry extractor; only then merge to `main` to publish the new version. Do not re-publish v2.0.17.
