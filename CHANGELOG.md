# Changelog

All notable changes to this project are documented here. This project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html); the version in `manifest.json`
is the source of truth and CI refuses to release when a git tag disagrees with it.

## [Unreleased]

### Added

- **Options page** (`chrome://extensions` → Details → Extension options) with a single
  checkbox that turns the bottom pager off. Settings are stored with
  `chrome.storage.local` under `sweep:settings` and picked up by open Gmail tabs
  immediately, without a reload. No new permission: `storage` already covered it.
- `CLAUDE.md`, `CONTRIBUTING.md`, `SECURITY.md`, issue and pull request templates.

### Changed

- **Trust moved to the front of every surface.** People told about Sweep in person assumed
  it wanted mailbox access, so "free, open source, no external connection, no data
  collected" now leads rather than trailing: badges in the landing-page hero and on the
  first screenshot, four trust pills on the marquee tile, and a shorter store summary that
  spends its second half on trust instead of on filters.
- **Chrome's own install warning is answered by name.** "Read and change your data on
  mail.google.com" is what Chrome shows for any page-touching extension, and it was the
  specific thing people reacted to. The landing page, README, store description and the
  trust screenshot now quote it and explain what it does and does not permit.
- Store summary and `manifest.json` description reworded together (they are the same
  field). This one ships with the next version.
- Screenshot upload order is now 1, 5, 2, 3, 4 — trust second rather than last.

## [1.0.0] — 2026-08-11

First public release. Submitted to the Chrome Web Store on 12 August 2026 and published on
13 August 2026 — approved on the first submission, with no reviewer questions.

### Added

- **Similar button** on the Gmail conversation toolbar. Searches `from:<sender>`, waits for
  results, and selects every match — not just the current page.
- **Filter panel** behind a caret: age (7 days to 2 years), read state, size, attachments,
  inbox-only, keep starred (on by default), keep important. Live preview of the exact
  Gmail search, with choices remembered between uses.
- **Bottom pagination**, mirroring the readout Gmail only shows at the top. Works on the
  inbox, any label, any category and any search, paging via Gmail's own `/pN` URL scheme.
- Quality gates in CI: ESLint, Prettier, and 54 project invariants covering store limits,
  icon and artwork dimensions, a permission allowlist, listing/policy consistency, and the
  zero-network-calls promise.

### Notes

- The extension never deletes anything itself — it hands Gmail a finished selection, so
  everything is recoverable from Trash for 30 days.
- No network requests, no account, no OAuth, one permission (`storage`).

[Unreleased]: https://github.com/pekhota/sweep-for-gmail/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/pekhota/sweep-for-gmail/releases/tag/v1.0.0
