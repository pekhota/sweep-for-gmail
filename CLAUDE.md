# CLAUDE.md

Guidance for Claude Code (and any coding agent) working in this repository.

Read this before touching `content.js`. Most of it is knowledge that took real debugging
against live Gmail to acquire, and it is not discoverable by reading the code alone.

---

## What this is

A Chrome extension (Manifest V3) that adds two things to Gmail:

1. A **Similar** button on the conversation toolbar. It reads the sender of the open
   message, searches `from:<sender>`, waits for results, and ticks select-all across every
   match. A caret half opens a filter panel (age, read state, size, attachments, keep
   starred/important) with a live query preview.
2. A **second pagination control** at the bottom of list and search views, because Gmail
   only offers one at the top.

The whole extension is one content script. There is no background service worker, no
popup, no options page, no build step for the shipped code.

---

## Invariants — do not break these

These are enforced by `tools/validate.mjs` in CI. If you find yourself wanting to change
one, that is a product decision for the maintainer, not a refactor.

### 1. Zero network calls

The store listing and the published privacy policy both state the extension makes no
network requests of any kind. That claim is the product's main differentiator against
every competitor that requires OAuth mailbox access.

CI fails on `fetch(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource`,
`storage.sync`, `importScripts`, `eval(`, and `new Function` appearing in `content.js`.

**Never add analytics, telemetry, or error reporting.** Not even self-hosted. The absence
is the feature.

### 2. One permission

`storage`, used only for filter preferences via `chrome.storage.local`. No
`host_permissions`, no `tabs`, no `activeTab`, no `scripting`, no background worker.

Adding a permission requires updating `ALLOWED_PERMISSIONS` in `tools/validate.mjs` _and_
the justification table in `CHROMEWEBSTORE.md` _and_ `docs/privacy.html`. The gate exists
to make that a deliberate act — permission creep is the top store-rejection reason.

### 3. The extension never deletes anything

It selects, and hands off to Gmail's own Delete button. This is why everything is
recoverable from Trash for 30 days and why the extension cannot permanently delete mail.

Do not add a delete action, and never touch `act="12"` (delete forever).

### 4. No UI that duplicates Gmail

The extension renders exactly three things: the toolbar button, the filter panel, and the
bottom pager. Nothing else.

There used to be a confirm bar and several toasts. All were removed, because Gmail already
shows its own selection banner, ticked rows, search state and empty-results message. Worse,
a duplicated count goes stale — the removed bar kept showing "26 conversations" after the
user unticked rows.

**Default to silence on the happy path.** Failures go to the console via `warn()`, never to
the screen. Add visible UI only where Gmail shows nothing _and_ the user would otherwise
face a control that appears dead.

---

## Gmail DOM field notes

Gmail's markup is obfuscated and its class names change without notice. These are the
stable hooks, and the traps found the hard way.

### Reliable anchors

| Selector                             | What it is                                                              |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `div[gh="mtb"]`                      | The **list toolbar** (select-all checkbox, archive, delete)             |
| `div[gh="tm"]`                       | The **top bar** — this is where the `1–50 of 1,234` readout lives       |
| `div[role="main"] [data-message-id]` | Message containers; present only in a thread                            |
| `span[email]`                        | Sender address, inside a message header                                 |
| `[act="10"]`                         | Gmail's move-to-Trash action (`act="12"` is delete forever — never use) |

### Traps

**The range readout is in `gh="tm"`, not `gh="mtb"`.** Searching only the list toolbar
finds nothing, and the pager silently falls back to a useless label. This cost multiple
debugging rounds.

**Gmail nests duplicate readouts.** A bare `1–25` sits _inside_ the full `1–25 of many`.
Picking the "smallest matching element" gets the inner one and loses the total. Take the
**longest** match, tie-broken on fewest descendants.

**Stale off-layout copies exist.** Gmail leaves multiple copies of the same text in the
DOM, some positioned far outside the viewport with default browser styling (unstyled links
compute to `rgb(0,0,238)`). Always filter on `getBoundingClientRect().width > 0` before
trusting an element you found by text.

