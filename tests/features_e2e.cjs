// Portal (drift, månadsrapport, ändringar) and the price calculator. Run: python3 -m http.server 8767 & node tests/features_e2e.cjs
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const OUT = process.env.OUT || '/tmp'; let pass = 0, fail = 0; const errs = [];
const nb = (s) => String(s).replace(/\s/g, ' ');
const ok = (c, n) => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto('http://localhost:8767/portal.html?demo'); try { await p.click('text=Avböj', { timeout: 1200 }); } catch (e) { /* none */ }
  await p.waitForSelector('.pa-nav');
  ok((await p.textContent('.pa-hero')).includes('besökare'), 'översikten visar besökare i den gröna rutan'); ok(await p.isVisible('.pa-kpis'), 'nyckeltal visas');
  await p.click('.pa-nav [data-tab=besokare]'); ok((await p.locator('.pa-tbl').count()) >= 3, 'besöksstatistik med sidor, orter och sökord'); await p.click('[data-r="7"]'); ok(await p.getAttribute('[data-r="7"]', 'aria-pressed') === 'true', 'period kan väljas');
  await p.click('.pa-nav [data-tab=sajten]');
  ok(await p.isVisible('.portal-up'), 'driften visas på översikten'); ok((await p.textContent('.portal-up')).includes('uppe senaste 30 dagarna'), 'drifttid i procent');
  ok(await p.isVisible('.portal-report'), 'månadsrapporten visas'); await p.screenshot({ path: OUT + '/feat_oversikt.png', fullPage: true });
  await p.click('#rep-fix'); await p.waitForSelector('#cr'); ok((await p.inputValue('#cr textarea')).includes('månadsrapporten'), 'Be oss åtgärda öppnar en ändring med texten ifylld');
  ok(await p.isVisible('[data-ok="cr1"]'), 'lämnat pris kan godkännas');
  await p.click('[data-ok="cr1"]'); await p.waitForTimeout(300); ok((await p.textContent('.portal-change')).includes('Godkänd'), 'priset godkänns');
  await p.fill('#cr input[name=page]', '/kontakt'); await p.fill('#cr textarea', 'Lägg till vår nya adress.'); await p.setInputFiles('#cr input[type=file]', { name: 'bild.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgo=', 'base64') });
  await p.waitForTimeout(200); await p.click('#cr button'); await p.waitForTimeout(400);
  ok((await p.textContent('#pv')).includes('Lägg till vår nya adress.'), 'ny ändring syns i listan'); await p.screenshot({ path: OUT + '/feat_andringar.png', fullPage: true });
  await p.goto('http://localhost:8767/priser.html'); await p.waitForSelector('#calc-once'); await p.waitForTimeout(400);
  await p.waitForFunction(() => /kr/.test(document.querySelector('#calc-once').textContent)); ok(nb(await p.textContent('#calc-once')) === '5 000 kr', 'kalkylatorn: Starter 5 000 kr');
  await p.click('.calc__opt:has(input[value=pro])'); await p.click('.calc__opt:has(input[value="mejl-foretag"])'); await p.waitForTimeout(200);
  ok(nb(await p.textContent('#calc-once')) === '9 000 kr' && nb(await p.textContent('#calc-month')) === '199 kr', 'kalkylatorn: Pro och Mejl Företag');
  const sum = await p.$('.calc'); await sum.scrollIntoViewIfNeeded(); await sum.screenshot({ path: OUT + '/feat_kalkyl.png' });
  ok(/kontakt(\.html)?\?fran=kalkyl/.test(await p.getAttribute('#calc-send', 'href')), 'knappen leder till offertformuläret'); await p.goto('http://localhost:8767/kontakt.html?fran=kalkyl'); await p.waitForSelector('.form-prefill');
  ok((await p.textContent('.form-prefill__t')).includes('Hemsida Pro'), 'offertförfrågan får rubrik från kalkylatorn');
  ok((await p.inputValue('textarea[name=meddelande]')).replace(/\s/g, ' ').includes('Engångskostnad: 9 000 kr'), 'valet följer med i meddelandet');
  ok(errs.length === 0, 'inga JavaScript-fel' + (errs.length ? ': ' + errs[0] : ''));
  await b.close(); console.log(pass + ' passerade, ' + fail + ' misslyckades'); process.exit(fail ? 1 : 0);
})();
