// Mail designs in the booking page's look: a dark green top with the heading, a white body on cream, the
// host as a dark card. Tables with inline CSS and bgcolor so Gmail, Outlook and Apple Mail keep the colours.
// No pictures are needed for the layout, so the mails look right even when a mail program blocks images.

export const FROM = { name: "Elevate Studio", email: "info@elevatestudio.nu" };
const IMG = "https://elevatestudio.nu/assets/img/brand";
const SANS = "Arial, Helvetica, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

export type Member = { first: string; name: string; role: string; phone: string; email: string };
export const TEAM: Record<string, Member> = {
  carl: { first: "Carl", name: "Carl From", role: "Försäljning & kundkontakt", phone: "+46 76 022 83 61", email: "carl@elevatestudio.nu" },
  isak: { first: "Isak", name: "Isak Mattsson", role: "Försäljning & AI-utveckling", phone: "+46 70 289 58 75", email: "isak@elevatestudio.nu" },
  oscar: { first: "Oscar", name: "Oscar Svanerud", role: "Försäljning & affärsutveckling", phone: "+46 76 849 86 68", email: "svanerudo@gmail.com" },
};

export const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function button(href: string, text: string) {
  return `<tr><td style="padding:24px 36px 0">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#1d3b2a" style="background:#1d3b2a;border-radius:26px" align="center">
    <a href="${esc(href)}" style="display:inline-block;padding:16px 30px;font:bold 16px ${SANS};color:#ffffff;text-decoration:none">${text} &rarr;</a>
  </td></tr></table>
  <p style="margin:12px 0 0;font:13px/1.5 ${SANS};color:#6b766f">Funkar inte knappen? Öppna länken: <a href="${esc(href)}" style="color:#1d3b2a;word-break:break-all">${esc(href)}</a></p>
</td></tr>`;
}

/** The sender as a dark card, like the team cards on the contact page (no pictures needed). */
function contactCard(m: Member, kicker = "Din kontakt") {
  const row = (label: string, href: string, text: string) =>
    `<tr><td style="padding:4px 14px 4px 0;font:11px ${SANS};letter-spacing:1px;text-transform:uppercase;color:#9fc0a8;white-space:nowrap">${label}</td>
      <td style="padding:4px 0"><a href="${href}" style="font:bold 16px ${SANS};color:#ffffff;text-decoration:none">${esc(text)}</a></td></tr>`;
  return `<tr><td style="padding:30px 36px 0">
  <table bgcolor="#12271b" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#12271b;border-radius:18px"><tr><td style="padding:26px 28px 22px">
    <p style="margin:0 0 10px;font:bold 11px ${SANS};letter-spacing:1.2px;text-transform:uppercase;color:#9fc0a8">${kicker}</p>
    <div style="font:24px/1.15 ${SANS};color:#ffffff">${esc(m.name)}</div>
    <div style="margin-top:4px;font:14px ${SANS};color:#c6d5ca">${esc(m.role)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px">
      ${row("Telefon", "tel:" + m.phone.replace(/\s/g, ""), m.phone)}
      ${row("E-post", "mailto:" + m.email, m.email)}
    </table>
    <div style="margin-top:18px;padding-top:12px;border-top:1px solid rgba(253,251,245,.16);font:11px ${SANS};letter-spacing:1.2px;text-transform:uppercase;color:#8fa898">Elevate Studio · Uppsala</div>
  </td></tr></table>
</td></tr>`;
}

/** The dark top of every mail, like the top of the booking page: the brand, the heading, a line of text and some pills. */
function hero(heading: string, lead: string, pills: string[] = []) {
  const dark = `bgcolor="#1d3b2a" style="background:#1d3b2a;`;
  return `<tr><td ${dark}padding:26px 36px 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
  <td style="padding-right:10px;vertical-align:middle"><img src="${IMG}/mail-mark-cream.png" width="26" height="19" alt="" style="display:block"></td>
  <td style="vertical-align:middle;font:bold 15px ${SANS};color:#fdfbf5">Elevate Studio</td></tr></table></td></tr>
<tr><td ${dark}padding:24px 36px 0;font:500 32px/1.15 ${SANS};color:#ffffff">${heading}</td></tr>
${lead ? `<tr><td ${dark}padding:10px 36px 0;font:16px/1.6 ${SANS};color:#d9e2db">${lead}</td></tr>` : ""}
${pills.length ? `<tr><td ${dark}padding:18px 36px 0">${pills.map((p) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:8px 14px;border-radius:999px;background:#2f4b3b;font:bold 14px ${SANS};color:#fdfbf5">${esc(p)}</span>`).join("")}</td></tr>` : ""}
<tr><td ${dark}padding:0 0 30px;font-size:0;line-height:0">&nbsp;</td></tr>`;
}

