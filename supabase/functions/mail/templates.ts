// Mail designs in Elevate green: the same look as the meeting invite and review mails from the old admin.
// Tables with inline CSS and bgcolor so Gmail, Outlook and Apple Mail keep the colours.
// The color-scheme tags tell Apple Mail and others the design is already dark, so they don't invert it in dark mode.

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
  return `<tr><td style="padding:24px 40px 10px">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#fdfbf5" style="background:#fdfbf5;border-radius:26px" align="center">
    <a href="${esc(href)}" style="display:inline-block;padding:16px 30px;font:bold 16px ${SANS};color:#1d3b2a;text-decoration:none">${text} &rarr;</a>
  </td></tr></table>
  <p style="margin:14px 0 0;font:13px/1.5 ${SANS};color:#9fc0a8">Funkar inte knappen? Öppna länken: <a href="${esc(href)}" style="color:#fdfbf5;word-break:break-all">${esc(href)}</a></p>
</td></tr>`;
}

/** The sender as a contact card, like the team cards on the contact page. */
function contactCard(m: Member) {
  const row = (icon: string, href: string, text: string) =>
    `<tr><td style="padding:5px 0;vertical-align:middle;width:30px"><img src="${IMG}/${icon}" width="18" height="18" alt="" style="display:block"></td>
      <td style="padding:5px 0;vertical-align:middle"><a href="${href}" style="font:bold 16px ${SANS};color:#ffffff;text-decoration:none">${esc(text)}</a></td></tr>`;
  return `<tr><td style="padding:30px 28px 0">
  <p style="margin:0 0 12px 12px;font:bold 11px ${SANS};letter-spacing:1.2px;text-transform:uppercase;color:#9fc0a8">Din kontakt</p>
  <table bgcolor="#12271b" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#12271b;border-radius:18px"><tr><td style="padding:30px 32px 24px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:top"><div style="font:24px/1.15 ${SANS};color:#ffffff">${esc(m.name)}</div><div style="font:14px ${SANS};color:#c6d5ca;margin-top:6px">${esc(m.role)}</div></td>
      <td style="vertical-align:top;width:34px" align="right"><img src="${IMG}/mail-mark-sage.png" width="34" height="25" alt="" style="display:block"></td>
    </tr></table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:26px">
      ${row("mail-ic-phone.png", "tel:" + m.phone.replace(/\s/g, ""), m.phone)}
      ${row("mail-ic-mail.png", "mailto:" + m.email, m.email)}
    </table>
    <div style="margin-top:18px;padding-top:12px;border-top:1px solid rgba(253,251,245,.16);font:11px ${SANS};letter-spacing:1.2px;text-transform:uppercase;color:#8fa898">Elevate Studio</div>
  </td></tr></table>
</td></tr>`;
}

function shell(title: string, inner: string, footnote: string) {
  return `<!DOCTYPE html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><style>:root{color-scheme:light dark;supported-color-schemes:light dark}</style><title>${esc(title)}</title></head>
<body bgcolor="#12271b" style="margin:0;padding:0;background:#12271b">
<table bgcolor="#12271b" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#12271b"><tr><td align="center" style="padding:32px 12px">
<table bgcolor="#1d3b2a" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#1d3b2a;border-radius:14px;overflow:hidden">
<tr><td style="padding:36px 40px 8px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
  <td style="padding-right:10px;vertical-align:middle"><img src="${IMG}/mail-mark-cream.png" width="30" height="22" alt="" style="display:block"></td>
  <td style="vertical-align:middle;font:bold 15px ${SANS};color:#fdfbf5">Elevate Studio</td></tr></table></td></tr>
${inner}
<tr><td align="right" style="padding:18px 0 0;line-height:0;font-size:0"><img src="${IMG}/mail-mark-corner.png" width="360" height="250" alt="" style="display:block;max-width:100%;height:auto"></td></tr>
<tr><td bgcolor="#17301f" style="padding:26px 40px 32px;background:#17301f;font:13px/1.6 ${SANS};color:#9fc0a8">
  <p style="margin:0 0 4px;color:#fdfbf5;font-weight:bold">Elevate Studio</p>
  <p style="margin:0"><a href="mailto:info@elevatestudio.nu" style="color:#fdfbf5;text-decoration:none">info@elevatestudio.nu</a> · <a href="https://elevatestudio.nu" style="color:#fdfbf5;text-decoration:none">elevatestudio.nu</a></p>
  <p style="margin:10px 0 0">${footnote}</p>
</td></tr></table></td></tr></table></body></html>`;
}

const heading = (text: string) => `<tr><td style="padding:26px 40px 6px;font:bold 30px/1.2 ${SANS};color:#ffffff">${text}</td></tr>`;
const para = (html: string, pad = "10px 40px 0") => `<tr><td style="padding:${pad};font:16px/1.6 ${SANS};color:#fdfbf5">${html}</td></tr>`;
const hello = (name: string) => `Hej${name ? " " + esc(name.trim().split(/\s+/)[0]) : ""}!`;

