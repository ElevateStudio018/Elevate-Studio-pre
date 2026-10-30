// More Google APIs, from the same Google Cloud project as the PageSpeed key.
// Public (Testa din sajt, PSI_API_KEY): Chrome UX Report (real visitors) and Safe Browsing (blacklists).
// Admin only (the Google login in google.js, which also asks for these scopes): Search Console,
// the Google Business Profile reviews, and the lead lists in Google Sheets.
import { adminUser } from './invite.js';
import { accessToken } from './google.js';

const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const SHEET_ID = '15eCIGMxxL1b60gFI99HfKHedswH9iyBpjMTKySS5zcI';
const SHEET_TABS = [['373512640', 'Isak'], ['442223793', 'Carl'], ['708172008', 'Oscar']];

function siteUrl(raw) {
  try { const u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); return u.hostname.includes('.') ? u : null; } catch { return null; }
}

// ---- Chrome UX Report: how fast the site is for real Chrome users over the last 28 days ----
export async function crux(req, env) {
  const u = siteUrl(new URL(req.url).searchParams.get('url') || '');
  if (!u) return json({ error: 'url' }, 400);
  if (!env.PSI_API_KEY) return json({ error: 'key' }, 503);
  const form = new URL(req.url).searchParams.get('strategy') === 'desktop' ? 'DESKTOP' : 'PHONE';
  const ask = (body) => fetch(`https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${env.PSI_API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, formFactor: form }) });
  // the page itself first, then the whole site (smaller sites often only have data for the origin)
  let r = await ask({ url: u.href });
  let scope = 'page';
  if (r.status === 404) { r = await ask({ origin: u.origin }); scope = 'origin'; }
  if (r.status === 404) return json({ none: true });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return json({ error: d.error && d.error.message || r.status }, r.status === 403 ? 503 : 502);
  const m = (d.record && d.record.metrics) || {};
  const pick = (k) => m[k] ? { p75: m[k].percentiles && m[k].percentiles.p75, good: m[k].histogram && m[k].histogram[0] && m[k].histogram[0].density } : null;
  return json({ scope, form, period: d.record && d.record.collectionPeriod,
    lcp: pick('largest_contentful_paint'), inp: pick('interaction_to_next_paint'), cls: pick('cumulative_layout_shift'), fcp: pick('first_contentful_paint'), ttfb: pick('experimental_time_to_first_byte') });
}

// ---- Safe Browsing: is the site on Google's lists of malware, phishing or unwanted software ----
export async function safeBrowsing(req, env) {
  const u = siteUrl(new URL(req.url).searchParams.get('url') || '');
  if (!u) return json({ error: 'url' }, 400);
  if (!env.PSI_API_KEY) return json({ error: 'key' }, 503);
  const r = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${env.PSI_API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client: { clientId: 'elevatestudio', clientVersion: '1' }, threatInfo: {
      threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
      platformTypes: ['ANY_PLATFORM'], threatEntryTypes: ['URL'], threatEntries: [{ url: u.href }, { url: u.origin + '/' }] } }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return json({ error: d.error && d.error.message || r.status }, r.status === 403 ? 503 : 502);
  const threats = [...new Set((d.matches || []).map((x) => x.threatType))];
  return json({ safe: !threats.length, threats });
}

// ---- Admin: Search Console, reviews and the lead sheets, with the connected Google account ----
async function google(req, env) {
  if (!(await adminUser(req, env))) return { res: json({ error: 'auth' }, 401) };
  try { return { token: await accessToken(env) }; } catch (e) { return { res: json({ error: 'google', message: String(e.message || e) }, 503) }; }
}
const gget = async (token, url, opts = {}) => {
  const r = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.error && d.error.message || `HTTP ${r.status}`); e.status = r.status; throw e; }
  return d;
};
const fail = (e) => json({ error: e.status === 403 ? 'scope' : 'google', message: e.message }, e.status === 403 ? 403 : 502);

export async function searchConsole(req, env) {
  const g = await google(req, env); if (g.res) return g.res;
  const days = Math.min(90, Math.max(7, Number(new URL(req.url).searchParams.get('days')) || 28));
  try {
    const sites = (await gget(g.token, 'https://www.googleapis.com/webmasters/v3/sites')).siteEntry || [];
    const site = (sites.find((s) => s.siteUrl === 'sc-domain:elevatestudio.nu') || sites.find((s) => /elevatestudio\.nu/.test(s.siteUrl)) || {}).siteUrl;
    if (!site) return json({ error: 'nosite', sites: sites.map((s) => s.siteUrl) }, 404);
    const end = new Date(Date.now() - 2 * 864e5), start = new Date(end.getTime() - (days - 1) * 864e5);
    const q = (dims, rowLimit) => gget(g.token, `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
      method: 'POST', body: JSON.stringify({ startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), dimensions: dims, rowLimit }) });
    const [total, byDay, queries, pages] = await Promise.all([q([], 1), q(['date'], days), q(['query'], 50), q(['page'], 25)]);
    return json({ site, start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10), total: (total.rows || [])[0] || null,
      days: byDay.rows || [], queries: queries.rows || [], pages: pages.rows || [] });
  } catch (e) { return fail(e); }
}

