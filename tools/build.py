"""Static site generator for the design study.

Run from the repository root:  python3 tools/build.py

Generates every subpage from tools/content.py and re-wraps index.html and
404.html with the shared header, menus, footer and cookie dialog, so that
navigation is identical on every page.
"""
import hashlib
import html
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from content import ARTICLES, CASES, PLATFORMS, PSI_API_KEY, SERVICES, SIMPLE_PAGES  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
SERVICE = {s["slug"]: s for s in SERVICES}
CASE = {c["slug"]: c for c in CASES}
CHEVRON = '<svg class="chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 4.75 8 11.25l6.5-6.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>'


def esc(text):
    return html.escape(text, quote=True)


# ---------------------------------------------------------------- shell

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
      <a href="{p}index.html" class="wordmark" aria-label="Startsida">
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
          {nav_item("kontakt", "kontakt.html", "Kontakt")}
          {nav_item("insikter", "insikter/index.html", "Insikter &amp; Artiklar")}
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
            <p class="megamenu__sidebar-header">Nytt: sökbarhet i AI-assistenter</p>
            <p class="megamenu__sidebar-text">Allt fler köpare börjar sin research i en chatt. Vi ser till att ditt varumärke dyker upp i svaren och att informationen om er stämmer.</p>
          </div>
          <p class="megamenu__sidebar-button"><a href="{p}ai-sok.html" class="btn btn--primary"><span>Upptäck</span></a></p>
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
        <li><a href="{p}insikter/index.html">Insikter &amp; Artiklar</a></li>
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
        <li><a href="{p}om.html">Om studion</a></li>
        <li><a href="{p}karriar.html">Karriär</a></li>
        <li><a href="{p}oppna-roller.html">Öppna roller</a></li>
        <li><a href="{p}arbetsvillkor.html">Arbetsvillkor</a></li>
        <li><a href="{p}ansvar.html">Ansvar</a></li>
        <li><a href="{p}english.html">In English</a></li>
      </ul>
    </div>
    <div class="drawer__contact">
      <p class="drawer__contact-title">Har du ett projekt på gång?</p>
      <p>Vi svarar normalt inom en arbetsdag.</p>
      <a class="drawer__mail" href="mailto:info@elevatestudio.nu">info@elevatestudio.nu</a>
      <a class="btn btn--primary" href="{p}kontakt.html"><span>Hör av dig</span></a>
    </div>
  </nav>'''


def footer(p):
    services = "".join(f'<li><a href="{p}tjanster/{s["slug"]}.html">{esc(s["name"])}</a></li>' for s in SERVICES)
    return f'''<footer>
    <div class="site-footer">
      <svg class="site-footer__bigmark" viewBox="0 0 1884.3 1353.9" aria-hidden="true" focusable="false"><path d="M0.0 1353.9 L1218.7 0.0 L1218.7 329.1 L479.7 1136.4 L786.7 1132.4 L1215.5 687.4 L1884.3 1349.9 L1590.1 1349.9 L1218.6 994.7 L865.4 1349.9Z" fill="currentColor"/></svg>
      <div class="container">
        <div class="site-footer__row">
          <div class="site-footer__small">
            <a href="{p}index.html" class="wordmark wordmark--light" aria-label="Startsida">
              <svg class="wordmark__mark" viewBox="0 0 1884.3 1353.9" aria-hidden="true"><path d="M0.0 1353.9 L1218.7 0.0 L1218.7 329.1 L479.7 1136.4 L786.7 1132.4 L1215.5 687.4 L1884.3 1349.9 L1590.1 1349.9 L1218.6 994.7 L865.4 1349.9Z" fill="currentColor"/></svg>
              <span class="wordmark__name">Elevate Studio</span>
            </a>
          </div>
          <div class="site-footer__big site-footer__slogan">
            <p>Vi hjälper dig från första skiss till en tjänst som växer med din affär. <em>Vi ses i nästa projekt!</em></p>
          </div>
          <div class="site-footer__small">
            <h3 class="site-footer__subheader">Få vårt nyhetsbrev</h3>
            <form class="site-footer__newsletter js-demo-form">
              <label><span class="sr-only">E-postadress</span><input type="email" placeholder="Din e-postadress" required></label>
              <button type="submit" aria-label="Prenumerera"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 8h13M9 3l5 5-5 5" fill="none" stroke="#fff" stroke-width="2"/></svg></button>
              <p class="demo-form-status" role="status" hidden>Tack! (Designstudie – inget skickades.)</p>
            </form>
            <p class="site-footer__fine">När du skickar formuläret godkänner du vår <a href="{p}integritet.html">integritetspolicy</a></p>
          </div>
          <div class="site-footer__big site-footer__cols">
            <div>
              <h3 class="site-footer__subheader">Tjänster</h3>
              <ul class="site-footer__links">{services}</ul>
            </div>
            <div>
              <h3 class="site-footer__subheader">Studio</h3>
              <ul class="site-footer__links">
                <li><a href="{p}kontakt.html"><svg viewBox="0 0 12 16" aria-hidden="true"><path d="M6 0a6 6 0 0 0-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 0 0-6-6zm0 8.5A2.5 2.5 0 1 1 6 3.5a2.5 2.5 0 0 1 0 5z" fill="#fff"/></svg> Uppsala</a></li>
                <li><a href="{p}om.html">Om studion</a></li>
                <li><a href="{p}plattformar/index.html">Plattformar</a></li>
              </ul>
            </div>
            <div>
              <h3 class="site-footer__subheader">Följ oss</h3>
              <ul class="site-footer__links">
                <li><a href="{p}kontakt.html#folj-oss">LinkedIn</a></li>
                <li><a href="{p}kontakt.html#folj-oss">Facebook</a></li>
                <li><a href="{p}kontakt.html#folj-oss">Instagram</a></li>
              </ul>
            </div>
          </div>
          <ul class="site-footer__bottom">
            <li><a href="{p}integritet.html">Integritetspolicy</a></li>
            <li><a href="{p}cookies.html">Cookies</a></li>
            <li><a href="{p}visselblasning.html">Visselblåsning</a></li>
          </ul>
        </div>
      </div>
    </div>
  </footer>

  <div class="cookie-dialog" id="cookie-dialog" role="dialog" aria-labelledby="cookie-title" hidden>
    <p class="cookie-dialog__title" id="cookie-title">Dina val kring cookies</p>
    <p class="cookie-dialog__text">Den här studien sparar bara ditt cookieval lokalt i webbläsaren. Inga spårare eller analysverktyg laddas, oavsett vad du väljer. Läs mer <a href="{p}cookies.html">här.</a></p>
    <div class="cookie-dialog__buttons">
      <button type="button" data-choice="accept">Godkänn</button>
      <button type="button" data-choice="deny">Avböj</button>
      <a class="cookie-dialog__settings" href="{p}cookies.html">Inställningar</a>
    </div>
    <p class="cookie-dialog__links"><a href="{p}cookies.html">Om cookies</a> <a href="{p}integritet.html">Integritet</a></p>
  </div>'''


def asset_version():
    """Short hash of all CSS/JS so browsers and CDN caches never mix old and new files."""
    digest = hashlib.sha1()
    for f in sorted((ROOT / "assets").glob("*/*.*")):
        if f.suffix in (".css", ".js"):
            digest.update(f.read_bytes())
    return digest.hexdigest()[:10]


VERSION = asset_version()


def document(p, title, main, body_class, crumbs=None, current=None, extra_css=(), extra_js=()):
    css = ["style.css", "home.css", "pages.css", *extra_css]
    links = "\n  ".join(f'<link rel="stylesheet" href="{p}assets/css/{c}?v={VERSION}">' for c in css)
    scripts = "\n  ".join(f'<script src="{p}assets/js/{j}?v={VERSION}"></script>' for j in ("main.js", *extra_js))
    return f'''<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>{esc(title)} | Designstudie</title>
  <link rel="icon" href="{p}assets/img/brand/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="{p}assets/fonts/HankenGrotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="{p}assets/fonts/Fraunces-latin.woff2" as="font" type="font/woff2" crossorigin>
  {links}
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


