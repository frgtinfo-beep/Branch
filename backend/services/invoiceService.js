const { settings } = require("../db");
const { VAT_RATE_PERCENT } = require("../config/company");
const { localCalendarDate } = require("../utils/dates");

function localDay(date) {
  const { year, month, day } = localCalendarDate(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toCents(decimal) {
  return Math.round(Number(decimal.toString()) * 100);
}

// Dutch invoices need an unbroken sequence per year. One counter doc per
// year in `settings`, bumped atomically so two runs can never share a number.
async function nextInvoiceNumber(year) {
  const settingsCol = await settings();
  const counter = await settingsCol.findOneAndUpdate(
    { _id: `invoiceCounter-${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return `${year}-${String(counter.seq).padStart(3, "0")}`;
}

// Everything the PDF needs, frozen at invoice time — later changes to the
// client's address or fee never alter an invoice that was already sent.
function buildInvoiceSnapshot({ client, txns, number, invoiceDate }) {
  const feeCents = Math.round(Number(client.fee_amount) * 100);
  const byDay = new Map();
  let subtotalCents = 0;
  for (const txn of txns) {
    const day = localDay(txn.occurred_at);
    const cents = toCents(txn.fee_amount);
    const entry = byDay.get(day) || { day, count: 0, fee_cents: 0 };
    entry.count += 1;
    entry.fee_cents += cents;
    byDay.set(day, entry);
    subtotalCents += cents;
  }
  const daily = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  const vatCents = Math.round((subtotalCents * VAT_RATE_PERCENT) / 100);

  return {
    number,
    date: localDay(invoiceDate),
    first_day: daily[0].day,
    last_day: daily[daily.length - 1].day,
    transaction_count: txns.length,
    fee_cents: feeCents,
    subtotal_cents: subtotalCents,
    vat_rate: VAT_RATE_PERCENT,
    vat_cents: vatCents,
    total_cents: subtotalCents + vatCents,
    savings_cents_per_transaction: client.savings_per_transaction
      ? Math.round(Number(client.savings_per_transaction) * 100)
      : 0,
    daily,
    client: {
      client_id: client.client_id,
      name: client.name,
      address_lines: client.address_lines || [],
      email: client.billing_email,
    },
  };
}

module.exports = { nextInvoiceNumber, buildInvoiceSnapshot, localDay };
