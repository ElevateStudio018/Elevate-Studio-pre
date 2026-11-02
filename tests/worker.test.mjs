// Server tests for domains, mail diagnostics, orders, logging and newsletter. Run: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createOrder } from '../worker/orders.js';
import { domainCheck, mailDiag } from '../worker/domains.js';
import { log } from '../worker/log.js';
import { subscribe } from '../worker/newsletter.js';
import { registrar } from '../worker/registrar.js';

const catalog = fs.readFileSync(new URL('../assets/data/catalog.json', import.meta.url), 'utf8');
const ASSETS = { fetch: async () => new Response(catalog, { headers: { 'content-type': 'application/json' } }) };
const stored = [];
const env = (extra = {}) => ({ ASSETS, SUPABASE_URL: 'https://db.test', ...extra });
const post = (url, body) => new Request('https://elevatestudio.nu' + url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const customer = { name: 'Test Testsson', email: 'test@example.se' };

test('order: prices come from the catalog, never from the browser', async () => {
  const r = await createOrder(post('/api/order', { customer, terms: true, items: [{ type: 'domain', domain: 'test.se', years: 1, price: 1 }] }), env());
  const d = await r.json();
  assert.equal(r.status, 200); assert.equal(d.totals.once, 149); assert.match(d.ref, /^ES-/); assert.equal(d.stored, false);
});
test('order: several years = first year + renewals, capped at 10 years', async () => {
  const d = await (await createOrder(post('/api/order', { customer, terms: true, items: [{ type: 'domain', domain: 'test.com', years: 99 }] }), env())).json();
  assert.equal(d.totals.once, 169 * 10);
});
test('order: mail per month and extra accounts', async () => {
  const d = await (await createOrder(post('/api/order', { customer, terms: true, items: [{ type: 'mail', id: 'mejl-foretag', period: 'month', extra: 2, domain: 'test.se' }] }), env())).json();
  assert.equal(d.totals.month, 199 + 2 * 35);
});
test('order: unknown products and TLDs are dropped, empty cart is refused', async () => {
  const r = await createOrder(post('/api/order', { customer, terms: true, items: [{ type: 'domain', domain: 'x.xyz' }, { type: 'mail', id: 'fake' }] }), env());
  assert.equal(r.status, 400); assert.equal((await r.json()).error, 'empty');
});
test('order: needs name, valid e-mail and accepted terms', async () => {
  assert.equal((await createOrder(post('/api/order', { customer: { name: '', email: 'x' }, terms: true, items: [] }), env())).status, 400);
  const r = await createOrder(post('/api/order', { customer, terms: false, items: [{ type: 'domain', domain: 'a.se' }] }), env());
  assert.equal((await r.json()).error, 'terms');
  assert.equal((await createOrder(new Request('https://x/api/order'), env())).status, 405);
});
test('order: negative extra accounts cannot lower the price', async () => {
  const d = await (await createOrder(post('/api/order', { customer, terms: true, items: [{ type: 'mail', id: 'mejl-bas', extra: -50, domain: 'a.se' }] }), env())).json();
  assert.equal(d.totals.month, 49);
});
test('registrar: demo by default, never live without explicit setting and keys', () => {
  assert.equal(registrar({}).name, 'Demo'); assert.equal(registrar({}).live, false);
  assert.equal(registrar({ REGISTRAR: 'resellerclub', REGISTRAR_LIVE: 'true' }).live, false);
});
test('domain check: invalid names are refused', async () => {
  assert.equal((await domainCheck(new Request('https://x/api/domain/check?q=a'))).status, 400);
  const x = await (await domainCheck(new Request('https://x/api/domain/check?q=%3Cb%3E%22x%22&ideas=0&tlds=se'))).json();
  assert.equal(x.name, 'bx'); // markup is stripped, never echoed
});
test('domain check: a known registered domain is taken, a random one is free (live registry)', async () => {
  const d = await (await domainCheck(new Request('https://x/api/domain/check?q=google&tlds=com,se&ideas=0'))).json();
  assert.equal(d.results.find((x) => x.tld === 'com').status, 'taken');
  const n = 'esq' + Date.now().toString(36);
  const f = await (await domainCheck(new Request('https://x/api/domain/check?q=' + n + '&tlds=com,se&ideas=0'))).json();
  assert.equal(f.results.find((x) => x.tld === 'com').status, 'free');
  assert.equal(f.results.find((x) => x.tld === 'se').status, 'likely_free');
});
test('mail diagnostics: refuses bad input, reads real DNS', async () => {
  assert.equal((await mailDiag(new Request('https://x/api/mail/diag?domain=nope'))).status, 400);
  const d = await (await mailDiag(new Request('https://x/api/mail/diag?domain=elevatestudio.nu'))).json();
  assert.equal(d.mx.found, true); assert.equal(d.spf.found, true);
});
test('log: answers 204 and stores nothing without the service key', async () => {
  assert.equal((await log(post('/api/log', { kind: 'chat', question: 'hej' }), env())).status, 204);
});
test('newsletter: bad e-mail 400, no storage and no Brevo gives 503 (the form then falls back)', async () => {
  assert.equal((await subscribe(post('/api/newsletter', { email: 'x' }), env())).status, 400);
  assert.equal((await subscribe(post('/api/newsletter', { email: 'a@b.se' }), env())).status, 503);
});
test('order: a transfer is priced as transfer + one year, not as a new registration', async () => {
  const d = await (await createOrder(post('/api/order', { customer, terms: true, items: [{ type: 'domain', domain: 'test.info', transfer: true, years: 5 }] }), env())).json();
  assert.equal(d.totals.once, 0 + 299);
});
test('order: the same checkout key gives the same order number (no double orders)', async () => {
  const body = { customer, terms: true, key: 'abc123def456', items: [{ type: 'domain', domain: 'ab.se' }] };
  const a = await (await createOrder(post('/api/order', body), env())).json();
  const b = await (await createOrder(post('/api/order', body), env())).json();
  assert.equal(a.ref, b.ref); assert.equal(a.ref, 'ES-ABC123DEF456');
});
import { watchDomain, checkWatches } from '../worker/watch.js';
test('order: the Starter website in the package is priced from the catalog', async () => {
  const d = await (await createOrder(post('/api/order', { customer, terms: true, items: [{ type: 'domain', domain: 'ab.se' }, { type: 'website', id: 'starter', once: 1 }] }), env())).json();
  assert.equal(d.totals.once, 149 + 5000);
});
test('watch: bad input 400, no database 503 (the page then mails info@)', async () => {
  assert.equal((await watchDomain(post('/api/domain/watch', { email: 'x', domain: 'ab.se' }), env())).status, 400);
  assert.equal((await watchDomain(post('/api/domain/watch', { email: 'a@b.se', domain: 'trattan.com' }), env())).status, 503);
});
test('daily watch check: mails only when the domain is free, then marks it', async () => {
  const calls = []; const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opt = {}) => { calls.push([opt.method || 'GET', String(url)]); return new Response(JSON.stringify([{ id: 1, email: 'a@b.se', domain: 'ledig.se' }, { id: 2, email: 'c@d.se', domain: 'tagen.se' }])); };
  const mails = [];
  const n = await checkWatches({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_KEY: 'k' }, async (name) => ({ status: name === 'ledig' ? 'likely_free' : 'taken' }), async (to, subj) => mails.push([to, subj]));
  globalThis.fetch = realFetch;
  assert.equal(n, 1); assert.deepEqual(mails, [['a@b.se', 'ledig.se är ledig']]); assert.ok(calls.some((c) => c[0] === 'PATCH' && c[1].includes('id=eq.1')));
});
