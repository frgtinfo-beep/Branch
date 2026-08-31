const express = require("express");
const { ObjectId } = require("mongodb");
const { availability, users } = require("../../db");
const { requirePortalPage, requirePortalApi } = require("../../middleware/portalAuth");
const { availabilityPage } = require("../../views/portal/availability");

const router = express.Router();

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = new Set(["vrij", "niet_vrij"]);

function toObjectId(value) {
  try {
    return new ObjectId(value);
  } catch {
    return null;
  }
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

router.get("/portal/availability", requirePortalPage, (req, res) => {
  res.send(availabilityPage(req.session.portalUser));
});

router.get("/api/portal/availability", requirePortalApi, async (req, res) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month); // 1-indexed
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: "year and month (1-12) query params are required" });
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const from = `${year}-${pad2(month)}-01`;
  const to = `${year}-${pad2(month)}-${pad2(daysInMonth)}`;
  const days = Array.from({ length: daysInMonth }, (_, i) => `${year}-${pad2(month)}-${pad2(i + 1)}`);

  const usersCol = await users();
  const availabilityCol = await availability();

  const [activeUsers, entries] = await Promise.all([
    usersCol.find({ active: true }).project({ name: 1 }).sort({ name: 1 }).toArray(),
    availabilityCol.find({ date: { $gte: from, $lte: to } }).toArray(),
  ]);

  const entriesMap = {};
  const dailySummary = {};
  const personSummary = {};
  days.forEach((d) => (dailySummary[d] = 0));
  activeUsers.forEach((u) => (personSummary[u._id.toString()] = 0));

  for (const entry of entries) {
    const personId = entry.personId.toString();
    if (!entriesMap[personId]) entriesMap[personId] = {};
    entriesMap[personId][entry.date] = { status: entry.status, reason: entry.reason || null };
    if (entry.status === "vrij") {
      dailySummary[entry.date] = (dailySummary[entry.date] || 0) + 1;
      if (personSummary[personId] !== undefined) {
        personSummary[personId] += 1;
      }
    }
  }

  res.json({
    people: activeUsers.map((u) => ({ id: u._id.toString(), name: u.name })),
    days,
    entries: entriesMap,
    dailySummary,
    personSummary,
  });
});

router.put("/api/portal/availability/:personId/:date", requirePortalApi, async (req, res) => {
  const personId = toObjectId(req.params.personId);
  if (!personId) return res.status(400).json({ error: "Invalid personId" });
  if (!DATE_PATTERN.test(req.params.date)) {
    return res.status(400).json({ error: "date must be a YYYY-MM-DD string" });
  }

  const { portalUser } = req.session;
  if (portalUser.role !== "admin" && req.params.personId !== portalUser.id) {
    return res.status(403).json({ error: "You can only edit your own availability" });
  }

  const { status, reason } = req.body || {};
  if (!VALID_STATUSES.has(status)) {
    return res.status(400).json({ error: `status must be one of ${[...VALID_STATUSES].join(", ")}` });
  }

  const availabilityCol = await availability();
  await availabilityCol.updateOne(
    { personId, date: req.params.date },
    {
      $set: {
        status,
        reason: status === "niet_vrij" && typeof reason === "string" && reason ? reason : null,
        updatedAt: new Date(),
        updatedBy: toObjectId(portalUser.id),
      },
      $setOnInsert: { personId, date: req.params.date },
    },
    { upsert: true },
  );

  res.json({ success: true });
});

module.exports = router;
