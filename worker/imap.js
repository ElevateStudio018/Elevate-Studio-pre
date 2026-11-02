// A small IMAP client for the webmail at /mail: login, folders, list, read, flag and delete.
// The transport is passed in (Cloudflare sockets in the Worker, a plain socket in tests), so the protocol code
// is the same everywhere. Only what the webmail needs is implemented; it is not a general IMAP library.
const enc = new TextEncoder(), dec = new TextDecoder('latin1');

export class Imap {
  constructor(t) { this.t = t; this.buf = new Uint8Array(0); this.n = 0; }
  async more() { const c = await this.t.read(); if (!c) throw new Error('closed'); const b = new Uint8Array(this.buf.length + c.length); b.set(this.buf); b.set(c, this.buf.length); this.buf = b; }
  async line() {
    for (;;) {
      const i = this.buf.indexOf(10);
      if (i >= 0) { const l = dec.decode(this.buf.subarray(0, i + 1)); this.buf = this.buf.subarray(i + 1); return l; }
      await this.more();
    }
  }
  async bytes(n) { while (this.buf.length < n) await this.more(); const b = this.buf.subarray(0, n); this.buf = this.buf.subarray(n); return b; }
  async greeting() { const l = await this.line(); if (!/^\* (OK|PREAUTH)/i.test(l)) throw new Error('greeting'); }
  // Sends one command; returns untagged lines, each with its literals ({n} blocks) as Uint8Array
  async cmd(text) {
    const tag = 'A' + (++this.n);
    await this.t.write(enc.encode(tag + ' ' + text + '\r\n'));
    const out = [];
    for (;;) {
      let l = await this.line();
      if (l.startsWith(tag + ' ')) { if (!/^\S+ OK/i.test(l)) throw new Error(l.slice(tag.length + 1).trim() || 'fel'); return out; }
      const item = { text: l, lits: [] };
      let m;
      while ((m = l.match(/\{(\d+)\}\r?\n$/))) { item.lits.push(await this.bytes(Number(m[1]))); l = await this.line(); item.text += l; }
      out.push(item);
    }
  }
  static q(s) { return '"' + String(s).replace(/(["\\])/g, '\\$1') + '"'; }
  login(user, pass) { return this.cmd('LOGIN ' + Imap.q(user) + ' ' + Imap.q(pass)); }
  async folders() {
    const r = await this.cmd('LIST "" "*"');
    return r.map((x) => { const m = x.text.match(/^\* LIST \(([^)]*)\) (?:"[^"]*"|NIL) (.+?)\r?\n$/i); if (!m) return null;
      const name = x.lits.length ? dec.decode(x.lits[0]) : m[2].replace(/^"|"$/g, '').replace(/\\(.)/g, '$1');
      return { name, flags: m[1] }; }).filter(Boolean).filter((f) => !/\\Noselect/i.test(f.flags));
  }
  async status(box) { const r = await this.cmd('STATUS ' + Imap.q(box) + ' (MESSAGES UNSEEN)'); const t = (r[0] || {}).text || ''; return { total: Number((t.match(/MESSAGES (\d+)/i) || [])[1] || 0), unseen: Number((t.match(/UNSEEN (\d+)/i) || [])[1] || 0) }; }
  async select(box) { const r = await this.cmd('SELECT ' + Imap.q(box)); const e = r.map((x) => x.text.match(/^\* (\d+) EXISTS/i)).find(Boolean); return e ? Number(e[1]) : 0; }
  // Newest first: headers for a page of messages
  async list(box, page = 0, size = 30) {
    const total = await this.select(box);
    if (!total) return { total, items: [] };
    const hi = total - page * size, lo = Math.max(1, hi - size + 1);
    if (hi < 1) return { total, items: [] };
    const r = await this.cmd(`FETCH ${lo}:${hi} (UID FLAGS RFC822.SIZE BODY.PEEK[HEADER.FIELDS (FROM TO SUBJECT DATE CONTENT-TYPE)])`);
    const items = r.filter((x) => /FETCH/i.test(x.text)).map((x) => {
      const h = parseHeaders(x.lits[0] ? dec.decode(x.lits[0]) : '');
      return { uid: Number((x.text.match(/UID (\d+)/i) || [])[1]), seen: /\\Seen/i.test(x.text), flagged: /\\Flagged/i.test(x.text), files: /multipart\/mixed/i.test(h['content-type'] || ''), from: h.from || '', to: h.to || '', subject: h.subject || '(inget ämne)', date: h.date || '', size: Number((x.text.match(/RFC822\.SIZE (\d+)/i) || [])[1] || 0) };
    }).reverse();
    return { total, items };
  }
  async message(box, uid, keepFiles) {
    await this.select(box);
    const r = await this.cmd(`UID FETCH ${Number(uid)} (UID FLAGS BODY[])`);
    const x = r.find((y) => /FETCH/i.test(y.text) && y.lits.length); if (!x) throw new Error('saknas');
    const m = parseMessage(x.lits[0], keepFiles); m.flagged = /\\Flagged/i.test(x.text); return m;
  }
  async move(box, uids, to) {
    await this.select(box); const set = uids.map(Number).filter((n) => n > 0).join(','); if (!set) return;
    try { await this.cmd(`UID MOVE ${set} ${Imap.q(to)}`); } catch (e) { await this.cmd(`UID COPY ${set} ${Imap.q(to)}`); await this.cmd(`UID STORE ${set} +FLAGS (\\Deleted)`); await this.cmd('EXPUNGE'); }
  }
  async flags(box, uids, flag, on) { await this.select(box); const set = uids.map(Number).filter((n) => n > 0).join(','); if (set) await this.cmd(`UID STORE ${set} ${on ? '+' : '-'}FLAGS (${flag})`); }
  async flag(box, uid, flag, on) { await this.select(box); await this.cmd(`UID STORE ${Number(uid)} ${on ? '+' : '-'}FLAGS (${flag})`); }
  async remove(box, uid, trash) {
    await this.select(box);
    if (trash && trash !== box) { try { await this.cmd(`UID COPY ${Number(uid)} ${Imap.q(trash)}`); } catch (e) { /* no trash folder: delete directly */ } }
    await this.cmd(`UID STORE ${Number(uid)} +FLAGS (\\Deleted)`); await this.cmd('EXPUNGE');
  }
  async append(box, raw, flags = '\\Seen') { const b = enc.encode(raw); await this.t.write(enc.encode('A' + (++this.n) + 'x APPEND ' + Imap.q(box) + ' (' + flags + ') {' + b.length + '}\r\n')); await this.line(); await this.t.write(b); await this.t.write(enc.encode('\r\n')); await this.line(); }
  async logout() { try { await this.cmd('LOGOUT'); } catch (e) { /* closing anyway */ } }
}

// ---------- MIME ----------
const utf8 = new TextDecoder('utf-8');
function charsetDecode(bytes, cs) { try { return new TextDecoder((cs || 'utf-8').toLowerCase().replace(/^us-ascii$/, 'utf-8')).decode(bytes); } catch (e) { return utf8.decode(bytes); } }
const latin = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 255);
function qp(s) { return latin(s.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, (m, h) => String.fromCharCode(parseInt(h, 16)))); }
function b64(s) { try { return latin(atob(s.replace(/[^A-Za-z0-9+/=]/g, ''))); } catch (e) { return new Uint8Array(0); } }
// =?utf-8?Q?...?= and =?utf-8?B?...?= in headers
export function words(s) {
  return String(s || '').replace(/\?=\s+=\?/g, '?==?').replace(/=\?([^?]+)\?([QB])\?([^?]*)\?=/gi, (m, cs, e, t) => charsetDecode(e.toUpperCase() === 'B' ? b64(t) : qp(t.replace(/_/g, ' ')), cs));
}
export function parseHeaders(raw) {
  const h = {}; raw.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/).forEach((l) => { const i = l.indexOf(':'); if (i > 0) { const k = l.slice(0, i).trim().toLowerCase(); if (!(k in h)) h[k] = words(l.slice(i + 1).trim()); } });
  return h;
}
function param(v, name) { const m = String(v || '').match(new RegExp(name + '\\s*=\\s*"?([^";]+)"?', 'i')); return m ? m[1] : ''; }
function splitPart(bytes) {
  const s = dec.decode(bytes); const i = s.search(/\r?\n\r?\n/); if (i < 0) return { h: parseHeaders(s), body: '' };
  const sep = s.slice(i).match(/^\r?\n\r?\n/)[0];
  return { h: parseHeaders(s.slice(0, i)), body: s.slice(i + sep.length) };
}
function walk(bytes, out) {
  const { h, body } = splitPart(bytes);
  const ct = h['content-type'] || 'text/plain', te = (h['content-transfer-encoding'] || '').toLowerCase();
  if (/^multipart\//i.test(ct)) {
    const b = param(ct, 'boundary'); if (!b) return;
    body.split('--' + b).slice(1).forEach((p) => { if (p.startsWith('--')) return; walk(latin(p.replace(/^\r?\n/, '')), out); });
    return;
  }
  const raw = te === 'base64' ? b64(body) : te === 'quoted-printable' ? qp(body) : latin(body);
  const disp = h['content-disposition'] || '', fname = param(disp, 'filename') || param(ct, 'name');
  if (fname || /attachment/i.test(disp)) { out.files.push({ name: words(fname) || 'bilaga', type: ct.split(';')[0], size: raw.length, data: out.keep ? raw : undefined }); return; }
  if (/^text\/plain/i.test(ct) && out.text == null) out.text = charsetDecode(raw, param(ct, 'charset'));
  else if (/^text\/html/i.test(ct) && out.html == null) out.html = charsetDecode(raw, param(ct, 'charset'));
}
export function parseMessage(bytes, keepFiles) {
  const { h } = splitPart(bytes), out = { text: null, html: null, files: [], keep: !!keepFiles };
  walk(bytes, out);
  const text = out.text != null ? out.text : htmlToText(out.html || '');
  return { from: h.from || '', to: h.to || '', cc: h.cc || '', replyTo: h['reply-to'] || '', subject: h.subject || '(inget ämne)', date: h.date || '', messageId: h['message-id'] || '', text: text.trim(), files: out.files };
}
// HTML mail is shown as plain text: safe, nothing from the sender runs in our page
export function htmlToText(html) {
  return String(html).replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|h\d|li)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ').replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, '\n\n');
}
