import { contentLanguage } from "./localization.js";

const MODULE_ID = "merp-ui";
const SETTING_KEY = "welcomeChatPosted";
const FLAG_KEY = "welcomeChat";

// The welcome card is stored as a ChatMessage. Foundry may display that
// message as a transient notification. When its own rules suppress floating
// notifications, display the same content in a dedicated DialogV2 instead.
// The chat history remains unchanged in either case.
let welcomeDialog = null;
let welcomeDialogLanguage = null;

async function showWelcomeDialog(language = contentLanguage()) {
  language = language === "fr" ? "fr" : "en";
  const Dialog = globalThis.foundry?.applications?.api?.DialogV2;
  if (!Dialog) return { shown: false, reason: "dialog-api-unavailable" };

  if (welcomeDialog?.rendered) {
    if (welcomeDialogLanguage === language) {
      welcomeDialog.bringToFront();
      return { shown: true, mode: "dialog", alreadyOpen: true, language };
    }
    // A language switch must refresh the entire dialog, including the
    // Foundry title bar and the closing button.
    await welcomeDialog.close();
    welcomeDialog = null;
  }

  const fr = language === "fr";
  const dialog = new Dialog({
    // Scope the fallback styling to this dialog; do not restyle Foundry's
    // regular chat messages or other applications.
    classes: ["merp-ui-welcome-dialog"],
    window: { title: fr ? "Bienvenue dans MERP-UI" : "Welcome to MERP-UI" },
    content: welcomeContent(language),
    // Comfortable compact width; the height follows localized content.
    position: { width: 540, height: "auto" },
    buttons: [{ action: "close", label: fr ? "Fermer" : "Close", default: true }],
    modal: false
  });
  await dialog.render({ force: true });
  welcomeDialog = dialog;
  welcomeDialogLanguage = language;
  // Reuse the very same action handlers as in the chat card. The two buttons
  // remain operational inside the fallback dialog.
  bindWelcomeActions({
    getFlag: (namespace, key) => namespace === MODULE_ID && key === FLAG_KEY
  }, dialog.element);
  return { shown: true, mode: "dialog", language };
}

function requestWelcomeNotification(message) {
  const chat = globalThis.ui?.chat;
  if (!message || typeof chat?.notify !== "function") {
    return { requested: false, reason: "chat-notifications-unavailable" };
  }
  // Avoid returning a misleading 'requested: true' when Foundry's own UI
  // guard has already ruled out native notifications.
  if (chat.active || chat.isPopout || chat._shouldShowNotifications?.() === false) {
    return { requested: false, reason: "native-notification-not-allowed" };
  }
  try {
    chat.notify(message, { newMessage: true });
    return { requested: true, messageId: message.id, mode: "native" };
  } catch (error) {
    console.warn("merp-ui | Notification de bienvenue indisponible", error);
    return { requested: false, reason: "notification-error" };
  }
}

// This is a visual preview. It never creates a new ChatMessage or changes the
// world's first-run setting. When native notifications are blocked, it opens a
// real Foundry dialog instead of silently failing.
export async function previewWelcomeNotification(options = {}) {
  if (!game.user?.isGM || game.system?.id !== "rmu") {
    return { requested: false, reason: "not-gm-or-rmu" };
  }

  // Preview in the active MERP-UI content language, not the language once
  // stored on an old chat message. Passing { language: "fr" | "en" } opens
  // the dialog directly so either translation can be reviewed on demand.
  const explicitLanguage = typeof options === "string"
    ? options
    : options?.language ?? null;
  if (explicitLanguage !== null && !["fr", "en"].includes(explicitLanguage)) {
    return { requested: false, reason: "invalid-language" };
  }
  const language = explicitLanguage ?? contentLanguage();

  const messages = game.messages?.contents ?? [];
  const message = [...messages].reverse().find(candidate =>
    candidate.getFlag?.(MODULE_ID, FLAG_KEY) === true
  );
  if (!message) return { requested: false, reason: "no-welcome-message" };

  if (explicitLanguage !== null) {
    const dialog = await showWelcomeDialog(language);
    return { requested: false, ...dialog, preview: true, messageId: message.id };
  }

  const notification = requestWelcomeNotification(message);
  if (notification.requested) return notification;
  const fallback = await showWelcomeDialog(language);
  return { ...notification, ...fallback, messageId: message.id };
}

