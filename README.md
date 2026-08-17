<div align="center">

# Sweep

**Delete every email from one sender, in two clicks.**

[**Add to Chrome — free**](https://chromewebstore.google.com/detail/ofdipbaabgefcdmhjkacfbingkkbaohf)

No sign-in · No inbox access · No data collected · Open source

</div>

---

Open any email in Gmail, click **Similar**, and Sweep finds every other message from that
sender and selects the lot — every match, not just the ones on screen. Then you press
Gmail's own Delete.

It also adds the thing Gmail has never had: pagination at the _bottom_ of a message list.

## Why it needs no account

Most inbox cleaners ask you to sign in with Google so their servers can read your mailbox.
Sweep can't do that even in principle. It has no server and makes no network requests — it
drives the Gmail page already open in your browser, performing the same actions you could
perform by hand.

The only permission it requests is `storage`, used to remember your filter choices locally.

### About Chrome's warning

At install, Chrome says Sweep **"can read and change your data on mail.google.com"**. Chrome
shows that for any extension that works on a web page, and it describes the page in front of
you, not your account: while a Gmail tab is open, Sweep can see that tab and click in it,
exactly as you can. That is the whole mechanism.

It cannot reach your mail when the browser is closed, cannot sign in to anything, and cannot
send data anywhere — there is no networking code in the extension, and
[`tools/validate.mjs`](tools/validate.mjs) fails the build if any is added.

## Install

**From the Chrome Web Store:**
[Add to Chrome — free](https://chromewebstore.google.com/detail/ofdipbaabgefcdmhjkacfbingkkbaohf)

**From source:**

1. Download or clone this repository
2. Open `chrome://extensions`
3. Turn on **Developer mode** (top right)
4. **Load unpacked** → select this folder
5. Reload any open Gmail tab

## Use

Open an email. A split button appears in the conversation toolbar.

**Similar** (left half) — one click: searches `from:<sender>`, waits for the results, ticks
select-all and expands it to every match.

**▾** (right half) — opens the filter panel:

| Filter            | Options                                        |
| ----------------- | ---------------------------------------------- |
| Older than        | 7 days · 1 month · 6 months · 1 year · 2 years |
| Read state        | Any · unread only · read only                  |
| Larger than       | 1 · 5 · 10 · 25 MB                             |
| Has an attachment | on / off                                       |
| Inbox only        | skip archived mail                             |
| Keep starred      | **on by default**                              |
| Keep important    | on / off                                       |

The exact search is previewed live, e.g. `from:news@acme.com older_than:6m -is:starred`.
Choices persist between uses; the sender is always re-read from the open email.

Then **Search** (just look) or **Search & select all** (auto-select).

### Deleting

Sweep never deletes anything. It hands Gmail a finished selection and stops — you press
Delete. Everything goes to Trash, recoverable for 30 days, and Sweep has no way to delete
permanently or empty Trash.

It shows no messages of its own; Gmail's own banners and ticked rows already report what
happened. Failures are logged to the console under `[Sweep]`.

### Bottom pagination

Gmail only shows `1–50 of 1,234` and the Older / Newer arrows at the top of a list. Sweep
mirrors that at the end of the list — centred above the _Terms · Privacy · Program Policies_
footer — on the inbox, any label, any category and any search.

It pages via Gmail's own URL scheme (a trailing `/pN` on the hash), so it doesn't depend on
Gmail's markup to work.

### Options

`chrome://extensions` → Sweep → **Details** → **Extension options**. One checkbox, which
turns the bottom pager off for people who would rather Gmail looked untouched below the
list. It applies to open Gmail tabs immediately, with no reload.

The Similar button has no switch: it is what the extension is for.

## Limits

- The "Select all N conversations that match this search" step is matched by **English**
  text. On a non-English Gmail interface only the current page gets selected. Everything
  else is language-independent.
- Gmail caps bulk actions at roughly 1,000 conversations. Repeat for larger cleanups.
- Gmail's basic HTML view (`?ui=html`) is unsupported.
- Gmail's markup changes without notice. Sweep uses the most stable hooks available and
  fails silently rather than acting on the wrong thing.

## Layout

| Path                  | Purpose                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| `manifest.json`       | MV3 manifest — one content script, one options page, one permission    |
| `content.js`          | Sender detection, query builder, filter panel, auto-select, pagination |
| `content.css`         | The injected toolbar button (panel and pager live in shadow roots)     |
| `options.html/.js`    | Options page — one checkbox, switching the bottom pager on or off      |
| `icons/`              | 16 / 48 / 128 px, generated by `tools/make_icons.py`                   |
| `docs/`               | Landing page and privacy policy (GitHub Pages)                         |
| `assets/src/`         | Store artwork sources; `assets/store/` holds the rendered PNGs         |
| `CHROMEWEBSTORE.md`   | Store listing copy, permission justifications, data disclosure         |
| `LAUNCH.md`           | Launch and growth plan                                                 |
| `STORE-SUBMISSION.md` | Every answer given to the Chrome Web Store form                        |

## Development

```bash
python3 tools/make_icons.py    # regenerate icons
./tools/make_assets.sh         # render store artwork at exact sizes
./tools/package.sh             # build dist/sweep-<version>.zip for upload
npm run check                  # lint, format, types, syntax, invariants
```

After editing `content.js`, click the **⟳ reload** icon on the extension's card in
`chrome://extensions` _and then_ reload Gmail. Refreshing Gmail alone re-injects Chrome's
cached copy of the old script.

## Privacy

No data is collected, stored, transmitted or sold. Verify it yourself:

```bash
grep -nE "fetch|XMLHttpRequest|WebSocket|sendBeacon|storage\.sync" content.js options.js
# no matches
```

Full policy: [`docs/privacy.html`](docs/privacy.html)

## Licence

MIT

---

Gmail is a trademark of Google LLC. Sweep is an independent project and is not affiliated
with, endorsed by, or sponsored by Google.
