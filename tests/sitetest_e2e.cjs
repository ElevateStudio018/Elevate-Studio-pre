// Testa din sajt: real quick test against Google (the page falls back to Google directly when our server is not there).
const { chromium } = require('/opt/node-tools/node_modules/playwright');
let pass = 0, fail = 0; const errs = [];
const ok = (c, n) => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8767/testa.html'); try { await p.click('text=Avböj', { timeout: 1500 }); } catch (e) { /* none */ }
  ok(await p.locator('.st-card').count() === 3, 'tre ringkort visas innan test');
  await p.click('#sitetest-form button[type=submit]'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !document.querySelector('#sitetest-form input').checkValidity() || !!document.querySelector('#sitetest-error:not([hidden])')), 'tomt fält stoppas');
  await p.fill('#sitetest-form input', 'elevatestudio.nu'); await p.click('#sitetest-form button[type=submit]');
  await p.waitForSelector('#sitetest-progress:not([hidden])', { timeout: 5000 }); ok(true, 'förloppsrutan visas');
  const done = await p.waitForSelector('#sitetest-results:not([hidden]) .score, #sitetest-error:not([hidden])', { timeout: 150000 }).catch(() => null);
  const gotResult = done && await p.isVisible('#sitetest-results:not([hidden])');
  ok(gotResult, 'snabbtestet ger resultat' + (gotResult ? '' : ': ' + ((await p.textContent('#sitetest-error').catch(() => '')) || 'inget svar').slice(0, 120)));
  if (gotResult) {
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }).catch(() => null), p.click('#sitetest-pdf')]);
    ok(!!dl && /\.pdf$/.test(dl.suggestedFilename()), 'PDF laddas ner' + (dl ? ' (' + dl.suggestedFilename() + ')' : ''));
    await p.click('#sitetest-send'); await p.waitForURL(/kontakt/, { timeout: 10000 });
    await p.waitForSelector('.form-prefill', { timeout: 5000 });
    ok((await p.textContent('.form-prefill__t')).includes('elevatestudio.nu'), 'offertformuläret får förvald rubrik med adressen');
    ok((await p.inputValue('textarea[name=meddelande]')).includes('Betyg'), 'testrapporten följer med i meddelandet');
  }
  ok(errs.length === 0, 'inga JavaScript-fel' + (errs.length ? ': ' + errs[0] : ''));
  await b.close(); console.log(pass + ' passerade, ' + fail + ' misslyckades'); process.exit(fail ? 1 : 0);
})();
