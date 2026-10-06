// Creates (or updates the fee/contact details of) a client record.
//
// Usage:
//   node backend/scripts/seed-client.js --client-id business-a --name "Business A" \
//     --email billing@example.com --fee 3.00 --currency EUR \
//     [--address "Street 1|1234 AB City|Nederland"] [--savings 0.68]
//
// --address is printed on invoices (lines separated by "|"). --savings is an
// informational per-transaction amount shown on invoices for the client's
// bookkeeper; it doesn't change what's charged.
//
// Prints the plaintext API key exactly once — it is stored only as a hash,
// so save it now (e.g. into the barber site's config) or you'll need to
// re-run this script to rotate it.

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { clients } = require("../db");
const { generateApiKey, hashApiKey } = require("../utils/apiKeys");
const { generateOnboardingToken, onboardingPath } = require("../utils/onboardingTokens");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "");
    args[key] = argv[i + 1];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const clientId = args["client-id"];
  const name = args["name"];
  const email = args["email"];
  const fee = args["fee"];
  const currency = (args["currency"] || "EUR").toUpperCase();

  if (!clientId || !name || !email || !fee) {
    console.error(
      "Usage: node backend/scripts/seed-client.js --client-id <id> --name <name> --email <billing-email> --fee <amount> [--currency EUR]",
    );
    process.exit(1);
  }

  const clientsCol = await clients();
  const existing = await clientsCol.findOne({ client_id: clientId });

  const update = {
    name,
    billing_email: email,
    fee_amount: Number(fee),
    currency,
    active: true,
    updated_at: new Date(),
  };
  if (args["address"]) update.address_lines = args["address"].split("|").map((line) => line.trim()).filter(Boolean);
  if (args["savings"]) update.savings_per_transaction = Number(args["savings"]);
  // Backfills clients created before onboarding links had a token.
  update.onboarding_token = (existing && existing.onboarding_token) || generateOnboardingToken();

  let apiKey = null;
  if (!existing) {
    apiKey = generateApiKey();
    update.client_id = clientId;
    update.api_key_hash = hashApiKey(apiKey);
    update.mollie_customer_id = null;
    update.mollie_mandate_id = null;
    update.mollie_first_payment_id = null;
    update.mandate_status = null;
    update.created_at = new Date();
  }

  await clientsCol.updateOne({ client_id: clientId }, { $set: update }, { upsert: true });

  console.log(`Client "${clientId}" ${existing ? "updated" : "created"}.`);
  if (apiKey) {
    console.log("\nAPI key (save this now — it will not be shown again):");
    console.log(apiKey);
  }
  console.log(
    `\nOnboarding link: ${process.env.APP_BASE_URL || "<APP_BASE_URL>"}${onboardingPath({ client_id: clientId, onboarding_token: update.onboarding_token })}`,
  );

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
