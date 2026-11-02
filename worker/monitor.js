// Every 15 minutes: is each customer website up, and how fast does it answer? Saved in uptime_checks; when a site
// goes down (or comes back) the customer and info@ get a mail. On the 1st of every month: a report with Google's
// scores for every customer website, saved in site_reports and mailed to the customer.
// The websites are the services with type 'website' and details.url. Needs SUPABASE_SERVICE_KEY.
const db = (env) => {
  const h = { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' };
  return {
    get: (path) => fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { headers: h }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    post: (table, row) => fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, { method: 'POST', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify(row) }).catch(() => null),
  };
};

export async function sites(env) {
  const rows = await db(env).get("services?type=eq.website&status=neq.cancelled&select=company_id,name,details,companies(name,billing_email)");
  return (Array.isArray(rows) ? rows : []).map((r) => ({ company_id: r.company_id, name: r.name, url: r.details && r.details.url, company: r.companies && r.companies.name, email: r.companies && r.companies.billing_email }))
    .filter((s) => /^https?:\/\//.test(s.url || ''));
}

export async function checkUptime(env, sendMail, fetcher = fetch) {
  if (!env.SUPABASE_SERVICE_KEY) return [];
  const d = db(env), out = [];
  for (const s of await sites(env)) {
    const t0 = Date.now();
    const r = await fetcher(s.url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(10000), headers: { 'user-agent': 'ElevateStudioMonitor/1.0 (+https://elevatestudio.nu)' } }).catch(() => null);
    const ok = !!r && r.status < 500, ms = Date.now() - t0;
    const last = (await d.get(`uptime_checks?company_id=eq.${s.company_id}&url=eq.${encodeURIComponent(s.url)}&select=ok&order=checked_at.desc&limit=1`))[0];
    await d.post('uptime_checks', { company_id: s.company_id, url: s.url, ok, status: r ? r.status : 0, ms });
    if (last && last.ok !== ok) {
      const subject = ok ? `${s.url} fungerar igen` : `${s.url} svarar inte`;
      const text = ok ? `Hej!\n\nHemsidan ${s.url} svarar igen.\n\nHälsningar\nElevate Studio` : `Hej!\n\nVi kontrollerade ${s.url} just nu och den svarade inte${r ? ' (felkod ' + r.status + ')' : ''}. Vi tittar på det direkt.\n\nHälsningar\nElevate Studio`;
      for (const to of [s.email, 'info@elevatestudio.nu'].filter(Boolean)) { try { await sendMail(to, subject, text); } catch (e) { /* next check tries again */ } }
    }
    out.push({ url: s.url, ok, ms });
  }
  return out;
}

export async function monthlyReports(env, sendMail, fetcher = fetch) {
  if (!env.SUPABASE_SERVICE_KEY || !env.PSI_API_KEY) return 0;
  const d = db(env); let n = 0;
  for (const s of await sites(env)) {
    const q = new URLSearchParams({ url: s.url, strategy: 'mobile', locale: 'sv', key: env.PSI_API_KEY });
    ['performance', 'accessibility', 'best-practices', 'seo'].forEach((c) => q.append('category', c));
    const lr = await fetcher('https://www.googleapis.com/pagespeedonline/v5/runPagespeed?' + q).then((r) => r.json()).then((x) => x.lighthouseResult).catch(() => null);
    if (!lr) continue;
    const sc = (k) => (lr.categories[k] && typeof lr.categories[k].score === 'number' ? Math.round(lr.categories[k].score * 100) : null);
    const issues = Object.values(lr.audits).filter((a) => a.score !== null && a.score < 0.9 && !['manual', 'notApplicable', 'informative'].includes(a.scoreDisplayMode)).slice(0, 8).map((a) => a.title);
    const lcp = lr.audits['largest-contentful-paint'] ? Math.round(lr.audits['largest-contentful-paint'].numericValue) : null;
    const row = { company_id: s.company_id, url: s.url, performance: sc('performance'), accessibility: sc('accessibility'), best_practices: sc('best-practices'), seo: sc('seo'), lcp_ms: lcp, issues };
    await d.post('site_reports', row);
    if (s.email) {
      const month = new Date().toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
      const text = `Hej!\n\nHär är månadsrapporten för ${s.url} (${month}).\n\nPrestanda: ${row.performance}\nTillgänglighet: ${row.accessibility}\nBästa praxis: ${row.best_practices}\nSEO: ${row.seo}\nLaddtid: ${lcp ? (lcp / 1000).toFixed(1).replace('.', ',') + ' s' : '–'}\n\n` +
        (issues.length ? 'Det här kan förbättras:\n- ' + issues.join('\n- ') + '\n\n' : 'Inga större problem hittades.\n\n') +
        'Vill ni att vi åtgärdar något? Skapa en ändringsförfrågan i kundportalen: https://elevatestudio.nu/portal\n\nHälsningar\nElevate Studio';
      try { await sendMail(s.email, `Månadsrapport för ${s.url}`, text); } catch (e) { /* saved in the portal anyway */ }
    }
    n++;
  }
  return n;
}
