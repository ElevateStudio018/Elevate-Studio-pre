// Orders from the checkout. The server never trusts prices from the browser: every line is priced again from
// assets/data/catalog.json. Payment and delivery have separate statuses. Without a payment provider (Stripe)
// the order is stored as "awaiting_quote": Elevate Studio confirms by mail and nothing is charged or registered.
import { json } from './sitecheck.js';
import { insertRow } from './log.js';
import { registrar } from './registrar.js';

const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

export async function createOrder(req, env) {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const b = await req.json().catch(() => ({}));
  const cat = await env.ASSETS.fetch(new Request(new URL('/assets/data/catalog.json', req.url))).then((r) => r.json()).catch(() => null);
  if (!cat) return json({ error: 'catalog' }, 500);
  const c = b.customer || {};
  const email = clip(c.email, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !clip(c.name, 120)) return json({ error: 'customer' }, 400);
  if (!b.terms) return json({ error: 'terms' }, 400);
  const lines = [];
  for (const it of (Array.isArray(b.items) ? b.items : []).slice(0, 40)) {
    if (it.type === 'domain') {
      const dom = clip(it.domain, 80).toLowerCase(), tld = dom.split('.').slice(1).join('.');
      const t = cat.tlds.find((x) => x.tld === tld); if (!t) continue;
      const years = Math.max(1, Math.min(10, Number(it.years) || 1));
      lines.push({ type: 'domain', name: dom, years, once: t.register + t.renew * (years - 1), yearly: t.renew });
    } else if (it.type === 'mail') {
      const m = cat.mail.find((x) => x.id === it.id); if (!m) continue;
      const extra = Math.max(0, Math.min(500, Number(it.extra) || 0)), yearlyPlan = it.period === 'year';
      const per = yearlyPlan ? m.yearly + extra * m.extra_account * 12 : (m.monthly + extra * m.extra_account);
      lines.push({ type: 'mail', name: m.name, domain: clip(it.domain, 80), extra, addresses: (it.addresses || []).slice(0, 50).map((a) => clip(a, 120)), period: yearlyPlan ? 'year' : 'month', recurring: per });
    }
  }
  if (!lines.length) return json({ error: 'empty' }, 400);
  const net = { once: lines.reduce((s, l) => s + (l.once || 0), 0), month: lines.filter((l) => l.period === 'month').reduce((s, l) => s + l.recurring, 0), year: lines.reduce((s, l) => s + (l.yearly || 0) + (l.period === 'year' ? l.recurring : 0), 0) };
  const ref = 'ES-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 5).toUpperCase();
  const reg = registrar(env);
  const order = {
    ref, email, name: clip(c.name, 120), company: clip(c.company, 150), org_nr: clip(c.orgnr, 20), phone: clip(c.phone, 40),
    address: clip(c.address, 200), lines, totals: net, vat: cat.vat, demo_prices: !!cat.demo,
    payment_status: 'not_required_yet', delivery_status: 'manual', status: 'awaiting_quote', registrar: reg.name, terms_version: clip(b.terms_version, 20) || '2026-11',
  };
  const stored = await insertRow(env, 'orders', order);
  return json({ ok: true, ref, stored, totals: net, vat: cat.vat, demo: !!cat.demo });
}