def cta(p, title="Ska vi bygga något tillsammans?", text="Berätta kort om vad du funderar på, så hör vi av oss inom en arbetsdag."):
    return f'''<section class="cta-band">
      <div class="container cta-band__inner">
        <div>
          <h2 class="cta-band__title">{title}</h2>
          <p>{text}</p>
        </div>
        <a href="{p}kontakt.html" class="btn btn--light"><span>Kontakta oss</span></a>
      </div>
    </section>'''


def case_card(p, c, big):
    tags = "".join(f'<li><a href="{p}projekt/index.html">{esc(t)}</a></li>' for t in c["tags"])
    return f'''<li class="case{' case--big' if big else ''}">
            <a class="case__image" href="{p}projekt/{c["slug"]}.html">
              <img src="{p}assets/img/{c["image"]}" alt="" width="{c["w"]}" height="{c["h"]}" loading="lazy">
              <span class="case__overlay">
                <span class="case__overlay-text">{esc(c["lead"])}</span>
                <span class="case__overlay-link"><span class="arrow-link">Läs mer</span></span>
              </span>
            </a>
            <h3 class="case__title"><a href="{p}projekt/{c["slug"]}.html">{esc(c["name"])}</a></h3>
            <ul class="case__tags">{tags}</ul>
          </li>'''