**Views are hidden, not removed.** Gmail keeps a separate list container per view
(inbox, each label, each search) and hides the inactive ones instead of unmounting them. A
node cached from a previous view therefore still reports `isConnected === true` while being
invisible — anything inserted into it renders at zero size. **Never cache a Gmail element
on `isConnected` alone**; require a non-zero `getBoundingClientRect().width` too. This is
the same family as the stale-copies trap above and has caused a regression once already.

**The toolbar stops event propagation.** A listener bound to an injected button may never
fire. Activation is delegated from `document` in the **capture** phase, which runs before
anything Gmail bound further down the tree. Do not "simplify" this back to a direct
listener.

**Gmail buttons want the full mouse sequence.** `.click()` alone is often ignored. Use
`realClick()`, which dispatches `mouseover` → `mousedown` → `mouseup` → `click`.

**Themes are background images, not colours.** Gmail dark themes render as a background
image with translucent overlays. `document.body` can compute to a _light_ colour while text
is white. `prefers-color-scheme` tells you about the OS, not about Gmail. Colours are
therefore read at runtime from a real sidebar label row and a palette derived from its
luminance. Never hardcode a palette or use a media query for theming.

**The toolbar is inside `div[role="main"]`.** Counting checked checkboxes under
`role="main"` includes the toolbar's own select-all, giving a count one too high. Filter
with `!cb.closest('div[gh="mtb"]')`.

**Trusted Types are enforced on the Gmail page.** `innerHTML` throws in _page_ context.
Content scripts run in an isolated world and are exempt, so `innerHTML` is fine in
`content.js` — but any snippet you paste into DevTools to debug must build DOM nodes
manually.

**The list pane is a flex column with `space-between`,** sized for exactly two children
(the list and the footer). Inserting a third splits the free space into _two_ gaps, which
strands anything you add mid-pane whenever results are short. Give injected children
`margin-top: auto` — auto margins absorb free space before `justify-content` distributes
it, so the element sits against the footer at any result count.

**Layout settles late.** Measuring immediately after load can return positions that are
wildly wrong (the list footer once measured at `y:1184` before settling to `y:631`).
Re-measure, or measure in response to a mutation, rather than trusting a first read.

### Paging

Paging goes through Gmail's own URL scheme — a trailing `/pN` on the hash — rather than by
clicking Gmail's arrows:

```
#inbox/p3   #label/Work/p2   #search/from%3Ax/p2   #category/social/p2
```

This works identically across inbox, labels, categories and search, and depends on no
markup at all. Verified against all four.

---

## Architecture

`content.js` is a single IIFE, ordered top to bottom:

1. **Helpers** — `sleep`, `waitFor` (polling with timeout), `realClick`, `throttleTrailing`
2. **Reading the conversation** — `threadSenders()`, `selfEmail()`, `isThreadOpen()`
3. **Query building** — `buildQuery()`, `gotoSearch()`
4. **Driving Gmail's selection** — `selectAllResults()` and its helpers
5. **UI** — shadow-root styles, the filter panel, `runSelectFlow()`
6. **The toolbar button** — `makeSplitButton()`, capture-phase delegation, `syncButton()`
7. **Bottom pagination** — `readRange()`, `pageContext()`, `listFooter()`, `renderPager()`
8. **Sync loop** — a throttled `MutationObserver` on `document.body`, plus `hashchange`
   and `resize`

The panel and pager live in **shadow roots** so Gmail's CSS cannot reach them and theirs
cannot leak. Only the toolbar button is light DOM (it has to inherit toolbar layout), which
is why `content.css` exists and is small.

The pager's host is appended to `<html>`, not `<body>`, so its own mutations do not
retrigger the observer that renders it.

---

## Development

```bash
npm install                  # first time
npm run check                # lint + format + types + syntax + validate — before committing
npm run typecheck            # tsc --noEmit over JSDoc types (no build step, no TS files)
npm run validate             # project invariants only (48 checks)
python3 tools/make_icons.py  # regenerate icons
./tools/make_assets.sh       # render store artwork at exact pixel sizes
./tools/package.sh           # build dist/sweep-<version>.zip
```

### Testing a change

There is no automated test for the Gmail integration — it depends on live, obfuscated,
frequently-changing third-party markup, so an assertion suite would encode assumptions that
break without warning. Verify by hand:

