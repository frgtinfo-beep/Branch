const express = require("express");
const { clients } = require("../db");
const { config } = require("../config/env");
const { createCustomer, createFirstPayment, getPayment } = require("../services/mollieService");
const { applyFirstPaymentResult } = require("../services/mandateService");
const { onboardingPage, onboardingResultPage } = require("../views/onboardingPage");
const { onboardingTokenMatches, onboardingPath } = require("../utils/onboardingTokens");

const router = express.Router();

// A wrong or missing token gets the same 404 as an unknown client, so the
// response doesn't reveal which client_ids exist.
async function findClientOr404(req, res) {
  const clientsCol = await clients();
  const client = await clientsCol.findOne({ client_id: req.params.clientId });
  if (!client || !onboardingTokenMatches(client, req.query.token)) {
    res.status(404).send("Unknown client");
    return null;
  }
  return client;
}

router.get("/:clientId", async (req, res) => {
  const client = await findClientOr404(req, res);
  if (!client) return;
  res.send(onboardingPage({ client, cancelled: req.query.cancelled === "1" }));
});

router.get("/:clientId/start", async (req, res) => {
  const client = await findClientOr404(req, res);
  if (!client) return;

  try {
    const clientsCol = await clients();

    // One Mollie customer per client, reused across retries so abandoned
    // attempts don't leave a trail of duplicate customers in the dashboard.
    let customerId = client.mollie_customer_id;
    if (!customerId) {
      const customer = await createCustomer({ name: client.name, email: client.billing_email, clientId: client.client_id });
      customerId = customer.id;
      await clientsCol.updateOne({ _id: client._id }, { $set: { mollie_customer_id: customerId, updated_at: new Date() } });
    }

    const payment = await createFirstPayment({
      customerId,
      clientId: client.client_id,
      currency: client.currency,
      description: `Branch — Direct Debit authorization for ${client.name}`,
      redirectUrl: `${config.appBaseUrl()}${onboardingPath(client, "/callback")}`,
      webhookUrl: config.mollie.webhookUrl(),
    });

    await clientsCol.updateOne(
      { _id: client._id },
      {
        $set: {
          mollie_first_payment_id: payment.id,
          // Keep an already-active mandate's status if they're re-authorizing
          // (e.g. switching bank accounts) — it's still usable until the new
          // one lands.
          ...(client.mandate_status === "active" ? {} : { mandate_status: "pending_customer_approval" }),
          updated_at: new Date(),
        },
      },
    );

    console.log(
      JSON.stringify({
        at: new Date().toISOString(),
        route: "GET /onboarding/:clientId/start",
        client_id: client.client_id,
        mollie_customer_id: customerId,
        mollie_payment_id: payment.id,
      }),
    );

    res.redirect(303, payment.getCheckoutUrl());
  } catch (error) {
    console.error("Onboarding start error:", error);
    res.status(502).send("Could not start Mollie authorization. Please try again shortly.");
  }
});

router.get("/:clientId/callback", async (req, res) => {
  const client = await findClientOr404(req, res);
  if (!client) return;

  if (!client.mollie_first_payment_id) {
    return res.status(400).send("No authorization in progress for this client.");
  }

  try {
    // Mollie's redirect carries no status, so always ask Mollie what happened.
    const payment = await getPayment(client.mollie_first_payment_id);
    const { outcome } = await applyFirstPaymentResult(client, payment);

    if (outcome === "authorized") {
      return res.send(
        onboardingResultPage({
          client,
          success: true,
          heading: "Authorization received",
          message:
            "Thanks — your SEPA Direct Debit mandate is set up. Branch's monthly fees will be collected from this bank account.",
        }),
      );
    }

    if (outcome === "cancelled") {
      return res.send(
        onboardingResultPage({
          client,
          success: false,
          heading: "Authorization cancelled",
          message: "The authorization was cancelled or did not complete. You can try again.",
        }),
      );
    }

    return res.send(
      onboardingResultPage({
        client,
        success: false,
        heading: "Still processing",
        message: "We haven't received confirmation from your bank yet. Please check back in a few minutes.",
      }),
    );
  } catch (error) {
    console.error("Onboarding callback error:", error);
    res.status(502).send("Could not verify authorization status. Please try again shortly.");
  }
});

module.exports = router;
