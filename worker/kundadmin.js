// Kundadmin: the server side of the shared admin panel for customer websites.
//
//   GET  /api/site/content?site=<slug>   public: published texts, lists and settings for the site script
//   POST /api/site/lead                  public: a visitor's form (stored with the service key, never from the browser)
//   GET  /api/site/theme?url=<https url> signed in: suggests admin colours from the customer's own website
//   POST /api/kundadmin/agent            signed in: turns a Swedish request into actions the admin shows first
//
// The AI agent never writes anything itself. It returns actions; the panel shows them and applies them with the
// customer's own login, so the database rules (RLS) decide what is allowed. Settings: SUPABASE_SERVICE_KEY,
// ANTHROPIC_API_KEY (without it a small built-in parser handles the most common requests).
import Anthropic from '@anthropic-ai/sdk';

const json = (d, s = 200, extra = {}) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra } });
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' };
const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const svc = (env, path, init = {}) => fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });

// ---------- public content for the site script ----------
export async function siteContent(req, env) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const slug = new URL(req.url).searchParams.get('site') || '';
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return json({ error: 'site' }, 400, cors);
  if (!env.SUPABASE_SERVICE_KEY) return json({ error: 'setup' }, 503, cors);
  const site = (await svc(env, `sites?slug=eq.${slug}&select=id,name,theme,settings`).then((r) => r.json()).catch(() => []))[0];
  if (!site) return json({ error: 'site' }, 404, cors);
  const [content, items] = await Promise.all([
    svc(env, `site_content?site_id=eq.${site.id}&published=not.is.null&select=key,published`).then((r) => r.json()).catch(() => []),
    svc(env, `site_items?site_id=eq.${site.id}&published=eq.true&select=id,kind,data,sort&order=sort.asc,created_at.desc`).then((r) => r.json()).catch(() => []),
  ]);
  const lists = {}; for (const it of items) (lists[it.kind] = lists[it.kind] || []).push({ id: it.id, ...it.data });
  const s = site.settings || {};
  return json({ name: site.name, theme: site.theme, settings: { phone: s.phone || '', email: s.email || '', address: s.address || '', hours: s.hours || '' },
    content: Object.fromEntries(content.map((c) => [c.key, c.published])), lists }, 200, { ...cors, 'cache-control': 'public, max-age=60' });
}

// ---------- visitor forms ----------
const recent = new Map();
export async function siteLead(req, env, sendMail) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, cors);
  const b = await req.json().catch(() => ({}));
  if (b.website) return json({ ok: true }, 200, cors);                       // honeypot: bots fill every field
  const ip = req.headers.get('cf-connecting-ip') || 'x', now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < 10 * 60e3); if (hits.length >= 5) return json({ error: 'För många förfrågningar. Försök igen om en stund.' }, 429, cors);
  hits.push(now); recent.set(ip, hits);
  const slug = clip(b.site, 60), lead = { name: clip(b.name, 120), email: clip(b.email, 200).toLowerCase(), phone: clip(b.phone, 40), service: clip(b.service, 80), message: clip(b.message, 3000), page: clip(b.page, 300) };
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return json({ error: 'site' }, 400, cors);
  if (!lead.message && !lead.service) return json({ error: 'Skriv vad ni behöver hjälp med.' }, 400, cors);
  if (!lead.email && !lead.phone) return json({ error: 'Fyll i e-post eller telefon så att de kan svara.' }, 400, cors);
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) return json({ error: 'E-postadressen ser inte rätt ut.' }, 400, cors);
  if (!env.SUPABASE_SERVICE_KEY) return json({ error: 'setup' }, 503, cors);
  const site = (await svc(env, `sites?slug=eq.${slug}&select=id,name,settings`).then((r) => r.json()).catch(() => []))[0];
  if (!site) return json({ error: 'site' }, 404, cors);
  const r = await svc(env, 'site_leads', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ site_id: site.id, ...lead }) });
  if (!r.ok) return json({ error: 'Kunde inte spara. Försök igen.' }, 500, cors);
  const to = (site.settings || {}).lead_email;
  if (to && sendMail) await sendMail(to, `Ny förfrågan via ${site.name}${lead.service ? ' – ' + lead.service : ''}`,
    `${lead.name || 'Någon'} har skickat en förfrågan via hemsidan.\n\n${lead.service ? 'Gäller: ' + lead.service + '\n' : ''}${lead.message}\n\nE-post: ${lead.email || '–'}\nTelefon: ${lead.phone || '–'}\n\nSvara och se alla förfrågningar i adminpanelen.`).catch(() => {});
  return json({ ok: true }, 200, cors);
}

