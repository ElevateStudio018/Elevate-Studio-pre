"""E-mail templates: the newsletter (latest article) and the welcome mail for new subscribers.

Writes mejl/nyhetsbrev.html and mejl/valkommen.html — 600 px tables with inline CSS and
web-safe fonts so they render in Gmail, Outlook and Apple Mail. Paste them into the
newsletter tool (Brevo, Mailchimp …). Images point at the live site, so they show once
elevatestudio.nu is published.

    python3 tools/mail_templates.py            # absolute image URLs (for sending)
    python3 tools/mail_templates.py <dir> <base>  # preview copy with another image base
"""
import html
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from content import ARTICLES, SITE_URL  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "mejl")
BASE = (sys.argv[2] if len(sys.argv) > 2 else SITE_URL).rstrip("/") + "/assets/img/"

G, G_DARK, G_DEEP, C, MUTED, LINE = "#1d3b2a", "#17301f", "#12271b", "#fdfbf5", "#9fc0a8", "rgba(253,251,245,.18)"
W, INK, GREY = "#ffffff", "#1d3b2a", "#5f6b63"
SANS = "Arial, Helvetica, sans-serif"
SERIF = "Georgia, 'Times New Roman', serif"
e = html.escape


def url(a):
    return f"{SITE_URL}/insikter/{a['slug']}.html"


def intro(a):
    return next(v for k, v in a["body"] if k == "p")


def logo():
    return (f'<table role="presentation" cellpadding="0" cellspacing="0"><tr>'
            f'<td style="padding-right:10px;vertical-align:middle"><img src="{BASE}brand/mail-mark-cream.png" width="30" height="22" alt="" style="display:block"></td>'
            f'<td style="vertical-align:middle;font:bold 15px {SANS};color:{C}">Elevate Studio</td></tr></table>')


def button(href, text, bg, fg):
    return (f'<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:{bg};border-radius:24px">'
            f'<a href="{href}" style="display:inline-block;padding:13px 26px;font:bold 15px {SANS};color:{fg};text-decoration:none">{text} &rarr;</a></td></tr></table>')


