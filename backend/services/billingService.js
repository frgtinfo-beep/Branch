const { clients, transactions, billingRuns } = require("../db");
const { config } = require("../config/env");
const { createRecurringPayment, findPaymentForBillingRun } = require("./mollieService");
const { refreshMandateStatus } = require("./mandateService");
const { sendInvoiceEmail } = require("./emailService");
const { nextInvoiceNumber, buildInvoiceSnapshot, localDay } = require("./invoiceService");
const { renderInvoicePdf } = require("./invoicePdf");
const { localCalendarDate } = require("../utils/dates");

// The invoice goes out a week before the debit and doubles as the SEPA
// pre-notification of amount and date.
const INVOICE_DAYS_BEFORE_COLLECTION = 7;

// Invoiced runs whose money hasn't (successfully) been requested from Mollie
// yet. "collecting" is included so a crash mid-collection is retried —
// findPaymentForBillingRun stops that from charging twice.
const UNCOLLECTED_STATUSES = ["invoiced", "collecting", "collection_paused", "no_mandate", "collection_error"];

function log(event, details) {
  console.log(JSON.stringify({ at: new Date().toISOString(), job: "monthlyBilling", event, ...details }));
}

function flagForManualFollowUp(details) {
  // No alerting/paging integration exists in this project yet — this is the
  // single place that would wire into one. For now it's a loud, greppable
  // console.error so failures don't disappear into normal request logs.
  console.error("MANUAL FOLLOW-UP REQUIRED:", JSON.stringify(details));
}

async function activeClients() {
  const clientsCol = await clients();
  return clientsCol.find({ active: true }).toArray();
}

