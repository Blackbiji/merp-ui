import { contentLanguage } from "./localization.js";

/**
 * Presentation order for RMU character creation.
 * RMU retains its own step identifiers: Talents = 5, Combat = 4.
 */
const MODULE_ID = "merp-ui";
const REVIEWED_FLAG = "creationTalentsReviewed";
const CREATION_ORDER = Object.freeze([0, 1, 2, 3, 5, 4]);

export function creationDestination(state, offset) {
  const position = CREATION_ORDER.indexOf(state);
  return position < 0 ? undefined : CREATION_ORDER[position + offset];
}

function actorOf(app) {
  return app?.actor ?? app?.document;
}

function rootOf(app, html) {
  // Foundry V14 can pass only a render PART to renderApplicationV2.
  // The Next/Back controls are in the outer Actor application header, so
  // looking exclusively in the partial HTML silently bypasses this module's
  // Talents -> Combat creation order.
  const appRoot = app?.element?.jquery ? app.element[0] : app?.element;
  const part = html?.jquery ? html[0] : html;
  if (appRoot instanceof HTMLElement) return appRoot;
  if (!(part instanceof HTMLElement)) return null;
  return part.closest(".application, .window-app") ?? part;
}

function currentState(actor) {
  return Number(actor?.getFlag?.("rmu", "state") ?? 0);
}

function isCreation(actor) {
  return actor?.type?.toLowerCase() === "character"
    && Number(actor.system?.view ?? 0) === 0;
}

function localized(fr, en) {
  return contentLanguage() === "fr" ? fr : en;
}

async function moveToStep(actor, step) {
  if (!CREATION_ORDER.includes(step)) return;
  await actor.update({ "flags.rmu.state": step });
}

function insertReviewCheckbox(checklist, actor) {
  const reviewed = actor.getFlag(MODULE_ID, REVIEWED_FLAG) === true;
  const combatRow = [...checklist.querySelectorAll(".rmu-row-checkbox")].find(
    (row) => row.querySelector("label")?.textContent?.match(/combat training|entraînement au combat/i)
  );

  checklist.querySelector("[data-merp-talents-checklist]")?.remove();
  const row = document.createElement("div");
  row.className = "rmu-field-row rmu-row-checkbox";
  row.dataset.merpTalentsChecklist = "true";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "rmu-checkbox";
  checkbox.checked = reviewed;
  checkbox.setAttribute(
    "aria-label",
    localized("Talents & Défauts examinés", "Talents & Flaws reviewed")
  );

  const label = document.createElement("label");
  label.className = "rmu-label";
  label.textContent = localized(
    "Talents & Défauts (à vérifier)",
    "Talents & Flaws (review required)"
  );
  row.append(checkbox, label);
  if (combatRow) combatRow.before(row);
  else checklist.append(row);

  checkbox.addEventListener("change", async () => {
    checkbox.disabled = true;
    try {
      await actor.setFlag(MODULE_ID, REVIEWED_FLAG, checkbox.checked);
    } catch (error) {
      console.error(`${MODULE_ID} | Talent checklist`, error);
      checkbox.checked = !checkbox.checked;
    } finally {
      checkbox.disabled = false;
    }
  });
}

// Keep a single capture handler per actual Foundry application root. RMU's
// native button nodes are often replaced during creation re-renders; wiring
// directly to an old button loses the custom step 5 (Talents & Flaws).
const navigationControllers = new WeakMap();

function wireNavigation(root, actor) {
  let controller = navigationControllers.get(root);
  if (!controller) {
    controller = { actor };
    navigationControllers.set(root, controller);
    root.addEventListener("click", (event) => {
      const target = event.target;
      const control = target?.closest?.(
        ".rmu-click-creation-previous, .rmu-click-creation-forward"
      );
      if (!control || !root.contains(control)) return;
      const currentActor = controller.actor;
      if (!currentActor || !isCreation(currentActor)) return;

      // Use the CURRENT actor state, not the value captured by an old render.
      const state = currentState(currentActor);
      const offset = control.classList.contains("rmu-click-creation-forward") ? 1 : -1;
      const destination = creationDestination(state, offset);
      // This intercept must be on the outer application ROOT, in the capture
      // phase, before the native button's own event delegation can skip state 5.
      event.preventDefault();
      event.stopImmediatePropagation();
      if (destination === undefined) return;
      moveToStep(currentActor, destination).catch((error) => {
        console.error(`${MODULE_ID} | Creation navigation`, error);
      });
    }, { capture: true });
  }
  controller.actor = actor;

  const state = currentState(actor);
  for (const [className, offset] of [
    ["rmu-click-creation-previous", -1],
    ["rmu-click-creation-forward", 1]
  ]) {
    const destination = creationDestination(state, offset);
    const control = root.querySelector(`.${className}`);
    if (!control) continue;
    const enabled = destination !== undefined;
    control.classList.toggle("rmu-btn-disabled", !enabled);
    control.disabled = !enabled;
    control.setAttribute("aria-disabled", String(!enabled));
  }
}

