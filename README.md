# Designstudie: byråsajt

En privat layoutstudie av en byråsajt. Sidan är inte officiell och har ingen koppling till originalets ägare. Det står också i en banner högst upp på varje sida.

Färgschemat är mörkgrönt (`#1d3b2a`) med en mjölkvit beige (`#f5f0e6`) som andrafärg. Båda styrs av CSS-variablerna `--accent` och `--cream` i `assets/css/style.css`.

## Sidor

Sajten har 39 sidor, och alla knappar och länkar leder till riktiga sidor.

| Avsnitt | Filer |
|---|---|
| Startsida, 404 | `index.html`, `404.html` |
| Tjänster | `tjanster/index.html` och 6 tjänstesidor |
| Projekt | `projekt/index.html` och 6 projektsidor (påhittade) |
| Insikter | `insikter/index.html` och 3 artiklar |
| Plattformar | `plattformar/index.html` och 6 sidor: HTML & CSS, JavaScript, React, Node.js, Python, Playwright |
| Övrigt | kontakt, om studion, karriär, öppna roller, arbetsvillkor, ansvar, in English, integritet, cookies, visselblåsning, guide, AI-sök |

Plattformarna är de verktyg som faktiskt användes för att bygga studien. Varje plattformssida har en sektion som beskriver hur verktyget användes i just det här projektet.

## Testa din sajt (`testa.html`)

Verktyget kör ett riktigt test med Google PageSpeed Insights (Lighthouse) och förklarar på svenska hur varje problem kan åtgärdas. Inga resultat är påhittade. Om testet inte kan köras visas ett felmeddelande i stället.

Utan egen API-nyckel delar alla besökare på Googles gemensamma dagskvot, och den tar ofta slut. Så här skaffar du en gratis nyckel:

1. Gå till Google Cloud Console.
2. Välj **APIs & Services**, aktivera **PageSpeed Insights API** och skapa en API-nyckel under **Credentials**.
3. Begränsa nyckeln till er domän (HTTP referrers).
4. Lägg in den i `PSI_API_KEY` i `tools/content.py` och kör `python3 tools/build.py`.

## Bygga om sidorna

Innehållet ligger i `tools/content.py` och mallarna i `tools/build.py`. Kör så här efter en ändring:

```
python3 tools/build.py
```

Skriptet genererar alla undersidor. Det lägger också samma header, menyer, footer och cookie-dialog runt `index.html` och `404.html`.

Startsidans listor över projekt, artiklar och plattformar fylls i mellan markörerna `<!-- build:… -->`. Övrigt innehåll i `<main>` på startsidan och 404-sidan redigeras direkt i filerna.

## Vad som medvetet skiljer sig från förlagan

- **Texter**: alla texter är nyskrivna. Kunderna och projekten är påhittade. Recensionen på startsidan är en riktig kundrecension från Google.
- **Bilder**: hero-fotot kommer från Pexels (foto 3184360, https://www.pexels.com/photo/3184360/) och används enligt Pexels-licensen. Övriga fotografier är ersättningsbilder från Unsplash, hämtade via Picsum och fria att använda enligt Unsplash-licensen. Övrig grafik är egna SVG-filer.
- **Logotyp och ikoner**: Elevate Studios egen logotyp (`assets/img/brand/`, vektoriserad från originalfilen) och egna plattformsikoner.
- **Typsnitt**: Hanken Grotesk och Fraunces Italic, båda med OFL-licens och lokalt i `assets/fonts/`.
- **Formulär**: formulären skickar ingenting. De visar bara en bekräftelse.
