"""Static site generator for the design study.

Run from the repository root:  python3 tools/build.py

Generates every subpage from tools/content.py and re-wraps index.html and
404.html with the shared header, menus and footer, so that
navigation is identical on every page.
"""
import datetime
import hashlib
import html
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from content import ARTICLES, SITES, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, CASES, FORM_ENDPOINT, MAIL_FUNCTION, MAIL_LIVE, PLATFORMS, PSI_API_KEY, SERVICES, SIMPLE_PAGES, SITE_URL, TEAM, PARENT_COMPANY, ORG_NR, REVIEWS, FAQ, LANDINGS, REVIEW_URL  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
SERVICE = {s["slug"]: s for s in SERVICES}
CASE = {c["slug"]: c for c in CASES}
CHEVRON = '<svg class="chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 4.75 8 11.25l6.5-6.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>'


def esc(text):
    return html.escape(text, quote=True)


# ---------------------------------------------------------------- shell

CHECK = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M4 12l5 5L20 6"/></svg>'


def header(p, crumbs, current):
    def nav_item(key, href, label):
        cls = ' class="is-current"' if key == current else ""
        return f'<li{cls}><a href="{p}{href}">{label}</a></li>'

    mega_items = "".join(
        f'<li><a href="{p}tjanster/{s["slug"]}.html" class="megamenu__menu-link">{esc(s["name"])}</a>'
        f'<p class="megamenu__menu-text">{esc(s["lead"])}</p></li>'
        for s in SERVICES)
    services_cls = ' is-current' if current == "tjanster" else ""
    bc = ""
    if crumbs:
        items = [f'<li class="breadcrumb-item"><a href="{p}index.html"><span>Start</span></a></li>']
        for label, href in crumbs[:-1]:
            items.append(f'<li class="breadcrumb-item"><a href="{p}{href}"><span>{esc(label)}</span></a></li>')
        items.append(f'<li class="breadcrumb-item active"><span>{esc(crumbs[-1][0])}</span></li>')
        bc = f'''
    <div class="breadcrumbs">
      <nav aria-label="Brödsmulor"><ol class="breadcrumb">{"".join(items)}</ol></nav>
    </div>'''
    return f'''<header class="site-header" id="site-header">
    <figure class="site-header__site-logo">
      <a href="{p}index.html" class="wordmark">
        <svg class="wordmark__mark" viewBox="0 0 1884.3 1353.9" aria-hidden="true"><path d="M0.0 1353.9 L1218.7 0.0 L1218.7 329.1 L479.7 1136.4 L786.7 1132.4 L1215.5 687.4 L1884.3 1349.9 L1590.1 1349.9 L1218.6 994.7 L865.4 1349.9Z" fill="currentColor"/></svg>
        <span class="wordmark__name">Elevate Studio</span>
      </a>
    </figure>

    <div class="site-header__right">
      <nav class="site-header__navbar" aria-label="Huvudmeny">
        <ul>
          {nav_item("projekt", "projekt/index.html", "Projekt")}
          <li class="has-megamenu{services_cls}">
            <a href="{p}tjanster/index.html" class="js-show-megamenu" aria-expanded="false" aria-controls="megamenu">Vad vi gör {CHEVRON}</a>
          </li>
          {nav_item("priser", "priser.html", "Priser")}
          {nav_item("kontakt", "kontakt.html", "Kontakt")}
          {nav_item("insikter", "insikter/index.html", "Senaste nytt")}
        </ul>
      </nav>
      <button class="hamburger-icon js-show-hamburger" type="button" aria-label="Öppna meny" aria-expanded="false" aria-controls="hamburgermenu">
        <span class="icon"></span>
      </button>
    </div>{bc}

    <div class="megamenu__container">
      <section class="megamenu" id="megamenu" aria-label="Vad vi gör">
        <div class="megamenu__sidebar">
          <div>
            <p class="megamenu__sidebar-header">Syns ni när kunder frågar AI?</p>
            <p class="megamenu__sidebar-text">Allt fler frågar en AI-assistent i stället för att googla. Vi bygger hemsidan så att både Google och AI-tjänster beskriver er rätt.</p>
          </div>
          <p class="megamenu__sidebar-button"><a href="{p}tjanster/seo-och-ai-optimering.html" class="btn btn--primary"><span>Mer om SEO och AI</span></a></p>
        </div>
        <ul class="megamenu__menu">{mega_items}</ul>
      </section>
    </div>
  </header>

  <div class="drawer-backdrop js-close-drawer" hidden></div>
  <nav class="hamburgermenu" id="hamburgermenu" aria-label="Meny" aria-hidden="true">
    <div class="drawer__top">
      <span class="drawer__label">Meny</span>
      <button class="drawer__close js-close-drawer" type="button" aria-label="Stäng meny"><span aria-hidden="true"></span></button>
    </div>
    <div class="drawer__nav">
      <p class="drawer__heading drawer__heading--desk">Meny</p>
      <ul class="drawer__main">
        <li><a href="{p}projekt/index.html">Projekt</a></li>
        <li class="has-sub">
          <button type="button" class="drawer__toggle js-toggle-sub" aria-expanded="false">Vad vi gör {CHEVRON}</button>
          <div class="hamburgermenu__sub">
            <ul>
              {"".join(f'<li><a href="{p}tjanster/{s["slug"]}.html">{esc(s["name"])}</a></li>' for s in SERVICES)}
              <li><a href="{p}tjanster/index.html" class="drawer__all">Alla tjänster</a></li>
            </ul>
          </div>
        </li>
        <li class="drawer__desk-only"><a href="{p}tjanster/index.html">Vad vi gör</a></li>
        <li><a href="{p}priser.html">Priser</a></li>
        <li><a href="{p}insikter/index.html">Senaste nytt</a></li>
        <li><a href="{p}plattformar/index.html">Plattformar</a></li>
        <li><a href="{p}testa.html">Testa din sajt</a></li>
        <li><a href="{p}kontakt.html">Kontakt</a></li>
      </ul>
    </div>
    <div class="drawer__services">
      <p class="drawer__heading">Tjänster</p>
      <ul class="drawer__list">
        {"".join(f'<li><a href="{p}tjanster/{s["slug"]}.html">{esc(s["name"])}</a></li>' for s in SERVICES)}
      </ul>
    </div>
    <div class="drawer__about">
      <p class="drawer__heading">Om oss</p>
      <ul class="drawer__minor">
        <li><a href="{p}om.html">Om oss</a></li>
        <li><a href="{p}priser.html">Priser</a></li>
        <li><a href="{p}avtal.html">Exempel på webbavtal</a></li>
      </ul>
      <p class="drawer__heading drawer__heading--lang">Språk / Language</p>
      <ul class="drawer__lang">
        <li><a href="?lang=sv" lang="sv" data-lang="sv" class="is-on" aria-current="true" rel="nofollow">{CHECK}Svenska</a></li>
        <li><a href="?lang=en" lang="en" data-lang="en" rel="nofollow">English</a></li>
      </ul>
    </div>
    <div class="drawer__contact">
      <p class="drawer__contact-title">Har ni ett projekt på gång?</p>
      <p>Vi svarar så fort vi kan.</p>
      <a class="drawer__mail" href="mailto:info@elevatestudio.nu">info@elevatestudio.nu</a>
      <a class="btn btn--primary" href="{p}kontakt.html"><span>Hör av er</span></a>
    </div>
  </nav>'''


SOCIAL = {
    "Instagram": "https://www.instagram.com/elevate.studio018/",
    "TikTok": "https://www.tiktok.com/@elevate.studio88",
    "Facebook": "https://www.facebook.com/profile.php?id=61592020254252",
}
SOCIAL_ICON = {
    "Instagram": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM17.5 5.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" fill="currentColor"/></svg>',
    "TikTok": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2h3a5 5 0 0 0 4 4v3a8 8 0 0 1-4-1.3V15a6 6 0 1 1-6-6v3a3 3 0 1 0 3 3V2z" fill="currentColor"/></svg>',
    "Facebook": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8z" fill="currentColor"/></svg>',
}


def social_links(cls="social"):
    """Instagram, TikTok and Facebook as icon links."""
    return f'<ul class="{cls}">' + "".join(
        f'<li><a href="{u}" target="_blank" rel="noopener" aria-label="Elevate Studio på {n}" title="{n}">{SOCIAL_ICON[n]}<span>{n}</span></a></li>'
        for n, u in SOCIAL.items()) + "</ul>"


def footer(p):
    services = "".join(f'<li><a href="{p}tjanster/{s["slug"]}.html">{esc(s["name"])}</a></li>' for s in SERVICES)
    return f'''<footer>
    <div class="site-footer">
      <svg class="site-footer__bigmark" viewBox="0 0 1884.3 1353.9" aria-hidden="true" focusable="false"><path d="M0.0 1353.9 L1218.7 0.0 L1218.7 329.1 L479.7 1136.4 L786.7 1132.4 L1215.5 687.4 L1884.3 1349.9 L1590.1 1349.9 L1218.6 994.7 L865.4 1349.9Z" fill="currentColor"/></svg>
      <div class="container">
        <div class="site-footer__row">
          <div class="site-footer__small">
            <a href="{p}index.html" class="wordmark wordmark--light">
              <svg class="wordmark__mark" viewBox="0 0 1884.3 1353.9" aria-hidden="true"><path d="M0.0 1353.9 L1218.7 0.0 L1218.7 329.1 L479.7 1136.4 L786.7 1132.4 L1215.5 687.4 L1884.3 1349.9 L1590.1 1349.9 L1218.6 994.7 L865.4 1349.9Z" fill="currentColor"/></svg>
              <span class="wordmark__name">Elevate Studio</span>
            </a>
          </div>
          <div class="site-footer__big site-footer__slogan">
            <p>Hemsidor som ger förfrågningar – byggda i Uppsala, för företag i hela Sverige. <em>Hör av er så tar vi ett första möte.</em></p>
          </div>
          <div class="site-footer__small">
            <p class="site-footer__subheader">Få vårt nyhetsbrev</p>
            <form class="site-footer__newsletter js-form" action="{FORM_ENDPOINT}" method="post" data-subject="Ny prenumerant på nyhetsbrevet"{mail_attrs()}>
              <label><span class="sr-only">E-postadress</span><input type="email" name="email" placeholder="Din e-postadress" required></label>
              <input type="text" name="_honey" class="form-honey" tabindex="-1" autocomplete="new-password" aria-hidden="true" data-lpignore="true" data-1p-ignore>
              <button type="submit" aria-label="Prenumerera"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 8h13M9 3l5 5-5 5" fill="none" stroke="#fff" stroke-width="2"/></svg></button>
              <p class="form-status" role="status" hidden></p>
            </form>
            <p class="site-footer__fine">När du skickar formuläret godkänner du vår <a href="{p}integritet.html">integritetspolicy</a></p>
          </div>
          <div class="site-footer__big site-footer__cols">
            <div>
              <p class="site-footer__subheader">Tjänster</p>
              <ul class="site-footer__links">{services}</ul>
            </div>
            <div>
              <p class="site-footer__subheader">Elevate Studio</p>
              <ul class="site-footer__links">
                <li><a href="{p}kontakt.html"><svg viewBox="0 0 12 16" aria-hidden="true"><path d="M6 0a6 6 0 0 0-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 0 0-6-6zm0 8.5A2.5 2.5 0 1 1 6 3.5a2.5 2.5 0 0 1 0 5z" fill="#fff"/></svg> Uppsala</a></li>
                <li><a href="{p}om.html">Om oss</a></li>
                <li><a href="{p}priser.html">Priser</a></li>
                <li><a href="{p}byggda-hemsidor.html">Hemsidor vi byggt</a></li>
                <li><a href="{p}avtal.html">Exempel på webbavtal</a></li>
                <li><a href="{p}insikter/index.html">Senaste nytt</a></li>
                <li><a href="{p}plattformar/index.html">Tekniken vi använder</a></li>
                <li><a href="{p}webbyra-uppsala.html">Webbyrå i Uppsala</a></li>
                <li><a href="{p}webbyra-stockholm.html">Webbyrå i Stockholm</a></li>
                <li><a href="{p}hemsida-for-hantverkare.html">Hemsida för hantverkare</a></li>
                <li><a href="{p}billig-hemsida.html">Billig hemsida</a></li>
                <li><a href="{p}branscher.html">Hemsidor för alla branscher</a></li>
                <li><a href="{p}orter.html">Webbyrå – orter</a></li>
              </ul>
            </div>
            <div>
              <p class="site-footer__subheader">Kontakt</p>
              <ul class="site-footer__links">
                <li><a href="mailto:info@elevatestudio.nu">info@elevatestudio.nu</a></li>
                <li><a href="tel:+46760228361">Ring 076-022 83 61</a></li>
                <li><span class="site-footer__addr">Elevate Studio, Uppsala, Sverige</span></li>
                <li><a href="{p}testa.html">Testa din sajt</a></li>
              </ul>
              <p class="site-footer__subheader site-footer__subheader--follow">Följ oss</p>
              {social_links("social social--footer")}
            </div>
          </div>
          <ul class="site-footer__bottom">
            <li><a href="{p}integritet.html">Integritetspolicy</a></li>
            <li><a href="{p}cookies.html">Cookies</a></li>
            <li><a href="?lang=en" lang="en" data-lang="en" rel="nofollow">In English</a></li>
            <li><a class="site-footer__admin" href="{p}admin/index.html">Admin</a></li>
            <li class="site-footer__legal">Elevate Studio är ett varumärke som tillhör {PARENT_COMPANY}, org.nr {ORG_NR} · Developed by Isak Mattsson</li>
          </ul>
        </div>
      </div>
    </div>
  </footer>'''


