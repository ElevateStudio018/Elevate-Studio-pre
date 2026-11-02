# Koppla en kunds hemsida till kundportalen

Kunden kopierar en kod i sin hemsidas admin (Inställningar → Kundportal → Kopiera kod) och klistrar in den i
kundportalen under **Hemsidans admin**.

## Koden
`es1.` + base64url av JSON `{"u": "https://kundens-sajt.se", "k": "<läsnyckel, minst 16 tecken>"}`.
Nyckeln ska bara kunna läsa. Skapa en ny nyckel varje gång kunden klickar "Kopiera kod" och gör den gamla ogiltig.

## Vad hemsidan måste svara på
`GET https://kundens-sajt.se/api/portal` med `Authorization: Bearer <nyckel>` ska ge JSON:

```json
{
  "name": "Exempelbygg AB",
  "admin_url": "https://kundens-sajt.se/admin",
  "counts": { "leads": 48, "new": 3 },
  "leads": [{ "name": "", "email": "", "phone": "", "message": "", "created_at": "2026-11-02T10:00:00Z", "status": "Ny" }]
}
```
Fel nyckel → 401. Högst 50 förfrågningar skickas.

## Inställningar
- Kör `supabase/sql/2026-11-05_site_connections.sql`.
- Cloudflare-secrets: `SUPABASE_SERVICE_KEY` och `MAIL_SESSION_KEY` (krypterar nyckeln).
- "Visa admin här" bäddar in admin i en ram. Det fungerar bara om kundens admin tillåter det
  (`Content-Security-Policy: frame-ancestors https://elevatestudio.nu`). Annars används "Öppna admin".
