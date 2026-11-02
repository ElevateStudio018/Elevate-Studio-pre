// Admin views with stand-in data (no real database). Run: python3 -m http.server 8767 & node tests/admin_e2e.cjs
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const OUT = process.env.OUT || '/tmp';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = 'x.' + b64({ sub: 'u1', aud: 'authenticated', role: 'authenticated', aal: 'aal1', email: 'isak@elevatestudio.nu', exp: Math.floor(Date.now() / 1000) + 3600 }) + '.y';
const user = { id: 'u1', email: 'isak@elevatestudio.nu', aud: 'authenticated', user_metadata: {} };
const now = new Date().toISOString();
const data = {
  user_roles: [{ user_id: 'u1', role: 'admin' }],
  orders: [{ id: 1, ref: 'ES-TEST1', created_at: now, name: 'Test Testsson', email: 'test@example.se', company: 'Test AB', lines: [{ type: 'domain', name: 'test.se', years: 1 }, { type: 'mail', name: 'Mejl Bas', domain: 'test.se' }], totals: { once: 149, month: 49 }, status: 'awaiting_quote', payment_status: 'not_required_yet', delivery_status: 'manual' }],
  site_tests: [{ id: 1, created_at: now, url: 'https://exempel.se/', test_type: 'quick', strategy: 'mobile', performance: 92, accessibility: 88, best_practices: 100, seo: 45, issues: 6 }, { id: 2, created_at: now, url: 'https://exempel.se/', test_type: 'deep', pages: 28, seo: 99, issues: 3 }],
  newsletter_signups: [{ id: 1, created_at: now, email: 'a@b.se', page: '/' }],
};
let pass = 0, fail = 0; const errs = [], patches = [];
const ok = (c, n) => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  p.on('pageerror', (e) => errs.push(e.message));
  await p.route('**/auth/v1/token**', (r) => r.fulfill({ json: { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user } }));
  await p.route('**/auth/v1/user**', (r) => r.fulfill({ json: user }));
  await p.route('**/rest/v1/**', (r) => { const t = new URL(r.request().url()).pathname.split('/').pop(); if (r.request().method() === 'PATCH') patches.push(t + ' ' + r.request().postData()); r.fulfill({ json: data[t] || [] }); });
  await p.route('**/api/**', (r) => r.fulfill({ json: {} }));
  await p.goto('http://localhost:8767/admin/index.html');
  await p.waitForSelector('input[type=email]', { timeout: 15000 }); await p.fill('input[type=email]', 'isak@elevatestudio.nu'); await p.fill('input[type=password]', 'hemligt123'); await p.click('button[type=submit]');
  await p.waitForTimeout(2500);
  for (const [v, txt] of [['bestallningar', 'ES-TEST1'], ['sajttester', 'exempel.se'], ['nyhetsbrev', 'a@b.se']]) {
    const btn = p.locator('button.nav[data-view="' + v + '"]').first();
    if (!(await btn.isVisible())) await p.click('text=MER').catch(() => {});
    await btn.click();
    await p.waitForTimeout(900); const body = await p.textContent('body');
    ok(body.includes(txt), 'admin ' + v + ' visar data'); await p.screenshot({ path: OUT + '/admin_' + v + '.png', fullPage: true });
  }
  await p.click('button.nav[data-view="bestallningar"]'); await p.waitForTimeout(900);
  await p.click('button.nav[data-view="sajttester"]'); await p.waitForTimeout(500); await p.click('button.nav[data-view="bestallningar"]'); await p.waitForTimeout(900);
  const sel = p.locator('select[data-f="payment_status"]').first();
  if (await sel.count()) { await sel.selectOption('paid'); await p.waitForTimeout(400); ok(patches.filter((x) => /orders .*paid/.test(x)).length === 1, 'statusändring sparas en gång på rätt order, även efter att vyn öppnats igen (' + patches.length + ' PATCH)'); } else ok(false, 'betalningsstatus går att ändra');
  await p.click('button.nav[data-view="sajttester"]'); await p.waitForTimeout(900);
  const bar = p.locator('.barrow').first(); if (await bar.count()) { await bar.hover(); await p.waitForTimeout(200); ok(await p.isVisible('.bubble'), 'pratbubblan visas vid hovring över stapel'); await p.screenshot({ path: OUT + '/admin_bubbla.png' }); } else ok(false, 'staplar finns');
  ok(errs.length === 0, 'inga JavaScript-fel i admin' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  await b.close(); console.log(pass + ' passerade, ' + fail + ' misslyckades'); process.exit(fail ? 1 : 0);
})();