def asset_version():
    """Short hash of all CSS/JS so browsers and CDN caches never mix old and new files."""
    digest = hashlib.sha1()
    for f in sorted((ROOT / "assets").glob("*/*.*")):
        if f.suffix in (".css", ".js"):
            digest.update(f.read_bytes())
    return digest.hexdigest()[:10]


def bundle_css():
    """style.css, home.css and pages.css joined into one minified file, so a page loads a single
    stylesheet. Addresses inside url(...) are kept as they are."""
    kept = []

    def keep(m):
        kept.append(m.group(0))
        return f"\x00{len(kept) - 1}\x00"
    parts = []
    for name in ("style.css", "home.css", "pages.css"):
        css = (ROOT / "assets/css" / name).read_text(encoding="utf-8")
        css = re.sub(r"url\((?:\"[^\"]*\"|'[^']*'|[^)]*)\)", keep, css)
        css = re.sub(r"/\*[\s\S]*?\*/", "", css)
        css = re.sub(r"\s+", " ", css)
        css = re.sub(r"\s*([{};:,>])\s*", r"\1", css).replace(";}", "}")
        parts.append(css.strip())
    out = "".join(parts)
    out = re.sub(r"\x00(\d+)\x00", lambda m: kept[int(m.group(1))], out)
    (ROOT / "assets/css/site.min.css").write_text(out, encoding="utf-8")


bundle_css()
VERSION = asset_version()
# The English texts get their own version, so a new translation is never served from cache.
I18N_VERSION = hashlib.sha1((ROOT / "tools/i18n_en.py").read_bytes()).hexdigest()[:10]


ORG_ID = f"{SITE_URL}/#organisation"
# Google Maps listing (the same place as the review link) and the area we serve around Uppsala
MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Elevate%20Studio%20Uppsala&query_place_id=ChIJcRLSybPJX0YRomaZlUJ2bzY"
UPPSALA_AREA = ["Uppsala", "Knivsta", "Enköping", "Sigtuna", "Märsta", "Östhammar", "Tierp", "Heby", "Älvkarleby", "Stockholm"]


def organisation_ld():
    """Who we are, for Google and AI assistants. Only facts that are stated elsewhere on the site."""
    return {
        "@type": "ProfessionalService",
        "@id": ORG_ID,
        "name": "Elevate Studio",
        "url": f"{SITE_URL}/",
        "logo": f"{SITE_URL}/assets/img/brand/favicon-512.png",
        "image": f"{SITE_URL}/assets/img/brand/og.jpg",
        "description": "Webbyrå i Uppsala som bygger snabba, mobilanpassade hemsidor med bokning, offertflöde, AI-chatt, SEO och AI-optimering till fast pris – för företag i alla storlekar i hela Sverige.",
        "email": "info@elevatestudio.nu",
        "telephone": TEAM[0][2],
        "address": {"@type": "PostalAddress", "addressLocality": "Uppsala", "addressRegion": "Uppsala län", "addressCountry": "SE"},
        "areaServed": [{"@type": "City", "name": c} for c in UPPSALA_AREA] + [{"@type": "Country", "name": "Sverige"}],
        "hasMap": MAPS_URL,
        "sameAs": [MAPS_URL] + list(SOCIAL.values()),
        "knowsAbout": ["Webbdesign", "Hemsidor för företag", "Sökmotoroptimering (SEO)", "AI-optimering", "Bokningssystem", "Offertsystem", "AI-chatt", "Webbutveckling"],
        "slogan": "Hemsidor som ger förfrågningar",
        "priceRange": "3 000–6 000 kr",
        "knowsLanguage": ["sv", "en"],
        "employee": [{"@type": "Person", "name": n, "jobTitle": r, "telephone": t, "email": e} for n, r, t, e in TEAM],
        "parentOrganization": {"@type": "Organization", "name": PARENT_COMPANY, "taxID": ORG_NR, "identifier": ORG_NR},
        "makesOffer": [{"@type": "Offer", "itemOffered": {"@type": "Service", "name": x["name"], "url": f"{SITE_URL}/tjanster/{x['slug']}.html"}} for x in SERVICES],
    }


def auto_description(main):
    """First lead paragraph of the page, trimmed to what Google shows."""
    m = re.search(r'class="(?:page-hero__lead|hero__text)">(.*?)</p>', main, re.S) or re.search(r"<p[^>]*>(.*?)</p>", main, re.S)
    text = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else ""
    text = re.sub(r"\s+", " ", text)
    if len(text) > 158:
        text = text[:155].rsplit(" ", 1)[0] + " …"
    return text


HERO_PRELOAD = ('  <link rel="preload" as="image" media="(min-width: 641px)" href="assets/img/home/hero-800.webp" fetchpriority="high" imagesizes="100vw" '
                'imagesrcset="assets/img/home/hero-800.webp 800w, assets/img/home/hero-1200.webp 1200w, assets/img/home/hero-1400.webp 1400w, '
                'assets/img/home/hero-1600.webp 1600w, assets/img/home/hero-1920.webp 1920w, assets/img/home/hero.webp 2400w">\n')


def document(p, title, main, body_class, crumbs=None, current=None, extra_css=(), extra_js=(), description=None, jsonld=(), og_type="website", robots="index, follow", lang="sv"):
    css = ["site.min.css", *extra_css]
    links = "\n  ".join(f'<link rel="stylesheet" href="{p}assets/css/{c}?v={VERSION}">' for c in css)
    scripts = "\n  ".join(f'<script src="{p}assets/js/{j}?v={VERSION}" defer></script>' for j in ("main.js", "track.js", *extra_js))
    scripts += f'\n  <script src="{p}assets/js/chat.js?v={VERSION}" data-prefix="{p}" data-endpoint="{FORM_ENDPOINT}" defer></script>'
    desc = esc(description or auto_description(main))
    # Keep titles within what Google shows; long titles drop the brand suffix
    full_title = esc(title if "Elevate Studio" in title or len(title) > 43 else f"{title} | Elevate Studio")
    graph = [organisation_ld(), {"@type": "WebSite", "@id": f"{SITE_URL}/#webbplats", "url": f"{SITE_URL}/", "name": "Elevate Studio", "inLanguage": "sv-SE", "publisher": {"@id": ORG_ID}}]
    if crumbs:
        trail = [("Start", "index.html")] + [(label, href or "__SELF__") for label, href in crumbs]
        graph.append({"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": i, "name": label, "item": f"{SITE_URL}/{href}" if href != "__SELF__" else "__CANONICAL__"}
            for i, (label, href) in enumerate(trail, 1)]})
    graph.extend(jsonld)
    # The addresses are escaped so the entity used in the page text does not reach the JSON
    ld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False).replace("</", "<\\/")
    ld = ld.replace("@elevatestudio.nu", "\\u0040elevatestudio.nu").replace("@gmail.com", "\\u0040gmail.com")
    return f'''<!DOCTYPE html>
<html lang="{lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="{robots}">
  <script src="{p}assets/js/i18n.js?v={VERSION}" data-prefix="{p}" data-v="{I18N_VERSION}"></script>
  <title>{full_title}</title>
  <meta name="description" content="{desc}">
  <link rel="canonical" href="__CANONICAL__">
  <link rel="alternate" hreflang="sv" href="__CANONICAL__">
  <link rel="alternate" hreflang="en" href="__CANONICAL__?lang=en">
  <link rel="alternate" hreflang="x-default" href="__CANONICAL__">
  <meta property="og:type" content="{og_type}">
  <meta property="og:site_name" content="Elevate Studio">
  <meta property="og:locale" content="sv_SE">
  <meta property="og:title" content="{full_title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="__CANONICAL__">
  <meta property="og:image" content="{SITE_URL}/assets/img/brand/og.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#1d3b2a">
  <meta name="geo.region" content="SE-C">
  <meta name="geo.placename" content="Uppsala">
  <link rel="alternate" type="application/rss+xml" title="Elevate Studio – Senaste nytt" href="{SITE_URL}/rss.xml">
  <link rel="icon" href="{p}assets/img/brand/favicon-32.png" type="image/png" sizes="32x32">
  <link rel="icon" href="{p}assets/img/brand/favicon-192.png" type="image/png" sizes="192x192">
  <link rel="apple-touch-icon" href="{p}assets/img/brand/apple-touch-icon.png">
{HERO_PRELOAD if body_class == "home" else ""}{"" if body_class == "home" else '  <link rel="preload" href="{p}assets/fonts/HankenGrotesk-latin.woff2" as="font" type="font/woff2" crossorigin>\n'}{"" if body_class == "home" else '  <link rel="preload" href="{p}assets/fonts/Fraunces-latin.woff2" as="font" type="font/woff2" crossorigin>\n'}  {links}
  <script type="application/ld+json">{ld}</script>
</head>
<body class="{body_class}">

  {header(p, crumbs, current)}

  {main}

  {footer(p)}

  {scripts}
</body>
</html>
'''


# ---------------------------------------------------------------- shared blocks

def page_hero(title, lead, eyebrow=""):
    eb = f'<p class="page-hero__eyebrow">{eyebrow}</p>' if eyebrow else ""
    return f'''<section class="page-hero">
      <div class="container">
        {eb}<h1 class="page-hero__title">{title}</h1>
        <p class="page-hero__lead">{esc(lead)}</p>
      </div>
    </section>'''


def cta(p, title="Ska vi bygga något tillsammans?", text="Berätta kort vad ni funderar på, så hör vi av oss så fort vi kan."):
    return f'''<section class="cta-band">
      <div class="container cta-band__inner">
        <div>
          <p class="cta-band__title">{title}</p>
          <p>{text}</p>
        </div>
        <p class="cta-band__btns"><a href="{p}boka.html" class="btn btn--light"><span>Boka ett möte</span></a><a href="{p}kontakt.html" class="btn btn--ghost-light"><span>Kontakta oss</span></a></p>
      </div>
    </section>'''


def case_card(p, c, big):
    tags = "".join(f'<li><a href="{p}projekt/index.html">{esc(t)}</a></li>' for t in c["tags"])
    return f'''<li class="case{' case--big' if big else ''}">
            <a class="case__image" href="{p}projekt/{c["slug"]}.html">
              <img src="{p}assets/img/{c["image"]}" alt="{esc(c["name"])} – exempel på hemsida" width="{c["w"]}" height="{c["h"]}" loading="lazy">
              <span class="case__overlay">
                <span class="case__overlay-text">{esc(c["lead"])}</span>
                <span class="case__overlay-link"><span class="arrow-link">Läs mer</span></span>
              </span>
            </a>
            <h3 class="case__title"><a href="{p}projekt/{c["slug"]}.html">{esc(c["name"])}</a></h3>
            <ul class="case__tags">{tags}</ul>
          </li>'''


def post_card(p, a, tag="h3"):
    terms = "".join(f"<span>{esc(t)}</span>" for t in a["terms"])
    lazy = "" if tag == "h2" else ' loading="lazy"'
    return f'''<article class="post-card">
            <img src="{p}assets/img/{a["image"]}" alt="{esc(a["title"])}" width="420" height="297"{lazy}>
            <div class="post-card__content">
              <p class="post-card__terms">{terms}</p>
              <{tag} class="post-card__title"><a class="cover-link" href="{p}insikter/{a["slug"]}.html">{esc(a["title"])}</a></{tag}>
              <p class="post-card__time">{a["date"]}</p>
            </div>
          </article>'''


def platform_card(p, x, tag="h3"):
    return f'''<a class="platform-card" href="{p}plattformar/{x["slug"]}.html">
              <img src="{p}assets/img/home/{x["icon"]}" alt="{esc(x["name"])}" width="60" height="60">
              <{tag} class="platform-card__name">{esc(x["name"])}</{tag}><span class="arrow-link">Läs mer</span>
            </a>'''


def service_card(p, s):
    return f'''<article class="info-card info-card--link">
          <h2 class="info-card__title"><a class="cover-link" href="{p}tjanster/{s["slug"]}.html">{esc(s["name"])}</a></h2>
          <p>{esc(s["lead"])}</p>
          <span class="arrow-link">Läs mer</span>
        </article>'''


