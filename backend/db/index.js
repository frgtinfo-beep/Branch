const { MongoClient, GridFSBucket } = require("mongodb");

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

// --- Team portal collections ---

async function users() {
  return (await getDatabase()).collection("users");
}

async function tasks() {
  return (await getDatabase()).collection("tasks");
}

async function timeEntries() {
  return (await getDatabase()).collection("timeEntries");
}

async function availability() {
  return (await getDatabase()).collection("availability");
}

async function companyProfiles() {
  return (await getDatabase()).collection("companyProfiles");
}

async function deliverables() {
  return (await getDatabase()).collection("deliverables");
}

async function journeyStages() {
  return (await getDatabase()).collection("journeyStages");
}

// Client contract PDFs go in GridFS rather than on local disk — the app runs
// on a host with ephemeral disk storage, so anything written to disk is lost
// on every redeploy/restart. GridFS keeps the binary in the same MongoDB
// instance we already depend on.
async function contractsBucket() {
  return new GridFSBucket(await getDatabase(), { bucketName: "contracts" });
}

const DEFAULT_JOURNEY_STAGES = ["Kennismaking", "Voorstel", "Onderhandeling", "Actief", "Afgerond"];

// Idempotent — safe to call on every startup.
async function ensureIndexes() {
  const [
    clientsCol,
    transactionsCol,
    billingRunsCol,
    usersCol,
    tasksCol,
    timeEntriesCol,
    availabilityCol,
    companyProfilesCol,
    deliverablesCol,
    journeyStagesCol,
  ] = await Promise.all([
    clients(),
    transactions(),
    billingRuns(),
    users(),
    tasks(),
    timeEntries(),
    availability(),
    companyProfiles(),
    deliverables(),
    journeyStages(),
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
    usersCol.createIndex({ email: 1 }, { unique: true }),
    usersCol.createIndex({ role: 1, active: 1 }),
    tasksCol.createIndex({ assigneeIds: 1, status: 1 }),
    tasksCol.createIndex({ status: 1, deadline: 1 }),
    tasksCol.createIndex({ companyProfileId: 1 }, { sparse: true }),
    timeEntriesCol.createIndex({ taskId: 1 }),
    timeEntriesCol.createIndex({ personId: 1, date: 1 }),
    availabilityCol.createIndex({ personId: 1, date: 1 }, { unique: true }),
    companyProfilesCol.createIndex({ name: 1 }),
    companyProfilesCol.createIndex({ "board.collaborationStatus": 1 }),
    deliverablesCol.createIndex({ companyProfileId: 1 }),
    // Singleton settings doc — never overwrites an admin's existing
    // customization, just guarantees it exists on a fresh database.
    journeyStagesCol.updateOne(
      { _id: "journeyStages" },
      { $setOnInsert: { stages: DEFAULT_JOURNEY_STAGES.map((name) => ({ name })), updatedAt: new Date() } },
      { upsert: true },
    ),
  ]);
}

module.exports = {
  getDatabase,
  clients,
  transactions,
  billingRuns,
  users,
  tasks,
  timeEntries,
  availability,
  companyProfiles,
  deliverables,
  journeyStages,
  contractsBucket,
  ensureIndexes,
};
