// Google Calendar for the Elevate Gmail: a booked meeting becomes an event in its calendar with a
// Google Meet link made automatically. Connected once through /api/google/connect; the keys are
// Cloudflare settings (GOOGLE_CLIENT_ID, secrets GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN).
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const redirectUri = (req) => `${new URL(req.url).origin}/api/google/callback`;

export const googleReady = (env) => !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN);

const page = (title, body) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title>
<body style="margin:0;background:#f5f1e6;font:16px/1.6 system-ui,sans-serif;color:#1d3b2a"><main style="max-width:640px;margin:48px auto;padding:0 20px"><h1 style="font-size:26px">${title}</h1>${body}</main></body>`,
  { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });

// Step 1: send the browser to Google's consent page (sign in as elevate.studio018@gmail.com)
export function googleConnect(req, env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return page('Google är inte förberett', '<p>GOOGLE_CLIENT_ID och GOOGLE_CLIENT_SECRET saknas i Cloudflare.</p>');
  const q = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri(req), response_type: 'code', scope: SCOPE,
    access_type: 'offline', prompt: 'consent', login_hint: env.GMAIL_USER || '' });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${q}`, 302);
}

// Step 2: Google sends the browser back with a code; it is exchanged for the long-lived key,
// which is shown once so it can be pasted into Cloudflare as the secret GOOGLE_REFRESH_TOKEN.
export async function googleCallback(req, env) {
  const code = new URL(req.url).searchParams.get('code');
  if (!code) return page('Kopplingen avbröts', '<p>Google skickade ingen kod. Försök igen från Integrationer i admin.</p>');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri(req), grant_type: 'authorization_code' }) });
  const t = await r.json().catch(() => ({}));
  if (!t.refresh_token) return page('Kopplingen misslyckades', `<p>${String(t.error_description || t.error || 'Ingen nyckel kom tillbaka.').replace(/</g, '&lt;')}</p>`);
  return page('Nästan klart',
    `<p>Kopiera nyckeln nedan. Lägg in den i Cloudflare under Settings &rarr; Variables and Secrets som en <b>Secret</b> med namnet <b>GOOGLE_REFRESH_TOKEN</b>.</p>
<textarea readonly onclick="this.select()" style="width:100%;height:110px;font:14px monospace;padding:12px;border:1px solid #1d3b2a;border-radius:10px">${t.refresh_token}</textarea>
<p>Dela den inte med någon. Stäng sidan när den är inlagd. Därefter får varje Google Meet-möte en länk automatiskt.</p>`);
}

async function accessToken(env) {
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: env.GOOGLE_REFRESH_TOKEN, grant_type: 'refresh_token' }) });
  const t = await r.json().catch(() => ({}));
  if (!t.access_token) throw new Error('Google: ' + (t.error_description || t.error || r.status));
  return t.access_token;
}

// Creates the event in the Elevate calendar with a Meet link. The customer is a guest (so they can
// join without waiting to be let in), but Google sends nothing: the green invite mail does that.
export async function createMeet(env, o) {
  const token = await accessToken(env);
  const end = new Date(o.start.getTime() + o.minutes * 6e4);
  const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=none', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: o.title, description: o.description || '',
      start: { dateTime: o.start.toISOString(), timeZone: 'Europe/Stockholm' }, end: { dateTime: end.toISOString(), timeZone: 'Europe/Stockholm' },
      attendees: o.attendee ? [{ email: o.attendee, displayName: o.name || undefined }] : [],
      conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } },
    }) });
  const ev = await r.json().catch(() => ({}));
  const link = ev.hangoutLink || ev.conferenceData?.entryPoints?.find((p) => p.entryPointType === 'video')?.uri;
  if (!r.ok || !link) throw new Error('Google: ' + (ev.error?.message || r.status));
  return { link, uid: ev.iCalUID, id: ev.id };
}