def featured_posts(p, articles):
    """Homepage insights: the newest article large, the next two stacked beside it."""
    def terms(a):
        return "".join(f"<span>{esc(x)}</span>" for x in a["terms"])
    big, *rest = articles  # the newest large, every other one in a row you scroll sideways
    side = "".join(f'''<article class="insights__small">
            <img src="{p}assets/img/{a["image"]}" alt="{esc(a["title"])}" width="420" height="297" loading="lazy">
            <div>
              <p class="post-card__terms">{terms(a)}</p>
              <h3 class="insights__small-title"><a class="cover-link" href="{p}insikter/{a["slug"]}.html">{esc(a["title"])}</a></h3>
              <p class="post-card__time">{a["date"]}</p>
            </div>
          </article>''' for a in rest)
    return f'''<div class="insights__grid">
          <article class="insights__big">
            <img src="{p}assets/img/{big["image"]}" alt="{esc(big["title"])}" width="840" height="594" loading="lazy">
            <div>
              <p class="post-card__terms">{terms(big)}</p>
              <h3 class="insights__big-title"><a class="cover-link" href="{p}insikter/{big["slug"]}.html">{esc(big["title"])}</a></h3>
              <p class="post-card__time">{big["date"]}</p>
            </div>
          </article>
          <div class="insights__rail"><div class="insights__side" id="insights-side">{side}</div></div>
        </div>'''


def mail_attrs():
    """Where forms save leads and send mail from info@ (see MAIL_LIVE in content.py)."""
    attrs = f' data-db="{SUPABASE_URL}" data-key="{SUPABASE_PUBLISHABLE_KEY}"'
    return attrs + (f' data-mail="{MAIL_FUNCTION}"' if MAIL_LIVE else "")


def contact_form(p):
    return f'''<form class="standout__form js-form" id="formular" action="{FORM_ENDPOINT}" method="post" data-subject="Ny förfrågan från hemsidan" data-lead{mail_attrs()}>
          <p class="standout__header">Hej! Jag vill gärna bli kontaktad.</p>
          <div class="standout__fields">
            <label><span class="sr-only">Namn</span><input type="text" name="namn" placeholder="Namn" autocomplete="name" required></label>
            <label><span class="sr-only">E-post</span><input type="email" name="email" placeholder="E-post" autocomplete="email" required></label>
            <label><span class="sr-only">Telefon</span><input type="tel" name="telefon" placeholder="Telefon" autocomplete="tel"></label>
            <label><span class="sr-only">Företag</span><input type="text" name="foretag" placeholder="Företag" autocomplete="organization"></label>
            <label class="standout__wide standout__select"><span class="sr-only">Tjänst</span><select name="tjanst">
              <option value="">Vad är ni intresserade av?</option>
              {"".join(f'<option>{esc(x["name"])}</option>' for x in SERVICES)}
              <option>Vet inte än – vill ha råd</option>
            </select></label>
            <label class="standout__wide"><span class="sr-only">Meddelande</span><textarea name="meddelande" placeholder="Meddelande" rows="1"></textarea></label>
          </div>
          <input type="text" name="_honey" class="form-honey" tabindex="-1" autocomplete="new-password" aria-hidden="true" data-lpignore="true" data-1p-ignore>
          <p class="standout__consent">När du skickar formuläret godkänner du vår <a href="{p}integritet.html">integritetspolicy</a></p>
          <button type="submit" class="btn btn--primary"><span>Skicka</span></button>
          <p class="form-status standout__status" role="status" hidden></p>
        </form>'''


# ---------------------------------------------------------------- pages

def page_url(path):
    if path == "index.html":
        return f"{SITE_URL}/"
    if path.endswith("/index.html"):
        return f"{SITE_URL}/{path[:-len('index.html')]}"
    return f"{SITE_URL}/{path.removesuffix('.html')}"


# The host serves pages without ".html" (/priser, /tjanster/), so every link and address uses
# that form. Linking to /priser.html would cost a redirect and blur which address is the real one.
_LOCAL_HREF = re.compile(r'href="(?![a-z]+:|//|#)([^"#?]*?)(index)?\.html([#?][^"]*)?"')
_SITE_HTML = re.compile(re.escape(SITE_URL) + r'(/[^\s"<>)\]]*?)(index)?\.html')


def pretty(text):
    text = _LOCAL_HREF.sub(lambda m: f'href="{(m.group(1) or "./")}{m.group(3) or ""}"', text)
    return _SITE_HTML.sub(lambda m: SITE_URL + m.group(1), text)


_EMAIL = re.compile(r"@(elevatestudio\.nu|gmail\.com)")
_IMG_SRC = re.compile(r'src="([^"]*?)\.jpg"')


def finish(text):
    """Last touches on every page: e-mail addresses written with a character entity (harder for
    address scrapers, the same for readers) and photos served as WebP where tools/images.py has
    made a copy."""
    text = _EMAIL.sub(r"&#64;\1", text)

    def webp(m):
        src = m.group(1)
        i = src.find("assets/img/")
        if i >= 0 and (ROOT / (src[i:] + ".webp")).exists():
            return f'src="{src}.webp"'
        return m.group(0)
    text = _IMG_TAG.sub(responsive, _IMG_SRC.sub(webp, text))
    # The first picture in the content is usually the largest thing on screen: load it at once
    i = text.find("<main")
    m = _LAZY_IMG.search(text, i) if i >= 0 else None
    if m and 'fetchpriority=' not in text[i:m.start()]:
        text = text[:m.start()] + m.group(0).replace(' loading="lazy"', ' fetchpriority="high"') + text[m.end():]
    return text


_LAZY_IMG = re.compile(r'<img\b[^>]*\sloading="lazy"[^>]*>')


_IMG_TAG = re.compile(r'<img\b[^>]*>')
_SIZES = [  # how wide the picture is shown, by file name, so the browser can pick the right copy
    ("device-phone", "(max-width: 768px) 15vw, 160px"),
    ("site-", "(max-width: 768px) 80vw, (max-width: 1100px) 40vw, 360px"),
    ("alvhemstad-phone", "(max-width: 768px) 22vw, 160px"),
    ("alvhemstad-desktop", "(max-width: 768px) 50vw, (max-width: 1334px) 60vw, 810px"),
    ("alvhem-old", "(max-width: 768px) 80vw, (max-width: 1334px) 60vw, 810px"),
    ("device-desktop", "(max-width: 768px) 48vw, 640px"),
    ("about-1", "(max-width: 768px) calc(100vw - 30px), 60vw"),
    ("about-3", "(max-width: 768px) calc(100vw - 30px), 30vw"),
    ("svc-", "(max-width: 768px) 62vw, (max-width: 1334px) 32vw, 420px"),
    ("process-", "(max-width: 992px) calc(100vw - 30px), 45vw"),
    ("case-", "(max-width: 768px) 55vw, (max-width: 1334px) 30vw, 400px"),
]


def responsive(m):
    """Adds srcset and sizes to a WebP picture that tools/images.py has made smaller copies of."""
    tag = m.group(0)
    if "srcset=" in tag:
        return tag
    src = re.search(r'src="([^"]*?)\.webp"', tag)
    if not src:
        return tag
    base = src.group(1)
    i = base.find("assets/img/")
    if i < 0:
        return tag
    copies = [w for w in (160, 240, 320, 400, 480, 640, 720, 800, 960, 1200, 1400, 1600) if (ROOT / f"{base[i:]}-{w}.webp").exists()]
    if not copies:
        return tag
    try:
        from PIL import Image
        full = Image.open(ROOT / f"{base[i:]}.webp").width
    except Exception:
        return tag
    srcset = ", ".join(f"{base}-{w}.webp {w}w" for w in copies) + f", {base}.webp {full}w"
    name = base.rsplit("/", 1)[-1]
    if "article__image" in tag:
        sizes = "(max-width: 900px) calc(100vw - 30px), 860px"
    elif 'width="840"' in tag:
        sizes = "(max-width: 768px) calc(100vw - 30px), 55vw"
    else:
        sizes = next((v for k, v in _SIZES if name.startswith(k)), "(max-width: 768px) calc(100vw - 30px), (max-width: 1200px) 45vw, 420px")
    return tag.replace(src.group(0), f'{src.group(0)} srcset="{srcset}" sizes="{sizes}"', 1)


def write(path, text):
    out = ROOT / path
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(finish(pretty(text.replace("__CANONICAL__", page_url(path)))), encoding="utf-8")
    return path


def build_services():
    p = "../"
    cards = "".join(service_card(p, s) for s in SERVICES)
    steps = [("Vi lär känna företaget", "Ett kort möte om era tjänster, era kunder och vilka affärer ni vill ha fler av."),
             ("Vi bygger hemsidan", "Mobilanpassad design med tydliga tjänstesidor. Ett första utkast ser ni efter ungefär en dag."),
             ("Vi kopplar på smarta funktioner", "Offertflöde, bokning, AI-chatt och notiser testas före lansering."),
             ("Hemsidan börjar ge förfrågningar", "Sidan lanseras och indexeras av Google.")]
    steps_html = "".join(f'<li><span class="step-list__no">{i}</span><p class="step-list__title">{t}</p><p>{d}</p></li>' for i, (t, d) in enumerate(steps, 1))
    main = f'''<main>
    {page_hero("Vad vi <em>gör</em>", "Hemsidor som ger förfrågningar – och de smarta funktionerna runt omkring. Allt från samma lilla team i Uppsala.")}
    <section class="section container">
      <div class="card-grid">{cards}</div>
    </section>
    <section class="section section--cream" id="process">
      <div class="container">
        <h2 class="block__header">Så <span>jobbar vi</span></h2>
        <ol class="step-list">{steps_html}</ol>
      </div>
    </section>
    {cta(p)}
  </main>'''
    yield write("tjanster/index.html", document(p, "Tjänster – hemsidor, bokning, offert, AI-chatt och SEO", main, "subpage", [("Vad vi gör", "tjanster/index.html")], "tjanster",
                description="Elevate Studio bygger hemsidor för företag i alla storlekar och kopplar på bokning, offertsystem, AI-chatt, SEO och support. Fast pris, webbyrå i Uppsala."))

    for s in SERVICES:
        includes = "".join(f'<div class="info-card"><h3 class="info-card__title">{esc(t)}</h3><p>{esc(d)}</p></div>' for t, d in s["includes"])
        faq_html, faq_ld = faq_block(s["faq"], "sfaq")
        others = "".join(f'<li><a href="{o["slug"]}.html" class="arrow-link">{esc(o["name"])}</a></li>' for o in SERVICES if o is not s)
        main = f'''<main>
    {page_hero(s["h1"], s["lead"], "Tjänst")}
    <section class="section container columns-2">
      <div>
        <h2 class="h2">Det här gör vi</h2>
        <p class="preamble">{esc(s["intro"])}</p>
        <a href="../kontakt.html" class="btn btn--primary"><span>Boka ett samtal</span></a>
      </div>
      <img class="rounded" src="../assets/img/{s["image"]}" alt="{esc(s["alt"])}" width="632" height="474" loading="lazy">
    </section>
    <section class="section section--cream">
      <div class="container">
        <h2 class="block__header">Det här <span>ingår</span></h2>
        <div class="card-grid card-grid--2">{includes}</div>
      </div>
    </section>
    <section class="section container">
      <div class="plans-note">
        <div>
          <h2 class="plans-note__title">Fast pris</h2>
          <p>Ni får ett fast pris i en offert innan vi börjar. Se vad som ingår i våra paket.</p>
        </div>
        <div class="plans-note__links"><a class="arrow-link" href="../priser.html">Se priser</a></div>
      </div>
    </section>
    <section class="section container">
      <h2 class="block__header">Vanliga <span>frågor</span></h2>
      {faq_html}
    </section>
    <section class="section container">
      <h2 class="h3 section__title">Fler tjänster</h2>
      <ul class="link-list">{others}</ul>
    </section>
    {cta(p)}
  </main>'''
        service = {"@type": "Service", "name": s["name"], "description": s["lead"], "provider": {"@id": ORG_ID},
                   "areaServed": {"@type": "Country", "name": "Sverige"}, "url": "__CANONICAL__"}
        yield write(f'tjanster/{s["slug"]}.html', document(p, s["seo_title"], main, "subpage",
                    [("Vad vi gör", "tjanster/index.html"), (s["name"], "")], "tjanster", jsonld=[service, faq_ld], description=s["description"]))


LIRK_URL = "https://elevatestudio018.github.io/lirk/"


def laptop(src, alt=""):
    return f'<div class="laptop"><div class="laptop__scr"><img src="{src}" alt="{esc(alt)}" loading="lazy"></div><div class="laptop__base"></div></div>'


def screen(src, alt, video, overlay):
    """A screenshot that becomes a playing film with the page's text laid over it (film and
    overlay sit on top of the screenshot, which stays as poster and for reduced motion)."""
    poster = src.rsplit(".", 1)[0] + ".webp"
    return (f'<div class="screen"><img src="{src}" alt="{esc(alt)}" loading="lazy">'
            f'<video class="screen__video" autoplay muted loop playsinline preload="metadata" poster="{poster}" aria-hidden="true" tabindex="-1"><source src="{video}" type="video/mp4"></video>'
            f'<span class="screen__overlay" style="background-image:url({overlay})"></span></div>')


def laptop_video(src, alt, video, overlay):
    """A laptop whose screen plays the site's film under the page's text."""
    return re.sub(r'<img\b[^>]*>', lambda m: screen(src, alt, video, overlay), laptop(src, alt), count=1)


