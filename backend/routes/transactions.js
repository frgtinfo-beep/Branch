const express = require("express");
const { Decimal128 } = require("mongodb");
const { transactions } = require("../db");
const { apiKeyAuth } = require("../middleware/apiKeyAuth");

const router = express.Router();

const MAX_SANE_AMOUNT = 100000; // sanity ceiling, not a business limit — catches obvious garbage payloads

function logRequest(outcome, details) {
  console.log(
    JSON.stringify({
      at: new Date().toISOString(),
      route: "POST /api/transactions",
      outcome,
      ...details,
    }),
  );
}

function validatePayload(body, client) {
  const { client_id, amount, currency, transaction_id, timestamp } = body;

  if (!client_id || typeof client_id !== "string") {
    return "client_id is required and must be a string";
  }
  if (client_id !== client.client_id) {
    return "client_id does not match the client authenticated by this API key";
  }
  if (amount === undefined || amount === null || Number.isNaN(Number(amount))) {
    return "amount is required and must be a number";
  }
  const numericAmount = Number(amount);
  if (numericAmount <= 0 || !Number.isFinite(numericAmount) || numericAmount > MAX_SANE_AMOUNT) {
    return `amount must be a positive number no greater than ${MAX_SANE_AMOUNT}`;
  }
  if (!currency || typeof currency !== "string" || currency.toUpperCase() !== client.currency) {
    return `currency is required and must be "${client.currency}" for this client`;
  }
  if (!transaction_id || typeof transaction_id !== "string") {
    return "transaction_id is required and must be a string";
  }
  if (!timestamp || Number.isNaN(Date.parse(timestamp))) {
    return "timestamp is required and must be a valid ISO 8601 date";
  }

  return null;
}

router.post("/", apiKeyAuth, async (req, res) => {
  const client = req.client;
  const body = req.body || {};

  const validationError = validatePayload(body, client);
  if (validationError) {
    logRequest("rejected", { reason: validationError, client_id: body.client_id, body });
    return res.status(400).json({ error: validationError });
  }

  const { amount, currency, transaction_id, timestamp } = body;

  try {
    const transactionsCol = await transactions();

    const doc = {
      client_id: client.client_id,
      // Normalize through Number() first — Decimal128.fromString rejects
      // otherwise-valid formats it doesn't parse itself (scientific
      // notation, leading "+", etc.), and validatePayload already confirmed
      // this coerces to a finite positive number.
      amount: Decimal128.fromString(String(Number(amount))),
      currency: currency.toUpperCase(),
      external_transaction_id: transaction_id,
      occurred_at: new Date(timestamp),
      fee_amount: Decimal128.fromString(String(client.fee_amount)),
      billed: false,
      billing_run_id: null,
      created_at: new Date(),
    };

    await transactionsCol.insertOne(doc);

    logRequest("recorded", { client_id: client.client_id, transaction_id });
    return res.status(201).json({ success: true, already_recorded: false });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate transaction_id for this client — the barber's site is
      // retrying a call we already recorded. Idempotent success, not an error.
      logRequest("duplicate", { client_id: client.client_id, transaction_id });
      return res.status(200).json({ success: true, already_recorded: true });
    }

    logRequest("error", { client_id: client.client_id, transaction_id, error: error.message });
    console.error("POST /api/transactions error:", error);
    return res.status(500).json({ error: "Failed to record transaction" });
  }
});

module.exports = router;