def article_list(items, title):
    rows = "".join(
        f'<tr><td style="padding:14px 0;border-top:1px solid {LINE}"><a href="{url(a)}" style="font:bold 16px/1.4 {SANS};color:{W};text-decoration:none">{e(a["title"])} &rarr;</a>'
        f'<div style="font:13px {SANS};color:{MUTED};margin-top:4px">{e(a["date"])}</div></td></tr>' for a in items)
    return (f'<p style="margin:0 0 6px;font:bold 12px {SANS};letter-spacing:1.4px;text-transform:uppercase;color:{MUTED}">{title}</p>'
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{rows}</table>')


def footer(reason):
    return (f'<tr><td style="padding:30px 40px 36px;background:{W};font:13px/1.6 {SANS};color:{GREY}">'
            f'<p style="margin:0 0 6px;color:{INK};font-weight:bold">Elevate Studio · Uppsala</p>'
            f'<p style="margin:0 0 14px"><a href="mailto:info@elevatestudio.nu" style="color:{INK};text-decoration:none">info@elevatestudio.nu</a> · '
            f'<a href="{SITE_URL}" style="color:{INK};text-decoration:none">elevatestudio.nu</a></p>'
            f'<p style="margin:0">{reason} <a href="{{{{unsubscribe}}}}" style="color:{INK}">Avsluta prenumeration</a></p></td></tr>')


def watermark():
    return f'<tr><td style="padding:6px 40px 0" align="right"><img src="{BASE}brand/mail-mark-watermark.png" width="150" alt="" style="display:block"></td></tr>'


def shell(title, preheader, inner):
    return (f'<!DOCTYPE html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
            f'<title>{e(title)}</title></head><body style="margin:0;padding:0;background:{G_DEEP}">'
            f'<div style="display:none;max-height:0;overflow:hidden;opacity:0">{e(preheader)}</div>'
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{G_DEEP}"><tr><td align="center" style="padding:32px 12px">'
            f'<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:{G};border-radius:14px;overflow:hidden">'
            f'{inner}</table></td></tr></table></body></html>')


def newsletter():
    a, rest = ARTICLES[0], ARTICLES[1:3]
    tags = " · ".join(a["terms"])
    inner = f'''
<tr><td style="padding:36px 40px 10px">{logo()}</td></tr>
<tr><td style="padding:22px 40px 26px;font:15px/1.6 {SANS};color:{C}">Hej! Här kommer senaste nytt från Elevate Studio.</td></tr>
<tr><td style="padding:0 28px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{W};border-radius:14px;overflow:hidden">
    <tr><td><img src="{BASE}{a["image"]}" width="544" alt="" style="display:block;width:100%;height:auto;max-height:280px;object-fit:cover"></td></tr>
    <tr><td style="padding:26px 30px 4px;font:italic 15px {SERIF};color:#4f7a60">{e(tags)}</td></tr>
    <tr><td style="padding:0 30px;font:bold 26px/1.25 {SANS};color:{INK}">{e(a["title"])}</td></tr>
    <tr><td style="padding:14px 30px 24px;font:16px/1.6 {SANS};color:{GREY}">{e(intro(a))}</td></tr>
    <tr><td style="padding:0 30px 30px">{button(url(a), "Läs artikeln", G, C)}</td></tr>
  </table>
</td></tr>
<tr><td style="padding:36px 40px 10px">{article_list(rest, "Fler artiklar")}</td></tr>
{watermark()}
{footer("Du får det här mejlet för att du prenumererar på nyhetsbrevet från Elevate Studio.")}'''
    return shell(a["title"], "Senaste nytt från Elevate Studio.", inner)


def welcome():
    points = [
        ("Tips du kan använda direkt", "Om hemsidor, synlighet på Google och hur kunder hittar dig via AI."),
        ("Nytt från oss", "När vi skrivit något nytt eller har något värt att berätta."),
        ("Inget spam", "Bara när vi har något att säga. Avsluta när du vill med ett klick."),
    ]
    rows = "".join(
        f'<tr><td style="padding:0 0 18px;vertical-align:top;width:34px"><div style="width:24px;height:24px;border-radius:12px;background:{G};color:{C};font:bold 13px/24px {SANS};text-align:center">{i}</div></td>'
        f'<td style="padding:0 0 18px;font:15px/1.55 {SANS};color:{GREY}"><b style="color:{INK}">{e(t)}</b><br>{e(d)}</td></tr>'
        for i, (t, d) in enumerate(points, 1))
    inner = f'''
<tr><td style="padding:36px 40px 10px">{logo()}</td></tr>
<tr><td style="padding:34px 40px 8px;font:bold 34px/1.15 {SANS};color:{W}">Tack för att du vill <span style="font:italic normal 36px {SERIF};color:{C}">höra från oss.</span></td></tr>
<tr><td style="padding:12px 40px 30px;font:16px/1.6 {SANS};color:{C}">Du är nu med på Elevate Studios nyhetsbrev. Kul att ha dig här!</td></tr>
<tr><td style="padding:0 28px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{W};border-radius:14px">
    <tr><td style="padding:28px 30px 10px">
      <p style="margin:0 0 18px;font:bold 12px {SANS};letter-spacing:1.4px;text-transform:uppercase;color:#4f7a60">Det här får du</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">{rows}</table>
    </td></tr>
    <tr><td style="padding:0 30px 30px">{button(SITE_URL + "/insikter/", "Läs senaste nytt", G, C)}</td></tr>
  </table>
</td></tr>
<tr><td style="padding:36px 40px 10px">{article_list(ARTICLES[:3], "Börja här")}</td></tr>
<tr><td style="padding:22px 40px 0;font:15px/1.6 {SANS};color:{C}">Funderar du på en ny hemsida? Svara bara på det här mejlet, så hör vi av oss.</td></tr>
{watermark()}
{footer("Du får det här mejlet för att du anmält dig till nyhetsbrevet från Elevate Studio.")}'''
    return shell("Välkommen till Elevate Studio", "Tack för att du vill höra från oss.", inner)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, body in (("nyhetsbrev.html", newsletter()), ("valkommen.html", welcome())):
        with open(os.path.join(OUT, name), "w") as f:
            f.write(body)
    print("Wrote", OUT)
