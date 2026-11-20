# MERP-UI / MERP-RMU 2.0.16

**MERP-UI** is a free, unofficial, non-commercial English/French module for **Foundry Virtual Tabletop**, designed to bring Middle-earth-oriented content to the **Rolemaster Unified (RMU)** system. RMU remains the rules engine: MERP-UI provides supplemental content, presentation and localization rather than replacing RMU.

> **Rights and naming.** **Rolemaster Unified (RMU)** is a copyrighted and trademarked property of **Iron Crown Enterprises Ltd (ICE)**. **MERP-RMU** is used purely as a **descriptive title**, without any intention of challenging ICE's rights. This is an **unofficial** fan add-on: it is not authorised, licensed, affiliated with or endorsed by ICE or by Tolkien/Middle-earth rights holders. ICE's rights in RMU do not constitute permission to use Middle-earth material. See [NOTICE.md](NOTICE.md) and the [next-release rights checklist](docs/RIGHTS-CHECKLIST-NEXT-RELEASE.md).

**Release:** 2.0.16 (test prerelease, 21 November 2026). Foundry-compatible embedded RollTable results and Actor Items; Wolf Notes restored and Lore-link overlap fixed.

## Test preview 2.0.16 — essential Foundry document fix

The 2.0.15 tests verified the number of logical LevelDB entries, but **did not verify that Foundry could hydrate the embedded documents**. The user observed empty RollTables and missing Actor items. The Foundry 11+ LevelDB format requires BOTH parent references and separately stored embedded documents:

- RollTable parent `!tables!ID`: `results: [resultId, ...]`; `!tables.results!ID.resultId`: result data.
- Actor parent `!actors!ID`: `items: [itemId, ...]`; `!actors.items!ID.itemId`: item data.

**2.0.16 uses both** and verifies that the official `@foundryvtt/foundryvtt-cli` extractor reconstructs the two complete tables (235 Wolf and 520 Warg results) and two complete Actors (27 + 28 Items). The Warg's 32 regional variants are checked on the reconstructed document.

The Wolf's approved GM biography has been **moved without rewriting** from the public Description into the native **Notes** field, alongside a CSS correction for overlapping UUID link decorations. Its Description keeps the player-readable introduction and Racial/Cultural/Region/Historic Lore controls. The Warg retains his Bio-style Notes and three Lore controls.

**Prerelease only:** official Foundry extraction and CI validation reduce packaging errors, but a live Foundry V14 GM/player test remains necessary. Rights checklist and pending British-English Warg Racial Lore remain open.

## Test preview 2.0.15 — corrections to the clean-World bestiary

- **Actors:** the new **Bestiaire des Terres du Milieu / Creatures of Middle-earth** compendium now includes the **Loup / Wolf** and **Warg / Ouargue** Creature Actors, in their proper native folders (5.7 carnivores and 6.9 undead). Their user-provided descriptions are retained and their Lore controls are directly available in the Bio section. The Warg's Notes are rendered with six literary sections using the same parchment-and-charcoal aesthetic.
- **Lore:** the private **Connaissance des Créatures / Creature Lore** RollTables now embed their **235 Wolf and 520 Warg results inside each parent Foundry table**; previously, the 2.0.14 LevelDB had detached result records and blank RollTable windows. Region Lore has 32 Warg variants.
- **Controls:** the Actor Description presents separate Racial and Cultural Lore actions (both use the native RMU Racial Lore skill), alongside Region Lore and, for the Wolf only, Historic Lore. The confidential RMU roll-and-GM-review workflow remains unchanged.
- **Visuals:** the compendium browser and two Lore RollTable windows now follow the existing MERP-UI font, parchment, ink and banner treatment.
- **World Journals:** a new World does **not** receive Journal entries from module installation by default; a Compendium must be opened or explicitly imported. Creature texts are in the Actor Bio/Notes, not automatically duplicated as World Journals.
- **Language status:** 12 Warg race texts remain French-only until their British-English translation and author review are finished; Arthedain's English text remains provisional.
- **Testing:** offline CI checks are required before publication. Foundry V14 GM/player runtime and third-party rights review remain open; this is a new-World testing prerelease.

## Test preview 2.0.14 — new World only

