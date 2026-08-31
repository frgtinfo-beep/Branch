const express = require("express");
const { journeyStages, companyProfiles } = require("../../db");
const { requirePortalPage, requirePortalApi, requireRole } = require("../../middleware/portalAuth");
const { settingsPage } = require("../../views/portal/settings");

const router = express.Router();

router.get("/portal/settings", requirePortalPage, (req, res) => {
  if (req.session.portalUser.role !== "admin") {
    return res.redirect("/portal");
  }
  res.send(settingsPage(req.session.portalUser));
});

router.get("/api/portal/settings/journey-stages", requirePortalApi, async (req, res) => {
  const journeyStagesCol = await journeyStages();
  const doc = await journeyStagesCol.findOne({ _id: "journeyStages" });
  res.json({ stages: (doc ? doc.stages : []).map((s) => s.name) });
});

router.put("/api/portal/settings/journey-stages", requirePortalApi, requireRole("admin"), async (req, res) => {
  const { stages } = req.body || {};

  if (!Array.isArray(stages) || stages.length === 0) {
    return res.status(400).json({ error: "stages must be a non-empty array of names" });
  }
  const trimmed = stages.map((s) => (typeof s === "string" ? s.trim() : ""));
  if (trimmed.some((s) => !s)) {
    return res.status(400).json({ error: "Every stage name must be a non-empty string" });
  }
  if (new Set(trimmed).size !== trimmed.length) {
    return res.status(400).json({ error: "Stage names must be unique" });
  }

  const journeyStagesCol = await journeyStages();
  const existing = await journeyStagesCol.findOne({ _id: "journeyStages" });
  const oldNames = (existing ? existing.stages : []).map((s) => s.name);
  const removedNames = oldNames.filter((name) => !trimmed.includes(name));

  if (removedNames.length > 0) {
    const companyProfilesCol = await companyProfiles();
    const affectedCount = await companyProfilesCol.countDocuments({ currentStage: { $in: removedNames } });
    if (affectedCount > 0) {
      return res.status(409).json({
        error: `Cannot remove stage(s) still in use by ${affectedCount} client profile(s): ${removedNames.join(", ")}. Move those profiles to a different stage first.`,
      });
    }
  }

  await journeyStagesCol.updateOne(
    { _id: "journeyStages" },
    { $set: { stages: trimmed.map((name) => ({ name })), updatedAt: new Date() } },
    { upsert: true },
  );

  res.json({ stages: trimmed });
});

module.exports = router;
