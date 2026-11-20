# MERP-UI — Rights and publication checklist for the next release

**Status: release preparation only — not a licence, legal opinion or clearance.**

This checklist records publishing safeguards consistent with the advice received from the publisher of Rolemaster concerning the free, unofficial MERP-RMU project. It is not an assertion that ICE or any Middle-earth rights holder has authorised the project. Do not include private correspondence or attribute authorisation to anyone in public release materials.

## 1. Naming, credits and dependency

- [x] State in `NOTICE.md`, `README.md` and the Foundry `module.json` description that **Rolemaster Unified (RMU) is a copyrighted and trademarked property of Iron Crown Enterprises Ltd**.
- [x] Explain that **MERP-RMU** is **purely a descriptive project title**, does not challenge ICE's intellectual property or trademarks, and does not imply licence, sponsorship, affiliation or endorsement.
- [x] Identify the project as **free, non-commercial and unofficial**.
- [x] Explain that the module is layered onto the official RMU Foundry implementation. Users must obtain the official RMU system and any relevant commercial modules separately; the fan project must not redistribute those commercial products.
- [ ] Confirm in the **actual packaged ZIP**, including all compiled Compendiums, that paid RMU materials, attack charts, critical tables, purchased rulebook content and proprietary module data are not being redistributed without permission.

## 2. Tolkien / Middle-earth intellectual property

- [x] Explicitly distinguish **ICE's Rolemaster Unified rights** from **the separate rights in Tolkien's Middle-earth**. ICE cannot grant permission for Middle-earth.
- [x] State that neither non-commercial publication nor an author's consent alone establishes general setting rights.
- [ ] Identify the relevant Tolkien/Middle-earth rightsholder(s) for the content and the platform/distribution proposed; consider contacting the current licensed tabletop publisher where appropriate. Do **not** assume that one publisher owns every Tolkien right.
- [ ] Review all included Middle-earth names, texts, maps, images, translations, and setting adaptations against applicable rights and any replies obtained.
- [ ] Confirm Foundry's applicable listing/distribution policy for an unofficial setting adaptation; be prepared to adjust, limit, or remove distribution if requested.

## 3. Existing MERP publications and adventures

- [ ] Conduct a separate review of protected material derived from older ICE MERP supplements and sourcebooks. Do not assume existing MERP material may be scanned, translated, reproduced or packaged because the module is free.
- [ ] For adaptations of original adventures, document the author's **specific permission**, its scope (translation, conversion, publication, images, distribution), and any limitations. Consent of an adventure author does not cover other rights.
- [ ] Keep author permissions and any publisher/rightsholder correspondence in private records. Public notices should describe **status**, not reproduce private correspondence or imply approval.

## 4. Software and bundled assets

- [x] Preserve the separation between the MIT licence for original MERP-UI code and the rights in third-party materials.
- [ ] Confirm licensing, bundling and credits for PragRoman, Initials TFB, Ornaments Labels and Frames, all artwork, icons and other assets, including permission to redistribute font files. Do not assume non-commercial status grants this permission.
- [ ] Inspect the actual release ZIP, not only the source README/NOTICE, and verify the legal notice ships with it.
- [ ] Run the normal release validation and any Foundry runtime tests; this documentation-only branch does not assert that those tests have passed.

## 5. Release decision

- [ ] Record the outcome and any limitations of the separate Middle-earth rights enquiries.
- [ ] Complete the release-specific content review and required acknowledgements.
- [ ] Confirm any separate conditions for FATE/GATES adventure packages.
- [ ] Only then promote the documentation changes into a **new version** and publish a new manifest/ZIP/release.

**Scope of these pending changes:** informational texts, distribution metadata and release checks only. No new permissions are created; no RMU rules, game mechanics, Actors, Journals or LevelDB Compendiums are modified.