- **Creature Compendium:** new GM-only Actor Compendium containing the 26 native Foundry folders from *Creatures of Middle-earth*, chapters 5 and 6. **It contains NO bundled Wolf or Warg Actors.** Import your own licensed official RMU Actor Creature documents into your test World.
- **Creature Lore:** a single private RollTable for Wolf (235 outcomes) and a single private RollTable for Warg (520 outcomes). Entries are distinguished by true **Racial**, **Cultural**, **Region** and (where supported) **Historic Lore** metadata.
- **Warg language coverage:** 60 cultures have FR/EN texts; all 32 regions have French, and the Arthedain English text is a review-pending draft. The new 12 Racial Lore variants are **French only**, pending English translation and further editorial review.
- **World Actor binding:** a Creature Actor named `Wolf`, `Wolves`, `Loup`, `Loups`, `Warg`, `Wargs`, `Ouargue` or `Ouargues` imported into the test World is linked to its Lore flags by the GM. For renamed Actors, use `game.merpUiLore.activateWolf(actor)` or `game.merpUiLore.activateWarg(actor)`. The UI provides a temporary Lore offer panel if the native sheet has no specific Lore rows.
- **Test status:** Foundry V14 + RMU 1.4.99 gameplay and permissions require live checks with a GM and player. Automated offline checks are not a substitute for Foundry runtime tests. Do not use this candidate to migrate a production World.
- **Rights:** copyright notices and the open third-party rights checklist are included; preview publication does **not** mean all third-party content has received redistribution permission.

## What's new in 2.0.13

- All ten LevelDB Compendiums are rebuilt *offline* from their active logical records. Every raw key and value is compared byte-for-byte via SHA-256 before the rebuilt pack replaces the old one.
- Superseded LevelDB file generations are no longer distributed. Race, Culture and Profession content remains in the Compendiums and is still loaded into character references only on demand.
- All 235 Wolf and 455 Warg Lore results are retained, along with the native RMU blind-roll and GM-privacy protections.
- A machine-readable LevelDB size and integrity audit is published as a CI artifact. No changes to RMU rules or existing actor records.

## What's new in 2.0.12

- **Warg Racial Lore:** 60 cultural variants, each with five narrative results (300 total).
- **Warg Region Lore:** 31 regional variants, each with five narrative results (155 total).
- **Confidential GM metadata:** deliberate false traditions for failures; verification notes never sent to players.
- **Region selection:** match native RMU Region Lore specialization when unambiguous, otherwise ask the GM to choose the territory.
- **First-test Warg Actors:** exact-name Warg/Ouargue World Creatures are bound to both Lore skills; renamed actors can be activated from the GM API.
- **Existing Wolf lore:** all 235 outcomes remain unchanged, as do native RMU skill rolls and character mechanics.

## What's new in 2.0.11

- Five **Historic Lore** results rewritten with longer historical material.
- Five **Region Lore** results rewritten with richer geographical knowledge.
- Five new **Half-Elven Racial Lore** outcomes, with Race-based matching even when no dedicated RMU Culture Item exists.
- The original three Wolf RollTables remain in place: **235 total lore results**, including 225 Racial, five Historic and five Region.
- Native RMU skill checks, secrecy, characters, and other cultures are unchanged.

## Compatibility

- **Foundry VTT:** minimum generation 13; declared verified through generation 14.
- **RMU system:** declared minimum 1.3.55; author-tested reference 1.4.83.
- The module only activates in RMU Worlds. Versions at the minimum compatibility boundaries have not all been retested; a new blank World is also recommended for independent validation.

**Required official products:** MERP-UI depends on the official RMU Foundry implementation. Users need to obtain the official RMU system and separately purchase and install whichever official RMU modules their game requires. This free add-on is not intended to supply or replace ICE's commercial RMU publications, attack tables, critical charts or Bob's paid Foundry modules.

## What's included

MERP-UI uses a **Compendium-first** design. Instead of filling a new World with hundreds of Items, it makes eleven Compendiums available under **MERP-RMU**:

1. Races
2. Cultures
3. Professions
4. Skills
5. Spell Lists
6. Talents & Flaws
7. Herbs & Substances
8. Languages
9. Rules & References
10. Creature Lore (private GM RollTables)
11. Creatures of Middle-earth (Actor folders only in this preview)

The content includes **12 Races**, **21 Professions**, **85 Talents & Flaws**, and a **187-entry Herbs & Substances catalogue**. Race and Profession entries have substantial English/French descriptions; Race and Culture content includes historical variants for the First through Fourth Ages. The module retains spell-list support and the established Middle-earth settings, including optional Shadow attraction and Corruption features.

The **MERP-RMU Content Language** setting chooses English or French editorial content independently of Foundry's own interface language. English is the default for new Worlds; localized text and display names are available where supplied. Existing Compendium documents are synchronized from their canonical sources when the GM starts the World, while character-owned and independently edited World Items are preserved.

## What's new in 2.0.9

- **Native RMU racial sizes:** Hobbit Small and Troll/Half-Troll Large use their native Decreased Size I / Increased Size II racial Talents, for all appropriate Age variants.
- **Existing characters:** automatically repair a stale Medium Actor frame for eligible MERP-RMU Trolls when the GM opens the World; keep Talent IDs and equipment as-is.
- **Newly dropped equipment:** native RMU applies the appropriate item-size handling. There is no bulk rewriting of previously customized items.
- **Validated in Foundry:** the author confirmed the resulting racial sizes and automatic size correction on item drop.
- **Continuity:** the 2.0.6 Culture Skills contrast/scroll corrections and later interface enhancements remain included.

