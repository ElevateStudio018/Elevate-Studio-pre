// Webmail against a small fake IMAP server (node:net). Run: node --test tests/webmail.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { webmail, open as openSession } from '../worker/webmail.js';
import { parseMessage, htmlToText } from '../worker/imap.js';

const MSG1 = 'From: =?utf-8?Q?Karin_L=C3=B6nn?= <karin@kund.se>\r\nTo: info@exempel.se\r\nSubject: =?utf-8?B?T2ZmZXJ0IHDDpSBiYWRydW0=?=\r\nDate: Mon, 2 Nov 2026 09:00:00 +0100\r\nMessage-ID: <m1@kund.se>\r\nContent-Type: multipart/alternative; boundary="b1"\r\n\r\n--b1\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\nHej! Vi vill ha en offert p=C3=A5 badrum.\r\n--b1\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<p>Hej!</p>\r\n--b1--\r\n';
const MSG2 = 'From: shop@example.com\r\nSubject: Kvitto\r\nContent-Type: multipart/mixed; boundary="x"\r\n\r\n--x\r\nContent-Type: text/html; charset=iso-8859-1\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n<p>Tack f=F6r k=F6pet</p><script>alert(1)</script><a href="https://x.se">l=E4nk</a>\r\n--x\r\nContent-Type: application/pdf; name="kvitto.pdf"\r\nContent-Disposition: attachment; filename="kvitto.pdf"\r\nContent-Transfer-Encoding: base64\r\n\r\nJVBERi0=\r\n--x--\r\n';
const boxes = { INBOX: [{ uid: 11, flags: '', raw: MSG1 }, { uid: 12, flags: '\\Seen', raw: MSG2 }, { uid: 13, flags: '', raw: MSG1 }], 'INBOX.Trash': [], 'INBOX.Sent': [], 'INBOX.Archive': [], 'INBOX.Drafts': [] };
const log = [];
const server = net.createServer((c) => {
  let cur = 'INBOX', buf = '', authed = false, wait = null;
  c.write('* OK fake IMAP ready\r\n');
  c.on('data', (d) => {
    buf += d.toString('latin1');
    for (;;) {
      if (wait) { if (buf.length < wait.n + 2) return; const body = buf.slice(0, wait.n); buf = buf.slice(wait.n + 2); boxes[wait.box].push({ uid: 99, flags: '\\Seen', raw: body }); c.write(wait.tag + ' OK APPEND done\r\n'); wait = null; continue; }
      const i = buf.indexOf('\r\n'); if (i < 0) return; const line = buf.slice(0, i); buf = buf.slice(i + 2); log.push(line);
      const [tag, cmd, ...rest] = line.split(' '); const arg = rest.join(' ');
      const C = cmd.toUpperCase();
      if (C === 'LOGIN') { authed = arg === '"info@exempel.se" "ratt-losen"'; c.write(tag + (authed ? ' OK logged in\r\n' : ' NO bad login\r\n')); }
      else if (!authed) c.write(tag + ' NO login first\r\n');
      else if (C === 'LIST') { c.write('* LIST (\\HasNoChildren) "." "INBOX"\r\n* LIST (\\Trash) "." "INBOX.Trash"\r\n* LIST (\\Sent) "." "INBOX.Sent"\r\n* LIST (\\Archive) "." "INBOX.Archive"\r\n* LIST (\\Drafts) "." "INBOX.Drafts"\r\n' + tag + ' OK\r\n'); }
      else if (C === 'STATUS') { const b = arg.split(' ')[0].replace(/"/g, ''); c.write(`* STATUS "${b}" (MESSAGES ${boxes[b].length} UNSEEN ${boxes[b].filter((m) => !/Seen/.test(m.flags)).length})\r\n${tag} OK\r\n`); }
      else if (C === 'SELECT') { cur = arg.replace(/"/g, ''); c.write(`* ${boxes[cur].length} EXISTS\r\n${tag} OK\r\n`); }
      else if (C === 'FETCH') { boxes[cur].forEach((m, k) => { const h = m.raw.split('\r\n\r\n')[0] + '\r\n\r\n'; c.write(`* ${k + 1} FETCH (UID ${m.uid} FLAGS (${m.flags}) RFC822.SIZE ${m.raw.length} BODY[HEADER.FIELDS (FROM TO SUBJECT DATE)] {${Buffer.byteLength(h, 'latin1')}}\r\n`); c.write(Buffer.from(h, 'latin1')); c.write(')\r\n'); }); c.write(tag + ' OK\r\n'); }
      else if (C === 'UID') {
        const [sub, uid, ...r] = arg.split(' '); const m = boxes[cur].find((x) => x.uid === Number(uid));
        if (sub === 'FETCH' && m) { if (m.flagged) m.flags = '\\Seen \\Flagged'; else m.flags = '\\Seen'; const raw = Buffer.from(m.raw, 'latin1'); c.write(`* 1 FETCH (UID ${m.uid} FLAGS (\\Seen) BODY[] {${raw.length}}\r\n`); c.write(raw); c.write(')\r\n'); }
        const set = uid.split(',').map(Number), ms = boxes[cur].filter((x) => set.includes(x.uid));
        if (sub === 'STORE') ms.forEach((x) => { const fl = r.join(' '); if (/Deleted/.test(fl)) x.deleted = true; else if (/Flagged/.test(fl)) x.flagged = /^\+/.test(r[0]); else x.flags = /^\+/.test(r[0]) ? '\\Seen' : ''; });
        if (sub === 'MOVE') { const to = r.join(' ').replace(/"/g, ''); boxes[to].push(...ms); boxes[cur] = boxes[cur].filter((x) => !set.includes(x.uid)); }
        if (sub === 'COPY') ms.forEach((x) => boxes[r.join(' ').replace(/"/g, '')].push({ ...x }));
        c.write(tag + ' OK\r\n');
      }
      else if (C === 'EXPUNGE') { boxes[cur] = boxes[cur].filter((m) => !m.deleted); c.write(tag + ' OK\r\n'); }
      else if (C === 'APPEND') { const n = Number(arg.match(/\{(\d+)\}$/)[1]); wait = { n, tag, box: arg.split(' ')[0].replace(/"/g, '') }; c.write('+ go\r\n'); }
      else if (C === 'LOGOUT') { c.write('* BYE\r\n' + tag + ' OK\r\n'); c.end(); }
      else c.write(tag + ' BAD unknown\r\n');
    }
  });
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const connector = async () => { const s = net.connect(port, '127.0.0.1'); const q = []; let w = null; s.on('data', (d) => { if (w) { w(new Uint8Array(d)); w = null; } else q.push(new Uint8Array(d)); }); s.on('end', () => { if (w) { w(null); w = null; } });
  return { read: () => q.length ? Promise.resolve(q.shift()) : new Promise((r) => { w = r; }), write: (b) => new Promise((r) => s.write(b, r)), close: () => s.destroy() }; };
const env = { MAIL_SESSION_KEY: 'test-nyckel-som-ar-lang-nog-1234567890' };
const sent = [];
const call = (path, opt = {}, ck) => webmail(new Request('https://elevatestudio.nu/api/mail/' + path, { method: opt.body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', 'x-requested-with': opt.noHeader ? '' : 'elevate', cookie: ck ? 'es_mail=' + ck : '' }, body: opt.body ? JSON.stringify(opt.body) : undefined }), env, connector, async (m) => sent.push(m));
const login = (pass, email = 'info@exempel.se') => call('login', { body: { email, password: pass, imap: '127.0.0.1', smtp: '127.0.0.1' } });
let ck;
test('fel lösenord ger 401 och ingen cookie', async () => { const r = await login('fel'); assert.equal(r.status, 401); assert.equal(r.headers.get('set-cookie'), null); });
test('rätt lösenord ger mappar och en säker cookie', async () => {
  const r = await login('ratt-losen'); const d = await r.json(); assert.equal(r.status, 200); assert.deepEqual(d.folders, ['INBOX', 'INBOX.Trash', 'INBOX.Sent', 'INBOX.Archive', 'INBOX.Drafts']);
  const c = r.headers.get('set-cookie'); assert.match(c, /HttpOnly/); assert.match(c, /Secure/); assert.match(c, /SameSite=Strict/); assert.ok(!c.includes('ratt'));
  ck = c.match(/es_mail=([^;]+)/)[1];
  const s = await openSession(env, ck); assert.equal(s.e, 'info@exempel.se');
});
test('utan eller med manipulerad cookie: 401', async () => { assert.equal((await call('list')).status, 401); assert.equal((await call('list', {}, ck.slice(0, -4) + 'AAAA')).status, 401); });
test('inkorgen listas nyast först, avkodad', async () => {
  const d = await (await call('list?folder=INBOX', {}, ck)).json();
  assert.equal(d.total, 3); assert.equal(d.items[0].uid, 13); const k = d.items.find((x) => x.uid === 11); assert.equal(k.subject, 'Offert på badrum'); assert.match(k.from, /Karin Lönn/); assert.equal(k.seen, false);
});
test('läsa mejl: text med åäö, html blir text utan skript, bilaga listas', async () => {
  const a = await (await call('read?folder=INBOX&uid=11', {}, ck)).json(); assert.equal(a.text, 'Hej! Vi vill ha en offert på badrum.'); assert.equal(a.messageId, '<m1@kund.se>');
  const b = await (await call('read?folder=INBOX&uid=12', {}, ck)).json(); assert.match(b.text, /Tack för köpet/); assert.ok(!/alert|script/.test(b.text)); assert.match(b.text, /länk \(https:\/\/x\.se\)/); assert.equal(b.files[0].name, 'kvitto.pdf');
});
test('markera som oläst', async () => { assert.equal((await call('flags', { body: { folder: 'INBOX', uids: [11], flag: 'seen', on: false } }, ck)).status, 200); assert.equal(boxes.INBOX.find((m) => m.uid === 11).flags, ''); });
test('ta bort flyttar till papperskorgen', async () => { assert.equal((await call('delete', { body: { folder: 'INBOX', uid: 12 } }, ck)).status, 200); assert.equal(boxes.INBOX.length, 2); assert.equal(boxes['INBOX.Trash'].length, 1); });
test('skicka: fel mottagare stoppas, rätt skickas och sparas i Skickat', async () => {
  assert.equal((await call('send', { body: { to: 'inte-en-adress', subject: 'x', text: 'y' } }, ck)).status, 400);
  const r = await call('send', { body: { to: 'kund@foretag.se', subject: 'Offert', text: 'Hej!', inReplyTo: '<m1@kund.se>' } }, ck);
  assert.equal(r.status, 200); assert.equal(sent[0].from, 'info@exempel.se'); assert.deepEqual(sent[0].to, ['kund@foretag.se']); assert.equal(sent[0].headers['In-Reply-To'], '<m1@kund.se>');
  assert.equal(boxes['INBOX.Sent'].length, 1);
});
test('POST utan rätt header avvisas (skydd mot förfalskade anrop)', async () => { assert.equal((await call('delete', { body: { uid: 1 }, noHeader: true }, ck)).status, 403); });
test('för många inloggningsförsök spärras', async () => { let last; for (let i = 0; i < 9; i++) last = await login('fel', 'spam@exempel.se'); assert.equal(last.status, 429); });
test('mappar med roller och antal olästa', async () => {
  const d = await (await call('folders', {}, ck)).json();
  assert.equal(d.roles.archive, 'INBOX.Archive'); assert.equal(d.roles.drafts, 'INBOX.Drafts'); assert.equal(d.roles.trash, 'INBOX.Trash'); assert.equal(typeof d.counts.INBOX.unseen, 'number');
});
test('stjärnmärk och arkivera flera på en gång', async () => {
  assert.equal((await call('flags', { body: { folder: 'INBOX', uids: [11], flag: 'flagged', on: true } }, ck)).status, 200);
  assert.equal(boxes.INBOX.find((m) => m.uid === 11).flagged, true);
  assert.equal((await call('move', { body: { folder: 'INBOX', uids: [11, 13], to: 'archive' } }, ck)).status, 200);
  assert.equal(boxes.INBOX.length, 0); assert.equal(boxes['INBOX.Archive'].length, 2);
  assert.equal((await call('move', { body: { folder: 'INBOX.Archive', uids: [11], to: 'finns-inte' } }, ck)).status, 502);
});
test('spara utkast', async () => { assert.equal((await call('draft', { body: { to: 'a@b.se', subject: 'Utkast', text: 'Hej' } }, ck)).status, 200); assert.equal(boxes['INBOX.Drafts'].length, 1); });
test('bilaga laddas ner med rätt namn', async () => {
  boxes.INBOX.push({ uid: 12, flags: '', raw: MSG2 });
  const r = await call('attachment?folder=INBOX&uid=12&i=0', {}, ck); assert.equal(r.status, 200); assert.match(r.headers.get('content-disposition'), /kvitto\.pdf/);
  assert.equal(new TextDecoder().decode(await r.arrayBuffer()), '%PDF-');
});
test('skicka med namn, dold kopia och bilaga', async () => {
  const r = await call('send', { body: { to: 'Kund <kund@foretag.se>', bcc: 'chef@exempel.se', subject: 'Offert', text: 'Se bilaga', name: 'Anna', files: [{ name: 'offert.pdf', type: 'application/pdf', data: 'JVBERi0=' }] } }, ck);
  assert.equal(r.status, 200); const m = sent[sent.length - 1];
  assert.deepEqual(m.from, { name: 'Anna', email: 'info@exempel.se' }); assert.deepEqual(m.to, ['kund@foretag.se']); assert.deepEqual(m.bcc, ['chef@exempel.se']); assert.equal(m.attachments[0].filename, 'offert.pdf');
});
test('utloggning tömmer cookien', async () => { const r = await call('logout', { body: {} }, ck); assert.match(r.headers.get('set-cookie'), /Max-Age=0/); });
test('html till text', () => { assert.equal(htmlToText('<p>a</p><style>x</style><br>b'), 'a\n\nb'); });
test.after(() => server.close());
