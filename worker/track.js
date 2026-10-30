// Visitor statistics: the page sends a small beacon (assets/js/track.js), the server adds device, browser,
// country and city, and stores the row in Supabase (site_visits) with the service key. No IP address is
// stored. Without SUPABASE_SERVICE_KEY nothing is stored and the beacon is answered with 204 anyway.
const BOT_RE = /bot|crawl|spider|slurp|bingpreview|headless|lighthouse|pingdom|monitor|curl|wget|python-requests|axios|facebookexternalhit|preview|scan/i;
const clip = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v, max) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(max, Math.round(Number(v)))) : null);

function parseUa(ua) {
  const tablet = /ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua);
  const mobile = !tablet && /iphone|ipod|android.*mobile|windows phone|mobile safari|opera mini/i.test(ua);
  const device_type = tablet ? 'tablet' : mobile ? 'mobile' : ua ? 'desktop' : 'unknown';
  let os = 'Okänt';
  if (/windows nt/i.test(ua)) os = 'Windows'; else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS'; else if (/mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android'; else if (/cros/i.test(ua)) os = 'ChromeOS'; else if (/linux/i.test(ua)) os = 'Linux';
  let browser = 'Okänd';
  if (/edg\//i.test(ua)) browser = 'Edge'; else if (/opr\/|opera/i.test(ua)) browser = 'Opera'; else if (/samsungbrowser/i.test(ua)) browser = 'Samsung';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox'; else if (/chrome|crios/i.test(ua)) browser = 'Chrome'; else if (/safari/i.test(ua)) browser = 'Safari';
  return { device_type, os, browser };
}

function sourceOf(ref, utm) {
  if (utm) return utm.toLowerCase();
  if (!ref) return 'direct';
  const h = ref.toLowerCase();
  if (/google\./.test(h)) return 'google'; if (/bing\.com/.test(h)) return 'bing'; if (/duckduckgo/.test(h)) return 'duckduckgo';
  if (/facebook|fb\.com|instagram|tiktok|linkedin|t\.co|twitter|x\.com/.test(h)) return 'social';
  if (/chatgpt|openai|perplexity|claude\.ai|copilot|gemini/.test(h)) return 'ai';
  return 'referral';
}

export async function track(req, env) {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  let b; try { b = await req.json(); } catch { return new Response(null, { status: 204 }); }
  const sid = clip(b.sid, 64), path = clip(b.path, 300);
  if (!sid || !path || !env.SUPABASE_SERVICE_KEY) return new Response(null, { status: 204 });
  const ua = req.headers.get('user-agent') || '';
  let refHost = null; try { refHost = b.ref ? new URL(b.ref).hostname.replace(/^www\./, '') : null; } catch { refHost = null; }
  const own = refHost && /elevatestudio\.nu$/.test(refHost);
  const ev = clip(b.ev, 30);
  const cf = req.cf || {};
  const row = {
    session_id: sid, path, referrer_host: own ? null : refHost,
    source: ev ? `event:${ev}` : sourceOf(own ? '' : refHost, clip(b.utm_source, 80)),
    utm_source: clip(b.utm_source, 80) || null,
    utm_medium: ev === 'leave' ? String(int(b.secs, 86400) ?? 0) : ev ? clip(b.label, 120) || null : clip(b.utm_medium, 80) || null,
    utm_campaign: ev === 'leave' ? String(int(b.scroll, 100) ?? 0) : ev ? clip(b.title, 120) || null : clip(b.utm_campaign, 120) || null,
    ...parseUa(ua), screen_w: int(b.sw, 20000), screen_h: int(b.sh, 20000), viewport_w: int(b.vw, 20000), viewport_h: int(b.vh, 20000),
    language: clip(b.lang, 20) || null, timezone: clip(b.tz, 60) || null, country: cf.country || null, city: cf.city || null,
    is_bot: BOT_RE.test(ua) || !ua,
  };
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/site_visits`, { method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row) });
  } catch { /* statistics never break the site */ }
  return new Response(null, { status: 204 });
}