def post_card(p, a):
    terms = "".join(f"<span>{esc(t)}</span>" for t in a["terms"])
    return f'''<a href="{p}insikter/{a["slug"]}.html" class="post-card">
            <img src="{p}assets/img/{a["image"]}" alt="" width="420" height="297" loading="lazy">
            <div class="post-card__content">
              <p class="post-card__terms">{terms}</p>
              <h3 class="post-card__title">{esc(a["title"])}</h3>
              <p class="post-card__time">{a["date"]}</p>
            </div>
          </a>'''


def platform_card(p, x):
    return f'''<a class="platform-card" href="{p}plattformar/{x["slug"]}.html">
              <img src="{p}assets/img/home/{x["icon"]}" alt="" width="60" height="60">
              <h3>{esc(x["name"])}</h3><span class="arrow-link">Läs mer</span>
            </a>'''


def service_card(p, s):
    return f'''<a class="info-card info-card--link" href="{p}tjanster/{s["slug"]}.html">
          <h3 class="info-card__title">{esc(s["name"])}</h3>
          <p>{esc(s["lead"])}</p>
          <span class="arrow-link">Läs mer</span>
        </a>'''


def featured_posts(p, articles):
    """Homepage insights: the newest article large, the next two stacked beside it."""
    def terms(a):
        return "".join(f"<span>{esc(x)}</span>" for x in a["terms"])
    big, *rest = articles[:3]
    side = "".join(f'''<a class="insights__small" href="{p}insikter/{a["slug"]}.html">
            <img src="{p}assets/img/{a["image"]}" alt="" width="420" height="297" loading="lazy">
            <div>
              <p class="post-card__terms">{terms(a)}</p>
              <h3 class="insights__small-title">{esc(a["title"])}</h3>
              <p class="post-card__time">{a["date"]}</p>
            </div>
          </a>''' for a in rest)
    return f'''<div class="insights__grid">
          <a class="insights__big" href="{p}insikter/{big["slug"]}.html">
            <img src="{p}assets/img/{big["image"]}" alt="" width="840" height="594" loading="lazy">
            <div>
              <p class="post-card__terms">{terms(big)}</p>
              <h3 class="insights__big-title">{esc(big["title"])}</h3>
              <p class="post-card__time">{big["date"]}</p>
            </div>
          </a>
          <div class="insights__side">{side}</div>
        </div>'''


