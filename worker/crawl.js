// Deep analysis ("Djupanalys") in small batches: the browser asks for the page list, then for batches of pages
// and batches of links. Each batch stays well below the Worker's outgoing-request limit. Findings are grouped in
// four categories: SEO, Tillgänglighet, Bästa praxis and Prestanda (page weight and blocking scripts).
import { json, normalise, prepare, getOne, fetchText, analysePage } from './sitecheck.js';

// Checks that analysePage does not do yet
function deepPage(html) {
  const f = {};
  f.doctype = /<!doctype html/i.test(html);
  f.charset = /<meta[^>]+charset/i.test(html);
  const heads = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
  f.emptyHeadings = heads.filter((m) => !m[2].replace(/<[^>]+>/g, '').trim()).length;
  let skipped = 0, prev = 0;
  heads.forEach((m) => { const l = +m[1]; if (prev && l > prev + 1) skipped++; prev = l; });
  f.headingSkips = skipped;
  f.emptyLinks = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .filter((m) => !m[2].replace(/<[^>]+>/g, '').trim() && !/aria-label=|title=|<img[^>]+alt=["'][^"']+/i.test(m[0])).length;
  f.emptyButtons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)]
    .filter((m) => !m[2].replace(/<[^>]+>/g, '').trim() && !/aria-label=/i.test(m[1])).length;
  f.genericLinks = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)]
    .filter((m) => /^(läs mer|klicka här|här|mer|läs mer här|se mer)\.?$/i.test(m[1].replace(/<[^>]+>/g, '').trim())).length;
  f.unlabeledInputs = [...html.matchAll(/<input\b([^>]*)>/gi)]
    .filter((m) => !/type=["'](hidden|submit|button|checkbox|radio)["']/i.test(m[1]) && !/aria-label=|placeholder=/i.test(m[1]) &&
      !(m[1].match(/\bid=["']([^"']+)["']/i) && new RegExp('for=["\']' + m[1].match(/\bid=["']([^"']+)["']/i)[1] + '["\']', 'i').test(html))).length;
  f.blankTarget = [...html.matchAll(/<a\b([^>]*target=["']_blank["'][^>]*)>/gi)].filter((m) => !/rel=["'][^"']*noopener/i.test(m[1])).length;
  f.deprecated = (html.match(/<(font|center|marquee|frameset|applet)\b/gi) || []).length;
  f.imgNoSize = [...html.matchAll(/<img\b[^>]*>/gi)].filter((m) => !/\bwidth=/i.test(m[0]) || !/\bheight=/i.test(m[0])).length;
  const head = (html.match(/<head[\s\S]*?<\/head>/i) || [''])[0];
  f.blockingScripts = [...head.matchAll(/<script\b([^>]*)>/gi)].filter((m) => /\bsrc=/i.test(m[1]) && !/\b(defer|async)\b/i.test(m[1])).length;
  f.bytes = html.length;
  f.inlineStyles = (html.match(/\sstyle=["']/gi) || []).length;
  return f;
}

// Batches. POST { urls } for pages, POST { urls } for links (HEAD).
export async function crawl(req, env) {
  const u = normalise(new URL(req.url).searchParams.get('url') || '');
  if (!u) return json({ error: 'url' }, 400);
  prepare(req, env);
  const op = new URL(req.url).searchParams.get('op') || 'list';
  const origin = u.origin;

  if (op === 'list') {
    const sm = await fetchText(origin + '/sitemap.xml');
    let urls = sm.status === 200 ? [...sm.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]).filter((x) => x.startsWith(origin)) : [];
    if (!urls.length) urls = [origin + '/'];
    return json({ origin, urls: [...new Set(urls)].slice(0, 400), sitemap: sm.status === 200 });
  }

  const body = await req.json().catch(() => ({}));
  const list = (Array.isArray(body.urls) ? body.urls : []).filter((x) => typeof x === 'string' && x.startsWith(origin)).slice(0, 40);

  if (op === 'pages') {
    const list12 = list.slice(0, 12);
    const out = await Promise.all(list12.map(async (url) => {
      const r = await fetchText(url, 9000);
      if (!r.text) return { url, status: r.status || 0, ok: false };
      const a = analysePage(r.text);
      const d = deepPage(r.text);
      return { url, status: r.status, ok: true, a: { ...a, hrefs: undefined }, d, internal: [...new Set(a.hrefs.map((h) => { try { const x = new URL(h, url); return x.origin === origin ? x.href.split('#')[0] : null; } catch { return null; } }).filter(Boolean))] };
    }));
    return json({ pages: out });
  }

  if (op === 'links') {
    const out = await Promise.all(list.map(async (href) => {
      const r = await getOne(href, { method: 'HEAD', signal: AbortSignal.timeout(6000) }).catch(() => null);
      return { url: href, status: r ? r.status : 0 };
    }));
    return json({ links: out });
  }
  return json({ error: 'op' }, 400);
}
