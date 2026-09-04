const express = require("express");
const multer = require("multer");
const { ObjectId } = require("mongodb");
const { companyProfiles, deliverables, journeyStages, tasks, contractsBucket } = require("../../db");
const { requirePortalPage, requirePortalApi, requireRole } = require("../../middleware/portalAuth");
const { clientsPage } = require("../../views/portal/clients");
const { clientDetailPage } = require("../../views/portal/clientDetail");

const router = express.Router();

const contractUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
}).single("contract");

// Wraps multer so a bad upload (wrong type, too large) comes back as the
// same { error } JSON shape as every other endpoint here, instead of
// falling through to Express's default HTML error page.
function handleContractUpload(req, res, next) {
  contractUpload(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || "Failed to upload file" });
    next();
  });
}

const VALID_COLLAB_STATUSES = new Set(["prospect", "in_gesprek", "actieve_klant", "afgerond"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toObjectId(value) {
  try {
    return new ObjectId(value);
  } catch {
    return null;
  }
}

// The one place that decides whether `board` is included — used by both the
// list and detail endpoints so the gating logic can't drift between them.
function projectionForRole(role) {
  // contractFile.data-less summary lives on the doc; the PDF bytes themselves
  // are in GridFS, so there's nothing large to exclude here — but keep this
  // the one place that decides `board` visibility.
  return role === "admin" || role === "bestuur" ? {} : { board: 0 };
}

function serializeProfile(profile) {
  const out = {
    id: profile._id.toString(),
    name: profile.name,
    contactPerson: profile.contactPerson || "",
    contactEmail: profile.contactEmail || "",
    sector: profile.sector || "",
    shortDescription: profile.shortDescription || "",
    currentStage: profile.currentStage || null,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
  if (profile.board !== undefined) {
    out.board = profile.board;
  }
  if (profile.contractFile) {
    out.contractFile = {
      filename: profile.contractFile.filename,
      size: profile.contractFile.size,
      uploadedAt: profile.contractFile.uploadedAt,
    };
  }
  return out;
}

async function currentStageNames() {
  const journeyStagesCol = await journeyStages();
  const doc = await journeyStagesCol.findOne({ _id: "journeyStages" });
  return (doc ? doc.stages : []).map((s) => s.name);
}

router.get("/portal/clients", requirePortalPage, (req, res) => {
  res.send(clientsPage(req.session.portalUser));
});

router.get("/portal/clients/:id", requirePortalPage, (req, res) => {
  res.send(clientDetailPage(req.session.portalUser, req.params.id));
});

router.get("/api/portal/company-profiles", requirePortalApi, async (req, res) => {
  const companyProfilesCol = await companyProfiles();
  const profiles = await companyProfilesCol
    .find({}, { projection: projectionForRole(req.session.portalUser.role) })
    .sort({ name: 1 })
    .toArray();
  res.json(profiles.map(serializeProfile));
});

router.post("/api/portal/company-profiles", requirePortalApi, requireRole("admin"), async (req, res) => {
  const { name, contactPerson, contactEmail, sector, shortDescription, currentStage } = req.body || {};

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "name is required" });
  }

  const stages = await currentStageNames();
  const stage = currentStage || stages[0] || null;
  if (stage && !stages.includes(stage)) {
    return res.status(400).json({ error: "currentStage must be one of the configured journey stages" });
  }

  const companyProfilesCol = await companyProfiles();
  const now = new Date();
  const result = await companyProfilesCol.insertOne({
    name,
    contactPerson: typeof contactPerson === "string" ? contactPerson : "",
    contactEmail: typeof contactEmail === "string" ? contactEmail : "",
    sector: typeof sector === "string" ? sector : "",
    shortDescription: typeof shortDescription === "string" ? shortDescription : "",
    currentStage: stage,
    board: { contractValue: null, collaborationStatus: "prospect", strategicNotes: "" },
    createdBy: toObjectId(req.session.portalUser.id),
    createdAt: now,
    updatedAt: now,
  });

  const created = await companyProfilesCol.findOne({ _id: result.insertedId });
  res.status(201).json(serializeProfile(created));
});

router.get("/api/portal/company-profiles/:id", requirePortalApi, async (req, res) => {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid company profile id" });

  const companyProfilesCol = await companyProfiles();
  const profile = await companyProfilesCol.findOne(
    { _id: id },
    { projection: projectionForRole(req.session.portalUser.role) },
  );
  if (!profile) return res.status(404).json({ error: "Company profile not found" });
  res.json(serializeProfile(profile));
});

