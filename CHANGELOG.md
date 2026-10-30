# MERP-UI — Changelog

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