1. `chrome://extensions` → click the **⟳ reload icon on the extension card**
2. Hard-reload Gmail
3. Open an email, click **Similar**, confirm results are selected
4. Open the caret panel, change a filter, confirm the query preview updates
5. Scroll to the bottom of a list, confirm the pager appears and pages

**Step 1 is not optional.** Reloading Gmail alone re-injects Chrome's _cached_ copy of
`content.js`. Several "it's broken" reports during development were a stale build. If
behaviour does not match the code, verify which build is loaded before debugging anything.

---

## Complexity and types

Two gates constrain how `content.js` may grow:

- **Complexity budget** (ESLint): cyclomatic complexity ≤ 8, nesting depth ≤ 3, functions
  ≤ 60 lines, ≤ 4 parameters. The module IIFE is exempt from the line limit — it is a
  wrapper, not a unit. Probing a hostile DOM is naturally branchy, so the pattern that
  keeps within budget is **separate finding from parsing**: `rangeCandidates` /
  `parseRange`, `findStorageCell` / `climbToFooterRow`.
- **Type checking**: `jsconfig.json` runs `tsc --noEmit` with `checkJs` over JSDoc. There
  is no TypeScript in the project and no build step — the shipped file stays plain,
  readable JS. Use `/** @type {...} */ (expr)` casts where the DOM types are wider than
  reality, and prefer narrowing over casting where you can.

There is deliberately **no bundler**. The store listing sells "one readable file, no build
step", and a reviewer can read the whole extension. That rules out module-per-layer
architecture; the logic/DOM boundary is kept by convention instead — `buildQuery`,
`parseRange` and `pageContext` are pure and must stay that way.

## Conventions

- **Comments explain why, not what.** Every non-obvious workaround should say which Gmail
  behaviour forced it, so a future reader does not "clean it up".
- **Never anchor UI with hardcoded coordinates.** Attach to the element being pointed at.
  This bit both the extension (a callout beside the wrong control) and the store artwork.
- **Fail silently and safely.** If a Gmail hook is missing, do nothing and `warn()`. Never
  guess at a fallback that could act on the wrong messages.
- **Prefer attribute selectors** (`gh=`, `act=`, `data-message-id`, `role=`) over class
  names, which are obfuscated and unstable.
- **Language independence.** Prefer digits, attributes and structure over English text.
  One known exception is documented below.

### Known limitations (documented, not bugs)

- The "Select all N conversations that match this search" link is matched by **English**
  text. On other locales only the current page is selected. Everything else is
  language-independent.
- Gmail caps bulk actions at roughly 1,000 conversations.
- Gmail's basic HTML view (`?ui=html`) is unsupported.

---

## Tooling traps

- **macOS `sed` is BSD**, not GNU: no `\b`, and no `\|` alternation in basic regex. Use
  `sed -E`, or do text surgery in Python.
- **Prettier does not touch HTML** here. `assets/src/*.html` renders to pixel-exact store
  artwork and reflowing it risks shifting the output. `.prettierignore` excludes it.
- **Store artwork must be exact.** 1280×800 screenshots, 440×280 and 1400×560 promo tiles.
  "Close enough" is rejected. `tools/make_assets.sh` renders headless with
  `--force-device-scale-factor=1` because a real window is subject to device pixel ratio.
- **Artwork must never show real mail.** Every sender, subject and figure in `assets/src/`
  is invented. Do not screenshot a real inbox.

---

## Release

1. Bump `version` in `manifest.json` and add a row to the version history in
   `CHROMEWEBSTORE.md` (CI checks the version appears there)
2. `npm run check`
3. Commit, tag `vX.Y.Z`, push the tag
4. The release workflow verifies the tag matches the manifest, runs the gates, builds the
   zip and attaches it to a GitHub release
5. Upload that zip in the Chrome Web Store dashboard

`CHROMEWEBSTORE.md` holds the listing copy, permission justifications and data disclosure.
`LAUNCH.md` holds the growth plan. Keep both current when user-facing behaviour changes —
a listing that overstates what the code does is a policy problem, not just a docs problem.
