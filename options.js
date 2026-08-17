/**
 * Sweep — options page
 *
 * One checkbox, backed by the same `chrome.storage.local` key `content.js` reads. There is
 * no save button and no confirmation: the checkbox is the state, and content.js listens
 * for the change, so the result shows up in Gmail rather than being announced here.
 */

(() => {
  'use strict';

  const SETTINGS_KEY = 'sweep:settings';
  const DEFAULTS = { bottomPager: true };

  const checkbox = /** @type {HTMLInputElement} */ (document.getElementById('bottom-pager'));

  /** Whatever is on disk, with the defaults filled in. Never throws. */
  async function readSettings() {
    try {
      const stored = await chrome.storage.local.get(SETTINGS_KEY);
      const saved = stored?.[SETTINGS_KEY];
      if (saved && typeof saved === 'object') return { ...DEFAULTS, ...saved };
    } catch {
      /* an unreadable store still gets a usable page */
    }
    return { ...DEFAULTS };
  }

  // Read-modify-write against storage rather than against a cached copy, so this keeps
  // any setting added later that this page does not know about.
  async function save(bottomPager) {
    const merged = { ...(await readSettings()), bottomPager };
    await chrome.storage.local.set({ [SETTINGS_KEY]: merged });
  }

  checkbox.addEventListener('change', () => {
    save(checkbox.checked).catch(async (error) => {
      // Nothing useful to offer the user, but the checkbox must not claim a state that
      // was never written — put it back to whatever is actually on disk.
      console.warn('[Sweep] could not save settings', error);
      checkbox.checked = (await readSettings()).bottomPager !== false;
    });
  });

  readSettings().then((settings) => {
    checkbox.checked = settings.bottomPager !== false;
  });
})();
