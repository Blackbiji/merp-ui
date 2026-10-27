/**
 * MERP-UI RC5: fail-safe registration of the world settings.
 *
 * Both MERP-UI's visual entry point and the MERP-RMU content entry point call
 * this function. A failure to load the visual bundle must never remove the
 * FR/EN selector, because the content entry point still needs it.
 */
const MODULE_ID = "merp-ui";

function registerOnce(key, definition) {
  const fullKey = `${MODULE_ID}.${key}`;
  if (game.settings.settings?.has?.(fullKey)) return false;
  game.settings.register(MODULE_ID, key, definition);
  return true;
}

export function registerMerpUiCoreSettings({ onLanguageChange } = {}) {
  const registered = {};

  registered.contentLanguage = registerOnce("contentLanguage", {
    name: "MERPUI.Settings.ContentLanguage.Name",
    hint: "MERPUI.Settings.ContentLanguage.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: { fr: "Français", en: "English" },
    default: "en",
    requiresReload: false,
    onChange: (value) => {
      // Do not rewrite the selected setting: Foundry already saved it.
      // Let the content engine update world documents and Compendium display.
      queueMicrotask(() => {
        try {
          Promise.resolve(onLanguageChange?.(value)).catch((error) => {
            console.error("merp-ui | MERP-RMU language update failed", error);
            ui?.notifications?.error?.("MERP-UI: language refresh failed; inspect F12 console.");
          });
        } catch (error) {
          console.error("merp-ui | MERP-RMU language update failed", error);
          ui?.notifications?.error?.("MERP-UI: language refresh failed; inspect F12 console.");
        }
      });
    }
  });

  registered.themeEnabled = registerOnce("themeEnabled", {
    name: "MERPUI.Settings.ThemeEnabled.Name",
    hint: "MERPUI.Settings.ThemeEnabled.Hint",
    scope: "world", config: true, type: Boolean, default: true
  });

  registered.defaultIconSize = registerOnce("defaultIconSize", {
    name: "MERPUI.Settings.DefaultIconSize.Name",
    hint: "MERPUI.Settings.DefaultIconSize.Hint",
    scope: "world", config: true, type: Number, default: 48
  });

  registered.webpMigrationVersion = registerOnce("webpMigrationVersion", {
    name: "Version de migration WebP", scope: "world", config: false,
    type: String, default: ""
  });

  return registered;
}
