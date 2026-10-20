# MERP-UI 1.6.0 RC4 — Publication preparation

**GitHub repository:** https://github.com/Blackbiji/merp-ui  
**Public default branch:** `main`  
**Latest published pre-release on inspection:** `v1.6.0-rc.3` (19 October 2026)  
**Review branch:** `review/1.6.0-rc4-prepublication`  
**Proposed version:** `1.6.0-rc.4` — **not published**

The user's private RC4 patch has undergone offline checks. The Talent display changes were validated interactively in Foundry; a full fresh/upgrade install regression run is still required. GitHub's `main` also contains changes made after the local RC3 archive was produced: reconcile and review those differences before merging any code.

## Release gate

1. Compare the live `main` tree and private RC4 work file by file, preserving both histories.
2. Review the original code changes (herb option labels and Talent table contrast), with a minimal, inspectable diff.
3. Audit third-party material in `data/`, `source/`, `packs/`, `fonts/` and `assets/`; refer to [rights review](RIGHTS-REVIEW-RC4.md).
4. Keep the package manifest at RC3 until a legally redistributable RC4 release ZIP and download URL are ready. Do not publish a manifest pointing to an asset that does not exist.
5. Run offline tests and Foundry installation/upgrade tests on the exact final distribution.
6. Obtain the maintainer's final approval; only then merge, tag `v1.6.0-rc.4`, upload the release assets, verify URLs and announce the release.

**Current review branch does not constitute a functional RC4 release.**
