// Manually triggers the daily billing check — useful for testing the notice
// email and GoCardless payment creation against the sandbox without waiting
// for the real 1st-of-month / notice-day dates to roll around.
//
// Usage:
//   node backend/scripts/run-billing.js                  # runs as if "now"
//   node backend/scripts/run-billing.js --date 2026-09-01 # simulate a specific date

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { assertEnv } = require("../config/env");
assertEnv();

const { runDailyBillingCheck } = require("../jobs/monthlyBilling");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    args[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = args.date ? new Date(`${args.date}T08:00:00`) : new Date();

  console.log(`Running daily billing check as of ${now.toISOString()}...`);
  const result = await runDailyBillingCheck({ now });
  console.log(result);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
