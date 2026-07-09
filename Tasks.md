# DoulaFlow — CC Task: make the forms actually send email (Resend)

Same logic as the Emberforge site's `api/contact.js`: a Vercel serverless function emails each submission straight to the owner's inbox via Resend. No database, no subscriber list — just email-me. `reply_to` is set to the lead so hitting Reply answers them directly.

**Attached:** `lead.js` — the finished handler. Drop it in at `/api/lead.js`. `blog-cc.html` already shows the newsletter form wired to it.

---

## 1. Add the handler
- Place `lead.js` at **`/api/lead.js`** in the marketing site repo (the Vercel project that serves `mydoulaflow.com`).
- It handles both form types via a `formType` field: `'demo'` (homepage) and `'newsletter'` (blog). Demo requires name + email; newsletter requires only email.
- It depends only on `fetch` + Resend's REST API — no new packages.

## 2. Resend setup (prerequisite — sending fails without it)
1. In Resend, **add and verify the domain `mydoulaflow.com`** (add the DNS records Resend gives you — SPF + DKIM; DMARC recommended). This is what lets the app send as `noreply@mydoulaflow.com`. **It does not require a mailbox** — `noreply@` never receives anything, so the lack of a Google Workspace account is fine. Replies go to the lead via `reply_to`, and notifications land in the owner's personal inbox (the `to` address).
2. Create a Resend **API key**.
3. In Vercel project settings → Environment Variables (Production + Preview), set:
   - `RESEND_API_KEY` = the key
   - `LEAD_TO` = the owner's personal inbox (handler defaults to `erick.quintanilla@hotmail.com` — confirm/override)
   - `LEAD_FROM` = `DoulaFlow <noreply@mydoulaflow.com>` (optional; this is the default)
4. Note: until the domain is verified, Resend only sends to the account owner's own address. Verify the domain before testing delivery to any other inbox.

## 3. Wire the forms

### a) Homepage demo / waitlist form (`/#waitlist`)
Find the existing demo-request form on `index.html` and POST it to `/api/lead` with `formType: 'demo'`. Bind to whatever fields the form actually has (at minimum name + email; include phone / practice-type / message if present). Add a hidden honeypot input named `website`. Pattern:
```js
async function submitDemo() {
  const name  = /* name field */.value.trim();
  const email = /* email field */.value.trim();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { /* inline error */ return; }
  const payload = {
    formType: 'demo',
    name, email,
    phone:    /* optional */ '',
    practice: /* optional */ '',
    message:  /* optional */ '',
    website:  /* honeypot field */.value.trim()
  };
  const res = await fetch('/api/lead', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('bad status');
  // show success state
}
```
Keep the existing button disable / "Sending…" / success-state UX if the form already has it (mirror the Emberforge `submitContact` flow).

### c) About page
No form — its CTAs link to `/#waitlist`. Nothing to wire; just confirm the links resolve to the homepage demo form.

## 4. Acceptance
- Submit the homepage demo form on the deployed site → email arrives at `LEAD_TO`, subject `New demo request — {name}`, with Reply going to the submitter.
- Filling the hidden `website` field → returns 200 but sends nothing (bot drop).
- Missing/invalid email → 400, no send.

---

## Flags for the owner (not blockers)
- **The newsletter promises "one useful email a month," but email-capture alone has no way to *send* that.** You'll collect addresses in your inbox, not a list you can broadcast to. Before promising a cadence, either move newsletter signups into a real list tool (Resend Audiences/Broadcasts works on the same account) or soften the blog copy until you're ready to send. Demo requests are unaffected — email-me is exactly right for those.
- **DoulaFlow leads currently default to the same inbox as Emberforge inquiries.** Consider a separate address or an inbox filter so a demo request doesn't get lost.
- **New-domain deliverability:** first sends to Hotmail/Outlook can hit spam. DKIM + DMARC and a few real sends to warm it up will settle that.

---

## UI/UX Audit — 2026-06-09

Read-only pre-launch design audit of the whole marketing site. No site files were changed.

