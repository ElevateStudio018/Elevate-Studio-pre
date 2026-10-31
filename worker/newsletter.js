// Newsletter sign-ups from the footer form go straight into the Brevo list. The Brevo key and the list id are
// Cloudflare settings (secret BREVO_API_KEY, variable BREVO_LIST_ID); the key never reaches the browser.
export const brevoReady = (env) => !!(env.BREVO_API_KEY && env.BREVO_LIST_ID);

export async function subscribe(req, env) {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  if (!brevoReady(env)) return Response.json({ error: 'not_ready' }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const email = String(b.email || '').trim().toLowerCase().slice(0, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return Response.json({ error: 'email' }, { status: 400 });
  const r = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST', headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, listIds: [Number(env.BREVO_LIST_ID)], updateEnabled: true, attributes: { SOURCE: 'elevatestudio.nu' } }),
  }).catch(() => null);
  if (r && (r.status === 201 || r.status === 204)) return Response.json({ ok: true });
  const d = r ? await r.json().catch(() => ({})) : {};
  return Response.json({ error: 'brevo', message: d.message || 'fel' }, { status: 502 });
}
