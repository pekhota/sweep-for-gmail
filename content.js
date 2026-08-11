/**
 * Sweep — bulk delete email by sender, for Gmail
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

  // A deliberate marker on window, so a double injection is a no-op.
  const globalWindow = /** @type {any} */ (window);
  if (globalWindow.__sweepLoaded) return;
  globalWindow.__sweepLoaded = true;

  const STORAGE_KEY = 'sweep:filters';

  /* ------------------------------------------------------------------ *
   * Small helpers
   * ------------------------------------------------------------------ */

  const sleep = (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

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
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );

  /**
   * Saved filter preferences, or null. Anything non-object on disk is discarded rather
   * than spread into the panel state.
   * @returns {Promise<Record<string, unknown> | null>}
   */
  async function loadFilters() {
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEY);
      const saved = stored?.[STORAGE_KEY];
      return saved && typeof saved === 'object' ? /** @type {Record<string, unknown>} */ (saved) : null;
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

  /** Every sender in the open thread, oldest first, duplicates included. */
  function messageSenders() {
    return messageEls()
      .map((msg) => msg.querySelector('span[email]'))
      .filter(Boolean)
      .map((span) => {
        const email = (span.getAttribute('email') || '').trim().toLowerCase();
        const name = (span.getAttribute('name') || span.textContent || '').trim();
        return { email, name: name || email };
      })
      .filter((sender) => sender.email);
  }

  /** Distinct senders in the open thread, newest first, own address last. */
  function threadSenders() {
    const me = selfEmail();
    const byEmail = new Map();

    // Reversed so the newest message wins, and a Map keeps first-seen order.
    for (const sender of messageSenders().reverse()) {
      if (!byEmail.has(sender.email)) byEmail.set(sender.email, sender);
    }

    return [...byEmail.values()].sort((a, b) => Number(a.email === me) - Number(b.email === me));
  }

  /* ------------------------------------------------------------------ *
   * Query building + navigation
   * ------------------------------------------------------------------ */

  /**
   * One entry per filter, each returning its Gmail search operator or null. Declarative
   * rather than a chain of ifs so adding a filter is a one-line change.
   */
  const QUERY_TERMS = [
    (s) => `from:${s.sender}`,
    (s) => (s.age ? `older_than:${s.age}` : null),
    (s) => (s.read === 'unread' ? 'is:unread' : null),
    (s) => (s.read === 'read' ? 'is:read' : null),
    (s) => (s.attachment ? 'has:attachment' : null),
    (s) => (s.size ? `larger:${s.size}` : null),
    (s) => (s.inboxOnly ? 'in:inbox' : null),
    (s) => (s.skipStarred ? '-is:starred' : null),
    (s) => (s.skipImportant ? '-is:important' : null),
  ];

  function buildQuery(state) {
    return QUERY_TERMS.map((term) => term(state))
      .filter(Boolean)
      .join(' ');
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
  host.id = 'sw-shadow-host';
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
  const warn = (...args) => console.warn('[Sweep]', ...args);

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

  // Must match `.panel { width }` in SHADOW_CSS.
  const PANEL_WIDTH = 330;

  let panel = null;
  let panelOpening = false;
  let panelState = { ...DEFAULT_FILTERS, sender: '' };

  function closePanel() {
    panel?.remove();
    panel = null;
    document.querySelector('.sw-options')?.setAttribute('aria-expanded', 'false');
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

  /**
   * The `panel` check and the assignment are separated by an await, so two quick clicks
   * could both get past it and build two panels — orphaning the first inside the shadow
   * root with no reference left to remove it. The flag is set synchronously to close that
   * window.
   */
  async function openPanel(anchorEl) {
    if (panel) {
      closePanel();
      return;
    }
    if (panelOpening) return;

    panelOpening = true;
    try {
      await buildPanel(anchorEl);
    } finally {
      // Writes a constant and never reads the previous value, so there is no
      // lost-update to race over.
      // eslint-disable-next-line require-atomic-updates
      panelOpening = false;
    }
  }

  /** The panel's markup. Split out so buildPanel stays about wiring, not templating. */
  function panelMarkup(senders) {
    const senderOptions = senders
      .map((s) => {
        const label = s.name === s.email ? s.email : `${s.name} · ${s.email}`;
        return `<option value="${escapeHtml(s.email)}">${escapeHtml(label)}</option>`;
      })
      .join('');

    return `
      <h2>Find similar emails</h2>
      <div class="sub">Everything from one sender, narrowed down.</div>

      <label class="row">
        <span>Sender</span>
        <select data-field="sender">${senderOptions}</select>
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
  }

  /** Copy the saved filter state into the rendered controls. */
  function applyPanelState(root) {
    for (const el of root.querySelectorAll('[data-field]')) {
      const control = /** @type {HTMLInputElement | HTMLSelectElement} */ (el);
      const field = control.dataset.field;
      if (control instanceof HTMLInputElement && control.type === 'checkbox') {
        control.checked = Boolean(panelState[field]);
      } else {
        control.value = panelState[field] ?? '';
      }
    }
  }

  function wirePanel(root, refresh) {
    root.addEventListener('change', (event) => {
      const target = /** @type {Element | null} */ (event.target);
      const control = /** @type {HTMLInputElement | HTMLSelectElement | null} */ (
        target?.closest('[data-field]')
      );
      if (!control) return;

      const isCheckbox = control instanceof HTMLInputElement && control.type === 'checkbox';
      panelState[control.dataset.field] = isCheckbox ? control.checked : control.value;
      refresh();

      // `sender` is re-read from the open email every time, so it is never persisted.
      const { sender, ...filters } = panelState;
      saveFilters(filters);
    });

    root.addEventListener('click', async (event) => {
      const target = /** @type {Element | null} */ (event.target);
      const btn = /** @type {HTMLElement | null} */ (target?.closest('[data-act]'));
      if (!btn) return;

      const query = buildQuery(panelState);
      closePanel();
      gotoSearch(query);
      if (btn.dataset.act === 'select') await runSelectFlow(query);
    });
  }

  /** Anchor under the whole split button, nudged back inside the viewport. */
  function positionPanel(root, anchorEl) {
    const rect = (anchorEl.closest('.sw-split') || anchorEl).getBoundingClientRect();
    root.style.top = `${Math.round(rect.bottom + 8)}px`;
    root.style.left = `${Math.round(Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 16))}px`;
  }

  async function buildPanel(anchorEl) {
    const senders = threadSenders();
    if (!senders.length) {
      warn("couldn't read the sender of the open conversation");
      return;
    }

    const saved = await loadFilters();
    panelState = { ...DEFAULT_FILTERS, ...(saved || {}), sender: senders[0].email };

    panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML = panelMarkup(senders);

    applyPanelState(panel);

    const queryEl = panel.querySelector('.query');
    const refresh = () => {
      queryEl.textContent = buildQuery(panelState);
    };
    refresh();

    wirePanel(panel, refresh);
    positionPanel(panel, anchorEl);

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
        const box = /** @type {HTMLInputElement | null} */ (document.querySelector('input[name="q"]'));
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
    group.className = 'sw-split';
    group.setAttribute('role', 'group');
    group.innerHTML = `
      <div class="sw-toolbar-btn sw-quick" role="button" tabindex="0" data-sp="quick"
           aria-label="Show all email from this sender"
           title="Show all email from this sender">
        <svg class="sw-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle cx="7" cy="7" r="4.4" fill="none" stroke="currentColor" stroke-width="1.6"/>
          <path d="M10.4 10.4 L14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>Similar
      </div>
      <div class="sw-toolbar-btn sw-options" role="button" tabindex="0" data-sp="options"
           aria-expanded="false" aria-label="Similar email, with filters"
           title="Filter, then bulk delete">
        <span class="sw-caret"></span>
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
        const part = event.target?.closest?.('.sw-toolbar-btn');
        if (!part || !predicate(event)) return;
        event.preventDefault();
        event.stopPropagation();
        if (type === 'mousedown' || type === 'keydown') {
          activate(part).catch((err) => console.error('[Sweep]', err));
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
    const existing = document.querySelector('.sw-split');

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
  /**
   * Candidate readouts, visible ones only — Gmail leaves stale, off-layout copies of its
   * readouts in the DOM, and those carry the right text at zero size.
   */
  function rangeCandidates() {
    // Gmail keeps the range readout in the *top* bar (`gh="tm"`), not the list toolbar
    // (`gh="mtb"`) — searching only the latter finds nothing.
    const scopes = [...document.querySelectorAll('div[gh="tm"], div[gh="mtb"]')];

    return scopes
      .flatMap((scope) => [...scope.querySelectorAll('div, span')])
      .filter(isVisible)
      .map((el) => ({ text: (el.textContent || '').replace(/\s+/g, ' ').trim(), el }))
      .filter(({ text }) => text.length > 0 && text.length <= 40 && RANGE_RE.test(text));
  }

  /** "1–50 of 1,234" → `{ end: 50, total: 1234 }`. Locale separators are stripped. */
  function parseRange(text) {
    const numbers = (text.match(/\d[\d.,  ]*/g) || []).map((n) => Number(n.replace(/\D/g, '')));
    const [, end, total] = numbers;
    const atEnd = Number.isFinite(end) && Number.isFinite(total) && end >= total;
    return { text, end, total, atEnd };
  }

  function readRange() {
    // Prefer the *longest* match, not the smallest element: Gmail nests a bare "1–25"
    // inside the full "1–25 of many", and the inner one loses the total.
    const best = rangeCandidates().sort(
      (a, b) =>
        b.text.length - a.text.length ||
        a.el.getElementsByTagName('*').length - b.el.getElementsByTagName('*').length
    )[0];

    return best ? parseRange(best.text) : null;
  }

  /**
   * The footer strip under the message list — storage meter on the left, "Terms ·
   * Privacy · Program Policies" centred, last account activity on the right.
   *
   * Found via the storage text (digits + a size unit, so no dependence on the UI
   * language), then climbing to the wide row that holds all three. The pager goes
   * immediately above this row, centred, which is where a second pager belongs.
   */
  // The footer row spans the message list; anything narrower is an inner cell.
  const FOOTER_MIN_WIDTH = 600;

  let cachedFooter = null;

  const isVisible = (el) => !!el && el.getBoundingClientRect().width > 0;

  function listFooter() {
    // `isConnected` is not enough. Gmail keeps one list container per view and hides the
    // inactive ones rather than removing them, so a cached footer from a previous view
    // stays "connected" while being invisible — and the pager gets re-inserted into the
    // hidden container, rendering at zero size.
    if (cachedFooter?.isConnected && isVisible(cachedFooter)) return cachedFooter;

    const storage = findStorageCell();
    if (!storage) return null;

    const row = climbToFooterRow(storage);
    cachedFooter = row && row.getBoundingClientRect().width >= FOOTER_MIN_WIDTH ? row : null;
    return cachedFooter;
  }

  /** Reads like a storage meter: a percentage, or two sizes ("1.2 GB of 15 GB"). */
  function looksLikeStorageText(text) {
    if (!text || text.length > 60 || !/\d[\d.,]*\s*[KMGT]B\b/i.test(text)) return false;
    const units = (text.match(/[KMGT]B\b/gi) || []).length;
    return text.includes('%') || units >= 2;
  }

  /** The innermost visible element in the content column holding the storage meter. */
  function findStorageCell() {
    return (
      [...document.querySelectorAll('div, span')].find((el) => {
        if (el.children.length > 2) return false; // innermost wrapper only
        if (!looksLikeStorageText((el.textContent || '').replace(/\s+/g, ' ').trim())) return false;
        const rect = el.getBoundingClientRect();
        return rect.width >= 40 && rect.left >= 200; // content column, not the nav
      }) || null
    );
  }

  /** Walk up to the row spanning the list, without escaping as far as the whole pane. */
  function climbToFooterRow(el) {
    let row = el;
    for (let i = 0; i < 6 && row.parentElement; i++) {
      if (row.getBoundingClientRect().width >= FOOTER_MIN_WIDTH) break;
      row = row.parentElement;
    }
    return row;
  }

  /** A sidebar label row — the one element whose colour reliably reflects the theme. */
  let cachedColumn = null;

  function sidebarColumn() {
    // Same trap as listFooter: a detached-but-connected element still answers queries,
    // and a hidden one would yield a useless colour probe.
    if (cachedColumn?.isConnected && isVisible(cachedColumn)) return cachedColumn;

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
  pagerHost.className = 'sw-pager-host';
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
        const target = /** @type {Element | null} */ (event.target);
        const btn = /** @type {HTMLButtonElement | null} */ (target?.closest('button[data-page]'));
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
      const clicked = /** @type {Element | null} */ (event.target);
      if (clicked?.closest?.('.sw-toolbar-btn')) return;
      closePanel();
    },
    true
  );

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePanel();
  });

  sync();
})();
