# MERP-UI — First-run Settings Guide

Starting with `1.6.0-alpha.9`, MERP-UI displays a quick visual setup guide once
per Foundry client when used with RMU.

The image follows the active MERP-RMU editorial language:

- English: `assets/guides/merp-ui-settings-guide-en.webp`
- French: `assets/guides/merp-ui-settings-guide-fr.webp`

The popup explains:

1. where MERP UI Framework settings are located;
2. how to choose the MERP-RMU content language;
3. how to select the Campaign Age;
4. the Magic / Shadow campaign settings;
5. that MERP-UI inserts Campaign Languages into RMU automatically.

## Console helpers

Open the guide manually:

```js
await MERPUI.showSettingsGuide()
```

Force a specific version:

```js
await MERPUI.showSettingsGuide({ language: "fr" })
await MERPUI.showSettingsGuide({ language: "en" })
```

Reset the one-time first-run marker:

```js
await MERPUI.resetSettingsGuide()
```

Then reload Foundry to test the automatic first-run experience again.
