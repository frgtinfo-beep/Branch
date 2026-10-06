// Writes a draft PDF of what a client's next invoice would look like right
// now, without saving anything, using up an invoice number or sending email.
//
// Usage:
//   node backend/scripts/preview-invoice.js --client-id primecuts --out /tmp/preview.pdf

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { clients, transactions } = require("../db");
const { buildInvoiceSnapshot } = require("../services/invoiceService");
const { renderInvoicePdf } = require("../services/invoicePdf");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, "")] = argv[i + 1];
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args["client-id"] || !args.out) {
    console.error("Usage: --client-id <id> --out <file.pdf>");
    process.exit(1);
  }

  const client = await (await clients()).findOne({ client_id: args["client-id"] });
  if (!client) throw new Error(`Unknown client ${args["client-id"]}`);

  const txns = await (await transactions())
    .find({ client_id: client.client_id, billed: false, billing_run_id: null, cancelled: { $ne: true } })
    .sort({ occurred_at: 1 })
    .toArray();
  if (txns.length === 0) throw new Error("Nothing to invoice yet");

  const invoice = buildInvoiceSnapshot({ client, txns, number: "CONCEPT", invoiceDate: new Date() });
  fs.writeFileSync(args.out, await renderInvoicePdf(invoice));
  console.log(`${invoice.transaction_count} transactions, total € ${(invoice.total_cents / 100).toFixed(2)} -> ${args.out}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
