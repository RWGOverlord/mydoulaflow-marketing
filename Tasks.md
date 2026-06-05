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