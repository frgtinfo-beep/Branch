// "Gratis website" sign-ups: the public form posts here, the team works through them in /portal/registrations
const express = require("express");
const { ObjectId } = require("mongodb");
const { registrations } = require("../db");
const { requirePortalPage, requirePortalApi } = require("../middleware/portalAuth");
const { sendRegistrationTeamEmail, sendRegistrationConfirmationEmail } = require("../services/emailService");
const { registrationsPage } = require("../views/portal/registrations");

const router = express.Router();

const FIELDS = ["contactName", "companyName", "sector", "kvk", "clientsPerMonth", "phone", "email"];
const PHONE_PATTERN = /^\+?[0-9 ()-]{9,20}$/;
const EMAIL_PATTERN = /^[^\s@"<>]+@[^\s@"<>]+\.[^\s@"<>]+$/;
const STATUSES = ["nieuw", "gebeld", "in_aanbouw", "live", "geen_interesse"];

function toObjectId(value) {
  try {
    return new ObjectId(value);
  } catch {
    return null;
  }
}

function serialize(doc) {
  return {
    id: doc._id.toString(),
    contactName: doc.contactName || "",
    companyName: doc.companyName,
    sector: doc.sector,
    kvk: doc.kvk,
    clientsPerMonth: doc.clientsPerMonth,
    phone: doc.phone,
    email: doc.email,
    status: doc.status,
    note: doc.note || "",
    emails: doc.emails || {},
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    updatedBy: doc.updatedBy || null,
  };
}

// --- Public: the form on frontend/gratis-website.html ---

router.post("/api/free-site", async (req, res) => {
  const body = req.body || {};

  // Honeypot: a hidden field real visitors never fill in. Pretend it worked so bots don't retry.
  if (typeof body.website === "string" && body.website.trim()) {
    return res.status(200).json({ success: true });
  }

  const values = {};
  for (const key of FIELDS) {
    const value = body[key];
    if (typeof value !== "string" || !value.trim() || value.length > 200) {
      return res.status(400).json({ success: false, error: `${key} is required` });
    }
    values[key] = value.trim();
  }
  if (!PHONE_PATTERN.test(values.phone)) {
    return res.status(400).json({ success: false, error: "A valid phone number is required" });
  }
  if (!EMAIL_PATTERN.test(values.email)) {
    return res.status(400).json({ success: false, error: "A valid email address is required" });
  }
  if (!["Ja", "Nee"].includes(values.kvk)) {
    return res.status(400).json({ success: false, error: "kvk must be Ja or Nee" });
  }

  const now = new Date();
  const registration = { ...values, status: "nieuw", note: "", createdAt: now, updatedAt: now, emails: {} };

  let insertedId;
  try {
    const col = await registrations();
    insertedId = (await col.insertOne(registration)).insertedId;
  } catch (error) {
    console.error("Saving registration failed:", error);
    return res.status(500).json({ success: false, error: "Could not save registration" });
  }

  // The registration is saved, so the visitor gets a success either way. Email
  // failures are recorded on the document and shown in the portal instead.
  const [team, confirmation] = await Promise.allSettled([
    sendRegistrationTeamEmail(values),
    sendRegistrationConfirmationEmail(values),
  ]);
  if (team.status === "rejected") console.error("Registration team email failed:", team.reason);
  if (confirmation.status === "rejected") console.error("Registration confirmation email failed:", confirmation.reason);
  try {
    const col = await registrations();
    await col.updateOne(
      { _id: insertedId },
      { $set: { emails: { team: team.status === "fulfilled", confirmation: confirmation.status === "fulfilled" } } },
    );
  } catch (error) {
    console.error("Recording registration email status failed:", error);
  }

  res.status(200).json({ success: true });
});

// --- Portal ---

router.get("/portal/registrations", requirePortalPage, (req, res) => {
  res.send(registrationsPage(req.session.portalUser));
});

router.get("/api/portal/registrations", requirePortalApi, async (req, res) => {
  const filter = STATUSES.includes(req.query.status) ? { status: req.query.status } : {};
  const col = await registrations();
  const [rows, counts] = await Promise.all([
    col.find(filter).sort({ createdAt: -1 }).limit(500).toArray(),
    col.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
  ]);
  res.json({
    registrations: rows.map(serialize),
    counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
  });
});

router.patch("/api/portal/registrations/:id", requirePortalApi, async (req, res) => {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Ongeldig id" });

  const update = {};
  if (req.body.status !== undefined) {
    if (!STATUSES.includes(req.body.status)) return res.status(400).json({ error: "Ongeldige status" });
    update.status = req.body.status;
  }
  if (req.body.note !== undefined) {
    if (typeof req.body.note !== "string" || req.body.note.length > 2000) return res.status(400).json({ error: "Notitie is te lang" });
    update.note = req.body.note.trim();
  }
  if (!Object.keys(update).length) return res.status(400).json({ error: "Niets om op te slaan" });

  update.updatedAt = new Date();
  update.updatedBy = req.session.portalUser.name;

  const col = await registrations();
  const result = await col.findOneAndUpdate({ _id: id }, { $set: update }, { returnDocument: "after" });
  if (!result) return res.status(404).json({ error: "Aanmelding niet gevonden" });
  res.json(serialize(result));
});

module.exports = router;
