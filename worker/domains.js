// Domain search and mail diagnostics. Availability is read from the registry where it is public (RDAP for
// .com, .net, .org and the other gTLDs). For .se, .nu, .eu and .io there is no open registry lookup, so DNS is
// used and the answer is marked "likely" until the registrar confirms it at order time. Nothing is ever shown
// as free without one of these checks. Registration itself goes through a registrar adapter (see registrar.js).
import { json } from './sitecheck.js';
import { mailCheck } from './sitecheck.js';

// Each registry's own RDAP server (from IANA's bootstrap list). .online and .store refuse automated lookups, so they use DNS.
const RDAP = {
  com: 'https://rdap.verisign.com/com/v1/domain/', net: 'https://rdap.verisign.com/net/v1/domain/',
  org: 'https://rdap.publicinterestregistry.org/rdap/domain/', info: 'https://rdap.identitydigital.services/rdap/domain/',
  dev: 'https://pubapi.registry.google/rdap/domain/', app: 'https://pubapi.registry.google/rdap/domain/',
};
const TLDS = ['se', 'nu', 'com', 'net', 'org', 'eu', 'info', 'io', 'dev', 'app', 'online', 'store'];

function label(raw) {
  let s = String(raw || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  const dot = s.indexOf('.');
  const tld = dot > 0 ? s.slice(dot + 1) : '';
  s = dot > 0 ? s.slice(0, dot) : s;
  s = s.replace(/\s+/g, '').replace(/[^a-z0-9åäöéü-]/g, '').replace(/^-+|-+$/g, '').slice(0, 63);
  return { name: s, tld: TLDS.includes(tld) ? tld : '' };
}
const ascii = (name, tld) => { try { return new URL('http://' + name + '.' + tld).hostname; } catch { return null; } };

export async function checkOne(name, tld) {
  const host = ascii(name, tld);
  if (!host || name.length < 2) return { domain: name + '.' + tld, tld, status: 'invalid' };
  if (RDAP[tld]) {
    const r = await fetch(RDAP[tld] + host, { redirect: 'follow', signal: AbortSignal.timeout(7000), headers: { accept: 'application/rdap+json' } }).catch(() => null);
    if (r && r.status === 200) return { domain: name + '.' + tld, tld, status: 'taken', source: 'registry' };
    if (r && r.status === 404) return { domain: name + '.' + tld, tld, status: 'free', source: 'registry' };
  }
  const d = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=NS`, { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(5000) })
    .then((x) => x.json()).catch(() => null);
  if (!d) return { domain: name + '.' + tld, tld, status: 'unknown' };
  if (d.Status === 3) return { domain: name + '.' + tld, tld, status: 'likely_free', source: 'dns' };
  return { domain: name + '.' + tld, tld, status: 'taken', source: 'dns' };
}

// Simple, rule-based ideas from the name (not AI). Every idea is checked like any other domain before it is shown as free.
function ideas(name) {
  const base = name.replace(/-/g, '');
  const out = new Set();
  if (name.includes('-')) out.add(base);
  ['ab', 'sverige', 'hq', 'online', 'nu'].forEach((x) => out.add(base + x));
  ['min', 'mitt', 'team'].forEach((x) => out.add(x + base));
  const ascii_ = base.replace(/å|ä/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e').replace(/ü/g, 'u');
  if (ascii_ !== base) out.add(ascii_);
  out.delete(name);
  return [...out].filter((x) => x.length >= 2 && x.length <= 63).slice(0, 6);
}

export async function domainCheck(req) {
  const p = new URL(req.url).searchParams;
  const { name, tld } = label(p.get('q'));
  if (!name || name.length < 2) return json({ error: 'name' }, 400);
  const want = (p.get('tlds') || '').split(',').filter((t) => TLDS.includes(t));
  const list = want.length ? want : TLDS;
  const main = await Promise.all(list.map((t) => checkOne(name, t)));
  // ideas: only on .se and .com, so the Worker stays well below its request limit
  const idea = p.get('ideas') === '0' ? [] : await Promise.all(ideas(name).flatMap((n) => ['se', 'com'].map((t) => checkOne(n, t))));
  return json({ name, asked: tld, results: main, ideas: idea.filter((x) => x.status === 'free' || x.status === 'likely_free').slice(0, 8), checked: new Date().toISOString() });
}

export async function mailDiag(req) {
  const raw = new URL(req.url).searchParams.get('domain') || '';
  const domain = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return json({ error: 'domain' }, 400);
  const m = await mailCheck(domain);
  return json({ domain, ...m });
}
