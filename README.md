# Elevate Studio

Webbplatsen för Elevate Studio, en webbyrå i Uppsala som bygger hemsidor som ger förfrågningar.

Färgschemat är mörkgrönt (`#1d3b2a`) med en mjölkvit beige som andrafärg. Båda styrs av CSS-variablerna `--accent` och `--cream` i `assets/css/style.css`.

## Sidor

| Avsnitt | Filer |
|---|---|
| Startsida, 404 | `index.html`, `404.html` |
| Tjänster | `tjanster/index.html` och 5 tjänstesidor: hemsidor, AI-chatt, bokning och offert, SEO och AI-optimering, support och underhåll |
| Priser | `priser.html` – Starter 3 000 kr, Pro 6 000 kr och Elite (offert) |
| Exempelavtal | `avtal.html` – en riktig offert med namn, organisationsnummer, offertnummer och datum borttagna. Nedladdningsbar som `assets/docs/webbavtal-exempel-elevate-studio.pdf`, som skapas från sidan med `node tools/agreement_pdf.js` efter `python3 tools/build.py` |
| Senaste nytt | `insikter/index.html` och 3 artiklar |
| Projekt | `projekt/index.html` och 6 projektsidor (påhittade exempel, märkta som det) |
| Plattformar | `plattformar/index.html` och 6 sidor: HTML & CSS, JavaScript, React, Node.js, Python, Playwright |
| Landningssidor | `webbyra-uppsala.html`, `hemsida-for-hantverkare.html`, `billig-hemsida.html` – innehållet ligger i `LANDINGS` i `tools/content.py` |
| Övrigt | kontakt, om oss, in English, integritet, cookies, testa din sajt |

## Formulär

Alla formulär (kontakt, nyhetsbrev och "kör testet åt mig" på testsidan) skickas till info@elevatestudio.nu via FormSubmit. Adressen ställs in i `FORM_ENDPOINT` i `tools/content.py`.

**Första gången** någon skickar ett formulär från den publicerade sajten mejlar FormSubmit en aktiveringslänk till info@elevatestudio.nu. Klicka på den en gång, sedan levereras alla meddelanden.

## Webbstatistik

Google Analytics laddas bara om besökaren godkänner statistikcookies. Lägg in ert mät-ID (`G-…`) i `GA_MEASUREMENT_ID` i `tools/content.py` och kör `python3 tools/build.py`. Så länge fältet är tomt visas ingen cookieruta och inget analysverktyg laddas.

## SEO och AI-optimering

Varje sida får titel, metabeskrivning, canonical-länk, Open Graph-taggar för delning och strukturerad data (schema.org): företaget, brödsmulor, tjänster, priser, artiklar och vanliga frågor. Bygget skapar också `sitemap.xml`, `robots.txt` (som uttryckligen släpper in AI-sökrobotar), `rss.xml`, `llms.txt` (en sammanfattning för AI-assistenter) och `llms-full.txt` (all text om tjänster, landningssidor och artiklar). Varje tjänstesida och landningssida har vanliga frågor med strukturerad data. Adressen som används är `SITE_URL` i `tools/content.py`.

## Testa din sajt (`testa.html`)

Verktyget kör ett riktigt test med Google PageSpeed Insights (Lighthouse) och förklarar på svenska hur varje problem kan åtgärdas. Inga resultat är påhittade. Om testet inte kan köras visas ett felmeddelande i stället.

Utan egen API-nyckel delar alla besökare på Googles gemensamma kvot. Om den tar slut försöker sidan igen en gång, kör säkerhetstestet ändå och erbjuder besökaren att lämna sin e-post så att ni kör testet åt dem – förfrågan går till info@elevatestudio.nu. Med en egen gratis nyckel försvinner problemet:

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

Startsidans tjänster, artiklar, plattformar och kontaktformulär fylls i mellan markörerna `<!-- build:… -->`. Övrigt innehåll i `<main>` på startsidan och 404-sidan redigeras direkt i filerna.

## Innehåll och licenser

- **Texter**: alla texter är nyskrivna. Projekten under Projekt är påhittade exempel. Recensionen på startsidan är en riktig kundrecension från Google.
- **Bilder**: hero-fotot kommer från Pexels (foto 3184360, https://www.pexels.com/photo/3184360/) och används enligt Pexels-licensen. Bilderna i processavsnittet (`process-1.jpg`–`process-5.jpg`) är Pexels-foton 3182759, 7688336, 3861958, 7709242 och 3184292, också enligt Pexels-licensen. Laptop- och mobilbilden i avsnittet "Sajter som känns rätt på alla skärmar" är skärmdumpar av vår egen testsajt https://elevatestudio018.github.io/lirk/. Tjänstebilderna (`svc-*.jpg`) och artikelbilderna är också Pexels-foton. Bilderna i Vi är Elevate Studio (`about-1.jpg`–`about-3.jpg`) är Pexels-foton 3182827, 196644 och 16019722. Projektbilderna är från Unsplash via Picsum. Övrig grafik är egna SVG-filer.
- **Logotyp och ikoner**: Elevate Studios egen logotyp (`assets/img/brand/`, vektoriserad från originalfilen) och egna plattformsikoner.
- **Typsnitt**: Hanken Grotesk och Fraunces Italic, båda med OFL-licens och lokalt i `assets/fonts/`.

## Mejl från info@elevatestudio.nu

Alla mejl till kunder skickas från **info@elevatestudio.nu** via Brevo, med funktionen
`supabase/functions/mail` (kontaktformulärets bekräftelse, avisering till info@, recensionsmejl
från admin och anmälan till nyhetsbrevet). Nyhetsbreven skrivs och skickas i Brevo.

1. Skapa ett konto på brevo.com (gratis upp till 300 mejl/dag).
2. Brevo → Senders, domains → lägg till domänen `elevatestudio.nu` och avsändaren `info@elevatestudio.nu`.
   Lägg in DNS-posterna Brevo visar i Cloudflare (där domänens DNS ligger). Mejlen på Loopia påverkas inte.
3. Brevo → Contacts → Lists → skapa listan "Nyhetsbrev" och notera dess ID.
   Lägg `mejl/valkommen.html` som automatiskt välkomstmejl när någon läggs till i listan.
4. Brevo → SMTP & API → skapa en API-nyckel.
5. I ert eget Supabase-projekt: `supabase functions deploy mail` och
   `supabase secrets set BREVO_API_KEY=... BREVO_LIST_ID=...`.
6. Sätt `MAIL_LIVE = True` i `tools/content.py` och kör `python3 tools/build.py`.

Innan dess sparas leads direkt i databasen och FormSubmit aviserar info@.
