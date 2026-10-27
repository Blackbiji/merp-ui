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
  const candidate = html?.jquery ? html[0] : html;
  if (candidate instanceof HTMLElement) return candidate;
  return app.element instanceof HTMLElement ? app.element : app.element?.[0];
}

function currentState(actor) {
  return Number(actor?.getFlag?.("rmu", "state") ?? 0);
}

function isCreation(actor) {
  return actor?.type?.toLowerCase() === "character"
    && Number(actor.system?.view ?? 0) === 0;
}

function localized(fr, en) {
  return game.i18n?.lang === "fr" ? fr : en;
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

function wireNavigation(root, actor, state) {
  const controls = [
    ["rmu-click-creation-previous", creationDestination(state, -1)],
    ["rmu-click-creation-forward", creationDestination(state, 1)]
  ];

  for (const [className, destination] of controls) {
    const control = root.querySelector(`.${className}`);
    if (!control) continue;

    const enabled = destination !== undefined;
    control.classList.toggle("rmu-btn-disabled", !enabled);
    control.disabled = !enabled;
    control.setAttribute("aria-disabled", String(!enabled));

    // Intercept native +/-1 navigation only in character creation.
    control.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!enabled) return;
      moveToStep(actor, destination).catch((error) => {
        console.error(`${MODULE_ID} | Creation navigation`, error);
      });
    }, { capture: true });
  }
}

function enhance(app, html) {
  if (app?.constructor?.name !== "CharacterSheetV2RMU") return;
  const actor = actorOf(app);
  if (!actor || !isCreation(actor)) return;

  const root = rootOf(app, html);
  if (!root) return;
  const state = currentState(actor);
  if (!CREATION_ORDER.includes(state)) return;

  const checklist = root.querySelector(
    ".rmu-character-creation-main .rmu-card.with-legend:has(.rmu-row-checkbox)"
  ) ?? [...root.querySelectorAll(".rmu-card.with-legend")].find(
    (element) => element.querySelector(".rmu-row-checkbox")
      && element.querySelector('input[name="flags.rmu.stats.rolled"]')
  );
  if (checklist) insertReviewCheckbox(checklist, actor);
  wireNavigation(root, actor, state);
}

export function registerCreationTalentsOrder() {
  Hooks.on("renderApplicationV2", (app, html) => {
    try {
      enhance(app, html);
    } catch (error) {
      console.error(`${MODULE_ID} | Creation talents order`, error);
    }
  });
}
