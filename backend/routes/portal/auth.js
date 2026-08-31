const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const { users } = require("../../db");
const { requirePortalApi } = require("../../middleware/portalAuth");

const router = express.Router();
const viewsDir = path.join(__dirname, "..", "..", "views", "portal");

router.get("/portal/login", (req, res) => {
  res.sendFile(path.join(viewsDir, "login.html"));
});

router.post("/portal/login", async (req, res) => {
  const { email, password } = req.body || {};
  const wantsJson = req.is("application/json");

  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  let validCredentials = false;
  let user = null;

  if (normalizedEmail && typeof password === "string") {
    const usersCol = await users();
    user = await usersCol.findOne({ email: normalizedEmail, active: true });
    if (user) {
      validCredentials = await bcrypt.compare(password, user.passwordHash);
    }
  }

  if (!validCredentials) {
    if (wantsJson) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    return res.redirect("/portal/login");
  }

  req.session.portalUser = { id: user._id.toString(), name: user.name, role: user.role };

  const usersCol = await users();
  await usersCol.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

  if (wantsJson) {
    return res.json({ success: true });
  }
  res.redirect("/portal");
});

router.post("/portal/logout", (req, res) => {
  // Only clear the portal's own session key — never req.session.destroy(),
  // which would also log the same browser out of the unrelated /admin
  // billing session if one happened to be open.
  if (req.session) {
    delete req.session.portalUser;
  }
  res.json({ success: true });
});

router.get("/portal/me", requirePortalApi, (req, res) => {
  res.json(req.session.portalUser);
});

module.exports = router;
