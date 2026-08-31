const { clients, transactions, billingRuns } = require("../db");
const { createPayment } = require("./gocardlessService");
const { sendPreCollectionNotice } = require("./emailService");

const NOTICE_DAYS_BEFORE_COLLECTION = 5;

function log(event, details) {
  console.log(JSON.stringify({ at: new Date().toISOString(), job: "monthlyBilling", event, ...details }));
}

function flagForManualFollowUp(details) {
  // No alerting/paging integration exists in this project yet — this is the
  // single place that would wire into one. For now it's a loud, greppable
  // console.error so failures don't disappear into normal request logs.
  console.error("MANUAL FOLLOW-UP REQUIRED:", JSON.stringify(details));
}

// Sums fee_amount (Decimal128) in integer cents to avoid float drift, then
// converts back to a major-unit number for display/API calls.
function sumFeesInCents(txns) {
  return txns.reduce((cents, txn) => cents + Math.round(Number(txn.fee_amount.toString()) * 100), 0);
}

async function activeClients() {
  const clientsCol = await clients();
  return clientsCol.find({ active: true }).toArray();
}

async function unbilledTransactionsFor(clientId) {
  const transactionsCol = await transactions();
  return transactionsCol.find({ client_id: clientId, billed: false }).sort({ occurred_at: 1 }).toArray();
}

async function periodStartFor(clientId) {
  const billingRunsCol = await billingRuns();
  const lastRun = await billingRunsCol.find({ client_id: clientId }).sort({ period_end: -1 }).limit(1).next();
  if (lastRun) return lastRun.period_end;
  const clientsCol = await clients();
  const client = await clientsCol.findOne({ client_id: clientId });
  return client.created_at;
}

// Upserts so the job is safe to re-run for the same (client, period_end)
// without creating duplicate billing_run rows.
async function upsertBillingRun({ clientId, periodEnd, periodStart, transactionCount, totalAmount, status, extra = {} }) {
  const billingRunsCol = await billingRuns();
  const result = await billingRunsCol.findOneAndUpdate(
    { client_id: clientId, period_end: periodEnd },
    {
      $set: { transaction_count: transactionCount, total_amount: totalAmount, status, updated_at: new Date(), ...extra },
      $setOnInsert: { client_id: clientId, period_start: periodStart, period_end: periodEnd, created_at: new Date() },
    },
    { upsert: true, returnDocument: "after" },
  );
  return result;
}

async function sendPreCollectionNotices({ collectionDate }) {
  for (const client of await activeClients()) {
    try {
      const unbilled = await unbilledTransactionsFor(client.client_id);
      if (unbilled.length === 0) continue;

      const totalAmount = sumFeesInCents(unbilled) / 100;
      const periodStart = await periodStartFor(client.client_id);

      const billingRun = await upsertBillingRun({
        clientId: client.client_id,
        periodEnd: collectionDate,
        periodStart,
        transactionCount: unbilled.length,
        totalAmount,
        status: "notice_sent",
        extra: { precollection_notice_sent_at: new Date() },
      });

      await sendPreCollectionNotice({ client, items: unbilled, totalAmount, collectionDate });

      log("notice_sent", {
        client_id: client.client_id,
        billing_run_id: billingRun._id,
        transaction_count: unbilled.length,
        total_amount: totalAmount,
      });
    } catch (error) {
      flagForManualFollowUp({
        stage: "pre_collection_notice",
        client_id: client.client_id,
        error: error.message,
      });
    }
  }
}

async function runCollections({ collectionDate }) {
  for (const client of await activeClients()) {
    let unbilled;
    let totalAmount;
    let periodStart;

    try {
      unbilled = await unbilledTransactionsFor(client.client_id);
      if (unbilled.length === 0) {
        log("no_transactions", { client_id: client.client_id });
        continue;
      }

      totalAmount = sumFeesInCents(unbilled) / 100;
      periodStart = await periodStartFor(client.client_id);

      if (client.mandate_status !== "active" || !client.gocardless_mandate_id) {
        await upsertBillingRun({
          clientId: client.client_id,
          periodEnd: collectionDate,
          periodStart,
          transactionCount: unbilled.length,
          totalAmount,
          status: "no_mandate",
        });
        flagForManualFollowUp({
          stage: "collection",
          reason: "no_active_mandate",
          client_id: client.client_id,
          mandate_status: client.mandate_status,
          unbilled_total: totalAmount,
        });
        continue;
      }

      const billingRun = await upsertBillingRun({
        clientId: client.client_id,
        periodEnd: collectionDate,
        periodStart,
        transactionCount: unbilled.length,
        totalAmount,
        status: "collecting",
      });

      const chargeDateIso = collectionDate.toISOString().slice(0, 10);

      const payment = await createPayment({
        mandateId: client.gocardless_mandate_id,
        amountInMajorUnits: totalAmount,
        currency: client.currency,
        chargeDate: chargeDateIso,
        description: `Branch service fee — ${unbilled.length} transaction(s)`,
        // Stable per (client, period) — safe to retry this whole job without
        // ever double-charging, even if it crashes right after this call.
        idempotencyKey: `billing-run-${billingRun._id.toString()}`,
      });

      const billingRunsCol = await billingRuns();
      await billingRunsCol.updateOne(
        { _id: billingRun._id },
        { $set: { gocardless_payment_id: payment.id, status: payment.status || "submitted", updated_at: new Date() } },
      );

      const transactionsCol = await transactions();
      await transactionsCol.updateMany(
        { _id: { $in: unbilled.map((txn) => txn._id) } },
        { $set: { billed: true, billing_run_id: billingRun._id } },
      );

      log("payment_created", {
        client_id: client.client_id,
        billing_run_id: billingRun._id,
        gocardless_payment_id: payment.id,
        total_amount: totalAmount,
      });
    } catch (error) {
      // Transactions are only marked billed after the GC payment call
      // succeeds, so a failure here leaves them unbilled and they'll be
      // picked up correctly next cycle — nothing is lost or double-charged.
      // Only flip status on a record that already reflects the real
      // count/total (upserted earlier in the try block) — never recreate one
      // with placeholder zeros, which would corrupt the audit trail.
      if (totalAmount !== undefined) {
        const billingRunsCol = await billingRuns();
        await billingRunsCol
          .updateOne(
            { client_id: client.client_id, period_end: collectionDate },
            { $set: { status: "failed", updated_at: new Date() } },
          )
          .catch(() => {});
      }

      flagForManualFollowUp({
        stage: "collection",
        reason: "gocardless_error",
        client_id: client.client_id,
        error: error.message,
      });
    }
  }
}

module.exports = { sendPreCollectionNotices, runCollections, NOTICE_DAYS_BEFORE_COLLECTION };
