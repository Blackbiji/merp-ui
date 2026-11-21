# Wolf and Warg Lore — 2.0.18 release implementation

This document records the offline, reproducible Wolf bilingual Lore migration published with MERP-ui v2.0.18.

- Wolf: 535 linked TableResults in one existing RollTable, retaining the parent UUID and all 235 earlier result IDs. The additional 300 child IDs are deterministic.
- Wolf sources: 12 major races (60), the general Racial Lore and 61 named cultures (310), 32 regions (160) and Historic Lore (5). All 535 results contain full French and British English narratives, plus language-specific GM verification notes.
- Warg: all 520 existing entries and the parent RollTable are preserved byte-for-byte, including their source metadata. The earlier missing English major-race translations and editorial review of Arthedain are unchanged.
- Total: two RollTables and 1,055 TableResults; the bestiary retains two Actors and 55 embedded Items.
- The regional selector supports both Wolf and Warg. The illustrated `.compendium-name` banner fallback only applies when a native `.header-banner` is absent.
- Offline process: the 2.0.17 baseline is reconstructed by the existing publication scripts; `tools/publication/upgrade-wolf-lore-bilingual-2.0.18.mjs` applies the migration prior to lossless compaction. The release workflow and all verification scripts enforce these counts.
- The patch was tested in a live Foundry installation by the author before publication. Official Foundry extraction and repository CI validation are required for the release archive.

Rights notices, licences, the separate Middle-earth rights considerations and the publishing checklist remain applicable. No authorization by ICE or Tolkien rights holders is implied.
