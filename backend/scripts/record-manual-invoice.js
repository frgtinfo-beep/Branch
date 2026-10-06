// Registers an invoice that was made and sent by hand, so the automatic
// monthly invoicing doesn't invoice those transactions again, the next
// invoice number continues after it, and the 1st-of-month collection charges
// it like any other invoice. Sends no email.
//
// Usage (dry run first, then add --confirm to write):
//   node backend/scripts/record-manual-invoice.js --client-id primecuts \
//     --number 2026-001 --date 2026-10-06 --through 2026-09-30 [--confirm]
//
// --through is the last (local) day whose transactions are on the invoice.

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { clients, transactions, billingRuns, settings } = require("../db");
const { buildInvoiceSnapshot, localDay } = require("../services/invoiceService");
const { startOfNextMonthLocal } = require("../utils/dates");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i].replace(/^--/, "");
    if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) args[key] = true;
    else args[key] = argv[(i += 1)];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { "client-id": clientId, number, date, through } = args;
  if (!clientId || !/^\d{4}-\d{3,}$/.test(number || "") || !/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !/^\d{4}-\d{2}-\d{2}$/.test(through || "")) {
    console.error("Usage: --client-id <id> --number YYYY-NNN --date YYYY-MM-DD --through YYYY-MM-DD [--confirm]");
    process.exit(1);
  }

  const client = await (await clients()).findOne({ client_id: clientId });
  if (!client) throw new Error(`Unknown client ${clientId}`);

  const billingRunsCol = await billingRuns();
  if (await billingRunsCol.findOne({ invoice_number: number })) throw new Error(`Invoice ${number} is already recorded`);

  const transactionsCol = await transactions();
  const txns = (
    await transactionsCol
      .find({ client_id: clientId, billed: false, billing_run_id: null, cancelled: { $ne: true } })
      .sort({ occurred_at: 1 })
      .toArray()
  ).filter((txn) => localDay(txn.occurred_at) <= through);
  if (txns.length === 0) throw new Error("No uninvoiced transactions up to that date");

  const invoice = buildInvoiceSnapshot({ client, txns, number, invoiceDate: new Date(`${date}T12:00:00Z`) });
  // Same period_end the 1st-of-month collection uses for that month.
  const periodEnd = startOfNextMonthLocal(new Date(`${through}T12:00:00Z`));

  console.log({
    number,
    period: `${invoice.first_day} – ${invoice.last_day}`,
    transactions: invoice.transaction_count,
    subtotal: invoice.subtotal_cents / 100,
    vat: invoice.vat_cents / 100,
    total: invoice.total_cents / 100,
    period_end: periodEnd.toISOString(),
    address: invoice.client.address_lines,
    savings_per_transaction: invoice.savings_cents_per_transaction / 100,
  });

  if (!args.confirm) {
    console.log("\nDry run — nothing written. Re-run with --confirm to record it.");
    process.exit(0);
  }

  const existing = await billingRunsCol.findOne({ client_id: clientId, period_end: periodEnd });
  if (existing && existing.invoice_number) throw new Error(`Period already invoiced as ${existing.invoice_number}`);

  const run = await billingRunsCol.findOneAndUpdate(
    { client_id: clientId, period_end: periodEnd },
    {
      $set: {
        transaction_count: invoice.transaction_count,
        total_amount: invoice.total_cents / 100,
        status: "invoiced",
        invoice_number: number,
        invoice,
        invoiced_at: new Date(`${date}T12:00:00Z`),
        invoice_emailed_at: new Date(`${date}T12:00:00Z`),
        invoice_sent_manually: true,
        updated_at: new Date(),
      },
      $setOnInsert: { client_id: clientId, period_start: client.created_at, period_end: periodEnd, created_at: new Date() },
    },
    { upsert: true, returnDocument: "after" },
  );

  const linked = await transactionsCol.updateMany(
    { _id: { $in: txns.map((txn) => txn._id) }, billing_run_id: null },
    { $set: { billing_run_id: run._id } },
  );

  const [year, seq] = number.split("-");
  await (await settings()).updateOne({ _id: `invoiceCounter-${year}` }, { $max: { seq: Number(seq) } }, { upsert: true });

  console.log(`\nRecorded ${number}: billing run ${run._id}, ${linked.modifiedCount} transactions linked.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
