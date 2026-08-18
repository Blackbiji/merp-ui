# GitHub publication checklist — MERP-UI 1.6.0-rc.1

## Before publishing
- [x] RC built from Foundry-validated `1.6.0-alpha.18`.
- [x] Version bumped to `1.6.0-rc.1`.
- [x] System restricted to `rmu`.
- [x] RMU `1.5.33` dependency/compatibility declared.
- [x] Nine Compendiums declared and grouped under `MERP-RMU`.
- [x] README updated.
- [x] LICENSE clarified and NOTICE added.
- [x] English Compendium bootstrap build validated.
- [ ] Confirm GitHub owner and repository name.
- [ ] Insert final GitHub URLs into `module.json`.
- [ ] Generate/capture final Foundry LevelDB pack directories if desired for stable 1.6.0.
- [ ] Re-test installation from the public manifest URL.

## Suggested GitHub repository
Repository name: `merp-ui`

## Suggested tag
`v1.6.0-rc.1`

## Suggested release assets
- `module.json`
- `merp-ui-1.6.0-rc.1.zip`

Foundry requires the manifest URL to remain stable for update checks, while the
manifest's `download` URL must point to the zip for the current version.

A common GitHub pattern is:

```text
Manifest:
https://github.com/<OWNER>/merp-ui/releases/latest/download/module.json

RC download:
https://github.com/<OWNER>/merp-ui/releases/download/v1.6.0-rc.1/merp-ui-1.6.0-rc.1.zip
```

## After GitHub release
- [ ] Install from the manifest URL into a clean Foundry installation.
- [ ] Confirm module update detection.
- [ ] Confirm RMU dependency behavior.
- [ ] Run final fresh-World regression.
- [ ] Run final 1.5-existing-World regression.
- [ ] If clean, promote to `1.6.0`.
- [ ] Optionally submit/register the package with Foundry's package directory.
