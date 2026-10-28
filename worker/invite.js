// Mail from the admin, sent through Gmail (elevate.studio018@gmail.com) in the green design:
// meeting invites (with a calendar file), personal mails, review requests and mail campaigns.
// The Gmail app password is a Cloudflare secret (GMAIL_APP_PASSWORD), never in the code.
import { WorkerMailer } from 'worker-mailer';
import { googleReady, createMeet } from './google.js';
import { meetingInvite, ics, reviewRequest, personalMail, campaign, TEAM } from '../supabase/functions/mail/templates.ts';

const REVIEW_URL = 'https://search.google.com/local/writereview?placeid=ChIJcRLSybPJX0YRomaZlUJ2bzY';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const clip = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 255;

// The caller must be signed in to the admin with the admin role; the database checks the same rules.
async function adminUser(req, env) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const db = (path, init = {}) => fetch(`${env.SUPABASE_URL}${path}`, {
    ...init, headers: { apikey: env.SUPABASE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) }
  });
  const who = await db('/auth/v1/user');
  const user = who.ok ? await who.json() : null;
  if (!user?.id) return null;
  const role = await db('/rest/v1/rpc/has_role', { method: 'POST', body: JSON.stringify({ _user_id: user.id, _role: 'admin' }) });
  if (!role.ok || (await role.json()) !== true) return null;
  return { user, db };
}

export function buildInvite(lead, input) {
  const start = new Date(String(input.at));
  if (isNaN(start.getTime())) return null;
  const minutes = Math.min(Math.max(Number(input.minutes) || 30, 5), 480);
  const host = TEAM[String(input.sender || '')];
  const when = start.toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const link = clip(input.link, 500), type = clip(input.type, 60) || 'Möte';
  const mail = meetingInvite({ name: lead.name || '', when, minutes, type, link, message: clip(input.message, 2000), host });
  const cal = ics({ start, minutes, title: 'Möte med Elevate Studio', location: link, description: `${type}${link ? '\n' + link : ''}`, attendee: lead.email,
    uid: clip(input.uid, 200), organizer: input.uid ? input.organizer : undefined });
  return { mail, cal, host };
}

const smtp = (env) => ({
  host: env.SMTP_HOST || 'smtp.gmail.com', port: Number(env.SMTP_PORT || 465), secure: env.SMTP_PORT ? env.SMTP_PORT === '465' : true,
  startTls: !!env.SMTP_STARTTLS, credentials: { username: env.GMAIL_USER, password: env.GMAIL_APP_PASSWORD }, authType: ['plain', 'login'],
});
const base64 = (text) => { let bin = ''; new TextEncoder().encode(text).forEach((b) => { bin += String.fromCharCode(b); }); return btoa(bin); };
const message = (env, to, built) => ({
  from: { name: built.host ? `${built.host.first} på Elevate Studio` : 'Elevate Studio', email: env.GMAIL_USER },
  to: { name: to.name || undefined, email: to.email },
  subject: built.mail.subject, html: built.mail.html, text: built.mail.text,
  ...(built.cal ? { attachments: [{ filename: 'mote.ics', content: base64(built.cal), mimeType: 'text/calendar; method=REQUEST' }] } : {}),
});

export async function sendGmail(env, to, built) {
  await WorkerMailer.send(smtp(env), message(env, to, built));
}

async function oneMail(env, auth, lead, built) {
  let status = 'sent', detail = null;
  try { await sendGmail(env, lead, built); } catch (e) { status = 'failed'; detail = String(e && e.message || e).slice(0, 300); }
  if (lead.id) await auth.db('/rest/v1/outbound_messages', { method: 'POST', body: JSON.stringify({ channel: 'email', recipient: lead.email, subject: built.mail.subject, status, detail, quote_request_id: lead.id, sent_by: auth.user.id }) }).catch(() => {});
  return status === 'sent' ? json({ ok: true, from: env.GMAIL_USER }) : json({ error: detail }, 502);
}

