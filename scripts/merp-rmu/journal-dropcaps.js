/**
 * MERP-UI — Lettrines typographiques des Journaux (Foundry V13/V14).
 *
 * Règle éditoriale : une lettrine sur le premier paragraphe rédigé après un
 * chapitre H1. Si la page n'a pas de H1 (ex. guide des herbes), son premier
 * H2/H3 sert de titre de chapitre. Les petits cartouches de métadonnées (Statut,
 * Status...), les citations, les secrets et les éléments d'interface sont ignorés.
 *
 * Le HTML source des Journaux / compendiums n'est jamais sauvegardé ni modifié.
 */
const CONTENT_SELECTOR = ".journal-page-content, .journal-entry-content, .editor-content";
const EDITOR_SELECTOR = '[contenteditable="true"], .ProseMirror, .prosemirror, .tox-edit-area, [role="textbox"]';
const SKIPPED_SELECTOR = [
  "blockquote", "aside", "nav", "header", "footer", "table", "figure", "pre",
  ".secret", "[data-secret]", ".content-embed", ".merp-ui-dropcap",
  ".table-of-contents", ".toc", ".journal-page-nav", ".merp-rmu-source",
  ".notification", ".callout", ".merp-ui-ice-panel"
].join(", ");
const HIDDEN_SELECTOR = '[hidden], [aria-hidden="true"], .secret';
const METADATA_TEXT = /^(?:statut|status|source|sources|version|état|state)\s*:/iu;
const watchers = new WeakMap();

/** Legacy API shim: ornamental initials are font glyphs, never image URLs. */
export function dropcapAsset(_letter) {
  return null;
}

function isEditor(element) {
  return Boolean(element?.closest?.(EDITOR_SELECTOR));
}

function isExcluded(element) {
  return Boolean(element?.closest?.(`${SKIPPED_SELECTOR}, ${HIDDEN_SELECTOR}`));
}

function isValidParagraph(paragraph) {
  if (!paragraph || isEditor(paragraph) || isExcluded(paragraph)) return false;
  const text = paragraph.textContent?.replace(/\s+/g, " ").trim() ?? "";
  if (!text || METADATA_TEXT.test(text)) return false;
  // Un cartouche descriptif de quelques mots n'ouvre pas le chapitre.
  if (paragraph.closest(".merp-rmu-rule-summary") && text.length < 55) return false;
  return Boolean(firstLetter(paragraph));
}

/** Récupère la première lettre du texte, même sous <strong> ou <em>. */
function firstLetter(paragraph) {
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      return !parent || isEditor(parent) || isExcluded(parent)
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    }
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    let offset = 0;
    for (const character of node.textContent ?? "") {
      if (/^[\s«»“”‘’"'([{]$/u.test(character)) {
        offset += character.length;
        continue;
      }
      if (!/^\p{L}$/u.test(character)) return null;
      const normalized = character.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").toUpperCase();
      return /^[A-Z]$/.test(normalized) ? { node, offset, character } : null;
    }
  }
  return null;
}

/**
 * Recherche dans l'ordre réel du DOM : fonctionne même si le H1, un encadré,
 * des H2 et le premier paragraphe sont dans plusieurs wrappers différents.
 */
function firstChapterParagraph(heading, content, nextHeading) {
  const paragraphs = content.querySelectorAll("p");
  for (const paragraph of paragraphs) {
    if (!(heading.compareDocumentPosition(paragraph) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
    if (nextHeading && (nextHeading.compareDocumentPosition(paragraph) &
      Node.DOCUMENT_POSITION_FOLLOWING)) break;
    if (isValidParagraph(paragraph)) return paragraph;
  }
  return null;
}

function decorateParagraph(paragraph) {
  if (!isValidParagraph(paragraph) || paragraph.dataset.merpUiDropcap === "1") return false;
  const first = firstLetter(paragraph);
  if (!first) return false;

  const wrapper = document.createElement("span");
  wrapper.className = "merp-ui-dropcap";
  wrapper.dataset.letter = first.character;

  // Initials TFB uses Latin capitals A-Z, each drawn inside an ornate square.
  // Keep the original accented character for screen readers and normalize
  // only the decorative glyph (e.g. É -> E).
  const glyph = document.createElement("span");
  glyph.className = "merp-ui-dropcap-glyph";
  glyph.textContent = first.character.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toUpperCase();
  glyph.setAttribute("aria-hidden", "true");

  const readable = document.createElement("span");
  readable.className = "merp-ui-dropcap-readable";
  readable.textContent = first.character;
  wrapper.append(glyph, readable);

  // Retirer uniquement la lettre d'origine du texte affiché.
  // Important : la lettrine DOIT être le premier enfant direct du paragraphe.
  // Dans un <strong>/<em>, float:left s'aligne sur la boîte inline, et non
  // sur le bord gauche/haut du paragraphe (décalage observé sous Foundry).
  first.node.deleteData(first.offset, first.character.length);
  paragraph.insertBefore(wrapper, paragraph.firstChild);
  paragraph.dataset.merpUiDropcap = "1";
  paragraph.classList.add("merp-ui-dropcap-paragraph");
  return true;
}

function contentRoots(root) {
  const found = [
    ...(root.matches(CONTENT_SELECTOR) ? [root] : []),
    ...root.querySelectorAll(CONTENT_SELECTOR)
  ];
  // Ne pas traiter à la fois un conteneur général et ses pages imbriquées.
  return found.filter((element) => !isEditor(element) &&
    !element.closest(HIDDEN_SELECTOR) &&
    !found.some((other) => other !== element && element.contains(other)));
}

/** Idempotent, sans écriture dans les documents Foundry. */
export function decorateJournalDropcaps(root) {
  if (!(root instanceof HTMLElement)) return 0;
  let changed = 0;
  for (const content of contentRoots(root)) {
    const h1 = [...content.querySelectorAll("h1")]
      .filter((heading) => !isEditor(heading) && !isExcluded(heading));
    const chapterHeadings = h1.length ? h1 : [...content.querySelectorAll("h2, h3")]
      .filter((heading) => !isEditor(heading) && !isExcluded(heading)).slice(0, 1);

    if (!chapterHeadings.length) {
      // Pages rédigées sans titre HTML : une lettrine sur le premier paragraphe.
      const paragraph = [...content.querySelectorAll("p")].find(isValidParagraph);
      if (decorateParagraph(paragraph)) changed++;
      continue;
    }
    for (let i = 0; i < chapterHeadings.length; i++) {
      const heading = chapterHeadings[i];
      const paragraph = firstChapterParagraph(heading, content, chapterHeadings[i + 1]);
      if (decorateParagraph(paragraph)) changed++;
    }
  }
  return changed;
}

/** Une seule observation par fenêtre ; actualisation lors des changements de page. */
export function observeJournalDropcaps(root) {
  if (!(root instanceof HTMLElement)) return;
  const existing = watchers.get(root);
  if (existing) {
    existing.schedule();
    return;
  }

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (root.isConnected) decorateJournalDropcaps(root);
    });
  };
  const observer = new MutationObserver((mutations) => {
    // Réagir aux nouveaux contenus, pas aux images insérées par MERP-UI.
    if (mutations.some((mutation) => [...mutation.addedNodes].some(
      (node) => node.nodeType === Node.ELEMENT_NODE &&
        !node.classList?.contains("merp-ui-dropcap")
    ))) schedule();
  });
  observer.observe(root, { childList: true, subtree: true });
  watchers.set(root, { schedule, observer });
  schedule();
}
