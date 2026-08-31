const express = require("express");
const { parse, InvalidSignatureError } = require("gocardless-nodejs");
const { config } = require("../config/env");
const { clients, billingRuns } = require("../db");

const router = express.Router();

const MANDATE_STATUS_BY_ACTION = {
  created: "pending_submission",
  active: "active",
  failed: "failed",
  cancelled: "cancelled",
};

// GC payment event actions map 1:1 onto the billing_run.status vocabulary we
// use for anything past "collecting" — no translation needed.
const PAYMENT_ACTIONS_HANDLED = new Set(["created", "submitted", "confirmed", "failed", "paid_out"]);

function logEvent(outcome, details) {
  console.log(JSON.stringify({ at: new Date().toISOString(), route: "POST /webhooks/gocardless", outcome, ...details }));
}

async function handleMandateEvent(event) {
  const newStatus = MANDATE_STATUS_BY_ACTION[event.action];
  if (!newStatus) {
    logEvent("ignored_mandate_action", { event_id: event.id, action: event.action });
    return;
  }

  const mandateId = event.links && event.links.mandate;
  const clientsCol = await clients();
  const result = await clientsCol.updateOne(
    { gocardless_mandate_id: mandateId },
    { $set: { mandate_status: newStatus, updated_at: new Date() } },
  );

  if (result.matchedCount === 0) {
    logEvent("unmatched_mandate_event", { event_id: event.id, mandate_id: mandateId, action: event.action });
    return;
  }

  logEvent("mandate_updated", { event_id: event.id, mandate_id: mandateId, action: event.action, new_status: newStatus });
}

async function handlePaymentEvent(event) {
  if (!PAYMENT_ACTIONS_HANDLED.has(event.action)) {
    logEvent("ignored_payment_action", { event_id: event.id, action: event.action });
    return;
  }

  const paymentId = event.links && event.links.payment;
  const billingRunsCol = await billingRuns();
  const result = await billingRunsCol.updateOne(
    { gocardless_payment_id: paymentId },
    { $set: { status: event.action, updated_at: new Date() } },
  );

  if (result.matchedCount === 0) {
    logEvent("unmatched_payment_event", { event_id: event.id, payment_id: paymentId, action: event.action });
    return;
  }

  logEvent("billing_run_updated", { event_id: event.id, payment_id: paymentId, action: event.action });
}

async function processEvent(event) {
  try {
    if (event.resource_type === "mandates") {
      await handleMandateEvent(event);
    } else if (event.resource_type === "payments") {
      await handlePaymentEvent(event);
    } else {
      logEvent("ignored_resource_type", { event_id: event.id, resource_type: event.resource_type });
    }
  } catch (error) {
    console.error("Webhook event processing error:", error, event);
    logEvent("processing_error", { event_id: event.id, error: error.message });
  }
}

router.post("/gocardless", (req, res) => {
  const signatureHeader = req.get("Webhook-Signature");

  // `parse` verifies the HMAC-SHA256 signature over the raw body against our
  // webhook secret, then JSON-parses it — in one step, so there is exactly
  // one place the secret is used.
  let events;
  try {
    events = parse(req.rawBody, config.goCardless.webhookSecret(), signatureHeader) || [];
  } catch (error) {
    if (error instanceof InvalidSignatureError) {
      logEvent("invalid_signature", {});
      return res.status(401).json({ error: "Invalid webhook signature" });
    }
    console.error("Webhook parse error:", error);
    return res.status(400).json({ error: "Malformed webhook body" });
  }

  // Respond immediately — GoCardless expects a fast 200 and will retry on
  // timeout. Event side effects (idempotent DB updates) happen after we've
  // already acknowledged receipt.
  res.status(200).json({ success: true });

  Promise.all(events.map(processEvent)).catch((error) => {
    console.error("Unexpected webhook batch processing error:", error);
  });
});

module.exports = router;
