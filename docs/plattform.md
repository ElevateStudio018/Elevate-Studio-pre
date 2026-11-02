# Elevate Studio – plattform för domäner, mejl och tjänster

## Klart och i drift (nivå 1, demoläge för betalning och leverans)
- **/domaner** – domänsökning för 12 toppdomäner. Tillgänglighet: registrets RDAP för .com .net .org .info .dev .app ("Ledig"), DNS för .se .nu .eu .io .online .store ("Sannolikt ledig", bekräftas före registrering). Filter per toppdomän, sortering (relevans, pris, popularitet), förnyelsepris och varning vid högt förnyelsepris, flytt av befintlig domän, kontrollerade namnförslag.
- **/foretagsmejl** – förklaring (adress/konto, egen domän, säkerhet), tre paket per månad/år, extra konton, önskade adresser, mejldiagnostik (MX, SPF, DKIM, DMARC) med förklaring, installationsguider.
- **/kassa** – varukorg (sparas i webbläsaren), år/period per rad, engångs- och återkommande kostnad, moms, villkor, innehavaruppgifter. Servern prissätter om allt från katalogen. Ingen betalning och ingen registrering sker – ordern bekräftas med offert.
- **/villkor-tjanster** – utkast, **kräver juridisk granskning före lansering**.
- **Admin** – Beställningar (status, betalning och leverans var för sig), Sajttester, Nyhetsbrev, Chatten.
- **Katalog** – `assets/data/catalog.json` (toppdomäner, priser, mejlpaket, tillägg, paket). Priserna är **demopriser** (`"demo": true`) tills Elevate Studio satt riktiga. Sätt `demo` till `false` när de är satta.

## Miljövariabler (Cloudflare → Workers → Settings → Variables)
| Namn | Typ | Behövs för |
|---|---|---|
| SUPABASE_SERVICE_KEY | secret | Besöksstatistik, chattlogg, sajttester, nyhetsbrev, beställningar |
| REGISTRAR | variabel | `demo` (standard), `resellerclub`, `openprovider` |
| REGISTRAR_LIVE | variabel | `true` först när betalning verifieras på servern |
| RESELLERCLUB_USER_ID, RESELLERCLUB_API_KEY | secret | ResellerClub (kräver fast IP, se nedan) |
| STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET | secret | Betalning (ej byggt än) |

## SQL att köra i Supabase (en gång)
- `supabase/sql/2026-11-02_site_tests_newsletter.sql`
- `supabase/sql/2026-11-02_orders.sql`

## Inte byggt än (kräver avtal, nycklar eller beslut)
- **Betalning (Stripe)** – kräver Stripe-konto. Plan: Checkout Session + webhook som sätter `payment_status=paid`; först då får registraren anropas, med orderns `ref` som idempotensnyckel mot dubbla registreringar.
- **Automatisk registrering** – adaptern finns (`worker/registrar.js`). ResellerClub svarar bara från godkända IP-adresser; Cloudflare Workers har inga fasta adresser, så en liten proxy med fast IP behövs (eller Openprovider).
- **Mejlleverantör** – ingen vald. Paketen i katalogen är exempel. Automatisk skapande av konton/alias kräver leverantörens API.
- **Kundportal med konton, roller, 2FA, domän- och DNS-hantering, fakturor, support, notifieringar, ekonomi/MRR, automatiska påminnelser** – nivå 2–4. Bygger på samma Supabase (auth + tabeller) och adminportal.
- **AI-domänförslag** – i dag regelbaserade förslag (alla kontrollerade). AI kräver API-nyckel.
