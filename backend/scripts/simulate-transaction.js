// Simulates the barber site's call to POST /api/transactions, so the
// receiving endpoint can be tested before that site exists.
//
// Usage:
//   node backend/scripts/simulate-transaction.js --api-key <key> --amount 42.50 \
//     [--client-id business-a] [--transaction-id sim-<random>] [--base-url http://localhost:3000]
//
// Equivalent curl:
//   curl -X POST http://localhost:3000/api/transactions \
//     -H "Authorization: Bearer <api_key>" \
//     -H "Content-Type: application/json" \
//     -d '{"client_id":"business-a","amount":42.50,"currency":"EUR","transaction_id":"sim-001","timestamp":"2026-08-31T10:00:00Z"}'

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    args[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const apiKey = args["api-key"];
  const amount = args["amount"];
  if (!apiKey || !amount) {
    console.error(
      "Usage: node backend/scripts/simulate-transaction.js --api-key <key> --amount <amount> [--client-id business-a] [--transaction-id sim-...] [--base-url http://localhost:3000]",
    );
    process.exit(1);
  }

  const baseUrl = args["base-url"] || "http://localhost:3000";
  const body = {
    client_id: args["client-id"] || "business-a",
    amount: Number(amount),
    currency: args["currency"] || "EUR",
    transaction_id: args["transaction-id"] || `sim-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };

  const response = await fetch(`${baseUrl}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  const responseBody = await response.json().catch(() => null);
  console.log(`Status: ${response.status}`);
  console.log(JSON.stringify(responseBody, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
