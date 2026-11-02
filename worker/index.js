// The website is static files (served by Cloudflare). This small script adds the admin's server parts.
import { handleInvite, handleMail } from './invite.js';
import { googleReady, googleConnect, googleCallback } from './google.js';
import { subscribe, brevoReady } from './newsletter.js';
import { siteCheck } from './sitecheck.js';
import { crawl } from './crawl.js';
import { crux, safeBrowsing, searchConsole, reviews, sheetLeads, googleCheck } from './gapi.js';
import { bookingReady, bookingLink, bookingInfo, bookingBook, bookingSync } from './booking.js';
import { accountsReady, accountsCreate } from './accounts.js';
import { adminUser } from './invite.js';
import { track } from './track.js';
import { log } from './log.js';
import { domainCheck, mailDiag } from './domains.js';
import { createOrder } from './orders.js';
import { webmail } from './webmail.js';
import { watchDomain, checkWatches } from './watch.js';
import { checkOne } from './domains.js';
import leadImport from './import.json';
import { withHeaders } from './headers.js';

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
    if (pathname === '/api/booking/link') return bookingLink(req, env);
    if (pathname === '/api/booking/info') return bookingInfo(req, env);
    if (pathname === '/api/booking/book') return bookingBook(req, env);
    if (pathname === '/api/booking/sync') return bookingSync(req, env);
    if (pathname === '/api/track') return track(req, env);
    if (pathname === '/api/log') return log(req, env);
    if (pathname === '/api/domain/check') return domainCheck(req, env);
    if (pathname === '/api/domain/watch') return watchDomain(req, env);
    if (pathname === '/api/mail/diag') return mailDiag(req, env);
    if (pathname === '/api/order') return createOrder(req, env);
    if (pathname.startsWith('/api/mail/') && pathname !== '/api/mail/diag') return webmail(req, env);
    if (pathname === '/api/accounts/create') return accountsCreate(req, env);
    // PageSpeed for Testa din sajt: the server adds the Google API key (PSI_API_KEY secret) so the test is not rate-limited
    if (pathname === '/api/psi') {
      const u = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed'); url.searchParams.forEach((v, k) => u.searchParams.append(k, v));
      if (env.PSI_API_KEY) u.searchParams.set('key', env.PSI_API_KEY);
      const r = await fetch(u, { headers: { accept: 'application/json' } });
      return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    }
    // The lead lists from Google Sheets, for the admin's import page; signed-in admins only
    if (pathname === '/api/leads/import') return sheetLeads(req, env, leadImport);
    if (pathname === '/api/newsletter') return subscribe(req, env);
    if (pathname === '/api/sitecheck') return siteCheck(req, env);
    if (pathname === '/api/crawl') return crawl(req, env);
    if (pathname === '/api/crux') return crux(req, env);
    if (pathname === '/api/safe') return safeBrowsing(req, env);
    if (pathname === '/api/gsc') return searchConsole(req, env);
    if (pathname === '/api/google/check') return googleCheck(env);
    if (pathname === '/api/reviews') return reviews(req, env);
    if (pathname === '/api/status') return Response.json({ gmail: !!(env.GMAIL_USER && env.GMAIL_APP_PASSWORD), google: googleReady(env), booking: bookingReady(env), accounts: accountsReady(env), stats: !!env.SUPABASE_SERVICE_KEY, brevo: brevoReady(env), from: env.GMAIL_USER || null });
    // The customer's booking page: one static page, the link's details are in the address
    if (pathname.startsWith('/boka/')) {
      // asked for as /boka (not /boka.html), otherwise the static files answer with a redirect that drops the link
      const out = withHeaders(await env.ASSETS.fetch(new Request(new URL('/boka', url), req)), url, req);
      out.headers.set('x-robots-tag', 'noindex'); out.headers.set('cache-control', 'no-store');
      return out;
    }
    return withHeaders(await env.ASSETS.fetch(req), url, req);
  },
  // Daily: tell visitors when a watched domain has become free (wrangler.jsonc triggers.crons)
  async scheduled(event, env, ctx) {
    if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) return;
    const { WorkerMailer } = await import('worker-mailer');
    const send = (to, subject, text) => WorkerMailer.send({ host: env.SMTP_HOST || 'smtp.gmail.com', port: Number(env.SMTP_PORT || 465), secure: true,
      credentials: { username: env.GMAIL_USER, password: env.GMAIL_APP_PASSWORD }, authType: ['plain', 'login'] }, { from: { name: 'Elevate Studio', email: env.GMAIL_USER }, to, subject, text });
    ctx.waitUntil(checkWatches(env, checkOne, send));
  },
};

// Pages state their character set in the header too, browsers remember to use https, and the admin
// stays out of search results (the _headers rules may not reach responses that pass through this script)
