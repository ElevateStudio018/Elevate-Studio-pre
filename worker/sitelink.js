// Connect a customer's own website admin to the customer portal.
// The customer copies a connection code from their site's admin (Inställningar → Kundportal → Kopiera kod)
// and pastes it in the portal. The code holds the site address and a read key: "es1." + base64url(JSON {u, k}).
// The key is encrypted (AES-GCM, MAIL_SESSION_KEY) before it is stored and never goes back to the browser.
// The site answers GET {u}/api/portal with header "Authorization: Bearer {k}" and JSON:
//   { name, admin_url, leads: [{ name, email, phone, message, created_at, status }], counts: { leads, new } }
import { seal, open } from './webmail.js';

const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const unb64u = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

export function parseCode(code) {
  const c = String(code || '').trim();
  let o = null;
  if (/^es1\.[A-Za-z0-9_-]+$/.test(c)) { try { o = JSON.parse(unb64u(c.slice(4))); } catch (e) { o = null; } }
  if (!o || typeof o.u !== 'string' || typeof o.k !== 'string' || o.k.length < 16 || o.k.length > 200) return null;
  let url; try { url = new URL(o.u); } catch (e) { return null; }
  // Only public https sites: no localhost, IP addresses or internal names
  if (url.protocol !== 'https:' || !/\.[a-z]{2,}$/i.test(url.hostname) || /^(localhost|.*\.local|.*\.internal)$/i.test(url.hostname) || /^[\d.]+$|:/.test(url.hostname)) return null;
  return { base: url.origin + url.pathname.replace(/\/+$/, ''), key: o.k };
}

// The signed-in user (from the portal's Supabase session) and their role in the company
async function member(req, env, company) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token || !/^[0-9a-f-]{36}$/i.test(company || '')) return null;
  const h = { apikey: env.SUPABASE_KEY, Authorization: `Bearer ${token}` };
  const who = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: h });
  const user = who.ok ? await who.json() : null; if (!user?.id) return null;
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/company_members?select=role&company_id=eq.${company}&user_id=eq.${user.id}`, { headers: h });
  const row = r.ok ? (await r.json())[0] : null;
  return row ? { user, role: row.role } : null;
}
const svc = (env, path, init = {}) => fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });

export async function remote(base, key, fetcher = fetch) {
  const r = await fetcher(`${base}/api/portal`, { headers: { Authorization: `Bearer ${key}`, accept: 'application/json' }, redirect: 'manual', signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!r || !r.ok) return { error: r ? (r.status === 401 || r.status === 403 ? 'key' : 'site') : 'site' };
  const d = await r.json().catch(() => null); if (!d || typeof d !== 'object') return { error: 'format' };
  const s = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  let admin = s(d.admin_url, 300); try { if (new URL(admin).protocol !== 'https:') admin = ''; } catch (e) { admin = ''; }
  return { name: s(d.name, 120), admin_url: admin, counts: { leads: +(d.counts || {}).leads || 0, new: +(d.counts || {}).new || 0 },
    leads: (Array.isArray(d.leads) ? d.leads : []).slice(0, 50).map((l) => ({ name: s(l.name, 120), email: s(l.email, 200), phone: s(l.phone, 40), message: s(l.message, 1000), created_at: s(l.created_at, 40), status: s(l.status, 30) })) };
}

export async function siteLink(req, env, fetcher = fetch) {
  if (!env.SUPABASE_SERVICE_KEY) return json({ error: 'setup' }, 503);
  const u = new URL(req.url), b = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const company = b.company_id || u.searchParams.get('company_id');
  const m = await member(req, env, company); if (!m) return json({ error: 'auth' }, 401);
  const action = u.pathname.split('/').pop();
  if (action === 'connect' || action === 'disconnect') {
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    if (!/owner|admin|tech/.test(m.role)) return json({ error: 'role' }, 403);
    if (action === 'disconnect') { await svc(env, `site_connections?company_id=eq.${company}`, { method: 'DELETE' }); return json({ ok: true }); }
    const c = parseCode(b.code); if (!c) return json({ error: 'code' }, 400);
    const d = await remote(c.base, c.key, fetcher); if (d.error) return json({ error: d.error }, 400);
    const key_enc = await seal(env, { k: c.key, exp: 253402300799000 });
    const r = await svc(env, 'site_connections', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ company_id: company, base_url: c.base, key_enc, site_name: d.name, connected_by: m.user.id, connected_at: new Date().toISOString() }) });
    if (!r.ok) return json({ error: 'save' }, 500);
    return json({ ok: true, base_url: c.base, ...d });
  }
  // data
  const row = await svc(env, `site_connections?company_id=eq.${company}&select=base_url,key_enc`).then((r) => r.json()).then((l) => l[0]).catch(() => null);
  if (!row) return json({ connected: false });
  const k = await open(env, row.key_enc); if (!k) return json({ connected: true, base_url: row.base_url, error: 'key' });
  const d = await remote(row.base_url, k.k, fetcher);
  return json({ connected: true, base_url: row.base_url, ...d });
}