// ---------- signed-in user (Supabase session from the panel) ----------
async function user(req, env) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_KEY, Authorization: `Bearer ${token}` } });
  const u = r.ok ? await r.json() : null; return u?.id ? { ...u, token } : null;
}
// the site, read with the user's own token: RLS returns it only to members
async function memberSite(env, u, id) {
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) return null;
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/sites?id=eq.${id}&select=id,name,domain,modules,settings`, { headers: { apikey: env.SUPABASE_KEY, Authorization: `Bearer ${u.token}` } });
  return r.ok ? (await r.json())[0] || null : null;
}

// ---------- colours from the customer's website ----------
export function publicHttps(raw) {
  let u; try { u = new URL(raw); } catch (e) { return null; }
  if (u.protocol !== 'https:' || !/\.[a-z]{2,}$/i.test(u.hostname) || /^[\d.]+$|:|^localhost$|\.local$|\.internal$/i.test(u.hostname)) return null;
  return u;
}
const hex = (c) => { c = c.toLowerCase(); if (/^#[0-9a-f]{3}$/.test(c)) c = '#' + c.slice(1).split('').map((x) => x + x).join(''); return /^#[0-9a-f]{6}$/.test(c) ? c : null; };
const lum = (c) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const sat = (c) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); return Math.max(r, g, b) - Math.min(r, g, b); };
export function themeFromHtml(html) {
  const meta = (html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["'](#[0-9a-f]{3,6})["']/i) || [])[1];
  const count = {};
  for (const m of html.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi)) { const c = hex(m[0]); if (c) count[c] = (count[c] || 0) + 1; }
  const colourful = Object.entries(count).filter(([c]) => sat(c) > 40).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const dark = colourful.filter((c) => lum(c) < 0.18), light = colourful.filter((c) => lum(c) > 0.3);
  const primary = hex(meta || '') && sat(hex(meta)) > 40 ? hex(meta) : dark[0] || colourful[0] || '#1d3b2a';
  const accent = light.find((c) => c !== primary) || colourful.find((c) => c !== primary) || '#8fd3a6';
  return { primary, accent, bg: '#f6f8f5', text: '#16241b' };
}
export async function siteTheme(req, env, fetcher = fetch) {
  const u = await user(req, env); if (!u) return json({ error: 'login' }, 401);
  const url = publicHttps(new URL(req.url).searchParams.get('url') || ''); if (!url) return json({ error: 'Skriv en https-adress.' }, 400);
  const r = await fetcher(url.href, { headers: { 'user-agent': 'ElevateStudio-Admin/1.0' }, redirect: 'follow', signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!r || !r.ok) return json({ error: 'Kunde inte läsa hemsidan.' }, 502);
  let html = (await r.text()).slice(0, 400000);
  // also read the first stylesheet on the same site, where most colours live
  const css = (html.match(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/i) || [])[1];
  if (css) { const cu = publicHttps(new URL(css, url).href); if (cu && cu.hostname === url.hostname) html += await fetcher(cu.href, { signal: AbortSignal.timeout(6000) }).then((x) => (x.ok ? x.text() : '')).catch(() => ''); }
  return json(themeFromHtml(html));
}

// ---------- the AI agent ----------
const KEYS = ['hero.title', 'hero.text', 'hero.button', 'about.title', 'about.text', 'contact.title', 'contact.text', 'footer.text'];
const TOOLS = [
  { name: 'set_text', description: 'Ändra en text på hemsidan. Sparas som utkast tills kunden publicerar.', strict: true,
    input_schema: { type: 'object', additionalProperties: false, required: ['key', 'text'], properties: { key: { type: 'string', description: 'Vilken text, t.ex. ' + KEYS.join(', ') }, text: { type: 'string' } } } },
  { name: 'set_setting', description: 'Ändra telefon, e-post, adress, öppettider eller vart förfrågningar mejlas.', strict: true,
    input_schema: { type: 'object', additionalProperties: false, required: ['field', 'value'], properties: { field: { type: 'string', enum: ['phone', 'email', 'address', 'hours', 'lead_email'] }, value: { type: 'string' } } } },
  { name: 'add_item', description: 'Lägg till ett projekt, en tjänst, en nyhet eller en recension.', strict: true,
    input_schema: { type: 'object', additionalProperties: false, required: ['kind', 'title', 'text'], properties: { kind: { type: 'string', enum: ['project', 'service', 'news', 'review'] }, title: { type: 'string' }, text: { type: 'string' }, place: { type: 'string' }, price: { type: 'string' } } } },
  { name: 'open', description: 'Öppna en del av adminpanelen när kunden vill göra något som behöver en människa, t.ex. ladda upp bilder.', strict: true,
    input_schema: { type: 'object', additionalProperties: false, required: ['module'], properties: { module: { type: 'string', enum: ['oversikt', 'sidor', 'forfragningar', 'projekt', 'bilder', 'tjanster', 'nyheter', 'bokningar', 'recensioner', 'installningar'] }, why: { type: 'string' } } } },
];
const SYSTEM = `Du hjälper en småföretagare att ändra sin hemsida i adminpanelen från Elevate Studio.
Kunden skriver vad hen vill på svenska. Använd verktygen för att föreslå ändringarna; kunden ser och godkänner dem innan något sparas.
Skriv korta, vänliga och korrekta svenska texter i företagets ton. Hitta inte på fakta som priser, årtal eller kunder – fråga hellre.
Om något inte går med verktygen (t.ex. bilder eller design), använd open för rätt del och säg kort vad kunden ska göra.
Svara alltid med en mening om vad du föreslår.`;

// a small parser for the most common requests, used when no API key is set (and in the demo)
export function simpleAgent(prompt) {
  const p = prompt.trim(), low = p.toLowerCase(), actions = [];
  const after = (re) => (p.match(re) || [])[1];
  const hours = after(/öppettider\w*\s*(?:till|:|=)?\s*(.+)$/i); if (hours) actions.push({ type: 'set_setting', field: 'hours', value: hours.replace(/[.]$/, '') });
  const phone = after(/telefon\w*\s*(?:nummer)?\s*(?:till|:|=)?\s*([+\d][\d\s-]{5,})/i); if (phone) actions.push({ type: 'set_setting', field: 'phone', value: phone.trim() });
  const title = after(/rubrik\w*\s*(?:på startsidan)?\s*(?:till|:|=)\s*["”]?(.+?)["”]?$/i); if (title) actions.push({ type: 'set_text', key: 'hero.title', text: title });
  const proj = p.match(/(?:lägg till|nytt)\s+(?:ett\s+)?projekt\s+["”]?(.+?)["”]?(?:\s+i\s+([A-ZÅÄÖ][\wåäö-]+))?$/i); if (proj) actions.push({ type: 'add_item', kind: 'project', title: proj[1], text: '', place: proj[2] || '' });
  if (!actions.length) {
    const map = [[/bild|foto/, 'bilder'], [/förfrågan|offert|lead/, 'forfragningar'], [/bokning/, 'bokningar'], [/recension|omdöme/, 'recensioner'], [/nyhet|blogg/, 'nyheter'], [/tjänst|pris/, 'tjanster'], [/text|rubrik|sida/, 'sidor'], [/färg|logga|inställning/, 'installningar']];
    const hit = map.find(([re]) => re.test(low)); if (hit) actions.push({ type: 'open', module: hit[1] });
  }
  const reply = actions.length ? (actions[0].type === 'open' ? 'Jag öppnar rätt ställe åt dig.' : 'Här är mitt förslag. Kontrollera och klicka Gör det.') : 'Jag förstod inte riktigt. Skriv t.ex. "Ändra öppettider till mån–fre 7–16".';
  return { reply, actions };
}

export async function agent(req, env, client) {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const u = await user(req, env); if (!u) return json({ error: 'login' }, 401);
  const b = await req.json().catch(() => ({}));
  const prompt = clip(b.prompt, 2000); if (!prompt) return json({ error: 'Skriv vad du vill göra.' }, 400);
  const site = await memberSite(env, u, b.site_id); if (!site) return json({ error: 'site' }, 403);
  if (!env.ANTHROPIC_API_KEY && !client) return json({ ...simpleAgent(prompt), simple: true });
  const ai = client || new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const context = `Företag: ${site.name}${site.domain ? ' (' + site.domain + ')' : ''}. Nuvarande texter: ${JSON.stringify(b.texts || {}).slice(0, 4000)}. Inställningar: ${JSON.stringify(site.settings || {}).slice(0, 1000)}.`;
  try {
    const res = await ai.beta.messages.create({
      model: 'claude-opus-5-5', max_tokens: 4000, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
      output_config: { effort: 'low' }, system: SYSTEM, tools: TOOLS, tool_choice: { type: 'auto' },
      messages: [{ role: 'user', content: context + '\n\nKunden skriver: ' + prompt }],
    });
    if (res.stop_reason === 'refusal') return json({ reply: 'Det kan jag tyvärr inte hjälpa till med. Kontakta Elevate Studio om du behöver hjälp.', actions: [] });
    const actions = [], text = [];
    for (const blk of res.content) {
      if (blk.type === 'text') text.push(blk.text);
      if (blk.type === 'tool_use' && TOOLS.some((t) => t.name === blk.name)) actions.push({ type: blk.name, ...blk.input });
    }
    return json({ reply: text.join(' ').trim() || (actions.length ? 'Här är mitt förslag.' : 'Jag är inte säker på vad du menar.'), actions: actions.slice(0, 10) });
  } catch (e) {
    console.error('agent', e && e.message);
    return json({ ...simpleAgent(prompt), simple: true, note: 'AI-tjänsten svarade inte, så jag använde den enkla tolkaren.' });
  }
}