def contact_form(p):
    return f'''<form class="standout__form js-demo-form" id="formular">
          <h3 class="standout__header">Hej! Jag vill gärna bli kontaktad.</h3>
          <div class="standout__fields">
            <label><span class="sr-only">Namn</span><input type="text" placeholder="Namn" required></label>
            <label><span class="sr-only">E-post</span><input type="email" placeholder="E-post" required></label>
            <label><span class="sr-only">Telefon</span><input type="tel" placeholder="Telefon"></label>
            <label><span class="sr-only">Organisation</span><input type="text" placeholder="Organisation"></label>
            <label class="standout__wide"><span class="sr-only">Meddelande</span><textarea placeholder="Meddelande" rows="1"></textarea></label>
          </div>
          <p class="standout__consent">När du skickar formuläret godkänner du vår <a href="{p}integritet.html">integritetspolicy</a></p>
          <button type="submit" class="btn btn--primary"><span>Skicka</span></button>
          <p class="demo-form-status standout__status" role="status" hidden>Tack! Det här är en designstudie, så inget skickades.</p>
        </form>'''


# ---------------------------------------------------------------- pages

def write(path, text):
    out = ROOT / path
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    return path


def build_services():
    p = "../"
    cards = "".join(service_card(p, s) for s in SERVICES)
    steps = [("Kartläggning", "Vi förstår verksamheten, användarna och målen."),
             ("Design", "Koncept och prototyper som testas tidigt."),
             ("Bygge", "Korta etapper med löpande demo."),
             ("Test", "Funktion, tillgänglighet och säkerhet."),
             ("Lansering", "Noggrann uppföljning de första veckorna.")]
    steps_html = "".join(f'<li><span class="step-list__no">{i}</span><h3>{t}</h3><p>{d}</p></li>' for i, (t, d) in enumerate(steps, 1))
    main = f'''<main>
    {page_hero("Vad vi <em>gör</em>", "Från strategi och design till utveckling, tillväxt och drift. Välj en del eller låt oss ta hand om hela kedjan.")}
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
    yield write("tjanster/index.html", document(p, "Vad vi gör", main, "subpage", [("Vad vi gör", "tjanster/index.html")], "tjanster"))

    for s in SERVICES:
        includes = "".join(f'<div class="info-card"><h3 class="info-card__title">{esc(t)}</h3><p>{esc(d)}</p></div>' for t, d in s["includes"])
        cases = "".join(case_card(p, CASE[c], False) for c in s["cases"])
        others = "".join(f'<li><a href="{o["slug"]}.html" class="arrow-link">{esc(o["name"])}</a></li>' for o in SERVICES if o is not s)
        main = f'''<main>
    {page_hero(esc(s["name"]), s["lead"], "Tjänst")}
    <section class="section container columns-2">
      <div>
        <h2 class="h2">Det här gör vi</h2>
        <p class="preamble">{esc(s["intro"])}</p>
        <a href="../kontakt.html" class="btn btn--primary"><span>Boka ett samtal</span></a>
      </div>
      <img class="rounded" src="../assets/img/{s["image"]}" alt="" width="632" height="474" loading="lazy">
    </section>
    <section class="section section--cream">
      <div class="container">
        <h2 class="block__header">Det här <span>ingår</span></h2>
        <div class="card-grid card-grid--2">{includes}</div>
      </div>
    </section>
    <section class="section container">
      <div class="block__header-row">
        <h2 class="block__header">Utvalda <span>projekt</span></h2>
        <a href="../projekt/index.html" class="arrow-link">Se alla</a>
      </div>
      <ul class="cases__grid cases__grid--even">{cases}</ul>
    </section>
    <section class="section container">
      <h2 class="h3 section__title">Fler tjänster</h2>
      <ul class="link-list">{others}</ul>
    </section>
    {cta(p)}
  </main>'''
        yield write(f'tjanster/{s["slug"]}.html', document(p, s["name"], main, "subpage",
                    [("Vad vi gör", "tjanster/index.html"), (s["name"], "")], "tjanster"))


def build_cases():
    p = "../"
    pattern = [True, False, False, True]
    cards = "".join(case_card(p, c, pattern[i % 4]) for i, c in enumerate(CASES))
    main = f'''<main>
    {page_hero("Våra <em>projekt</em>", "Ett urval av uppdrag där strategi, design och teknik har gjort skillnad. Alla kunder och projekt här är påhittade exempel.")}
    <section class="section container">
      <ul class="cases__grid">{cards}</ul>
    </section>
    {cta(p)}
  </main>'''
    yield write("projekt/index.html", document(p, "Projekt", main, "subpage", [("Projekt", "")], "projekt"))

    for i, c in enumerate(CASES):
        nxt = CASES[(i + 1) % len(CASES)]
        tags = "".join(f"<li>{esc(t)}</li>" for t in c["tags"])
        services = "".join(f'<li><a href="../tjanster/{s}.html" class="arrow-link">{esc(SERVICE[s]["name"])}</a></li>' for s in c["services"])
        main = f'''<main>
    {page_hero(esc(c["name"]), c["lead"], "Projekt")}
    <section class="section container">
      <ul class="tag-row">{tags}</ul>
      <img class="rounded case-hero-image" src="../assets/img/{c["image"]}" alt="" width="1304" height="{round(1304 * c["h"] / c["w"])}">
      <p class="fiction-note">Påhittat exempelprojekt i en designstudie.</p>
    </section>
    <section class="section container">
      <div class="card-grid">
        <div class="info-card"><h2 class="info-card__title">Utmaningen</h2><p>{esc(c["challenge"])}</p></div>
        <div class="info-card"><h2 class="info-card__title">Lösningen</h2><p>{esc(c["solution"])}</p></div>
        <div class="info-card info-card--accent"><h2 class="info-card__title">Resultatet</h2><p>{esc(c["result"])}</p></div>
      </div>
    </section>
    <section class="section container two-up">
      <div>
        <h2 class="h3 section__title">Tjänster i projektet</h2>
        <ul class="link-list">{services}</ul>
      </div>
      <a class="next-card" href="{nxt["slug"]}.html">
        <span class="next-card__label">Nästa projekt</span>
        <span class="next-card__title">{esc(nxt["name"])}</span>
        <span class="arrow-link">Läs mer</span>
      </a>
    </section>
    {cta(p)}
  </main>'''
        yield write(f'projekt/{c["slug"]}.html', document(p, c["name"], main, "subpage",
                    [("Projekt", "projekt/index.html"), (c["name"], "")], "projekt"))


def render_body(blocks):
    out = []
    for kind, value in blocks:
        if kind == "p":
            out.append(f"<p>{esc(value)}</p>")
        elif kind == "h2":
            out.append(f"<h2>{esc(value)}</h2>")
        elif kind == "ul":
            out.append("<ul>" + "".join(f"<li>{esc(v)}</li>" for v in value) + "</ul>")
    return "\n        ".join(out)


def build_articles():
    p = "../"
    cards = "".join(post_card(p, a) for a in ARTICLES)
    main = f'''<main>
    {page_hero("Insikter &amp; <em>artiklar</em>", "Tankar, guider och nyheter om design, utveckling och digital tillväxt.")}
    <section class="section section--cream">
      <div class="container"><div class="posts__grid">{cards}</div></div>
    </section>
    {cta(p)}
  </main>'''
    yield write("insikter/index.html", document(p, "Insikter & Artiklar", main, "subpage", [("Insikter", "")], "insikter"))

    for a in ARTICLES:
        more = "".join(post_card(p, o) for o in ARTICLES if o is not a)
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
      <img class="rounded article__image" src="../assets/img/{a["image"]}" alt="" width="840" height="594">
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
        yield write(f'insikter/{a["slug"]}.html', document(p, a["title"], main, "subpage",
                    [("Insikter", "insikter/index.html"), (a["title"], "")], "insikter"))


def build_platforms():
    p = "../"
    cards = "".join(platform_card(p, x) for x in PLATFORMS)
    main = f'''<main>
    {page_hero("Våra <em>plattformar</em>", "Verktygen och teknikerna vi bygger med – samma verktyg som användes för att bygga just den här sajten.")}
    <section class="section container">
      <div class="platforms__cards platforms__cards--page">{cards}</div>
    </section>
    <section class="section section--cream">
      <div class="container columns-2">
        <h2 class="h3">Vi väljer tekniken efter uppdraget, inte tvärtom.</h2>
        <p>Ibland är ett ramverk rätt, ibland räcker ren HTML, CSS och lite JavaScript. Det viktiga är att lösningen är snabb, tillgänglig och lätt att förvalta för de som ska ta hand om den efter lansering.</p>
      </div>
    </section>
    {cta(p)}
  </main>'''
    yield write("plattformar/index.html", document(p, "Plattformar", main, "subpage", [("Plattformar", "")], None))

    for x in PLATFORMS:
        uses = "".join(f'<div class="info-card"><h3 class="info-card__title">{esc(t)}</h3><p>{esc(d)}</p></div>' for t, d in x["uses"])
        here = "".join(f"<li>{esc(h)}</li>" for h in x["here"])
        others = "".join(platform_card(p, o) for o in PLATFORMS if o is not x)
        main = f'''<main>
    <section class="page-hero page-hero--icon">
      <div class="container">
        <img class="page-hero__icon" src="../assets/img/home/{x["icon"]}" alt="" width="96" height="96">
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
        <h2 class="block__header">Så användes det <span>i den här sajten</span></h2>
        <ul class="check-list">{here}</ul>
      </div>
    </section>
    <section class="section container">
      <h2 class="h3 section__title">Fler plattformar</h2>
      <div class="platforms__cards platforms__cards--page">{others}</div>
    </section>
    {cta(p)}
  </main>'''
        yield write(f'plattformar/{x["slug"]}.html', document(p, x["name"], main, "subpage",
                    [("Plattformar", "plattformar/index.html"), (x["name"], "")], None))


def build_simple():
    p = ""
    current_map = {"kontakt": "kontakt"}
    for slug, page in SIMPLE_PAGES.items():
        parts = []
        for kind, value in page["sections"]:
            if kind == "text":
                parts.append(f'<section class="section container"><p class="preamble prose">{esc(value)}</p></section>')
            elif kind == "cols":
                cards = "".join(
                    f'<div class="info-card"{" id=\"folj-oss\"" if t == "Följ oss" else ""}><h2 class="info-card__title">{esc(t)}</h2><p>{d}</p></div>'
                    for t, d in value)
                parts.append(f'<section class="section container"><div class="card-grid">{cards}</div></section>')
            elif kind == "team":
                people = "".join(
                    f'''<article class="person">
          <span class="person__mark" aria-hidden="true">{esc(name[0])}</span>
          <h2 class="person__name">{esc(name)}</h2>
          <p class="person__role">{esc(role)} · Elevate Studio</p>
          <ul class="person__links">
            <li><a href="tel:{phone.replace(" ", "")}">{esc(phone)}</a></li>
            <li><a href="mailto:{email}">{esc(email)}</a></li>
          </ul>
        </article>''' for name, role, phone, email in value)
                parts.append(f'<section class="section container"><div class="people">{people}</div></section>')
            elif kind == "links":
                links = "".join(f'<li><a href="{href}" class="arrow-link">{esc(label)}</a></li>' for label, href in value)
                parts.append(f'<section class="section container"><ul class="link-list">{links}</ul></section>')
            elif kind == "form":
                parts.append(f'''<section class="standout">
      <div class="container standout__row">
        <div class="standout__intro">
          <h2 class="h2">Skriv till <em>oss</em></h2>
          <p>Fyll i formuläret så återkommer vi. Eftersom det här är en designstudie skickas inget – men flödet fungerar precis som på riktigt.</p>
        </div>
        {contact_form(p)}
      </div>
    </section>''')
        body = "\n    ".join(parts)
        tail = "" if slug == "kontakt" else cta(p)
        main = f'''<main>
    {page_hero(esc(page["title"]), page["lead"])}
    {body}
    {tail}
  </main>'''
        yield write(f"{slug}.html", document(p, page["title"], main, "subpage", [(page["title"], "")], current_map.get(slug)))


def build_test_page():
    p = ""
    main = f'''<main>
    <section class="page-hero sitetest-hero">
      <div class="container">
        <p class="page-hero__eyebrow">Gratis djuptest</p>
        <h1 class="page-hero__title">Hur presterar <em>din sajt?</em></h1>
        <p class="page-hero__lead">Skriv in din adress så testar vi sidan i en riktig webbläsare på cirka 30 sekunder. Du får betyg för prestanda, tillgänglighet, bästa praxis och SEO – och konkreta förslag på hur allt kan åtgärdas.</p>
        <form class="sitetest__form" id="sitetest-form" data-api-key="{esc(PSI_API_KEY)}" data-prefix="{p}" novalidate>
          <label class="sitetest__field"><span class="sr-only">Webbadress</span>
            <input type="text" name="url" inputmode="url" autocomplete="url" placeholder="dittforetag.se" required>
          </label>
          <fieldset class="sitetest__device">
            <legend class="sr-only">Enhet</legend>
            <label><input type="radio" name="strategy" value="mobile" checked><span>Mobil</span></label>
            <label><input type="radio" name="strategy" value="desktop"><span>Dator</span></label>
          </fieldset>
          <button type="submit" class="btn btn--primary"><span>Starta djuptest</span></button>
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
    {cta(p, "Hellre att vi tittar åt dig?", "Vi gör gärna en personlig genomgång av din sajt och berättar vad som ger mest effekt.")}
  </main>'''
    yield write("testa.html", document(p, "Testa din sajt", main, "subpage", [("Testa din sajt", "")], None, extra_js=("sitetest.js",)))


def rewrap(path, body_class, crumbs=None, extra_js=()):
    """Re-wrap a hand-written page's <main> with the generated shell."""
    src = (ROOT / path).read_text(encoding="utf-8")
    main = re.search(r"<main[\s\S]*?</main>", src).group(0)
    title = re.search(r"<title>(.*?) \| Designstudie</title>", src).group(1)
    return write(path, document("", html.unescape(title), main, body_class, crumbs, None, extra_js=extra_js))


def platforms_section():
    cards = "".join(platform_card("", x) for x in PLATFORMS)
    return f'''<section class="block platforms">
      <div class="container">
        <h2 class="block__header">Våra <span>plattformar</span></h2>
        <div class="platforms__row">
          <aside class="platforms__aside">
            <p>Verktygen vi bygger med – samma som användes för att bygga just den här sajten. Vi hjälper er att välja det som passar er bäst.</p>
            <a href="plattformar/index.html" class="arrow-link">Läs mer</a>
          </aside>
          <div class="platforms__cards">{cards}</div>
        </div>
      </div>
    </section>'''


def main():
    built = []
    for gen in (build_services, build_cases, build_articles, build_platforms, build_simple, build_test_page):
        built.extend(gen())
    # Keep the homepage lists in sync with the data (regions between build markers).
    index = ROOT / "index.html"
    src = index.read_text(encoding="utf-8")
    pattern = [True, False, False, True]
    regions = {
        "posts": featured_posts("", ARTICLES),
        "platforms": platforms_section(),
    }
    for name, markup in regions.items():
        src, n = re.subn(rf"<!-- build:{name} -->[\s\S]*?<!-- /build:{name} -->",
                         lambda _m, name=name, markup=markup: f"<!-- build:{name} -->{markup}<!-- /build:{name} -->", src)
        if n > 1:
            raise SystemExit(f"index.html: marker for {name!r} found {n} times")
    index.write_text(src, encoding="utf-8")
    built.append(rewrap("index.html", "home", extra_js=("home.js",)))
    built.append(rewrap("404.html", "error404", crumbs=[("Fel 404", "")]))
    print(f"Built {len(built)} pages")


if __name__ == "__main__":
    main()
