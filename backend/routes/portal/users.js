const express = require("express");
const bcrypt = require("bcryptjs");
const { ObjectId } = require("mongodb");
const { users } = require("../../db");
const { requirePortalApi, requireRole } = require("../../middleware/portalAuth");

const router = express.Router();

const VALID_ROLES = new Set(["admin", "teamlid", "bestuur"]);

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    lastLoginAt: user.lastLoginAt || null,
  };
}

// Only Admin manages accounts — staff cannot change their own password and
// must contact an Admin, per the product decision for v1.
router.get("/api/portal/users", requirePortalApi, requireRole("admin"), async (req, res) => {
  const usersCol = await users();
  const all = await usersCol.find({}).sort({ name: 1 }).toArray();
  res.json(all.map(publicUser));
});

// Any authenticated portal user needs this for assignee/availability pickers,
// but only id/name/role — never email or passwordHash.
router.get("/api/portal/users/active", requirePortalApi, async (req, res) => {
  const usersCol = await users();
  const active = await usersCol
    .find({ active: true })
    .project({ name: 1, role: 1 })
    .sort({ name: 1 })
    .toArray();
  res.json(active.map((u) => ({ id: u._id.toString(), name: u.name, role: u.role })));
});

router.post("/api/portal/users", requirePortalApi, requireRole("admin"), async (req, res) => {
  const { name, email, role, password } = req.body || {};

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "name is required" });
  }
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "email is required" });
  }
  if (!VALID_ROLES.has(role)) {
    return res.status(400).json({ error: `role must be one of ${[...VALID_ROLES].join(", ")}` });
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "password is required and must be at least 8 characters" });
  }

  const usersCol = await users();
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const result = await usersCol.insertOne({
      name,
      email: email.trim().toLowerCase(),
      passwordHash,
      role,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    });
    const created = await usersCol.findOne({ _id: result.insertedId });
    res.status(201).json(publicUser(created));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "A user with this email already exists" });
    }
    console.error("POST /api/portal/users error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.patch("/api/portal/users/:id", requirePortalApi, requireRole("admin"), async (req, res) => {
  let objectId;
  try {
    objectId = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const { name, email, role, password } = req.body || {};
  const update = { updatedAt: new Date() };

  if (name !== undefined) {
    if (typeof name !== "string" || !name) {
      return res.status(400).json({ error: "name must be a non-empty string" });
    }
    update.name = name;
  }
  if (email !== undefined) {
    if (typeof email !== "string" || !email) {
      return res.status(400).json({ error: "email must be a non-empty string" });
    }
    update.email = email.trim().toLowerCase();
  }
  if (role !== undefined) {
    if (!VALID_ROLES.has(role)) {
      return res.status(400).json({ error: `role must be one of ${[...VALID_ROLES].join(", ")}` });
    }
    update.role = role;
  }
  if (password !== undefined) {
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "password must be at least 8 characters" });
    }
    update.passwordHash = await bcrypt.hash(password, 12);
  }

  const usersCol = await users();
  try {
    const result = await usersCol.findOneAndUpdate(
      { _id: objectId },
      { $set: update },
      { returnDocument: "after" },
    );
    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(publicUser(result));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "A user with this email already exists" });
    }
    console.error("PATCH /api/portal/users/:id error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.patch("/api/portal/users/:id/deactivate", requirePortalApi, requireRole("admin"), async (req, res) => {
  let objectId;
  try {
    objectId = new ObjectId(req.params.id);
  } catch {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const usersCol = await users();
  const result = await usersCol.findOneAndUpdate(
    { _id: objectId },
    { $set: { active: false, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!result) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(publicUser(result));
});

module.exports = router;
