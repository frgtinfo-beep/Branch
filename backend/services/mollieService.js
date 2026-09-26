const { getMollieClient } = require("../config/mollie");

// Amount Mollie charges on the one-time iDEAL/Bancontact payment that
// establishes the SEPA Direct Debit mandate. Mollie doesn't allow creating a
// mandate from a zero-amount checkout, so this is the smallest real amount.
const MANDATE_VERIFICATION_AMOUNT = "0.01";

// Mollie wants amounts as a string with exactly two decimals ("3.00").
function toMollieAmount(amountInMajorUnits, currency) {
  const cents = Math.round(Number(amountInMajorUnits) * 100);
  return { currency, value: (cents / 100).toFixed(2) };
}

async function createCustomer({ name, email, clientId }) {
  const client = getMollieClient();
  return client.customers.create({ name, email, metadata: { client_id: clientId } });
}

// "first" payment: the customer pays a tiny amount via iDEAL/Bancontact, and
// Mollie derives a SEPA Direct Debit mandate from the bank account they paid
// with. Restricted to those methods so the resulting mandate is always
// directdebit (a card first payment would produce a creditcard mandate).
async function createFirstPayment({ customerId, clientId, currency, description, redirectUrl, webhookUrl }) {
  const client = getMollieClient();
  return client.payments.create({
    customerId,
    sequenceType: "first",
    method: ["ideal", "bancontact"],
    amount: toMollieAmount(MANDATE_VERIFICATION_AMOUNT, currency),
    description,
    redirectUrl,
    webhookUrl,
    metadata: { client_id: clientId, purpose: "mandate_setup" },
  });
}

// Never trust the redirect alone — Mollie's redirect carries no status at
// all, so the payment is always re-fetched to see what actually happened.
async function getPayment(paymentId) {
  const client = getMollieClient();
  return client.payments.get(paymentId);
}

async function getMandate({ customerId, mandateId }) {
  const client = getMollieClient();
  return client.customerMandates.get(mandateId, { customerId });
}

// Mollie only honours an idempotency key for about an hour, so it can't be
// the sole guard against double-charging when the monthly job is re-run
// later. This looks for a payment we already created for the billing run by
// its metadata, which is permanent.
async function findPaymentForBillingRun({ customerId, billingRunId }) {
  const client = getMollieClient();
  const page = await client.customerPayments.page({ customerId, limit: 50 });
  return (
    page.find((payment) => payment.metadata && payment.metadata.billing_run_id === billingRunId) || null
  );
}

async function createRecurringPayment({
  customerId,
  mandateId,
  amountInMajorUnits,
  currency,
  description,
  webhookUrl,
  billingRunId,
  idempotencyKey,
}) {
  const client = getMollieClient();
  return client.payments.create({
    customerId,
    mandateId,
    sequenceType: "recurring",
    amount: toMollieAmount(amountInMajorUnits, currency),
    description,
    webhookUrl,
    metadata: { billing_run_id: billingRunId },
    idempotencyKey,
  });
}

module.exports = {
  createCustomer,
  createFirstPayment,
  getPayment,
  getMandate,
  findPaymentForBillingRun,
  createRecurringPayment,
};
