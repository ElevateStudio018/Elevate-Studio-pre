// Deep analysis ("Djupanalys") in small batches. The browser asks for the page list, then runs batches of pages,
// links (internal and external), pictures and headers. Each batch stays well below the Worker's outgoing-request
// limit. Everything is read from the pages' own HTML and headers; a finding is only reported when they show it.
import { json, normalise, prepare, getOne, fetchText, analysePage } from './sitecheck.js';
import { withHeaders } from './headers.js';

// Checks analysePage does not do
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
  // a field is labelled if it sits inside a <label>, has aria-label, or a <label for> points at its id.
  // Honeypot fields (name _honey, aria-hidden) are for robots and do not count.
  const labelled = (html.match(/<label[\s\S]*?<\/label>/gi) || []).join('');
  f.unlabeledInputs = [...html.matchAll(/<input\b([^>]*)>/gi)]
    .filter((m) => !/type=["'](hidden|submit|button|checkbox|radio)["']/i.test(m[1]) && !/aria-label=|aria-hidden=["']true|name=["']_honey["']/i.test(m[1]) && !labelled.includes(m[0]) &&
      !(m[1].match(/\bid=["']([^"']+)["']/i) && new RegExp('for=["\']' + m[1].match(/\bid=["']([^"']+)["']/i)[1] + '["\']', 'i').test(html))).length;
  f.blankTarget = [...html.matchAll(/<a\b([^>]*target=["']_blank["'][^>]*)>/gi)].filter((m) => !/rel=["'][^"']*noopener/i.test(m[1])).length;
  f.deprecated = (html.match(/<(font|center|marquee|frameset|applet)\b/gi) || []).length;
  f.imgNoSize = [...html.matchAll(/<img\b[^>]*>/gi)].filter((m) => !/\bwidth=/i.test(m[0]) || !/\bheight=/i.test(m[0])).length;
  f.imgNoLazy = [...html.matchAll(/<img\b[^>]*>/gi)].filter((m) => !/loading=["']lazy["']/i.test(m[0]) && !/fetchpriority=["']high/i.test(m[0])).length;
  const head = (html.match(/<head[\s\S]*?<\/head>/i) || [''])[0];
  f.blockingScripts = [...head.matchAll(/<script\b([^>]*)>/gi)].filter((m) => /\bsrc=/i.test(m[1]) && !/\b(defer|async)\b/i.test(m[1])).length;
  f.bytes = html.length;
  f.inlineStyles = (html.match(/\sstyle=["']/gi) || []).length;
  f.inlineScripts = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].filter((m) => m[1].trim()).length;
  f.metaRefresh = /<meta[^>]+http-equiv=["']refresh["']/i.test(html);
  f.hreflang = [...html.matchAll(/<link[^>]+hreflang=["']([^"']+)["']/gi)].map((m) => m[1]);
  f.ogComplete = /property=["']og:title["']/i.test(html) && /property=["']og:description["']/i.test(html) && /property=["']og:url["']/i.test(html);
  f.favicon = /rel=["'](icon|shortcut icon)["']/i.test(html);
  f.appleTouch = /rel=["']apple-touch-icon["']/i.test(html);
  // visible text, for thin pages and duplicate content
  const body = (html.match(/<body[\s\S]*?<\/body>/i) || [html])[0].replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
  const text = body.replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
  f.words = text ? text.split(' ').length : 0;
  let hash = 0; for (let i = 0; i < text.length; i++) hash = (Math.imul(31, hash) + text.charCodeAt(i)) | 0;
  f.textHash = String(hash);
  // structured data types
  f.ldTypes = [];
  [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].forEach((m) => {
    try {
      const walk = (x) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { if (x['@type']) [].concat(x['@type']).forEach((t) => f.ldTypes.push(String(t))); Object.values(x).forEach(walk); } };
      walk(JSON.parse(m[1]));
    } catch { /* counted as broken structured data */ }
  });
  return f;
}

// Every link and picture on the page
function collect(html, url, origin) {
  const internal = new Set(), external = new Set(), images = new Set();
  [...html.matchAll(/<a\b[^>]*\shref=["']([^"'#]+)["']/gi)].forEach((m) => {
    try { const x = new URL(m[1], url); if (!/^https?:$/.test(x.protocol)) return; x.hash = ''; (x.origin === origin ? internal : external).add(x.href); } catch { /* not a link */ }
  });
  [...html.matchAll(/<img\b[^>]*\ssrc=["']([^"']+)["']/gi)].forEach((m) => { try { images.add(new URL(m[1], url).href); } catch { /* skip */ } });
  return { internal: [...internal], external: [...external], images: [...images] };
}

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

  if (op === 'headers') {
    // Security headers and caching for the start page and one stylesheet
    const raw = await getOne(origin + '/', { method: 'GET', signal: AbortSignal.timeout(8000) }).catch(() => null);
    // the same headers the visitor gets (our own answers pass through withHeaders)
    const home = raw ? withHeaders(raw, new URL(origin + '/'), req) : null;
    const css = await getOne(origin + '/assets/css/site.min.css', { method: 'HEAD', signal: AbortSignal.timeout(6000) }).catch(() => null);
    const pick = (r, names) => { const o = {}; names.forEach((n) => { o[n] = r ? r.headers.get(n) : null; }); return o; };
    return json({
      status: home ? home.status : 0,
      home: pick(home, ['content-security-policy', 'strict-transport-security', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy', 'content-encoding', 'cache-control']),
      css: pick(css, ['cache-control', 'content-encoding']),
    });
  }

  const body = await req.json().catch(() => ({}));
  const list = (Array.isArray(body.urls) ? body.urls : []).filter((x) => typeof x === 'string').slice(0, 40);

  if (op === 'pages') {
    const out = await Promise.all(list.slice(0, 12).map(async (url) => {
      if (!url.startsWith(origin)) return { url, ok: false };
      const r = await fetchText(url, 9000);
      if (!r.text) return { url, status: r.status || 0, ok: false };
      const a = analysePage(r.text);
      const d = deepPage(r.text);
      return { url, status: r.status, ok: true, a: { ...a, hrefs: undefined }, d, links: collect(r.text, url, origin) };
    }));
    return json({ pages: out });
  }

  if (op === 'links') {
    // Follows redirects, so a link that ends in an error page is reported; some servers refuse HEAD, then GET is used
    const out = await Promise.all(list.map(async (href) => {
      let r = await getOne(href, { method: 'HEAD', signal: AbortSignal.timeout(6000) }).catch(() => null);
      if (!r || r.status === 405 || r.status === 403) r = await getOne(href, { method: 'GET', signal: AbortSignal.timeout(6000) }).catch(() => null);
      return { url: href, status: r ? r.status : 0, redirected: !!(r && r.redirected) };
    }));
    return json({ links: out });
  }

  if (op === 'images') {
    const out = await Promise.all(list.map(async (src) => {
      const r = await getOne(src, { method: 'HEAD', signal: AbortSignal.timeout(6000) }).catch(() => null);
      return { url: src, status: r ? r.status : 0, bytes: r ? +(r.headers.get('content-length') || 0) : 0, type: r ? (r.headers.get('content-type') || '') : '' };
    }));
    return json({ images: out });
  }
  return json({ error: 'op' }, 400);
}
