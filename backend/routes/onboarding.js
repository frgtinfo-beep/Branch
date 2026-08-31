const express = require("express");
const { clients } = require("../db");
const { config } = require("../config/env");
const {
  createMandateOnlyBillingRequest,
  createBillingRequestFlow,
  getBillingRequest,
} = require("../services/gocardlessService");
const { onboardingPage, onboardingResultPage } = require("../views/onboardingPage");

const router = express.Router();

async function findClientOr404(req, res) {
  const clientsCol = await clients();
  const client = await clientsCol.findOne({ client_id: req.params.clientId });
  if (!client) {
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
    const billingRequest = await createMandateOnlyBillingRequest({});
    const flow = await createBillingRequestFlow({
      billingRequestId: billingRequest.id,
      redirectUri: `${config.appBaseUrl()}/onboarding/${encodeURIComponent(client.client_id)}/callback`,
      exitUri: `${config.appBaseUrl()}/onboarding/${encodeURIComponent(client.client_id)}?cancelled=1`,
    });

    const clientsCol = await clients();
    await clientsCol.updateOne(
      { _id: client._id },
      {
        $set: {
          gocardless_billing_request_id: billingRequest.id,
          mandate_status: "pending_customer_approval",
          updated_at: new Date(),
        },
      },
    );

    console.log(
      JSON.stringify({
        at: new Date().toISOString(),
        route: "GET /onboarding/:clientId/start",
        client_id: client.client_id,
        billing_request_id: billingRequest.id,
      }),
    );

    res.redirect(303, flow.authorisation_url);
  } catch (error) {
    console.error("Onboarding start error:", error);
    res.status(502).send("Could not start GoCardless authorization. Please try again shortly.");
  }
});

router.get("/:clientId/callback", async (req, res) => {
  const client = await findClientOr404(req, res);
  if (!client) return;

  if (!client.gocardless_billing_request_id) {
    return res.status(400).send("No authorization in progress for this client.");
  }

  try {
    // We deliberately re-fetch status from GoCardless rather than trusting
    // the `outcome`/`id` query params on the redirect — GoCardless's own docs
    // warn those aren't a reliable signal on their own.
    const billingRequest = await getBillingRequest(client.gocardless_billing_request_id);
    const clientsCol = await clients();

    if (billingRequest.status === "fulfilled") {
      const mandateId = billingRequest.links && billingRequest.links.mandate_request_mandate;
      const customerId = billingRequest.links && billingRequest.links.customer;

      await clientsCol.updateOne(
        { _id: client._id },
        {
          $set: {
            gocardless_mandate_id: mandateId || null,
            gocardless_customer_id: customerId || null,
            // Authoritative status transitions (active/failed/cancelled) come
            // from the mandates webhook, not from this callback.
            mandate_status: "pending_submission",
            updated_at: new Date(),
          },
        },
      );

      return res.send(
        onboardingResultPage({
          client,
          success: true,
          heading: "Authorization received",
          message:
            "Thanks — we've received your Direct Debit authorization. We'll confirm once your bank has processed the mandate.",
        }),
      );
    }

    if (billingRequest.status === "cancelled") {
      await clientsCol.updateOne(
        { _id: client._id },
        { $set: { mandate_status: "cancelled", updated_at: new Date() } },
      );
      return res.send(
        onboardingResultPage({
          client,
          success: false,
          heading: "Authorization cancelled",
          message: "The authorization was cancelled before it completed. You can try again.",
        }),
      );
    }

    return res.send(
      onboardingResultPage({
        client,
        success: false,
        heading: "Still processing",
        message: "We haven't received confirmation yet. Please check back in a few minutes.",
      }),
    );
  } catch (error) {
    console.error("Onboarding callback error:", error);
    res.status(502).send("Could not verify authorization status. Please try again shortly.");
  }
});

module.exports = router;
