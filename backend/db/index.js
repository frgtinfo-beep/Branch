const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI);
const databaseName = process.env.MONGODB_DB || "Branch";
let database;

async function getDatabase() {
  if (!database) {
    await client.connect();
    database = client.db(databaseName);
  }
  return database;
}

async function clients() {
  return (await getDatabase()).collection("clients");
}

async function transactions() {
  return (await getDatabase()).collection("transactions");
}

async function billingRuns() {
  return (await getDatabase()).collection("billing_runs");
}

// Idempotent — safe to call on every startup.
async function ensureIndexes() {
  const [clientsCol, transactionsCol, billingRunsCol] = await Promise.all([
    clients(),
    transactions(),
    billingRuns(),
  ]);

  await Promise.all([
    clientsCol.createIndex({ client_id: 1 }, { unique: true }),
    clientsCol.createIndex({ api_key_hash: 1 }, { unique: true, sparse: true }),
    // This is the idempotency guarantee for POST /api/transactions.
    transactionsCol.createIndex(
      { client_id: 1, external_transaction_id: 1 },
      { unique: true },
    ),
    transactionsCol.createIndex({ client_id: 1, billed: 1 }),
    billingRunsCol.createIndex({ client_id: 1, created_at: -1 }),
    billingRunsCol.createIndex({ gocardless_payment_id: 1 }, { sparse: true }),
    // One billing_run per client per period — lets the daily job upsert
    // safely if it's ever triggered twice for the same collection date.
    billingRunsCol.createIndex({ client_id: 1, period_end: 1 }, { unique: true }),
  ]);
}

module.exports = { getDatabase, clients, transactions, billingRuns, ensureIndexes };