**Pages audited (8):**
- `index.html` — home / marketing
- `about-us.html` — About
- `blog.html` — Blog index
- `privacy-policy.html` — Privacy policy
- `blog/how-doulas-manage-due-dates-and-client-pipelines.html` — full post (reference template)
- `blog/staying-organized-with-multiple-clients.html` — full post
- `blog/does-hipaa-apply-to-doulas.html` — **draft, placeholder body**
- `blog/the-end-of-midnight-admin-organize-your-doula-practice.html` — **draft, placeholder body**

There are effectively **two post templates**: a polished one (the two real posts) and a slightly-older draft one (the two `[Body content coming soon]` posts). Where issues repeat across the draft posts, they're filed once as "ALL draft posts."

---

### Launch-blockers

**UX-01 — Two blog posts are unfinished drafts but are live and crawlable**
- **Page:** `blog/does-hipaa-apply-to-doulas.html`, `blog/the-end-of-midnight-admin-organize-your-doula-practice.html`
- **Location:** `.draft-notice` block + every `<p>` in `<article>` (e.g. hipaa lines 105–120, midnight lines 107–126)
- **Issue:** Body is placeholder text — a visible "Draft — content pending" box and `[Body content coming soon …]` in every section. Both carry a `<link rel="canonical">` to a real `mydoulaflow.com/blog/...` URL, so they're indexable and directly reachable by URL even though they're not linked from the blog index.
- **Why it matters:** A prospect or Google landing on placeholder copy reads as abandoned/unfinished — direct credibility hit.
- **Recommended fix:** Either finish the copy before launch, or remove/`noindex` + 404 these two files (and drop their canonical) until ready. Don't deploy with placeholders.
- **Severity:** High
- **Priority tier:** Launch-blocker

