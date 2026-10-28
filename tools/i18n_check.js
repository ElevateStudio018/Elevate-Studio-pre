// Lists Swedish text that is still visible when the site is switched to English.
// Run after changing copy: node tools/i18n_check.js (needs Playwright). Add what it prints to tools/i18n_en.py.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && f !== 'english.html');
for (const d of ['tjanster', 'projekt', 'insikter', 'plattformar']) for (const f of fs.readdirSync(path.join(ROOT, d))) if (f.endsWith('.html')) pages.push(d + '/' + f);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext(); const errs = [];
  const left = new Map();
  for (const pg of pages) {
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(pg + ': ' + e.message));
    await p.goto('file://' + ROOT + '/' + pg + '?lang=en'); await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) { if (n.parentElement.closest('script,style,svg')) continue; const t = n.nodeValue.trim(); if (/[åäöÅÄÖ]|\b(och|för|vi|ni|att|med|som|det|är|på)\b/.test(t)) out.push(t); }
      document.querySelectorAll('[placeholder],[aria-label],[alt],[title]').forEach(el => ['placeholder','aria-label','alt','title'].forEach(a => { const v = el.getAttribute(a); if (v && /[åäöÅÄÖ]|\b(och|för|vi|på|med)\b/.test(v)) out.push('@' + a + ': ' + v); }));
      if (/[åäö]/.test(document.title)) out.push('TITLE: ' + document.title);
      return { out, lang: document.documentElement.lang, vis: getComputedStyle(document.body).visibility };
    });
    if (r.lang !== 'en' || r.vis !== 'visible') errs.push(pg + ' lang=' + r.lang + ' vis=' + r.vis);
    r.out.forEach(t => left.set(t, (left.get(t) || []).concat(pg)));
    await p.close();
  }
  for (const [t, pgs] of left) console.log(JSON.stringify(t).slice(0, 160), '<-', pgs.length, pgs[0]);
  console.log('errors', errs);
  await b.close();
})();
