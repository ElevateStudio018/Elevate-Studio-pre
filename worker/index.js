// The website is static files (served by Cloudflare). This small script adds the admin's server parts.
import { handleInvite, handleMail } from './invite.js';
import { googleReady, googleConnect, googleCallback } from './google.js';

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
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
    return env.ASSETS.fetch(req);
  },
};
