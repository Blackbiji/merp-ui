# MERP-UI 1.6.0 RC4 — Third-party distribution review

**Status: pending.** This is a preparation document, not an authorization or legal clearance.

The repository is public and currently serves release `v1.6.0-rc.3`. The RC4 working copy contains additional localized content, and **must not be uploaded as a full public archive** before the distribution rights are resolved.

| Area | Review required |
| --- | --- |
| Original MERP-UI code and UI styles | Check authorship and any copied third-party dependencies; the project's MIT licence covers only original code |
| Middle-earth / MERP texts, adaptations and translations | Confirm authorization for the actual text and Compendium content, including translated or adapted versions |
| RMU rules material / tables / mechanics expressed as compiled data | Verify the applicable licensing and redistribution requirements |
| Fonts and typefaces | Check each font's licence, bundling rights and attribution requirements |
| Art, icons and tokens | Check source, rights, generation provenance and any redistribution conditions |
| Full installation ZIP | Build only after all included assets and content are cleared |

The module's non-commercial status and existing `NOTICE.md` do not themselves establish redistribution permission. **Some third-party materials are already present on the public RC3 branch and release:** the review therefore also applies to existing publications, not just new RC4 additions.

## Before publication

- [ ] Establish rights/permission boundaries for each class of MERP/RMU material.
- [ ] Confirm licensing and attribution for fonts and images.
- [ ] Review code licence scope and incorporated third-party snippets.
- [ ] Decide whether a full redistributable module is permitted; if not, distribute only cleared components, clearly labelled as non-installable without required dependencies/content.
- [ ] Validate fresh installation, upgrade, and both UI languages in Foundry/RMU.
- [ ] Approve the exact release tree and ZIP before updating `main`, tags or release assets.

Do not publish the private RC4 ZIP from this working process until these checks are complete.

## Specific font issue found in the private RC3 archive

The archive includes `fonts/PragRoman.ttf`, `fonts/PragRoman.sfd`, and other PragRoman files. It also includes `fonts/fennas-typeface-fontforge-kit/LICENSE-SOURCES.txt`, which expressly says *"Ce kit ne contient ni PragRoman ni contours extraits de PragRoman"* (the kit contains neither PragRoman nor outlines derived from it). That statement does **not** license the separately bundled PragRoman files. Do not assume they are cleared for redistribution merely because the project's CSS references them. Check their actual origin/licence, obtain permission, or replace them with a cleared font and test the visual layout.

This concern may apply to the existing RC3 public release as well as RC4.
