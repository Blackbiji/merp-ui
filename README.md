# MERP-UI / MERP-RMU 1.6.0 RC6.1

**MERP-UI** is a free, unofficial, bilingual English/French module for **Foundry VTT** built for the **Rolemaster Unified (RMU)** system and designed to support Middle-earth campaigns. It is not a replacement for RMU or for the game publications used at the table.

> **Release status:** 1.6.0 RC6.1 is an *internal release candidate*, not a published GitHub release. The author has validated the CLEAN-28 baseline in an existing Foundry World with RMU 1.4.83. Publication still requires fresh-World checks and review of third-party rights. See `NOTICE.md` and `LICENSE` before redistributing the module.

## Compatibility

- Foundry VTT: minimum generation **13**, manifest declares verified through **14**.
- RMU system: declared minimum **1.3.55**; author-tested reference **1.4.83**. Compatibility at the declared minimum remains to be retested.
- MERP-UI only activates in RMU Worlds.
- A clean-World and an existing-World regression test in the relevant Foundry/RMU versions are required before publication; offline tests alone are not sufficient.

## How MERP-UI works

The module uses a **Compendium-first** design: newly created Worlds are not populated with hundreds of Items. Nine permanent Compendiums are grouped under **MERP-RMU**:

1. Races
2. Cultures
3. Professions
4. Skills
5. Spell Lists
6. Talents & Flaws
7. Herbs & Substances
8. Languages
9. Rules & References

Races and Cultures provide age-aware variants for the First through Fourth Ages. MERP-UI resolves the selected Age when importing relevant records to a World.

## English / French

The **MERP-RMU Content Language** setting selects the module's editorial language without requiring you to change Foundry's interface language. English is the default for new Worlds. The 187 entries of the Herbs & Substances catalogue have FR/EN descriptions; herb names, seasons/date ranges and forms are localized where translations are provided. Internal RMU option values are preserved.

## RC6.1 bilingual professions and character creation

All **21 professions** have full French and English narrative descriptions, including
mechanical reference tables and Gamemaster's notes. The complete sources are stored
in `source/compendiums/merp-rmu-professions/`. The source manifest drives automatic
updates of existing compendiums in each World when a GM starts it, in its selected
MERP-RMU content language; character-owned and independently edited World Items
are not overwritten. New Worlds load the prebuilt LevelDB compendiums; the embedded sources support subsequent synchronization.

The **85 Talents & Flaws** and their established FR/EN content remain unchanged.
During RMU character creation the module presents Talents & Flaws before combat
training, adds an explicit review checkbox, and retains the RMU system's internal
creation states, validations and game mechanics. The label is informative, not a
new rule preventing completion. Race/Culture starting Language and Lore guidance
and non-intrusive display improvements are also retained.

The RC6 fix for the welcome chat applies native UI typography **only to its two
action buttons**, while leaving the journal and chat prose in the established font.

## Character options and campaign rules

MERP-UI bridges the setting to RMU's rules engine with character options, starting cultural languages, spell-list integration, optional Shadow attraction and Corruption settings, and a contextual rules/reference Journal. Its optional settings are designed to leave final control with the GM.

The MERP-UI Compendium contains **35 MERP-UI spell-list entries**. The historical Astrologer list *Lumières Stellaires* has been retired in favour of RMU Spell Law’s native *Starlights*, avoiding duplication and allowing future native RMU effects automation. The Arcane spell-list selector no longer blocks the character sheet when no Arcane lists are installed.

The **MERP-RMU — Rules & References** Compendium contains the *MERP-RMU Presentation* Journal, including the installation/settings guide.

## Installation and updates

A published GitHub release should provide a ZIP named `merp-ui-1.6.0-rc.6.1.zip` containing the `merp-ui/` root folder. When a release has been approved and published, the Foundry manifest URL is:

`https://raw.githubusercontent.com/Blackbiji/merp-ui/main/module.json`

**Do not point users at this RC6 download until the actual release asset exists.** Back up Worlds and module files before upgrading. The existing test World has been validated by the author, but fresh-World and upgraded-World release checks are still required.

## Developer checks

This distribution ZIP contains the runtime, content sources and nine **prebuilt LevelDB Compendium directories**, but **does not include the legacy `.db` (NeDB) seed files, the development `package.json`, or validation scripts**. The `.db` files remain build artifacts in the development repository; Foundry 13/14 uses the LevelDB pack directories declared in `module.json`. The `npm run` checks are available only in a complete development checkout; do not attempt to run them from this installed module archive. The build order is documented in [`source/README.md`](source/README.md).

RC6 inherited RC5 test note: Alchemist (+14), Herutano (+1), and Razak-Zinul (+2) have nonzero Aptitude in the last author-tested snapshot; the module intentionally preserves those measured values.

The source-of-truth editorial content lives in `source/compendiums/`. If source JSONs change, rebuild the Compendium bootstrap seeds and regenerate the content-sync manifest in the development checkout before testing; see [`source/README.md`](source/README.md).

## Licences and acknowledgments

The original MERP-UI software code is licensed under the accompanying `LICENSE` (MIT, limited to original code/framework). The project is unofficial and non-commercial. The MIT licence **does not license** third-party RPG rules, sourcebooks, Middle-earth IP, artwork or fonts. Their inclusion or redistribution must be assessed separately; a fan-project notice alone does not grant permission.

See [`NOTICE.md`](NOTICE.md), [`LICENSE`](LICENSE), [`CHANGELOG.md`](CHANGELOG.md), and [`source/README.md`](source/README.md). Detailed validation and rights-review working files remain in the development checkout rather than this distribution archive.


### Whitford profession compatibility (CLEAN-41)

In world settings, **Whitford race/culture/profession compatibility** is enabled by default. It filters the MERP and RMU profession selectors for characters with a recognized MERP race, using explicit race/culture restrictions from *MERP Character Creation Using RMSS/RMFRP v2.5* (Whitford Bates and contributors). Disable it to allow exceptions in the GM’s Middle-earth. Cultural traditions reserved for women/men are noted in the source and are not automatically enforced because actor gender information is not reliably normalized. When the source does not establish a prohibition, professions are not silently excluded.
