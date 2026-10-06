const PDFDocument = require("pdfkit");
const { COMPANY } = require("../config/company");

const BLUE = "#0B6DFF";
const DARK = "#032F8A";
const INK = "#111827";
const MUTED = "#6B7280";
const RULE = "#E5E7EB";
const TINT = "#F3F7FF";
const ZEBRA = "#F9FAFB";

const MARGIN = 57; // 20mm
const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const W = PAGE_W - 2 * MARGIN;

const MONTHS = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

function eur(cents) {
  const [whole, frac] = (Math.abs(cents) / 100).toFixed(2).split(".");
  return `${cents < 0 ? "-" : ""}€ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${frac}`;
}

// `day` is a "YYYY-MM-DD" local calendar date.
function nlDate(day) {
  const [y, m, d] = day.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function nlPeriod(firstDay, lastDay) {
  const [fy, fm, fd] = firstDay.split("-").map(Number);
  const [ly, lm] = lastDay.split("-").map(Number);
  if (fy === ly && fm === lm) return `${fd} t/m ${nlDate(lastDay)}`;
  return `${nlDate(firstDay)} t/m ${nlDate(lastDay)}`;
}

function label(doc, text, x, y, width, align = "left") {
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(MUTED).text(text.toUpperCase(), x, y, { width, align, characterSpacing: 0.3 });
}

function body(doc, text, x, y, opts = {}) {
  doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(opts.size || 9.5).fillColor(opts.color || INK)
    .text(text, x, y, { width: opts.width, align: opts.align || "left", lineGap: opts.lineGap ?? 3 });
}

function footer(doc, pageNo) {
  const y = PAGE_H - 51;
  doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).lineWidth(0.5).strokeColor(RULE).stroke();
  doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);
  doc.text(
    `${COMPANY.name} · ${COMPANY.legalForm} · ${COMPANY.addressLines.slice(0, 2).join(", ")} · KVK ${COMPANY.kvk} · btw-id ${COMPANY.vatId} · ${COMPANY.email}`,
    MARGIN, y + 8, { width: W - 50, lineBreak: false },
  );
  doc.text(`Pagina ${pageNo}`, MARGIN, y + 8, { width: W, align: "right", lineBreak: false });
}