def compare(p, after, after_alt, label_after="Efter", before=None, before_alt="", video=None, overlay=None):
    """Draggable before/after: a plain wireframe of a typical old site (or a picture of the real
    old one) against the new one, which can play its film."""
    if before:
        before_html = f'<img src="{before}" alt="{esc(before_alt)}" loading="lazy">'
    else:
        before_html = '<div class="compare__old"><i class="o1"></i><i class="o2"></i><i class="o3"></i><i class="o3 o3--s"></i><i class="o4"></i></div>'
    after_html = screen(after, after_alt, video, overlay) if video else f'<img src="{after}" alt="{esc(after_alt)}" loading="lazy">'
    return f'''<div class="compare" data-compare style="--pos:50%">
        <div class="compare__before" aria-hidden="true">{before_html}<span class="compare__lb">Före</span></div>
        <div class="compare__after">{after_html}<span class="compare__lb compare__lb--after">{label_after}</span></div>
        <div class="compare__handle" aria-hidden="true"><span><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg></span></div>
        <input class="compare__range" type="range" min="0" max="100" value="50" aria-label="Dra för att jämföra före och efter">
      </div>'''


def build_cases():
    p = "../"
    alv = next((c for c in CASES if c["slug"] == "alvhem-stad"), None)
    cards = "".join(f'''
        <article class="pcard">
          {laptop(p + "assets/img/" + c["image"], c["name"] + (" på en dator" if c.get("site") else " – exempel på hemsida på en dator"))}
          <div class="pcard__body">
            <span class="ex-tag">{"Kund" if c.get("site") else "Exempel"}</span>
            <h3><a class="cover-link" href="{c["slug"]}.html">{esc(c["name"])}</a></h3>
            <p>{esc(c["lead"])}</p>
            <ul class="pcard__tags">{"".join(f"<li>{esc(t)}</li>" for t in c["tags"])}</ul>
            <span class="btn btn--primary pcard__btn"><span>Läs mer</span></span>
          </div>
        </article>''' for c in CASES)
    main = f'''<main>
    <section class="pj-hero">
      <div class="pj-hero__mark">{MARK_SVG}</div>
      <div class="container pj-hero__row">
        <div>
          <span class="ex-tag ex-tag--demo">Så kan det se ut</span>
          <h1 class="pj-hero__title">Hemsidor som känns rätt <em>på alla skärmar</em></h1>
          <p class="pj-hero__lead">Vi bygger mobilen först. Lindvik Bygg är en hemsida vi har byggt för att visa hur det kan se ut – på dator och mobil. Längre ner finns exempel på hur vi arbetar.</p>
          <a class="btn btn--light" href="{LIRK_URL}" target="_blank" rel="noopener"><span>Klicka runt på Lindvik Bygg</span></a>
        </div>
        <div class="pj-hero__devs">
          {laptop(p + "assets/img/home/device-desktop.jpg", "Lindvik Bygg på en dator")}
          <div class="phone"><img src="{p}assets/img/home/device-phone.jpg" alt="Lindvik Bygg på en mobil" loading="lazy"></div>
        </div>
          <p class="devs-cap"><b>Dator och mobil</b> – samma sajt, anpassad för varje skärm</p>
      </div>
    </section>
    <section class="section container">
      <div class="pj-compare">
        <div>
          <span class="ex-tag">Kund</span>
          <h2 class="block__header">Alvhem Städ: från <span>före</span> till <span>efter</span></h2>
          <p>Dra i reglaget och jämför Alvhem Städs gamla hemsida med den nya vi byggt. <a href="{p}projekt/alvhem-stad.html">Läs om projektet</a>.</p>
        </div>
        {compare(p, p + "assets/img/" + alv["image"], "Alvhem Städs nya hemsida", before=p + "assets/img/" + alv["old_image"], before_alt="Alvhem Städs gamla hemsida", video=p + "assets/" + alv["video"], overlay=p + "assets/img/" + alv["overlay"]) if alv else compare(p, p + "assets/img/home/device-desktop.jpg", "Lindvik Bygg")}
      </div>
    </section>
    <section class="section">
      <div class="container">
        <h2 class="block__header">Hemsidor vi <span>byggt</span></h2>
        <p class="preamble">Riktiga kunder, riktiga sajter. Klicka på ett kort så öppnas hemsidan här på sidan.</p>
        {sites_section(p, SITES)}
      </div>
    </section>
    <section class="section section--cream">
      <div class="container">
        <h2 class="block__header">Exempel på <span>projekt</span></h2>
        <div class="pgrid">{cards}
        </div>
        <p class="fiction-note">Alvhem Städ är kund hos oss. Övriga exempel är påhittade och visar hur vi arbetar.</p>
      </div>
    </section>
    {cta(p)}
  </main>'''
    yield write("projekt/index.html", document(p, "Projekt och exempel på hemsidor", main, "subpage", [("Projekt", "")], "projekt",
                description="Se exempel på hemsidor från Elevate Studio – Lindvik Bygg på dator och mobil, före och efter, och exempel på hur vi arbetar."))

    for i, c in enumerate(CASES):
        nxt = CASES[(i + 1) % len(CASES)]
        tags = "".join(f"<li>{esc(t)}</li>" for t in c["tags"])
        if c.get("site"):
            img, alt = p + "assets/img/" + c["image"], c["name"] + " på en dator"
            video = (p + "assets/" + c["video"]) if c.get("video") else None
            overlay = (p + "assets/img/" + c["overlay"]) if c.get("video") else None
            before = f'''
    <section class="section container">
      <div class="pj-compare">
        <div>
          <h2 class="block__header">Från <span>före</span> till <span>efter</span></h2>
          <p>Dra i reglaget och jämför {esc(c["name"])}s gamla hemsida med den nya.</p>
        </div>
        {compare(p, img, c["name"] + "s nya hemsida", before=p + "assets/img/" + c["old_image"], before_alt=c["name"] + "s gamla hemsida", video=video, overlay=overlay)}
      </div>
    </section>''' if c.get("old_image") else ""
            body = f'''<section class="section container">
      <ul class="tag-row">{tags}</ul>
      <div class="case-devs">
        {laptop_video(img, alt, video, overlay) if video else laptop(img, alt)}
        <div class="phone"><img src="{p}assets/img/{c["phone_image"]}" alt="{esc(c["name"])} på en mobil" loading="lazy"></div>
      </div>
      <p class="devs-cap"><b>Dator och mobil</b> – samma sajt, anpassad för varje skärm</p>
      <p class="case-visit"><a class="btn btn--primary" href="{c["site"]}" target="_blank" rel="noopener"><span>Besök {esc(c["site_label"])}</span></a></p>
    </section>{before}
    <section class="section container">
      <div class="card-grid card-grid--2">
        <div class="info-card"><h2 class="info-card__title">Om kunden</h2><p>{esc(c["about"])}</p></div>
        <div class="info-card info-card--accent"><h2 class="info-card__title">Det här finns på hemsidan</h2><ul class="check-list">{"".join(f"<li>{esc(f)}</li>" for f in c["features"])}</ul></div>
      </div>
    </section>'''
        else:
            body = f'''<section class="section container">
      <ul class="tag-row">{tags}</ul>
      {compare(p, "../assets/img/" + c["image"], c["name"])}
      <p class="fiction-note">Påhittat exempelprojekt som visar hur vi arbetar.</p>
    </section>
    <section class="section container">
      <div class="card-grid">
        <div class="info-card"><h2 class="info-card__title">Utmaningen</h2><p>{esc(c["challenge"])}</p></div>
        <div class="info-card"><h2 class="info-card__title">Lösningen</h2><p>{esc(c["solution"])}</p></div>
        <div class="info-card info-card--accent"><h2 class="info-card__title">Resultatet</h2><p>{esc(c["result"])}</p></div>
      </div>
    </section>'''
        main = f'''<main{" class=\"look-ref\"" if c.get("site") else ""}>
    {page_hero(esc(c["name"]), c["lead"], "Kund" if c.get("site") else "Projekt")}
    {body}
    <section class="section container">
      <a class="next-card" href="{nxt["slug"]}.html">
        <span class="next-card__label">Nästa projekt</span>
        <span class="next-card__title">{esc(nxt["name"])}</span>
        <span class="arrow-link">Läs mer</span>
      </a>
    </section>
    {cta(p)}
  </main>'''
        yield write(f'projekt/{c["slug"]}.html', document(p, f'{c["name"]} – {"kund hos Elevate Studio" if c.get("site") else "exempel på hemsida"}', main, "subpage",
                    [("Projekt", "projekt/index.html"), (c["name"], "")], "projekt"))


def rich(value):
    """Escapes the text but keeps plain links written as <a href="…">text</a>."""
    parts = re.split(r'(<a href="[^"]+">|</a>)', value)
    # links are written from the site's root; article pages sit one folder down
    fix = lambda x: re.sub(r'href="(?!https?:|/|\.\./|#)', 'href="../', x)
    return "".join(fix(x) if re.fullmatch(r'<a href="[^"]+">|</a>', x) else esc(x) for x in parts)


def render_body(blocks):
    out = []
    for kind, value in blocks:
        if kind == "p":
            out.append(f"<p>{rich(value)}</p>")
        elif kind == "h2":
            out.append(f"<h2>{esc(value)}</h2>")
        elif kind == "ul":
            out.append("<ul>" + "".join(f"<li>{rich(v)}</li>" for v in value) + "</ul>")
    return "\n        ".join(out)


def build_articles():
    p = "../"
    cards = "".join(post_card(p, a, "h2") for a in ARTICLES)
    main = f'''<main>
    {page_hero("Senaste <em>nytt</em>", "Guider och tips om hemsidor, synlighet på Google och i AI-sök, bokning, offertflöden och hur ni får fler förfrågningar.")}
    <section class="section section--cream">
      <div class="container"><div class="posts__grid">{cards}</div></div>
    </section>
    {cta(p)}
  </main>'''
    yield write("insikter/index.html", document(p, "Senaste nytt om hemsidor, SEO och AI", main, "subpage", [("Senaste nytt", "")], "insikter"))

    for a in ARTICLES:
        more = "".join(post_card(p, o) for o in [o for o in ARTICLES if o is not a][:3])
        terms = "".join(f"<span>{esc(t)}</span>" for t in a["terms"])
        main = f'''<main>
    <section class="page-hero">
      <div class="container">
        <p class="post-card__terms page-hero__terms">{terms}</p>
        <h1 class="page-hero__title page-hero__title--article">{esc(a["title"])}</h1>
        <p class="post-card__time">{a["date"]}</p>
      </div>
    </section>
    <section class="section container article">
      <img class="rounded article__image" src="../assets/img/{a["image"]}" alt="{esc(a["title"])}" width="840" height="594">
      <div class="prose">
        {render_body(a["body"])}
      </div>
    </section>
    <section class="section section--cream">
      <div class="container">
        <div class="block__header-row">
          <h2 class="block__header">Läs <span>mer</span></h2>
          <a href="index.html" class="arrow-link">Alla artiklar</a>
        </div>
        <div class="posts__grid posts__grid--two">{more}</div>
      </div>
    </section>
    {cta(p)}
  </main>'''
        posting = {"@type": "BlogPosting", "headline": a["title"], "datePublished": iso_date(a["date"]), "inLanguage": "sv-SE",
                   "image": f"{SITE_URL}/assets/img/{a['image']}", "author": {"@id": ORG_ID}, "publisher": {"@id": ORG_ID},
                   "mainEntityOfPage": "__CANONICAL__", "keywords": ", ".join(a["terms"])}
        yield write(f'insikter/{a["slug"]}.html', document(p, a["title"], main, "subpage",
                    [("Senaste nytt", "insikter/index.html"), (a["title"], "")], "insikter", jsonld=[posting], og_type="article",
                    description=auto_description(f'<p>{esc(next(v for k, v in a["body"] if k == "p"))}</p>')))


