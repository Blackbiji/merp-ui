# MERP-UI / MERP-RMU 2.0.5

**MERP-UI** is a free, unofficial, non-commercial English/French module for **Foundry Virtual Tabletop**, designed to bring Middle-earth-oriented content to the **Rolemaster Unified (RMU)** system. RMU remains the rules engine: MERP-UI provides supplemental content, presentation and localization rather than replacing RMU.

**Release:** 2.0.5 (6 November 2026). This update consolidates author-tested Hobbit racial talents and Middle-earth racial identity metadata, along with the validated independent Culture Skills and Hobby Skills scrolling areas. The nine LevelDB Compendiums and native RMU mechanics remain preserved.

## Compatibility

- **Foundry VTT:** minimum generation 13; declared verified through generation 14.
- **RMU system:** declared minimum 1.3.55; author-tested reference 1.4.83.
- The module only activates in RMU Worlds. Versions at the minimum compatibility boundaries have not all been retested; a new blank World is also recommended for independent validation.

## What's included

MERP-UI uses a **Compendium-first** design. Instead of filling a new World with hundreds of Items, it makes nine persistent Compendiums available under **MERP-RMU**:

1. Races
2. Cultures
3. Professions
4. Skills
5. Spell Lists
6. Talents & Flaws
7. Herbs & Substances
8. Languages
9. Rules & References

The content includes **12 Races**, **21 Professions**, **85 Talents & Flaws**, and a **187-entry Herbs & Substances catalogue**. Race and Profession entries have substantial English/French descriptions; Race and Culture content includes historical variants for the First through Fourth Ages. The module retains spell-list support and the established Middle-earth settings, including optional Shadow attraction and Corruption features.

The **MERP-RMU Content Language** setting chooses English or French editorial content independently of Foundry's own interface language. English is the default for new Worlds; localized text and display names are available where supplied. Existing Compendium documents are synchronized from their canonical sources when the GM starts the World, while character-owned and independently edited World Items are preserved.

## What's new in 2.0.5

- **Hobbits:** reliably displays four racial talents (Small, Resistant, Stealthy and Sure-footed), without automatic duplicate grants; compact descriptions on character sheets.
- **Culture Skills / Hobby Skills:** preserves the author-validated independent scrolling areas so the 12 Hobby ranks no longer compress or hide the cultural skill table.
- **Racial identities:** aligns technical race-match metadata while preserving native RMU mechanics; mixed ancestry tags are MERP-UI metadata, not claims of native Slaying support.
- **Preservation:** no changes to RMU character statistics, skills, development points, the nine LevelDB packs, or intentionally removed assets.

## What's new in 2.0.4

- Rebalanced and slightly reduced Journal headings H1–H6, including Journals supplied by adventure modules.
- Removed superseded RC1 heading-size overrides, rather than accumulating competing CSS rules.
- Allowed long Journal page headings to wrap without clipping.
- Avoided applying decorative dropcaps to short heading-like paragraphs; preserved the original Journal HTML.
- Continued using Foundry native icons; no custom icon catalogue was restored.
- No modifications to RMU mechanics, character creation, spell handling, bilingual editorial content or the nine LevelDB Compendiums.

## What's new in 2.0.3

- Middle-earth specialization choices for Historic, Creature, Racial, Region, Materials, and Religion/Philosophy Lore; bilingual FR/EN selector labels.
- Prevent Religion/Philosophy from being offered a second time through the Other Lores cultural allocation when a dedicated cultural allocation exists.
- Prevent duplicate Race Items during initial creation and after a confirmed race change, preserving race-to-culture filtering.
- Skip the obsolete PNG-to-WebP icon migration when no WebP icon is catalogued.
- No changes to RMU development costs, cultural ranks, professional skills, nine LevelDB Compendiums, or intentionally removed assets.

## What's new in 2.0.2

- Restored Base Spell List availability for Sorcier and Vracara, and extended the compendium-based hybrid list integration to Kekhavra and Wegech.
- Continued relying on installed RMU Spell Law; no forced World Item imports.

## What's new in 2.0.1

- Journal chapter initials use the **Initials TFB** typeface, preserving the text and remaining accessible to screen readers.
- Read-aloud passages formatted as **Blockquotes** in MERP-UI Journals receive restrained automatic framing: the original ornament no. 34 above and below the text, with thin black side rules.
- The framing adapts to the length of the passage and avoids overlapping surrounding material or GM secrets.
- Gameplay, skill mechanics, existing Compendiums and their source IDs are unchanged.

## What's new in 2.0.0

- Consolidated the complete English/French narrative texts for the 12 Races and 21 Professions.
- Corrected Dúnedain racial Talent assignment, display and localized descriptions, including switching directly from a different Race.
- Refined character-creation presentation and the display of Talents, Race/Culture languages and lore guidance; the underlying RMU mechanics and validations remain intact.
- Consolidated localization, herb metadata, Compendium styling and nine persistent LevelDB packs.
- Standardized the Compendium-first delivery model and cleaned up the project's release baseline.

See [CHANGELOG.md](CHANGELOG.md) for the release history.

## Installation and updates

Use this module manifest in Foundry's **Install Module** dialog:

`https://raw.githubusercontent.com/Blackbiji/merp-ui/main/module.json`

For manual installation, download the official release archive `merp-ui-2.0.5.zip` from the [v2.0.4 release page](https://github.com/Blackbiji/merp-ui/releases/tag/v2.0.5), extract the archive contents into Foundry's `Data/modules/merp-ui/` folder, then enable the module in an RMU World. The nine LevelDB Compendium folders are included in the release ZIP.

**Back up your Worlds and module files before upgrading.** The 2.0.5 Hobbit talents and Culture/Hobby layout fixes have been validated in Foundry by the author. Automated Foundry runtime tests, clean installs and every upgrade path have not been independently verified.

## Developer notes

The installed ZIP contains runtime JavaScript, styles, editorial sources and nine prebuilt LevelDB Compendiums. Development-only build scripts, old NeDB seed files and `package.json` are deliberately excluded. In the development repository, `npm run validate:release` checks the distribution metadata, packaged Compendiums, source references, and bilingual Race descriptions.

The canonical editorial sources are under `source/compendiums/`. For deeper information about source synchronization, see [source/README.md](source/README.md). MERP-UI does not replace the RMU system's own rules, professions or magical effects.

## Licences, credits and non-commercial use

MERP-UI is an **unofficial, free, non-commercial fan project** by **Jean-Brice Gayet**. The accompanying MIT `LICENSE` applies to the original software code and framework only. **Middle-earth, MERP, Rolemaster and RMU** materials, names and intellectual property remain subject to their respective rights holders' terms.

The bundled **PragRoman**, **Initials TFB**, and **Ornaments Labels and Frames** fonts are used for this non-commercial project and are **not covered by the project's MIT licence**. Other artwork, interface assets and fonts likewise retain any applicable separate rights. See [NOTICE.md](NOTICE.md) for attribution and limitations. Original module code and third-party materials must not be treated as a single MIT-licensed work.

Issue tracker: https://github.com/Blackbiji/merp-ui/issues