// Google Business Profile: the reviews, and replies written from the admin
async function location(token) {
  const accounts = (await gget(token, 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts')).accounts || [];
  for (const a of accounts) {
    const locs = (await gget(token, `https://mybusinessbusinessinformation.googleapis.com/v1/${a.name}/locations?readMask=name,title&pageSize=100`)).locations || [];
    const l = locs.find((x) => /elevate/i.test(x.title || '')) || locs[0];
    if (l) return { path: `${a.name}/${l.name}`, title: l.title };
  }
  return null;
}
export async function reviews(req, env) {
  const g = await google(req, env); if (g.res) return g.res;
  try {
    const loc = await location(g.token);
    if (!loc) return json({ error: 'nolocation' }, 404);
    if (req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      const id = String(b.id || '').replace(/[^\w-]/g, ''), text = String(b.reply || '').trim().slice(0, 4000);
      if (!id) return json({ error: 'id' }, 400);
      const url = `https://mybusiness.googleapis.com/v4/${loc.path}/reviews/${id}/reply`;
      if (!text) { await gget(g.token, url, { method: 'DELETE' }); return json({ ok: true, removed: true }); }
      return json({ ok: true, reply: await gget(g.token, url, { method: 'PUT', body: JSON.stringify({ comment: text }) }) });
    }
    const d = await gget(g.token, `https://mybusiness.googleapis.com/v4/${loc.path}/reviews?pageSize=50`);
    return json({ location: loc.title, average: d.averageRating || null, count: d.totalReviewCount || 0, reviews: (d.reviews || []).map((r) => ({
      id: r.reviewId, name: r.reviewer && r.reviewer.displayName, photo: r.reviewer && r.reviewer.profilePhotoUrl, stars: { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }[r.starRating] || null,
      text: r.comment || '', at: r.createTime, reply: r.reviewReply ? r.reviewReply.comment : '', repliedAt: r.reviewReply ? r.reviewReply.updateTime : null })) });
  } catch (e) { return fail(e); }
}

// The three lead lists, read straight from Google Sheets (same rules as the import file they replace)
const norm = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
function statusOf(c) {
  c = c.toLowerCase();
  if (/vill inte|dissat|inte aktu/.test(c)) return 'lost';
  if (/möte (måndag|tisdag|onsdag|torsdag|fredag|imorgon|\d)|möte \d|klockan \d+:\d+|haft möte|skicka mötesinbjudan/.test(c)) return 'meeting_booked';
  if (/priser|startavgift/.test(c)) return 'quote_sent';
  if (/boka in|boka ijn/.test(c)) return 'meeting_to_book';
  return 'contacted';
}
export async function sheetLeads(req, env, fallback) {
  const g = await google(req, env); if (g.res) return g.res.status === 401 ? g.res : json(fallback || []);
  try {
    const meta = await gget(g.token, `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties(sheetId,title)`);
    const tabs = SHEET_TABS.map(([gid, who]) => [(meta.sheets || []).find((s) => String(s.properties.sheetId) === gid), who]).filter((t) => t[0]);
    const old = Object.fromEntries((fallback || []).map((l) => [norm(l.company), l]));
    const seen = {}, out = [];
    for (const [tab, who] of tabs) {
      const rows = (await gget(g.token, `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent("'" + tab.properties.title + "'")}?valueRenderOption=FORMATTED_VALUE`)).values || [];
      for (const raw of rows) {
        const cells = raw.map((c) => String(c).trim());
        const company = cells[0];
        if (!company || /^(TRUE|FALSE)$/.test(company) || /^(ska göras|ska ringa upp|fredag|torsdag|verkar ha dissat mig)$/i.test(company)) continue;
        const rest = cells.slice(1).filter((c) => c && !/^(TRUE|FALSE)$/.test(c));
        const comment = rest.find((c) => c.length > 6 && !c.startsWith('http') && !/^\d{4}-\d{2}-\d{2}$/.test(c)) || '';
        const link = rest.find((c) => c.startsWith('http')) || '';
        const date = rest.find((c) => /^\d{4}-\d{2}-\d{2}$/.test(c)) || '';
        const cat = rest.find((c) => c !== comment && c !== link && c !== date && c.length <= 40 && !/recension/i.test(c)) || '';
        let email = (comment.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [''])[0]; if (email.startsWith('till')) email = email.slice(4);
        const phone = ((comment.match(/(?<!\d)(?:\+46|07)\d[\d \-]{6,12}\d/) || [''])[0]).trim();
        const web = email && !/@(gmail|hotmail|outlook|telia|live|icloud|yahoo)\./.test(email) ? 'https://' + email.split('@')[1].toLowerCase() : '';
        const k = norm(company), prev = old[k] || {};
        const lead = { owner: who, company, name: company, email: email || prev.email || '', phone: phone || prev.phone || '', service_type: cat, status: statusOf(comment),
          note: comment, web: web || prev.web || '', github: prev.github || '', maps: link, first_contact: date };
        if (seen[k]) { if (comment) seen[k].note += `\n${who}: ${comment}`; continue; }
        seen[k] = lead; out.push(lead);
      }
    }
    return json(out);
  } catch (e) { return e.status === 403 ? fail(e) : json(fallback || []); }
}
