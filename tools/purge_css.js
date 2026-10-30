// Per page: keep only the CSS rules whose classes and ids occur in that page or in any of our scripts
// (scripts add classes at runtime). Reads {css, pages, js} as JSON on stdin, prints {page: css}.
const { PurgeCSS } = require(process.env.PURGECSS || 'purgecss');
let input = '';
process.stdin.on('data', (c) => (input += c)).on('end', async () => {
  const { css, pages, js } = JSON.parse(input);
  const fs = require('fs');
  const src = Object.fromEntries(js.map((f) => [require('path').basename(f, '.js'), fs.readFileSync(f, 'utf8')]));
  const out = {};
  for (const page of pages) {
    const html = fs.readFileSync(page, 'utf8');
    // only the scripts this page loads (plus the language script, which is inline)
    const used = new Set(['i18n', ...[...html.matchAll(/assets\/js\/([\w-]+?)(?:\.min)?\.js/g)].map((m) => m[1])]);
    const scripts = [...used].map((n) => src[n] || '').join('\n');
    const [res] = await new PurgeCSS().purge({
      content: [{ raw: html.replace(/<style>[\s\S]*?<\/style>/g, ''), extension: 'html' }, { raw: scripts, extension: 'js' }],
      css: [{ raw: css }],
      safelist: { standard: [/^is-/, /^has-/], greedy: [/^score/, /^issue/, /^metric/, /^sitetest/, /^site-header--/, /^hamburgermenu/, /^drawer/, /^chat/, /^reviews/, /^pscroll/, /^book-bars/, /^i18n/, /^lang/, /^form-status/] },
      fontFace: false, keyframes: false, variables: false,
    });
    out[page] = res.css;
  }
  process.stdout.write(JSON.stringify(out));
});
