# Granskning 2026-11-02 – domäner, mejl, kassa, kundportal, admin

Status: VERIFIERAT = testat och fungerar. DELVIS FÄRDIGT = finns men saknar delar. SAKNAS = inte byggt.
EJ VERIFIERAT = kunde inte testas här. Ingen riktig betalning eller registrering har gjorts.

## Tester som kördes (alla kan köras igen)
| Test | Typ | Resultat |
|---|---|---|
| `node --test tests/worker.test.mjs` | automatiskt, server | 14/14 |
| `tests/rls_test.sql` mot PostgreSQL 16 med Supabase-liknande auth | automatiskt, databas/behörighet | 20/20 kontroller sanna, intrångsförsök stoppade |
| `node tests/e2e.mjs` (kundresa, riktig serverkod, riktiga register/DNS) | automatiskt, webbläsare | 44/44 |
| `node tests/admin_e2e.cjs` (admin med testdata) | automatiskt, webbläsare | 6/6 |
| `node tests/sitetest_e2e.cjs` (snabbtest mot Google, PDF, offert) | automatiskt, webbläsare | 8/8 |
| `node --check` på all JavaScript | syntax | inga fel |
| `python3 tools/build.py` | produktionsbygge | 285 sidor |

Projektet använder inte TypeScript och har ingen lintkonfiguration; därför kördes ingen typkontroll eller lint.

## Fel som hittades och åtgärdades
1. Flytt av domän prissattes som nyregistrering på servern (`worker/orders.js`).
2. Samma beställning kunde skickas två gånger (dubbelklick/omförsök). Nu en nyckel per kassa → samma ordernummer, unik i databasen.
3. Kund med ägarroll kunde ändra pris och status på sina tjänster och prioritet/företag på ärenden via API:t. Nu spärrat med trigger i databasen (`supabase/sql/2026-11-02_portal.sql`).
4. Domännamn valideras nu även i kassan på servern.
5. CSS för klasser som skapas av JavaScript togs bort vid bygget (grön "Ledig" m.m. syntes inte). Safelist i `tools/purge_css.js`.
6. Mejlkontrollens knapp hamnade utanför skärmen på mobil (15 px för brett).
7. Admin Beställningar skickade statusändringar flera gånger efter att vyn öppnats igen.
8. Demodatan i portalen kopplade andra företaget till fel användare (företagsbyte fungerade inte i demon).
9. Kalendern i mejlkortet borttagen enligt önskemål.

## Krav (masterprompten + senare önskemål)
VERIFIERAT (testat)
- Domänsökning på 12 toppdomäner, riktig tillgänglighet (register via RDAP, annars DNS märkt "Sannolikt ledig")
- Filter per toppdomän, sortering på relevans/pris/popularitet, förnyelsepris, varning vid högt förnyelsepris
- Namnförslag som alltid kontrolleras innan de visas
- Lägga flera produkter i varukorg, välja år/period, ta bort, spara mellan sidor
- Engångs- och återkommande kostnad, moms, totalsumma
- Kassa: validering (namn, e-post, villkor), servern prissätter om, okända produkter avvisas, inga negativa antal
- Orderbekräftelse som skiljer betalning från registrering, varukorgen töms
- Skydd mot dubbla beställningar
- Företagsmejl: paket per månad/år, extra konton, adresser, mejlkontroll MX/SPF/DKIM/DMARC med förklaring, installationsguider
- Kundportal (med testdata): översikt med varningar, tjänster, automatisk förnyelse med bekräftelse vid avstängning, fakturor efter roll, supportärende, tråd, löst/öppna igen, konto, företagsbyte, utloggning
- Behörigheter i databasen: kunder ser bara sina företag, vanlig användare ser inte fakturor, ingen kan skriva i andra företags ärenden, utloggad ser ingenting, admin ser allt, kunden kan inte ändra pris
- Admin: Beställningar (status, betalning och leverans var för sig), Sajttester, Nyhetsbrev, pratbubbla på staplar
- Testa din sajt: snabbtest, PDF, "Låt oss ta hand om det" med förvald rubrik och rapport
- Mobil 390 px utan sidledsscroll på startsida, domäner, mejl, kassa, portal, testa
- Inga hemliga nycklar i frontend; ResellerClub-nyckeln finns inte i repot

DELVIS FÄRDIGT
- Betalning: kassan fungerar men ingen betalning sker (ingen Stripe). Ordern bekräftas med offert.
- Domänhantering i portalen: visa, förnya automatiskt. DNS, namnservrar, överföringskod, vidarebefordran: via supportärende.
- Mejladministration: beställning finns. Skapa/ta bort konton, alias, lagring: kräver mejlleverantör.
- Företagspaket: definierade i katalogen, inte som köpbara paket med rabatt.
- Admininställningar för priser: priserna ändras i `assets/data/catalog.json`, inte i admin.
- Kundkonto: inloggning, lösenordsbyte, 2FA och glömt lösenord finns; konton skapas av Elevate Studio (ingen självregistrering).
- Notifieringar: visas i portalen om de finns i databasen; inga automatiska utskick.
- Juridik: villkorsutkast, kräver juridisk granskning.

EJ VERIFIERAT
- Allt mot riktiga Supabase: tabellerna finns inte än (SQL ej körd) och SUPABASE_SERVICE_KEY saknas i Cloudflare.
- Riktig inloggning, glömt lösenord-mejl och tvåstegsverifiering mot Supabase.
- Djupanalysen efter ändringarna (kräver servern live).
- Kassans mejl till info@ via FormSubmit (anropet är simulerat i testerna).

SAKNAS
- Stripe (kort, abonnemang, kvitton, återbetalning, uppgradering med proportionerlig debitering, webhooks)
- Automatisk domänregistrering/förnyelse via registrar (ResellerClub kräver fast IP)
- Mejlleverantörs-API
- Påminnelser 60/30/14/7 dagar, automatiska DNS/SSL-kontroller, internnotiser
- Ekonomi: MRR, ARR, marginaler, prognoser
- Admin: skapa företag/tjänster/fakturor och svara på ärenden i admin (görs i Supabase)
- AI-funktioner (domängenerator, AI-support), migreringsassistent, webbplatsövervakning, värvningsrabatter
- 10 designförslag för varje av de 28 sektionerna (gjort för domänsök, kundportal och mejlkortet)

## Innan riktiga kunder
1. Kör de tre SQL-filerna i `supabase/sql/` och lägg in SUPABASE_SERVICE_KEY i Cloudflare.
2. Sätt riktiga priser i katalogen och `"demo": false`.
3. Juridisk granskning av villkoren.
4. Välj mejlleverantör och registrar (eller fortsätt manuell leverans).
5. Stripe om kortbetalning ska användas.