## What's new in 2.0.8

- **More readable Talents & Flaws tab:** compact 13 px PragRoman descriptions on RMU Actor character sheets, even when the tab loads asynchronously.
- **Concise previews:** descriptions start with an excerpt of up to approximately 150 characters; a bilingual "Read description" / "Lire la description" toggle reveals the complete original rich text without changing its content.
- **No mechanical changes:** costs, tiers, Talent data, native RMU editing controls and the existing creation workflow remain untouched.
- **Safe update from 2.0.7:** the previous character-creation and Compendium typography improvements remain included. No migration is required.

## What's new in 2.0.7

- **Talents & Flaws for every character:** the creation step is always navigable, even when the Race supplies no racial Talent. An explanatory card offers a button to browse the existing MERP-RMU Talents & Flaws Compendium; no free Talents or Development Points are granted.
- **Bilingual editorial presentation:** step guidance follows the MERP-UI Content Language setting, with PragRoman font sizes matching surrounding RMU content.
- **Compendium typography:** the nine MERP-RMU Compendiums use a common PragRoman scale for Item and folder titles, proportional vertical padding, and appropriately sized thumbnails, without fixed row heights.
- **Scope:** no changes to Journals, Actors' existing mechanical data, Compendium entries, or the RMU rules engine.

## What's new in 2.0.6

- **Character sheet reference reading:** Race, Culture and Profession buttons provide on-demand bilingual descriptions from the Compendiums without copying those long texts into the Actor. The compact parchment reader uses PragRoman and matches the character-sheet type scale.
- **Culture Skills:** preserves the list scroll position during rank assignment and restores contrast in RMU's existing All / Choices / Assigned selector.
- **New character compaction:** stops copying all historical Age variants and localization descriptions into newly embedded Race, Culture and Profession Items. Hildor's automatic initial race is covered.
- **Validation:** author-tested with Foundry V14.370 and RMU 1.4.99 on a LIGHT test World. No automatic migration of existing Worlds, no Journal or Scene mutation, and no changes to RMU mechanics.
- **Existing inflated Actors:** not automatically rewritten; keep a backup and use the separately validated LIGHT World migration if necessary.

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

For manual installation, download the official release archive `merp-ui-2.0.9.zip` from the [v2.0.9 release page](https://github.com/Blackbiji/merp-ui/releases/tag/v2.0.9), extract the archive contents into Foundry's `Data/modules/merp-ui/` folder, then enable the module in an RMU World. The nine LevelDB Compendium folders are included in the release ZIP.

**Back up your Worlds and module files before upgrading.** The 2.0.6 reader and Culture Skills fixes, plus the 2.0.5 Hobbit talents and Culture/Hobby layout fixes, have been validated in Foundry by the author. Automated Foundry runtime tests, clean installs and every upgrade path have not been independently verified.

## Developer notes

The installed ZIP contains runtime JavaScript, styles, editorial sources and nine prebuilt LevelDB Compendiums. Development-only build scripts, old NeDB seed files and `package.json` are deliberately excluded. In the development repository, `npm run validate:release` checks the distribution metadata, packaged Compendiums, source references, and bilingual Race descriptions.

The canonical editorial sources are under `source/compendiums/`. For deeper information about source synchronization, see [source/README.md](source/README.md). MERP-UI does not replace the RMU system's own rules, professions or magical effects.

## Licences, credits and non-commercial use

MERP-UI is an **unofficial, free, non-commercial fan project** by **Jean-Brice Gayet**. The accompanying MIT `LICENSE` applies to the original software code and framework only. **Middle-earth, MERP, Rolemaster and RMU** materials, names and intellectual property remain subject to their respective rights holders' terms.

The bundled **PragRoman**, **Initials TFB**, and **Ornaments Labels and Frames** fonts are used for this non-commercial project and are **not covered by the project's MIT licence**. Other artwork, interface assets and fonts likewise retain any applicable separate rights. See [NOTICE.md](NOTICE.md) for attribution and limitations. Original module code and third-party materials must not be treated as a single MIT-licensed work.


The fan project's free status is **not** a blanket licence to reuse earlier ICE MERP publications or Tolkien-related materials. Any adaptations, translations, maps, illustrations or other third-party content require individual review before publication. Permission from an individual adventure author does not cover the wider setting or other parties' rights. See the [release rights checklist](docs/RIGHTS-CHECKLIST-NEXT-RELEASE.md) before packaging or publishing another version.

Issue tracker: https://github.com/Blackbiji/merp-ui/issues
