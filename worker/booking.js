// Self-booking: the admin mails a link, the customer picks a free time on /boka/<link>, the meeting
// lands in the Elevate Google Calendar (with a Meet link) and both sides get mail. The link is a
// signed token with the lead's details, so nothing needs to be stored to make it work; the key is
// a Cloudflare secret (BOOKING_SECRET, or the Gmail password when that is not set).
import { googleReady, createMeet, busyTimes, listEvents, deleteEvent } from './google.js';
import { adminUser, oneMail, sendGmail } from './invite.js';
import { timeProposal, meetingInvite, ics, personalMail, TEAM } from '../supabase/functions/mail/templates.ts';

const TZ = 'Europe/Stockholm';
const OPEN = 9, CLOSE = 17;   // the working day, local time
const STEP = 30;              // minutes between offered start times
const DAYS = 10;              // working days offered
const NOTICE = 3 * 36e5;      // nothing sooner than three hours from now
const LINK_DAYS = 21;         // how long a link works
const TYPES = { google_meet: 'Google Meet', phone: 'Telefonmöte', teams: 'Microsoft Teams' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const clip = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
// The customer never waits on a slow mail server: a send that takes too long is given up (the booking stands)
const timed = (promise, ms) => Promise.race([promise, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);

/* ---------- Signed links ---------- */
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
async function key(env) {
  const secret = env.BOOKING_SECRET || env.GMAIL_APP_PASSWORD;
  if (!secret) return null;
  return crypto.subtle.importKey('raw', new TextEncoder().encode('booking:' + secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export const bookingReady = (env) => !!(env.BOOKING_SECRET || env.GMAIL_APP_PASSWORD);
export async function sign(env, payload) {
  const k = await key(env);
  const body = b64u(new TextEncoder().encode(JSON.stringify(payload)));
  return `${body}.${b64u(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(body)))}`;
}
async function verify(env, token) {
  const k = await key(env);
  if (!k || typeof token !== 'string' || token.length > 2000) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    if (!(await crypto.subtle.verify('HMAC', k, unb64u(sig), new TextEncoder().encode(body)))) return null;
    const p = JSON.parse(new TextDecoder().decode(unb64u(body)));
    return p && p.l && p.e && p.x > Date.now() ? p : null;
  } catch { return null; }
}

/* ---------- Stockholm time (the server runs in UTC) ---------- */
function parts(ms) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
}
function offsetMin(ms) {
  const p = parts(ms);
  return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - Math.floor(ms / 6e4) * 6e4) / 6e4);
}
// The instant when a wall clock in Stockholm shows the given time
function fromLocal(y, m, d, h, mi) {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  return guess - offsetMin(guess) * 6e4;
}
const fmt = (ms, opts) => new Date(ms).toLocaleString('sv-SE', { timeZone: TZ, ...opts });

/** The next working days with the open and closing time of each. */
function offeredDays(now) {
  const days = [];
  const first = parts(now);
  let noon = fromLocal(first.y, first.m, first.d, 12, 0);
  for (let i = 0; days.length < DAYS && i < 40; i++, noon += 864e5) {
    const p = parts(noon);
    if (p.dow < 1 || p.dow > 5) continue;
    const open = fromLocal(p.y, p.m, p.d, OPEN, 0), close = fromLocal(p.y, p.m, p.d, CLOSE, 0);
    if (close < now + NOTICE) continue;
    days.push({ date: `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`, open, close,
      wd: fmt(noon, { weekday: 'short' }).replace('.', ''), d: p.d, mon: fmt(noon, { month: 'short' }).replace('.', ''), long: fmt(noon, { weekday: 'long', day: 'numeric', month: 'long' }) });
  }
  return days;
}
/** Start times on the grid for one day, marked free when the calendar has nothing there. */
function slots(day, minutes, busy, now) {
  const out = [];
  for (let t = day.open; t + minutes * 6e4 <= day.close; t += STEP * 6e4) {
    const end = t + minutes * 6e4;
    const free = t >= now + NOTICE && !busy.some(([a, b]) => t < b && end > a);
    out.push({ t, free });
  }
  return out;
}
async function busyOrNone(env, from, to) {
  if (!googleReady(env)) return { busy: [], live: false };
  try { return { busy: await busyTimes(env, new Date(from), new Date(to)), live: true }; } catch { return { busy: [], live: false }; }
}
/** The meeting already booked from this link, if any (found through the mark on the calendar event). */
async function existing(env, p) {
  if (!googleReady(env)) return null;
  const now = Date.now();
  const items = await listEvents(env, new Date(now - 7 * 864e5), new Date(now + 200 * 864e5), { privateExtendedProperty: `elevate_link=${p.c}` }).catch(() => []);
  const ev = items.find((x) => x.status !== 'cancelled' && x.start?.dateTime);
  if (!ev) return null;
  return { id: ev.id, at: Date.parse(ev.start.dateTime), minutes: Math.round((Date.parse(ev.end.dateTime) - Date.parse(ev.start.dateTime)) / 6e4), link: ev.hangoutLink || null };
}

/* ---------- Admin: make the link and mail it ---------- */
export async function bookingLink(req, env) {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const auth = await adminUser(req, env);
  if (!auth) return json({ error: 'auth' }, 401);
  let input; try { input = await req.json(); } catch { return json({ error: 'json' }, 400); }
  if (!bookingReady(env)) return json({ error: 'not_configured' }, 503);
  const r = await auth.db(`/rest/v1/quote_requests?id=eq.${encodeURIComponent(String(input.lead_id))}&select=id,name,email`);
  const [lead] = r.ok ? await r.json() : [];
  if (!lead?.email) return json({ error: 'lead' }, 404);
  const minutes = Math.min(Math.max(Math.round((Number(input.minutes) || 30) / 15) * 15, 15), 120);
  const type = TYPES[input.type] ? input.type : 'google_meet';
  const h = TEAM[String(input.sender || '')] ? String(input.sender) : '';
  const now = Date.now();
  const p = { l: lead.id, e: lead.email, n: lead.name || '', h, m: minutes, t: type, c: now, x: now + LINK_DAYS * 864e5 };
  const url = `${new URL(req.url).origin}/boka/${await sign(env, p)}`;
  // Three quick picks for the mail: the first free time on three different days, 10:00 when it is free
  const days = offeredDays(now);
  const { busy } = await busyOrNone(env, now, days[days.length - 1].close);
  const picks = [];
  for (const d of days) {
    const free = slots(d, minutes, busy, now).filter((s) => s.free);
    const ten = free.find((s) => parts(s.t).h === 10 && parts(s.t).mi === 0);
    if (free.length) picks.push((ten || free[0]).t);
    if (picks.length === 3) break;
  }
  const out = { ok: true, url, picks };
  if (input.send === false) return json(out);
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) return json({ error: 'not_configured' }, 503);
  const host = TEAM[h];
  const mail = timeProposal({ name: lead.name || '', url, minutes, type: TYPES[type], host, message: clip(input.message, 2000),
    picks: picks.map((t) => ({ day: fmt(t, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, ''), time: fmt(t, { hour: '2-digit', minute: '2-digit' }), url: `${url}?v=${t}` })) });
  const res = await oneMail(env, auth, lead, { mail, host });
  return res.ok ? json(out) : res;
}

