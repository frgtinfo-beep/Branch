const { getGoCardlessClient } = require("../config/gocardless");

// Creates a mandate-only Billing Request (no payment_request — this is not
// collecting money up front, just authorizing future SEPA Direct Debit
// collections).
async function createMandateOnlyBillingRequest({ idempotencyKey }) {
  const client = getGoCardlessClient();
  // create()/find() resolve directly to the flat resource object (id, status,
  // links, ...) — the SDK unwraps the API's { "billing_requests": {...} }
  // envelope for us.
  return client.billingRequests.create({ mandate_request: { scheme: "sepa_core" } }, idempotencyKey);
}

async function createBillingRequestFlow({ billingRequestId, redirectUri, exitUri, idempotencyKey }) {
  const client = getGoCardlessClient();
  return client.billingRequestFlows.create(
    {
      redirect_uri: redirectUri,
      exit_uri: exitUri,
      links: { billing_request: billingRequestId },
    },
    idempotencyKey,
  );
}

// Never trust the `outcome` query param GoCardless appends to the redirect —
// their own docs recommend re-checking the Billing Request's actual status.
async function getBillingRequest(billingRequestId) {
  const client = getGoCardlessClient();
  return client.billingRequests.find(billingRequestId);
}

// amountInMajorUnits: a decimal string like "3.00" (euros). GoCardless wants
// the minor unit (cents) as a string.
async function createPayment({ mandateId, amountInMajorUnits, currency, chargeDate, description, idempotencyKey }) {
  const client = getGoCardlessClient();
  const amountInMinorUnits = Math.round(Number(amountInMajorUnits) * 100).toString();

  return client.payments.create(
    {
      amount: amountInMinorUnits,
      currency,
      charge_date: chargeDate,
      description,
      links: { mandate: mandateId },
    },
    idempotencyKey,
  );
}

module.exports = {
  createMandateOnlyBillingRequest,
  createBillingRequestFlow,
  getBillingRequest,
  createPayment,
};
