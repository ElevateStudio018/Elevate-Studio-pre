import test from 'node:test';
import assert from 'node:assert/strict';
import { siteLead, siteContent, themeFromHtml, publicHttps, simpleAgent, agent } from '../worker/kundadmin.js';

const env = { SUPABASE_URL: 'https://db', SUPABASE_KEY: 'anon', SUPABASE_SERVICE_KEY: 'svc' };
const req = (path, body, h = {}) => new Request('https://elevatestudio.nu' + path, body ? { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...h } } : { headers: h });
const realFetch = globalThis.fetch;
const fake = (routes) => { const calls = []; globalThis.fetch = async (u, o = {}) => { calls.push([String(u), o]); for (const [re, f] of routes) if (re.test(String(u))) return f(String(u), o); return new Response('[]'); }; return calls; };
test.afterEach(() => { globalThis.fetch = realFetch; });

test('lead: stored with the service key, mail to the site owner, honeypot and checks', async () => {
  const mails = [];
  const calls = fake([[/sites\?slug=eq\.lindvik/, () => Response.json([{ id: 's1', name: 'Lindvik Bygg', settings: { lead_email: 'info@lindvik.se' } }])], [/site_leads/, () => new Response('', { status: 201 })]]);
  const r = await siteLead(req('/api/site/lead', { site: 'lindvik', name: 'Karin', email: 'karin@x.se', service: 'Badrum', message: 'Renovera badrum' }, { 'cf-connecting-ip': '1.1.1.1' }), env, async (...a) => mails.push(a));
  assert.equal(r.status, 200);
  const ins = calls.find(([u, o]) => /site_leads/.test(u) && o.method === 'POST');
  assert.equal(JSON.parse(ins[1].body).site_id, 's1'); assert.equal(ins[1].headers.Authorization, 'Bearer svc');
  assert.equal(mails[0][0], 'info@lindvik.se'); assert.match(mails[0][1], /Badrum/);
  assert.equal((await siteLead(req('/api/site/lead', { site: 'lindvik', website: 'spam', message: 'x', email: 'a@b.se' }), env)).status, 200);
  assert.equal((await siteLead(req('/api/site/lead', { site: 'lindvik', message: 'hej' }, { 'cf-connecting-ip': '2.2.2.2' }), env)).status, 400);
  assert.equal(r.headers.get('access-control-allow-origin'), '*');
});
test('lead: rate limit per visitor', async () => {
  fake([[/sites/, () => Response.json([{ id: 's1', name: 'X', settings: {} }])], [/site_leads/, () => new Response('', { status: 201 })]]);
  let last; for (let i = 0; i < 6; i++) last = await siteLead(req('/api/site/lead', { site: 'x1', message: 'm', email: 'a@b.se' }, { 'cf-connecting-ip': '9.9.9.9' }), env);
  assert.equal(last.status, 429);
});
test('content: only published, grouped lists, public settings only', async () => {
  fake([[/sites\?slug/, () => Response.json([{ id: 's1', name: 'L', theme: { primary: '#123456' }, settings: { phone: '08', lead_email: 'hemlig@x.se' } }])],
    [/site_content/, (u) => { assert.match(u, /published=not\.is\.null/); return Response.json([{ key: 'hero.title', published: 'Hej' }]); }],
    [/site_items/, (u) => { assert.match(u, /published=eq\.true/); return Response.json([{ id: 'p1', kind: 'project', data: { title: 'Villa' } }]); }]]);
  const d = await (await siteContent(req('/api/site/content?site=lindvik'), env)).json();
  assert.equal(d.content['hero.title'], 'Hej'); assert.equal(d.lists.project[0].title, 'Villa'); assert.equal(d.settings.lead_email, undefined);
});
test('theme: picks a dark brand colour and a lighter accent', () => {
  const t = themeFromHtml('<meta name="theme-color" content="#1f4d36"><style>a{color:#1f4d36}.b{background:#8fd3a6}.c{color:#ffffff}.d{color:#000}</style>');
  assert.equal(t.primary, '#1f4d36'); assert.equal(t.accent, '#8fd3a6');
  assert.equal(publicHttps('http://x.se'), null); assert.equal(publicHttps('https://127.0.0.1'), null); assert.ok(publicHttps('https://lindvik.se'));
});
test('simple agent: common Swedish requests become actions', () => {
  assert.deepEqual(simpleAgent('Ändra öppettider till mån–fre 7–17').actions[0], { type: 'set_setting', field: 'hours', value: 'mån–fre 7–17' });
  assert.equal(simpleAgent('Ändra rubriken på startsidan till "Vi bygger ditt drömhem"').actions[0].text, 'Vi bygger ditt drömhem');
  assert.deepEqual(simpleAgent('lägg till projekt Villa i Tyresö').actions[0], { type: 'add_item', kind: 'project', title: 'Villa', text: '', place: 'Tyresö' });
  assert.equal(simpleAgent('jag vill byta en bild').actions[0].module, 'bilder');
});
test('agent: needs login and membership, returns Claude tool calls as actions', async () => {
  fake([[/auth\/v1\/user/, () => Response.json({ id: 'u1' })], [/rest\/v1\/sites\?id=eq\.0{8}-0{4}-0{4}-0{4}-0{12}/, () => Response.json([{ id: 's', name: 'L', settings: {} }])], [/rest\/v1\/sites/, () => Response.json([])]]);
  assert.equal((await agent(req('/api/kundadmin/agent', { prompt: 'x', site_id: 'a' }), env)).status, 401);
  assert.equal((await agent(req('/api/kundadmin/agent', { prompt: 'x', site_id: '11111111-1111-1111-1111-111111111111' }, { Authorization: 'Bearer t' }), env)).status, 403);
  let sent;
  const client = { beta: { messages: { create: async (p) => { sent = p; return { stop_reason: 'tool_use', content: [{ type: 'text', text: 'Jag ändrar öppettiderna.' }, { type: 'tool_use', name: 'set_setting', input: { field: 'hours', value: '7–17' } }, { type: 'tool_use', name: 'delete_everything', input: {} }] }; } } } };
  const d = await (await agent(req('/api/kundadmin/agent', { prompt: 'öppet 7–17', site_id: '00000000-0000-0000-0000-000000000000' }, { Authorization: 'Bearer t' }), env, client)).json();
  assert.equal(sent.model, 'claude-opus-5-5'); assert.deepEqual(sent.tool_choice, { type: 'auto' });
  assert.deepEqual(d.actions, [{ type: 'set_setting', field: 'hours', value: '7–17' }]);
});
