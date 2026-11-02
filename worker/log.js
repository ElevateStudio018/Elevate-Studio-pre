// Small logs for the admin, written with the Supabase service key (Cloudflare secret SUPABASE_SERVICE_KEY):
//  - chat questions      -> chatbot_queries   (what visitors ask the chat, answered or not)
//  - site tests          -> site_tests        (which address was tested on Testa din sajt, and the result)
//  - newsletter sign-ups -> newsletter_signups (see newsletter.js)
// Without the key nothing is stored and the call is answered 204, so the site never breaks.
const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : null) || null;
const num = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(100, Math.round(Number(v)))) : null);

export async function insertRow(env, table, row) {
  if (!env.SUPABASE_SERVICE_KEY || !env.SUPABASE_URL) return false;
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal,resolution=ignore-duplicates' },
    body: JSON.stringify(row),
  }).catch(() => null);
  return !!(r && r.ok);
}

export async function log(req, env) {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  const b = await req.json().catch(() => ({}));
  if (b.kind === 'chat') {
    const question = clip(b.question, 500);
    if (question) await insertRow(env, 'chatbot_queries', { question, matched: !!b.matched, topic: clip(b.topic, 80), page_path: clip(b.page_path, 300) });
  } else if (b.kind === 'sitetest') {
    const url = clip(b.url, 300);
    const s = b.scores || {};
    if (url) await insertRow(env, 'site_tests', {
      url, test_type: b.test_type === 'deep' ? 'deep' : 'quick', strategy: clip(b.strategy, 10),
      performance: num(s.performance), accessibility: num(s.accessibility), best_practices: num(s.best_practices), seo: num(s.seo),
      security: num(s.security), links: num(s.links), pages: Number.isFinite(Number(b.pages)) ? Math.min(100000, Number(b.pages)) : null,
      issues: Number.isFinite(Number(b.issues)) ? Math.min(100000, Number(b.issues)) : null, summary: clip(b.summary, 2000),
      country: (req.cf && req.cf.country) || null,
    });
  }
  return new Response(null, { status: 204 });
}
