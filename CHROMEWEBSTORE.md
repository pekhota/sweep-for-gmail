# Chrome Web Store Listing — Sweep

> Last Updated: 2026-08-16
> Status: published — <https://chromewebstore.google.com/detail/ofdipbaabgefcdmhjkacfbingkkbaohf>

**Assumption to confirm:** every URL below uses the GitHub handle `pekhota`. If your handle
differs, search-and-replace it here, in `docs/`, and in `assets/src/shot-5.html`.

---

## Store Listing

**Extension Name**

```
Sweep — Bulk Delete Email by Sender for Gmail
```

45 / 75 characters. "Gmail" appears only as the platform it works with, never as the
leading word, which is what Google's brand guidelines require.

**Short Description**

```
Delete every email from one sender in two clicks. Free and open source, no sign-in, no inbox access, zero network requests.
```

123 / 132 characters. Leads with the verb and the outcome, then spends every
remaining character on trust. The filter feature used to occupy the second half; it was
cut in August 2026 because the objection that stops installs is "will this read my mail?",
not "can I narrow it down?" — and filters are covered in the description and screenshot 3
anyway.

**Detailed Description**

```
Sweep finds every email from the sender you are reading and selects the whole lot, so you can delete years of newsletters in two clicks.

Open any email. Click Similar. Sweep searches your mail for that sender, waits for the results, and ticks every single match — not just the ones visible on screen. Then you press Gmail's own Delete button.

It is free and open source, asks for no account, and makes no network requests of any kind. Nothing about your mail leaves your browser, because there is nowhere for it to go.

WHAT IT DOES

• One-click cleanup — open an email, click Similar, and every message from that sender is found and selected
• Filter before you delete — narrow by age (7 days to 2 years), read state, size, or attachments
• Keeps what matters — starred mail is protected by default, and you can protect important mail too
• Selects everything, not just this page — every match in your mailbox, however many there are
• Pagination where you need it — Gmail only shows Older / Newer at the top of a list; Sweep adds it at the bottom too, on every list and search

HOW TO USE IT

1. Open any email in Gmail
2. Click "Similar" in the toolbar above the message
3. Sweep searches and selects every email from that sender
4. Untick anything you want to keep
5. Press Delete in Gmail's toolbar

For more control, click the small arrow next to Similar. That opens a panel where you can set an age limit, a size limit, read state and more, with a live preview of the exact search before you run it.

PRIVACY — THE SHORT VERSION

Sweep does not collect, transmit, store or sell any data. It makes no network requests of any kind. There is no account, no sign-in, no OAuth prompt and no server, because there is nothing on the other end to connect to.

Most inbox-cleaning tools ask you to grant access to your mailbox so their servers can read it. Sweep cannot do this even in principle — it only reads the Gmail page already open in front of you, exactly as you see it.

The single permission it requests is "storage", used to remember your filter choices between visits, on your own computer.

WHAT CHROME WILL WARN YOU ABOUT

When you install Sweep, Chrome says it "can read and change your data on mail.google.com". That warning is worth understanding rather than ignoring, so here is exactly what it means.

Chrome shows that line for every extension that works on a web page — ad blockers, grammar checkers, dark-mode themes. It describes the page open in front of you, not your Google account.

For Sweep it means that while a Gmail tab is open, it can see that tab and click things in it, exactly as you can. That is the entire mechanism: it finds the sender and ticks the checkboxes so you don't have to.

It does not, and the code cannot: reach your mail when your browser is closed, sign in to your account, or send anything anywhere. There is no networking code in the extension, and an automated check blocks any change that would add some.

SAFETY

Sweep never deletes anything itself. It hands Gmail a finished selection and stops there — you press Delete. That means everything goes to Trash and stays recoverable for 30 days, and Sweep has no way to permanently delete mail or empty your Trash.

OPEN SOURCE

Every line is public and readable, and free forever — no paid tier, no ads, no upsell: https://github.com/pekhota/sweep-for-gmail

If you would rather check than trust, search the source for "fetch" or "XMLHttpRequest". There are none.

WORKS WITH

Gmail on mail.google.com, in any Chrome-based browser. Works with multiple signed-in Google accounts. Does not support Gmail's basic HTML view.

SUPPORT

Found a bug or want a feature? Open an issue at https://github.com/pekhota/sweep-for-gmail/issues or email pekhota.alex@gmail.com

Version 1.0.0 — First public release.
```

**Category**

```
Productivity
```

**Single Purpose**

```
Finds every email from the sender of the message you are reading and selects them in Gmail so they can be deleted in bulk.
```

**Primary Language**

```
English (United States)
```

---

## Graphics & Assets

All generated by `tools/make_assets.sh` at exact store dimensions. Sources in `assets/src/`.

| Asset                          | Dimensions  | Status   | Filename                         |
| ------------------------------ | ----------- | -------- | -------------------------------- |
| Store Icon [REQUIRED]          | 128×128 PNG | ✅ Ready | `icons/icon-128.png`             |
| Screenshot 1 [REQUIRED]        | 1280×800    | ✅ Ready | `assets/store/shot-1.png`        |
| Screenshot 2 [RECOMMENDED]     | 1280×800    | ✅ Ready | `assets/store/shot-2.png`        |
| Screenshot 3 [RECOMMENDED]     | 1280×800    | ✅ Ready | `assets/store/shot-3.png`        |
| Screenshot 4                   | 1280×800    | ✅ Ready | `assets/store/shot-4.png`        |
| Screenshot 5                   | 1280×800    | ✅ Ready | `assets/store/shot-5.png`        |
| Small Promo Tile [RECOMMENDED] | 440×280     | ✅ Ready | `assets/store/promo-small.png`   |
| Marquee Promo Tile             | 1400×560    | ✅ Ready | `assets/store/promo-marquee.png` |

