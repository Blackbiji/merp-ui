/**
 * MERP-UI TEST — RMU Culture Skills:
 * 1) keep the position of the list when a rank assignment causes a rerender;
 * 2) load narrowly scoped styles for RMU's existing culture view selector.
 *
 * Does not change any RMU methods, ranks, Actor documents or selection data.
 * Foundry V14.370 / RMU 1.4.99 compatibility test.
 */
const CULTURE_TABLE = 'table.rmu-culture-rank-selection-table';
const CULTURE_VIEW = 'select[name="system._cultureViewSelection"]';
const STYLE_ID = 'merp-ui-culture-view-test-style';
const stateByApp = new WeakMap();

function attachStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const link = document.createElement('link');
  link.id = STYLE_ID;
  link.rel = 'stylesheet';
  const route = 'modules/merp-ui/styles/merp-rmu-culture-view-test.css';
  link.href = globalThis.foundry?.utils?.getRoute?.(route) ?? '/' + route;
  document.head.append(link);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attachStyle, { once: true });
} else attachStyle();

function getRoot(app, html) {
  const node = app?.element?.[0] ?? app?.element ?? html?.[0] ?? html;
  return node instanceof HTMLElement ? node : null;
}

function getScroller(root) {
  const table = root?.querySelector(CULTURE_TABLE);
  if (!table) return null;
  // Prefer the closest *actually scrollable* ancestor, not the whole sheet.
  for (let el = table.parentElement; el && root.contains(el); el = el.parentElement) {
    const style = getComputedStyle(el);
    const hasScroll = el.scrollHeight > el.clientHeight + 2;
    if (hasScroll && /auto|scroll|overlay/.test(style.overflowY)) return el;
  }
  // Some RMU layouts use overflow: hidden with a controlled scrollTop.
  for (let el = table.parentElement; el && root.contains(el); el = el.parentElement) {
    if (el.scrollTop > 0 && el.scrollHeight > el.clientHeight + 2) return el;
  }
  return null;
}

function viewOf(root) {
  return root.querySelector(CULTURE_VIEW)?.value ?? null;
}

function scheduleRestore(app, state) {
  if (!state.pending || state.scheduled) return;
  state.scheduled = true;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    state.scheduled = false;
    if (!state.pending || Date.now() - state.started > 1200) return;
    const root = getRoot(app);
    if (!root?.isConnected || viewOf(root) !== state.mode) return;
    const scroller = getScroller(root);
    if (!scroller) return;
    const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const target = Math.max(0, Math.min(state.top, max));
    if (Math.abs(scroller.scrollTop - target) > 1) scroller.scrollTop = target;
  }));
}

function bindRoot(root, app, state) {
  if (state.boundRoots.has(root)) return;
  state.boundRoots.add(root);

  function remember(event) {
    if (event.type === 'keydown' && !['Enter', ' ', 'Space', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (!target?.closest?.(CULTURE_TABLE) || !root.contains(target)) return;
    if (target.closest(CULTURE_VIEW)) return; // allow RMU to change modes freely
    const scroller = getScroller(root);
    if (!scroller) return;
    state.top = scroller.scrollTop;
    state.mode = viewOf(root);
    state.started = Date.now();
    state.pending = true;
  }

  root.addEventListener('pointerdown', remember, true);
  root.addEventListener('keydown', remember, true);
  root.addEventListener('click', remember, true);
  root.addEventListener('change', event => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (!target?.matches?.(CULTURE_VIEW)) return;
    state.pending = false; // intentional filter changes are native RMU behavior
  }, true);

  // If user deliberately starts scrolling, stop restoring the prior position.
  for (const type of ['wheel', 'touchmove']) {
    root.addEventListener(type, event => {
      const target = event.target instanceof Element ? event.target : event.target?.parentElement;
      if (target?.closest?.('.rmu-culture-skill-elections-table') || target?.closest?.(CULTURE_TABLE)) {
        state.pending = false;
      }
    }, { capture: true, passive: true });
  }

  const observer = new MutationObserver(mutations => {
    if (!state.pending) return;
    if (!mutations.some(m => m.type === 'childList')) return;
    scheduleRestore(app, state);
  });
  observer.observe(root, { childList: true, subtree: true });
}

Hooks.on('renderApplicationV2', (app, html) => {
  const root = getRoot(app, html);
  if (!root?.querySelector(CULTURE_TABLE) || !root.querySelector(CULTURE_VIEW)) return;
  let state = stateByApp.get(app);
  if (!state) {
    state = { top: 0, mode: null, started: 0, pending: false, scheduled: false, boundRoots: new WeakSet() };
    stateByApp.set(app, state);
  }
  bindRoot(root, app, state);
  scheduleRestore(app, state);
});
