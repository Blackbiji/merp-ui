import { contentLanguage } from "./localization.js";

const MODULE_ID = "merp-ui";
const SETTING_KEY = "welcomeChatPosted";
const FLAG_KEY = "welcomeChat";

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
    <div class="merp-ui-welcome-chat-card">
      <h3><i class="fa-solid fa-compass"></i> ${title}</h3>
      <p>${intro}</p>
      <ul>${bullets.map((entry) => `<li>${entry}</li>`).join("")}</ul>
      <div class="merp-ui-welcome-chat-actions">
        <button type="button" data-merp-ui-action="show-settings-guide">
          <i class="fa-solid fa-book-open"></i> ${guideLabel}
        </button>
        <button type="button" data-merp-ui-action="open-game-settings">
          <i class="fa-solid fa-gears"></i> ${settingsLabel}
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
  return { posted: true, messageId: message?.id ?? null };
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