/* ---------- The booking page: what to show ---------- */
export async function bookingInfo(req, env) {
  const p = await verify(env, new URL(req.url).searchParams.get('t'));
  if (!p) return json({ error: 'link' }, 404);
  const host = TEAM[p.h] || null;
  const now = Date.now();
  const days = offeredDays(now);
  const { busy, live } = await busyOrNone(env, now, days[days.length - 1].close);
  const booked = await existing(env, p);
  return json({ ok: true, name: p.n, email: p.e, first: (p.n || '').trim().split(/\s+/)[0] || '', host: host && { first: host.first, name: host.name, role: host.role },
    minutes: p.m, type: TYPES[p.t] || 'Möte', live, booked, expires: p.x,
    days: days.map((d) => { const s = slots(d, p.m, busy, now); return { date: d.date, wd: d.wd, d: d.d, mon: d.mon, long: d.long, free: s.filter((x) => x.free).length, slots: s }; }) });
}

/* ---------- The booking page: book the chosen time ---------- */
export async function bookingBook(req, env) {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  let input; try { input = await req.json(); } catch { return json({ error: 'json' }, 400); }
  const p = await verify(env, input.t);
  if (!p) return json({ error: 'link' }, 404);
  const start = Number(input.at), now = Date.now();
  const day = offeredDays(now).find((d) => start >= d.open && start < d.close);
  if (!day || (start - day.open) % (STEP * 6e4) !== 0 || start + p.m * 6e4 > day.close || start < now + NOTICE) return json({ error: 'slot' }, 409);
  const end = start + p.m * 6e4;
  const prior = await existing(env, p);
  const { busy } = await busyOrNone(env, start - 864e5, end + 864e5);
  if (busy.some(([a, b]) => start < b && end > a && !(prior && Math.abs(a - prior.at) < 6e4))) return json({ error: 'taken' }, 409);

  const host = TEAM[p.h], type = TYPES[p.t] || 'Möte';
  let link = null, uid, provider = 'google';
  if (googleReady(env)) {
    if (prior) await deleteEvent(env, prior.id).catch(() => {});
    try {
      const ev = await createMeet(env, { start: new Date(start), minutes: p.m, title: `Möte: ${p.n || p.e} och Elevate Studio`,
        description: `${type} · kunden valde tiden själv via länk${host ? '\nVärd: ' + host.name : ''}\n${p.e}`, attendee: p.e, name: p.n, conference: p.t === 'google_meet',
        props: { elevate_self: '1', elevate_lead: String(p.l), elevate_link: String(p.c), elevate_host: p.h, elevate_type: p.t, elevate_minutes: String(p.m) } });
      link = ev.link; uid = ev.uid;
    } catch (e) { return json({ error: String(e.message || e).slice(0, 300) }, 502); }
  } else if (p.t === 'google_meet') {
    const room = [...crypto.getRandomValues(new Uint8Array(12))].map((x) => (x % 36).toString(36)).join('');
    link = `https://meet.jit.si/ElevateStudio-${room}`; provider = 'jitsi';
  }

  const when = fmt(start, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const canMail = !!(env.GMAIL_USER && env.GMAIL_APP_PASSWORD);
  let mailed = false;
  if (canMail) {
    const mail = meetingInvite({ name: p.n, when, minutes: p.m, type, link: link || undefined, host, subject: `Bokat: ${when} – möte med Elevate Studio`,
      heading: 'Tack, mötet är bokat!', intro: `Du valde en tid som passar dig, så nu är allt klart. Här är det du behöver.` });
    const cal = ics({ start: new Date(start), minutes: p.m, title: 'Möte med Elevate Studio', location: link || undefined, description: type, attendee: p.e, uid, organizer: uid ? env.GMAIL_USER : undefined });
    try { await timed(sendGmail(env, { name: p.n, email: p.e }, { mail, cal, host }), 15000); mailed = true; } catch { /* the booking stands; the page shows the details */ }
    // The host and the shared inbox hear about it right away
    const notice = personalMail({ name: host ? host.first : 'Elevate', subject: `Bokat av kunden: ${p.n || p.e} – ${when}`,
      body: `${p.n || p.e} valde en tid via länken.\n\nTid: ${when} (${p.m} min)\nTyp: ${type}${link ? '\nLänk: ' + link : ''}\nMejl: ${p.e}\n\nMötet ligger i Google Kalender och syns på leaden i admin.`,
      host, button_label: 'Öppna admin', button_url: `${new URL(req.url).origin}/admin/` });
    for (const to of new Set([host?.email, env.GMAIL_USER].filter(Boolean))) {
      try { await timed(sendGmail(env, { email: to }, { mail: notice }), 10000); } catch { /* not the customer's problem */ }
    }
  }
  return json({ ok: true, at: start, minutes: p.m, link, provider, type, when, mailed, email: p.e, rebooked: !!prior });
}

/* ---------- Admin: meetings the customers booked themselves, to put on the leads ---------- */
export async function bookingSync(req, env) {
  const auth = await adminUser(req, env);
  if (!auth) return json({ error: 'auth' }, 401);
  if (!googleReady(env)) return json({ ok: true, rows: [] });
  const now = Date.now();
  let items = [];
  try { items = await listEvents(env, new Date(now - 30 * 864e5), new Date(now + 200 * 864e5), { privateExtendedProperty: 'elevate_self=1' }); } catch (e) { return json({ error: String(e.message || e).slice(0, 200) }, 502); }
  const rows = items.filter((ev) => ev.status !== 'cancelled' && ev.start?.dateTime).map((ev) => {
    const x = ev.extendedProperties?.private || {};
    return { lead_id: x.elevate_lead, at: new Date(ev.start.dateTime).toISOString(), minutes: Number(x.elevate_minutes) || Math.round((Date.parse(ev.end.dateTime) - Date.parse(ev.start.dateTime)) / 6e4),
      type: x.elevate_type || 'google_meet', host: x.elevate_host || '', link: ev.hangoutLink || null, event_id: ev.id };
  });
  return json({ ok: true, rows });
}
