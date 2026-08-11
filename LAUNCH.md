# Sweep — Launch Plan

Everything below is written to be executed in order. Nothing here requires a budget.

**Reality check first.** Most Chrome extensions die at ~50 installs because nobody ever
sees them. Extensions that break out do it on the back of _one_ thing: a specific, angry
problem described in the words the sufferer already uses. Sweep has that — "how do I delete
all emails from one sender in Gmail" is a question thousands of people type every month,
and every existing answer is either 12 manual steps or "give this company access to your
mailbox." Your entire wedge is: **two clicks, and it never touches your inbox.**

Lead with that everywhere. Never lead with "I built an extension."

---

## Phase 0 — Before you submit (1–2 hours)

- [ ] Create the GitHub repo `sweep-for-gmail`, push, and confirm the handle in every URL
      (`CHROMEWEBSTORE.md`, `docs/`, `assets/src/shot-5.html`)
- [ ] Settings → Pages → source `main` / `/docs`. Confirm both pages load: - `https://<you>.github.io/sweep-for-gmail/` - `https://<you>.github.io/sweep-for-gmail/privacy.html`
- [ ] Register at [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole) — one-off $5 fee
- [ ] Upload `dist/sweep-1.0.0.zip`, paste the fields from `CHROMEWEBSTORE.md`, upload the
      five screenshots and both promo tiles
- [ ] Submit. Review is typically 1–3 business days for a first submission.

**Do not launch anywhere on the day you're approved.** Get 5–10 friends to install it and
leave honest reviews first. An extension with 0 ratings converts badly; one with 8 five-star
ratings converts fine. This is the single highest-leverage hour in the whole plan.

---

## Phase 1 — Launch week

Order matters. Each step feeds the next with social proof.

### Day 1 — Reddit, where the problem already lives

This is your best channel by far, because people are _actively asking_ this question. Search
each subreddit for "delete all emails from sender" and answer the real threads first — old
threads still rank in Google and send traffic for years.

| Subreddit                            | Angle                                                           |
| ------------------------------------ | --------------------------------------------------------------- |
| r/gmail                              | The direct-fit audience. Post as a solution, not an ad.         |
| r/productivity                       | Angle: inbox zero without a subscription.                       |
| r/chrome_extensions                  | Builders; they'll audit the code. Lead with open source.        |
| r/privacy                            | Angle: an inbox cleaner that can't read your inbox. Strong fit. |
| r/degoogle                           | Same privacy angle, sharper.                                    |
| r/SideProject, r/InternetIsBeautiful | Generic launch audiences.                                       |

**Post template — adapt, don't paste verbatim, and always disclose you built it:**

> **I got tired of Gmail making it a 12-step process to delete one sender's emails, so I built a free extension**
>
> Every few months I'd realise some newsletter had quietly deposited 1,000+ emails in my
> account. Deleting them in Gmail means: search the sender, select all, click the "select
> all 1,036 that match" link, delete, confirm. Every single time.
>
> So I made it two clicks: open any email from them, hit "Similar", press Delete.
>
> The part I actually care about: it doesn't ask you to sign in with Google. Every other
> inbox cleaner wants OAuth access to your whole mailbox, which for a _delete some emails_
> tool has always felt insane to me. This one has no server, makes zero network requests,
> and just drives the Gmail page you already have open. Source is public if you want to
> check that claim.
>
> Free, no account, no upsell: [link]
>
> Happy to answer anything.

**Rules:** disclose authorship, reply to every comment for the first 48 hours, never argue
with criticism. If someone finds a bug, thank them and fix it that day — then reply saying
it's fixed. That single behaviour converts more sceptics than any copy.

### Day 2 — Hacker News

Submit as **Show HN: Sweep – Delete every email from one sender in Gmail, without OAuth**.
Post 8–10am ET on a Tuesday–Thursday. First comment from you, immediately:

