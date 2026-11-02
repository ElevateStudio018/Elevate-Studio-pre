# Kundadmin – en adminpanel för alla kundsajter

En och samma adminpanel för alla kunder, oavsett om sajten är byggd i HTML, React eller något annat.
Panelen ligger på **elevatestudio.nu/kundadmin** och ser likadan ut för alla, men tar färgerna från kundens hemsida.

## Så hänger det ihop
- **Panelen** (`kundadmin/`): design 1 (lång sidomeny), 5 (AI-assistent överst) och 6 (redigera direkt på sajten).
- **Sajtskriptet** (`assets/js/elevate-site.js`): en rad på kundens sajt. Hämtar publicerade texter, bilder och listor,
  skickar formulär till panelens inkorg och gör att **dittforetag.se/admin** öppnar panelen.
- **Databasen** (`supabase/sql/2026-11-06_kundadmin.sql`): sajter, texter (utkast + publicerat), listor, förfrågningar,
  bokningar och bilder. Behörigheter: ägare/admin/teknisk ändrar, övriga läser och hanterar förfrågningar.
- **Servern** (`worker/kundadmin.js`): innehåll till sajterna, förfrågningar (sparas med servicenyckeln, mejl till kunden),
  färger från kundens sajt och AI-assistenten. Assistenten föreslår bara – kunden klickar "Gör det".

## Koppla en ny kundsajt (10–30 min)
1. Skapa sajten i Supabase: `insert into sites (company_id, slug, name, domain) values (...)`.
2. Lägg in skriptet sist i `<body>`:
   `<script src="https://elevatestudio.nu/assets/js/elevate-site.js" data-site="SLUG" defer></script>`
3. Märk upp det kunden ska kunna ändra:
   - text: `<h1 data-es="hero.title">Standardtext</h1>` · bild: `<img data-es="hero.image" src="...">`
   - listor: `<div data-es-list="project"><template>…{{title}}…{{image}}…</template></div>` (project, service, news, review)
   - kontaktuppgifter: `<span data-es-set="phone">`, `hours`, `email`, `address`
   - formulär: `<form data-es-form>` med fälten name, email, phone, service, message
4. **/admin på statiska värdar** (GitHub Pages m.fl.): lägg en fil `admin/index.html` som laddar samma skript, så skickas
   besökaren vidare till panelen. På Cloudflare kan i stället en omdirigering /admin → panelen läggas in.
5. Logga in i panelen → Inställningar → "Hämta färger från hemsidan" → Spara.

## Lägga till en ny adminsida (modul)
1. Lägg till raden i `MODULES` i `kundadmin/app.js` (id, namn, ikon).
2. Är det en lista: lägg till en `kind` i `KIND`, fälten i `FIELDS` och värdet i `site_items.kind`-kontrollen i SQL.
   Då får modulen lista, formulär, bilder, sortering, visa/dölj och ta bort automatiskt.
3. Är det något eget: skriv en vyfunktion och lägg den i `shell()`.
4. Lägg till modulens id i `sites.modules` för de kunder som ska ha den.

## Det som behövs för att gå live
- Kör `2026-11-02_portal.sql` (om inte redan gjort) och sedan `2026-11-06_kundadmin.sql`.
- Cloudflare-secrets: `SUPABASE_SERVICE_KEY` (krävs), `ANTHROPIC_API_KEY` (för AI-assistenten; utan den används en enkel tolkare)
  och Gmail-uppgifterna om kunden ska få mejl vid nya förfrågningar.
- Skapa kundens användare i kundportalen och koppla dem till företaget (`company_members`).

## Koppla AI-assistenten (Anthropic) – steg för steg
Utan nyckel fungerar assistenten ändå, men bara för enkla önskemål (öppettider, telefon, rubrik, nytt projekt).
Med nyckeln förstår den fritt formulerade önskemål och skriver texter åt kunden.

1. Gå till **console.anthropic.com** och logga in (skapa konto med info@elevatestudio.nu om det behövs).
2. **Settings → Billing**: lägg in ett betalkort och fyll på t.ex. 10 USD. En ändring kostar några öre.
3. **Settings → API keys → Create key**. Döp den till `elevate-kundadmin` och kopiera nyckeln (börjar med `sk-ant-`).
   Den visas bara en gång.
4. Gå till **dash.cloudflare.com → Workers & Pages → elevate-studio-pre → Settings → Variables and Secrets**.
5. Klicka **Add**, välj **Secret**, skriv namnet `ANTHROPIC_API_KEY`, klistra in nyckeln och spara.
6. Klart. Nästa gång en kund skriver i assistentrutan används Claude (modellen claude-opus-5-5).
   Kontroll: skriv något fritt i rutan, t.ex. "skriv en kortare text om oss". Utan nyckel svarar den
   "Jag förstod inte riktigt", med nyckeln får du ett textförslag.

Tips: sätt en månadsgräns under **Settings → Limits** så att kostnaden aldrig drar iväg.
