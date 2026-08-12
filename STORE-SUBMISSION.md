# Chrome Web Store — Submission Record

Every answer given in the Developer Dashboard for **Sweep 1.0.0**, recorded so a
resubmission, an update, or a second reviewer question never has to be re-derived.

> Submitted: 12 August 2026 · Status: awaiting review
>
> Copy for the text fields is generated from [`CHROMEWEBSTORE.md`](CHROMEWEBSTORE.md) into
> `dist/listing/` — see [Regenerating the paste-ready files](#regenerating-the-paste-ready-files).

---

## Store listing tab

| Field              | Answer                                                                 |
| ------------------ | ---------------------------------------------------------------------- |
| Name               | `Sweep — Bulk Delete Email by Sender for Gmail` (45/75)                |
| Summary            | `dist/listing/summary.txt` (131/132)                                   |
| Description        | `dist/listing/description.txt` (2,612/16,000)                          |
| Category           | **Productivity**                                                       |
| Sub-category       | **Communication**                                                      |
| Language           | **English (United States)**                                            |
| Store icon         | `icons/icon-128.png` — 128×128 PNG, 1.9 KB                             |
| Screenshots        | `assets/store/shot-1..5.png` — all 1280×800, uploaded in numeric order |
| Small promo tile   | `assets/store/promo-small.png` — 440×280                               |
| Marquee promo tile | `assets/store/promo-marquee.png` — 1400×560                            |
| Promo video        | **Left empty** — optional, needs a YouTube URL                         |
| Official URL       | **None** — see note below                                              |
| Homepage URL       | `https://pekhota.github.io/sweep-for-gmail/`                           |
| Support URL        | `https://github.com/pekhota/sweep-for-gmail/issues`                    |
| Mature content     | **Off**                                                                |
| Item support       | **On** — store policy expects reachable support                        |

**Why Official URL is None.** It only accepts a site verified in Google Search Console.
This is a GitHub Pages _project_ site, so verification would require owning the whole
`pekhota.github.io` host — a separate `pekhota.github.io` repo serving Google's
verification file at the root. Homepage URL covers the same need without it. To add later:
create that repo, verify the host, then select it here. No re-review needed.

**Sub-category reasoning.** Communication is where the store files email extensions and
where that audience browses. Tools is the catch-all — highest competition, lowest intent.
Editable later without resubmitting.

---

## Privacy tab

### Single purpose

```
Finds every email from the sender of the message you are reading and selects them in Gmail so they can be deleted in bulk.
```

Deliberately omits the bottom-pagination feature. Single Purpose must read as _one_
purpose; secondary conveniences belong in the description, where it does appear.

### Permission justifications

**`storage`** — `dist/listing/perm-storage.txt`

> Stores the user's filter preferences locally so they persist between visits… This is the
> only thing the extension stores. No email content, addresses, or any other user data is
> written to storage, and nothing is synced or transmitted.

**`https://mail.google.com/*`** (content script match) — `dist/listing/perm-host.txt`

> The extension's entire function is adding controls to the Gmail interface… it reads two
> things: the sender's address from the message the user is currently viewing… and the
> "1-50 of 1,234" counter… It then drives Gmail's own search box and select-all checkbox —
> the same actions the user could perform by hand.

Both justifications name **what** is accessed and **what is not**, because `storage` and a
mail-domain host are the two things reviewers scrutinise hardest.

### Remote code

**No, I am not using remote code.**

No `eval`, no `new Function`, no `importScripts`, no injected `<script>` tags, no network
APIs. Everything that runs ships in the package. Enforced on every push by
`tools/validate.mjs`, so a future version cannot silently invalidate this answer.

### Data usage — all nine boxes left UNCHECKED

| Data type                           | Collected |
| ----------------------------------- | --------- |
| Personally identifiable information | No        |
| Health information                  | No        |
| Financial and payment information   | No        |
| Authentication information          | No        |
| Personal communications             | No        |
| Location                            | No        |
| Web history                         | No        |
| User activity                       | No        |
| Website content                     | No        |

The store defines _collect_ as obtaining user data **and transmitting it off the device**.
Sweep transmits nothing.

- **Sender address** — read from the open message, used immediately to build a search,
  never stored, never sent. Disclosed in the privacy policy, so form and policy agree.
- **Filter preferences** — not personal data; `chrome.storage.local`, never synced.

**"Personal communications" was deliberately left unchecked.** Tempting to tick because the
extension operates on email, but it never reads bodies, subjects, recipients or
attachments. Over-disclosing would contradict the privacy policy, and a mismatch between
this form and the policy is itself a rejection reason.

⚠️ The question says **"now or in the future"**. Adding analytics, error reporting or sync
means returning here first. This is a concrete reason to keep the no-analytics stance in
[`LAUNCH.md`](LAUNCH.md).

### Certifications — all three ticked

- [x] Do not sell or transfer user data to third parties outside the approved use cases
- [x] Do not use or transfer user data for purposes unrelated to the single purpose
- [x] Do not use or transfer user data to determine creditworthiness or for lending

### Privacy policy URL

```
https://pekhota.github.io/sweep-for-gmail/privacy.html
```

Verified live (HTTP 200) before submitting — an unreachable policy URL is a top
first-submission rejection.

---

## Account settings

Publisher-level settings — contact email and EEA trader declaration — are set once at
`chrome.google.com/webstore/devconsole/account` and apply to every item. They are
deliberately **not** recorded here, since they are account admin rather than anything about
this extension. Note that publishing is blocked until the contact email is verified via the
link Google emails you.

---

## Reviewer test instructions

Credentials fields **left empty** — Sweep has no account of its own. `dist/listing/test-instructions-alt.txt`:

```
No credentials needed. The extension has no sign-in and works with any Gmail account already signed in.

To test:
1. Open mail.google.com and open any email.
2. Click "Similar" in the toolbar above the message. It searches for that sender and selects every match. It only selects — there is no delete code in the extension; you press Gmail's own Delete.
3. The arrow beside it opens filters (age, size, read state).
4. In any message list, scroll to the bottom for the added pagination.
```

486/500. The first draft said "deleting is left to Gmail's own Delete button", which reads
ambiguously — as if the extension presses it. It does not: the extension contains no delete
code and only ever clicks two things, Gmail's select-all checkbox and its "select all N that
match" link. The wording was sharpened to state that as a checkable fact.

---

## Distribution

| Field      | Answer |
| ---------- | ------ |
| Visibility | Public |
| Regions    | All    |
| Pricing    | Free   |

---

## Regenerating the paste-ready files

`dist/` is gitignored, so these are rebuilt on demand:

````bash
./tools/package.sh   # dist/sweep-<version>.zip

python3 - <<'PY'
import pathlib
s = pathlib.Path('CHROMEWEBSTORE.md').read_text()
block = lambda h: s.split(h, 1)[1].split('```')[1].strip('\n')
out = pathlib.Path('dist/listing'); out.mkdir(parents=True, exist_ok=True)
for name, heading in [
    ('description.txt', '**Detailed Description**'),
    ('summary.txt', '**Short Description**'),
    ('name.txt', '**Extension Name**'),
    ('single-purpose.txt', '**Single Purpose**'),
]:
    text = block(heading)
    (out / name).write_text(text + '\n')
    print(f'{name:<22}{len(text):>6} chars')
PY
````

The permission justifications and test instructions are verbatim in this file — copy them
from the blocks above.

---

## If the review comes back

1. Read the rejection email — it names the specific policy
2. Record the reason and the fix in the Rejection History table in
   [`CHROMEWEBSTORE.md`](CHROMEWEBSTORE.md)
3. Fix, run `npm run check`, rebuild the package, resubmit
4. Update this file if any answer changed

Most likely questions, and the answers:

- **"Why does a Gmail extension need no OAuth?"** It does not use the Gmail API. It drives
  the Gmail page the user already has open, performing actions they could perform by hand.
- **"Justify the mail.google.com access."** See the host justification above; the full
  version is in `CHROMEWEBSTORE.md`.
- **"What does it store?"** Filter preferences only, locally.

`CHROMEWEBSTORE.md` has a Known Issues section covering the English-only select-all step,
Gmail's ~1,000-conversation bulk cap, and the unsupported basic HTML view — disclose those
if asked.
