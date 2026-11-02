// Webmail for Elevate Studio at /mail. The visitor logs in with their own mailbox (e-mail and password); the
// Worker talks IMAP (read) and SMTP (send) to the mail server. The password is never stored: it travels in an
// encrypted, HttpOnly cookie (AES-GCM) that only this Worker can read, and expires after 8 hours.
//
// Settings (Cloudflare): MAIL_SESSION_KEY (secret, 32+ random characters). Without it a key is made per
// Worker instance, which works but logs people out whenever Cloudflare restarts the Worker.
// MAIL_IMAP_HOST / MAIL_SMTP_HOST: the mail servers for addresses on our own platform (default: found from MX).
import { Imap, words } from './imap.js';

const json = (d, s = 200, h = {}) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...h } });
const enc = new TextEncoder(), dec = new TextDecoder();
const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
let instanceKey = null;
async function key(env) {
  const raw = env.MAIL_SESSION_KEY ? await crypto.subtle.digest('SHA-256', enc.encode(env.MAIL_SESSION_KEY)) : (instanceKey = instanceKey || crypto.getRandomValues(new Uint8Array(32)));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(env, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(env), enc.encode(JSON.stringify(obj)));
  return b64u(iv) + '.' + b64u(ct);
}
export async function open(env, token) {
  try { const [iv, ct] = String(token).split('.'); const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64u(iv) }, await key(env), unb64u(ct)); const o = JSON.parse(dec.decode(pt)); return o.exp > Date.now() ? o : null; } catch (e) { return null; }
}
const cookie = (v, age) => `es_mail=${v}; Path=/api/mail; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
const session = (req) => ((req.headers.get('cookie') || '').match(/(?:^|;\s*)es_mail=([^;]+)/) || [])[1];

// Which servers to use for an address: well-known providers, our own platform, else the domain's MX
const KNOWN = [
  [/google|gmail/i, 'imap.gmail.com', 'smtp.gmail.com'], [/outlook|office365|hotmail|live\.com/i, 'outlook.office365.com', 'smtp.office365.com'],
  [/loopia/i, 'mailcluster.loopia.se', 'mailcluster.loopia.se'], [/one\.com/i, 'imap.one.com', 'send.one.com'], [/zoho/i, 'imap.zoho.eu', 'smtp.zoho.eu'],
];
export async function servers(email, env, fetcher = fetch) {
  const domain = email.split('@')[1];
  if (/^(gmail|googlemail)\.com$/i.test(domain)) return { imap: 'imap.gmail.com', smtp: 'smtp.gmail.com' };
  if (/^(outlook|hotmail|live)\.(com|se)$/i.test(domain)) return { imap: 'outlook.office365.com', smtp: 'smtp.office365.com' };
  const mx = await fetcher(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`, { headers: { accept: 'application/dns-json' } }).then((r) => r.json()).catch(() => ({}));
  const hosts = (mx.Answer || []).map((a) => String(a.data).split(' ').pop().replace(/\.$/, '')).join(' ');
  for (const [re, imap, smtp] of KNOWN) if (re.test(hosts)) return { imap, smtp };
  if (env.MAIL_IMAP_HOST && env.MAIL_SMTP_HOST) return { imap: env.MAIL_IMAP_HOST, smtp: env.MAIL_SMTP_HOST };
  return { imap: 'imap.' + domain, smtp: 'smtp.' + domain };
}

// Cloudflare TCP sockets with TLS; tests pass their own connector
export async function cfConnect(host, port) {
  const { connect } = await import('cloudflare:sockets');
  const s = connect({ hostname: host, port }, { secureTransport: 'on' });
  const r = s.readable.getReader(), w = s.writable.getWriter();
  return { read: async () => { const x = await r.read(); return x.done ? null : x.value; }, write: (b) => w.write(b), close: () => s.close() };
}
async function withImap(s, fn, connector) {
  const t = await (connector || cfConnect)(s.i, 993);
  const imap = new Imap(t);
  try { await imap.greeting(); await imap.login(s.e, s.p); return await fn(imap); } finally { await imap.logout(); try { t.close(); } catch (e) { /* closed */ } }
}

// a few attempts per address and Worker instance, then wait (slows down password guessing)
const tries = new Map();
function limited(key) { const n = Date.now(), t = (tries.get(key) || []).filter((x) => n - x < 10 * 60e3); tries.set(key, t); return t.length >= 8; }

