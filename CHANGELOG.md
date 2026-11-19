# MERP-UI — Changelog

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