def build_platforms():
    p = "../"
    cards = "".join(platform_card(p, x, "h2") for x in PLATFORMS)
    main = f'''<main>
    {page_hero("Våra <em>plattformar</em>", "Verktygen och teknikerna vi bygger med – samma verktyg som användes för att bygga just den här sajten.")}
    <section class="section container">
      <div class="platforms__cards platforms__cards--page">{cards}</div>
    </section>
    <section class="section section--cream">
      <div class="container columns-2">
        <h2 class="h3">Vi väljer tekniken efter uppdraget, inte tvärtom.</h2>
        <p>Ibland är ett ramverk rätt, ibland räcker ren HTML, CSS och lite JavaScript. Det viktiga är att lösningen är snabb, tillgänglig och lätt att förvalta för dem som ska ta hand om den efter lansering.</p>
      </div>
    </section>
    {cta(p)}
  </main>'''
    yield write("plattformar/index.html", document(p, "Tekniken vi bygger hemsidor med", main, "subpage", [("Plattformar", "")], None))

    for x in PLATFORMS:
        uses = "".join(f'<div class="info-card"><h3 class="info-card__title">{esc(t)}</h3><p>{esc(d)}</p></div>' for t, d in x["uses"])
        here = "".join(f"<li>{esc(h)}</li>" for h in x["here"])
        others = "".join(platform_card(p, o, "p") for o in PLATFORMS if o is not x)
        main = f'''<main>
    <section class="page-hero page-hero--icon">
      <div class="container">
        <img class="page-hero__icon" src="../assets/img/home/{x["icon"]}" alt="{esc(x["name"])}" width="96" height="96">
        <p class="page-hero__eyebrow">Plattform</p>
        <h1 class="page-hero__title">{esc(x["name"])}</h1>
        <p class="page-hero__lead">{esc(x["lead"])}</p>
      </div>
    </section>
    <section class="section container">
      <p class="preamble prose">{esc(x["intro"])}</p>
    </section>
    <section class="section container">
      <h2 class="block__header">Det här bygger vi <span>med {esc(x["name"])}</span></h2>
      <div class="card-grid">{uses}</div>
    </section>
    <section class="section section--accent">
      <div class="container">
        <h2 class="block__header">Så används det <span>på den här sajten</span></h2>
        <ul class="check-list">{here}</ul>
      </div>
    </section>
    <section class="section container">
      <h2 class="h3 section__title">Fler plattformar</h2>
      <div class="platforms__cards platforms__cards--page">{others}</div>
    </section>
    {cta(p)}
  </main>'''
        yield write(f'plattformar/{x["slug"]}.html', document(p, f'{x["name"]} – så använder vi det i hemsidor | Elevate Studio', main, "subpage",
                    [("Plattformar", "plattformar/index.html"), (x["name"], "")], None))


def sites_section(p, sites):
    """The sites we have built: laptop and phone on a tile, the logo, a text, and the in-page preview."""
    cards = "".join(f'''<article class="site-card">
          <a class="site-card__face" href="{s["url"]}" target="_blank" rel="noopener" data-site="{s["url"]}" data-name="{esc(s["name"])}" aria-label="Förhandsvisa {esc(s["name"])}">
            <span class="site-card__devs">{laptop(p + "assets/img/" + s["image"], s["name"] + " på en dator")}<span class="phone"><img src="{p}assets/img/{s["phone"]}" alt="{esc(s["name"])} på en mobil" loading="lazy"></span></span>
            <span class="site-card__logo"><img src="{p}assets/img/{s["logo"]}" alt="{esc(s["name"])} logotyp" loading="lazy"></span>
            <span class="site-card__name">{esc(s["name"])}</span><span class="site-card__what">{esc(s["what"])}</span>
            <span class="site-card__text">{esc(s["text"])}</span>
            <span class="btn btn--primary btn--sm"><span>Förhandsvisa &rarr;</span></span>
          </a>
          <p class="site-card__links"><a href="{s["url"]}" target="_blank" rel="noopener">Besök {esc(s["label"])}</a>{f'<a href="{p}{s["case"]}">Läs om projektet</a>' if s.get("case") else ""}</p>
        </article>''' for s in sites)
    return f'''<section class="section container"><div class="sites">{cards}</div></section>
    <div class="site-preview" id="site-preview" hidden>
      <div class="site-preview__bar container">
        <div class="site-preview__who"><b id="sp-name"></b><a id="sp-url" href="#" target="_blank" rel="noopener">adress</a></div>
        <div class="site-preview__acts">
          <span class="site-preview__toggle" role="group" aria-label="Visa som"><button type="button" class="is-on" data-view="desk">Dator</button><button type="button" data-view="mob">Mobil</button></span>
          <a class="btn btn--primary btn--sm" id="sp-open" href="#" target="_blank" rel="noopener"><span>Öppna sajten</span></a>
          <button type="button" class="site-preview__close" id="sp-close" aria-label="Stäng förhandsvisningen">Stäng</button>
        </div>
      </div>
      <div class="site-preview__stage"><div class="site-preview__frame" id="sp-frame"><iframe id="sp-iframe" title="Förhandsvisning" loading="lazy"></iframe></div>
        <p class="site-preview__fallback" id="sp-fallback" hidden>Sajten gick inte att visa här. Öppna den i en ny flik i stället.</p></div>
    </div>'''


def build_simple():
    p = ""
    current_map = {"kontakt": "kontakt", "byggda-hemsidor": "kunder"}
    for slug, page in SIMPLE_PAGES.items():
        if slug == "english":
            # The whole site switches language now; the old English page just turns English on.
            (ROOT / "english.html").write_text(
                '<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex">'
                '<meta http-equiv="refresh" content="0; url=index.html?lang=en"><title>Elevate Studio in English</title>'
                '<link rel="canonical" href="' + SITE_URL + '/"></head>'
                '<body><p><a href="index.html?lang=en">Elevate Studio in English</a></p></body></html>\n', encoding="utf-8")
            continue
        parts = []
        for kind, value in page["sections"]:
            if kind == "text":
                parts.append(f'<section class="section container"><p class="preamble prose">{esc(value)}</p></section>')
            elif kind == "sites":
                parts.append(sites_section(p, value))
            elif kind == "cols":
                cards = "".join(
                    f'<div class="info-card"><h2 class="info-card__title">{esc(t)}</h2><p>{d}</p></div>'
                    for t, d in value)
                parts.append(f'<section class="section container"><div class="card-grid">{cards}</div></section>')
            elif kind in ("team", "contacts"):
                mk = '<svg class="person__logo" viewBox="0 0 1884.3 1353.9" aria-hidden="true"><path d="M0.0 1353.9 L1218.7 0.0 L1218.7 329.1 L479.7 1136.4 L786.7 1132.4 L1215.5 687.4 L1884.3 1349.9 L1590.1 1349.9 L1218.6 994.7 L865.4 1349.9Z" fill="currentColor"/></svg>'
                ph = '<svg class="person__ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" fill="currentColor"/></svg>'
                ml = '<svg class="person__ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2.2V17h16V7.2l-8 5.3z M4.6 7l7.4 4.9L19.4 7z" fill="currentColor"/></svg>'
                people = "".join(
                    f'''<article class="person">
          <div class="person__top">
            <div>
              <h2 class="person__name">{esc(name)}</h2>
              <p class="person__role">{esc(role)}</p>
            </div>
            {mk}
          </div>
          <ul class="person__links">
            <li><a href="tel:{phone.replace(" ", "")}">{ph}<span>{esc(phone)}</span></a></li>
            <li><a href="mailto:{email}">{ml}<span>{esc(email)}</span></a></li>
          </ul>
          <p class="person__company">Elevate Studio · Uppsala</p>
        </article>''' for name, role, phone, email in value)
                title = '<h2 class="block__header">Våra <span>kontaktpersoner</span></h2>' if kind == "contacts" else ""
                parts.append(f'<section class="section container">{title}<div class="people">{people}</div></section>')
            elif kind == "links":
                links = "".join(f'<li><a href="{href}" class="arrow-link">{esc(label)}</a></li>' for label, href in value)
                parts.append(f'<section class="section container"><ul class="link-list">{links}</ul></section>')
            elif kind == "contacthero":
                carl = TEAM[0]
                parts.append(f'''<section class="contact-hero">
      <div class="contact-hero__mark">{MARK_SVG}</div>
      <div class="container contact-hero__inner">
        <div class="contact-hero__text">
          <h1 class="contact-hero__title">Låt oss prata om <em>er hemsida</em></h1>
          <p class="contact-hero__lead">Ring, mejla eller skriv några rader. Vi svarar så fort vi kan – och första mötet kostar ingenting.</p>
        </div>
        <ul class="contact-hero__actions">
          <li><a href="tel:{carl[2].replace(" ", "")}"><span class="contact-hero__k">Ring oss</span><span class="contact-hero__v">{esc(carl[2])}</span></a></li>
          <li><a href="mailto:info@elevatestudio.nu"><span class="contact-hero__k">Mejla oss</span><span class="contact-hero__v">info@elevatestudio.nu</span></a></li>
          <li><a href="#formular"><span class="contact-hero__k">Skriv till oss</span><span class="contact-hero__v">Fyll i formuläret</span></a></li>
        </ul>
        <div class="contact-hero__social"><p class="contact-hero__k">Följ oss</p>{social_links("social")}</div>
      </div>
    </section>''')
            elif kind == "nextsteps":
                steps = "".join(f'<li><span class="next-steps__no">0{i}</span><h3>{esc(t)}</h3><p>{esc(d)}</p></li>' for i, (t, d) in enumerate(value, 1))
                parts.append(f'''<section class="section container next-steps">
      <h2 class="block__header">Efter att ni <span>hört av er</span></h2>
      <ol>{steps}</ol>
    </section>''')
            elif kind == "minifaq":
                qa = [("Vad kostar en hemsida?", 'Starter kostar 3 000 kr och Pro 6 000 kr i startavgift, plus en låg årsavgift. Större projekt får ett fast pris i en offert. <a href="priser.html">Se priser</a>.'),
                      ("Hur lång tid tar det?", "Ni ser ett första utkast av hemsidan redan efter ungefär en dag. Sedan finjusterar vi tillsammans tills ni är nöjda. Hur snabbt den går live beror mest på när vi har fått texter, bilder och åtkomst."),
                      ("Måste vi finnas i Uppsala?", "Nej. Vi finns i Uppsala men jobbar med företag i hela Sverige – möten går lika bra på distans.")]
                items = "".join(f'<details class="faq__item" name="kfaq"><summary>{esc(q)}</summary><p>{a}</p></details>' for q, a in qa)
                parts.append(f'''<section class="section container mini-faq">
      <div class="mini-faq__head"><h2 class="block__header">Vanliga <span>frågor</span></h2><a class="arrow-link" href="index.html#faq">Alla frågor</a></div>
      <div class="faq__list">{items}</div>
    </section>''')
            elif kind == "ceo":
                parts.append(f'''<section class="section container about-ceo">
      <div class="about-ceo__card">
        <p class="about-ceo__k">Bolaget bakom</p>
        <h2 class="about-ceo__name">{esc(PARENT_COMPANY)}</h2>
        <p class="about-ceo__role">Org.nr {ORG_NR}</p>
      </div>
      <p class="about-ceo__text">Elevate Studio är ett varumärke som tillhör {esc(PARENT_COMPANY)}. Det betyder ett litet, snabbt team mot er som kund – med ett etablerat bolag i ryggen.</p>
    </section>''')
            elif kind == "review":
                parts.append(f'<section class="section container">{reviews_section()}</section>')
            elif kind == "aboutlinks":
                parts.append('''<section class="section container about-links">
      <article class="about-links__item"><h3><a class="cover-link" href="priser.html">Priser</a></h3><p>Starter, Pro och Elite – vad som ingår och vad det kostar.</p><span class="arrow-link">Se priser</span></article>
      <article class="about-links__item"><h3><a class="cover-link" href="avtal.html">Så ser avtalet ut</a></h3><p>Ett exempel på vår offert, att läsa eller ladda ner.</p><span class="arrow-link">Se avtalet</span></article>
      <article class="about-links__item"><h3><a class="cover-link" href="plattformar/index.html">Tekniken vi använder</a></h3><p>HTML, CSS, JavaScript, React, Node.js, Python och Playwright.</p><span class="arrow-link">Se tekniken</span></article>
    </section>''')
            elif kind == "form":
                parts.append(f'''<section class="standout">
      <div class="container standout__row">
        <div class="standout__intro">
          <h2 class="h2">Skriv till <em>oss</em></h2>
          <p>Berätta kort vad ni funderar på, så återkommer vi så fort vi kan. Meddelandet går direkt till info@elevatestudio.nu.</p>
        </div>
        {contact_form(p)}
      </div>
    </section>''')
        body = "\n    ".join(parts)
        tail = "" if slug == "kontakt" else cta(p)
        hero = "" if page["sections"][0][0] == "contacthero" else page_hero(esc(page["title"]), page["lead"])
        main = f'''<main>
    {hero}
    {body}
    {tail}
  </main>'''
        yield write(f"{slug}.html", document(p, page.get("seo_title", page["title"]), main, "subpage", [(page["title"], "")], current_map.get(slug), description=page.get("description"), lang="en" if slug == "english" else "sv"))