/** A light green box in the body, for a message, a time or a few rows. */
const box = (inner: string, pad = "24px 36px 0") => `<tr><td style="padding:${pad}"><table bgcolor="#eef4ef" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef4ef;border-radius:14px"><tr><td style="padding:18px 22px">${inner}</td></tr></table></td></tr>`;
const label = `font:bold 11px ${SANS};letter-spacing:1.2px;text-transform:uppercase;color:#4f7a60`;

function shell(title: string, inner: string, footnote: string) {
  return `<!DOCTYPE html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(title)}</title></head>
<body bgcolor="#eef1ea" style="margin:0;padding:0;background:#eef1ea">
<table bgcolor="#eef1ea" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1ea"><tr><td align="center" style="padding:32px 12px">
<table bgcolor="#ffffff" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden">
${inner}
<tr><td style="padding:30px 36px 30px;font:13px/1.6 ${SANS};color:#6b766f">
  <b style="color:#16241b">Elevate Studio</b><br><a href="mailto:info@elevatestudio.nu" style="color:#1d3b2a;text-decoration:none">info@elevatestudio.nu</a> · <a href="https://elevatestudio.nu" style="color:#1d3b2a;text-decoration:none">elevatestudio.nu</a><br>${footnote}
</td></tr></table></td></tr></table></body></html>`;
}

const para = (html: string, pad = "24px 36px 0") => `<tr><td style="padding:${pad};font:16px/1.6 ${SANS};color:#3b463f">${html}</td></tr>`;
const hello = (name: string) => `Hej${name ? " " + esc(name.trim().split(/\s+/)[0]) : ""}!`;
const em = (text: string) => `<span style="font:italic normal 32px ${SERIF};color:#fdfbf5">${text}</span>`;

/** To the customer right after they sent the form on the website. */
export function leadConfirmation(name: string, message: string) {
  const summary = message ? box(`<div style="${label}">Ditt meddelande</div><div style="font:15px/1.6 ${SANS};color:#1d3b2a;margin-top:6px">${esc(message).replace(/\n/g, "<br>")}</div>`) : "";
  return {
    subject: "Tack, vi har fått din förfrågan",
    html: shell("Tack för din förfrågan",
      hero(`Tack, vi har fått ${em("din förfrågan.")}`, `${hello(name)} Vi läser alltid själva och hör av oss inom en arbetsdag, oftast samma dag. Vill du lägga till något? Svara bara på det här mejlet.`) +
      summary + button("https://elevatestudio.nu/projekt/", "Se exempel på hemsidor"),
      "Du får det här mejlet för att du skickade en förfrågan på elevatestudio.nu."),
    text: `${hello(name)}\n\nTack för din förfrågan. Vi hör av oss inom en arbetsdag, oftast samma dag. Vill du lägga till något? Svara bara på det här mejlet.\n\nElevate Studio\ninfo@elevatestudio.nu`,
  };
}

