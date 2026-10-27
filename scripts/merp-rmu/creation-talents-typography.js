/**
 * Normalise the rich HTML of racial Talents in RMU character creation.
 * Sizes are read from the neighbouring INSTRUCTIONS panel rather than
 * assuming that Foundry's root rem equals a particular pixel size.
 *
 * Presentation only. This deliberately does not touch Talent document data.
 */

function ownText(element) {
  return [...element.childNodes]
    .filter(node => node.nodeType === 3)
    .map(node => node.nodeValue || "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function fontPixels(element) {
  const size = Number.parseFloat(getComputedStyle(element).fontSize);
  return Number.isFinite(size) && size >= 10 && size <= 24 ? size : null;
}

/**
 * Search inside the neighbouring INSTRUCTIONS frame.
 * In some RMU layouts the instructional paragraphs are plain DIV text, not P.
 */
export function findInstructionsFontSize(root, talentTable) {
  const heading = [...root.querySelectorAll("h1,h2,h3,h4,h5,h6,legend,header,strong,span,div,label")]
    .find(el => /^instructions$/i.test(ownText(el)));
  if (!heading) return null;

  const tableRect = talentTable.getBoundingClientRect();
  for (let parent = heading.parentElement, depth = 0; parent && depth < 6; parent = parent.parentElement, depth++) {
    const candidates = [...parent.querySelectorAll("p,li,div,span")]
      .filter(el => {
        if (el === heading || el.contains(heading) || el.closest(".merp-ui-creation-talents-table")) return false;
        // Target actual prose, avoiding ribbon labels, section headings and buttons.
        if (ownText(el).length < 38) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && (!tableRect.width || r.left >= tableRect.right - 25);
      });
    for (const candidate of candidates) {
      const px = fontPixels(candidate);
      if (px) return px;
    }
  }
  return null;
}

/** Apply an explicit, inspected pixel size to override RMU's heading/body rules. */
export function applyCreationTalentTypography(root, defaultPixels = 16) {
  if (!root?.querySelectorAll || typeof getComputedStyle !== "function") return {tables: 0, size: null};
  let tables = 0;
  let size = null;
  for (const table of root.querySelectorAll(".merp-ui-creation-talents-table")) {
    const base = findInstructionsFontSize(root, table) ?? defaultPixels;
    if (!Number.isFinite(base) || base <= 0) continue;
    size = base;
    table.dataset.merpUiTalentFontPx = String(base);

    // Inline !important overrides both the Foundry AppV2 defaults and the
    // more-specific MERP-UI actor selectors regardless of stylesheet order.
    for (const el of table.querySelectorAll("h1,h2,h3,h4,h5,h6,p,li")) {
      if (!el.closest("td,[role='cell']")) continue;
      const isMainHeading = el.matches("h1");
      const isHeading = isMainHeading || el.matches("h2,h3,h4,h5,h6");
      // In the creation grid the Talent name already has its own column.
      // Keep rich headings compact, at the same size as the instructions,
      // rather than inheriting item-sheet h1/h2 typography.
      el.style.setProperty("font-size", String(base) + "px", "important");
      el.style.setProperty("line-height", isHeading ? "1.28" : "1.35", "important");
      if (isHeading) {
        el.style.setProperty("margin", isMainHeading ? "3px 0 2px" : "3px 0 2px", "important");
        el.style.setProperty("padding", "0", "important");
      }
    }
    tables++;
  }
  return {tables, size};
}