**UX-02 — Footer brand name drifts: "Emberforge Labs" vs "Emberforge Works"**
- **Page:** `blog.html` (vs every other page)
- **Location:** `blog.html:268` footer — "© 2026 Emberforge **Labs**". All 7 other pages say "Emberforge **Works**".
- **Issue:** The legal/brand entity name is inconsistent on one page.
- **Why it matters:** Wrong company name in the footer undermines trust and looks careless; pick one.
- **Recommended fix:** Change `blog.html` footer to "Emberforge Works" (or standardize all pages to the correct entity name).
- **Severity:** Medium (cheap fix, but it's a factual brand error)
- **Priority tier:** Launch-blocker

---

### Pre-launch polish

**UX-03 — Blog index is thin and a category has no posts**
- **Page:** `blog.html`
- **Location:** featured `.feat-card` (line 185) + `#postGrid` (line 209); category chips lines 176–179
- **Issue:** Only 2 posts surface (1 featured + 1 grid card) because the other two are drafts. The category bar offers only "All" and "Tools & Systems," yet the HIPAA draft is tagged "Legal & Insurance" — a category with zero posts and no chip. Clicking "Tools & Systems" filters to the single grid card.
- **Why it matters:** A near-empty blog with one filterable item feels unfinished; reduces the SEO/credibility value of having a blog at all.
- **Recommended fix:** Publish the two drafts (see UX-01) and add them as grid cards so the index has 3–4 real posts; only show category chips that have ≥1 published post.
- **Severity:** Medium
- **Priority tier:** Pre-launch polish

**UX-04 — Back-to-blog link missing on the draft posts (template deviation)**
- **Page:** ALL draft posts (`does-hipaa…`, `the-end-of-midnight…`)
- **Location:** `cat-badge` in `.post-header` — `<span class="cat-badge">` (hipaa:95, midnight:95)
- **Issue:** The two finished posts use `<a href="/blog" class="cat-badge">` (clickable category badge = back to blog) with a `:hover`. The draft posts use a non-clickable `<span>` and omit the hover rule, so there's no in-content "back to blog" affordance — only the nav/footer.
- **Why it matters:** Inconsistent reading experience; readers expect the category pill to return them to the blog.
- **Recommended fix:** Make the draft posts' `cat-badge` an `<a href="/blog">` and add the `.cat-badge:hover` rule to match the reference template.
- **Severity:** Low
- **Priority tier:** Pre-launch polish

**UX-05 — Post meta is inconsistent: no dates anywhere, read-time on only one post**
- **Page:** ALL blog posts + blog index
- **Location:** `.post-meta` (each post header); blog index `.byline`
- **Issue:** No post shows a publish date. Only `the-end-of-midnight…` (line 101) shows "6 min read"; the other three show just avatar + "By The DoulaFlow Team."
- **Why it matters:** No date hurts reader trust (looks stale/undated) and is a missed SEO signal; the lone read-time makes the set look unfinished.
- **Recommended fix:** Standardize `.post-meta` across all posts — add a date (and either add read-time everywhere or remove it). Mirror the same meta on the blog index cards.
- **Severity:** Medium
- **Priority tier:** Pre-launch polish

**UX-06 — Home page content isn't width-constrained; every other page is (1120px)**
- **Page:** `index.html` (vs about / blog / posts / privacy)
- **Location:** `index.html` sections use `.df-features`, `.df-pain`, etc. with only `padding: 4rem 2.5rem` and **no `max-width`** (lines 61, 72, 81, 97, 121). All other pages wrap content in `.wrap { max-width: 1120px; margin: 0 auto }` (e.g. `about-us.html:36`).
- **Issue:** On wide monitors (>~1300px) the home feature grid, hero, and bands stretch edge-to-edge while About/Blog stay centered at 1120px. Navigating home↔elsewhere makes the layout width visibly jump.
- **Why it matters:** Breaks the "same site" feeling and lets the 3-col feature grid stretch uncomfortably wide on large screens.
- **Recommended fix:** Wrap home section inner content in a max-width container (1120px, centered) like the other pages — or cap the grids/hero. Mobile is unaffected.
- **Severity:** Medium
- **Priority tier:** Pre-launch polish

**UX-07 — Nav alignment differs between home and the rest**
- **Page:** `index.html` (vs all other pages)
- **Location:** `index.html` nav is the bare `.df-nav` with `padding: 1.1rem 2.5rem` (line 23). Every other page wraps nav in `.wrap` (max-width 1120px), e.g. `about-us.html:148`.
- **Issue:** On wide screens the home logo/links sit hard against the viewport edges while other pages' nav is constrained to 1120px and centered — the logo shifts horizontally as you move between pages. Home also has a second breakpoint at 560px that the other pages (520px) don't share.
- **Why it matters:** A nav that shifts position page-to-page reads as inconsistent; the nav is the most-seen shared element.
- **Recommended fix:** Put the home nav inside the same `.wrap` container and align the mobile breakpoints (820/520) used elsewhere.
- **Severity:** Low–Medium
- **Priority tier:** Pre-launch polish

**UX-08 — Footer link sets differ across page types**
- **Page:** ALL (three different footer variants)
- **Location:** footers — `index.html:377`, `about-us.html:292`, `blog.html:260`, post footers (e.g. `…pipelines.html:244`)
- **Issue:** Three different link lists: home = Features/Pricing/About/Blog/**Privacy** (no Log in); about & blog = …/Privacy/**Log in**; all 4 posts = Features/Pricing/About/Blog/**Log in** (no Privacy).
- **Why it matters:** A footer that gains/loses Privacy and Log in depending on the page is inconsistent and can hide the Privacy link on the very pages (posts) where it's a useful trust anchor.
- **Recommended fix:** Define one canonical footer link set (recommend: Features, Pricing, About, Blog, Privacy, Log in) and use it on every page.
- **Severity:** Low
- **Priority tier:** Pre-launch polish

**UX-09 — Low-contrast mauve text (#9b6b78) on cream throughout**
- **Page:** ALL
- **Location:** `#9b6b78` on `#faf6f1` — footer copy, `.post-meta`, `.df-price-desc`, `.df-trust p`, blog `.byline`, eyebrows, `.cover-mark`
- **Issue:** `#9b6b78` on `#faf6f1` is ~3.9:1 — below WCAG AA (4.5:1) for the 12–14px text it's used on. The dark-band variants (white-on-`#2c1a1a`) are fine; this is the light-section text.
- **Why it matters:** Harder to read for low-vision users and in bright light; fails accessibility audits.
- **Recommended fix:** Darken the small-text mauve to ~`#7d5360` (or `#6b4a52`, already used and ~5:1) where it sits on cream; keep the lighter tone only for large/decorative text.
- **Severity:** Medium
- **Priority tier:** Pre-launch polish

**UX-10 — Focus outlines removed from form inputs with no replacement**
- **Page:** `index.html`, `blog.html`
- **Location:** `index.html` `.df-email-row input` / `.df-name-row input` (lines 101, 104) and `blog.html` `.signup input` (line 113) all set `outline: none`. No `:focus`/`:focus-visible` style replaces it; no page defines a focus style for links/buttons either.
- **Issue:** Keyboard users get no visible focus indicator on the demo and newsletter inputs.
- **Why it matters:** Keyboard accessibility failure on the site's primary conversion fields.
- **Recommended fix:** Replace with a visible focus style (e.g. `input:focus { border-color:#5c2d3e; box-shadow:0 0 0 3px rgba(92,45,62,.18) }`) and add a global `:focus-visible` outline for links/buttons.
- **Severity:** Medium
- **Priority tier:** Pre-launch polish

**UX-11 — Minor typographic drift between the two post templates**
- **Page:** ALL draft posts vs reference posts
- **Location:** `body { line-height }` and `article h2 { font-size }`
- **Issue:** Reference posts use body `line-height: 1.7` and `h2` clamp max **30px**; draft posts use `line-height: 1.6` and `h2` clamp max **28px**. The draft `.post-wrap` also omits the `4rem` bottom padding the reference posts have.
- **Why it matters:** Subtle reading-rhythm inconsistency once the drafts are filled in and published.
- **Recommended fix:** When finishing the drafts, sync their CSS to the reference post template (1.7 line-height, h2 → 30px, post-wrap bottom padding).
- **Severity:** Low
- **Priority tier:** Pre-launch polish

---

### Post-launch / nice-to-have

**UX-12 — Generic avatar gradients used as author/photo placeholders**
- **Page:** about (team/quote `.av`), all blog posts (`.post-meta .av`), blog index bylines
- **Location:** `.av` gradient circles (e.g. `about-us.html:123`, `…pipelines.html:104`)
- **Issue:** Author/team "photos" are empty gradient blobs. Acceptable as a deliberate brand choice, but on the About team section especially they read as missing images.
- **Why it matters:** Real faces build trust on an About page; blobs are a neutral-to-slightly-unfinished signal.
- **Recommended fix:** Add real headshots for Erick/Megan on About at minimum; keep gradient avatars for the generic "DoulaFlow Team" byline if preferred.
- **Severity:** Low
- **Priority tier:** Post-launch

**UX-13 — Blog index cover art is abstract gradients, not images**
- **Page:** `blog.html`
- **Location:** `.feat-img` / `.post-img` gradient + Tabler icon (lines 186–195, 213–221)
- **Issue:** Branded icon-on-gradient covers. Consistent and intentional, but generic; fine for launch.
- **Why it matters:** Real/illustrated covers improve scannability and click-through, but this is polish, not a blocker.
- **Recommended fix:** Optional — introduce per-post illustrations or photos later; current fallback is acceptable.
- **Severity:** Low
- **Priority tier:** Post-launch

---

### Summary

**Pages audited:** `index.html`, `about-us.html`, `blog.html`, `privacy-policy.html`, and 4 posts under `/blog/` (2 finished, 2 placeholder drafts).

**Top 3 launch-blockers across the site:**
1. **UX-01** — two live blog posts are unfinished placeholders ("Body content coming soon"), with canonical URLs making them indexable.
2. **UX-02** — `blog.html` footer says "Emberforge **Labs**" while every other page says "Emberforge **Works**" — wrong brand name.
3. **UX-03** — blog index effectively has one real card and a category ("Legal & Insurance") with no posts; the blog looks unfinished.

**Cross-page consistency problems:** home page content/nav are not width-constrained while every other page caps at 1120px (UX-06, UX-07); footer link sets differ across home / about+blog / posts (UX-08); low-contrast mauve and missing focus styles are site-wide (UX-09, UX-10); the two post templates have diverged slightly (UX-04, UX-05, UX-11).

**Honest mobile-readiness take:** Contrary to the hunch, mobile is **largely NOT broken** — every page has a working hamburger nav at 820px and all multi-column grids collapse (feature 3→2→1, pricing/pain → 1col, about vgrid 4→2→1, blog pgrid 3→1), with no obvious horizontal-overflow traps. The real launch risks here are **content/consistency (drafts, brand name, thin blog) and accessibility (contrast, focus)**, not mobile layout.

*Audit complete — stopping here per instructions. Awaiting switch to dev/implementation mode before any changes.*

---

## CC Task — Add "Start Free Trial" CTAs sitewide (self-serve signup launch) — 2026-07-03

**Context.** DoulaFlow is opening **self-serve trial signup**. The app now has a public signup page at
**`https://app.mydoulaflow.com/signup`** (doula-only account creation → free trial). The marketing site's
only job is to *link* to it — **no forms, no Stripe, no auth logic here** (all of that lives in the app).
The existing **demo / waitlist** lead flow (`#waitlist` form → `submitDemo()` → `api/lead.js`) **STAYS** as-is;
it's a separate, still-wanted path for doulas who want a demo first. So: **keep demo, add trial.**

**Already done on `index.html`** (done by hand — verify, don't redo):
- **Nav** button → "Start Free Trial" → `/signup` (was "Request A Demo").
- **Hero** → "Start Free Trial" primary; "Request A Demo" kept as a ghost; "See how it works" kept.
- **Pricing card** → "Start Free Trial" primary + "Or request a demo" ghost (still scrolls to `#waitlist`).
- The demo form + `submitDemo()` + `api/lead.js` are **untouched**.

### 1. Propagate the nav "Start Free Trial" button to every other page
These pages currently have only a **"Log in"** nav, no trial/demo CTA:
`about-us.html`, `blog.html`, `terms-of-service.html`, `privacy-policy.html`, and **all `blog/*.html` posts**.
Add the same trial button to each page's nav, next to "Log in":
```html
<a href="https://app.mydoulaflow.com/signup" class="df-nav-cta">Start Free Trial</a>
```
- **Match each page's own nav markup.** Each HTML file has its own inline `<style>`; the `.df-nav-cta`
  button style may be defined only on `index.html`. On pages where it isn't, either copy the `.df-nav-cta`
  rule into that page's `<style>` or reuse whatever CTA button class that page already has — the goal is a
  visible filled button that matches the site, not a bare link. Keep "Log in" (→ `https://app.mydoulaflow.com`) as-is.
- Mind the per-page nav differences called out in the audit (UX-07): some pages wrap nav in `.wrap`. Place
  the button in the same nav-right group as "Log in".

### 2. Consistency check (all pages)
- Every primary CTA points at the **exact** URL `https://app.mydoulaflow.com/signup` — the **`app.`** subdomain
  (NOT `portal.`, NOT root `mydoulaflow.com`). Signup is doula-only; the `app.` host is the doula-mode entry.
- The demo path (`#waitlist` form on `index.html`) still works and is still reachable.
- No page leads with "Request A Demo" as its *only* nav CTA anymore — trial leads, demo is secondary.

### 3. (Optional) Footers
Footer link sets already differ per page (audit UX-08). If you standardize footers, you *may* add a
"Start Free Trial" link there too — not required for this task.

### Acceptance
- On every page: nav shows "Log in" **and** "Start Free Trial", and the trial button links to
  `https://app.mydoulaflow.com/signup` and renders as a styled button (not an unstyled link).
- `index.html` demo form still submits to `api/lead.js` (unchanged).
- Buttons visually consistent with each page's existing nav.

### ⚠️ Do NOT deploy until the app's signup is live
These CTAs point at `app.mydoulaflow.com/signup`, which only works once the **DoulaFlow app** ships its
signup batch (self-serve `/signup` + the server-side entitlement write-gate + trial expiry) **and** Supabase
**"Confirm email" is turned OFF**. Deploying the marketing change earlier sends visitors to a signup that
404s or provisions accounts before the gate is ready. **This marketing deploy is the LAST step, timed to the
app opening the door — Erick coordinates the timing.** Build/commit the changes now; hold the deploy.