export async function handleMail(req, env, forcedAction) {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const auth = await adminUser(req, env);
  if (!auth) return json({ error: 'auth' }, 401);
  let input; try { input = await req.json(); } catch { return json({ error: 'json' }, 400); }
  const action = forcedAction || input.action;
  const sending = !(action === 'invite' && input.send === false);
  if (sending && (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD)) return json({ error: 'not_configured' }, 503);
  const host = TEAM[String(input.sender || '')];

  // Who it goes to: a lead from the database, or (for a contact) an address given by the admin
  let lead = null;
  if (input.lead_id) {
    const r = await auth.db(`/rest/v1/quote_requests?id=eq.${encodeURIComponent(String(input.lead_id))}&select=id,name,email`);
    [lead] = r.ok ? await r.json() : [];
  } else if (isEmail(input.email)) {
    lead = { email: input.email.trim(), name: clip(input.name, 100) || '' };
  }

  if (action === 'invite') {
    if (!lead?.email) return json({ error: 'lead' }, 404);
    if (isNaN(new Date(String(input.at)).getTime())) return json({ error: 'time' }, 400);
    // Google Meet without a link given: the event and its Meet link are made in the Elevate calendar
    let meet = null;
    if (input.auto_meet && !clip(input.link, 500) && !googleReady(env)) {
      // Google not connected yet: a video link that needs no account is made instead (Jitsi Meet)
      const room = [...crypto.getRandomValues(new Uint8Array(12))].map((x) => (x % 36).toString(36)).join('');
      meet = { link: `https://meet.jit.si/ElevateStudio-${room}`, provider: 'jitsi' };
      input = { ...input, link: meet.link, type: 'Videomöte' };
    } else if (input.auto_meet && !clip(input.link, 500)) {
      try {
        meet = await createMeet(env, { start: new Date(String(input.at)), minutes: Math.min(Math.max(Number(input.minutes) || 30, 5), 480),
          title: `Möte: ${lead.name || lead.email} och Elevate Studio`, description: clip(input.message, 2000), attendee: lead.email, name: lead.name });
      } catch (e) { return json({ error: String(e.message || e).slice(0, 300) }, 502); }
      input = { ...input, link: meet.link, uid: meet.uid, organizer: env.GMAIL_USER };
    }
    if (!sending) return json({ ok: true, link: meet?.link || null, provider: meet?.provider || 'google', sent: false });
    const res = await oneMail(env, auth, lead, buildInvite(lead, input));
    if (!meet || !res.ok) return res;
    return json({ ok: true, from: env.GMAIL_USER, link: meet.link, provider: meet.provider || 'google', sent: true });
  }
  if (action === 'review') {
    if (!lead?.email) return json({ error: 'lead' }, 404);
    return oneMail(env, auth, lead, { mail: reviewRequest(lead.name || '', REVIEW_URL, host), host });
  }
  if (action === 'message') {
    if (!lead?.email) return json({ error: 'lead' }, 404);
    const subject = clip(input.subject, 200), body = clip(input.body, 10000);
    if (!subject || !body) return json({ error: 'input' }, 400);
    return oneMail(env, auth, lead, { mail: personalMail({ name: lead.name || '', subject, body, host, button_label: clip(input.button_label, 60), button_url: clip(input.button_url, 500) }), host });
  }
  if (action === 'campaign') {
    const list = (Array.isArray(input.recipients) ? input.recipients : []).filter((x) => isEmail(x?.email)).slice(0, 200);
    const subject = clip(input.subject, 200), text = clip(input.body, 10000);
    if (!list.length || !subject || !text) return json({ error: 'input' }, 400);
    const c = { subject, headline: clip(input.headline, 200) || subject, body: text, button_label: clip(input.button_label, 60), button_url: clip(input.button_url, 500) };
    // One connection, one personal mail per recipient (nobody sees the others)
    const mailer = await WorkerMailer.connect(smtp(env));
    let sent = 0;
    for (const x of list) {
      try { await mailer.send(message(env, x, { mail: campaign({ ...c, name: x.name || '' }) })); sent++; } catch (e) { /* keep going */ }
    }
    try { await mailer.close(); } catch (e) { /* already closed */ }
    return json({ ok: true, sent, from: env.GMAIL_USER });
  }
  return json({ error: 'action' }, 400);
}

export const handleInvite = (req, env) => handleMail(req, env, 'invite');
