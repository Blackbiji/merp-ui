/**
 * Compare Journal HTML as Foundry's browser stores it.
 * HTML parsing normalizes equivalent serializations such as <br /> / <br>
 * and a literal & / &amp;.  Textual or structural changes still differ.
 *
 * Do not change the source text: normalize only for comparison, so a real
 * update always writes the authored source to the document.
 */
export function equivalentJournalHtml(stored, source) {
  if (stored === source) return true;
  if (typeof stored !== 'string' || typeof source !== 'string') return false;
  // In Foundry the browser's native DOMParser is always available.  Keep
  // the conservative strict comparison in offline test environments.
  if (typeof DOMParser === 'undefined') return false;

  const parser = new DOMParser();
  const canonical = (html) => {
    const dom = parser.parseFromString(
      `<div data-merp-ui-html-compare="1">${html}</div>`, 'text/html'
    );
    return dom.querySelector('[data-merp-ui-html-compare]')?.innerHTML;
  };
  const left = canonical(stored);
  const right = canonical(source);
  return left !== undefined && right !== undefined && left === right;
}
