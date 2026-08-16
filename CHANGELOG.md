# Changelog

All notable changes to this project are documented here. This project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html); the version in `manifest.json`
is the source of truth and CI refuses to release when a git tag disagrees with it.

## [Unreleased]

### Added

- `CLAUDE.md`, `CONTRIBUTING.md`, `SECURITY.md`, issue and pull request templates.

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
