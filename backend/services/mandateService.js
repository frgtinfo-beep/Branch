const { clients } = require("../db");
const { getMandate } = require("./mollieService");

// Mollie mandate statuses mapped onto the mandate_status vocabulary the rest
// of the app (billing job, admin dashboard) already uses.
const MANDATE_STATUS_BY_MOLLIE_STATUS = {
  valid: "active",
  pending: "pending_submission",
  invalid: "failed",
};

// Unknown statuses count as failed so the billing job never charges on a
// mandate we can't vouch for.
function toMandateStatus(mollieStatus) {
  return MANDATE_STATUS_BY_MOLLIE_STATUS[mollieStatus] || "failed";
}

// What the customer is told after the setup payment: only an active mandate
// is "authorized"; a rejected one reads as not completed so they retry.
const OUTCOME_BY_MANDATE_STATUS = {
  active: "authorized",
  pending_submission: "processing",
  failed: "cancelled",
};

// Outcome of the one-time mandate-setup payment -> client mandate fields.
// Called from both the onboarding redirect and the webhook, whichever
// arrives first; both are idempotent.
async function applyFirstPaymentResult(client, payment) {
  const clientsCol = await clients();

  if (payment.status === "paid" && payment.mandateId) {
    const mandate = await getMandate({ customerId: payment.customerId, mandateId: payment.mandateId });
    const mandateStatus = toMandateStatus(mandate.status);
    // A rejected re-authorization (e.g. switching bank accounts) mustn't
    // replace the mandate that's still collecting fine.
    if (mandateStatus === "failed" && client.mandate_status === "active") {
      return { outcome: OUTCOME_BY_MANDATE_STATUS[mandateStatus], mandateStatus: client.mandate_status };
    }
    await clientsCol.updateOne(
      { _id: client._id },
      { $set: { mollie_mandate_id: mandate.id, mandate_status: mandateStatus, updated_at: new Date() } },
    );
    return { outcome: OUTCOME_BY_MANDATE_STATUS[mandateStatus], mandateStatus };
  }

  if (["canceled", "expired", "failed"].includes(payment.status)) {
    // Don't clobber a mandate that's already active from an earlier,
    // successful attempt just because a later retry was abandoned.
    if (client.mandate_status !== "active") {
      await clientsCol.updateOne(
        { _id: client._id },
        { $set: { mandate_status: payment.status === "failed" ? "failed" : "cancelled", updated_at: new Date() } },
      );
    }
    return { outcome: "cancelled" };
  }

  return { outcome: "processing" };
}

// Mollie doesn't send webhooks for mandate changes (e.g. the customer
// revoking it at their bank), so the billing job re-checks the mandate right
// before charging instead of trusting the stored status.
async function refreshMandateStatus(client) {
  if (!client.mollie_customer_id || !client.mollie_mandate_id) return client.mandate_status || null;

  const mandate = await getMandate({ customerId: client.mollie_customer_id, mandateId: client.mollie_mandate_id });
  const mandateStatus = toMandateStatus(mandate.status);

  if (mandateStatus !== client.mandate_status) {
    const clientsCol = await clients();
    await clientsCol.updateOne({ _id: client._id }, { $set: { mandate_status: mandateStatus, updated_at: new Date() } });
  }
  return mandateStatus;
}

module.exports = { applyFirstPaymentResult, refreshMandateStatus };
