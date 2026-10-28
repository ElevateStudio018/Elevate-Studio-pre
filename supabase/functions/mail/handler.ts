// All mail from the website and the admin goes out from info@elevatestudio.nu through Brevo.
// The Brevo key lives as a secret on the server, never on the website.
import { FROM, TEAM, campaign, ics, leadConfirmation, leadNotification, meetingInvite, reviewRequest } from "./templates.ts";

export type Env = {
  BREVO_API_KEY: string;
  BREVO_LIST_ID?: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};
const REVIEW_URL = "https://search.google.com/local/writereview?placeid=ChIJcRLSybPJX0YRomaZlUJ2bzY";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const clip = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const isEmail = (v: unknown) => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 255;

export async function handle(req: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return reply({ error: "method" }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply({ error: "json" }, 400); }

  const db = (path: string, init: RequestInit = {}) =>
    fetchFn(`${env.SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
    });
  const brevo = (path: string, payload: unknown) =>
    fetchFn(`https://api.brevo.com/v3/${path}`, {
      method: "POST",
      headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
  const send = async (to: { email: string; name?: string }, mail: { subject: string; html: string; text: string }, replyTo = FROM, senderName = FROM.name, attachment?: { name: string; content: string }[]) => {
    const res = await brevo("smtp/email", {
      sender: { name: senderName, email: FROM.email }, to: [to], replyTo,
      subject: mail.subject, htmlContent: mail.html, textContent: mail.text, ...(attachment ? { attachment } : {}),
    });
    if (!res.ok) throw new Error(`brevo ${res.status}: ${(await res.text()).slice(0, 200)}`);
  };

  try {
    // Contact form on the website: save the lead, confirm to the customer, notify info@.
    if (body.action === "lead") {
      if (body.website) return reply({ ok: true }); // honeypot: bots fill every field
      const lead = {
        name: clip(body.name, 100) || clip(body.email, 100), email: clip(body.email, 255), phone: clip(body.phone, 40),
        company: clip(body.company, 150), service_type: clip(body.service_type, 100), message: clip(body.message, 2000),
      };
      if (!isEmail(lead.email)) return reply({ error: "email" }, 400);
      const ins = await db("quote_requests?select=id", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ ...lead, meeting_type: "quote" }) });
      if (!ins.ok) throw new Error(`insert ${ins.status}: ${(await ins.text()).slice(0, 200)}`);
      const [row] = await ins.json();
      const results = await Promise.allSettled([
        send({ email: lead.email!, name: lead.name || undefined }, leadConfirmation(lead.name || "", lead.message || "")),
        send(FROM, leadNotification(lead), { email: lead.email!, name: lead.name || lead.email! }, "Elevate Studio (hemsidan)"),
      ]);
      const status = results[0].status === "fulfilled" ? "sent" : "failed";
      await db(`quote_requests?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify({ email_status: status }) });
      return reply({ ok: true, id: row.id, email: status });
    }

    // Newsletter sign-up: the address goes into the Brevo list; Brevo sends the welcome mail and the newsletters.
    if (body.action === "subscribe") {
      if (body.website) return reply({ ok: true });
      if (!isEmail(body.email)) return reply({ error: "email" }, 400);
      const res = await brevo("contacts", { email: String(body.email).trim(), listIds: env.BREVO_LIST_ID ? [Number(env.BREVO_LIST_ID)] : [], updateEnabled: true });
      if (!res.ok && res.status !== 204) throw new Error(`brevo ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return reply({ ok: true });
    }

    // From the admin: only signed-in accounts with the admin role.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const who = await fetchFn(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
    const user = who.ok ? await who.json() : null;
    if (!user?.id) return reply({ error: "auth" }, 401);
    const role = await db("rpc/has_role", { method: "POST", body: JSON.stringify({ _user_id: user.id, _role: "admin" }) });
    if (!role.ok || (await role.json()) !== true) return reply({ error: "forbidden" }, 403);

    if (body.action === "review") {
      const r = await db(`quote_requests?id=eq.${encodeURIComponent(String(body.lead_id))}&select=id,name,email,company`);
      const [lead] = r.ok ? await r.json() : [];
      if (!lead?.email) return reply({ error: "lead" }, 404);
      const sender = TEAM[String(body.sender || "")];
      const mail = reviewRequest(lead.name || "", REVIEW_URL, sender);
      let status = "sent", detail = "";
      try {
        await send({ email: lead.email, name: lead.name }, mail, sender ? { name: sender.name, email: FROM.email } : FROM, sender ? `${sender.first} på Elevate Studio` : FROM.name);
      } catch (e) { status = "failed"; detail = (e as Error).message; }
      await db("outbound_messages", { method: "POST", body: JSON.stringify({ channel: "email", recipient: lead.email, subject: mail.subject, status, detail: detail || null, quote_request_id: lead.id, sent_by: user.id }) });
      if (status !== "sent") return reply({ error: detail }, 502);
      return reply({ ok: true });
    }
    if (body.action === "invite") {
      const r = await db(`quote_requests?id=eq.${encodeURIComponent(String(body.lead_id))}&select=id,name,email`);
      const [lead] = r.ok ? await r.json() : [];
      if (!lead?.email) return reply({ error: "lead" }, 404);
      const start = new Date(String(body.at));
      if (isNaN(start.getTime())) return reply({ error: "time" }, 400);
      const minutes = Math.min(Math.max(Number(body.minutes) || 30, 5), 480);
      const host = TEAM[String(body.sender || "")];
      const when = start.toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const link = clip(body.link, 500) || undefined, type = clip(body.type, 60) || "Möte";
      const mail = meetingInvite({ name: lead.name || "", when, minutes, type, link, message: clip(body.message, 2000) || undefined, host });
      const cal = ics({ start, minutes, title: "Möte med Elevate Studio", location: link, description: `${type}${link ? "\n" + link : ""}`, attendee: lead.email });
      let status = "sent", detail = "";
      try {
        await send({ email: lead.email, name: lead.name }, mail, host ? { name: host.name, email: FROM.email } : FROM, host ? `${host.first} på Elevate Studio` : FROM.name,
          [{ name: "mote.ics", content: btoa(String.fromCharCode(...new TextEncoder().encode(cal))) }]);
      } catch (e) { status = "failed"; detail = (e as Error).message; }
      await db("outbound_messages", { method: "POST", body: JSON.stringify({ channel: "email", recipient: lead.email, subject: mail.subject, status, detail: detail || null, quote_request_id: lead.id, sent_by: user.id }) });
      if (status !== "sent") return reply({ error: detail }, 502);
      return reply({ ok: true });
    }

    if (body.action === "campaign") {
      const list = (Array.isArray(body.recipients) ? body.recipients : []).filter((x: { email?: unknown }) => isEmail(x?.email)).slice(0, 1000);
      const subject = clip(body.subject, 200), text = clip(body.body, 10000);
      if (!list.length || !subject || !text) return reply({ error: "input" }, 400);
      const c = { subject, headline: clip(body.headline, 200) || subject, body: text, button_label: clip(body.button_label, 60), button_url: clip(body.button_url, 500) };
      let sent = 0;
      // One personal mail per recipient (nobody sees the others), in batches.
      for (let i = 0; i < list.length; i += 50) {
        const part = list.slice(i, i + 50);
        const results = await Promise.allSettled(part.map((x: { email: string; name?: string }) => send({ email: x.email, name: x.name || undefined }, campaign({ ...c, name: x.name || "" }))));
        sent += results.filter((r) => r.status === "fulfilled").length;
      }
      return reply({ ok: true, sent });
    }
    return reply({ error: "action" }, 400);
  } catch (e) {
    console.error(e);
    return reply({ error: (e as Error).message }, 500);
  }
}