> Author here. The thing that annoyed me into building this: every Gmail cleanup tool wants
> full OAuth access to your mailbox to delete a newsletter. This one has no backend at all —
> it drives the Gmail UI already open in your tab, so there's nothing to grant access to.
> ~900 lines, one file, no dependencies. The fiddly parts were Gmail's obfuscated DOM and
> the fact that themes are background images, so you can't detect dark mode.

HN rewards technical honesty and punishes marketing tone. Talk about the _engineering_, and
mention the limitations before anyone finds them.

### Day 3 — Product Hunt

- Tagline: **Delete every email from one sender in two clicks**
- First comment: the origin story, plus the privacy angle
- Marquee tile as the gallery lead; the 5 screenshots after
- Reply to every comment. Launches are won in the comments.

### Day 4–5 — Answer the question where it's asked

Google "how to delete all emails from one sender gmail" and work down page one and two:
Quora, Reddit, Google's own support forums, blog comment sections. Give the _manual_
answer first, in full, then mention you built a tool that does it in two clicks. Being
genuinely useful first is what stops this reading as spam.

This is unglamorous and it is the highest-ROI work in this document. These pages are
already ranking for the exact intent — you're borrowing their traffic permanently.

---

## Phase 2 — Store listing SEO (ongoing)

Chrome Web Store search is driven mostly by title, short description, and rating volume.

- The title already carries the phrase people search: _Bulk Delete Email by Sender_
- **Ratings are the flywheel.** After a successful cleanup is the moment of maximum
  goodwill. Consider a single, dismissable, once-ever prompt after a user's third sweep —
  nothing more aggressive than that.
- Reply publicly to every review, including bad ones. Visible responsiveness converts
  browsers into installers.
- Ship a visible update every few weeks early on. "Last updated" is a trust signal.

**Keywords to work naturally into the description** (already done, keep them on updates):
bulk delete gmail, delete all emails from sender, mass delete gmail, clean up gmail inbox,
delete old emails, free up gmail storage.

---

## Phase 3 — Content that compounds

One good article outranks a hundred forum posts over a year. Write these on the GitHub Pages
site as `/blog/`:

1. **"How to delete all emails from one sender in Gmail (2026)"** — the complete manual
   method, honestly and thoroughly, then Sweep as the shortcut. This is _the_ money page.
   Target the exact phrase; nail the intent.
2. **"How to free up Gmail storage when you're at 15 GB"** — huge, panicked search volume.
   Sweep's size filter is the natural answer.
3. **"Why inbox cleaners ask for full mailbox access — and why this one doesn't"** — the
   privacy differentiator as an explainer. This is the piece that gets shared.

---

## Phase 4 — What to build next (only after feedback)

Do not build any of this before real users ask. In rough order of likely demand:

- **Sweep by domain** — everything from `@company.com`, not just one address
- **Unsubscribe + delete in one pass** — the obvious pairing
- **Sender leaderboard** — "these 10 senders account for 60% of your mail"; highly shareable
- **Firefox and Edge builds** — the same code, two more stores, more search surface

---

## Measuring

The dashboard gives you weekly installs, uninstalls and ratings. Watch two numbers:

- **Uninstall rate.** Above ~30% means the listing is over-promising or something is broken.
- **Rating volume**, not just average. Volume drives store ranking.

Rough milestones for an unfunded, well-positioned utility: 100 installs in week one is a
good launch; 1,000 in month one means the Reddit/HN angle landed; 10,000 by month six means
it's compounding through store search and you should invest in the content in Phase 3.

---

## What not to do

- Don't buy installs. It poisons your ratings and risks removal.
- Don't spam subreddits with the same copy. One tailored post each, spaced out.
- Don't add a paid tier before ~5,000 users. Free and frictionless _is_ the growth strategy.
- Don't add analytics. "Zero network requests" is your strongest claim — keeping it
  literally true is worth more than any funnel data you'd get.
