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

// --- "Gratis website" registrations ---

// The address shown on the contact page (frontend/contact.html)
const REGISTRATION_TEAM_EMAIL = "contact@infobranch.nl";

function registrationShell(innerHtml) {
  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; color: #111827;">
      <div style="height: 6px; background: linear-gradient(to right, #003399, #009ce3, #6dd45c); background-color: #003399;"></div>
      <div style="padding: 32px 30px;">${innerHtml}</div>
      <div style="background-color: #f8fafc; padding: 18px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Branch · Kustrif 115, 8224 BJ Lelystad · KVK 42001190</p>
      </div>
    </div>`;
}

function registrationRows(registration) {
  const telHref = registration.phone.replace(/[^0-9+]/g, "");
  const rows = [
    ["Naam bedrijf", escapeHtml(registration.companyName)],
    ["Werksector", escapeHtml(registration.sector)],
    ["KvK geregistreerd", escapeHtml(registration.kvk)],
    ["Klanten per maand", escapeHtml(registration.clientsPerMonth)],
    ["Telefoonnummer", `<a href="tel:${escapeHtml(telHref)}" style="color: #0B57D0; font-weight: 600; text-decoration: none;">${escapeHtml(registration.phone)}</a>`],
    ["E-mailadres", `<a href="mailto:${escapeHtml(registration.email)}" style="color: #0B57D0; font-weight: 600; text-decoration: none;">${escapeHtml(registration.email)}</a>`],
  ];
  return `<table style="width: 100%; border-collapse: collapse; font-size: 15px;">${rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding: 9px 0; color: #6b7280; font-size: 14px; width: 170px; border-bottom: 1px solid #f3f4f6;">${label}</td>` +
        `<td style="padding: 9px 0; border-bottom: 1px solid #f3f4f6;">${value}</td></tr>`,
    )
    .join("")}</table>`;
}

// Tells the team a new sign-up came in, with a link straight to the portal list
async function sendRegistrationTeamEmail(registration) {
  const portalUrl = process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL.replace(/\/+$/, "")}/portal/registrations` : null;
  const subjectCompany = registration.companyName.replace(/[\r\n]+/g, " ");
  await getTransporter().sendMail({
    from: `"Branch Gratis Website" <${process.env.GMAIL_USER}>`,
    to: REGISTRATION_TEAM_EMAIL,
    replyTo: registration.email,
    subject: `Nieuwe aanmelding gratis website: ${subjectCompany}`,
    html: registrationShell(`
      <p style="margin: 0 0 6px; color: #6b7280; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">Nieuwe aanmelding</p>
      <h1 style="margin: 0 0 22px; font-size: 22px;">${escapeHtml(registration.companyName)} wil een gratis website</h1>
      ${registrationRows(registration)}
      <p style="margin: 24px 0 0; font-size: 14px; color: #374151;">Bel binnen 24 uur terug, dat hebben we op de site beloofd.</p>
      ${portalUrl ? `<p style="margin: 20px 0 0;"><a href="${escapeHtml(portalUrl)}" style="display: inline-block; background: #0B57D0; color: #ffffff; font-weight: 700; text-decoration: none; padding: 12px 22px; border-radius: 999px;">Bekijk in de portal →</a></p>` : ""}
    `),
  });
}

// Confirmation to the person who signed up, in the same "je" tone as the ads
async function sendRegistrationConfirmationEmail(registration) {
  await getTransporter().sendMail({
    from: `"Branch" <${process.env.GMAIL_USER}>`,
    to: registration.email,
    replyTo: REGISTRATION_TEAM_EMAIL,
    subject: "We hebben je aanvraag voor een gratis website ontvangen",
    html: registrationShell(`
      <h1 style="margin: 0 0 14px; font-size: 24px; letter-spacing: -0.5px;">Je aanvraag is binnen</h1>
      <p style="margin: 0 0 14px; font-size: 16px; line-height: 1.6; color: #374151;">Bedankt voor je aanmelding voor een gratis website met online boeken. We bellen je <strong>binnen 24 uur</strong> op ${escapeHtml(registration.phone)} om je diensten, prijzen en stijl door te nemen.</p>
      <p style="margin: 0 0 22px; font-size: 16px; line-height: 1.6; color: #374151;"><strong style="color: #15803D;">+ Bonus:</strong> voor elke klant maken we 1 gratis ad of een draaidag voor een interview met jou.</p>
      <p style="margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Dit heb je ingevuld</p>
      ${registrationRows(registration)}
      <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">Klopt er iets niet, of heb je een vraag? Beantwoord deze e-mail of app ons op <a href="https://wa.me/31645055904" style="color: #0B57D0;">+31 6 45055904</a>.</p>
    `),
  });
}

module.exports = { sendInvoiceEmail, sendAlertEmail, sendRegistrationTeamEmail, sendRegistrationConfirmationEmail };
