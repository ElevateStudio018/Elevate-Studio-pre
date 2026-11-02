// Kundadmin in demo mode: assistant, edit on the site + publish, leads, projects, images, settings. Run: python3 -m http.server 8767 & node tests/kundadmin_e2e.cjs
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const OUT = process.env.OUT || '/tmp';
let pass = 0, fail = 0; const ok = (c, n) => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1360, height: 900 } }); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => d.accept());
  await p.goto('http://localhost:8767/kundadmin/?demo'); await p.waitForSelector('.side');
  ok((await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--p').trim())) === '#1f4d36', 'färgerna kommer från kundens hemsida');
  ok((await p.textContent('.nav[data-v=forfragningar] em')) === '2', 'nya förfrågningar syns i menyn');
  // design 5: assistant
  await p.fill('#aq', 'ändra öppettider till mån–fre 7–17'); await p.click('#af button'); await p.waitForSelector('.act');
  ok((await p.textContent('.act')).includes('mån–fre 7–17'), 'assistenten föreslår öppettider');
  await p.click('.act .btn'); await p.waitForTimeout(200);
  await p.click('[data-v=installningar]'); ok((await p.inputValue('input[name=hours]')) === 'mån–fre 7–17', 'förslaget sparas när man klickar Gör det');
  await p.fill('#aq', 'lägg till projekt Villa i Tyresö'); await p.click('#af button'); await p.waitForSelector('.act'); await p.click('.act .btn'); await p.waitForTimeout(300);
  ok((await p.textContent('#v')).includes('Villa') && (await p.textContent('#v')).includes('Dold'), 'assistenten lägger till projekt som dolt');
  // design 6: edit on the site
  await p.click('[data-v=sidor]'); await p.waitForSelector('.field textarea');
  const f = p.frameLocator('#pf');
  ok(await f.locator('[data-es-list=service] .c').count() >= 2, 'tjänsterna syns i förhandsvisningen');
  await f.locator('h1[data-es]').click(); await p.keyboard.press('Control+A'); await p.keyboard.type('Vi bygger ditt drömhem');
  await p.waitForTimeout(900);
  ok((await p.inputValue('.field[data-k="hero.title"] textarea')) === 'Vi bygger ditt drömhem', 'text skriven på sajten syns i fältet');
  ok(!(await p.isDisabled('#pub')), 'Publicera blir aktiv vid ändring');
  await p.screenshot({ path: OUT + '/ka_sidor.png' });
  await p.click('#pub'); await p.waitForTimeout(300); ok((await p.textContent('.head')).includes('Allt är publicerat'), 'publicera');
  await p.click('.field [data-img]'); await p.waitForSelector('.modal'); await p.click('.modal [data-u] >> nth=1'); await p.waitForTimeout(400);
  ok((await f.locator('img[data-es]').getAttribute('src')).includes('p773843'), 'byt bild på sajten');
  // leads
  await p.click('[data-v=forfragningar]'); await p.waitForSelector('.lead');
  ok((await p.textContent('#lr')).includes('badrum'), 'förfrågan visas');
  await p.selectOption('#ls', 'quoted'); await p.waitForTimeout(200); ok((await p.textContent('#lr .st')) === 'Offert skickad', 'status ändras');
  ok((await p.getAttribute('#lreply', 'href')).startsWith('mailto:karin@example.se'), 'svara via mejl');
  await p.screenshot({ path: OUT + '/ka_forfragningar.png' });
  // projects
  await p.click('[data-v=projekt]'); await p.click('#add'); await p.fill('#if input[name=title]', 'Altan Onsala'); await p.fill('#if input[name=place]', 'Onsala');
  await p.click('#if [data-pick]'); await p.click('.modal [data-u] >> nth=0'); await p.click('#if button:not([type=button])'); await p.waitForTimeout(300);
  ok((await p.textContent('.items')).includes('Altan Onsala'), 'lägg till projekt med bild');
  await p.click('[data-pub] >> nth=0'); await p.waitForTimeout(200); ok(await p.locator('.item--hidden').count() >= 1, 'dölj projekt');
  // settings
  await p.click('[data-v=installningar]'); await p.click('#tget'); await p.waitForTimeout(200);
  ok((await p.inputValue('input[name=accent]')) === '#8fd3a6', 'hämta färger från hemsidan');
  await p.click('#sf .btn:not(.btn--ghost)'); await p.waitForTimeout(200);
  // mobile
  await p.setViewportSize({ width: 390, height: 800 }); await p.click('[data-v=oversikt]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'ingen sidscroll i mobilen');
  await p.screenshot({ path: OUT + '/ka_mobil.png' });
  ok(errs.length === 0, 'inga JavaScript-fel ' + errs.join(' | '));
  console.log(pass + ' passerade, ' + fail + ' misslyckades'); await b.close(); process.exit(fail ? 1 : 0);
})();
