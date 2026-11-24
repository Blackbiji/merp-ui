# MERP-ui — Changelog

## 2.0.21 — Lightweight Race, Culture and Profession Items (24 November 2026)

- Fix an incomplete 2.0.6 Actor-identity compactor: both generated \`compendiumAgeVariants\` / \`compendiumLocalizations\` and source \`ageVariants\` / \`localizations\` flags are removed from *embedded* MERP-ui Race, Culture and Profession Items.
- Omit \`system.description\` regardless of length; the existing Race/Culture/Profession reference buttons retrieve French/English and Age-specific descriptions directly from the Compendiums.
- Cover default Hildor injection, Actor creation and subsequent identity selection; preserve selected campaign Age, RMU mechanics and Compendium source IDs.
- Preserve Compendium documents, World standalone Items, equipment and existing Actors (no silent migration).
- Add regression tests for legacy metadata, short descriptions, post-materialisation cleanup and idempotence. Author-tested the focused local patch in Foundry before release.

## 2.0.20 — Race, Culture and Profession Compendium reference buttons (23 November 2026)

- Fix missing Culture and Profession description links during RMU character creation: the buttons now appear immediately when their identity Items are added, without requiring FINISH and reopening the Actor sheet.
- Reconcile the toolbar after Race/Culture/Profession additions and removals, preserving button order (Race · Culture · Profession), French/English labels and read-only Compendium access.
- Keep RMU character creation mechanics, existing Actors, and the eleven Compendiums unchanged. This is a maintenance patch on the 2.0.19 release.

## 2.0.19 — Wolf/Warg names, multilingual descriptions and Culture synchronisation (22 November 2026)

- **Loup / Wolf** and **Ouargue / Warg** display single-language names in Creature sheets, Compendium lists and standard World imports. Custom names remain unchanged.
- Complete British-English and French Creature **Descriptions and Gamesmaster Notes** now follow the MERP-ui language selector, without altering the stored French source, embedded RMU links or Lore controls.
- **Creature Lore:** restore Historic Lore skill selection for the Wolf, handle missing skill selections with a Foundry V14-supported dialog, and use the Warg's validated French Racial Lore text if its English equivalent remains unavailable.
- **Culture Compendium:** repair the recurring 60 post-write audit discrepancies caused by RMU's omission of the non-persisted `system.culture` editorial field during FR/EN switches.
- **Warg Image/Token:** use the Wolf's artwork as the portrait and token graphic, retaining the Warg's hostile disposition, native dimensions and name.
- Consolidate only the approved files into one release (no separate installers or obsolete scripts). The eleven Foundry Compendiums, two Creature Lore RollTables (**535 Wolf + 520 Warg = 1,055 results**) and **55** embedded Creature Items are rebuilt and verified in CI.
- The 60 major-race Warg Racial Lore results remain French-only until their English translation is reviewed. All third-party rights notices and dependencies remain in force.


## 2.0.18 — Wolf Lore VF / VO and Compendium banner correction (21 November 2026)

- Complete the Wolf's original French/English literary knowledge for 12 races (60 outcomes), 62 general and cultural specialisations (310), 32 regions (160) and Historic Lore (5): 535 RMU results in one native Foundry RollTable.
- Preserve all 235 existing Wolf TableResult IDs and the parent table UUID; add 300 new entries with deterministic IDs and independent FR/EN Gamesmaster-only verification notes.
- Retain the Warg RollTable and all 520 existing outcomes byte-for-byte. Warg major-race English translations and Arthedain editorial review are explicitly not part of this update.
- Extend the regional Lore selector to Wolf as well as Warg while retaining native RMU skill rolls and GM-only visibility.
- Restore an illustrated banner directly on `.compendium-name` for MERP-ui Compendium windows without Foundry's native `.header-banner`; leave existing Journal banners unchanged. Author tested and validated the patch in Foundry.
- CI checks the 11 LevelDB Compendiums, 2 RollTables and 1,055 embedded TableResults using Foundry's official extractor, plus both Creature Actors and their 55 embedded Items. Publication is one complete installable ZIP, without separate patches.
- This remains unofficial, non-commercial fan content; third-party rights remain governed by NOTICE.md and the existing publication checklist.


## 2.0.17 — MERP-ui Compendium and Creature Lore UI (21 November 2026)

- Consolidated the validated 2.0.17-test.1 interface and subsequent local display patches; no incremental ZIP dependencies.
- Localized the eleven MERP-ui Compendium labels, folder heading and Rules presentation in French/English without changing technical IDs.
- Fixed Creature Lore window controls and parchment contrast; localized Wolf and Warg table titles.
- Removed 5.x/6.x chapter prefixes and doubled bilingual names from the 26 Bestiary folders without moving documents.
- Preserved 235 Wolf + 520 Warg RollTable results, and 55 embedded Actor Items. Wolf's 235 texts remain French-only.


## 2.0.16 — Native Foundry compendium hydration and Wolf Notes fix (21 November 2026)

- **Fix:** RollTables now have the correct dual parent/embedded LevelDB format: 2 parent tables referencing 755 separate TableResult documents, so Foundry can load and show their results.
- **Fix:** The Wolf and Warg Actor parents reference 55 separately stored embedded Items, preserving their full RMU mechanics and original source material.
- **Restore Wolf Notes:** move the already-approved GM biography out of the public Description into Notes without changing the prose; the Description still has the player read-aloud and the four Lore actions.
- **Correct link overlap:** reduce the UUID link padding and force sufficient paragraph line spacing within the MERP-UI creature Bio/Notes styles.
- **Add independent verification:** the official Foundry CLI extractor must reconstruct 235 Wolf + 520 Warg Lore results, 32 Warg regions, 2 Creature Actors and 55 Items. A raw LevelDB entry count alone no longer counts as proof of compatibility.
- **Pre-release testing required** in a clean Foundry V14 World, GM and player. Warg Racial English translations and third-party rights review remain open.


## 2.0.15 — Bestiary and Creature Lore UI test fix (21 November 2026)

- Populate the dedicated Actor Compendium with the user-provided Loup (27 embedded Items) and Warg (28 embedded Items), sorted into 5.7 Carnivores and 6.9 Undead.
- Expose 4 Lore test controls in Wolf's Actor Description and 3 in Warg's (Racial / Cultural / Region; no fictional Warg Historic Lore). Racial and Cultural continue using native RMU Racial Lore without granting skills or ranks.
- Format the original Warg GM Notes into six Bio-style sections with MERP-UI parchment, dark headings and fine borders; do not rewrite the prose.
- Fix the previously empty native RollTables by embedding all 755 results into their two parent RollTable documents. Strengthen CI to reject detached-only results.
- Rename the Compendiums to « Bestiaire des Terres du Milieu / Creatures of Middle-earth » and « Connaissance des Créatures / Creature Lore », and apply existing MERP-UI typography and color styling to both.
- This is a test prerelease. Actor combat mechanics in RMU and the private GM controls still need verification in a live Foundry World. Rights review remains open.



## 2.0.14 — Foundry clean-World Creature Lore test preview (20 November 2026)

- Ship a **preview release** to test the consolidated Creature Lore architecture on a new RMU World.
- Add one RollTable per species: Wolf (235 results) and Warg (520 results), preserving baseline texts and private GM control metadata.
- Separate Warg Racial (12 races), Cultural (60 cultures) and Region (32 regions) knowledge. Keep Historic Lore only where available; the Warg currently has none.
- Prepare an eleventh Compendium of type Actor with **26 native folders** based on *Creatures of Middle-earth* chapters 5 and 6. It contains **no Actor documents yet**; import licensed official RMU creatures into your test World.
- Detect exact-name Wolf and Warg World Actors and offer temporary Creature Lore sheet controls without modifying Actor Notes or Descriptions.
- Preserve the previous two Racial RollTable UUIDs when consolidating the five tables into two.
- Warg true Racial Lore is FR-only for this test; the Arthedain EN translation is provisional. Full Foundry testing and rights review remain outstanding.
- No RMU mechanical skill, rank, Actor Notes or Actor Description changes in the packaged compendiums.


## Pending release — ICE/RMU descriptive title and rights notices (not yet published)

- Acknowledge Iron Crown Enterprises Ltd's Rolemaster Unified copyright and trademark; state that **MERP-RMU** is a descriptive name, not an ICE licence, endorsement or claim to its intellectual property.
- Distinguish ICE/RMU rights from Tolkien/Middle-earth rights, earlier MERP sourcebooks and individual adventure-author permissions.
- Add bilingual `NOTICE.md`, release rights checklist and user-visible `README.md`/`module.json` notices; validate their presence automatically.
- **Rights-clearance checklist remains open.** No release or redistribution authorisation is implied by these notices.
- Documentation, metadata and CI validation only; no Actors, Lore data, RMU mechanics or Compendiums are changed by this set of edits.


## 2.0.13 — Lossless LevelDB compendium rebuild (20 November 2026)

- Reconstruct all ten prebuilt LevelDB Compendiums from their active logical key/value records, with byte-for-byte SHA-256 verification before replacing each offline database.
- Remove superseded LevelDB physical generations from the installable ZIP without deleting any live documents or descriptions.
- Preserve all 12 Races, 60 Cultures, 21 Professions, multilingual descriptions and historical variants; retain 235 Wolf and 455 Warg Lore outcomes.
- Store a per-pack CI audit (logical SHA-256, record counts, old/new byte sizes) with the release build.
- Leave Actor identity compaction and all native RMU mechanics unchanged. This is a distribution-only optimisation.


## 2.0.12 — Warg Lore: complete cultural and regional tables (20 November 2026)

- Add two confidential Warg RollTables to the existing Creature Lore compendium: 300 Cultural/Racial Lore results for 60 cultures and 155 Region Lore results for 31 regions.
- Use the complete British-English literary texts, preserving deliberately unreliable outcomes and GM verification notes.
- Provide Warg regional variant selection, with native RMU specialization matching where unambiguous and GM confirmation otherwise.
- Automatically link exact-name Warg/Ouargue World Creature Actors; offer a GM API for renamed actors. No RMU skill or stat change.
- Retain all 235 existing Wolf results and all ten prebuilt Compendiums, native RMU blind rolls, and GM-only delivery.
- Materialise Warg lore offline in the Foundry LevelDB during the publication workflow.


## 2.0.11 — Wolf Lore: Historic, Region and Half-Elven traditions (19 November 2026)

- Replace the five Historic Lore and five Region Lore texts with expanded approved literary descriptions.
- Add five Half-Elven results to the existing Wolf Racial Lore table; detect Half-Elven ancestry without requiring a dedicated native RMU Culture Item.
- The original three RollTables now hold **235 results**: 225 Racial, five Region and five Historic.
- Preserve native RMU mechanics, secret rolls, GM-only notes and all pre-existing cultural lore.
- Prebuilt Lore LevelDB is updated offline during packaging, never from a running Foundry World.

## 2.0.10 — Creature Lore : Le Loup (19 novembre 2026)

- Première intégration du système Creature Lore sur la fiche du Loup.
- Appels MJ/joueur : Region Lore, Historic Lore, Racial Lore, choix de spécialisation et manœuvre RMU aveugle.
- Compendium privé `merp-ui-lore` avec 230 résultats (220 Racial, 5 Region, 5 Historic), dont 42 nouvelles variantes culturelles.
- Cinq résultats des Demi-Elfes reportés faute d'Item Culture natif correspondant.
- Aucune modification des mécaniques RMU natives.


## 2.0.9 — Native RMU racial size hotfix (17 November 2026)

- Hobbits: native Decreased Size I ensures the RMU Small category; Trolls and Half-Trolls: Increased Size II ensures Large.
- Synchronize the native Actor frame for existing Troll characters that still show Medium after the racial Talent is present; correct the Race update hook.
- Preserve embedded Talent IDs, DP, XP, stats, tokens and existing equipment. RMU continues to handle gear resizing when items are dropped onto the Actor.
- Reconcile the bilingual Race sources and Age variants through the Compendium synchronization manifest.
- In-game validation by the author confirms racial sizes and RMU equipment resizing on item drop. Added targeted regression tests; the earlier Culture Skills contrast fix remains intact.


## 2.0.8 — Compact Talents & Flaws presentation in RMU character sheets (15 November 2026)

- Present rich Talent and Flaw descriptions in compact 13 px PragRoman typography on RMU Actor sheets.
- Show a concise preview by default, with a bilingual button to expand and collapse the full original description.
- Load the display enhancement via the existing MERP-UI script entrypoint so it also works when RMU renders the Talents tab after the character sheet opens.
- Preserve native RMU editing controls, tier and Development Point cost columns, document data and all Actor/Compendium content.
- Author validation in GATES - RACES LIGHT TEST: two descriptions found and enhanced, two preview buttons displayed; visual presentation approved. No changes to RMU rules.

## 2.0.7 — Always-visible Talents & Flaws, unified Compendium typography (14 November 2026)

- Always present the Talents & Flaws stage in RMU character creation, including Races with no granted racial Talents. Preserve navigation Knacks → Talents & Flaws → Combat Training.
- Add a bilingual, PragRoman-scaled explanatory card and direct link to the existing MERP-RMU Talents & Flaws Compendium; rely on RMU to manage purchasing and Development Point costs, without adding any free Talents.
- Harmonize headings and explanatory text in the three creation panels, scoped to the empty Talents step only.
- Use the same proportional PragRoman text size, line spacing and thumbnail scale across all MERP-RMU Compendium folders and Item entries, following Languages as the reference. Row heights remain content-driven and allow natural wrapping.
- Preserve existing Actors, Journals, original Compendium content and all native RMU mechanics. Compatible with the 2.0.6 lightweight Actor import fix; no migration of Worlds.

## 2.0.6 — Lightweight Actor identities and character reference reading (13 November 2026)

- Race, Culture and Profession: three read-only buttons on the RMU Character sheet retrieve the currently selected Age and FR/EN descriptive text directly from MERP-RMU Compendiums, without inserting historical narratives into an Actor. The pop-up reader uses the validated PragRoman font, parchment/ink palette and compact font sizes.
- Culture Skills: preserve list scroll position during rank changes and improve contrast of RMU's native All / Choices / Assigned selector.
- Race/Culture/Profession creation: remove embedded `compendiumAgeVariants` and `compendiumLocalizations` after resolving the intended Age and RMU chassis; large duplicate `system.description` texts are fetched on demand instead. Preserve mechanical data, IDs, selected Age, user choices and Compendium source references.
- Include automatic Hildor race injection in the lightweight Actor-creation path.
- Keep all nine persistent LevelDB Compendiums and bilingual historical reference texts unchanged; do not automatically rewrite existing Actors, Journals or Scenes.
- Author validation: Foundry V14.370 / RMU 1.4.99 in the LIGHT test World (sample Elves/Noldor/Bard character confirmed without embedded Age variants or translations); separate clean-install and GitHub release ZIP validation remains required.

## 2.0.5 — Racial identities, Hobbit talents and creation UI (5 November 2026)

- Synchronisation des mots-clés techniques des Races : Dwarf, Umli, Orc/Goblinoids, Troll/Trolls, Dunadan, Human et Elf. Les ascendances mixtes sont conservées dans `flags.merp-ui.raceMatchTags` ; le moteur Slaying RMU reste autoritaire.
- Migration conservatrice des Items Race MERP-UI existants : seuls type, variété et affinités sont actualisés, sans modifier les caractéristiques ni les compétences.
- Hobbits : compléter les talents raciaux Small, Resistant, Stealthy et Sure-footed sans doublons et raccourcir leurs descriptions sur la fiche.
- Réintégration du correctif validé Culture Skills / Hobby Skills : deux zones de défilement distinctes.
- Aucune modification des scripts de création de PNJ.

## 2.0.4 — Journal typography and headings (2 November 2026)

- Removed obsolete RC1 `!important` heading sizes (H1–H4) which suppressed the newer visual hierarchy.
- Consolidated the six Journal heading levels H1–H6 with a balanced, slightly smaller visual scale, including adventure-module Journals.
- Allowed long Foundry page headings to wrap instead of being clipped; no journal content mutation.
- Prevented brief heading-like paragraphs from receiving a decorative opening initial.
- Preserved read-aloud frames, RMU mechanics, character creation, FR/EN content and all nine LevelDB Compendiums.
- No custom icons were reintroduced; Foundry native icons remain the standard.

## 2.0.3 — Middle-earth Lore and character creation maintenance (31 October 2026)

- Replaced generic RMU Lore specialization suggestions with bilingual Middle-earth choices and nested race/region/creature selectors.
- Prevented Religion/Philosophy from being offered again in Other Lores when a dedicated cultural allocation exists; cultural ranks and development costs remain unchanged.
- Corrected duplicate Race Items on new characters and on confirmed race changes, restoring culture compatibility selection.
- Disabled the obsolete automatic PNG-to-WebP migration when the current asset catalogue has no WebP icons.
- Preserved the nine LevelDB Compendiums, RMU rules engine, hybrid Base Spell Lists from 2.0.2 and intentionally removed assets.

## 2.0.2 — Hybrid Base Spell List correction (31 October 2026)

- Restored Base Spell Lists for Sorcier and Vracara and applied the same compendium-based approach to Kekhavra and Wegech.
- Kept Spell Law as the source of native spell lists; no World Item import requirement.


## 2.0.1 — Journal typography and read-aloud framing (31 October 2026)

- Replaced the illustrated journal opening capitals with decorative **Initials TFB** typography, preserving accented letters in accessible text and leaving the source journal content unchanged.
- Added automatic, compact frames to **read-aloud Blockquotes in MERP-UI Journals**, using the unmodified original ornament 0034 above and below each passage, with thin side rules.
- Adjusted spacing and sizing to prevent overlap with neighbouring journal paragraphs and GM-only sections.
- Kept the existing Rolemaster Unified mechanics, bilingual editorial sources and all nine Compendiums unchanged.

## 2.0.0 — Stable release (27 October 2026)

**Stable packaging of the author-tested RC6.7 milestone** for Foundry VTT with the Rolemaster Unified rules engine.

### Content

- Complete, approved French/English editorial descriptions for **12 Races** and **21 Professions**, with historical variants where supported.
- **Nine permanent Compendiums** delivered with prebuilt LevelDB data; incremental FR/EN source synchronization retained.
- Updated presentation for **85 Talents & Flaws**, the **187-entry** Herbs & Substances catalogue, and character-creation guidance for Races and Cultures.
- **Dúnedain**: corrected racial Talent assignment and visibility, localized descriptions, compact presentation and direct Race switching from another origin.

### Technical and compatibility

- Compendium-first delivery, including clean-World content discovery without wholesale Item injection.
- More consistent multilingual display for Compendium entries and related character-sheet fields.
- RC6.7 fixes consolidated without modifying the RMU rules engine or character-creation mechanics.
- Release metadata and the Compendium source-sync manifest aligned to version 2.0.0; release-integrity tests now check nine Compendiums, 455 source references and both language versions of all 12 Races.
- Declared compatibility: Foundry VTT **13–14**, RMU **1.3.55+** (author-tested with RMU **1.4.83**). Full minimum-version and fresh-World validation remains advisable.

### Distribution

- Module ID: `merp-ui`; GitHub tag: `v2.0.0`; installable ZIP: `merp-ui-2.0.0.zip`.
- Free, unofficial, non-commercial. MIT licensing applies only to original module code; see `NOTICE.md` for third-party material and PragRoman font.

## 1.6.0 RC6.x — Private test candidates (October 2026)

- RC6: completed the narrative bilingual Professions, Welcome message presentation and Compendium source synchronization.
- RC6.1–RC6.7: consolidated the 12 bilingual Race descriptions and refined Dúnedain racial Talents, typography and direct Race switching, with successive author tests.
- These RC6.x builds were private candidates, not separate public GitHub releases.

## 1.6.0 RC5 — Internal candidate (22 October 2026)

- Improved character-creation UI, Talents/Flaws visibility and display order, localizations and Compendium typography.
- Preserved verified profession-specific mechanics and existing author test-world values.

## 1.6.0 RC4 — Public prerelease (20 October 2026)

- Consolidated FR/EN herb catalogue metadata and Compendium seed validation.
- Updated herb seasons, forms, dates, and Talent display readability.

## 1.6.0 RC1–RC3 — Earlier candidates (August–October 2026)

- Introduced Compendium-first delivery, language switching and the core MERP-RMU integration baseline.

## 1.5.x — Stable predecessor

- Earlier localization, RMU integration and character options. Historical intermediate patches remain accessible in Git history and previous release tags.
