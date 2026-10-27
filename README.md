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

## Bygga om sidorna

Innehållet ligger i `tools/content.py` och mallarna i `tools/build.py`. Kör så här efter en ändring:

```
python3 tools/build.py
```

Skriptet genererar alla undersidor. Det lägger också samma header, menyer, footer och cookie-dialog runt `index.html` och `404.html`.

Startsidans listor över projekt, artiklar och plattformar fylls i mellan markörerna `<!-- build:… -->`. Övrigt innehåll i `<main>` på startsidan och 404-sidan redigeras direkt i filerna.

## Vad som medvetet skiljer sig från förlagan

- **Texter**: alla texter är nyskrivna. Kunderna och projekten är påhittade. Citaten är märkta som exempel.
- **Bilder**: fotografierna är ersättningsbilder från Unsplash, hämtade via Picsum och fria att använda enligt Unsplash-licensen. Övrig grafik är egna SVG-filer.
- **Logotyp och ikoner**: egen ordmärkning och egna plattformsikoner.
- **Typsnitt**: Hanken Grotesk och Fraunces Italic, båda med OFL-licens och lokalt i `assets/fonts/`.
- **Formulär**: formulären skickar ingenting. De visar bara en bekräftelse.
