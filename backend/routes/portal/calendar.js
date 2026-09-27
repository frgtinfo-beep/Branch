const express = require("express");
const { ObjectId } = require("mongodb");
const { events, users } = require("../../db");
const { requirePortalPage, requirePortalApi } = require("../../middleware/portalAuth");
const { calendarPage } = require("../../views/portal/calendar");

const router = express.Router();

const VALID_COLORS = new Set(["blue", "cyan", "green", "amber", "red"]);
const MAX_RANGE_DAYS = 62; // a month view shows 6 weeks; leave headroom
const MAX_EVENT_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

function toObjectId(value) {
  try {
    return new ObjectId(value);
  } catch {
    return null;
  }
}

function parseDate(value) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serializeEvent(event, namesById, viewer) {
  const createdBy = event.createdBy ? event.createdBy.toString() : null;
  return {
    id: event._id.toString(),
    title: event.title,
    description: event.description || "",
    location: event.location || "",
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    allDay: Boolean(event.allDay),
    color: event.color || "blue",
    createdBy,
    createdByName: (createdBy && namesById[createdBy]) || "Onbekend",
    canEdit: viewer.role === "admin" || createdBy === viewer.id,
  };
}

async function userNames() {
  const usersCol = await users();
  const all = await usersCol.find({}, { projection: { name: 1 } }).toArray();
  return Object.fromEntries(all.map((u) => [u._id.toString(), u.name]));
}

// Shared by create and update: returns { error } or { fields } with only the
// provided keys validated, so PATCH can send a subset.
function validateEventInput(body, { partial }) {
  const fields = {};
  const { title, description, location, start, end, allDay, color } = body || {};

  if (title !== undefined || !partial) {
    if (typeof title !== "string" || !title.trim()) return { error: "Titel is verplicht." };
    if (title.trim().length > 200) return { error: "Titel mag maximaal 200 tekens zijn." };
    fields.title = title.trim();
  }
  if (description !== undefined) {
    if (typeof description !== "string" || description.length > 5000) return { error: "Omschrijving is te lang." };
    fields.description = description;
  }
  if (location !== undefined) {
    if (typeof location !== "string" || location.length > 200) return { error: "Locatie is te lang." };
    fields.location = location.trim();
  }
  if (allDay !== undefined) fields.allDay = Boolean(allDay);
  if (color !== undefined) {
    if (!VALID_COLORS.has(color)) return { error: "Onbekende kleur." };
    fields.color = color;
  }
  if (start !== undefined || !partial) {
    const parsed = parseDate(start);
    if (!parsed) return { error: "Ongeldige starttijd." };
    fields.start = parsed;
  }
  if (end !== undefined || !partial) {
    const parsed = parseDate(end);
    if (!parsed) return { error: "Ongeldige eindtijd." };
    fields.end = parsed;
  }
  return { fields };
}

function checkTimes(start, end) {
  if (end <= start) return "De eindtijd moet na de starttijd liggen.";
  if (end - start > MAX_EVENT_DAYS * DAY_MS) return `Een afspraak mag maximaal ${MAX_EVENT_DAYS} dagen duren.`;
  return null;
}

router.get("/portal/calendar", requirePortalPage, (req, res) => {
  res.send(calendarPage(req.session.portalUser));
});

// Events overlapping [from, to)
router.get("/api/portal/events", requirePortalApi, async (req, res) => {
  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);
  if (!from || !to || to <= from) {
    return res.status(400).json({ error: "from en to (ISO-datums) zijn verplicht" });
  }
  if (to - from > MAX_RANGE_DAYS * DAY_MS) {
    return res.status(400).json({ error: `Bereik mag maximaal ${MAX_RANGE_DAYS} dagen zijn` });
  }

  const eventsCol = await events();
  const list = await eventsCol.find({ start: { $lt: to }, end: { $gt: from } }).sort({ start: 1 }).toArray();

  const names = await userNames();
  res.json(list.map((e) => serializeEvent(e, names, req.session.portalUser)));
});

router.post("/api/portal/events", requirePortalApi, async (req, res) => {
  const result = validateEventInput(req.body, { partial: false });
  if (result.error) return res.status(400).json({ error: result.error });
  const timeError = checkTimes(result.fields.start, result.fields.end);
  if (timeError) return res.status(400).json({ error: timeError });

  const now = new Date();
  const doc = {
    title: result.fields.title,
    description: result.fields.description || "",
    location: result.fields.location || "",
    start: result.fields.start,
    end: result.fields.end,
    allDay: Boolean(result.fields.allDay),
    color: result.fields.color || "blue",
    createdBy: toObjectId(req.session.portalUser.id),
    createdAt: now,
    updatedAt: now,
  };
  const eventsCol = await events();
  const inserted = await eventsCol.insertOne(doc);
  const names = await userNames();
  res.status(201).json(serializeEvent({ ...doc, _id: inserted.insertedId }, names, req.session.portalUser));
});

// Only the creator or an admin may change or remove an event.
async function loadEditableEvent(req, res) {
  const id = toObjectId(req.params.id);
  if (!id) { res.status(400).json({ error: "Ongeldig afspraak-id" }); return null; }
  const eventsCol = await events();
  const event = await eventsCol.findOne({ _id: id });
  if (!event) { res.status(404).json({ error: "Afspraak niet gevonden" }); return null; }
  const viewer = req.session.portalUser;
  const isOwner = event.createdBy && event.createdBy.toString() === viewer.id;
  if (viewer.role !== "admin" && !isOwner) {
    res.status(403).json({ error: "Alleen de maker of een admin kan deze afspraak wijzigen" });
    return null;
  }
  return { eventsCol, event };
}

router.patch("/api/portal/events/:id", requirePortalApi, async (req, res) => {
  const loaded = await loadEditableEvent(req, res);
  if (!loaded) return;
  const result = validateEventInput(req.body, { partial: true });
  if (result.error) return res.status(400).json({ error: result.error });
  const start = result.fields.start || loaded.event.start;
  const end = result.fields.end || loaded.event.end;
  const timeError = checkTimes(start, end);
  if (timeError) return res.status(400).json({ error: timeError });

  const updated = await loaded.eventsCol.findOneAndUpdate(
    { _id: loaded.event._id },
    { $set: { ...result.fields, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  const names = await userNames();
  res.json(serializeEvent(updated, names, req.session.portalUser));
});

router.delete("/api/portal/events/:id", requirePortalApi, async (req, res) => {
  const loaded = await loadEditableEvent(req, res);
  if (!loaded) return;
  await loaded.eventsCol.deleteOne({ _id: loaded.event._id });
  res.json({ success: true });
});

module.exports = router;