// Not yet on any invoice. Transactions reported after an invoice went out
// stay here and land on the next one.
async function uninvoicedTransactionsFor(clientId) {
  const transactionsCol = await transactions();
  return transactionsCol
    .find({ client_id: clientId, billed: false, billing_run_id: null, cancelled: { $ne: true } })
    .sort({ occurred_at: 1 })
    .toArray();
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

async function emailInvoice({ client, run, collectionDate }) {
  const pdf = await renderInvoicePdf(run.invoice);
  await sendInvoiceEmail({ client, invoice: run.invoice, pdf, collectionDay: localDay(collectionDate) });
  const billingRunsCol = await billingRuns();
  await billingRunsCol.updateOne({ _id: run._id }, { $set: { invoice_emailed_at: new Date(), updated_at: new Date() } });
}

// Invoices every active client for whatever they haven't been invoiced for
// yet, and emails the PDF. Paused clients are invoiced too — the work was
// done; collection just waits until their mandate is live.
async function sendInvoices({ collectionDate, now = new Date() }) {
  const billingRunsCol = await billingRuns();

  for (const client of await activeClients()) {
    try {
      const existing = await billingRunsCol.findOne({ client_id: client.client_id, period_end: collectionDate });
      if (existing && existing.invoice_number) {
        // Re-run after a crash between creating the invoice and emailing it.
        if (!existing.invoice_emailed_at) await emailInvoice({ client, run: existing, collectionDate });
        continue;
      }

      const txns = await uninvoicedTransactionsFor(client.client_id);
      if (txns.length === 0) continue;

      const number = await nextInvoiceNumber(localCalendarDate(now).year);
      const invoice = buildInvoiceSnapshot({ client, txns, number, invoiceDate: now });

      const run = await upsertBillingRun({
        clientId: client.client_id,
        periodEnd: collectionDate,
        periodStart: await periodStartFor(client.client_id),
        transactionCount: invoice.transaction_count,
        totalAmount: invoice.total_cents / 100,
        status: "invoiced",
        extra: { invoice_number: number, invoice, invoiced_at: new Date() },
      });

      const transactionsCol = await transactions();
      await transactionsCol.updateMany(
        { _id: { $in: txns.map((txn) => txn._id) }, billing_run_id: null },
        { $set: { billing_run_id: run._id } },
      );

      await emailInvoice({ client, run, collectionDate });

      log("invoice_sent", {
        client_id: client.client_id,
        billing_run_id: run._id,
        invoice_number: number,
        transaction_count: invoice.transaction_count,
        total_cents: invoice.total_cents,
      });
    } catch (error) {
      flagForManualFollowUp({ stage: "invoice", client_id: client.client_id, error: error.message });
    }
  }
}

// Charges every invoice that's due and not yet collected — one Mollie
// payment per invoice, for exactly the invoice total, so the bank statement
// always matches a factuur. Older invoices that waited on a paused client or
// a missing mandate are picked up here too.
async function runCollections({ collectionDate }) {
  const billingRunsCol = await billingRuns();
  const transactionsCol = await transactions();

  for (const client of await activeClients()) {
    const due = await billingRunsCol
      .find({
        client_id: client.client_id,
        invoice_number: { $exists: true },
        status: { $in: UNCOLLECTED_STATUSES },
        period_end: { $lte: collectionDate },
      })
      .sort({ period_end: 1 })
      .toArray();

    if (due.length === 0) {
      log("nothing_due", { client_id: client.client_id });
      continue;
    }
    const dueIds = due.map((run) => run._id);
    const dueCents = due.reduce((sum, run) => sum + run.invoice.total_cents, 0);

    try {
      if (client.collection_paused) {
        // Provider migration in progress — the invoices stand, the charge
        // waits. Expected, not a failure, so nobody gets paged.
        await billingRunsCol.updateMany({ _id: { $in: dueIds } }, { $set: { status: "collection_paused", updated_at: new Date() } });
        log("collection_paused", { client_id: client.client_id, invoices: due.map((r) => r.invoice_number), due_cents: dueCents });
        continue;
      }

      const mandateStatus = await refreshMandateStatus(client);
      if (mandateStatus !== "active" || !client.mollie_mandate_id) {
        await billingRunsCol.updateMany({ _id: { $in: dueIds } }, { $set: { status: "no_mandate", updated_at: new Date() } });
        flagForManualFollowUp({
          stage: "collection",
          reason: "no_active_mandate",
          client_id: client.client_id,
          mandate_status: mandateStatus,
          invoices: due.map((r) => r.invoice_number),
          due_cents: dueCents,
        });
        continue;
      }
    } catch (error) {
      flagForManualFollowUp({ stage: "collection", reason: "mollie_error", client_id: client.client_id, error: error.message });
      continue;
    }

    for (const run of due) {
      try {
        await billingRunsCol.updateOne({ _id: run._id }, { $set: { status: "collecting", updated_at: new Date() } });
        const billingRunId = run._id.toString();

        // Re-running for an invoice whose payment was created but never
        // recorded (crash right after the API call) must pick that payment
        // up, not charge a second time.
        const payment =
          (await findPaymentForBillingRun({ customerId: client.mollie_customer_id, billingRunId })) ||
          (await createRecurringPayment({
            customerId: client.mollie_customer_id,
            mandateId: client.mollie_mandate_id,
            amountInMajorUnits: run.invoice.total_cents / 100,
            currency: client.currency,
            description: `Branch factuur ${run.invoice_number}`,
            webhookUrl: config.mollie.webhookUrl(),
            billingRunId,
            idempotencyKey: `billing-run-${billingRunId}`,
          }));

        await billingRunsCol.updateOne(
          { _id: run._id },
          { $set: { mollie_payment_id: payment.id, status: payment.status, collected_at: new Date(), updated_at: new Date() } },
        );
        await transactionsCol.updateMany({ billing_run_id: run._id }, { $set: { billed: true } });

        log("payment_created", {
          client_id: client.client_id,
          billing_run_id: run._id,
          invoice_number: run.invoice_number,
          mollie_payment_id: payment.id,
          total_cents: run.invoice.total_cents,
        });
      } catch (error) {
        // The invoice's transactions stay unbilled and the run is retried
        // on the next collection day — nothing is lost or double-charged.
        await billingRunsCol
          .updateOne({ _id: run._id }, { $set: { status: "collection_error", updated_at: new Date() } })
          .catch(() => {});
        flagForManualFollowUp({
          stage: "collection",
          reason: "mollie_error",
          client_id: client.client_id,
          invoice_number: run.invoice_number,
          error: error.message,
        });
      }
    }
  }
}

module.exports = { sendInvoices, runCollections, INVOICE_DAYS_BEFORE_COLLECTION };
