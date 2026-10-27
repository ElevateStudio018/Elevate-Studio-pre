// Supabase Edge Function "mail". Deploy: supabase functions deploy mail
// Secrets: supabase secrets set BREVO_API_KEY=... BREVO_LIST_ID=...
import { handle } from "./handler.ts";

Deno.serve((req) => handle(req, {
  BREVO_API_KEY: Deno.env.get("BREVO_API_KEY")!,
  BREVO_LIST_ID: Deno.env.get("BREVO_LIST_ID"),
  SUPABASE_URL: Deno.env.get("SUPABASE_URL")!,
  SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY")!,
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
}));