### Screenshot Notes

Upload in this order — **`shot-1`, `shot-5`, `shot-2`, `shot-3`, `shot-4`**, which is not
numeric order. Filenames record when each was made; the upload order is a separate
decision, and the store carousel only shows two or three before someone decides.

1. `shot-1` — **The hook.** Thread view with the Similar button called out. Headline: "One
   newsletter. Four years of it. Gone in two clicks."
2. `shot-5` — **Trust.** Privacy claims as plain cards, including what Chrome's "read and
   change your data" warning actually means. Moved from last to second in August 2026:
   several people who were told about the extension in person assumed it wanted mailbox
   access, and an objection that stops installs has to be answered before the feature tour,
   not after it.
3. `shot-2` — **Control.** The filter panel open, with the live query preview called out.
   Answers the "will this nuke something I need?" objection.
4. `shot-3` — **The payoff.** Every match selected, Gmail's Delete highlighted. Makes clear
   Sweep hands off rather than deleting on its own.
5. `shot-4` — **The bonus feature.** Bottom pagination, which no competitor has and which
   users notice daily.

Every sender, subject and figure in the artwork is invented. No real mailbox is shown.

---

## Permissions Justification

| Permission                  | Type                  | Justification                                                                                                                                                                                                                                                                                                                         |
| --------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                   | permissions           | Remembers the user's filter choices (age limit, size limit, read state, keep-starred) between visits so they don't have to re-enter them on every cleanup, and the one options-page setting (whether to show pagination at the bottom of message lists). Stored locally with `chrome.storage.local`; never synced, never transmitted. |
| `https://mail.google.com/*` | content_scripts match | The extension's entire function is adding controls to the Gmail interface: a button on the conversation toolbar, a filter panel, and a second pagination control at the bottom of message lists. It reads the sender address from the open message and drives Gmail's own search and selection controls. It runs on no other site.    |

Note there is **no** `host_permissions` key, no `tabs`, no `activeTab`, no `scripting`, and
no background service worker. A content script on one domain, plus an options page holding
a single checkbox, is the whole extension.

---

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** **No**

| Data Type                    | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
| ---------------------------- | ---------- | ----------------------- | ------- | -------------------------- |
| Personally identifiable info | No         | No                      | —       | No                         |
| Health info                  | No         | No                      | —       | No                         |
| Financial info               | No         | No                      | —       | No                         |
| Authentication info          | No         | No                      | —       | No                         |
| Personal communications      | No         | No                      | —       | No                         |
| Location                     | No         | No                      | —       | No                         |
| Web history                  | No         | No                      | —       | No                         |
| User activity                | No         | No                      | —       | No                         |
| Website content              | No         | No                      | —       | No                         |

The extension reads the sender address from the open Gmail message in order to build a
search query. That value is used immediately, in the page, and is never stored or sent
anywhere. The only thing written to disk is the user's own filter preferences.

Verifiable in one command:

```bash
grep -nE "fetch|XMLHttpRequest|WebSocket|sendBeacon|storage\.sync|navigator\.send" content.js
# no matches
```

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Privacy Policy

**Privacy Policy URL**

```
https://pekhota.github.io/sweep-for-gmail/privacy.html
```

Source: `docs/privacy.html`. Publish by enabling GitHub Pages on the `main` branch,
`/docs` folder. Must be live _before_ you submit — an unreachable policy URL is one of the
most common first-submission rejections.

---

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free

---

## Developer Info

**Publisher Name**: Oleksandr Piekhota
**Contact Email**: pekhota.alex@gmail.com
**Support URL**: https://github.com/pekhota/sweep-for-gmail/issues
**Homepage URL**: https://pekhota.github.io/sweep-for-gmail/

---

## Version History

| Version | Date       | Changes                                                                                 | Status                   |
| ------- | ---------- | --------------------------------------------------------------------------------------- | ------------------------ |
| 1.0.0   | 2026-08-11 | First public release: Similar button with auto-select, filter panel, bottom pagination. | **Published 2026-08-13** |

---

## Review Notes

### Known Issues / Limitations

Disclose these if asked; none are policy problems, but reviewers test odd paths.

- The "Select all N conversations that match this search" step is matched by English text.
  On a non-English Gmail interface that step is skipped and only the current page (up to
  50 conversations) is selected. Everything else is language-independent.
- Gmail caps bulk actions at roughly 1,000 conversations per operation. Larger cleanups
  need repeating. This is Gmail's limit, not the extension's.
- Gmail's basic HTML view (`?ui=html`) is unsupported.
- The extension depends on Gmail's page structure. If Google changes it, controls may stop
  appearing until the extension is updated. It fails silently and safely rather than acting
  on the wrong thing.

### Reviewer-Facing Summary

If the review team asks why a Gmail extension needs no OAuth: Sweep does not use the Gmail
API. It manipulates the Gmail web interface the user already has open — filling the search
box, ticking the select-all checkbox — the same actions the user could perform by hand.
This is why it requires no account access and transmits nothing.

### Rejection History

None yet.
