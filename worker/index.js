// The website is static files (served by Cloudflare). This small script adds the admin's server parts.
import { handleInvite, handleMail } from './invite.js';
import { googleReady, googleConnect, googleCallback } from './google.js';

const HOME = 'elevatestudio.nu';

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const { pathname } = url;
    // One address for the whole site: http:// and www. move permanently to https://elevatestudio.nu
    if (url.hostname.endsWith(HOME) && (url.protocol === 'http:' || url.hostname !== HOME)) {
      return Response.redirect(`https://${HOME}${pathname}${url.search}`, 301);
    }
    // Links pasted from chats or mails can pick up extra characters ("**", "/", capitals); the Google
    // links are matched loosely so they still work
    let loose = pathname;
    try { loose = decodeURIComponent(pathname); } catch (e) { /* keep as is */ }
    loose = loose.toLowerCase().replace(/^\/admin(?=\/api\/)/, '').replace(/[^a-z0-9/_-]+$/, '').replace(/\/+$/, '');
    if (pathname === '/api/invite') return handleInvite(req, env);
    if (pathname === '/api/mail') return handleMail(req, env);
    if (loose === '/api/google/connect' || loose === '/koppla-google') return googleConnect(req, env);
    if (loose === '/api/google/callback') return googleCallback(req, env);
    if (pathname === '/api/status') return Response.json({ gmail: !!(env.GMAIL_USER && env.GMAIL_APP_PASSWORD), google: googleReady(env), from: env.GMAIL_USER || null });
    return withHeaders(await env.ASSETS.fetch(req), url);
  },
};

// Pages state their character set in the header too, browsers remember to use https, and the admin
// stays out of search results (the _headers rules may not reach responses that pass through this script)
function withHeaders(res, url) {
  const type = res.headers.get('content-type') || '';
  const out = new Response(res.body, res);
  if (type.startsWith('text/html') && !/charset/i.test(type)) out.headers.set('content-type', 'text/html; charset=utf-8');
  if (url.protocol === 'https:') out.headers.set('strict-transport-security', 'max-age=31536000');
  if (url.pathname.startsWith('/admin')) out.headers.set('x-robots-tag', 'noindex');
  return out;
}
