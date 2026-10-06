const { clients, transactions, billingRuns } = require("../db");
const { config } = require("../config/env");
const { createRecurringPayment, findPaymentForBillingRun } = require("./mollieService");
const { refreshMandateStatus } = require("./mandateService");
const { sendInvoiceEmail } = require("./emailService");
const { nextInvoiceNumber, buildInvoiceSnapshot, localDay } = require("./invoiceService");
const { renderInvoicePdf } = require("./invoicePdf");
const { flagForManualFollowUp } = require("./alertService");
const { localCalendarDate, addLocalDays, toLocalNoon } = require("../utils/dates");

// The invoice goes out a week before the debit and doubles as the SEPA
// pre-notification of amount and date.
const INVOICE_DAYS_BEFORE_COLLECTION = 7;

// Invoiced runs whose money hasn't (successfully) been requested from Mollie
// yet. "collecting" is included so a crash mid-collection is retried —
// findPaymentForBillingRun stops that from charging twice.
const UNCOLLECTED_STATUSES = ["invoiced", "collecting", "collection_paused", "no_mandate", "collection_error"];

// A debit the bank rejects (e.g. insufficient funds) is tried again a week
// later, until this many payments in total have been attempted for one invoice.
const RETRY_AFTER_DAYS = 7;
const MAX_COLLECTION_ATTEMPTS = 2;

function log(event, details) {
  console.log(JSON.stringify({ at: new Date().toISOString(), job: "monthlyBilling", event, ...details }));
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
      await flagForManualFollowUp({ stage: "invoice", client_id: client.client_id, error: error.message });
    }
  }
}

