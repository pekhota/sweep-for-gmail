# Security Policy

## Reporting a vulnerability

Please report security issues privately rather than opening a public issue.

- **Preferred:** [open a private security advisory](https://github.com/pekhota/sweep-for-gmail/security/advisories/new)
- **Or email:** pekhota.alex@gmail.com

Please include what you found, how to reproduce it, and what an attacker could achieve.
You will get an acknowledgement within a few days. This is a small project maintained by
one person in their spare time, so please be patient with fix timelines — but anything
affecting user data will be treated as urgent.

## Scope

This extension has an unusually small attack surface, which is deliberate:

- It makes **no network requests**, so there is no data exfiltration path and no server to
  compromise.
- It requests **one permission** (`storage`) and runs on **one domain**
  (`mail.google.com`). There is no `host_permissions`, no background service worker, and no
  remotely loaded code.
- It **never deletes mail itself** — it selects messages and hands off to Gmail's own
  Delete button, so anything removed is recoverable from Trash for 30 days.

Findings that would be especially valuable:

- Any way the extension could be made to issue a network request
- Any way page content could cause it to act on messages the user did not intend
- Any way the injected UI could be spoofed or driven by the page rather than the user
- Anything that would make the published privacy policy inaccurate

## Out of scope

- Gmail's own behaviour, bugs or markup changes — report those to Google
- Findings that require the user to install a modified build of this extension
- Missing hardening headers on the GitHub Pages documentation site

## Verifying the privacy claims yourself

The extension is a few readable files with no build step and no dependencies:

```bash
grep -nE "fetch|XMLHttpRequest|WebSocket|sendBeacon|storage\.sync|eval\(" content.js options.js
# no matches
```

CI enforces this on every push — see `tools/validate.mjs`.
