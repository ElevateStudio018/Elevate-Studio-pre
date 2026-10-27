# Designstudie: byråsajt

En privat layoutstudie av en byråsajt med två sidor. Sidan är inte officiell och har ingen koppling till originalets ägare. Det står också i en banner högst upp på varje sida.

| Sida | Fil |
|---|---|
| Startsida | `index.html` |
| 404-sida | `404.html` |

Öppna filerna direkt i webbläsaren. Inget byggsteg behövs.

## Vad som har återskapats

Layouten har mätts mot originalet i en headless-webbläsare och byggts om med egen CSS (`assets/css/style.css` och `assets/css/home.css`).

**Gemensamt för båda sidorna**

- Fast header med meny-knapp, megameny, hamburgerpanel, helskärmsmeny på mobil och cookie-dialog.
- Brytpunkterna 1300, 1200, 992, 768 och 576 px.

**Startsidan**

- Hero med flytande ring och fyra tjänstekort med hover-text.
- Ett utvalt innehåll med bild och text.
- Projektrutnät 58/42 med mörkt hover-lager.
- Logotyprad.
- Insikter: tre kort som blir blå vid hover.
- Processflikar med blå ring.
- Plattformskort med hover-text.
- Om oss, två citat och tre siffror som räknas upp.
- Fyra kortpar.
- Kontaktformulär och sidfot med logotyprad.
- På mobil blir heroens kort, processtegen och plattformskorten karuseller med scroll-snap.

**404-sidan**

- Brödsmula, stor kursiv 404 och knapp.

## Vad som medvetet skiljer sig

- **Texter**: alla rubriker och brödtexter är nyskrivna. Kunderna och projekten är påhittade. Citaten är märkta som exempel.
- **Bilder**: fotografierna är ersättningsbilder från Unsplash, hämtade via Picsum och fria att använda enligt Unsplash-licensen. Varje bild är beskuren till originalets format. Hero-ringen, fallillustrationen, webbinariegrafiken, kundlogotyperna, plattformsikonerna och sigillet är egna SVG-filer i `assets/img/home/`.
- **Logotyp**: en egen ordmärkning i samma 180×60-yta.
- **Typsnitt**: Hanken Grotesk och Fraunces Italic, båda med OFL-licens och lokalt i `assets/fonts/`. De ersätter originalets licensierade typsnitt.
- **Formulär**: formulären skickar ingenting.