export function registerWelcomeChatSetting() {
  if (game.settings.settings.has(`${MODULE_ID}.${SETTING_KEY}`)) return;

  game.settings.register(MODULE_ID, SETTING_KEY, {
    name: "MERP-UI Welcome Chat Posted",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
}

async function presentationGuidePage() {
  const pack =
    game.packs?.get(`${MODULE_ID}.merp-rmu-rules`) ??
    game.packs?.get("merp-rmu-rules") ??
    null;
  if (!pack) return null;

  const index = await pack.getIndex({
    fields: ["name", "flags.merp-ui.compendiumSourceKey"]
  });

  const entry =
    index.find((item) =>
      item.flags?.[MODULE_ID]?.compendiumSourceKey === "merp-rmu-introduction"
    ) ??
    index.find((item) =>
      String(item.name ?? "").toLowerCase().includes("merp-rmu")
      && String(item.name ?? "").toLowerCase().includes("presentation")
    ) ??
    null;

  if (!entry) return null;

  const journal = await pack.getDocument(entry._id);
  if (!journal) return null;

  const page = journal.pages?.find((candidate) =>
    Boolean(candidate.getFlag?.(MODULE_ID, "settingsGuidePage"))
  ) ?? null;

  return { journal, page };
}

async function openPresentationGuidePage() {
  const target = await presentationGuidePage();
  if (!target?.journal) {
    ui.notifications.warn(
      "MERP UI : le guide de réglages est introuvable dans le Compendium Règles & Références."
    );
    return false;
  }

  const { journal, page } = target;

  // Prefer the embedded page sheet when Foundry exposes it.
  if (page?.sheet?.render) {
    try {
      await page.sheet.render({ force: true });
      return true;
    } catch (_) {
      try {
        page.sheet.render(true);
        return true;
      } catch (_) {}
    }
  }

  // Fallback: open the Journal directly on the requested page.
  const pageId = page?.id ?? null;
  if (journal.sheet?.render) {
    try {
      await journal.sheet.render({
        force: true,
        pageId
      });
      return true;
    } catch (_) {
      try {
        journal.sheet.render(true, { pageId });
        return true;
      } catch (_) {}
    }
  }

  return false;
}

function welcomeContent(language = contentLanguage()) {
  const fr = language === "fr";

  const title = fr
    ? "Bienvenue dans MERP-UI / MERP-RMU"
    : "Welcome to MERP-UI / MERP-RMU";

  const intro = fr
    ? "MERP-UI est prêt. Avant de commencer la création des personnages, vérifiez les réglages de campagne."
    : "MERP-UI is ready. Before starting character creation, review the campaign settings.";

  const bullets = fr
    ? [
        "Choisissez la langue du contenu MERP-RMU.",
        "Définissez l’Âge de la campagne.",
        "Réglez l’activité de l’Ombre et les conséquences de la magie si vous utilisez ces automatisations.",
        "Les Langues de Campagne de la Terre du Milieu sont ajoutées directement au réglage RMU correspondant."
      ]
    : [
        "Choose the MERP-RMU content language.",
        "Set the Campaign Age.",
        "Configure Shadow Activity and magic consequences if you use those automations.",
        "Middle-earth Campaign Languages are inserted directly into the corresponding RMU setting."
      ];

  const guideLabel = fr ? "Afficher le guide de réglages" : "Show Settings Guide";
  const settingsLabel = fr ? "Réglages du Monde" : "Game Settings";

  return `
    <div class="merp-ui-welcome-chat-card" lang="${fr ? "fr" : "en"}">
      <h3><i class="fa-solid fa-compass"></i> ${title}</h3>
      <p>${intro}</p>
      <ul>${bullets.map((entry) => `<li>${entry}</li>`).join("")}</ul>
      <div class="merp-ui-welcome-chat-actions">
        <button type="button" data-merp-ui-action="show-settings-guide">
          <i class="fa-solid fa-book-open"></i><span class="merp-ui-welcome-button-label">${guideLabel}</span>
        </button>
        <button type="button" data-merp-ui-action="open-game-settings">
          <i class="fa-solid fa-gears"></i><span class="merp-ui-welcome-button-label">${settingsLabel}</span>
        </button>
      </div>
    </div>
  `;
}

export async function repostWelcomeChatMessage({
  language = contentLanguage()
} = {}) {
  if (!game.user?.isGM || game.system?.id !== "rmu") {
    return { skipped: true, reason: "not-gm-or-rmu" };
  }

  const message = await ChatMessage.create({
    content: welcomeContent(language),
    whisper: [],
    flags: {
      [MODULE_ID]: {
        [FLAG_KEY]: true,
        language,
        repostedForLanguageChange: true
      }
    }
  });

  return {
    posted: true,
    messageId: message?.id ?? null,
    language
  };
}

export async function maybePostWelcomeChat() {
  if (!game.user?.isGM || game.system?.id !== "rmu") {
    return { skipped: true, reason: "not-gm-or-rmu" };
  }

  const posted = Boolean(game.settings.get(MODULE_ID, SETTING_KEY));
  if (posted) return { skipped: true, reason: "already-posted" };

  const message = await ChatMessage.create({
    content: welcomeContent(contentLanguage()),
    whisper: [],
    flags: {
      [MODULE_ID]: {
        [FLAG_KEY]: true,
        language: contentLanguage()
      }
    }
  });

  await game.settings.set(MODULE_ID, SETTING_KEY, true);
  // At world startup the chat UI may be ready before the sidebar notification
  // queue receives the createChatMessage event. Ask Foundry explicitly; its
  // own UI rules decide whether to show the short-lived floating card.
  const notification = requestWelcomeNotification(message);
  if (!notification.requested) {
    notification.fallback = await showWelcomeDialog(contentLanguage());
  }
  return { posted: true, messageId: message?.id ?? null, notification };
}

function bindWelcomeActions(message, html) {
  if (!message?.getFlag?.(MODULE_ID, FLAG_KEY)) return;

  const root =
    html instanceof HTMLElement ? html :
    html?.[0] instanceof HTMLElement ? html[0] :
    html?.element instanceof HTMLElement ? html.element :
    null;
  if (!root || root.dataset.merpUiWelcomeBound === "1") return;
  root.dataset.merpUiWelcomeBound = "1";

  root.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-merp-ui-action]");
    if (!button) return;

    const action = button.dataset.merpUiAction;
    if (action === "show-settings-guide") {
      event.preventDefault();
      await openPresentationGuidePage();
      return;
    }

    if (action === "open-game-settings") {
      event.preventDefault();
      const SettingsConfig =
        foundry?.applications?.settings?.SettingsConfig ??
        globalThis.SettingsConfig;
      if (SettingsConfig) {
        try {
          const app = new SettingsConfig();
          await app.render?.({ force: true });
        } catch (_) {
          try {
            const app = new SettingsConfig();
            app.render?.(true);
          } catch (_) {}
        }
      }
    }
  });
}

export function registerWelcomeChatHooks() {
  const hook =
    globalThis.game?.release?.generation >= 13
      ? "renderChatMessageHTML"
      : "renderChatMessage";
  Hooks.on(hook, bindWelcomeActions);
}

export async function resetWelcomeChat() {
  await game.settings.set(MODULE_ID, SETTING_KEY, false);
  return { reset: true };
}
