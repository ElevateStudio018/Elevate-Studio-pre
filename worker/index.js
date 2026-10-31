// The website is static files (served by Cloudflare). This small script adds the admin's server parts.
import { handleInvite, handleMail } from './invite.js';
import { googleReady, googleConnect, googleCallback } from './google.js';
import { subscribe, brevoReady } from './newsletter.js';
import { crux, safeBrowsing, searchConsole, reviews, sheetLeads, googleCheck } from './gapi.js';
import { bookingReady, bookingLink, bookingInfo, bookingBook, bookingSync } from './booking.js';
import { accountsReady, accountsCreate } from './accounts.js';
import { adminUser } from './invite.js';
import { track } from './track.js';
import leadImport from './import.json';

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
    if (pathname === '/api/crux') return crux(req, env);
    if (pathname === '/api/safe') return safeBrowsing(req, env);
    if (pathname === '/api/gsc') return searchConsole(req, env);
    if (pathname === '/api/google/check') return googleCheck(env);
    if (pathname === '/api/reviews') return reviews(req, env);
    if (pathname === '/api/status') return Response.json({ gmail: !!(env.GMAIL_USER && env.GMAIL_APP_PASSWORD), google: googleReady(env), booking: bookingReady(env), accounts: accountsReady(env), brevo: brevoReady(env), from: env.GMAIL_USER || null });
    // The customer's booking page: one static page, the link's details are in the address
    if (pathname.startsWith('/boka/')) {
      // asked for as /boka (not /boka.html), otherwise the static files answer with a redirect that drops the link
      const out = withHeaders(await env.ASSETS.fetch(new Request(new URL('/boka', url), req)), url, req);
      out.headers.set('x-robots-tag', 'noindex'); out.headers.set('cache-control', 'no-store');
      return out;
    }
    return withHeaders(await env.ASSETS.fetch(req), url, req);
  },
};

// Pages state their character set in the header too, browsers remember to use https, and the admin
// stays out of search results (the _headers rules may not reach responses that pass through this script)
const CSP = [
  "default-src 'self'", "script-src 'self' 'sha256-qy/ECUrMDX3jcwkwvV75XmX3ns2/21LgIaxrHyjO+pY=' https://cdn.jsdelivr.net https://static.cloudflareinsights.com", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: https:", "font-src 'self' data:",
  "media-src 'self'", "connect-src 'self' https://halecxdjclrklyufbept.supabase.co https://formsubmit.co https://www.googleapis.com https://observatory-api.mdn.mozilla.net https://cdn.jsdelivr.net https://cloudflareinsights.com",
  "frame-src https:", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self' https://formsubmit.co", "object-src 'none'", "upgrade-insecure-requests",
].join('; ');

function withHeaders(res, url, req) {
  const type = res.headers.get('content-type') || '';
  const out = new Response(res.body, res);
  if (type.startsWith('text/html') && !/charset/i.test(type)) out.headers.set('content-type', 'text/html; charset=utf-8');
  if (url.protocol === 'https:') out.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains; preload');
  if (url.pathname.startsWith('/admin')) out.headers.set('x-robots-tag', 'noindex');
  // Security headers: no sniffing, no embedding of our pages, a content security policy that only lets
  // our own files and the two CDN libraries run. frame-src stays open for the previews of customer sites.
  out.headers.set('x-content-type-options', 'nosniff');
  out.headers.set('x-frame-options', 'DENY');
  out.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  out.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  if (type.startsWith('text/html')) {
    out.headers.set('content-security-policy', CSP);
    // no-transform: Cloudflare leaves the page as it is (no injected analytics script that slows the first view)
    const cc = out.headers.get('cache-control') || 'public, max-age=0, must-revalidate';
    if (!/no-transform/.test(cc)) out.headers.set('cache-control', cc + ', no-transform');
    // With no-transform Cloudflare does not compress either, so the page is gzipped here
    const ae = (req && req.headers.get('accept-encoding')) || '';
    if (out.status === 200 && out.body && /gzip/.test(ae) && !out.headers.get('content-encoding')) {
      const headers = new Headers(out.headers);
      headers.set('content-encoding', 'gzip'); headers.delete('content-length'); headers.append('vary', 'Accept-Encoding');
      return new Response(out.body.pipeThrough(new CompressionStream('gzip')), { status: 200, headers, encodeBody: 'manual' });
    }
  }
  return out;
}
