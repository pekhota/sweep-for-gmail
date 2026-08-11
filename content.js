/**
 * Similar & Purge for Gmail
 *
 * Adds a "Similar" split button to the toolbar while a conversation is open. It reads the
 * sender off the open message, hands a query to Gmail's own search, waits for the results
 * and ticks select-all across every match — leaving Gmail's Delete button to do the rest.
 * The caret half opens a panel for narrowing the query down first.
 *
 * Also mirrors Gmail's pagination to the bottom of list views, since Gmail only offers it
 * at the top.
 *
 * Nothing leaves the page: no network calls, no API, no OAuth.
 */

(() => {
  'use strict';

  if (window.__similarAndPurgeLoaded) return;
  window.__similarAndPurgeLoaded = true;

  const STORAGE_KEY = 'sp:lastFilters';

  /* ------------------------------------------------------------------ *
   * Small helpers
   * ------------------------------------------------------------------ */

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Poll `fn` until it returns something truthy, or give up. */
  async function waitFor(fn, { timeout = 8000, interval = 120 } = {}) {
    const deadline = Date.now() + timeout;
    for (;;) {
      let value = null;
      try {
        value = fn();
      } catch {
        value = null;
      }
      if (value) return value;
      if (Date.now() >= deadline) return null;
      await sleep(interval);
    }
  }

  /** Gmail's buttons listen for the full mouse sequence, not just `click`. */
  function realClick(el) {
    if (!el) return false;
    const opts = { bubbles: true, cancelable: true, view: window };
    el.dispatchEvent(new MouseEvent('mouseover', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
    return true;
  }

  function throttleTrailing(fn, wait) {
    let timer = null;
    return () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        fn();
      }, wait);
    };
  }

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function loadFilters() {
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEY);
      return stored?.[STORAGE_KEY] || null;
    } catch {
      return null;
    }
  }

  async function saveFilters(filters) {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: filters });
    } catch {
      /* storage is a convenience, never a hard dependency */
    }
  }

  /* ------------------------------------------------------------------ *
   * Reading the open conversation
   * ------------------------------------------------------------------ */

  const toolbar = () => document.querySelector('div[gh="mtb"]');

  /** Message containers Gmail tags with `data-message-id` — only present in a thread. */
  const messageEls = () => [...document.querySelectorAll('div[role="main"] [data-message-id]')];

  const isThreadOpen = () => messageEls().length > 0;

  /** The signed-in address, so we can push "me" to the bottom of the sender list. */
  function selfEmail() {
    const el = document.querySelector('a[aria-label*="Google Account"], a[href*="SignOutOptions"]');
    const label = el?.getAttribute('aria-label') || '';
    const match = label.match(/[\w.+-]+@[\w.-]+\.\w+/);
    return match ? match[0].toLowerCase() : null;
  }

  /** Distinct senders in the open thread, newest first, own address last. */
  function threadSenders() {
    const me = selfEmail();
    const found = [];

    for (const msg of messageEls()) {
      const span = msg.querySelector('span[email]');
      const email = (span?.getAttribute('email') || '').trim().toLowerCase();
      if (!email) continue;
      const name = (span.getAttribute('name') || span.textContent || '').trim() || email;
      found.push({ email, name });
    }

    const seen = new Set();
    const unique = [];
    for (const sender of found.reverse()) {
      if (seen.has(sender.email)) continue;
      seen.add(sender.email);
      unique.push(sender);
    }

    unique.sort((a, b) => Number(a.email === me) - Number(b.email === me));
    return unique;
  }

  /* ------------------------------------------------------------------ *
   * Query building + navigation
   * ------------------------------------------------------------------ */

  function buildQuery(state) {
    const parts = [`from:${state.sender}`];
    if (state.age) parts.push(`older_than:${state.age}`);
    if (state.read === 'unread') parts.push('is:unread');
    if (state.read === 'read') parts.push('is:read');
    if (state.attachment) parts.push('has:attachment');
    if (state.size) parts.push(`larger:${state.size}`);
    if (state.inboxOnly) parts.push('in:inbox');
    if (state.skipStarred) parts.push('-is:starred');
    if (state.skipImportant) parts.push('-is:important');
    return parts.join(' ');
  }

  /** Hash-only navigation keeps the /mail/u/N/ account index intact. */
  function gotoSearch(query) {
    location.hash = `#search/${encodeURIComponent(query)}`;
  }

  /* ------------------------------------------------------------------ *
   * Driving Gmail's own selection
   * ------------------------------------------------------------------ */

  function selectAllCheckbox() {
    const tb = toolbar();
    return tb ? tb.querySelector('[role="checkbox"]') : null;
  }

  /** The "Select all N conversations that match this search" affordance. */
  function selectAllMatchingLink() {
    const candidates = [
      ...document.querySelectorAll(
        'div[role="main"] span[role="button"], div[role="main"] [role="link"], div[role="main"] span.Ru'
      ),
    ];
    return (
      candidates.find((el) => {
        const text = (el.textContent || '').trim();
        return /select all/i.test(text) && /\d/.test(text);
      }) || null
    );
  }

  /**
   * The toolbar lives inside `div[role="main"]`, so its own select-all checkbox has to be
   * excluded or the count comes back one too high.
   */
  function selectedRowCount() {
    return [...document.querySelectorAll('div[role="main"] [role="checkbox"][aria-checked="true"]')].filter(
      (cb) => !cb.closest('div[gh="mtb"]')
    ).length;
  }

  /**
   * Select everything the current search matched, leaving Gmail's own banner and ticked
   * rows to report the result. Only reports back whether it got anywhere.
   */
  async function selectAllResults() {
    const checkbox = await waitFor(selectAllCheckbox, { timeout: 8000 });
    if (!checkbox) return { ok: false, reason: "couldn't find Gmail's select-all checkbox" };

    if (checkbox.getAttribute('aria-checked') !== 'true') {
      realClick(checkbox);
    }

    // Give the page a beat to render the "All N on this page are selected" banner.
    const link = await waitFor(selectAllMatchingLink, { timeout: 2500, interval: 100 });
    let allMatching = false;
    if (link) {
      realClick(link);
      allMatching = true;
      await sleep(400);
    }

    if (!allMatching && selectedRowCount() === 0) {
      return { ok: false, reason: 'nothing got selected — the search may have returned no results' };
    }

    return { ok: true };
  }

  /* ------------------------------------------------------------------ *
   * UI — the panel and the pager live in a shadow root so Gmail's CSS
   * can't reach them and ours can't leak into Gmail.
   * ------------------------------------------------------------------ */

  const SHADOW_CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: "Google Sans", Roboto, Arial, sans-serif; }

    :host {
      --bg: #fff; --fg: #202124; --muted: #5f6368; --border: #dadce0;
      --field: #fff; --accent: #1a73e8; --chip: #f1f3f4;
    }
    @media (prefers-color-scheme: dark) {
      :host {
        --bg: #2a2b2d; --fg: #e8eaed; --muted: #9aa0a6; --border: #5f6368;
        --field: #202124; --accent: #8ab4f8; --chip: #3c4043;
      }
    }

    .panel {
      position: fixed;
      z-index: 2147483000;
      background: var(--bg);
      color: var(--fg);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 8px 28px rgba(0,0,0,.22);
      width: 330px; padding: 14px; font-size: 13px;
    }
    .panel h2 { margin: 0 0 10px; font-size: 14px; font-weight: 500; }
    .panel .sub { color: var(--muted); font-size: 12px; margin: -6px 0 12px; }

    label.row { display: block; margin: 0 0 10px; }
    label.row > span { display: block; color: var(--muted); font-size: 11px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .4px; }

    select {
      width: 100%; height: 32px; padding: 0 8px;
      border: 1px solid var(--border); border-radius: 6px;
      background: var(--field); color: var(--fg); font-size: 13px;
    }

    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

    .checks { margin: 4px 0 12px; display: grid; gap: 6px; }
    .checks label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .checks input { margin: 0; accent-color: var(--accent); }

    .query {
      background: var(--chip); border-radius: 6px; padding: 8px 10px; margin: 0 0 12px;
      font-family: "Roboto Mono", Menlo, monospace; font-size: 11.5px;
      color: var(--fg); word-break: break-all; line-height: 1.5;
    }

    .actions { display: flex; gap: 8px; }
    .actions button {
      flex: 1; height: 34px; border-radius: 17px; border: 1px solid var(--border);
      background: transparent; color: var(--fg); font-size: 13px; font-weight: 500; cursor: pointer;
    }
    .actions button:hover { background: var(--chip); }
    .actions button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
    @media (prefers-color-scheme: dark) { .actions button.primary { color: #202124; } }
    .actions button.primary:hover { filter: brightness(1.08); }
    .actions button.ghost { flex: 0 0 auto; padding: 0 14px; }

  `;

  /**
   * The pager gets its own sheet because it lives in its own shadow root — it has to be
   * plantable inline inside Gmail's nav, not just floating over the page.
   */
  /**
   * Every colour comes from custom properties set at runtime off Gmail's own sidebar —
   * Gmail themes are background images with translucent overlays, so a fixed palette (or
   * `prefers-color-scheme`) gets it wrong on anything but the plain white theme.
   */
  const PAGER_CSS = `
    :host { all: initial; display: block; }
    * { box-sizing: border-box; }

    .pager {
      display: inline-flex;
      align-items: center;
      font: 400 12px/16px Roboto, Arial, sans-serif;
      letter-spacing: .1px;
      color: var(--muted, #5f6368);
    }

    .pager-label {
      margin: 0 6px;
      white-space: nowrap;
    }

    .pager button {
      flex: 0 0 auto;
      display: inline-flex; align-items: center; justify-content: center;
      width: 26px; height: 26px; padding: 0; margin: 0;
      border: 0; border-radius: 50%;
      background: transparent;
      color: inherit;
      cursor: pointer;
      transition: background-color .12s ease;
    }
    .pager button:hover:not(:disabled) { background: var(--hover, rgba(0,0,0,.07)); color: var(--fg, #202124); }
    .pager button:focus-visible { outline: 2px solid #8ab4f8; outline-offset: -2px; }
    .pager button:disabled { opacity: .35; cursor: default; }
    .pager button svg { pointer-events: none; display: block; }

    /* Centred just above the list footer, in Gmail's own footer type. */
    .pager.footer {
      gap: 2px;
      padding: 6px 0 10px;
    }

    /* Fallback when the footer can't be found. */
    .pager.floating {
      gap: 4px; padding: 5px 10px; border-radius: 22px;
      background: var(--scrim, rgba(255,255,255,.94));
      border: 1px solid var(--edge, rgba(0,0,0,.10));
      box-shadow: 0 3px 14px rgba(0,0,0,.28);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
  `;

  const host = document.createElement('div');
  host.id = 'sp-shadow-host';
  host.style.cssText = 'all:initial;position:static;';
  const shadow = host.attachShadow({ mode: 'open' });
  const styleEl = document.createElement('style');
  styleEl.textContent = SHADOW_CSS;
  shadow.append(styleEl);
  document.documentElement.append(host);

  /**
   * Nothing user-facing is reported: Gmail already shows its own search state, empty
   * results and selection banner. Failures go to the console for debugging only.
   */
  const warn = (...args) => console.warn('[Similar & Purge]', ...args);

  /* ---------------------------- the panel ---------------------------- */

  const DEFAULT_FILTERS = {
    age: '',
    read: 'any',
    attachment: false,
    size: '',
    inboxOnly: false,
    skipStarred: true,
    skipImportant: false,
  };

  let panel = null;
  let panelState = { ...DEFAULT_FILTERS, sender: '' };

  function closePanel() {
    panel?.remove();
    panel = null;
    document.querySelector('.sp-options')?.setAttribute('aria-expanded', 'false');
  }

  /** One click, no panel: everything from the sender of the open message, auto-selected. */
  async function runQuickSearch() {
    const senders = threadSenders();
    if (!senders.length) {
      warn("couldn't read the sender of the open conversation");
      return;
    }
    closePanel();
    const query = `from:${senders[0].email}`;
    gotoSearch(query);
    await runSelectFlow(query);
  }

  async function openPanel(anchorEl) {
    if (panel) {
      closePanel();
      return;
    }

    const senders = threadSenders();
    if (!senders.length) {
      warn("couldn't read the sender of the open conversation");
      return;
    }

    const saved = await loadFilters();
    panelState = { ...DEFAULT_FILTERS, ...(saved || {}), sender: senders[0].email };

    panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML = `
      <h2>Find similar emails</h2>
      <div class="sub">Everything from one sender, narrowed down.</div>

      <label class="row">
        <span>Sender</span>
        <select data-field="sender">
          ${senders
            .map(
              (s) =>
                `<option value="${escapeHtml(s.email)}">${escapeHtml(
                  s.name === s.email ? s.email : `${s.name} · ${s.email}`
                )}</option>`
            )
            .join('')}
        </select>
      </label>

      <div class="grid">
        <label class="row">
          <span>Older than</span>
          <select data-field="age">
            <option value="">Any age</option>
            <option value="7d">7 days</option>
            <option value="1m">1 month</option>
            <option value="6m">6 months</option>
            <option value="1y">1 year</option>
            <option value="2y">2 years</option>
          </select>
        </label>
        <label class="row">
          <span>Read state</span>
          <select data-field="read">
            <option value="any">Any</option>
            <option value="unread">Unread only</option>
            <option value="read">Read only</option>
          </select>
        </label>
      </div>

      <label class="row">
        <span>Larger than</span>
        <select data-field="size">
          <option value="">Any size</option>
          <option value="1M">1 MB</option>
          <option value="5M">5 MB</option>
          <option value="10M">10 MB</option>
          <option value="25M">25 MB</option>
        </select>
      </label>

      <div class="checks">
        <label><input type="checkbox" data-field="attachment"> Has an attachment</label>
        <label><input type="checkbox" data-field="inboxOnly"> Inbox only (skip archived)</label>
        <label><input type="checkbox" data-field="skipStarred"> Keep starred</label>
        <label><input type="checkbox" data-field="skipImportant"> Keep important</label>
      </div>

      <div class="query"></div>

      <div class="actions">
        <button class="ghost" data-act="search">Search</button>
        <button class="primary" data-act="select">Search &amp; select all</button>
      </div>
    `;

    // Reflect saved state into the controls.
    for (const el of panel.querySelectorAll('[data-field]')) {
      const field = el.dataset.field;
      if (el.type === 'checkbox') el.checked = Boolean(panelState[field]);
      else el.value = panelState[field] ?? '';
    }

    const queryEl = panel.querySelector('.query');
    const refresh = () => {
      queryEl.textContent = buildQuery(panelState);
    };
    refresh();

    panel.addEventListener('change', (event) => {
      const el = event.target.closest('[data-field]');
      if (!el) return;
      panelState[el.dataset.field] = el.type === 'checkbox' ? el.checked : el.value;
      refresh();
      const { sender, ...filters } = panelState;
      saveFilters(filters);
    });

    panel.addEventListener('click', async (event) => {
      const btn = event.target.closest('[data-act]');
      if (!btn) return;
      const query = buildQuery(panelState);
      closePanel();
      gotoSearch(query);
      if (btn.dataset.act === 'select') await runSelectFlow(query);
    });

    // Anchor under the whole split button, nudged inside the viewport.
    const rect = (anchorEl.closest('.sp-split') || anchorEl).getBoundingClientRect();
    panel.style.top = `${Math.round(rect.bottom + 8)}px`;
    panel.style.left = `${Math.round(Math.min(rect.left, window.innerWidth - 330 - 16))}px`;

    shadow.append(panel);
    anchorEl.setAttribute('aria-expanded', 'true');
  }

  /**
   * Search, then hand Gmail a ready-made selection. Deleting stays entirely with Gmail's
   * own toolbar — its selection is the live one, so nothing here can drift out of sync.
   */
  async function runSelectFlow(query) {
    // Don't touch select-all until the conversation has closed and Gmail's search box
    // actually holds our query — otherwise we'd tick the previous list's checkbox.
    const key = query.split(' ')[0];
    const ready = await waitFor(
      () => {
        if (isThreadOpen()) return null;
        const box = document.querySelector('input[name="q"]');
        if (box && box.value && !box.value.includes(key)) return null;
        return true;
      },
      { timeout: 9000, interval: 150 }
    );

    if (!ready) {
      warn('search results did not load in time; skipping auto-select');
      return;
    }

    await sleep(500); // let the result rows paint
    const result = await selectAllResults();
    if (!result.ok) warn(result.reason);
  }

  /* ------------------------------------------------------------------ *
   * Keeping the toolbar button in place as Gmail re-renders
   * ------------------------------------------------------------------ */

  /**
   * A split button: the wide half searches straight away, the caret half opens the
   * filter panel. No listeners are bound here on purpose — Gmail's toolbar stops
   * propagation on its own handlers, so activation is delegated from document capture.
   */
  function makeSplitButton() {
    const group = document.createElement('div');
    group.className = 'sp-split';
    group.setAttribute('role', 'group');
    group.innerHTML = `
      <div class="sp-toolbar-btn sp-quick" role="button" tabindex="0" data-sp="quick"
           aria-label="Show all email from this sender"
           title="Show all email from this sender">
        <svg class="sp-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle cx="7" cy="7" r="4.4" fill="none" stroke="currentColor" stroke-width="1.6"/>
          <path d="M10.4 10.4 L14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>Similar
      </div>
      <div class="sp-toolbar-btn sp-options" role="button" tabindex="0" data-sp="options"
           aria-expanded="false" aria-label="Similar email, with filters"
           title="Filter, then bulk delete">
        <span class="sp-caret"></span>
      </div>
    `;
    return group;
  }

  function activate(part) {
    return part.dataset.sp === 'quick' ? runQuickSearch() : openPanel(part);
  }

  /**
   * Capture phase on `document` runs before anything Gmail has bound further down the
   * tree, so this fires even when Gmail swallows the event inside its toolbar.
   */
  function delegateActivation(type, predicate) {
    document.addEventListener(
      type,
      (event) => {
        const part = event.target?.closest?.('.sp-toolbar-btn');
        if (!part || !predicate(event)) return;
        event.preventDefault();
        event.stopPropagation();
        if (type === 'mousedown' || type === 'keydown') {
          activate(part).catch((err) => console.error('[Similar & Purge]', err));
        }
      },
      true
    );
  }

  delegateActivation('mousedown', (event) => event.button === 0);
  delegateActivation('keydown', (event) => event.key === 'Enter' || event.key === ' ');
  // Swallow the follow-up events so Gmail doesn't treat them as a toolbar action.
  delegateActivation('click', () => true);
  delegateActivation('mouseup', () => true);

  function syncButton() {
    const tb = toolbar();
    const existing = document.querySelector('.sp-split');

    if (!tb || !isThreadOpen()) {
      if (existing) {
        existing.remove();
        closePanel();
      }
      return;
    }

    // Already mounted where it belongs — leave it alone so a Gmail re-render
    // doesn't close an open panel.
    if (existing && tb.contains(existing)) return;

    existing?.remove();
    tb.append(makeSplitButton());
  }

  /* ------------------------------------------------------------------ *
   * Bottom pagination
   *
   * Gmail only offers "1–50 of 1,234 / Older / Newer" in the top toolbar. Rather than
   * clone that widget — its markup is obfuscated and moves around — this draws its own
   * bar and pages by URL: Gmail treats a trailing `/pN` on the hash as the page number
   * (`#search/from%3Ax/p2`, `#inbox/p3`). No dependency on Gmail's DOM at all.
   *
   * The range readout is still scraped when it can be found, purely for the label and to
   * grey out "Older" on the last page. If it isn't found, the bar still works.
   * ------------------------------------------------------------------ */

  const RANGE_RE = /\d[\d.,  ]*\s*[–—-]\s*\d/;

  /** Split the hash into its list view and its page number. */
  function pageContext() {
    const raw = (location.hash || '#inbox').replace(/^#/, '');
    const parts = raw.split('/').filter(Boolean);

    let page = 1;
    const last = parts[parts.length - 1] || '';
    if (/^p\d+$/i.test(last)) {
      page = Math.max(1, parseInt(last.slice(1), 10));
      parts.pop();
    }

    return { base: `#${parts.join('/') || 'inbox'}`, page };
  }

  function gotoPage(page) {
    const { base } = pageContext();
    location.hash = page <= 1 ? base : `${base}/p${page}`;
  }

  /**
   * Gmail splits the readout into per-number spans with the dash as a bare text node, so
   * match on the whole text of the smallest element that reads like a range. Digits only,
   * so the UI language doesn't matter.
   */
  function readRange() {
    // Gmail keeps the range readout in the *top* bar (`gh="tm"`), not the list toolbar
    // (`gh="mtb"`) — searching only the latter finds nothing.
    const scopes = [...document.querySelectorAll('div[gh="tm"], div[gh="mtb"]')];
    if (!scopes.length) return null;

    // Prefer the *longest* match, not the smallest element: Gmail nests a bare "1–25"
    // inside the full "1–25 of many", and the inner one loses the total.
    let best = null;
    let bestSize = Infinity;
    for (const el of scopes.flatMap((s) => [...s.querySelectorAll('div, span')])) {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length > 40 || !RANGE_RE.test(text)) continue;
      // Gmail leaves stale, off-layout copies of its readouts around; only trust one
      // that is actually on screen.
      if (!el.getBoundingClientRect().width) continue;
      const size = el.getElementsByTagName('*').length;
      if (!best || text.length > best.length || (text.length === best.length && size < bestSize)) {
        best = text;
        bestSize = size;
      }
    }
    if (!best) return null;

    // "1–50 of 1,234" → [1, 50, 1234]. Thousands separators vary by locale, so strip
    // anything that isn't a digit inside each run.
    const numbers = (best.match(/\d[\d.,  ]*/g) || []).map((n) => Number(n.replace(/\D/g, '')));
    const [, end, total] = numbers;
    return { text: best, end, total, atEnd: Number.isFinite(end) && Number.isFinite(total) && end >= total };
  }

  /**
   * The footer strip under the message list — storage meter on the left, "Terms ·
   * Privacy · Program Policies" centred, last account activity on the right.
   *
   * Found via the storage text (digits + a size unit, so no dependence on the UI
   * language), then climbing to the wide row that holds all three. The pager goes
   * immediately above this row, centred, which is where a second pager belongs.
   */
  let cachedFooter = null;

  function listFooter() {
    if (cachedFooter?.isConnected) return cachedFooter;

    const SIZE = /\d[\d.,]*\s*[KMGT]B\b/i;
    let storage = null;

    for (const el of document.querySelectorAll('div, span')) {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length > 60 || !SIZE.test(text)) continue;

      // A percentage, or two sizes ("1.2 GB of 15 GB") — otherwise it's some other
      // element that merely mentions a file size.
      const units = (text.match(/[KMGT]B\b/gi) || []).length;
      if (!text.includes('%') && units < 2) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width < 40 || rect.left < 200) continue; // content column, not the nav
      if (el.children.length > 2) continue; // innermost wrapper only

      storage = el;
      break;
    }
    if (!storage) return null;

    let row = storage;
    for (let i = 0; i < 6 && row.parentElement; i++) {
      if (row.getBoundingClientRect().width >= 600) break;
      row = row.parentElement;
    }

    cachedFooter = row.getBoundingClientRect().width >= 600 ? row : null;
    return cachedFooter;
  }

  /** A sidebar label row — the one element whose colour reliably reflects the theme. */
  let cachedColumn = null;

  function sidebarColumn() {
    if (cachedColumn?.isConnected) return cachedColumn;

    cachedColumn =
      [...document.querySelectorAll('div')].find((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width < 120 || rect.width > 400 || rect.left > 140 || rect.height < 200) return false;
        return /auto|scroll/.test(getComputedStyle(el).overflowY);
      }) || null;

    return cachedColumn;
  }

  const rgbOf = (value) => (value.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);

  /**
   * Gmail themes are background *images* with translucent overlays, so `prefers-color-
   * scheme` says nothing useful about what the sidebar actually looks like. Read the
   * colour off a real label row instead and build the palette from that.
   */
  function applyTheme() {
    // Probe a sidebar label row, not the footer: the footer's own links are unstyled
    // anchors that compute to default browser blue.
    const row = sidebarColumn()?.querySelector('a, div[role="link"]');
    const fg = row ? getComputedStyle(row).color : 'rgb(32, 33, 36)';
    const [r, g, b] = rgbOf(fg);
    const lightText = (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;

    pagerHost.style.setProperty('--fg', fg);
    pagerHost.style.setProperty('--muted', `rgba(${r}, ${g}, ${b}, .72)`);
    pagerHost.style.setProperty('--scrim', lightText ? 'rgba(0,0,0,.72)' : 'rgba(255,255,255,.94)');
    pagerHost.style.setProperty('--edge', lightText ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.10)');
    pagerHost.style.setProperty('--hover', lightText ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.07)');
  }

  const pagerHost = document.createElement('div');
  pagerHost.className = 'sp-pager-host';
  const pagerShadow = pagerHost.attachShadow({ mode: 'open' });
  const pagerStyle = document.createElement('style');
  pagerStyle.textContent = PAGER_CSS;
  pagerShadow.append(pagerStyle);

  let pager = null;
  let pagerSignature = '';

  function hidePager() {
    pagerHost.remove();
    pager?.remove();
    pager = null;
    pagerSignature = '';
  }

  /** Sit above the list footer, falling back to floating bottom-right. */
  function mountPager() {
    const footer = listFooter();

    if (footer?.parentElement) {
      if (pagerHost.nextElementSibling !== footer) {
        footer.parentElement.insertBefore(pagerHost, footer);
      }
      pagerHost.style.cssText = 'display:block;text-align:center;';
      applyTheme();
      return 'footer';
    }

    if (pagerHost.parentElement !== document.documentElement) {
      document.documentElement.append(pagerHost);
    }
    pagerHost.style.cssText = 'position:fixed;right:28px;bottom:18px;z-index:2147482900;';
    applyTheme();
    return 'floating';
  }

  function renderPager() {
    // Mirror Gmail exactly: show wherever Gmail shows its own range readout — inbox,
    // any label, any category, any search — and nowhere else. A conversation has its
    // own message-level navigation, so it's excluded.
    const range = isThreadOpen() ? null : readRange();
    if (!range) {
      hidePager();
      return;
    }

    const { page } = pageContext();
    const placement = mountPager();

    const label = range.text;
    const signature = `${placement}|${page}|${label}|${range.atEnd ? 1 : 0}`;
    if (pager && signature === pagerSignature) return;

    if (!pager) {
      pager = document.createElement('div');
      // Chevrons as SVG rather than ‹ › glyphs — the text characters render thin and
      // sit off-centre at this size, and these track currentColor.
      const chevron = (d) =>
        `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
           <path d="${d}" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round"/>
         </svg>`;

      pager.innerHTML = `
        <button data-page="prev" aria-label="Newer page" title="Newer">${chevron('M15 5l-7 7 7 7')}</button>
        <span class="pager-label"></span>
        <button data-page="next" aria-label="Older page" title="Older">${chevron('M9 5l7 7-7 7')}</button>
      `;
      pager.addEventListener('click', (event) => {
        const btn = event.target.closest('button[data-page]');
        if (!btn || btn.disabled) return;
        const { page: current } = pageContext();
        gotoPage(btn.dataset.page === 'prev' ? current - 1 : current + 1);
      });
      pagerShadow.append(pager);
    }

    pager.className = `pager ${placement}`;
    pager.querySelector('.pager-label').textContent = label;
    pager.querySelector('[data-page="prev"]').disabled = page <= 1;
    pager.querySelector('[data-page="next"]').disabled = range.atEnd;
    pagerSignature = signature;
  }

  /* ------------------------------------------------------------------ *
   * Keeping everything in step as Gmail re-renders
   * ------------------------------------------------------------------ */

  function sync() {
    syncButton();
    renderPager();
  }

  const syncSoon = throttleTrailing(sync, 350);

  new MutationObserver(syncSoon).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => {
    closePanel();
    syncSoon();
  });

  // The pager is positioned by measurement, so it has to be re-measured on resize —
  // nothing mutates the DOM then, so the observer above never fires.
  window.addEventListener('resize', syncSoon);

  // Dismiss the panel on an outside click. Clicks inside the shadow root retarget to the
  // host element, so ignoring the host is what keeps the panel's own controls working.
  document.addEventListener(
    'click',
    (event) => {
      if (!panel) return;
      if (event.target === host || event.composedPath().includes(host)) return;
      if (event.target.closest?.('.sp-toolbar-btn')) return;
      closePanel();
    },
    true
  );

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePanel();
  });

  sync();
})();