router.patch("/api/portal/company-profiles/:id", requirePortalApi, requireRole("admin"), async (req, res) => {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid company profile id" });

  const { name, contactPerson, contactEmail, sector, shortDescription, currentStage, board } = req.body || {};
  const update = { updatedAt: new Date() };

  if (name !== undefined) {
    if (typeof name !== "string" || !name) return res.status(400).json({ error: "name must be a non-empty string" });
    update.name = name;
  }
  if (contactPerson !== undefined) update.contactPerson = typeof contactPerson === "string" ? contactPerson : "";
  if (contactEmail !== undefined) update.contactEmail = typeof contactEmail === "string" ? contactEmail : "";
  if (sector !== undefined) update.sector = typeof sector === "string" ? sector : "";
  if (shortDescription !== undefined) update.shortDescription = typeof shortDescription === "string" ? shortDescription : "";

  if (currentStage !== undefined) {
    const stages = await currentStageNames();
    if (currentStage !== null && !stages.includes(currentStage)) {
      return res.status(400).json({ error: "currentStage must be one of the configured journey stages" });
    }
    update.currentStage = currentStage;
  }

  if (board !== undefined) {
    if (board.contractValue !== undefined) {
      const value = board.contractValue === null ? null : Number(board.contractValue);
      if (value !== null && !Number.isFinite(value)) {
        return res.status(400).json({ error: "board.contractValue must be a number or null" });
      }
      update["board.contractValue"] = value;
    }
    if (board.collaborationStatus !== undefined) {
      if (!VALID_COLLAB_STATUSES.has(board.collaborationStatus)) {
        return res.status(400).json({ error: `board.collaborationStatus must be one of ${[...VALID_COLLAB_STATUSES].join(", ")}` });
      }
      update["board.collaborationStatus"] = board.collaborationStatus;
    }
    if (board.strategicNotes !== undefined) {
      update["board.strategicNotes"] = typeof board.strategicNotes === "string" ? board.strategicNotes : "";
    }
  }

  const companyProfilesCol = await companyProfiles();
  const result = await companyProfilesCol.findOneAndUpdate({ _id: id }, { $set: update }, { returnDocument: "after" });
  if (!result) return res.status(404).json({ error: "Company profile not found" });
  res.json(serializeProfile(result));
});

