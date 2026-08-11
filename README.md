# Similar & Purge for Gmail

Open an email → click **Similar** → every other email from that sender is found and
selected, ready for Gmail's Delete button. The **▾** half opens a panel for narrowing it
down by age, read state, size and more first.

Also mirrors Gmail's pagination to the bottom of list views, since Gmail only offers it at
the top.

No OAuth, no Google Cloud project, no API keys, no network calls. The extension reads the
open conversation from the page, hands a query to Gmail's own search, and ticks Gmail's own
checkboxes.

## Install

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. **Load unpacked** → pick this folder (`/Users/alex/personal/gmail-ext`)
4. Reload any open Gmail tab

## Use

Open an email — a split button appears in the conversation toolbar:

- **Similar** (left half) — one click and you're done: searches `from:<sender>`, then
  selects every matching conversation automatically. No filters, no panel.
- **▾** (right half) — opens the filter panel below.

### The filter panel

1. Open an email.
2. Click the **▾** half of the button.
3. Pick the sender and narrow it down:
   - Older than — 7 days / 1 month / 6 months / 1 year / 2 years
   - Read state — any / unread only / read only
   - Larger than — 1 / 5 / 10 / 25 MB
   - Has an attachment
   - Inbox only (skip archived)
   - Keep starred (on by default)
   - Keep important
4. The built query is shown live, e.g. `from:news@acme.com older_than:6m -is:starred`
5. Then either:
   - **Search** — runs the query, leaves the rest to you
   - **Search & select all** — runs the query and auto-selects every match

Filter choices persist between uses; the sender is always re-read from the open email.

### Selection

Both **Similar** and **Search & select all** wait for the results, tick select-all, and
expand it to *every* matching conversation — not just the current page.

Deleting is then Gmail's job: untick anything you want to keep and hit Delete in Gmail's own
toolbar. The extension never deletes anything itself, and shows no messages of its own —
Gmail's search state, empty-results text and selection banner already cover every case.
Failures go to the browser console under `[Similar & Purge]`.

It never auto-selects a search you typed into Gmail's own box. Use the panel's plain
**Search** button when you only want to look.

## Pagination at the bottom

Gmail only shows "1–50 of 1,234" and the Older / Newer arrows in the top toolbar. This adds
a second set at the end of the list, centred just above the "Terms · Privacy · Program
Policies" footer — so when you reach the bottom of a page of results, the next-page control
is right there.

The footer is found via the storage meter's text (digits plus a size unit, so it doesn't
depend on the UI language) and the pager is inserted above the row that holds it. If that
row can't be found, the pager falls back to a small floating bar at the bottom right.

Colours are read at runtime off a real sidebar label row, because Gmail themes are
background images with translucent overlays — `prefers-color-scheme` and any fixed palette
get it wrong on every theme but plain white.

It pages via Gmail's own URL scheme — a trailing `/pN` on the hash, e.g.
`#search/from%3Anews%40acme.com/p3` — rather than by driving Gmail's buttons, so it doesn't
depend on Gmail's markup at all.

The label shows Gmail's "1–50 of 1,234" readout when that can be read off the toolbar, and
falls back to "Page N" when it can't. The bar hides on an open conversation and when
everything already fits on one page.

## Notes & limits

- Gmail's markup is obfuscated and changes without notice. The stable hooks used here are
  attribute-based (`gh="mtb"` toolbar, `data-message-id` messages, `span[email]` senders).
  If Gmail moves them, the button either won't appear or the console will say what couldn't
  be found — nothing happens silently and wrongly.
- The "Select all N conversations that match this search" step is matched by **English**
  text. On a non-English Gmail UI that step is skipped, so only the current page (50
  conversations) gets selected.
- Gmail search caps out at moving ~1,000 conversations per bulk action; repeat for very
  large batches.
- Basic HTML view (`?ui=html`) is not supported.
- The `storage` permission is only used to remember your filter choices locally.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | MV3 manifest — one content script on `mail.google.com`, `storage` permission |
| `content.js` | Sender detection, query builder, filter panel, auto-select, pagination bar |
| `content.css` | Styles for the injected split button (panel and pager are in a shadow root) |
| `icons/` | 16 / 48 / 128 px icons |
