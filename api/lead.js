// api/lead.js — DoulaFlow form handler
// Emails demo requests and newsletter signups straight to your inbox via Resend.
// No database, no subscriber tracking — just email-me (same pattern as the Emberforge site).
// Deploy on Vercel; the pages POST here to /api/lead.

// --- Config (set these as Vercel env vars in production) ---
const TO_EMAIL   = process.env.LEAD_TO   || 'erick.quintanilla@hotmail.com';
const FROM_EMAIL = process.env.LEAD_FROM || 'DoulaFlow <noreply@mydoulaflow.com>';
// RESEND_API_KEY is read from the environment — never hardcode it. Set it in Vercel project settings.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const clean = (s) => String(s ?? '').trim();

  const formType = clean(body.formType) || 'demo';   // 'demo' | 'newsletter'
  const name     = clean(body.name);
  const email    = clean(body.email);
  const phone    = clean(body.phone);
  const practice = clean(body.practice);  // optional: solo / practice / collective
  const message  = clean(body.message);   // optional note
  const website  = clean(body.website);   // honeypot

  // Bots auto-fill the hidden "website" field. Drop silently, return success.
  if (website) return res.status(200).json({ ok: true });

  // Validate server-side — never trust the client.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }
  // A demo request needs a name; a newsletter signup only needs the email.
  if (formType === 'demo' && !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const rowHtml = (label, val) => val
    ? `<tr><td style="padding:6px 14px 6px 0;color:#9b6b78;vertical-align:top;white-space:nowrap;font-weight:600">${label}</td><td style="padding:6px 0;color:#2c1a1a">${esc(val).replace(/\n/g, '<br>')}</td></tr>`
    : '';

  const isNewsletter = formType === 'newsletter';
  const eyebrow = isNewsletter ? 'Newsletter signup' : 'Demo request';
  const subject = isNewsletter ? 'New newsletter signup — DoulaFlow' : `New demo request — ${name}`;
  const heading = isNewsletter ? esc(email) : esc(name);

  const html = `
    <div style="background:#faf6f1;padding:28px;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
      <div style="max-width:560px;margin:auto;background:#ffffff;border:1px solid #e8ddd5;border-radius:12px;padding:26px">
        <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#9b6b78;margin-bottom:6px">${eyebrow}</div>
        <h2 style="margin:0 0 18px;color:#2c1a1a;font-size:20px;font-family:Georgia,'Times New Roman',serif">${heading}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.55">
          ${rowHtml('Email', email)}
          ${rowHtml('Phone', phone)}
          ${rowHtml('Practice', practice)}
          ${rowHtml('Message', message)}
        </table>
        <p style="margin:20px 0 0;color:#9b6b78;font-size:12px">Reply directly to this email to respond${isNewsletter ? '.' : ` to ${esc(name)}.`}</p>
      </div>
    </div>`;

  const text = [
    isNewsletter ? 'New newsletter signup — DoulaFlow' : `New demo request — ${name}`,
    ``,
    `Email: ${email}`,
    phone    ? `Phone: ${phone}`       : null,
    practice ? `Practice: ${practice}` : null,
    message  ? `Message: ${message}`   : null,
  ].filter(Boolean).join('\n');

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        reply_to: email,            // hit Reply and it goes straight to the lead
        subject,
        html,
        text,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      console.error('Resend error:', resp.status, detail);
      return res.status(502).json({ error: 'Email failed to send' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Lead handler error:', err);
    return res.status(502).json({ error: 'Email failed to send' });
  }
}