/**
 * The RMU creation sheet does not always build a Talents table when the Race
 * has no racial Talent. A blank page means players often miss this stage.
 * This is a UI-only fallback; it never creates a free Talent or changes DP.
 * Native RMU talent tables remain entirely in charge whenever present.
 */
export function hasCreationTalents(actor) {
  return Array.from(actor?.items ?? []).some(item => ["talent", "flaw"].includes(String(item.type).toLowerCase()));
}

export function shouldShowEmptyTalentsStep(actor, state = currentState(actor)) {
  return Boolean(isCreation(actor) && state === 5 && !hasCreationTalents(actor));
}

const EMPTY_TALENTS_CLASS = "merp-ui-creation-empty-talents";
const EMPTY_TALENTS_HINT = "merpUiCreationEmptyTalents";

function findNativeTalentTable(main) {
  return [...main.querySelectorAll("table, [role='table']")].find(table => {
    if (table.classList.contains("merp-ui-creation-talents-table")) return true;
    const first = table.querySelector("thead, tr:has(th), [role='row']");
    const heading = String(first?.textContent ?? "").replace(/\s+/g, " ").toLowerCase();
    return /talent/.test(heading) && /tier|rang|description|cost|co[uû]t/.test(heading);
  }) ?? null;
}

/**
 * Editorial labels for the always-visible Talents step. Use the MERP-UI
 * Content Language preference (which is independent of Foundry's UI locale).
 */
export function creationTalentsCopy(language = contentLanguage()) {
  if (language === "fr") return {
    title: "Talents & Défauts",
    lead: "Cette race ne confère aucun Talent ou Défaut à la création. Cette étape reste néanmoins accessible à tous les personnages.",
    guidance: "Consultez les Talents et Défauts disponibles pour votre personnage. Leur acquisition et leur coût en Points de Développement restent soumis aux règles RMU.",
    button: "Consulter les Talents & Défauts MERP-RMU",
    footnote: "Vous pouvez poursuivre la création sans ajouter de Talent ni de Défaut.",
    notFound: "Le compendium MERP-RMU — Talents & Défauts est introuvable."
  };
  return {
    title: "Talents & Flaws",
    lead: "This race grants no automatic Talents or Flaws at character creation. This stage remains available to every character.",
    guidance: "Browse the Talents and Flaws available to your character. Their acquisition and Development Point costs remain governed by RMU rules.",
    button: "Browse MERP-RMU Talents & Flaws",
    footnote: "You may continue character creation without adding a Talent or Flaw.",
    notFound: "The MERP-RMU Talents & Flaws Compendium could not be found."
  };
}

/**
 * RMU's sheet can override non-inline CSS while re-rendering a creation step.
 * These styles affect only the new explanatory card and not the native RMU
 * Talents table, character data, or other windows.
 */
function styleEmptyTalents(section) {
  const font = '"PragRoman", Georgia, serif';
  const paint = (element, size, { heading = false } = {}) => {
    element.style.setProperty("font-family", font, "important");
    element.style.setProperty("font-size", size, "important");
    element.style.setProperty("line-height", heading ? "1.2" : "1.32", "important");
    element.style.setProperty("font-weight", heading ? "600" : "400", "important");
    element.style.setProperty("color", "#262626", "important");
    element.style.setProperty("-webkit-text-fill-color", "#262626", "important");
    element.style.setProperty("text-shadow", "none", "important");
  };
  section.style.setProperty("font-family", font, "important");
  section.style.setProperty("font-size", "11px", "important");
  section.style.setProperty("line-height", "1.32", "important");
  for (const element of section.querySelectorAll("p")) paint(element, "11px");
  for (const element of section.querySelectorAll("h2")) paint(element, "13px", { heading: true });
  for (const element of section.querySelectorAll("button")) paint(element, "11px");
}

