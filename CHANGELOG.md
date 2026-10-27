# MERP-UI — Changelog

## Unreleased — Complete bilingual Race descriptions (27 October 2026; pre-publication candidate)

- Replaced the editorial descriptions for all **12 Races** with the complete, user-approved French and English texts, preserving every narrative paragraph and section.
- Updated the canonical race Compendium sources and each supported Age variant in both languages; no Race stats, resistances, talents, Profession restrictions, age availability, document identities or RMU mechanics were changed.
- Refreshed the source-sync hashes and release fingerprint so existing Foundry LevelDB Compendiums are updated on the next GM/RMU synchronization. The last validated LevelDB binary seeds are deliberately retained in this candidate pending a real Foundry boot test.
- Offline checks: 12 bilingual source pairs, 1,070 paragraphs per language faithfully preserved, and all non-description race JSON fields unchanged.

**Validation status:** source/HTML checks pass offline. **Real Foundry testing is still required**, especially initial GM synchronization, both languages, age-variant materialization, a clean World and an existing World. **Not yet published.** The third-party rights review mentioned in README and NOTICE remains a prerequisite for any public Foundry/GitHub release.

## 1.6.0-rc.6.1 — Welcome chat buttons in floating notifications (private hotfix)

- Corrected a missed presentation surface: the two Welcome buttons can appear not only in the Chat sidebar but also as floating notifications on the canvas. The RC6 CSS selector only matched the former.
- Scoped a replacement rule to the welcome card itself, with explicit label typography, safe wrapping and separate Font Awesome icons. The updated message template wraps labels for consistent layout; previous messages (without labels) are also supported.
- Retained the 21 complete bilingual professions and all RC5 work on the 85 Talents & Flaws, character creation, RMU mechanics and compendium synchronisation unchanged.
- Bumped the private candidate revision to invalidate potentially cached styles. Requires manual appearance verification in Foundry.


## 1.6.0-rc.6 — Bilingual profession consolidation (25 October 2026; internal candidate)

- Completed the 21 full French/English profession descriptions, including their narrative text, original Tolkien/MERP distinctions, spell lists, costs, and GM notes.
- Updated the 21 canonical profession sources and the legacy World descriptions without altering mechanical fields, proficiencies, spell data, or development costs.
- Rebuilt English Compendium bootstrap seeds and the incremental content-sync manifest, allowing both existing and new RMU Worlds to receive the updated bilingual profession entries.
- Preserved the RC5 character-sheet/creation work: **85 Talents & Flaws**, bilingual descriptions and character-sheet display, Talents-before-Combat presentation order and review indicator, Race/Culture languages and lore guidance, and visual fixes.
- Scoped a typography override strictly to the two buttons on the welcome chat card; the surrounding editorial fonts and Foundry/RMU controls remain unaffected.
- Updated the offline content-sync test expectation to account for the RC5 culture-compendium startup guard (the previously stale 455-document count is now 456).
- Promoted module metadata, packaging, and the runtime version API to `1.6.0-rc.6`.

**Validation status:** offline module/source/compendium checks are recorded in `docs/RC6-VALIDATION.md`. Actual rendering of both welcome buttons, talent creation/selection, and automatic synchronization in a new and an upgraded World still require confirmation in Foundry. This candidate is **not publicly released**. Rights review blockers documented in `docs/RIGHTS-REVIEW-RC5.md` must be addressed before any public release.


## 1.6.0-rc.5 — Internal test-world candidate (22 October 2026)

- Consolidated bilingual FR/EN culture and profession editorial updates into the Compendium-first sources and rebuilt English bootstrap seeds for all nine Compendiums (455 documents).
- Harmonized selected MERP profession costs and professional skills with official RMU profiles where an exact counterpart exists; preserved Middle-earth-specific adaptations for other professions.
- Persisted the tested final profession data in `source/compendiums/` and the legacy World source `data/merp-rmu/khazad.json`, with an updated content-sync manifest for existing LevelDB Compendiums.
- Kept the confirmed test-world aptitude values for the last three professions: Alchemist +14, Herutano +1, Razak-Zinul +2; no claim that these are balanced to zero.
- Promoted metadata, the runtime version API, and release links to `1.6.0-rc.5`; recorded real test context Foundry 14.369 with RMU 1.4.80.

**Validation status:** The project author confirms the existing test World works correctly. This remains an internal release candidate, **not an already-published GitHub release**. Fresh-world testing and the third-party rights review are still open. The release download URL becomes usable only after creating the GitHub release and uploading the matching asset.

## 1.6.0-rc.4 — Candidate for public review (20 October 2026)

- Consolidated the 1.6.0 RC3 fixes for the FR/EN display of herb seasons, special dates, lunar phases and forms.
- Consolidated the seven descriptive plant-name translations while retaining English original names in the EN localisation.
- Confirmed **187 Herbs & Substances** sources with bilingual content, and rebuilt the **nine English bootstrap Compendium seeds** from canonical sources.
- Verified that the **455 stable document IDs** and RMU mechanical fields in the herb catalogue remain unchanged.
- Aligned README, package version, manifest, runtime version API, compatibility guidance and release metadata.
- Added offline release checks and a third-party rights-review checklist for public publication.
- Improved contrast and hierarchy of Talent descriptions in the RMU character-creation table (FR/EN), without changing Talent content or RMU mechanics.

**Validation status:** JavaScript syntax and content-sync tests pass offline after the seed rebuild. Real Foundry checks and third-party rights verification remain mandatory before a public release.

## 1.6.0-rc.3 — Working baseline

- Consolidation of Compendium-first content and release metadata.
- French/English herb catalogue work brought to 187 entries, with improved descriptions, date/season option translations and display names.
- Declared baseline: Foundry generations 13–14; RMU 1.3.55.

## 1.6.0-rc.1 — Compendium-first introduction

- Nine persistent Compendiums under MERP-RMU, bilingual content and settings, age-aware Race/Culture variants and a journal-based setup guide.
- Existing Worlds preserved; fresh Worlds do not receive wholesale Item imports.

## 1.5.x — Stable predecessor

- Earlier localisation, RMU integration and character options. Historical alpha and patch notes remain available through version-control history rather than the distributed changelog.