def build_test_page():
    p = ""
    main = f'''<main>
    <section class="page-hero sitetest-hero">
      <div class="container">
        <p class="page-hero__eyebrow">Gratis djuptest</p>
        <h1 class="page-hero__title">Hur presterar <em>din sajt?</em></h1>
        <p class="page-hero__lead">Skriv in din adress så testar vi sidan i en riktig webbläsare på cirka 30 sekunder. Du får betyg för prestanda, tillgänglighet, bästa praxis och SEO – och konkreta förslag på hur allt kan åtgärdas.</p>
        <form class="sitetest__form" id="sitetest-form" data-api-key="{esc(PSI_API_KEY)}" data-form-endpoint="{FORM_ENDPOINT}" data-prefix="{p}" novalidate>
          <label class="sitetest__field"><span class="sr-only">Webbadress</span>
            <input type="text" name="url" inputmode="url" autocomplete="url" placeholder="https://dittforetag.se" required>
          </label>
          <fieldset class="sitetest__device">
            <legend class="sr-only">Enhet</legend>
            <label><input type="radio" name="strategy" value="mobile" checked><span>Mobil</span></label>
            <label><input type="radio" name="strategy" value="desktop"><span>Dator</span></label>
          </fieldset>
          <button type="submit" class="btn btn--primary"><span>Starta test</span></button>
        </form>
      </div>
    </section>
    <section class="section container sitetest">
      <div class="sitetest__progress" id="sitetest-progress" hidden aria-live="polite">
        <div class="sitetest__progress-head"><p class="sitetest__step">Startar …</p><span class="sitetest__time">0 s</span></div>
        <div class="sitetest__bar"><i></i></div>
        <p class="sitetest__note">Testet tar oftast 20–40 sekunder. Stäng inte sidan.</p>
      </div>
      <div class="sitetest__error" id="sitetest-error" hidden role="alert"></div>
      <div class="sitetest__results" id="sitetest-results" hidden></div>
      <div class="sitetest__about">
        <div class="info-card"><h2 class="info-card__title">Prestanda</h2><p>Hur snabbt sidan visas och blir klickbar, särskilt på mobil.</p></div>
        <div class="info-card"><h2 class="info-card__title">Tillgänglighet</h2><p>Om alla kan använda sidan – kontraster, rubriker, etiketter och mer.</p></div>
        <div class="info-card"><h2 class="info-card__title">SEO &amp; kvalitet</h2><p>Om Google förstår sidan och om den följer moderna riktlinjer för säkerhet.</p></div>
      </div>
    </section>
    {cta(p, "Vill du hellre att vi tittar åt dig?", "Vi gör gärna en personlig genomgång av din sajt och berättar vad som ger mest effekt.")}
  </main>'''
    yield write("testa.html", document(p, "Testa din sajt", main, "subpage", [("Testa din sajt", "")], None, extra_js=("sitetest.js",)))


AGREEMENT_PDF = "assets/docs/webbavtal-exempel-elevate-studio.pdf"


def build_agreement():
    """Example web agreement: the real offer word for word, with names, numbers and dates left blank."""
    p = ""
    mk = '<svg class="agr__mark" viewBox="0 0 1884.3 1353.9" aria-hidden="true"><path d="M0.0 1353.9 L1218.7 0.0 L1218.7 329.1 L479.7 1136.4 L786.7 1132.4 L1215.5 687.4 L1884.3 1349.9 L1590.1 1349.9 L1218.6 994.7 L865.4 1349.9Z" fill="currentColor"/></svg>'
    blank = '<span class="agr__blank"></span>'

    def sheet(sub, body, no):
        return f'''<section class="agr__sheet">
          <header class="agr__top">{mk}<div><p class="agr__brand">ELEVATE STUDIO</p><p class="agr__sub">{sub}</p></div></header>
          <div class="agr__body">{body}</div>
          <footer class="agr__foot"><span>ELEVATE STUDIO&nbsp; | &nbsp;OFFERT</span><span>Sida {no} av 2</span></footer>
        </section>'''

    scope = ["Webbdesign och mobilanpassning utifrån verksamhetens behov.",
             "Kontaktfunktion, presentation av verksamhet och projekt samt bildmaterial som kunden tillhandahåller.",
             "Grundläggande sökmotoroptimering (SEO) och AI-optimering (AIO).",
             "Två korrekturvändor före leverans."]
    page1 = sheet("WEBBUTVECKLING / OFFERT", f'''
            <div class="agr__meta"><p class="agr__no">OFFERT NR {blank}</p><p>Datum: {blank}&nbsp; | &nbsp;Giltig till: {blank}</p></div>
            <h2>1. Parter</h2>
            <p>Producent: Elevate Studio</p>
            <p>Producentens företrädare: {blank}</p>
            <p>Beställare: {blank}</p>
            <p>Beställarens företrädare: {blank}</p>
            <h2>2. Uppdragets omfattning (specifikation)</h2>
            <p>Utveckling och leverans av en modern, responsiv webbplats för Beställaren.</p>
            <p class="agr__lead">I uppdraget ingår:</p>
            <ul>{"".join(f"<li>{esc(x)}</li>" for x in scope)}</ul>
            <h2>3. Driftmiljö</h2>
            <p>Beställaren äger sin domän. Hosting, drift och eventuella externa avgifter specificeras separat om inget annat skriftligen överenskommits.</p>
            <h2>4. Leverans</h2>
            <p>Leveransdatum bekräftas separat och förutsätter att nödvändigt underlag och åtkomst tillhandahålls.</p>''', 1)
    page2 = sheet("OFFERT / VILLKOR OCH GODKÄNNANDE", f'''
            <h2>5. Fast pris och betalning</h2>
            <table>
              <thead><tr><th>Post</th><th>Pris (exkl. moms)</th></tr></thead>
              <tbody>
                <tr><td>Webbutveckling – fast startavgift</td><td>3 000 kr</td></tr>
                <tr><td>Årsavgift</td><td>99 kr/år</td></tr>
              </tbody>
              <tfoot><tr><td>Totalt första året</td><td>3 099 kr</td></tr></tfoot>
            </table>
            <p>Nya funktioner och större ombyggnationer efter leverans offereras separat.</p>
            <p>Årsavgiften på 99 kr fortsätter årsvis om inte avtalet sägs upp.</p>
            <p>Startavgift och första årsavgift faktureras vid driftsättning. Betalningsvillkor: 30 dagar. Samtliga priser anges exklusive moms.</p>
            <h2>6. Godkännande av offert</h2>
            <p>Beställaren kan acceptera denna offert genom att svara på mejlet med följande text:</p>
            <blockquote>Jag godkänner offert nr {blank} och beställer tjänsterna enligt offertens villkor.</blockquote>
            <p>Genom godkännandet accepterar beställaren uppdragets omfattning, priser, betalningsvillkor och övriga villkor i denna offert.</p>''', 2)
    main = f'''<main class="agr-page">
    <section class="page-hero agr-hero">
      <div class="container agr-hero__row">
        <div>
          <h1 class="page-hero__title">Exempel på webbavtal</h1>
          <p class="page-hero__lead">Så här ser en offert från oss ut. Namn, organisationsnummer och datum är borttagna.</p>
        </div>
        <a class="btn btn--primary" href="{p}{AGREEMENT_PDF}" download><span>Ladda ner som PDF</span></a>
      </div>
    </section>
    <section class="agr">
      <div class="container agr__sheets">
        {page1}
        {page2}
      </div>
    </section>
  </main>'''
    yield write("avtal.html", document(p, "Exempel på webbavtal", main, "subpage", [("Exempel på webbavtal", "")], None))


def build_landings():
    p = ""
    for L in LANDINGS:
        secs = ""
        for h, items in L["sections"]:
            if len(items) == 1 and not items[0].startswith("¶ "):
                body = f'<p class="preamble">{esc(items[0])}</p>'
            else:
                body, run = "", []
                for x in items:
                    if x.startswith("¶ "):
                        if run:
                            body += '<ul class="land__list">' + "".join(f"<li>{esc(y)}</li>" for y in run) + "</ul>"; run = []
                        body += f'<p class="land__p">{esc(x[2:])}</p>'
                    else:
                        run.append(x)
                if run:
                    body += '<ul class="land__list">' + "".join(f"<li>{esc(y)}</li>" for y in run) + "</ul>"
            secs += f'<div class="land__sec"><h2>{esc(h)}</h2>{body}</div>'
        more = ""
        if L.get("related"):
            more = '<section class="section container"><h2 class="block__header">Fler <span>sidor</span></h2><ul class="land__more">' + "".join(f'<li><a href="{p}{s}.html">{esc(lbl)}</a></li>' for s, lbl in L["related"]) + \
                   f'<li><a href="{p}{"orter" if L.get("kind") == "ort" else "branscher"}.html">Se alla sidor</a></li></ul></section>'
        faq_html, faq_ld = faq_block(L["faq"], "lfaq")
        main = f'''<main>
    {page_hero(L["h1"], L["lead"])}
    <section class="section container land">{secs}
    </section>
    <section class="section container">
      <div class="plans-note">
        <div><h2 class="plans-note__title">Fast pris från 3 000 kr</h2><p>Se vad som ingår i Starter, Pro och Elite – och hur avtalet ser ut.</p></div>
        <div class="plans-note__links"><a class="arrow-link" href="{p}priser.html">Se priser</a><a class="arrow-link" href="{p}avtal.html">Exempel på avtal</a></div>
      </div>
    </section>
    <section class="section container">
      <h2 class="block__header">Vanliga <span>frågor</span></h2>
      {faq_html}
    </section>
    {more}
    {cta(p)}
  </main>'''
        service = {"@type": "Service", "name": re.sub(r"<[^>]+>", "", L["h1"]), "description": L["description"], "provider": {"@id": ORG_ID},
                   "areaServed": [{"@type": "City", "name": "Uppsala"}] + ([{"@type": "City", "name": L["area"]}] if L.get("area") else []) + [{"@type": "Country", "name": "Sverige"}], "url": "__CANONICAL__",
                   "offers": {"@type": "Offer", "price": "3000", "priceCurrency": "SEK", "description": "Starter – startavgift, exkl. moms"}}
        yield write(f'{L["slug"]}.html', document(p, L["title"], main, "subpage", [(re.sub(r"<[^>]+>", "", L["h1"]), "")], None,
                    description=L["description"], jsonld=[service, faq_ld]))


def build_hubs():
    p = ""
    groups = {
        "branscher": ("Hemsidor för <em>alla branscher</em>", "Hemsidor för olika branscher: elektriker, rörmokare, målare, frisörer, restauranger, advokater med flera. Fast pris från 3 000 kr.",
                      "Varje bransch har sina egna frågor, kunder och sökord. Här är sidorna där vi går igenom vad en bra hemsida ska innehålla för just er verksamhet.",
                      [("bransch", "Hemsidor för branscher"), ("amne", "Tjänster och funktioner")], "Hemsidor för alla branscher"),
        "orter": ("Webbyrå för företag <em>i hela Sverige</em>", "Webbyrå i Uppsala som bygger hemsidor för företag i Uppsala, Stockholm, Västerås, Örebro, Gävle, Göteborg med flera orter. Fast pris från 3 000 kr.",
                  "Vi sitter i Uppsala och bygger hemsidor åt företag i hela landet. Möten på plats eller på distans, och samma kontaktperson hela vägen.",
                  [("ort", "Orter")], "Webbyrå – orter"),
    }
    for slug, (h1, desc, lead, kinds, crumb) in groups.items():
        body = ""
        for kind, title in kinds:
            items = [L for L in LANDINGS if L.get("kind") == kind]
            if slug == "orter":
                items = [dict(slug="webbyra-uppsala", label="Webbyrå Uppsala", lan="Uppsala", short="Vår hemort. Möt oss på plats eller på distans."), dict(slug="webbyra-stockholm", label="Webbyrå Stockholm", lan="Stockholm", short="Med bas i Uppsala, en kort resa från Stockholm.")] + items
            if slug == "orter":
                by = {}
                for x in items:
                    by.setdefault(x.get("lan") or "Övriga", []).append(x)
                for lan in sorted(by, key=lambda k: (k == "Övriga", k)):
                    body += f'<h2 class="land__h">{esc(lan)}{"" if lan == "Övriga" else " län"}</h2><ul class="land__grid">' + "".join(f'<li><a href="{p}{x["slug"]}.html"><b>{esc(x["label"])}</b></a><span>{esc(x["short"])}</span></li>' for x in sorted(by[lan], key=lambda y: y["label"])) + "</ul>"
            else:
                body += f'<h2 class="land__h">{title}</h2><ul class="land__grid">' + "".join(f'<li><a href="{p}{x["slug"]}.html"><b>{esc(x["label"])}</b></a><span>{esc(x["short"])}</span></li>' for x in items) + "</ul>"
        main = f'''<main>
    {page_hero(h1, lead)}
    <section class="section container land">{body}</section>
    <section class="section container">
      <div class="plans-note">
        <div><h2 class="plans-note__title">Fast pris från 3 000 kr</h2><p>Se vad som ingår i Starter, Pro och Elite, och hur avtalet ser ut.</p></div>
        <div class="plans-note__links"><a class="arrow-link" href="{p}priser.html">Se priser</a><a class="arrow-link" href="{p}avtal.html">Exempel på avtal</a></div>
      </div>
    </section>
    {cta(p)}
  </main>'''
        yield write(f"{slug}.html", document(p, re.sub(r"<[^>]+>", "", h1) + " – Elevate Studio", main, "subpage", [(crumb, "")], None, description=desc))


