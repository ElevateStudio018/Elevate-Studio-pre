// Meeting invites from the admin, sent through Gmail (elevate.studio018@gmail.com) in the green design
// with a calendar file. The Gmail app password is a Cloudflare secret (GMAIL_APP_PASSWORD), never in the code.
import { WorkerMailer } from 'worker-mailer';
import { meetingInvite, ics, TEAM } from '../supabase/functions/mail/templates.ts';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const clip = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

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
  const cal = ics({ start, minutes, title: 'Möte med Elevate Studio', location: link, description: `${type}${link ? '\n' + link : ''}`, attendee: lead.email });
  return { mail, cal, host };
}

export async function sendGmail(env, to, built) {
  const bytes = new TextEncoder().encode(built.cal);
  let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); });
  await WorkerMailer.send({
    host: env.SMTP_HOST || 'smtp.gmail.com', port: Number(env.SMTP_PORT || 465), secure: env.SMTP_PORT ? env.SMTP_PORT === '465' : true,
    startTls: !!env.SMTP_STARTTLS, credentials: { username: env.GMAIL_USER, password: env.GMAIL_APP_PASSWORD }, authType: ['plain', 'login'],
  }, {
    from: { name: built.host ? `${built.host.first} på Elevate Studio` : 'Elevate Studio', email: env.GMAIL_USER },
    to: { name: to.name || undefined, email: to.email },
    subject: built.mail.subject, html: built.mail.html, text: built.mail.text,
    attachments: [{ filename: 'mote.ics', content: btoa(bin), mimeType: 'text/calendar; method=REQUEST' }],
  });
}

export async function handleInvite(req, env) {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) return json({ error: 'not_configured' }, 503);
  const auth = await adminUser(req, env);
  if (!auth) return json({ error: 'auth' }, 401);
  let input; try { input = await req.json(); } catch { return json({ error: 'json' }, 400); }
  const r = await auth.db(`/rest/v1/quote_requests?id=eq.${encodeURIComponent(String(input.lead_id))}&select=id,name,email`);
  const [lead] = r.ok ? await r.json() : [];
  if (!lead?.email) return json({ error: 'lead' }, 404);
  const built = buildInvite(lead, input);
  if (!built) return json({ error: 'time' }, 400);
  let status = 'sent', detail = null;
  try { await sendGmail(env, lead, built); } catch (e) { status = 'failed'; detail = String(e && e.message || e).slice(0, 300); }
  await auth.db('/rest/v1/outbound_messages', { method: 'POST', body: JSON.stringify({ channel: 'email', recipient: lead.email, subject: built.mail.subject, status, detail, quote_request_id: lead.id, sent_by: auth.user.id }) }).catch(() => {});
  return status === 'sent' ? json({ ok: true, from: env.GMAIL_USER }) : json({ error: detail }, 502);
}