// Charges every invoice that's due and not yet collected — one Mollie
// payment per invoice, for exactly the invoice total, so the bank statement
// always matches a factuur. Older invoices that waited on a paused client or
// a missing mandate are picked up here too.
async function runCollections({ collectionDate }) {
  const billingRunsCol = await billingRuns();

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
        await flagForManualFollowUp({
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
      await flagForManualFollowUp({ stage: "collection", reason: "mollie_error", client_id: client.client_id, error: error.message });
      continue;
    }

    for (const run of due) {
      try {
        await collectRun({ client, run });
      } catch (error) {
        // The invoice's transactions stay unbilled and the run is retried
        // on the next collection day — nothing is lost or double-charged.
        await billingRunsCol
          .updateOne({ _id: run._id }, { $set: { status: "collection_error", updated_at: new Date() } })
          .catch(() => {});
        await flagForManualFollowUp({
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

// Runs from before attempts were counted have exactly one payment if any.
function attemptsSoFar(run) {
  return run.collection_attempts || (run.mollie_payment_id ? 1 : 0);
}

// Requests one payment for one invoice. Each attempt gets its own payment,
// tagged with the attempt number, so a re-run after a crash right after the
// API call picks up that attempt's payment instead of charging twice — and a
// retry doesn't mistake the earlier, failed payment for its own.
async function collectRun({ client, run }) {
  const billingRunsCol = await billingRuns();
  const transactionsCol = await transactions();
  const billingRunId = run._id.toString();
  const attempt = attemptsSoFar(run) + 1;

  await billingRunsCol.updateOne({ _id: run._id }, { $set: { status: "collecting", updated_at: new Date() } });

  const payment =
    (await findPaymentForBillingRun({ customerId: client.mollie_customer_id, billingRunId, attempt })) ||
    (await createRecurringPayment({
      customerId: client.mollie_customer_id,
      mandateId: client.mollie_mandate_id,
      amountInMajorUnits: run.invoice.total_cents / 100,
      currency: client.currency,
      description: `Branch factuur ${run.invoice_number}`,
      webhookUrl: config.mollie.webhookUrl(),
      billingRunId,
      attempt,
      idempotencyKey: attempt === 1 ? `billing-run-${billingRunId}` : `billing-run-${billingRunId}-attempt-${attempt}`,
    }));

  await billingRunsCol.updateOne(
    { _id: run._id },
    {
      $set: { mollie_payment_id: payment.id, status: payment.status, collection_attempts: attempt, collected_at: new Date(), updated_at: new Date() },
      $unset: { retry_at: "" },
    },
  );
  await transactionsCol.updateMany({ billing_run_id: run._id }, { $set: { billed: true } });

  log("payment_created", {
    client_id: client.client_id,
    billing_run_id: run._id,
    invoice_number: run.invoice_number,
    mollie_payment_id: payment.id,
    attempt,
    total_cents: run.invoice.total_cents,
  });
}

// Called from the Mollie webhook once a debit for an invoice has failed or
// been charged back. A failed debit is retried a week later (the daily job's
// runRetries picks it up); a chargeback is the client disputing the debit,
// so it is never retried automatically. Either way Branch gets an email.
async function handleFailedCollection({ run, payment, status }) {
  const attempts = attemptsSoFar(run);
  const bankReason = payment.details && payment.details.bankReason;
  const base = {
    stage: "collection_webhook",
    client_id: run.client_id,
    invoice_number: run.invoice_number,
    amount: `€ ${(run.invoice.total_cents / 100).toFixed(2)}`,
    mollie_payment_id: payment.id,
    status,
    bank_reason: bankReason,
    attempt: `${attempts} of ${MAX_COLLECTION_ATTEMPTS}`,
  };

  if (status === "failed" && attempts < MAX_COLLECTION_ATTEMPTS) {
    const retryAt = addLocalDays(new Date(), RETRY_AFTER_DAYS);
    const billingRunsCol = await billingRuns();
    await billingRunsCol.updateOne({ _id: run._id }, { $set: { retry_at: retryAt, updated_at: new Date() } });
    await flagForManualFollowUp({
      ...base,
      subject: `Debit failed: ${run.client_id} invoice ${run.invoice_number} — retrying ${localDay(retryAt)}`,
      summary: `The SEPA debit for invoice ${run.invoice_number} failed. It will be tried again automatically on ${localDay(retryAt)}.`,
      retry_on: localDay(retryAt),
    });
    return;
  }

  await flagForManualFollowUp({
    ...base,
    subject:
      status === "charged_back"
        ? `Chargeback: ${run.client_id} invoice ${run.invoice_number}`
        : `Debit failed again: ${run.client_id} invoice ${run.invoice_number} — no more retries`,
    summary:
      status === "charged_back"
        ? `The client reversed the SEPA debit for invoice ${run.invoice_number}. It won't be retried automatically — contact the client.`
        : `The SEPA debit for invoice ${run.invoice_number} failed ${attempts} times. It won't be retried automatically — contact the client.`,
  });
}

// Re-collects failed debits whose retry date has come. Runs daily.
async function runRetries({ now }) {
  const billingRunsCol = await billingRuns();
  const clientsCol = await clients();

  const due = await billingRunsCol
    .find({ status: "failed", retry_at: { $lte: toLocalNoon(now) } })
    .sort({ retry_at: 1 })
    .toArray();

  for (const run of due) {
    const client = await clientsCol.findOne({ client_id: run.client_id });
    try {
      // Stays due and is retried the first day collection is possible again.
      if (!client || !client.active || client.collection_paused) {
        log("retry_waiting", { client_id: run.client_id, invoice_number: run.invoice_number });
        continue;
      }

      const mandateStatus = await refreshMandateStatus(client);
      if (mandateStatus !== "active" || !client.mollie_mandate_id) {
        // Same as on a collection day: collected once a mandate is back.
        await billingRunsCol.updateOne(
          { _id: run._id },
          { $set: { status: "no_mandate", updated_at: new Date() }, $unset: { retry_at: "" } },
        );
        await flagForManualFollowUp({
          stage: "retry",
          reason: "no_active_mandate",
          client_id: client.client_id,
          mandate_status: mandateStatus,
          invoice_number: run.invoice_number,
        });
        continue;
      }

      await collectRun({ client, run });
    } catch (error) {
      // Back to failed with retry_at untouched, so tomorrow's run tries again.
      await billingRunsCol
        .updateOne({ _id: run._id }, { $set: { status: "failed", updated_at: new Date() } })
        .catch(() => {});
      await flagForManualFollowUp({
        stage: "retry",
        reason: "mollie_error",
        client_id: run.client_id,
        invoice_number: run.invoice_number,
        error: error.message,
      });
    }
  }
}

module.exports = { sendInvoices, runCollections, runRetries, handleFailedCollection, INVOICE_DAYS_BEFORE_COLLECTION };
