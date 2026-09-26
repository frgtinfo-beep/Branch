const express = require("express");
const { clients, billingRuns } = require("../db");
const { getPayment } = require("../services/mollieService");
const { applyFirstPaymentResult } = require("../services/mandateService");

const router = express.Router();

function logEvent(outcome, details) {
  console.log(JSON.stringify({ at: new Date().toISOString(), route: "POST /webhooks/mollie", outcome, ...details }));
}

async function handleFirstPayment(payment) {
  const clientsCol = await clients();
  const client = await clientsCol.findOne({ mollie_first_payment_id: payment.id });
  if (!client) {
    // An older, superseded attempt (the client restarted onboarding).
    logEvent("unmatched_first_payment", { payment_id: payment.id, status: payment.status });
    return;
  }

  const { outcome, mandateStatus } = await applyFirstPaymentResult(client, payment);
  logEvent("mandate_setup_updated", { payment_id: payment.id, client_id: client.client_id, result: outcome, mandate_status: mandateStatus });
}

async function handleRecurringPayment(payment) {
  // A chargeback leaves the payment "paid" and only shows up as an amount —
  // surface it as its own status so it doesn't read as a successful collection.
  const status = payment.hasChargebacks() ? "charged_back" : payment.status;

  const billingRunsCol = await billingRuns();
  const result = await billingRunsCol.updateOne(
    { mollie_payment_id: payment.id },
    { $set: { status, updated_at: new Date() } },
  );

  if (result.matchedCount === 0) {
    logEvent("unmatched_payment", { payment_id: payment.id, status });
    return;
  }

  logEvent("billing_run_updated", { payment_id: payment.id, status });
  if (status === "failed" || status === "charged_back") {
    console.error("MANUAL FOLLOW-UP REQUIRED:", JSON.stringify({ stage: "collection_webhook", payment_id: payment.id, status }));
  }
}

// Mollie webhooks are unsigned and carry only the payment id (form-encoded
// `id=tr_...`). That's by design: the only trustworthy data is what we fetch
// back from the API with our own key, so a forged call can't change anything.
router.post("/mollie", async (req, res) => {
  const paymentId = req.body && req.body.id;
  if (typeof paymentId !== "string" || !paymentId.startsWith("tr_")) {
    return res.status(400).json({ error: "Missing payment id" });
  }

  let payment;
  try {
    payment = await getPayment(paymentId);
  } catch (error) {
    // Unknown id (or a test-mode id hitting the live key) — answer 200 so we
    // don't reveal which ids exist, and so Mollie doesn't keep retrying.
    if (error.statusCode === 404) {
      logEvent("unknown_payment", { payment_id: paymentId });
      return res.status(200).end();
    }
    console.error("Mollie webhook fetch error:", error);
    return res.status(502).end();
  }

  try {
    if (payment.sequenceType === "first") {
      await handleFirstPayment(payment);
    } else {
      await handleRecurringPayment(payment);
    }
    res.status(200).end();
  } catch (error) {
    // Non-2xx makes Mollie retry later; all updates above are idempotent.
    console.error("Mollie webhook processing error:", error);
    logEvent("processing_error", { payment_id: paymentId, error: error.message });
    res.status(500).end();
  }
});

module.exports = router;
