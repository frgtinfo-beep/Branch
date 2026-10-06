const nodemailer = require("nodemailer");
const { escapeHtml } = require("../utils/html");
const { eur, nlDate } = require("./invoicePdf");

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

// Monthly invoice, sent a week before the direct debit. It doubles as the
// SEPA pre-notification (amount + collection date). Branch's own mailbox is
// CC'd so every invoice lands in the administration automatically.
async function sendInvoiceEmail({ client, invoice, pdf, collectionDay }) {
  await getTransporter().sendMail({
    from: `"Branch" <${process.env.GMAIL_USER}>`,
    to: client.billing_email,
    cc: process.env.GMAIL_USER,
    subject: `Factuur ${invoice.number} van Branch — ${eur(invoice.total_cents)}`,
    attachments: [{ filename: `Factuur-${invoice.number}-Branch.pdf`, content: pdf, contentType: "application/pdf" }],
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
        <h2 style="margin-top: 0;">Factuur ${escapeHtml(invoice.number)}</h2>
        <p>Beste ${escapeHtml(client.name)},</p>
        <p>
          In de bijlage vindt u factuur <strong>${escapeHtml(invoice.number)}</strong> voor
          ${invoice.transaction_count} verwerkte transactie(s).
        </p>
        <p>
          Het totaalbedrag van <strong>${eur(invoice.total_cents)}</strong> (incl. ${invoice.vat_rate}% btw)
          wordt rond <strong>${nlDate(collectionDay)}</strong> via SEPA-incasso van uw rekening afgeschreven.
          U hoeft zelf niets over te maken.
        </p>
        <p style="color: #6b7280; font-size: 13px;">
          Vragen over deze factuur? Beantwoord gewoon deze e-mail.
        </p>
        <p>Met vriendelijke groet,<br>Branch</p>
      </div>
    `,
  });
}

// Internal alert to Branch itself (never the client) when billing needs a
// human: a failed debit, a missing mandate, a Mollie error.
async function sendAlertEmail({ subject, summary, details }) {
  const rows = Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(
      ([key, value]) =>
        `<tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">${escapeHtml(key)}</td>` +
        `<td style="padding: 4px 0;">${escapeHtml(typeof value === "object" ? JSON.stringify(value) : String(value))}</td></tr>`,
    )
    .join("");

  await getTransporter().sendMail({
    from: `"Branch billing" <${process.env.GMAIL_USER}>`,
    to: process.env.ALERT_EMAIL || process.env.GMAIL_USER,
    subject: `[Branch] ${subject}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
        <p>${escapeHtml(summary)}</p>
        <table style="border-collapse: collapse; font-size: 14px;">${rows}</table>
      </div>
    `,
  });
}

module.exports = { sendInvoiceEmail, sendAlertEmail };
