// Headers every page gets from the Worker: the security policy, caching and character set.
// Used by the site and by the checks, so the checks see exactly what visitors get.
export const CSP = [
  "default-src 'self'", "script-src 'self' 'sha256-qy/ECUrMDX3jcwkwvV75XmX3ns2/21LgIaxrHyjO+pY=' https://cdn.jsdelivr.net https://static.cloudflareinsights.com", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: https:", "font-src 'self' data:",
  "media-src 'self'", "connect-src 'self' https://halecxdjclrklyufbept.supabase.co https://formsubmit.co https://www.googleapis.com https://observatory-api.mdn.mozilla.net https://cdn.jsdelivr.net https://cloudflareinsights.com",
  "frame-src https:", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self' https://formsubmit.co", "object-src 'none'", "upgrade-insecure-requests",
].join('; ');

export function withHeaders(res, url, req) {
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
