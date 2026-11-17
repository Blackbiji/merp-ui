# MERP-UI 2.0.9 — Native racial size hotfix

**Release date:** 17 November 2026  
**Priority:** Important rules correction for RMU character size.

## Corrected

- **Hobbits:** their racial Small trait is represented by the native RMU **Decreased Size I** Talent.
- **Trolls and Half-Trolls:** the native RMU **Increased Size II** Talent is granted or normalized, giving the **Large** size category.
- **Existing characters:** a targeted, GM-run migration synchronizes the character's native RMU frame size when the embedded racial Item specifies Large but the character still shows Medium.
- New Race selections and changes are handled through corrected Foundry item hooks. Existing Talent IDs and user-owned items are preserved.
- **Equipment:** native RMU remains responsible for size adjustments when gear is dropped on a character sheet; the module does not bulk-resize existing customized inventory.
- The previously released **Culture Skills contrast** and scroll fixes remain included without modification.

## Validation and compatibility

- **Foundry:** user-confirmed racial sizes, and automatic gear resizing on item drop.
- **Automated tests:** structural source checks and regression tests for actor-frame synchronization, plus the repository's nine-Compendium consistency checks.
- **Safety:** no forced changes to statistics, DP, XP, equipment, token artwork or other races.
- **Installation:** updating from 2.0.8 is recommended; back up the World before updating. The content synchronization reads the new bundled Race sources when the GM opens the World.

This is a free, unofficial, non-commercial fan module for Foundry VTT and Rolemaster Unified.
