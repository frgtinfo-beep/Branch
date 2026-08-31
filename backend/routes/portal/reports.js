const express = require("express");
const { ObjectId } = require("mongodb");
const { timeEntries } = require("../../db");
const { requirePortalPage, requirePortalApi } = require("../../middleware/portalAuth");
const { reportsPage } = require("../../views/portal/reports");

const router = express.Router();

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

function toDateString(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Both branches resolve `date` (YYYY-MM-DD, defaulting to today) to a
// [from, to] range of the same shape, so the caller doesn't need to know
// which period type it asked for.
function resolveRange(period, dateStr) {
  const anchor = dateStr && DATE_PATTERN.test(dateStr) ? new Date(`${dateStr}T00:00:00`) : new Date();

  if (period === "week") {
    const day = anchor.getDay(); // 0 = Sunday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: toDateString(monday), to: toDateString(sunday) };
  }

  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const lastOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from: toDateString(firstOfMonth), to: toDateString(lastOfMonth) };
}

router.get("/portal/reports", requirePortalPage, (req, res) => {
  res.send(reportsPage(req.session.portalUser));
});

router.get("/api/portal/reports/hours", requirePortalApi, async (req, res) => {
  const period = req.query.period === "week" ? "week" : "month";
  const { from, to } = resolveRange(period, req.query.date);

  const { portalUser } = req.session;
  let personFilter = null;
  if (portalUser.role !== "admin") {
    // Non-admins can only ever see their own hours — a query param pointing
    // at someone else is silently overridden, not rejected, since "my hours
    // this month" is the expected friendly use case.
    personFilter = toObjectId(portalUser.id);
  } else if (req.query.personId) {
    personFilter = toObjectId(req.query.personId);
    if (!personFilter) return res.status(400).json({ error: "Invalid personId" });
  }

  let companyProfileId = null;
  if (req.query.companyProfileId) {
    companyProfileId = toObjectId(req.query.companyProfileId);
    if (!companyProfileId) return res.status(400).json({ error: "Invalid companyProfileId" });
  }

  const match = { date: { $gte: from, $lte: to } };
  if (personFilter) match.personId = personFilter;

  const pipeline = [{ $match: match }];
  if (companyProfileId) {
    pipeline.push(
      { $lookup: { from: "tasks", localField: "taskId", foreignField: "_id", as: "task" } },
      { $unwind: "$task" },
      { $match: { "task.companyProfileId": companyProfileId } },
    );
  }
  pipeline.push(
    { $group: { _id: "$personId", totalHours: { $sum: "$hours" } } },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $project: { _id: 0, personId: "$_id", name: "$user.name", totalHours: 1 } },
    { $sort: { name: 1 } },
  );

  const timeEntriesCol = await timeEntries();
  const rows = await timeEntriesCol.aggregate(pipeline).toArray();
  rows.forEach((r) => (r.personId = r.personId.toString()));

  res.json({ period, from, to, rows });
});

module.exports = router;