def build_prices():
    p = ""
    plans = [
        ("Starter", "3 000 kr", "startavgift + 99–199 kr/år", "En snygg, snabb hemsida som visar vad ni gör och gör det enkelt att kontakta er.", [
            "Webbdesign och mobilanpassning",
            "Kontaktfunktion och presentation av verksamhet och projekt",
            "Grundläggande SEO och AI-optimering",
            "Två korrekturvändor före leverans",
            "Upp till 10 timmars support och redigering per månad första året",
        ], "Kom igång", False),
        ("Pro", "6 000 kr", "startavgift + 299–399 kr/år", "För er som vill att hemsidan ska jobba – ta emot förfrågningar, bokningar och frågor åt er.", [
            "Allt i Starter",
            "Offertflöde eller bokning direkt på sidan",
            "AI-chatt som svarar på vanliga frågor",
            "Notiser via e-post och SMS",
            "Förfrågningar med status och historik",
        ], "Välj Pro", True),
        ("Elite", "Offert", "pris efter behov", "Något utöver det vanliga? Större sajter, egna system eller integrationer – vi tar fram ett upplägg och ett fast pris.", [
            "Allt i Pro",
            "Skräddarsydd design och struktur",
            "Integrationer med era system",
            "Egna funktioner efter behov",
            "Fast pris i en offert innan vi börjar",
        ], "Berätta om projektet", False),
    ]
    mk = '<svg viewBox="0 0 1884.3 1353.9" aria-hidden="true"><path d="M0.0 1353.9 L1218.7 0.0 L1218.7 329.1 L479.7 1136.4 L786.7 1132.4 L1215.5 687.4 L1884.3 1349.9 L1590.1 1349.9 L1218.6 994.7 L865.4 1349.9Z" fill="currentColor"/></svg>'
    cards = "".join(f'''
          <article class="plan{" plan--featured" if feat else ""}">
            <h2 class="plan__name">{name}</h2>
            <p class="plan__price">{price}</p>
            <p class="plan__unit">{unit}</p>
            <p class="plan__text">{esc(text)}</p>
            <ul class="plan__list">{"".join(f"<li>{esc(x)}</li>" for x in items)}</ul>
            <a class="btn {"btn--primary" if feat else "plan__btn"}" href="{p}kontakt.html"><span>{cta_label}</span></a>
          </article>''' for name, price, unit, text, items, cta_label, feat in plans)
    main = f'''<main>
    <section class="pricing">
      <div class="pricing__mark">{mk}</div>
      <div class="container pricing__inner">
        <div class="pricing__head">
          <h1 class="pricing__title">Enkla, <em>fasta priser</em></h1>
          <p class="pricing__lead">Ni vet kostnaden innan vi börjar. Alla priser anges exklusive moms.</p>
        </div>
        <div class="plans">{cards}
        </div>
      </div>
    </section>
    <section class="section container">
      <div class="plans-note">
        <div>
          <h2 class="plans-note__title">Så ser avtalet ut</h2>
          <p>Ni får allt i en tydlig offert på två sidor – vad som ingår, när det levereras och vad det kostar. Ni godkänner genom att svara på mejlet.</p>
        </div>
        <div class="plans-note__links">
          <a class="arrow-link" href="{p}avtal.html">Se exempel på webbavtal</a>
          <a class="arrow-link" href="{p}{AGREEMENT_PDF}" download>Ladda ner som PDF</a>
        </div>
      </div>
    </section>
    {cta(p, "Osäkra på vilket som passar?", "Boka ett kort möte så hjälper vi er att välja – utan att ni förbinder er till något.")}
  </main>'''
    catalog = {"@type": "OfferCatalog", "name": "Paket för hemsidor", "itemListElement": [
        {"@type": "Offer", "name": name, "description": text, "seller": {"@id": ORG_ID},
         **({"price": price.replace(" ", "").replace("kr", ""), "priceCurrency": "SEK"} if "kr" in price else {})}
        for name, price, unit, text, items, cta_label, feat in plans]}
    yield write("priser.html", document(p, "Vad kostar en hemsida? Priser från 3 000 kr", main, "subpage", [("Priser", "")], "priser",
                description="Vad kostar en hemsida? Fasta priser: Starter 3 000 kr, Pro 6 000 kr och Elite efter offert. Support ingår första året. Alla priser exkl. moms.", jsonld=[catalog]))


def rewrap(path, body_class, crumbs=None, extra_js=(), robots="index, follow"):
    """Re-wrap a hand-written page's <main> with the generated shell."""
    src = (ROOT / path).read_text(encoding="utf-8")
    main = re.search(r"<main[\s\S]*?</main>", src).group(0)
    title = re.search(r"<title>(.*?)</title>", src).group(1)
    return write(path, document("", html.unescape(title), main, body_class, crumbs, None, extra_js=extra_js, robots=robots))


MARK_SVG = '<svg viewBox="0 0 1884.3 1353.9" aria-hidden="true"><path d="M0.0 1353.9 L1218.7 0.0 L1218.7 329.1 L479.7 1136.4 L786.7 1132.4 L1215.5 687.4 L1884.3 1349.9 L1590.1 1349.9 L1218.6 994.7 L865.4 1349.9Z" fill="currentColor"/></svg>'


def reviews_section(p=""):
    """Real Google reviews, followed by a card inviting the next review. Arrows step between them."""
    quote = '<svg class="review__mark" viewBox="0 0 30 22" aria-hidden="true"><path d="M0 22V13C0 5 4 1 12 0l1 3C8 4 6 7 6 11h6v11zm17 0V13c0-8 4-12 12-13l1 3c-5 1-7 4-7 8h6v11z" fill="#1d3b2a"/></svg>'
    slides = "".join(f'''<figure class="review__card">
          {quote}
          <blockquote class="review__text"><p>{esc(r["text"])}</p></blockquote>
          <figcaption class="review__source">{esc(r["source"])}</figcaption>
        </figure>''' for r in REVIEWS)
    slides += f'''<div class="review__card review__card--ask">
          <p class="review__ask-k">Har ni jobbat med oss?</p>
          <p class="review__ask">Vi blir glada för en recension på Google – det hjälper andra företag att hitta oss.</p>
          <a class="btn btn--primary" href="{REVIEW_URL}" target="_blank" rel="noopener"><span>Lämna en recension</span></a>
        </div>'''
    return f'''<div class="reviews reviews--many" data-reviews aria-label="Kundrecensioner">
      <div class="reviews__track">{slides}</div>
      <div class="review__nav">
        <button type="button" class="review__arrow js-review-prev" aria-label="Föregående"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>
        <span class="review__count"><b class="js-review-n">1</b> / {len(REVIEWS) + 1}</span>
        <button type="button" class="review__arrow js-review-next" aria-label="Nästa"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>
      </div>
    </div>'''


def projects_section():
    """Start page: the demo site in laptop and phone, then example projects in laptops (J10)."""
    cards = "".join(f'''
          <a class="hp-proj__card" href="projekt/{c["slug"]}.html">
            {laptop("assets/img/" + c["image"], c["name"] + (" på en dator" if c.get("site") else " – exempel på hemsida på en dator"))}
            <div class="hp-proj__meta"><h3>{esc(c["name"])}</h3><span class="ex-tag">{"Kund" if c.get("site") else "Exempel"}</span></div>
            <span class="btn btn--light hp-proj__btn"><span>Läs mer</span></span>
          </a>''' for c in CASES[:3])
    return f'''<section class="block hp-proj" id="projekt">
      <div class="container">
        <div class="hp-proj__hero">
          <div>
            <span class="ex-tag ex-tag--demo">Så kan det se ut</span>
            <h2 class="hp-proj__title">Hemsidor som känns rätt <em>på alla skärmar</em></h2>
            <p class="hp-proj__lead">Vi bygger mobilen först och finputsar varje skärmstorlek. Lindvik Bygg är en hemsida vi har byggt för att visa hur det kan se ut – på dator och mobil.</p>
            <div class="hp-proj__btns">
              <a class="btn btn--light" href="projekt/index.html"><span>Se alla projekt</span></a>
              <a class="arrow-link hp-proj__link" href="{LIRK_URL}" target="_blank" rel="noopener">Klicka runt på Lindvik Bygg</a>
            </div>
          </div>
          <div class="hp-proj__devs">
            {laptop("assets/img/home/device-desktop.jpg", "Lindvik Bygg på en dator")}
            <div class="phone"><img src="assets/img/home/device-phone.jpg" alt="Lindvik Bygg på en mobil" loading="lazy"></div>
          </div>
          <p class="devs-cap"><b>Dator och mobil</b> – samma sajt, anpassad för varje skärm</p>
        </div>
        <div class="hp-proj__divider">
          <p class="hp-proj__sub">Exempel på projekt</p>
          <a class="arrow-link hp-proj__link" href="projekt/index.html">Fler exempel</a>
        </div>
        <div class="hp-proj__grid">{cards}
        </div>
        <p class="hp-proj__note">Alvhem Städ är kund hos oss. Övriga exempel är påhittade och visar hur vi arbetar.</p>
      </div>
    </section>'''


