# MERP-UI / MERP-RMU 1.6.0-rc.1

MERP-UI is a bilingual **English / French** Foundry VTT module built for
**Rolemaster Unified (RMU)** and intended for Middle-earth campaigns.

This release candidate marks the transition to the **Compendium-first**
architecture validated with **RMU 1.5.33**.

## Requirements

- Foundry VTT: minimum generation 13; currently declared verified through 14.
- Rolemaster Unified system: **RMU 1.5.33 or later**.
- MERP-UI only activates in RMU worlds.

## Compendium-first model

MERP-UI no longer populates a new World with hundreds of Items.

The module provides nine permanent Compendiums grouped under **MERP-RMU**:

1. Races
2. Cultures
3. Professions
4. Skills
5. Spell Lists
6. Talents & Flaws
7. Herbs & Substances
8. Languages
9. Rules & References

Drag content from the Compendiums when it is needed.

Existing MERP-UI 1.5 Worlds are preserved: their previously installed World
documents are not automatically deleted.

## Campaign Age

In **Game Settings → MERP UI Framework**, choose the active Campaign Age.

Age-dependent Races and Cultures are stored once in the Compendiums. MERP-UI
applies the appropriate First, Second, Third, or Fourth Age variant when the
entry is dragged into the World.

## English / French content

English is the default editorial language for new Worlds.

The **MERP-RMU Content Language** setting can switch the module between English
and French without changing Foundry's own interface language. Compendium
documents, folders, imported MERP-RMU content, campaign languages, settings
labels, and the welcome material follow this choice.

## Campaign Languages

MERP-UI synchronizes the Middle-earth languages directly into the RMU
**Campaign Languages** World setting. The starting spoken/written ranks attached
to a Culture are applied from its selected Age variant.

## Magic and the Shadow

MERP-UI includes optional campaign automation for the **Risk of Attracting the
Shadow**, Sorcery consequences, regional activity, and Corruption. These options
are configured from the MERP UI Framework settings.

For RMU macro/API work, the RMU project's official **APIs and Macros** wiki page
is the reference implementation source.

## Setup guide

The Compendium **MERP-RMU — Rules & References** contains the Journal
**MERP-RMU Presentation**. Its final page is the bilingual installation and
settings guide.

The MERP-UI welcome Chat card links directly to this page.

## Distribution

MERP-UI is intended as a **free, non-commercial fan project**. Do not resell this
module or redistribute it as a paid Foundry package.

The code and original framework structure are provided under the terms described
in `LICENSE`. Middle-earth, Rolemaster, MERP, RMU, and third-party names and
materials remain the property of their respective rights holders. No ownership
of those properties is claimed.

## Release candidate

This is **1.6.0-rc.1**, intended for final non-regression and GitHub release
testing before `1.6.0`.

The primary tested baseline is:

```text
MERP-UI 1.6.0-rc.1
RMU 1.5.33
```

See `CHANGELOG.md` for the development history.
