/* Offer PDF – generated from the admin app's src/lib/quote-pdf.ts (same layout as the website's example offer). */
(function () {
const { jsPDF } = window.jspdf;
const DEFAULT_SCOPE = [
  "Webbdesign och mobilanpassning utifrån verksamhetens behov.",
  "Kontaktfunktion, presentation av verksamhet och projekt samt bildmaterial som kunden tillhandahåller.",
  "Grundläggande sökmotoroptimering (SEO) och AI-optimering (AIO).",
  "Två korrekturvändor före leverans.",
  "Upp till 10 timmars support och webbplatsredigering per månad under det första året."
];
const PACKAGE_FEES = {
  starter: { start: 3000, yearly: 99 },
  pro: { start: 6000, yearly: 299 }
};
const W = 595.28;
const H = 841.89;
const U = W / 100;
const X = 9.4 * U;
const RIGHT = W - X;
const GREEN = [29, 59, 42];
const INK = [31, 42, 36];
const SOFT = [231, 239, 233];
const MARK = "M0.0 1353.9 L1218.7 0.0 L1218.7 329.1 L479.7 1136.4 L786.7 1132.4 L1215.5 687.4 L1884.3 1349.9 L1590.1 1349.9 L1218.6 994.7 L865.4 1349.9Z";
const kr = (n) => new Intl.NumberFormat("sv-SE").format(Math.round(n)).replace(/ /g, " ") + " kr";
async function toBase64(url) {
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`font ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0;i < buf.length; i += 32768)
    bin += String.fromCharCode(...buf.subarray(i, i + 32768));
  return btoa(bin);
}
async function useSiteFont(doc) {
  try {
    const [regular, bold] = await Promise.all([
      toBase64("../assets/fonts/HankenGrotesk-Regular.ttf"),
      toBase64("../assets/fonts/HankenGrotesk-Bold.ttf")
    ]);
    doc.addFileToVFS("HankenGrotesk-Regular.ttf", regular);
    doc.addFont("HankenGrotesk-Regular.ttf", "Hanken", "normal");
    doc.addFileToVFS("HankenGrotesk-Bold.ttf", bold);
    doc.addFont("HankenGrotesk-Bold.ttf", "Hanken", "bold");
    return "Hanken";
  } catch {
    return "helvetica";
  }
}
function drawMark(doc, x, y, w) {
  const s = w / 1884.3;
  const pts = MARK.replace(/[MLZ]/g, " ").trim().split(/\s+/).map(Number);
  const lines = [];
  for (let i = 2;i < pts.length; i += 2)
    lines.push([(pts[i] - pts[i - 2]) * s, (pts[i + 1] - pts[i - 1]) * s]);
  doc.setFillColor(255, 255, 255);
  doc.lines(lines, x + pts[0] * s, y + pts[1] * s, [1, 1], "F", true);
}
async function buildQuotePdf(input) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const font = await useSiteFont(doc);
  const body = 1.65 * U;
  const lh = body * 1.65;
  const gap = 1.3 * U;
  let y = 0;
  const set = (size, weight = "normal", color = INK) => {
    doc.setFont(font, weight);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const blank = (x, base, width) => {
    doc.setDrawColor(154, 167, 159);
    doc.setLineWidth(0.75);
    doc.line(x, base + 2, x + width, base + 2);
  };
  const field = (label, value, x = X, width = 18 * U) => {
    doc.text(label, x, y);
    const end = x + doc.getTextWidth(label) + 3;
    if (value)
      doc.text(value, end, y);
    else
      blank(end, y, width);
    return end + (value ? doc.getTextWidth(value) : width);
  };
  const line = (text) => {
    set(body);
    doc.text(text, X, y);
    y += lh + gap;
  };
  const para = (text, weight = "normal") => {
    set(body, weight);
    for (const r of doc.splitTextToSize(text, RIGHT - X)) {
      doc.text(r, X, y);
      y += lh;
    }
    y += gap;
  };
  const h2 = (text, first = false) => {
    if (!first)
      y += 4.2 * U - gap;
    set(2.1 * U, "bold", GREEN);
    doc.text(text, X, y);
    y += 2.1 * U * 0.5 + 1.8 * U + body;
  };
  const sheet = (sub, no) => {
    if (no > 1)
      doc.addPage();
    const top = 7.6 * U + 3.5 * U + 1.4 * U + 1.55 * U * 1.3 + 6.4 * U;
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, W, top, "F");
    const mw = 6.4 * U;
    drawMark(doc, X, (top - mw * 0.7185) / 2, mw);
    const textX = X + mw + 2.6 * U;
    set(3.5 * U, "bold", [255, 255, 255]);
    doc.text("ELEVATE STUDIO", textX, 7.6 * U + 3.5 * U * 0.78, { charSpace: 0.4 });
    set(1.55 * U, "normal", [255, 255, 255]);
    doc.text(sub, textX, 7.6 * U + 3.5 * U + 1.4 * U + 1.55 * U * 0.9, { charSpace: 0.2 });
    const footY = H - 5.6 * U;
    doc.setDrawColor(201, 214, 205);
    doc.setLineWidth(0.75);
    doc.line(X, footY - 2 * U - 1.3 * U, RIGHT, footY - 2 * U - 1.3 * U);
    set(1.3 * U, "normal", [111, 125, 116]);
    doc.text("ELEVATE STUDIO  |  OFFERT", X, footY);
    doc.text(`Sida ${no} av 2`, RIGHT, footY, { align: "right" });
    y = top + 4.6 * U + body;
  };
  sheet("WEBBUTVECKLING / OFFERT", 1);
  set(2 * U, "bold", GREEN);
  const noEnd = field("OFFERT NR", input.offerNo, X, 11 * U);
  set(1.6 * U);
  const dateEnd = field("Datum:", input.date, noEnd + 8 * U, 11 * U);
  doc.text("|", dateEnd + 6, y);
  field("Giltig till:", input.validUntil, dateEnd + 6 + doc.getTextWidth("| ") + 4, 11 * U);
  y += 2.6 * U + 2 * U + body + 7;
  h2("1. Parter", true);
  line("Producent: Elevate Studio");
  set(body);
  field("Producentens företrädare:", input.producerRep);
  y += lh + gap;
  field("Beställare:", input.customer);
  y += lh + gap;
  field("Beställarens företrädare:", input.customerRep);
  y += lh + gap;
  h2("2. Uppdragets omfattning (specifikation)");
  para("Utveckling och leverans av en modern, responsiv webbplats för Beställaren.");
  y += 1.8 * U - gap;
  para("I uppdraget ingår:", "bold");
  set(body);
  for (const item of input.scope) {
    doc.text("•", X + 1.4 * U, y);
    for (const r of doc.splitTextToSize(item, RIGHT - X - 3 * U)) {
      doc.text(r, X + 3 * U, y);
      y += lh;
    }
    y += gap;
  }
  h2("3. Driftmiljö");
  para("Beställaren äger sin domän. Hosting, drift och eventuella externa avgifter specificeras separat om inget annat skriftligen överenskommits.");
  h2("4. Leverans");
  para("Leveransdatum bekräftas separat och uppskattas till cirka en månad från beställning, förutsatt att nödvändigt underlag och åtkomst tillhandahålls.");
  sheet("OFFERT / VILLKOR OCH GODKÄNNANDE", 2);
  h2("5. Fast pris och betalning", true);
  const tSize = 1.6 * U;
  const padY = 2.6 * U;
  const padX = 2 * U;
  const col2 = RIGHT - (RIGHT - X) * 0.32;
  const rowH = tSize * 1.65 + padY * 2;
  let top = y - body;
  const row = (a, b, kind) => {
    if (kind !== "body") {
      doc.setFillColor(...SOFT);
      doc.rect(X, top, RIGHT - X, rowH, "F");
    }
    if (kind !== "foot") {
      doc.setDrawColor(223, 230, 225);
      doc.setLineWidth(0.75);
      doc.line(X, top + rowH, RIGHT, top + rowH);
    }
    set(tSize, kind === "body" ? "normal" : "bold", kind === "body" ? INK : GREEN);
    const base = top + rowH / 2 + tSize * 0.35;
    doc.text(a, X + padX, base);
    doc.text(b, col2 + padX, base);
    top += rowH;
  };
  row("Post", "Pris (exkl. moms)", "head");
  row("Webbutveckling - fast startavgift", kr(input.startFee), "body");
  row("Årsavgift", `${kr(input.yearlyFee)}/år`, "body");
  row("Webbredigering och support, upp till 10 tim/mån första året", "Ingår", "body");
  row("Totalt första året", kr(input.startFee + input.yearlyFee), "foot");
  y = top + 3.4 * U + body;
  para("Under de första 12 månaderna från leverans ingår upp till 10 timmars redigeringssupport per månad. Supporten kan användas för text- och bildändringar, layoutjusteringar, nya funktioner eller större ombyggnationer av webbplatsen.");
  para("Nya funktioner och större ombyggnationer utförs inom den tillgängliga månadstiden. Arbete utöver 10 timmar under en månad förutsätter separat överenskommelse. Outnyttjade timmar förs inte över till nästa månad.");
  para(`Efter första året upphör den inkluderade timsupporten. Fortsatt support och utveckling kan avtalas separat. Årsavgiften på ${kr(input.yearlyFee)} fortsätter årsvis om inte avtalet sägs upp.`);
  para("Startavgift och första årsavgift faktureras vid driftsättning. Betalningsvillkor: 30 dagar. Samtliga priser anges exklusive moms.");
  h2("6. Godkännande av offert");
  para("Beställaren kan acceptera denna offert genom att svara på mejlet med följande text:");
  set(body);
  const quote = `Jag godkänner offert nr ${input.offerNo} och beställer tjänsterna enligt offertens villkor.`;
  const qRows = input.offerNo ? doc.splitTextToSize(quote, RIGHT - X - 6 * U) : [""];
  const qTop = y - body + (2.2 * U - gap);
  const qH = 2.4 * U * 2 + qRows.length * lh;
  doc.setFillColor(...SOFT);
  doc.rect(X, qTop, RIGHT - X, qH, "F");
  doc.setFillColor(...GREEN);
  doc.rect(X, qTop, 0.6 * U, qH, "F");
  let qy = qTop + 2.4 * U + (lh - body) / 2 + body * 0.8;
  if (input.offerNo) {
    for (const r of qRows) {
      doc.text(r, X + 2.6 * U + 0.6 * U, qy);
      qy += lh;
    }
  } else {
    const start = X + 3.2 * U;
    doc.text("Jag godkänner offert nr", start, qy);
    const bx = start + doc.getTextWidth("Jag godkänner offert nr ");
    blank(bx, qy, 18 * U);
    doc.text("och beställer tjänsterna enligt offertens villkor.", bx + 18 * U + 4, qy);
  }
  y = qTop + qH + 3.2 * U + body;
  para("Genom godkännandet accepterar beställaren uppdragets omfattning, priser, betalningsvillkor och övriga villkor i denna offert.");
  return doc;
}
function quotePdfFilename(name) {
  const stamp = new Date().toISOString().slice(0, 10);
  const safeName = (name || "kund").trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").toLowerCase() || "kund";
  return `elevate-offert-${safeName}-${stamp}.pdf`;
}

window.ElevateOffer = { buildQuotePdf, quotePdfFilename, DEFAULT_SCOPE, PACKAGE_FEES };
})();
