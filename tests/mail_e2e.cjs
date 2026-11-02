// Elevate Mejl (/mail) in demo mode, desktop and mobile. Run: python3 -m http.server 8767 & node tests/mail_e2e.cjs
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const OUT = process.env.OUT || '/tmp'; let pass = 0, fail = 0; const errs = [];
const ok = (c, n) => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto('http://localhost:8767/mail.html?demo'); try { await p.click('text=Avböj', { timeout: 1200 }); } catch (e) { /* none */ }
  ok(await p.isVisible('text=Demoläge'), 'demoläget är tydligt märkt'); await p.screenshot({ path: OUT + '/mail_1_login.png' });
  await p.fill('#wl input[name=email]', ''); await p.click('#wl button[type=submit]'); ok(await p.isVisible('.wmx-err'), 'tom inloggning ger fel');
  await p.fill('#wl input[name=email]', 'anna@exempelbygg.se'); await p.click('#wl button[type=submit]');
  await p.waitForSelector('.wmx-item'); ok(await p.locator('.wmx-item').count() === 4, 'inkorgen visar 4 mejl'); ok(await p.locator('.wmx-item.is-new').count() === 2, '2 olästa');
  await p.click('.wmx-item >> nth=0'); await p.waitForSelector('.wmx-text'); ok((await p.textContent('.wmx-text')).includes('badrum'), 'mejlet öppnas'); ok(await p.locator('.wmx-item.is-new').count() === 1, 'öppnat mejl blir läst');
  await p.screenshot({ path: OUT + '/mail_2_inkorg.png' });
  await p.click('#wrep'); ok((await p.inputValue('input[name=to]')) === 'karin@kund.se' && (await p.inputValue('input[name=subject]')) === 'Re: Offert på badrum', 'Svara fyller i mottagare och ämne');
  await p.fill('textarea[name=text]', 'Hej Karin! Vi kommer gärna ut på tisdag.'); await p.click('#wc button[type=submit]'); await p.waitForSelector('.wmx-sent'); ok(true, 'mejlet skickas');
  await p.click('.wmx-folder:has-text("Skickat")'); await p.waitForTimeout(400); ok((await p.textContent('#wlist')).includes('Re: Offert på badrum'), 'det skickade syns i Skickat');
  await p.click('.wmx-folder:has-text("Inkorg")'); await p.waitForTimeout(400); await p.click('.wmx-item >> nth=1'); await p.waitForSelector('#wdel'); await p.click('#wdel'); await p.waitForTimeout(400);
  ok(await p.locator('.wmx-item').count() === 3, 'ta bort tar bort ur inkorgen');
  await p.click('#wnew'); await p.click('#wc button[type=submit]'); ok(await p.isVisible('.wmx-err'), 'nytt mejl utan mottagare stoppas');
  await p.fill('#wq', 'faktura'); await p.waitForTimeout(200); ok(await p.locator('.wmx-item').count() === 1, 'sökningen filtrerar');
  await p.screenshot({ path: OUT + '/mail_3_skriv.png' });
  await p.click('#wout'); await p.waitForSelector('#wl'); ok(true, 'logga ut');
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); await m.goto('http://localhost:8767/mail.html?demo'); await m.click('#wl button[type=submit]'); await m.waitForSelector('.wmx-item');
  ok(await m.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, 'mobil utan sidledsscroll'); await m.screenshot({ path: OUT + '/mail_4_mobil.png', fullPage: true });
  const h = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); await h.goto('http://localhost:8767/forhandsvisning.html');
  ok(await h.locator('.hub__card').count() === 11, 'förhandsvisningen har 11 kort'); await h.screenshot({ path: OUT + '/hub.png', fullPage: true });
  ok(errs.length === 0, 'inga JavaScript-fel' + (errs.length ? ': ' + errs[0] : ''));
  await b.close(); console.log(pass + ' passerade, ' + fail + ' misslyckades'); process.exit(fail ? 1 : 0);
})();
