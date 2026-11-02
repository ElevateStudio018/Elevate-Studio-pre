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

const pick = (fs, flag, names) => (fs.find((f) => new RegExp('\\\\' + flag, 'i').test(f.flags)) || fs.find((f) => names.test(f.name.split(/[./]/).pop())) || {}).name;
const roles = (fs) => ({ trash: pick(fs, 'Trash', /^(trash|papperskorg|deleted|borttaget)/i), sent: pick(fs, 'Sent', /^(sent|skickat|skickade)/i), drafts: pick(fs, 'Drafts', /^(drafts|utkast)/i),
  junk: pick(fs, 'Junk', /^(junk|spam|skräppost)/i), archive: pick(fs, 'Archive', /^(archive|arkiv|all mail)/i) });
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
    } catch (e) {
      const msg = String((e && e.message) || e).slice(0, 200);
      console.error('mail login', email, sv.imap, msg);
      // only a real "no" from the mail server means a wrong password; everything else is shown as it is
      if (/AUTHENTICATIONFAILED|authentication failed|invalid credentials|login failed|LOGIN.*(fail|incorrect)|^NO\b/i.test(msg)) return json({ error: 'Fel e-post eller lösenord. Använd lösenordet till själva mejlkontot (inte till Loopias kundzon).' }, 401);
      if (/closed|connect|greeting|timed|network|refused|reset|tls|handshake|stream/i.test(msg)) return json({ error: 'Kunde inte nå mejlservern ' + sv.imap + ' (' + msg + ').' }, 502);
      return json({ error: 'Inloggningen misslyckades: ' + msg }, 500);
    }
  }
  if (op === 'logout') return json({ ok: true }, 200, { 'set-cookie': cookie('', 0) });
  if (/^logo\/[0-9a-f]{24}\.(png|jpg)$/.test(op) && req.method === 'GET') {
    const o = env.MAIL_BACKUP && await env.MAIL_BACKUP.get('logos/' + op.slice(5)); if (!o) return new Response('', { status: 404 });
    return new Response(o.body, { headers: { 'content-type': op.endsWith('png') ? 'image/png' : 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' } });
  }
  const s = await open(env, session(req));
  if (!s) return json({ error: 'login' }, 401);
  const folder = (url.searchParams.get('folder') || 'INBOX').slice(0, 200);
  try {
    if (op === 'session') return json({ email: s.e });
    if (op === 'folders') return json(await withImap(s, async (m) => { const fs = await m.folders(); const counts = {};
      for (const f of fs.slice(0, 30)) { try { counts[f.name] = await m.status(f.name); } catch (e) { /* folder without status */ } }
      return { folders: fs.map((f) => f.name), roles: roles(fs), counts, servers: { imap: s.i, smtp: s.o } }; }, connector));
    if (op === 'list') return json(await withImap(s, (m) => m.list(folder, Math.max(0, Number(url.searchParams.get('page')) || 0)), connector));
    if (op === 'read') return json(await withImap(s, (m) => m.message(folder, url.searchParams.get('uid')), connector));
    if (op === 'attachment') {
      const m = await withImap(s, (x) => x.message(folder, url.searchParams.get('uid'), true), connector);
      const f = m.files[Number(url.searchParams.get('i')) || 0]; if (!f) return json({ error: 'saknas' }, 404);
      return new Response(f.data, { headers: { 'content-type': 'application/octet-stream', 'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
    }
    const b = await req.json().catch(() => ({}));
    const uids = (Array.isArray(b.uids) ? b.uids : [b.uid]).map(Number).filter((n) => n > 0).slice(0, 500);
    if (op === 'flags') { await withImap(s, (m) => m.flags(String(b.folder || 'INBOX'), uids, b.flag === 'flagged' ? '\\Flagged' : '\\Seen', !!b.on), connector); return json({ ok: true }); }
    if (op === 'move') {
      await withImap(s, async (m) => { const fs = await m.folders(), r = roles(fs); const to = r[b.to] || (fs.some((f) => f.name === b.to) ? b.to : null);
        if (!to) throw new Error('Mappen finns inte på servern'); await m.move(String(b.folder || 'INBOX'), uids, to); }, connector);
      return json({ ok: true });
    }
    if (op === 'draft') {
      await withImap(s, async (m) => { const d = roles(await m.folders()).drafts; if (!d) throw new Error('Ingen utkastmapp');
        await m.append(d, `From: ${s.e}\r\nTo: ${String(b.to || '')}\r\nSubject: ${String(b.subject || '')}\r\nDate: ${new Date().toUTCString()}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${String(b.text || '')}`, '\\Draft \\Seen');
        if (b.replaces) { try { await m.move(d, [b.replaces], roles(await m.folders()).trash || d); } catch (e) { /* old draft stays */ } } }, connector);
      return json({ ok: true });
    }
    if (op === 'flag') { await withImap(s, (m) => m.flag(String(b.folder || 'INBOX'), b.uid, '\\Seen', !!b.seen), connector); return json({ ok: true }); }
    if (op === 'delete') {
      await withImap(s, async (m) => { const trash = pickTrash(await m.folders()), f = String(b.folder || 'INBOX');
        for (const u of uids) await m.remove(f, u, f === trash ? null : trash); }, connector);
      return json({ ok: true });
    }
    if (op === 'send') {
      const list = (v) => String(v || '').split(/[,;]+/).map((x) => (x.match(/<([^>]+)>/) || [, x])[1].trim()).filter(Boolean).slice(0, 50);
      const to = list(b.to), cc = list(b.cc), bcc = list(b.bcc);
      if (!to.length || to.concat(cc, bcc).some((a) => !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a))) return json({ error: 'Kontrollera mottagarna.' }, 400);
      const files = (Array.isArray(b.files) ? b.files : []).slice(0, 10).map((f) => ({ filename: String(f.name || 'bilaga').slice(0, 120), content: String(f.data || ''), mimeType: String(f.type || 'application/octet-stream').slice(0, 100) }));
      if (files.reduce((n, f) => n + f.content.length * 0.75, 0) > 15 * 1024 * 1024) return json({ error: 'Bilagorna får vara högst 15 MB tillsammans.' }, 400);
      const subject = String(b.subject || '').slice(0, 300), text = String(b.text || '').slice(0, 200000), html = cleanHtml(b.html);
      const send = mailer || (async (msg) => { const { WorkerMailer } = await import('worker-mailer');
        await WorkerMailer.send({ host: s.o, port: 465, secure: true, credentials: { username: s.e, password: s.p }, authType: ['plain', 'login'] }, msg); });
      await send({ from: b.name ? { name: String(b.name).slice(0, 80), email: s.e } : s.e, to, cc: cc.length ? cc : undefined, bcc: bcc.length ? bcc : undefined, attachments: files.length ? files : undefined, subject, text, html: html || undefined, headers: b.inReplyTo ? { 'In-Reply-To': String(b.inReplyTo).slice(0, 300), References: String(b.inReplyTo).slice(0, 300) } : undefined });
      // a copy in Sent, when the server has such a folder (best effort)
      try { await withImap(s, async (m) => { const sent = pickSent(await m.folders()); if (sent) await m.append(sent, sentCopy(s.e, to, cc, subject, text, html)); }, connector); } catch (e) { /* the mail is sent */ }
      return json({ ok: true });
    }
    if (op === 'folder') {
      const name = String(b.name || '').replace(/[\r\n"\\*%]/g, '').trim().slice(0, 60); if (!name) return json({ error: 'Skriv ett namn på mappen.' }, 400);
      const made = await withImap(s, async (m) => { const fs = await m.folders(); const sep = fs.some((f) => f.name.startsWith('INBOX.')) ? 'INBOX.' : ''; const full = b.action === 'delete' ? name : sep + name;
        if (b.action === 'delete') { if (/^INBOX$/i.test(full) || Object.values(roles(fs)).includes(full)) throw new Error('Den mappen kan inte tas bort'); await m.drop(full); } else await m.create(full); return full; }, connector);
      return json({ ok: true, name: made });
    }
    if (op === 'backup') return json(await backup(env, s, connector));
    if (op === 'logo') {
      if (!env.MAIL_BACKUP) return json({ setup: false });
      const type = b.type === 'image/png' ? 'image/png' : 'image/jpeg', data = String(b.data || '');
      if (!/^[A-Za-z0-9+/=]+$/.test(data) || data.length > 400000) return json({ error: 'Loggan är för stor.' }, 400);
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0)), hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('');
      await env.MAIL_BACKUP.put(`logos/${hash}.${type === 'image/png' ? 'png' : 'jpg'}`, bytes, { httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' } });
      return json({ url: `${new URL(req.url).origin}/api/mail/logo/${hash}.${type === 'image/png' ? 'png' : 'jpg'}` });
    }
    return json({ error: 'op' }, 404);
  } catch (e) { return json({ error: 'Mejlservern svarade: ' + String(e.message || e).slice(0, 160) }, 502); }
}
export { words };

// Only simple formatting is kept from the editor (no scripts, events or remote styles)
export function cleanHtml(h) {
  h = String(h || '').slice(0, 300000); if (!h.trim()) return '';
  return h.replace(/<(script|style|iframe|object|embed|form|link|meta)[\s\S]*?(<\/\1>|$)/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}
function sentCopy(from, to, cc, subject, text, html) {
  const head = `From: ${from}\r\nTo: ${to.join(', ')}\r\n${cc.length ? 'Cc: ' + cc.join(', ') + '\r\n' : ''}Subject: ${subject}\r\nDate: ${new Date().toUTCString()}\r\nMIME-Version: 1.0\r\n`;
  if (!html) return head + `Content-Type: text/plain; charset=utf-8\r\n\r\n${text}`;
  const bnd = 'es' + Math.random().toString(36).slice(2);
  return head + `Content-Type: multipart/alternative; boundary="${bnd}"\r\n\r\n--${bnd}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${text}\r\n--${bnd}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${html}\r\n--${bnd}--\r\n`;
}

// Backup: every mail is copied to Elevate Studio's storage (Cloudflare R2, binding MAIL_BACKUP) while the
// owner is signed in, a batch at a time. Nothing is stored without a session, and passwords are never stored.
// Layout: <address>/<folder>/<uidvalidity>/<uid>.eml and <address>/manifest.json
export async function backup(env, s, connector, batch = 40) {
  if (!env.MAIL_BACKUP) return { setup: false };
  const key = s.e.replace(/[^a-z0-9@._-]/gi, '_'), mf = await env.MAIL_BACKUP.get(key + '/manifest.json').then((o) => (o ? o.json() : null)).catch(() => null) || { folders: {} };
  let saved = 0, total = 0, remaining = 0;
  await withImap(s, async (m) => {
    const fs = (await m.folders()).filter((f) => !/\\(Junk|Trash)/i.test(f.flags) && !/(^|[./])(junk|spam|skräppost|trash|papperskorg|deleted)$/i.test(f.name));
    for (const f of fs) {
      const { validity, uids } = await m.uids(f.name), st = mf.folders[f.name] && mf.folders[f.name].v === validity ? mf.folders[f.name] : { v: validity, last: 0 };
      total += uids.length; const todo = uids.filter((u) => u > st.last);
      for (const u of todo) {
        if (saved >= batch) { remaining += todo.length - todo.indexOf(u); break; }
        const raw = await m.raw(u); if (raw) await env.MAIL_BACKUP.put(`${key}/${f.name}/${validity}/${u}.eml`, raw, { httpMetadata: { contentType: 'message/rfc822' } });
        st.last = u; saved++;
      }
      mf.folders[f.name] = st;
    }
  }, connector);
  mf.at = new Date().toISOString(); await env.MAIL_BACKUP.put(key + '/manifest.json', JSON.stringify(mf), { httpMetadata: { contentType: 'application/json' } });
  return { total, saved, remaining, at: remaining ? null : mf.at };
}
