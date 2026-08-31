const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const { clients, transactions, billingRuns } = require("../db");
const { config } = require("../config/env");
const { requireAdminPage, requireAdminApi } = require("../middleware/adminAuth");

const router = express.Router();
const viewsDir = path.join(__dirname, "..", "views");

router.get("/admin/login", (req, res) => {
  res.sendFile(path.join(viewsDir, "adminLogin.html"));
});

router.post("/admin/login", async (req, res) => {
  const { username, password } = req.body || {};

  const validUsername = typeof username === "string" && username === config.admin.username();
  const validPassword =
    typeof password === "string" && (await bcrypt.compare(password, config.admin.passwordHash()));

  const wantsJson = req.is("application/json");

  if (!validUsername || !validPassword) {
    if (wantsJson) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    return res.redirect("/admin/login");
  }

  req.session.isAdmin = true;

  if (wantsJson) {
    return res.json({ success: true });
  }
  res.redirect("/admin");
});

router.post("/admin/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

router.get("/admin", requireAdminPage, (req, res) => {
  res.sendFile(path.join(viewsDir, "adminDashboard.html"));
});

router.get("/api/admin/clients", requireAdminApi, async (req, res) => {
  try {
    const [clientsCol, transactionsCol] = await Promise.all([clients(), transactions()]);
    const allClients = await clientsCol.find({}).sort({ name: 1 }).toArray();

    const withTotals = await Promise.all(
      allClients.map(async (client) => {
        const unbilled = await transactionsCol
          .find({ client_id: client.client_id, billed: false })
          .toArray();
        const unbilledTotal =
          unbilled.reduce((cents, txn) => cents + Math.round(Number(txn.fee_amount.toString()) * 100), 0) / 100;

        return {
          client_id: client.client_id,
          name: client.name,
          currency: client.currency,
          mandate_status: client.mandate_status,
          active: client.active,
          unbilled_total: unbilledTotal,
        };
      }),
    );

    res.json(withTotals);
  } catch (error) {
    console.error("GET /api/admin/clients error:", error);
    res.status(500).json({ error: "Failed to load clients" });
  }
});

router.get("/api/admin/clients/:clientId/billing-runs", requireAdminApi, async (req, res) => {
  try {
    const [clientsCol, billingRunsCol] = await Promise.all([clients(), billingRuns()]);
    const client = await clientsCol.findOne({ client_id: req.params.clientId });
    if (!client) {
      return res.status(404).json({ error: "Unknown client" });
    }

    const runs = await billingRunsCol
      .find({ client_id: req.params.clientId })
      .sort({ period_end: -1 })
      .toArray();

    res.json(
      runs.map((run) => ({
        period_start: run.period_start,
        period_end: run.period_end,
        transaction_count: run.transaction_count,
        total_amount: Number(run.total_amount),
        currency: client.currency,
        status: run.status,
        gocardless_payment_id: run.gocardless_payment_id,
      })),
    );
  } catch (error) {
    console.error("GET /api/admin/clients/:clientId/billing-runs error:", error);
    res.status(500).json({ error: "Failed to load billing runs" });
  }
});

module.exports = router;
