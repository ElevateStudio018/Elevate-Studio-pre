// Browser test of the customer journey. The API answers come from the real worker code (worker/*.js).
// Run: python3 -m http.server 8767 & node tests/e2e.mjs
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import fs from 'node:fs';
import { domainCheck, mailDiag } from '../worker/domains.js';
import { createOrder } from '../worker/orders.js';
const BASE = 'http://localhost:8767/', OUT = process.env.OUT || '/tmp';
const catalog = fs.readFileSync(new URL('../assets/data/catalog.json', import.meta.url), 'utf8');
const env = { ASSETS: { fetch: async () => new Response(catalog) }, SUPABASE_URL: 'https://db.test' };
let pass = 0, fail = 0; const errors = [], orders = [];
const ok = (cond, name) => { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name); } };
const b = await pw.chromium.launch();
async function page(w = 1280, h = 900) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  p.on('pageerror', (e) => errors.push(e.message)); p.on('dialog', (d) => d.accept());
  const relay = async (r, fn) => { const res = await fn(); r.fulfill({ status: res.status, contentType: 'application/json', body: await res.text() }); };
  await p.route('**/api/domain/check**', (r) => relay(r, () => domainCheck(new Request(r.request().url()))));
  await p.route('**/api/mail/diag**', (r) => relay(r, () => mailDiag(new Request(r.request().url()))));
  await p.route('**/api/order', (r) => { orders.push(JSON.parse(r.request().postData())); return relay(r, () => createOrder(new Request('https://x/api/order', { method: 'POST', body: r.request().postData() }), env)); });
  await p.route('**/formsubmit.co/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":"true"}' }));
  return p;
}
// 1-3: home, menu, domain search
let p = await page();
await p.goto(BASE + 'index.html'); try { await p.click('text=Avböj', { timeout: 1500 }); } catch (e) { /* no banner */ }
ok(await p.isVisible('.nav-new >> text=Domäner'), 'menyn visar Domäner & mejl med Nytt');
ok(await p.locator('.promo2__card').count() === 2, 'startsidan har domän- och mejlkortet');
ok(await p.locator('.wm__cal').count() === 0, 'kalendern är borta från mejlkortet');
await p.goto(BASE + 'domaner.html');
await p.fill('#dom-form input', 'x'); await p.click('#dom-form button');
ok((await p.textContent('#dom-hint')).includes('minst två'), 'för kort sökning ger tydligt fel');
const name = 'esq' + Date.now().toString(36);
await p.fill('#dom-form input', 'google'); await p.click('#dom-form button'); await p.waitForSelector('.shop-watch', { timeout: 40000 });
await p.click('.shop-watch'); await p.fill('.dom-watch input', 'test@example.se'); await p.click('.dom-watch button'); await p.waitForSelector('.dom-watch__ok', { timeout: 10000 });
ok((await p.textContent('.dom-watch')).includes('test@example.se'), 'bevaka en upptagen domän ger bekräftelse');
await p.fill('#dom-form input', name); await p.click('#dom-form button');
await p.waitForSelector('.shop-row', { timeout: 40000 });
ok(await p.locator('.shop-list').first().locator('.shop-row').count() === 12, '12 toppdomäner visas');
ok((await p.locator('.shop-st--ok').count()) >= 10, 'nytt namn visas som ledigt');
ok(await p.isVisible('text=Demopris') || (await p.textContent('.shop-note')).includes('demopriser'), 'demopriser är märkta');
await p.click('#dom-chips [data-tld="com"]'); ok(await p.locator('.shop-list').first().locator('.shop-row').count() === 1, 'toppdomänknappen .com filtrerar till en rad');
await p.click('#dom-chips [data-tld="com"]'); ok(await p.locator('.shop-list').first().locator('.shop-row').count() === 12, 'klick igen visar alla');
ok(!(await p.locator('.shop-list .shop-row').first().innerText()).includes('Förnyas'), 'bara ett pris per rad');
await p.click('#dom-chips [data-tld="se"]'); await p.click('.shop-add'); ok((await p.textContent('.dom-side')).includes('1 produkt'), 'sidokortet visar varukorgen'); await p.waitForTimeout(300);
ok(!(await p.isVisible('#shop-bar')), 'ingen dubbel summarad på domänsidan');
ok(await p.isVisible('.dom-pack'), 'paketet visas under resultaten');
await p.click('#dom-pack'); await p.waitForTimeout(200); ok((await p.textContent('.dom-side')).includes('3 produkter'), 'paketet lägger domän, mejl och hemsida i varukorgen (efter .se: ' + (await p.textContent('.dom-side__sum')) + ')');
await p.screenshot({ path: OUT + '/e2e_1_domaner.png' });
// 4-5: business mail
await p.goto(BASE + 'foretagsmejl.html'); await p.waitForSelector('.shop-plan');
await p.click('.shop-plan >> nth=1 >> .m-add'); ok(await p.evaluate(() => !document.querySelector('.shop-plan:nth-child(2) .m-dom').checkValidity()), 'mejl utan domän stoppas med felmeddelande');
await p.fill('.shop-plan >> nth=1 >> .m-dom', name + '.se'); await p.fill('.shop-plan >> nth=1 >> .m-extra', '2'); await p.fill('.shop-plan >> nth=1 >> .m-addr', 'info, kontakt');
await p.click('.shop-plan >> nth=1 >> .m-add'); await p.waitForTimeout(200);
ok(await p.waitForFunction(() => (document.querySelector('#shop-bar') || {}).textContent && /[0-9]+ produkter/.test(document.querySelector('#shop-bar').textContent), null, { timeout: 3000 }).then(() => true).catch(() => false), 'mejlpaket lagt i varukorgen (summaraden på mejlsidan)');
await p.click('input[value="year"] + span'); ok((await p.textContent('.shop-plan .shop-price')).includes('/år'), 'periodval växlar till per år');
await p.fill('#diag-form input', 'inte en domän'); await p.click('#diag-form button'); await p.waitForTimeout(300);
ok((await p.textContent('#diag-out')).includes('Skriv en domän'), 'mejlkontroll med fel inmatning ger tydligt fel');
await p.fill('#diag-form input', 'elevatestudio.nu'); await p.click('#diag-form button'); await p.waitForSelector('.shop-row--diag', { timeout: 30000 });
ok(await p.locator('.shop-row--diag').count() === 4, 'mejlkontrollen visar MX, SPF, DKIM, DMARC');
// 6-9: cart and checkout
await p.goto(BASE + 'kassa.html'); await p.waitForSelector('.shop-total');
const t1 = await p.textContent('.shop-total'); ok(t1.includes('Engångskostnad') && t1.includes('per månad') && t1.includes('Moms'), 'kassan visar engångs, återkommande och moms');
await p.selectOption('.c-years', '2'); const t2 = await p.textContent('.shop-total'); ok(t2.includes('298 kr'), '2 år .se = 298 kr');
await p.click('#checkout button[type=submit]'); ok((await p.textContent('#checkout-status')).includes('namn'), 'kassan kräver namn och e-post');
await p.fill('#checkout input[name=name]', 'Test Testsson'); await p.fill('#checkout input[name=email]', 'test@example.se');
await p.click('#checkout button[type=submit]'); ok((await p.textContent('#checkout-status')).includes('villkoren'), 'kassan kräver godkända villkor');
await p.check('#checkout input[name=terms]');
await p.click('#checkout button[type=submit]'); await p.click('#checkout button[type=submit]', { force: true, timeout: 1000 }).catch(() => {});
await p.waitForSelector('.form-prefill', { timeout: 15000 });
const conf = await p.textContent('.form-prefill'); ok(/ES-[A-Z0-9]+/.test(conf), 'orderbekräftelse med ordernummer');
ok(conf.includes('ingen betalning') && conf.includes('inte gjord'), 'bekräftelsen skiljer betalning och registrering');
ok(new Set(orders.map((o) => o.key)).size === 1, 'dubbelklick ger samma ordernyckel (' + orders.length + ' anrop)');
await p.screenshot({ path: OUT + '/e2e_2_bekraftelse.png' });
ok(await p.evaluate(() => (JSON.parse(localStorage.getItem('es.cart') || '[]')).length === 0), 'varukorgen töms efter beställning');
// 10-16: portal (demo data)
p = await page();
await p.goto(BASE + 'portal.html?demo'); await p.waitForSelector('.pa-nav', { timeout: 15000 });
ok((await p.textContent('.portal-demo')).includes('testdata'), 'portalen visar tydligt demoläge');
ok((await p.textContent('.pa-todo')).includes('exempelbygg.se om'), 'varning för domän som går ut');
for (const t of ['besokare', 'sajten', 'tjanster', 'fakturor', 'support', 'konto', 'oversikt']) { await p.click('.pa-nav [data-tab=' + t + ']'); await p.waitForTimeout(150); ok(await p.locator('#pv').innerText() !== '', 'fliken ' + t + ' visar innehåll'); }
await p.click('.pa-nav [data-tab=tjanster]'); await p.click('[data-renew="s1"]'); ok(await p.isChecked('[data-renew="s1"]'), 'automatisk förnyelse kan slås på');
await p.click('[data-help="s2"]'); ok(await p.inputValue('select[name=service]') === 's2', 'Hjälp med den här förväljer tjänsten i supporten');
await p.fill('#tn input[name=subject]', 'Testärende'); await p.fill('#tn textarea', 'Beskrivning'); await p.click('#tn button');
await p.waitForTimeout(300); ok((await p.textContent('#pv')).includes('Testärende'), 'nytt supportärende syns i listan');
await p.click('[data-t="t1"]'); await p.waitForSelector('.portal-msg'); ok(await p.locator('.portal-msg').count() === 2, 'supporttråden visar kund och Elevate Studio');
await p.selectOption('#pc', 'c2'); await p.waitForTimeout(300); ok((await p.inputValue('#pc')) === 'c2', 'byte av företag');
await p.click('#logout'); await p.waitForSelector('#pl'); ok(await p.isVisible('#pl'), 'logga ut visar inloggningen');
// mobile: no sideways scrolling on the new pages
for (const f of ['index.html', 'domaner.html', 'foretagsmejl.html', 'kassa.html', 'portal.html?demo', 'testa.html']) {
  const m = await page(390, 844); await m.goto(BASE + f); await m.waitForTimeout(700);
  const over = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ok(over <= 1, 'mobil 390 px utan sidledsscroll: ' + f + (over > 1 ? ' (' + over + ' px för brett)' : ''));
  await m.screenshot({ path: OUT + '/e2e_mobil_' + f.replace(/\W/g, '_') + '.png', fullPage: true });
}
ok(errors.length === 0, 'inga JavaScript-fel' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
await b.close(); console.log(`\n${pass} passerade, ${fail} misslyckades`); process.exit(fail ? 1 : 0);
