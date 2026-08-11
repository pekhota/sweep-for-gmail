## What and why

<!-- What changes, and which problem it solves. If you worked around a Gmail behaviour,
     say which one — the next reader needs to know why the code looks odd. -->

## How it was tested

<!-- There is no automated test for the Gmail integration. Please confirm by hand. -->

- [ ] Reloaded the extension from its card in `chrome://extensions` (not just Gmail)
- [ ] Opened an email, clicked **Similar**, confirmed every match was selected
- [ ] Opened the filter panel and confirmed the query preview updates
- [ ] Confirmed the bottom pager appears and pages

## Invariants

- [ ] No network calls added (`fetch`, analytics, telemetry, error reporting)
- [ ] No new permissions — or the justification tables in `CHROMEWEBSTORE.md` and
      `docs/privacy.html` are updated alongside `ALLOWED_PERMISSIONS`
- [ ] The extension still never deletes anything itself
- [ ] No new UI that duplicates what Gmail already shows
- [ ] `npm run check` passes
