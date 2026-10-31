// "Testa din sajt", the extra checks: pages from the sitemap (titles, descriptions, headings, pictures without
// text, duplicate titles, broken internal links, contact form), mail authentication (SPF, DKIM, DMARC, MX) and
// the certificate's expiry date. Public, no key needed. Stays below the 50 outgoing requests a Worker may make.
const UA = 'Mozilla/5.0 (compatible; ElevateStudioTest/1.0; +https://elevatestudio.nu)';
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

function normalise(raw) {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
    return u.hostname.includes('.') ? u : null;
  } catch { return null; }
}

// A Worker cannot always fetch its own address, so our own site is read from the static files directly
let HOST = '', ASSETS = null;
function getOne(url, opts) {
  const u = new URL(url);
  if (HOST && u.hostname === HOST && ASSETS) return ASSETS.fetch(new Request(url, { method: opts.method || 'GET', redirect: 'follow' }));
  return fetch(url, { ...opts, redirect: 'follow', headers: { 'user-agent': UA, ...(opts.headers || {}) } });
}

async function fetchText(url, ms = 8000) {
  const r = await getOne(url, { headers: { accept: 'text/html,application/xml,*/*' }, signal: AbortSignal.timeout(ms) }).catch(() => null);
  if (!r) return { status: 0, text: '' };
  const text = r.ok ? await r.text().catch(() => '') : '';
  return { status: r.status, text };
}

const unescape = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

function analysePage(html) {
  const title = unescape((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  const desc = unescape((html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) || [])[1]);
  const h1 = (html.match(/<h1[\s>]/gi) || []).length;
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const noAlt = imgs.filter((t) => !/\balt\s*=/i.test(t)).length;
  const hrefs = [...html.matchAll(/<a\b[^>]*\shref=["']([^"'#]+)["']/gi)].map((m) => m[1]);
  // a form that can be filled in: an e-mail or text field and a send button
  const form = /<form\b/i.test(html) && /type=["']email["']|<textarea\b/i.test(html) && /type=["']submit["']|<button\b/i.test(html);
  return { title, titleLen: title.length, desc, descLen: desc.length, h1, imgs: imgs.length, noAlt, hrefs, form };
}

async function dns(name, type) {
  const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!r || !r.ok) return null;
  const d = await r.json().catch(() => ({}));
  return (d.Answer || []).map((a) => String(a.data).replace(/^"(.*)"$/, '$1').replace(/" "/g, ''));
}

async function mailCheck(domain) {
  const selectors = ['google', 'default', 'selector1', 'selector2', 'k1', 'mail', 'dkim', 's1', 's2', 'mandrill'];
  const [txt, dmarc, mx, ...dk] = await Promise.all([dns(domain, 'TXT'), dns('_dmarc.' + domain, 'TXT'), dns(domain, 'MX'),
    ...selectors.map((s) => dns(`${s}._domainkey.${domain}`, 'TXT'))]);
  const spf = (txt || []).find((t) => /^v=spf1/i.test(t)) || null;
  const dm = (dmarc || []).find((t) => /^v=DMARC1/i.test(t)) || null;
  const policy = dm ? ((dm.match(/p=(\w+)/i) || [])[1] || 'none').toLowerCase() : null;
  const dkim = selectors.filter((s, i) => (dk[i] || []).some((t) => /v=DKIM1|p=/i.test(t)));
  return {
    spf: { found: !!spf, record: spf, lookups: spf ? (spf.match(/include:|a\b|mx\b|ptr\b|exists:|redirect=/gi) || []).length : 0 },
    dmarc: { found: !!dm, policy },
    dkim: { found: dkim.length > 0, selectors: dkim, checked: selectors.length },
    mx: { found: !!(mx && mx.length), hosts: (mx || []).map((x) => x.split(' ').pop().replace(/\.$/, '')) },
  };
}

async function certCheck(domain) {
  const r = await fetch(`https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!r || !r.ok) return { checked: false };
  const list = await r.json().catch(() => []);
  const ends = list.filter((x) => String(x.name_value || '').includes(domain)).map((x) => Date.parse(x.not_after)).filter((x) => x > 0);
  if (!ends.length) return { checked: false };
  const last = Math.max(...ends);
  return { checked: true, expires: new Date(last).toISOString().slice(0, 10), daysLeft: Math.floor((last - Date.now()) / 864e5) };
}

export async function siteCheck(req, env) {
  const u = normalise(new URL(req.url).searchParams.get('url') || '');
  if (!u) return json({ error: 'url' }, 400);
  HOST = new URL(req.url).hostname; ASSETS = env.ASSETS || null;
  const origin = u.origin, domain = u.hostname.replace(/^www\./, '');

  // 1. Pages from the sitemap, the most important (shortest paths) first, always including the contact page if there is one
  const sm = await fetchText(origin + '/sitemap.xml');
  let urls = sm.status === 200 ? [...sm.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]).filter((x) => x.startsWith(origin)) : [];
  if (!urls.length) urls = [origin + '/'];
  urls = [...new Set(urls)].sort((a, b) => a.length - b.length);
  const contact = urls.find((x) => /\/kontakt|\/contact/i.test(x));
  const chosen = [...new Set([urls[0], ...(contact ? [contact] : []), ...urls.slice(1)])].slice(0, 8);
  const fetched = await Promise.all(chosen.map((x) => fetchText(x)));
  const pages = chosen.map((url, i) => {
    const r = fetched[i];
    if (!r.text) return { url, status: r.status || 0, ok: false };
    const a = analysePage(r.text);
    return { url, status: r.status, ok: true, title: a.title, titleLen: a.titleLen, desc: a.desc, descLen: a.descLen, h1: a.h1, imgs: a.imgs, noAlt: a.noAlt, form: a.form, hrefs: a.hrefs };
  });

  // 2. Duplicate titles and broken internal links (HEAD, up to 15 links)
  const titles = {};
  pages.forEach((p) => { if (p.ok && p.title) titles[p.title] = (titles[p.title] || 0) + 1; });
  const dupTitles = Object.keys(titles).filter((t) => titles[t] > 1);
  const links = new Map();
  pages.forEach((p) => (p.hrefs || []).forEach((h) => {
    let abs; try { abs = new URL(h, p.url); } catch { return; }
    if (abs.origin !== origin || links.has(abs.href)) return;
    links.set(abs.href, p.url);
  }));
  const linkList = [...links.entries()].slice(0, 15);
  const linkResults = await Promise.all(linkList.map(async ([href, from]) => {
    const r = await getOne(href, { method: 'HEAD', signal: AbortSignal.timeout(6000) }).catch(() => null);
    return { href, from, status: r ? r.status : 0 };
  }));
  const broken = linkResults.filter((l) => !l.status || l.status >= 400).map((l) => ({ url: l.href, from: l.from, status: l.status }));

  // 3. Contact form: on the contact page, or on the start page if there is no contact page
  const formPage = pages.find((p) => p.url === contact) || pages[0];
  const formCheck = { page: formPage && formPage.url, found: !!(formPage && formPage.form) };

  // 4. Mail and certificate
  const [mail, cert] = await Promise.all([mailCheck(domain), certCheck(domain)]);

  return json({
    site: origin,
    checked: { pages: pages.filter((p) => p.ok).length, links: linkList.length, sitemapPages: urls.length },
    pages: pages.map(({ hrefs, ...rest }) => rest),
    duplicateTitles: dupTitles,
    broken,
    form: formCheck,
    mail,
    cert,
  });
}