/** To info@ when a lead comes in, so the whole team sees it in the shared inbox. */
export function leadNotification(lead: Record<string, string | null>) {
  const rows = [["Namn", lead.name], ["Företag", lead.company], ["E-post", lead.email], ["Telefon", lead.phone], ["Gäller", lead.service_type], ["Meddelande", lead.message]]
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:8px 0;width:110px;vertical-align:top;font:13px ${SANS};color:#5f6b63">${k}</td><td style="padding:8px 0;font:15px/1.5 ${SANS};color:#1d3b2a">${esc(v).replace(/\n/g, "<br>")}</td></tr>`).join("");
  return {
    subject: `Ny förfrågan: ${lead.company || lead.name}`,
    html: shell("Ny förfrågan",
      hero("Ny förfrågan från hemsidan", `${esc(lead.company || lead.name || "")} hörde av sig via formuläret.`) +
      box(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`) +
      button("https://elevatestudio.nu/admin/", "Öppna i admin"),
      "Svara på mejlet så går svaret direkt till kunden."),
    text: Object.entries(lead).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n"),
  };
}

/** Review request after a sale; the stars and the button go straight to Google. */
export function reviewRequest(name: string, reviewUrl: string, sender?: Member) {
  const star = `<a href="${esc(reviewUrl)}" style="font:34px/1 ${SANS};color:#f5c518;text-decoration:none;padding-right:6px">&#9733;</a>`;
  const me = sender ? "Jag" : "Vi";
  return {
    subject: "Tack för att du valde Elevate Studio",
    html: shell("Tack för förtroendet",
      hero(`Tack från ${em(esc(sender ? sender.first : "oss") + ".")}`, `${hello(name)} Tack för förtroendet. ${me} hoppas att du är nöjd med hemsidan. Vill du berätta hur samarbetet var? En kort recension på Google hjälper oss mycket.`) +
      `<tr><td style="padding:26px 36px 0">${star.repeat(5)}<div style="margin-top:6px;font:13px ${SANS};color:#6b766f">Klicka på en stjärna eller på knappen</div></td></tr>` +
      button(reviewUrl, "Lämna en recension") + (sender ? contactCard(sender) : ""),
      "Recensionen tar ungefär en minut och hjälper andra företag att hitta oss."),
    text: `${hello(name)}\n\nTack för förtroendet. ${me} hoppas att du är nöjd med hemsidan. En kort recension på Google hjälper oss mycket:\n\n${reviewUrl}\n\nTack!\n${sender ? sender.name + "\n" : ""}Elevate Studio\ninfo@elevatestudio.nu`,
  };
}

/** Meeting invite: white time box, cream button, the host as a contact card. */
export function meetingInvite(o: { name: string; when: string; minutes: number; type: string; link?: string; message?: string; host?: Member; heading?: string; intro?: string; subject?: string }) {
  const isUrl = o.link && /^https?:\/\//.test(o.link);
  const subject = o.subject || "Mötesinbjudan från Elevate Studio";
  return {
    subject,
    html: shell(subject,
      hero(o.heading ? esc(o.heading) : o.host ? `Du har blivit inbjuden av ${esc(o.host.first)}` : "Du är inbjuden till ett möte",
        `${hello(o.name)} ${o.intro ? esc(o.intro) : "Här är din inbjudan till mötet med Elevate Studio."}`, [`${o.minutes} min`, o.type]) +
      box(`<div style="${label}">Datum &amp; tid</div><div style="font:bold 20px/1.4 ${SANS};color:#1d3b2a;margin-top:4px">${esc(o.when)}</div>
        <div style="margin-top:14px;${label}">Möte</div><div style="font:16px ${SANS};color:#1d3b2a;margin-top:4px">${esc(o.type)} · ${o.minutes} minuter${o.link && !isUrl ? "<br>" + esc(o.link) : ""}</div>`) +
      (o.message ? para(esc(o.message).replace(/\n/g, "<br>")) : "") +
      (isUrl ? button(o.link!, "Anslut till mötet") : "") + (o.host ? contactCard(o.host, "Du träffar") : ""),
      "Kalenderinbjudan är bifogad – öppna den för att lägga in mötet i din kalender."),
    text: `${hello(o.name)}\n\nDu är inbjuden till ett möte med Elevate Studio.\n\nTid: ${o.when} (${o.minutes} min)\nTyp: ${o.type}${o.link ? "\nLänk/plats: " + o.link : ""}${o.message ? "\n\n" + o.message : ""}\n\nElevate Studio\ninfo@elevatestudio.nu`,
  };
}

/** The customer picks a time: the question at the top like the booking page, three quick picks like
 * the page's day columns, the button to all times, and the host card. */
export function timeProposal(o: { name: string; url: string; minutes: number; type: string; host?: Member; message?: string; picks: { day: string; time: string; url: string }[] }) {
  const who = o.host ? esc(o.host.first) : "Vi";
  const first = o.name ? esc(o.name.trim().split(/\s+/)[0]) : "";
  const picks = o.picks.length
    ? `<tr><td style="padding:26px 36px 0">
  <p style="margin:0 0 10px;font:bold 11px ${SANS};letter-spacing:1.2px;text-transform:uppercase;color:#6b766f">Snabbast att välja</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${o.picks.map((p, i) =>
    `<td width="${Math.floor(100 / o.picks.length)}%" style="padding:0 ${i < o.picks.length - 1 ? 8 : 0}px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td bgcolor="#eef4ef" align="center" style="background:#eef4ef;border-radius:14px"><a href="${esc(p.url)}" style="display:block;padding:16px 8px;font:14px/1.3 ${SANS};color:#1d3b2a;text-decoration:none">${esc(p.day)}<br><b style="font-size:22px;line-height:1.4">${esc(p.time)}</b></a></td></tr></table></td>`).join("")}</tr></table>
</td></tr>` : "";
  return {
    subject: `Välj en tid som passar dig – möte med ${o.host ? o.host.first : "Elevate Studio"}`,
    html: shell("Välj en tid som passar dig",
      hero(`När passar det dig${first ? ", " + first : ""}?`, `${who} har föreslagit ett kort möte om er hemsida. Tryck på en tid så är det bokat, och du får en bekräftelse med allt du behöver.`, [`${o.minutes} min`, o.type]) +
      picks +
      button(o.url, "Se alla lediga tider") +
      `<tr><td style="padding:10px 36px 0;font:13px/1.5 ${SANS};color:#6b766f">Grå tider på sidan är upptagna i vår kalender. Länken fungerar i tre veckor.</td></tr>` +
      (o.message ? para(esc(o.message).replace(/\n/g, "<br>")) : "") +
      (o.host ? box(`<div style="font:bold 17px ${SANS};color:#16241b">Så här går mötet till</div><div style="margin-top:6px;font:15px/1.6 ${SANS};color:#3b463f">${who} går igenom ert företag, vad hemsidan ska ge er och hur ett upplägg kan se ut. Det kostar ingenting, och du behöver inte förbereda något.</div>`, "28px 36px 0") + contactCard(o.host, "Du träffar") : ""),
      "Passar ingen tid? Svara på det här mejlet så hittar vi en."),
    text: `${first ? "Hej " + first + "!" : "Hej!"}\n\n${o.host ? o.host.first : "Vi"} har föreslagit ett kort möte om er hemsida (${o.minutes} min, ${o.type}). Välj en tid som passar dig här, så bokas mötet direkt:\n${o.url}${o.picks.length ? "\n\nSnabbast att välja: " + o.picks.map((p) => `${p.day} ${p.time}`).join(", ") : ""}${o.message ? "\n\n" + o.message : ""}${o.host ? `\n\nDu träffar ${o.host.name}, ${o.host.role}\n${o.host.phone} · ${o.host.email}` : ""}\n\nElevate Studio\ninfo@elevatestudio.nu\nPassar ingen tid? Svara på det här mejlet så hittar vi en.`,
  };
}

/** Calendar file attached to the invite, so the meeting lands in the customer's calendar. */
export function ics(o: { start: Date; minutes: number; title: string; location?: string; description?: string; attendee: string; uid?: string; organizer?: string }) {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const e = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Elevate Studio//Admin//SV", "METHOD:REQUEST", "BEGIN:VEVENT",
    `UID:${o.uid || `${o.start.getTime()}-${Math.random().toString(36).slice(2, 8)}@elevatestudio.nu`}`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(o.start)}`,
    `DTEND:${f(new Date(o.start.getTime() + o.minutes * 6e4))}`, `SUMMARY:${e(o.title)}`, `DESCRIPTION:${e(o.description || "")}`, `LOCATION:${e(o.location || "")}`,
    `ORGANIZER;CN=Elevate Studio:mailto:${o.organizer || "info@elevatestudio.nu"}`, `ATTENDEE;RSVP=TRUE:mailto:${o.attendee}`, "STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}

/** Mail campaign written in the admin. */
export function campaign(c: { name: string; subject: string; headline: string; body: string; button_label?: string | null; button_url?: string | null }) {
  const unsub = `mailto:info@elevatestudio.nu?subject=${encodeURIComponent("Avregistrera")}`;
  return {
    subject: c.subject,
    html: shell(c.subject, hero(esc(c.headline), hello(c.name)) + para(esc(c.body).replace(/\n/g, "<br>")) +
      (c.button_url ? button(c.button_url, esc(c.button_label || "Läs mer")) : ""),
      `Du får det här mejlet från Elevate Studio. Vill du inte få fler utskick? <a href="${unsub}" style="color:#1d3b2a">Avregistrera dig här</a>.`),
    text: `${hello(c.name)}\n\n${c.body}${c.button_url ? "\n\n" + (c.button_label || "Läs mer") + ": " + c.button_url : ""}\n\nElevate Studio\ninfo@elevatestudio.nu\n\nVill du inte få fler utskick? Svara "avregistrera".`,
  };
}

/** A personal mail written in the admin: the green design with the sender's contact card. */
export function personalMail(o: { name: string; subject: string; body: string; host?: Member; button_label?: string; button_url?: string }) {
  return {
    subject: o.subject,
    html: shell(o.subject,
      hero(esc(o.subject), hello(o.name)) +
      para(esc(o.body).replace(/\n/g, "<br>")) +
      (o.button_url ? button(o.button_url, esc(o.button_label || "Läs mer")) : "") +
      (o.host ? contactCard(o.host) : ""),
      "Svara gärna direkt på det här mejlet."),
    text: `${hello(o.name)}\n\n${o.body}${o.button_url ? "\n\n" + (o.button_label || "Läs mer") + ": " + o.button_url : ""}\n\n${o.host ? o.host.name + "\n" : ""}Elevate Studio`,
  };
}
