# MERP-UI / MERP-RMU 1.6.0 RC4

**MERP-UI** is a free, unofficial, non-commercial English/French module for Foundry VTT. It extends **Rolemaster Unified (RMU)** with Middle-earth-oriented character creation, cultural options, localized Compendiums and optional campaign rules. It does not replace RMU or published game materials.

## Requirements
- Foundry VTT 13 (minimum); declared compatible through Foundry 14.
- Rolemaster Unified: declared minimum and verified version **1.3.55**.
- MERP-UI activates only in RMU Worlds.

## Compendium-first architecture
MERP-UI provides nine permanent Compendiums under **MERP-RMU**: Races, Cultures, Professions, Skills, Spell Lists, Talents & Flaws, Herbs & Substances, Languages, and Rules & References. A fresh World is **not filled with hundreds of Items**. Existing Worlds retain previously imported documents.

The Campaign Age setting applies the relevant First, Second, Third or Fourth Age variants of Races and Cultures at import.

## English / French
The **MERP-RMU Content Language** setting selects English or French separately from Foundry's UI language. The Herbs & Substances collection contains **187 bilingual entries**, including localized herb names and on-sheet season/form labels. RMU mechanical values are preserved.

## Character options and rules
The module offers race, culture, profession and skill integration, campaign languages, spell-list support and optional Shadow/Corruption rules. The *MERP-RMU Presentation* Journal in **Rules & References** explains installation and settings.

## Installation
Install via Foundry using the manifest URL:

`https://raw.githubusercontent.com/Blackbiji/merp-ui/main/module.json`

Or download the complete release archive:
`https://github.com/Blackbiji/merp-ui/releases/tag/v1.6.0-rc.4`

Back up existing Worlds before upgrading. This is a **release candidate**: report issues via GitHub Issues.

## Validation
The codebase includes automated checks for JS syntax, Skills, Compendium seeds (9 packs, 455 documents), source-manifest fingerprints and content-sync regression. The Talent display was also checked in Foundry; the full range of Foundry versions/configurations has not been exhaustively tested.

## Licence and attributions
Only the original MERP-UI framework/code is under the accompanying MIT licence. Third-party game settings, rules, trademarks, fonts and images belong to their respective owners and are **not** relicensed by MIT. MERP-UI is an unofficial non-commercial fan project and is not endorsed by the rights holders. See [NOTICE](NOTICE.md) and [rights review](docs/RIGHTS-REVIEW-RC4.md).

Changes: [CHANGELOG.md](CHANGELOG.md).