const pickTrash = (fs) => (fs.find((f) => /\\Trash/i.test(f.flags)) || fs.find((f) => /^(trash|papperskorg|deleted|inbox\.trash|borttaget)/i.test(f.name.split(/[./]/).pop())) || {}).name;
const pickSent = (fs) => (fs.find((f) => /\\Sent/i.test(f.flags)) || fs.find((f) => /^(sent|skickat|skickade|inbox\.sent)/i.test(f.name.split(/[./]/).pop())) || {}).name;

export async function webmail(req, env, connector, mailer) {
  const url = new URL(req.url), op = url.pathname.replace('/api/mail/', '');
  if (req.method === 'POST' && op !== 'login' && req.headers.get('x-requested-with') !== 'elevate') return json({ error: 'csrf' }, 403);
  if (op === 'login') {
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    const b = await req.json().catch(() => ({}));
    const email = String(b.email || '').trim().toLowerCase(), pass = String(b.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !pass || pass.length > 300) return json({ error: 'Skriv e-postadress och lösenord.' }, 400);
    if (limited(email)) return json({ error: 'För många försök. Vänta tio minuter.' }, 429);
    tries.get(email).push(Date.now());
    const sv = b.imap && b.smtp ? { imap: String(b.imap).slice(0, 120), smtp: String(b.smtp).slice(0, 120) } : await servers(email, env);
    const s = { e: email, p: pass, i: sv.imap, o: sv.smtp, exp: Date.now() + 8 * 3600e3 };
    try { const folders = await withImap(s, (m) => m.folders(), connector); tries.delete(email);
      return json({ ok: true, email, folders: folders.map((f) => f.name), servers: sv }, 200, { 'set-cookie': cookie(await seal(env, s), 8 * 3600) });
    } catch (e) { return json({ error: /closed|connect|greeting|timed/i.test(e.message) ? 'Kunde inte nå mejlservern ' + sv.imap + '.' : 'Fel e-post eller lösenord.' }, 401); }
  }
  if (op === 'logout') return json({ ok: true }, 200, { 'set-cookie': cookie('', 0) });
  const s = await open(env, session(req));
  if (!s) return json({ error: 'login' }, 401);
  const folder = (url.searchParams.get('folder') || 'INBOX').slice(0, 200);
  try {
    if (op === 'session') return json({ email: s.e });
    if (op === 'folders') return json({ folders: (await withImap(s, (m) => m.folders(), connector)).map((f) => f.name) });
    if (op === 'list') return json(await withImap(s, (m) => m.list(folder, Math.max(0, Number(url.searchParams.get('page')) || 0)), connector));
    if (op === 'read') return json(await withImap(s, (m) => m.message(folder, url.searchParams.get('uid')), connector));
    const b = await req.json().catch(() => ({}));
    if (op === 'flag') { await withImap(s, (m) => m.flag(String(b.folder || 'INBOX'), b.uid, '\\Seen', !!b.seen), connector); return json({ ok: true }); }
    if (op === 'delete') { await withImap(s, async (m) => m.remove(String(b.folder || 'INBOX'), b.uid, pickTrash(await m.folders())), connector); return json({ ok: true }); }
    if (op === 'send') {
      const to = String(b.to || '').split(/[,;\s]+/).filter(Boolean).slice(0, 50), cc = String(b.cc || '').split(/[,;\s]+/).filter(Boolean).slice(0, 50);
      if (!to.length || to.concat(cc).some((a) => !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a))) return json({ error: 'Kontrollera mottagarna.' }, 400);
      const subject = String(b.subject || '').slice(0, 300), text = String(b.text || '').slice(0, 200000);
      const send = mailer || (async (msg) => { const { WorkerMailer } = await import('worker-mailer');
        await WorkerMailer.send({ host: s.o, port: 465, secure: true, credentials: { username: s.e, password: s.p }, authType: ['plain', 'login'] }, msg); });
      await send({ from: s.e, to, cc: cc.length ? cc : undefined, subject, text, headers: b.inReplyTo ? { 'In-Reply-To': String(b.inReplyTo).slice(0, 300), References: String(b.inReplyTo).slice(0, 300) } : undefined });
      // a copy in Sent, when the server has such a folder (best effort)
      try { await withImap(s, async (m) => { const sent = pickSent(await m.folders()); if (sent) await m.append(sent, `From: ${s.e}\r\nTo: ${to.join(', ')}\r\nSubject: ${subject}\r\nDate: ${new Date().toUTCString()}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${text}`); }, connector); } catch (e) { /* the mail is sent */ }
      return json({ ok: true });
    }
    return json({ error: 'op' }, 404);
  } catch (e) { return json({ error: 'Mejlservern svarade: ' + String(e.message || e).slice(0, 160) }, 502); }
}
export { words };