def faq_block(qa, name):
    """Accordion plus FAQPage structured data for a list of (question, answer)."""
    items = "".join(f'<details class="faq__item" name="{name}"><summary>{esc(q)}</summary><p>{a}</p></details>' for q, a in qa)
    ld = {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": html.unescape(re.sub(r"<[^>]+>", "", a))}} for q, a in qa]}
    return f'<div class="faq__list page-faq">{items}</div>', ld


def faq_section():
    items = "\n          ".join(f'<details class="faq__item" name="faq"{" open" if i == 0 else ""}><summary>{esc(q)}</summary><p>{a}</p></details>' for i, (q, a) in enumerate(FAQ))
    ld = json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": html.unescape(re.sub(r"<[^>]+>", "", a))}} for q, a in FAQ]}, ensure_ascii=False)
    return f'''<div class="faq__list">
          {items}
        </div>
        <script type="application/ld+json">{ld}</script>'''


def rss_feed():
    items = "".join(f'''
    <item><title>{esc(a["title"])}</title><link>{SITE_URL}/insikter/{a["slug"]}.html</link><guid>{SITE_URL}/insikter/{a["slug"]}.html</guid><pubDate>{datetime.date.fromisoformat(iso_date(a["date"])).strftime("%a, %d %b %Y")} 08:00:00 +0100</pubDate><description>{esc(next(v for k, v in a["body"] if k == "p"))}</description></item>''' for a in ARTICLES)
    (ROOT / "rss.xml").write_text(f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
    <title>Elevate Studio – Senaste nytt</title><link>{SITE_URL}/insikter/</link><language>sv-se</language>
    <description>Guider och tips om hemsidor, synlighet och fler förfrågningar.</description>{items}
</channel></rss>
''', encoding="utf-8")
    return "rss.xml"


def bento_section():
    mark = '<svg class="bento__mark" viewBox="0 0 1884.3 1353.9" aria-hidden="true"><path d="M0.0 1353.9 L1218.7 0.0 L1218.7 329.1 L479.7 1136.4 L786.7 1132.4 L1215.5 687.4 L1884.3 1349.9 L1590.1 1349.9 L1218.6 994.7 L865.4 1349.9Z" fill="currentColor"/></svg>'
    s = {x["slug"]: x for x in SERVICES}
    photo = lambda x: f'''<a class="bento__tile bento__tile--photo" href="tjanster/{x["slug"]}.html">
        <img src="assets/img/{x["image"]}" alt="{esc(x["alt"])}" width="636" height="477" loading="lazy">
        <span class="bento__cap">{esc(x["name"])}</span>
      </a>'''
    text = lambda x, extra="": f'''<div class="bento__tile bento__tile--text{extra}">
        <h3><a class="cover-link" href="tjanster/{x["slug"]}.html">{esc(x["name"])}</a></h3>
        <p>{esc(x["card"])}</p>
        <span class="arrow-link">Läs mer</span>
      </div>'''
    return f'''<section class="block container bento" id="tjanster-oversikt" aria-label="Vad vi gör">
      <div class="bento__tile bento__tile--big">
        {mark}
        <h2 class="bento__title"><a class="cover-link" href="tjanster/index.html">En hemsida som <em>jobbar åt er</em></a></h2>
        <div class="bento__text">
          <p>Vi bygger snabba, mobilanpassade hemsidor med tydliga tjänstesidor och en väg till kontakt på varje sida.</p>
          <p class="bento__more">Sedan kopplar vi på det som sparar tid åt er – bokning, offertflöden och AI-chatt – och ser till att ni syns på Google och när kunder frågar AI.</p>
          <p class="bento__more">Efter lansering tar vi hand om ändringar och uppföljning.</p>
        </div>
        <span class="btn btn--light"><span>Se alla tjänster</span></span>
      </div>
      {photo(s["hemsidor"])}
      {text(s["ai-chatt"])}
      {text(s["bokningssystem"], " bento__tile--sand")}
      {photo(s["seo-och-ai-optimering"])}
    </section>'''


MONTHS = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"]


def iso_date(text):
    day, month, year = text.split()
    return f"{int(year):04d}-{MONTHS.index(month) + 1:02d}-{int(day):02d}"


def i18n_files():
    """assets/js/i18n-en.js: the English texts for the language switch (from tools/i18n_en.py)."""
    from i18n_en import EN, PATTERNS
    # The news cards show a cut first paragraph; cut the translation the same way
    cut = lambda s: s if len(s) <= 120 else s[:117].rsplit(" ", 1)[0] + "…"
    derived = {}
    for a in ARTICLES:
        first = re.sub(r"<[^>]+>", "", next((v for k, v in a["body"] if k == "p"), ""))
        if first in EN and len(first) > 120:
            derived[cut(first)] = cut(EN[first])
    data = json.dumps({"t": {**derived, **EN}, "p": PATTERNS}, ensure_ascii=False, separators=(",", ":"))
    (ROOT / "assets/js/i18n-en.js").write_text(f"window.ELEVATE_EN = {data};\n", encoding="utf-8")


def site_files(built):
    """sitemap.xml, robots.txt and llms.txt (a plain summary for AI assistants)."""
    today = datetime.date.today().isoformat()
    pages = sorted(x for x in built if x != "404.html")
    urls = "".join(f"\n  <url><loc>{page_url(x)}</loc><lastmod>{today}</lastmod></url>" for x in pages)
    (ROOT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}\n</urlset>\n', encoding="utf-8")
    bots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended", "Bingbot",
            "anthropic-ai", "Claude-Web", "cohere-ai", "Amazonbot", "meta-externalagent", "DuckAssistBot", "YouBot"]
    # The admin and the customers' booking pages (/boka/<link>) stay out of search engines
    # One group for everyone, search engines and AI crawlers alike; only the admin and the customers' private booking links stay out
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /boka/\n\nSitemap: {SITE_URL}/sitemap.xml\n", encoding="utf-8")
    # elevatestudio.nu/admin – the admin panel itself (login, leads, offers, calendar)
    (ROOT / "admin").mkdir(exist_ok=True)
    (ROOT / "admin" / "index.html").write_text(f'''<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Admin – Elevate Studio</title>
  <link rel="icon" href="../assets/img/brand/favicon-32.png" type="image/png" sizes="32x32">
  <link rel="stylesheet" href="../assets/css/admin.css?v={VERSION}">
</head>
<body>
  <div id="admin"{' data-mail="' + MAIL_FUNCTION + '"' if MAIL_LIVE else ''} data-url="{SUPABASE_URL}" data-key="{SUPABASE_PUBLISHABLE_KEY}" data-review="{esc(REVIEW_URL)}"><p style="padding:40px;font-family:sans-serif">Laddar admin …</p></div>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
  <script src="../assets/js/admin-offer.js?v={VERSION}"></script>
  <script src="../assets/js/admin.js?v={VERSION}"></script>
</body>
</html>
''', encoding="utf-8")
    services = "\n".join(f"- [{x['name']}]({SITE_URL}/tjanster/{x['slug']}.html): {x['lead']}" for x in SERVICES)
    team = "\n".join(f"- {n}, {r}: {t}, {e}" for n, r, t, e in TEAM)
    articles = "\n".join(f"- [{a['title']}]({SITE_URL}/insikter/{a['slug']}.html)" for a in ARTICLES)
    faq = "\n".join(f"- **{q}** {html.unescape(re.sub(r'<[^>]+>', '', a))}" for q, a in FAQ)
    llms = f"""# Elevate Studio

> Webbyrå i Uppsala som bygger snabba, mobilanpassade hemsidor som ger förfrågningar – med bokning, offertflöde, AI-chatt, SEO och AI-optimering. Fast pris, och kunden pratar alltid med samma person. Arbetar med företag i alla storlekar i hela Sverige, små som stora.

## Tjänster
{services}

## Priser (exkl. moms)
- Starter: 3 000 kr i startavgift + 99–199 kr/år. Webbdesign och mobilanpassning, kontaktfunktion, grundläggande SEO och AI-optimering, två korrekturvändor, upp till 10 timmars support per månad första året.
- Pro: 6 000 kr i startavgift + 299–399 kr/år. Allt i Starter plus offertflöde eller bokning, AI-chatt, notiser via e-post och SMS samt förfrågningar med status och historik.
- Elite: pris efter offert för större sajter, integrationer och egna funktioner.
- Leverans: ett första utkast efter ungefär en dag; lansering när texter, bilder och åtkomst är på plats. Kunden äger sin domän.
- [Priser]({SITE_URL}/priser.html) · [Exempel på webbavtal]({SITE_URL}/avtal.html)

## Vanliga frågor
{faq}

## Kontakt
- E-post: info@elevatestudio.nu
- Ort: Uppsala, Sverige
{team}

## Artiklar
{articles}
"""
    (ROOT / "llms.txt").write_text(llms, encoding="utf-8")
    # The long version: every service, landing page and article in full text.
    parts = [llms, "\n# Tjänster i detalj\n"]
    for x in SERVICES:
        parts.append(f"\n## {x['name']}\n{x['intro']}\n" + "".join(f"- {t}: {d}\n" for t, d in x["includes"]) + "".join(f"- **{q}** {a}\n" for q, a in x["faq"]))
    for L in LANDINGS:
        parts.append(f"\n## {re.sub(r'<[^>]+>', '', L['h1'])}\n{L['lead']}\n" + "".join(f"\n### {h}\n" + "\n".join((i[2:] if i.startswith("¶ ") else f"- {i}") for i in items) + "\n" for h, items in L["sections"]))
    parts.append("\n# Artiklar\n")
    for a in ARTICLES:
        body = "\n".join(v if k == "p" else (f"### {v}" if k == "h2" else "\n".join(f"- {i}" for i in v)) for k, v in a["body"])
        parts.append(f"\n## {a['title']} ({a['date']})\n{body}\n")
    (ROOT / "llms-full.txt").write_text("".join(parts), encoding="utf-8")
    return ["sitemap.xml", "robots.txt", "llms.txt", "llms-full.txt"]


def platforms_section():
    cards = "".join(platform_card("", x) for x in PLATFORMS)
    return f'''<section class="block platforms">
      <div class="container">
        <h2 class="block__header">Våra <span>plattformar</span></h2>
        <div class="platforms__row">
          <aside class="platforms__aside">
            <p>Verktygen vi bygger med. Vi väljer det som passar ert företag – ni behöver aldrig tänka på tekniken.</p>
            <a href="plattformar/index.html" class="arrow-link">Läs mer</a>
          </aside>
          <div class="platforms__cards">{cards}</div>
        </div>
      </div>
    </section>'''


def main():
    built = []
    for gen in (build_services, build_cases, build_articles, build_platforms, build_simple, build_test_page, build_agreement, build_prices, build_landings, build_hubs):
        built.extend(gen())
    # Keep the homepage lists in sync with the data (regions between build markers).
    index = ROOT / "index.html"
    src = index.read_text(encoding="utf-8")
    pattern = [True, False, False, True]
    regions = {
        "posts": featured_posts("", ARTICLES),
        "bento": bento_section(),
        "contactform": contact_form(""),
        "reviews": reviews_section(),
        "projects": projects_section(),
        "faq": faq_section(),
    }
    for name, markup in regions.items():
        src, n = re.subn(rf"<!-- build:{name} -->[\s\S]*?<!-- /build:{name} -->",
                         lambda _m, name=name, markup=markup: f"<!-- build:{name} -->{markup}<!-- /build:{name} -->", src)
        if n > 1:
            raise SystemExit(f"index.html: marker for {name!r} found {n} times")
    index.write_text(src, encoding="utf-8")
    built.append(rewrap("index.html", "home", extra_js=("home.js",)))
    built.append(rewrap("404.html", "error404", crumbs=[("Fel 404", "")], robots="noindex"))
    # The server shows 404.html at any address, so its links must start from the site root.
    page404 = ROOT / "404.html"
    page404.write_text(page404.read_text(encoding="utf-8").replace("<head>", '<head>\n  <base href="/">', 1), encoding="utf-8")
    built.extend(site_files(built))
    i18n_files()
    built.append(rss_feed())
    for name in ("sitemap.xml", "llms.txt", "llms-full.txt", "rss.xml"):
        f = ROOT / name
        if f.exists():
            f.write_text(pretty(f.read_text(encoding="utf-8")), encoding="utf-8")
    minify_js(built)
    print(f"Built {len(built)} pages")


def minify_js(built):
    """Every script in assets/js gets a .min.js copy (esbuild when it is around, otherwise a plain copy so the
    file is never stale), and the pages point at the copies."""
    import shutil, subprocess
    js = ROOT / "assets/js"
    esbuild = shutil.which("esbuild") or next((str(c) for c in [pathlib.Path("/tmp/claude-0/-home-user/6c69fc61-5f7f-5a28-8aab-e07dcbeef98c/scratchpad/wr/node_modules/.bin/esbuild"), ROOT / "node_modules/.bin/esbuild"] if c.exists()), None)
    names = []
    for f in sorted(js.glob("*.js")):
        if f.name.endswith(".min.js"):
            continue
        out = js / (f.stem + ".min.js")
        if esbuild:
            r = subprocess.run([esbuild, str(f), "--minify", "--target=es2017", "--log-level=error", f"--outfile={out}"], capture_output=True, text=True)
            if r.returncode:
                shutil.copyfile(f, out)
        else:
            shutil.copyfile(f, out)
        names.append(f.stem)
    pat = re.compile(r'(assets/js/)(' + "|".join(re.escape(n) for n in names) + r')\.js(\?v=)')
    for path in set(built):
        f = ROOT / path
        if f.suffix == ".html" and f.exists():
            s = f.read_text(encoding="utf-8"); s2 = pat.sub(r"\1\2.min.js\3", s)
            if s2 != s:
                f.write_text(s2, encoding="utf-8")
    inline_critical(built)


def purge_css(css, pages):
    """Each page's own subset of the shared CSS (tools/purge_css.js with PurgeCSS). Falls back to the whole file."""
    import json as _json, shutil, subprocess
    mods = [pathlib.Path("/tmp/claude-0/-home-user/6c69fc61-5f7f-5a28-8aab-e07dcbeef98c/scratchpad/wr/node_modules/purgecss"), ROOT / "node_modules/purgecss"]
    mod = next((str(m) for m in mods if m.exists()), None)
    if not mod or not shutil.which("node"):
        return {}
    js = [str(f) for f in sorted((ROOT / "assets/js").glob("*.js")) if not f.name.endswith(".min.js") and not f.name.startswith(("admin", "i18n-en"))]
    r = subprocess.run(["node", str(ROOT / "tools/purge_css.js")], input=_json.dumps({"css": css, "pages": [str(ROOT / p) for p in pages], "js": js}),
                       capture_output=True, text=True, env={**__import__("os").environ, "PURGECSS": mod})
    if r.returncode:
        print("purge_css failed, using the whole CSS:", r.stderr[:300])
        return {}
    got = _json.loads(r.stdout)
    return {p: got[str(ROOT / p)] for p in pages if str(ROOT / p) in got}


def inline_critical(built):
    """The shared CSS and the small language script go straight into each page, so nothing blocks the first
    paint. The script's hash is written into the Content-Security-Policy in worker/index.js."""
    import base64, hashlib
    css = (ROOT / "assets/css/site.min.css").read_text(encoding="utf-8")
    i18n = (ROOT / "assets/js/i18n.min.js").read_text(encoding="utf-8").strip()
    assert "</script" not in i18n and "</style" not in css
    sha = "sha256-" + base64.b64encode(hashlib.sha256(i18n.encode()).digest()).decode()
    link = re.compile(r'<link rel="stylesheet" href="((?:\.\./)*)assets/css/site\.min\.css\?v=[^"]*">')
    tag = re.compile(r'<script src="(?:\.\./)*assets/js/i18n\.min\.js\?v=[^"]*"([^>]*)></script>')
    pages = sorted(p for p in set(built) if p.endswith(".html") and (ROOT / p).exists() and not p.startswith("admin"))
    per_page = purge_css(css, pages)
    for path in pages:
        f = ROOT / path
        s = f.read_text(encoding="utf-8")
        page_css = per_page.get(path, css)
        # sizes that depend on where a picture sits, not only on which picture it is
        s = re.sub(r'(<article class="insights__small">\s*<img [^>]*?sizes=")[^"]*', r'\1(max-width: 768px) 120px, 200px', s)
        s = re.sub(r'(<div class="laptop__scr"><img src="assets/img/home/alvhemstad-desktop[^>]*?sizes=")[^"]*', r'\1(max-width: 768px) 50vw, 360px', s)
        page_css = re.sub(r"@font-face\{[^}]*\}", "", page_css)  # fonts are loaded by main.js after the page (no request chain)
        s2 = link.sub(lambda m: "<style>" + page_css.replace("url(../", "url(" + m.group(1) + "assets/") + "</style>", s)
        s2 = tag.sub(lambda m: "<script" + m.group(1) + ">" + i18n + "</script>", s2)
        if s2 != s:
            f.write_text(s2, encoding="utf-8")
    w = ROOT / "worker/index.js"
    src = w.read_text(encoding="utf-8")
    src2 = re.sub(r"\"script-src 'self'( 'sha256-[^']*')?", lambda m: f"\"script-src 'self' '{sha}'", src, count=1)
    if src2 != src:
        w.write_text(src2, encoding="utf-8")


if __name__ == "__main__":
    main()
