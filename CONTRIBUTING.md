# Contributing

Thanks for taking a look. This is a small, deliberately narrow tool — the bar for new
features is high, but bug reports and Gmail-breakage fixes are very welcome.

## Before you start

Read [`CLAUDE.md`](CLAUDE.md). It is written for coding agents but applies equally to
people: it documents Gmail's stable DOM hooks, the traps that cost real debugging time, and
the invariants that must not be broken.

## The invariants

Pull requests that violate any of these will be closed, regardless of quality:

1. **No network calls.** No `fetch`, no analytics, no telemetry, no error reporting — not
   even self-hosted. The published privacy policy promises zero network requests, and CI
   enforces it. The absence is the product.
2. **No new permissions** without a genuinely unavoidable need. One permission (`storage`)
   is a feature, and permission creep is the top store-rejection reason.
3. **The extension never deletes anything.** It selects; Gmail deletes. This is what keeps
   everything recoverable from Trash.
4. **No UI that duplicates what Gmail already shows.** Silence on the happy path. Failures
   go to the console, not the screen.

## Development setup

```bash
git clone https://github.com/pekhota/sweep-for-gmail.git
cd sweep-for-gmail
npm install
```

Load it in Chrome: `chrome://extensions` → Developer mode → **Load unpacked** → this folder.

## Making a change

```bash
npm run check    # lint, format, syntax, and 54 project invariants
```

Run it before every commit. CI runs the same gates and they are required to merge.

Then test by hand — there is no automated test for the Gmail integration, because it
depends on live third-party markup that changes without notice:

1. `chrome://extensions` → click the **⟳ reload icon on the extension card**
2. Hard-reload Gmail (Cmd/Ctrl+Shift+R)
3. Open an email → click **Similar** → confirm every match is selected
4. Open the caret panel → change a filter → confirm the query preview updates
5. Scroll to the bottom of a list → confirm the pager appears and pages

Step 1 catches out nearly everyone. Reloading Gmail alone re-injects Chrome's _cached_
copy of `content.js`, so your change appears to do nothing.

## Reporting a bug

Gmail changes its markup regularly, and when it does the button or pager may stop
appearing. That is the most likely bug you will hit. Please include:

- What you expected and what happened
- Your Gmail language, and whether you use a custom theme
- Anything logged to the browser console under `[Sweep]`
- A screenshot if the problem is visual

Do not paste screenshots containing your real email — crop or use a test account.

## Proposing a feature

Open an issue before writing code. The tool does one thing, and staying narrow is a
deliberate choice rather than an oversight. Features most likely to be accepted are ones
that serve the existing job better — sweeping by domain, for instance — rather than ones
that widen its scope.

## Commit messages

Conventional-ish prefixes (`feat:`, `fix:`, `ci:`, `docs:`) and a body that explains _why_.
If you worked around a Gmail behaviour, say which behaviour — the next person needs to know
why the code looks odd before they "clean it up".

## Licence

By contributing you agree your work is licensed under the [MIT Licence](LICENSE).
