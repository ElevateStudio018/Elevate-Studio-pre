// Domain watch: a visitor asks to be told when a taken domain becomes free. Stored in Supabase (domain_watches,
// with the service key); a daily Cron Trigger checks every open watch and mails the visitor once the domain is free.
import { json } from './sitecheck.js';
import { insertRow } from './log.js';

export async function watchDomain(req, env) {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const b = await req.json().catch(() => ({}));
  const email = String(b.email || '').trim().toLowerCase().slice(0, 254), domain = String(b.domain || '').trim().toLowerCase().slice(0, 80);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !/^[a-z0-9åäöéü-]{2,63}\.[a-z]{2,10}$/.test(domain)) return json({ error: 'input' }, 400);
  const ok = await insertRow(env, 'domain_watches', { email, domain });
  return ok ? json({ ok: true }) : json({ error: 'not_ready' }, 503);
}

// Runs from the Worker's scheduled() handler (wrangler.jsonc triggers.crons)
export async function checkWatches(env, checkOne, sendMail) {
  if (!env.SUPABASE_SERVICE_KEY) return 0;
  const h = { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' };
  const rows = await fetch(`${env.SUPABASE_URL}/rest/v1/domain_watches?notified_at=is.null&select=id,email,domain&limit=200`, { headers: h }).then((r) => r.json()).catch(() => []);
  let sent = 0;
  for (const w of Array.isArray(rows) ? rows : []) {
    const [name, ...rest] = w.domain.split('.');
    const r = await checkOne(name, rest.join('.'));
    if (r.status !== 'free' && r.status !== 'likely_free') continue;
    try {
      await sendMail(w.email, `${w.domain} är ledig`, `Hej!\n\nDomänen ${w.domain} som du bevakar ser ut att vara ledig nu.\n\nRegistrera den här: https://elevatestudio.nu/domaner?q=${encodeURIComponent(w.domain)}\n\nHälsningar\nElevate Studio`);
      await fetch(`${env.SUPABASE_URL}/rest/v1/domain_watches?id=eq.${w.id}`, { method: 'PATCH', headers: h, body: JSON.stringify({ notified_at: new Date().toISOString() }) });
      sent++;
    } catch (e) { /* tried again tomorrow */ }
  }
  return sent;
}
