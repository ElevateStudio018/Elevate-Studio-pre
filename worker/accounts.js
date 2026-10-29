// Logins for the team, opened from the admin's Konton page. With the Supabase service key as a
// Cloudflare secret (SUPABASE_SERVICE_KEY) the account is created ready to use, no confirmation
// mail; an account that already exists gets the new password and is confirmed. Without the key the
// admin falls back to the ordinary sign-up, which sends a confirmation mail.
import { adminUser } from './invite.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 255;

export const accountsReady = (env) => !!env.SUPABASE_SERVICE_KEY;

export async function accountsCreate(req, env) {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const auth = await adminUser(req, env);
  if (!auth) return json({ error: 'auth' }, 401);
  let input; try { input = await req.json(); } catch { return json({ error: 'json' }, 400); }
  const email = String(input.email || '').trim().toLowerCase(), password = String(input.password || ''), name = String(input.name || '').trim().slice(0, 100);
  if (!isEmail(email) || password.length < 8) return json({ error: 'input' }, 400);
  if (!env.SUPABASE_SERVICE_KEY) return json({ error: 'no_service_key' }, 503);
  const h = { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' };
  const admin = (path, init) => fetch(`${env.SUPABASE_URL}${path}`, { ...init, headers: { ...h, ...(init?.headers || {}) } });

  // New account, confirmed right away
  let r = await admin('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: name } }) });
  let u = await r.json().catch(() => ({}));
  let how = 'created';
  if (!r.ok) {
    const msg = String(u.msg || u.message || u.error_description || '');
    if (!/already|exists|registered/i.test(msg)) return json({ error: msg || `auth_${r.status}` }, 502);
    // It exists: find it, give it the new password and confirm it
    const list = await admin(`/auth/v1/admin/users?page=1&per_page=200`);
    const users = (await list.json().catch(() => ({}))).users || [];
    const found = users.find((x) => String(x.email || '').toLowerCase() === email);
    if (!found) return json({ error: 'exists' }, 409);
    r = await admin(`/auth/v1/admin/users/${found.id}`, { method: 'PUT', body: JSON.stringify({ password, email_confirm: true, user_metadata: { ...(found.user_metadata || {}), full_name: name || found.user_metadata?.full_name } }) });
    u = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: String(u.msg || u.message || `auth_${r.status}`) }, 502);
    how = 'updated';
  }
  // Admin rights (ignored when the row is already there)
  const role = await admin('/rest/v1/user_roles?on_conflict=user_id,role', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ user_id: u.id, role: 'admin' }) });
  let roleOk = role.ok;
  if (!roleOk) {
    const check = await admin(`/rest/v1/user_roles?user_id=eq.${u.id}&role=eq.admin&select=user_id`);
    roleOk = check.ok && (await check.json().catch(() => [])).length > 0;
  }
  return json({ ok: true, how, id: u.id, role: roleOk });
}