// Builds the invoice PDF from the snapshot stored on the billing run, so a
// re-generated copy is always identical to the one that was sent.
//
// invoice: {
//   number, date ("YYYY-MM-DD"), first_day, last_day, transaction_count,
//   fee_cents, subtotal_cents, vat_rate, vat_cents, total_cents,
//   savings_cents_per_transaction (optional), daily: [{ day, count, fee_cents }],
//   client: { client_id, name, address_lines, email }
// }
function renderInvoicePdf(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: { Title: `Factuur ${invoice.number} — ${invoice.client.name}`, Author: COMPANY.name },
    });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const period = nlPeriod(invoice.first_day, invoice.last_day);
    const savingsPer = invoice.savings_cents_per_transaction || 0;

    // --- Page 1 ---
    let y = 51;
    doc.font("Helvetica-Bold").fontSize(26).fillColor(BLUE).text(COMPANY.name, MARGIN, y);
    doc.font("Helvetica-Bold").fontSize(20).fillColor(INK).text("Factuur", MARGIN, y + 5, { width: W, align: "right" });
    y += 40;
    doc.rect(MARGIN, y, W, 1.2).fill(BLUE);
    y += 24;

    const colA = MARGIN;
    const colB = MARGIN + W * 0.30;
    const colC = MARGIN + W * 0.57;
    const metaLabelW = 80;
    label(doc, "Van", colA, y, 150);
    label(doc, "Aan", colB, y, 150);
    y += 16;

    body(doc, COMPANY.name, colA, y, { bold: true });
    body(doc, [...COMPANY.addressLines, "", `KVK ${COMPANY.kvk}`, `btw-id ${COMPANY.vatId}`, COMPANY.email].join("\n"), colA, y + 13.5);
    body(doc, invoice.client.name, colB, y, { bold: true });
    body(doc, [...(invoice.client.address_lines || []), "", invoice.client.email].join("\n"), colB, y + 13.5, { width: W * 0.26 });

    const meta = [
      ["Factuurnummer", invoice.number],
      ["Factuurdatum", nlDate(invoice.date)],
      ["Periode", period],
      ["Klantnummer", invoice.client.client_id],
    ];
    let metaY = y;
    for (const [k, v] of meta) {
      label(doc, k, colC, metaY + 2, metaLabelW);
      body(doc, v, colC + metaLabelW, metaY, { width: MARGIN + W - colC - metaLabelW });
      metaY = doc.y + 3;
    }
    y += 140;

    // Line items
    const cw = [W * 0.46, W * 0.10, W * 0.20, W * 0.24];
    const cx = [MARGIN, MARGIN + cw[0], MARGIN + cw[0] + cw[1], MARGIN + cw[0] + cw[1] + cw[2]];
    label(doc, "Omschrijving", cx[0], y, cw[0]);
    label(doc, "Aantal", cx[1], y, cw[1], "right");
    label(doc, "Prijs excl. btw", cx[2], y, cw[2], "right");
    label(doc, "Bedrag excl. btw", cx[3], y, cw[3], "right");
    y += 13;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + W, y).lineWidth(0.75).strokeColor(INK).stroke();
    y += 9;
    body(doc, `Transactievergoeding ${period}`, cx[0], y, { width: cw[0] - 10 });
    body(doc, String(invoice.transaction_count), cx[1], y, { width: cw[1], align: "right" });
    body(doc, eur(invoice.fee_cents), cx[2], y, { width: cw[2], align: "right" });
    body(doc, eur(invoice.subtotal_cents), cx[3], y, { width: cw[3], align: "right" });
    body(doc, "Vaste vergoeding per verwerkte transactie. Specificatie per dag op pagina 2.", cx[0], y + 15, {
      width: cw[0] - 10, size: 8.5, color: MUTED,
    });
    y = doc.y + 10;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + W, y).lineWidth(0.5).strokeColor(RULE).stroke();
    y += 18;

    // Totals
    const tx = MARGIN + W * 0.55;
    const tw = W * 0.45;
    body(doc, "Totaal excl. btw", tx, y);
    body(doc, eur(invoice.subtotal_cents), tx, y, { width: tw, align: "right" });
    y += 20;
    if (invoice.vat_rate > 0) {
      body(doc, `Btw ${invoice.vat_rate}% over ${eur(invoice.subtotal_cents)}`, tx, y);
      body(doc, eur(invoice.vat_cents), tx, y, { width: tw, align: "right" });
    } else {
      body(doc, "Btw (KOR)", tx, y);
      body(doc, eur(0), tx, y, { width: tw, align: "right" });
    }
    y += 18;
    doc.moveTo(tx, y).lineTo(tx + tw, y).lineWidth(0.75).strokeColor(INK).stroke();
    y += 9;
    doc.font("Helvetica-Bold").fontSize(11.5).fillColor(DARK).text("Totaal incl. btw", tx, y);
    doc.font("Helvetica-Bold").fontSize(12).fillColor(DARK).text(eur(invoice.total_cents), tx, y, { width: tw, align: "right" });
    y += 50;

    // Notes
    const box = (title, text, fill) => {
      const pad = 10;
      doc.font("Helvetica").fontSize(9.5);
      const h = doc.heightOfString(text, { width: W - 2 * pad, lineGap: 3 }) + 13.5 + 2 * pad;
      if (fill) doc.rect(MARGIN, y, W, h).fill(fill);
      else doc.rect(MARGIN, y, W, h).lineWidth(0.75).strokeColor(RULE).stroke();
      body(doc, title, MARGIN + pad, y + pad, { bold: true });
      body(doc, text, MARGIN + pad, y + pad + 13.5, { width: W - 2 * pad });
      y += h + 11;
    };
    let payment =
      `Het totaalbedrag van ${eur(invoice.total_cents)} wordt via SEPA-incasso (Mollie) afgeschreven van de ` +
      `rekening waarvoor u een machtiging heeft afgegeven. U hoeft zelf niets over te maken. ` +
      `Vermeld bij vragen het factuurnummer ${invoice.number}.`;
    if (invoice.vat_rate === 0) payment += "\n\nVrijgesteld van btw op grond van de kleineondernemersregeling (KOR).";
    box("Betaling", payment, TINT);
    if (savingsPer > 0) {
      box(
        "Ter informatie: kinderspaarrekening",
        `Per transactie gaat ${eur(savingsPer)} naar de kinderspaarrekening. Over deze periode is dat ` +
          `${invoice.transaction_count} × ${eur(savingsPer)} = ${eur(invoice.transaction_count * savingsPer)}. ` +
          "Dit overzicht is alleen bedoeld voor uw administratie en heeft geen invloed op het factuurbedrag. " +
          "De verdeling per dag staat op pagina 2.",
      );
    }
    footer(doc, 1);

    // --- Page 2: daily specification ---
    doc.addPage({ size: "A4", margin: 0 });
    let pageNo = 2;
    y = 51;
    doc.font("Helvetica-Bold").fontSize(13).fillColor(INK).text(`Specificatie per dag — factuur ${invoice.number}`, MARGIN, y);
    y += 21;
    body(doc, `${invoice.client.name} · ${period} · ${invoice.transaction_count} transacties à ${eur(invoice.fee_cents)} · bedragen excl. btw`,
      MARGIN, y, { size: 8.5, color: MUTED });
    y += 26;

    const sw = savingsPer > 0 ? [W * 0.31, W * 0.17, W * 0.26, W * 0.26] : [W * 0.5, W * 0.22, W * 0.28];
    const sx = sw.map((_, i) => MARGIN + sw.slice(0, i).reduce((a, b) => a + b, 0));
    const header = () => {
      const heads = ["Datum", "Transacties", "Vergoeding", ...(savingsPer > 0 ? ["Kindersparen*"] : [])];
      heads.forEach((h, i) => label(doc, h, sx[i] + 4, y, sw[i] - 8, i === 0 ? "left" : "right"));
      y += 13;
      doc.moveTo(MARGIN, y).lineTo(MARGIN + W, y).lineWidth(0.75).strokeColor(INK).stroke();
      y += 1;
    };
    const row = (cells, { bold = false, shade = false } = {}) => {
      if (shade) doc.rect(MARGIN, y, W, 18).fill(ZEBRA);
      cells.forEach((c, i) => body(doc, c, sx[i] + 4, y + 4, { width: sw[i] - 8, align: i === 0 ? "left" : "right", bold, lineGap: 0 }));
      y += 18;
    };
    header();
    invoice.daily.forEach((d, i) => {
      if (y > PAGE_H - 110) {
        footer(doc, pageNo);
        doc.addPage({ size: "A4", margin: 0 });
        pageNo += 1;
        y = 51;
        header();
      }
      row([nlDate(d.day), String(d.count), eur(d.fee_cents), ...(savingsPer > 0 ? [eur(d.count * savingsPer)] : [])], { shade: i % 2 === 1 });
    });
    doc.moveTo(MARGIN, y).lineTo(MARGIN + W, y).lineWidth(0.75).strokeColor(INK).stroke();
    row(["Totaal", String(invoice.transaction_count), eur(invoice.subtotal_cents),
      ...(savingsPer > 0 ? [eur(invoice.transaction_count * savingsPer)] : [])], { bold: true });
    if (savingsPer > 0) {
      y += 8;
      body(doc, `* ${eur(savingsPer)} per transactie, ter informatie voor uw administratie. Geen onderdeel van het factuurbedrag.`,
        MARGIN, y, { size: 8.5, color: MUTED });
    }
    footer(doc, pageNo);

    doc.end();
  });
}

module.exports = { renderInvoicePdf, eur, nlDate, nlPeriod };