function createEmptyTalentsStep(actor) {
  const copy = creationTalentsCopy();
  const section = document.createElement("section");
  section.className = `rmu-card with-legend ${EMPTY_TALENTS_CLASS}`;
  section.dataset[EMPTY_TALENTS_HINT] = "true";
  section.dataset.merpUiContentLanguage = contentLanguage();
  section.setAttribute("aria-label", copy.title);

  const heading = document.createElement("h2");
  heading.className = "merp-ui-creation-empty-talents-title";
  heading.textContent = copy.title;

  const lead = document.createElement("p");
  lead.className = "merp-ui-creation-empty-talents-lead";
  lead.textContent = copy.lead;

  const guidance = document.createElement("p");
  guidance.className = "merp-ui-creation-empty-talents-guidance";
  guidance.textContent = copy.guidance;

  const actionRow = document.createElement("div");
  actionRow.className = "merp-ui-creation-empty-talents-actions";
  const button = document.createElement("button");
  button.className = "merp-ui-creation-empty-talents-open";
  button.type = "button";
  button.textContent = copy.button;
  button.addEventListener("click", async event => {
    event.preventDefault();
    event.stopPropagation();
    const pack = game.packs?.get("merp-ui.merp-rmu-talents-flaws");
    if (!pack) {
      ui.notifications?.warn?.(creationTalentsCopy().notFound);
      return;
    }
    await pack.render(true);
  });

  const note = document.createElement("p");
  note.className = "merp-ui-creation-empty-talents-footnote";
  note.textContent = copy.footnote;

  actionRow.append(button);
  section.append(heading, lead, guidance, actionRow, note);
  styleEmptyTalents(section);
  return section;
}

function ensureCreationTalentsStep(root, actor, state) {
  const existing = root.querySelector(`.${EMPTY_TALENTS_CLASS}`);
  // Only show the empty placeholder on the actual Talents stage. Remove it
  // on Back/Next and whenever the actor receives a native racial Talent.
  if (!shouldShowEmptyTalentsStep(actor, state)) {
    existing?.remove();
    return false;
  }
  const main = root.querySelector(".rmu-character-creation-main")
    ?? root.querySelector(".rmu-character-creation")
    ?? root.querySelector(".window-content");
  if (!main) return false;

  if (findNativeTalentTable(main)) {
    existing?.remove();
    return false;
  }
  // A partial RMU render can include no creation container. Avoid accidentally
  // inserting above the Actor header by checking the content hierarchy first.
  if (main.classList.contains("window-content") &&
      !main.querySelector(".rmu-character-creation-main, .rmu-character-creation")) return false;

  if (existing && main.contains(existing) &&
      existing.dataset.merpUiContentLanguage === contentLanguage()) return true;
  existing?.remove();
  const section = createEmptyTalentsStep(actor);
  // Insert at the start of the creation content, not into Foundry's header.
  main.prepend(section);
  return true;
}

function enhance(app, html) {
  const actor = actorOf(app);
  if (game.system?.id !== "rmu" || !actor || !isCreation(actor)) return;

  const root = rootOf(app, html);
  if (!root) return;
  const state = currentState(actor);
  if (!CREATION_ORDER.includes(state)) return;

  // Typography is normalised only while reviewing Talents & Flaws. Do not
  // change the RMU Actor sheet's other creation steps, values or controls.
  const creationMain = root.querySelector(".rmu-character-creation-main")
    ?? root.querySelector(".rmu-character-creation");
  creationMain?.classList.toggle("merp-ui-talents-step-typography", state === 5);

  const checklist = root.querySelector(
    ".rmu-character-creation-main .rmu-card.with-legend:has(.rmu-row-checkbox)"
  ) ?? [...root.querySelectorAll(".rmu-card.with-legend")].find(
    (element) => element.querySelector(".rmu-row-checkbox")
      && element.querySelector('input[name="flags.rmu.stats.rolled"]')
  );
  if (checklist) insertReviewCheckbox(checklist, actor);
  wireNavigation(root, actor);
  ensureCreationTalentsStep(root, actor, state);
}

export function registerCreationTalentsOrder() {
  const onRender = (app, html) => {
    try {
      enhance(app, html);
    } catch (error) {
      console.error(`${MODULE_ID} | Creation talents order`, error);
    }
  };
  Hooks.on("renderApplicationV2", onRender);
  // Some RMU/Foundry integrations dispatch this specific sheet hook instead.
  Hooks.on("renderActorSheet", onRender);
  Hooks.on("updateSetting", setting => {
    if (setting?.key !== `${MODULE_ID}.contentLanguage`) return;
    queueMicrotask(() => {
      for (const app of Object.values(ui?.windows ?? {})) onRender(app, null);
    });
  });
}