/** To the customer right after they sent the form on the website. */
export function leadConfirmation(name: string, message: string) {
  const summary = message
    ? `<tr><td style="padding:24px 28px 0"><table bgcolor="#ffffff" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px"><tr><td style="padding:20px 22px">
        <div style="font:bold 11px ${SANS};letter-spacing:1.2px;text-transform:uppercase;color:#4f7a60">Ditt meddelande</div>
        <div style="font:15px/1.6 ${SANS};color:#1d3b2a;margin-top:6px">${esc(message).replace(/\n/g, "<br>")}</div></td></tr></table></td></tr>`
    : "";
  return {
    subject: "Tack, vi har fått din förfrågan",
    html: shell("Tack för din förfrågan",
      heading(`Tack, vi har fått <span style="font:italic normal 32px ${SERIF};color:#fdfbf5">din förfrågan.</span>`) +
      para(`${hello(name)}<br><br>Vi läser alltid själva och hör av oss inom en arbetsdag, oftast samma dag. Vill du lägga till något? Svara bara på det här mejlet.`) +
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
      heading("Ny förfrågan från hemsidan") +
      `<tr><td style="padding:20px 28px 0"><table bgcolor="#ffffff" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px"><tr><td style="padding:14px 22px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr></table></td></tr>` +
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
      heading(`Tack från <span style="font:italic normal 32px ${SERIF};color:#fdfbf5">${esc(sender ? sender.first : "oss")}.</span>`) +
      para(`${hello(name)}<br><br>Tack för förtroendet. ${me} hoppas att du är nöjd med hemsidan. Vill du berätta hur samarbetet var? En kort recension på Google hjälper oss mycket.`) +
      `<tr><td style="padding:24px 40px 0">${star.repeat(5)}<div style="margin-top:6px;font:13px ${SANS};color:#9fc0a8">Klicka på en stjärna eller på knappen</div></td></tr>` +
      button(reviewUrl, "Lämna en recension") + (sender ? contactCard(sender) : ""),
      "Recensionen tar ungefär en minut och hjälper andra företag att hitta oss."),
    text: `${hello(name)}\n\nTack för förtroendet. ${me} hoppas att du är nöjd med hemsidan. En kort recension på Google hjälper oss mycket:\n\n${reviewUrl}\n\nTack!\n${sender ? sender.name + "\n" : ""}Elevate Studio\ninfo@elevatestudio.nu`,
  };
}

/** Meeting invite: white time box, cream button, the host as a contact card. */
export function meetingInvite(o: { name: string; when: string; minutes: number; type: string; link?: string; message?: string; host?: Member }) {
  const label = `font:bold 11px ${SANS};letter-spacing:1.2px;text-transform:uppercase;color:#4f7a60`;
  const isUrl = o.link && /^https?:\/\//.test(o.link);
  return {
    subject: "Mötesinbjudan från Elevate Studio",
    html: shell("Mötesinbjudan från Elevate Studio",
      heading(o.host ? `Du har blivit inbjuden av ${esc(o.host.first)}` : "Du är inbjuden till ett möte") +
      para(`${hello(o.name)} Här är din inbjudan till mötet med Elevate Studio.`, "10px 40px 26px") +
      `<tr><td style="padding:0 28px"><table bgcolor="#ffffff" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px">
        <tr><td style="padding:20px 22px;border-bottom:1px solid #e6ece8"><div style="${label}">Datum &amp; tid</div><div style="font:bold 18px/1.4 ${SANS};color:#1d3b2a;margin-top:4px">${esc(o.when)}</div></td></tr>
        <tr><td style="padding:18px 22px"><div style="${label}">Möte</div><div style="font:16px ${SANS};color:#1d3b2a;margin-top:4px">${esc(o.type)} · ${o.minutes} minuter${o.link && !isUrl ? "<br>" + esc(o.link) : ""}</div></td></tr>
      </table></td></tr>` +
      (o.message ? para(esc(o.message).replace(/\n/g, "<br>"), "26px 40px 4px") : "") +
      (isUrl ? button(o.link!, "Anslut till mötet") : "") + (o.host ? contactCard(o.host) : ""),
      "Kalenderinbjudan är bifogad – öppna den för att lägga in mötet i din kalender."),
    text: `${hello(o.name)}\n\nDu är inbjuden till ett möte med Elevate Studio.\n\nTid: ${o.when} (${o.minutes} min)\nTyp: ${o.type}${o.link ? "\nLänk/plats: " + o.link : ""}${o.message ? "\n\n" + o.message : ""}\n\nElevate Studio\ninfo@elevatestudio.nu`,
  };
}

/** Calendar file attached to the invite, so the meeting lands in the customer's calendar. */
export function ics(o: { start: Date; minutes: number; title: string; location?: string; description?: string; attendee: string }) {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const e = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Elevate Studio//Admin//SV", "METHOD:REQUEST", "BEGIN:VEVENT",
    `UID:${o.start.getTime()}-${Math.random().toString(36).slice(2, 8)}@elevatestudio.nu`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(o.start)}`,
    `DTEND:${f(new Date(o.start.getTime() + o.minutes * 6e4))}`, `SUMMARY:${e(o.title)}`, `DESCRIPTION:${e(o.description || "")}`, `LOCATION:${e(o.location || "")}`,
    "ORGANIZER;CN=Elevate Studio:mailto:info@elevatestudio.nu", `ATTENDEE;RSVP=TRUE:mailto:${o.attendee}`, "STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}

/** Mail campaign written in the admin. */
export function campaign(c: { name: string; subject: string; headline: string; body: string; button_label?: string | null; button_url?: string | null }) {
  const unsub = `mailto:info@elevatestudio.nu?subject=${encodeURIComponent("Avregistrera")}`;
  return {
    subject: c.subject,
    html: shell(c.subject, heading(esc(c.headline)) + para(`${hello(c.name)}<br><br>${esc(c.body).replace(/\n/g, "<br>")}`) +
      (c.button_url ? button(c.button_url, esc(c.button_label || "Läs mer")) : ""),
      `Du får det här mejlet från Elevate Studio. Vill du inte få fler utskick? <a href="${unsub}" style="color:#fdfbf5">Avregistrera dig här</a>.`),
    text: `${hello(c.name)}\n\n${c.body}${c.button_url ? "\n\n" + (c.button_label || "Läs mer") + ": " + c.button_url : ""}\n\nElevate Studio\ninfo@elevatestudio.nu\n\nVill du inte få fler utskick? Svara "avregistrera".`,
  };
}
