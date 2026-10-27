# Designstudie: 404-sida

En privat layoutstudie av en byrås 404-sida. Sidan är inte officiell och har ingen koppling till originalets ägare. Det står också i en banner högst upp på sidan.

Öppna `index.html` direkt i webbläsaren. Inget byggsteg behövs.

## Vad som har återskapats

Följande har mätts mot originalet i en headless-webbläsare och byggts om med egen CSS:

- Header (158 px, fast, med skugga) med logotypyta, navigering och rund meny-knapp.
- Brödsmula med pil.
- Sandfärgad bakgrund med en stor kursiv "404" nere till höger. Siffran har samma ruta (826×352) och samma storlekar per brytpunkt (720/520/320 px).
- Rubrik, kursiv blå textrad, brödtext och knapp på samma koordinater.
- Megameny (desktop), hamburgerpanel (desktop) och helskärmsmeny (mobil) med utfällbar undermeny.
- Hover-effekter: understrykning som växer från mitten, färgbyten på knappar och inverterad meny-knapp.
- Headern krymper vid scroll. Escape och klick utanför stänger menyerna.
- Cookie-dialog. Valet sparas bara lokalt.
- Brytpunkterna 1300, 1200, 992, 768 och 576 px.

## Vad som medvetet skiljer sig

- **Texter**: alla texter är nyskrivna, med ungefär samma längd som originalets.
- **Logotyp**: en egen ordmärkning i samma 180×60-yta.
- **Typsnitt**: originalets licensierade typsnitt används inte. Hanken Grotesk ersätter sans-serifen och Fraunces Italic ersätter den kursiva antikvan. Båda har OFL-licens och ligger lokalt i `assets/fonts/`.
- **404-grafiken**: genererad från Frauncess glyfer (`assets/img/404.svg`).
- Originalsidan har inga fotografier, så inga bilder behövde ersättas.

## Visuell kontroll

Jämförelsen gjordes med banner och cookie-dialog dolda, vid 1440×900, 1024×768, 768×1024 och 390×844:

| Element | Avvikelse mot originalet |
|---|---|
| Logotypyta, meny-knapp, rubrik, brödtext, knapp | 0 px i position |
| Kursiv textrad | 0 px i position |
| 404-grafik (övre kant och höger kant) | 0 px |
| Navigeringstext (blå) | under 1 px vertikalt |
| Brödsmula | cirka 1 px |
