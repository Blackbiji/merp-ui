# MERP-UI / MERP-RMU 2.0.0

**MERP-UI** is a free, unofficial, non-commercial English/French module for **Foundry Virtual Tabletop**, designed to bring Middle-earth-oriented content to the **Rolemaster Unified (RMU)** system. RMU remains the rules engine: MERP-UI provides supplemental content, presentation and localization rather than replacing RMU.

**Release:** 2.0.0 (27 October 2026). This stable milestone incorporates the RC6.7 build tested by the author in an existing Foundry World, together with release metadata and Compendium source-integrity corrections. It is not an endorsement or official product of the Tolkien rights holders, Iron Crown Enterprises or Foundry Gaming LLC.

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

For manual installation, download the official release archive `merp-ui-2.0.0.zip` from the [v2.0.0 release page](https://github.com/Blackbiji/merp-ui/releases/tag/v2.0.0), extract the included **`merp-ui/`** directory into Foundry's `Data/modules/` folder, then enable the module in an RMU World. The nine LevelDB Compendium folders are included in the release ZIP.

**Back up your Worlds and module files before upgrading.** The author has tested RC6.7 in an existing World. Testing every upgrade path, a clean World and the full stated minimum-version compatibility range is ongoing.

## Developer notes

The installed ZIP contains runtime JavaScript, styles, editorial sources and nine prebuilt LevelDB Compendiums. Development-only build scripts, old NeDB seed files and `package.json` are deliberately excluded. In the development repository, `npm run validate:release` checks the distribution metadata, packaged Compendiums, source references, and bilingual Race descriptions.

The canonical editorial sources are under `source/compendiums/`. For deeper information about source synchronization, see [source/README.md](source/README.md). MERP-UI does not replace the RMU system's own rules, professions or magical effects.

## Licences, credits and non-commercial use

MERP-UI is an **unofficial, free, non-commercial fan project** by **Jean-Brice Gayet**. The accompanying MIT `LICENSE` applies to the original software code and framework only. **Middle-earth, MERP, Rolemaster and RMU** materials, names and intellectual property remain subject to their respective rights holders' terms.

The bundled **PragRoman** font is used for this non-commercial project and is **not covered by the project's MIT licence**. Other artwork, interface assets and fonts likewise retain any applicable separate rights. See [NOTICE.md](NOTICE.md) for attribution and limitations. Original module code and third-party materials must not be treated as a single MIT-licensed work.

Issue tracker: https://github.com/Blackbiji/merp-ui/issues
