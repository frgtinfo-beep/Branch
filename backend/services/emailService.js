const nodemailer = require("nodemailer");

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

function formatCurrency(amount, currency) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(amount);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

// `items` are { external_transaction_id, occurred_at, fee_amount } for the
// itemized breakdown the client can check against their own records.
async function sendPreCollectionNotice({ client, items, totalAmount, collectionDate }) {
  const rows = items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${formatDate(item.occurred_at)}</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px;">${item.external_transaction_id}</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">${formatCurrency(Number(item.fee_amount.toString()), client.currency)}</td>
        </tr>`,
    )
    .join("");

  await getTransporter().sendMail({
    from: `"Branch" <${process.env.GMAIL_USER}>`,
    to: client.billing_email,
    subject: `Upcoming Direct Debit collection — ${formatCurrency(totalAmount, client.currency)} on ${formatDate(collectionDate)}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
        <h2 style="margin-top: 0;">Upcoming Direct Debit collection</h2>
        <p>Hi ${client.name},</p>
        <p>
          We'll be collecting <strong>${formatCurrency(totalAmount, client.currency)}</strong> via SEPA Direct Debit
          on <strong>${formatDate(collectionDate)}</strong> for ${items.length} transaction(s) reported since your last collection.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">Date</th>
              <th style="text-align: left; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">Transaction</th>
              <th style="text-align: right; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">Fee</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color: #6b7280; font-size: 13px;">
          If you have any questions about this collection, just reply to this email.
        </p>
      </div>
    `,
  });
}

module.exports = { sendPreCollectionNotice };