router.patch("/api/portal/company-profiles/:id/stage", requirePortalApi, requireRole("admin"), async (req, res) => {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid company profile id" });

  const { currentStage } = req.body || {};
  const stages = await currentStageNames();
  if (!stages.includes(currentStage)) {
    return res.status(400).json({ error: "currentStage must be one of the configured journey stages" });
  }

  const companyProfilesCol = await companyProfiles();
  const result = await companyProfilesCol.findOneAndUpdate(
    { _id: id },
    { $set: { currentStage, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!result) return res.status(404).json({ error: "Company profile not found" });
  res.json(serializeProfile(result));
});

router.delete("/api/portal/company-profiles/:id", requirePortalApi, requireRole("admin"), async (req, res) => {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid company profile id" });

  const companyProfilesCol = await companyProfiles();
  const deliverablesCol = await deliverables();
  const tasksCol = await tasks();

  const result = await companyProfilesCol.deleteOne({ _id: id });
  if (result.deletedCount === 0) return res.status(404).json({ error: "Company profile not found" });

  await deliverablesCol.deleteMany({ companyProfileId: id });
  // Unlink, don't delete — a task and its time-tracking history shouldn't
  // disappear just because the client relationship record was removed.
  await tasksCol.updateMany({ companyProfileId: id }, { $set: { companyProfileId: null } });

  res.json({ success: true });
});

router.post("/api/portal/company-profiles/:id/contract", requirePortalApi, requireRole("admin"), handleContractUpload, async (req, res) => {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid company profile id" });
  if (!req.file) return res.status(400).json({ error: "contract file is required" });

  const companyProfilesCol = await companyProfiles();
  const profile = await companyProfilesCol.findOne({ _id: id }, { projection: { contractFile: 1 } });
  if (!profile) return res.status(404).json({ error: "Company profile not found" });

  const bucket = await contractsBucket();
  const uploadStream = bucket.openUploadStream(req.file.originalname, { contentType: req.file.mimetype });
  await new Promise((resolve, reject) => {
    uploadStream.on("error", reject).on("finish", resolve).end(req.file.buffer);
  });

  const contractFile = {
    fileId: uploadStream.id,
    filename: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedAt: new Date(),
  };
  const result = await companyProfilesCol.findOneAndUpdate(
    { _id: id },
    { $set: { contractFile, updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  // Replacing an existing contract — drop the old GridFS file now that the
  // new one is safely referenced by the profile document.
  if (profile.contractFile && profile.contractFile.fileId) {
    await bucket.delete(profile.contractFile.fileId).catch(() => {});
  }

  res.status(201).json(serializeProfile(result));
});

router.get("/api/portal/company-profiles/:id/contract", requirePortalApi, async (req, res) => {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid company profile id" });

  const companyProfilesCol = await companyProfiles();
  const profile = await companyProfilesCol.findOne({ _id: id }, { projection: { contractFile: 1 } });
  if (!profile) return res.status(404).json({ error: "Company profile not found" });
  if (!profile.contractFile) return res.status(404).json({ error: "No contract uploaded" });

  const bucket = await contractsBucket();
  res.set("Content-Type", profile.contractFile.mimeType || "application/pdf");
  const safeName = profile.contractFile.filename.replace(/["\r\n]/g, "_");
  res.set("Content-Disposition", `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(profile.contractFile.filename)}`);
  bucket.openDownloadStream(profile.contractFile.fileId)
    .on("error", () => res.status(404).json({ error: "Contract file not found" }))
    .pipe(res);
});

router.delete("/api/portal/company-profiles/:id/contract", requirePortalApi, requireRole("admin"), async (req, res) => {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid company profile id" });

  const companyProfilesCol = await companyProfiles();
  const profile = await companyProfilesCol.findOne({ _id: id }, { projection: { contractFile: 1 } });
  if (!profile) return res.status(404).json({ error: "Company profile not found" });
  if (!profile.contractFile) return res.status(404).json({ error: "No contract uploaded" });

  const bucket = await contractsBucket();
  await bucket.delete(profile.contractFile.fileId).catch(() => {});
  await companyProfilesCol.updateOne({ _id: id }, { $unset: { contractFile: "" }, $set: { updatedAt: new Date() } });

  res.json({ success: true });
});

router.get("/api/portal/company-profiles/:id/deliverables", requirePortalApi, async (req, res) => {
  const companyProfileId = toObjectId(req.params.id);
  if (!companyProfileId) return res.status(400).json({ error: "Invalid company profile id" });

  const deliverablesCol = await deliverables();
  const items = await deliverablesCol.find({ companyProfileId }).sort({ createdAt: 1 }).toArray();
  res.json(
    items.map((d) => ({
      id: d._id.toString(),
      companyProfileId: d.companyProfileId.toString(),
      name: d.name,
      deadline: d.deadline || null,
      completed: d.completed,
    })),
  );
});

router.post("/api/portal/company-profiles/:id/deliverables", requirePortalApi, requireRole("admin"), async (req, res) => {
  const companyProfileId = toObjectId(req.params.id);
  if (!companyProfileId) return res.status(400).json({ error: "Invalid company profile id" });

  const { name, deadline } = req.body || {};
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "name is required" });
  }
  if (deadline !== undefined && deadline !== null && !DATE_PATTERN.test(deadline)) {
    return res.status(400).json({ error: "deadline must be a YYYY-MM-DD string or null" });
  }

  const companyProfilesCol = await companyProfiles();
  const profile = await companyProfilesCol.findOne({ _id: companyProfileId });
  if (!profile) return res.status(404).json({ error: "Company profile not found" });

  const deliverablesCol = await deliverables();
  const now = new Date();
  const result = await deliverablesCol.insertOne({
    companyProfileId,
    name,
    deadline: deadline || null,
    completed: false,
    createdAt: now,
    updatedAt: now,
  });

  res.status(201).json({
    id: result.insertedId.toString(),
    companyProfileId: companyProfileId.toString(),
    name,
    deadline: deadline || null,
    completed: false,
  });
});

router.patch("/api/portal/deliverables/:id", requirePortalApi, requireRole("admin"), async (req, res) => {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid deliverable id" });

  const { name, deadline, completed } = req.body || {};
  const update = { updatedAt: new Date() };

  if (name !== undefined) {
    if (typeof name !== "string" || !name) return res.status(400).json({ error: "name must be a non-empty string" });
    update.name = name;
  }
  if (deadline !== undefined) {
    if (deadline !== null && !DATE_PATTERN.test(deadline)) {
      return res.status(400).json({ error: "deadline must be a YYYY-MM-DD string or null" });
    }
    update.deadline = deadline;
  }
  if (completed !== undefined) {
    update.completed = Boolean(completed);
  }

  const deliverablesCol = await deliverables();
  const result = await deliverablesCol.findOneAndUpdate({ _id: id }, { $set: update }, { returnDocument: "after" });
  if (!result) return res.status(404).json({ error: "Deliverable not found" });

  res.json({
    id: result._id.toString(),
    companyProfileId: result.companyProfileId.toString(),
    name: result.name,
    deadline: result.deadline || null,
    completed: result.completed,
  });
});

router.delete("/api/portal/deliverables/:id", requirePortalApi, requireRole("admin"), async (req, res) => {
  const id = toObjectId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid deliverable id" });

  const deliverablesCol = await deliverables();
  const result = await deliverablesCol.deleteOne({ _id: id });
  if (result.deletedCount === 0) return res.status(404).json({ error: "Deliverable not found" });
  res.json({ success: true });
});

module.exports = router;
