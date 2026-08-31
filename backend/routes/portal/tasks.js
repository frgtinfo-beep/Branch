const express = require("express");
const { ObjectId } = require("mongodb");
const { tasks, timeEntries, users } = require("../../db");
const { requirePortalPage, requirePortalApi, requireRole } = require("../../middleware/portalAuth");
const { isOverdue } = require("../../utils/portalDates");
const { tasksPage } = require("../../views/portal/tasks");

const router = express.Router();

router.get("/portal", requirePortalPage, (req, res) => {
  res.send(tasksPage(req.session.portalUser));
});

const VALID_PRIORITIES = new Set(["laag", "gemiddeld", "hoog"]);
const VALID_STATUSES = new Set(["todo", "bezig", "klaar"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toObjectId(value) {
  try {
    return new ObjectId(value);
  } catch {
    return null;
  }
}

function isAssignee(task, portalUserId) {
  return task.assigneeIds.some((id) => id.toString() === portalUserId);
}

function serializeTask(task, totalHours) {
  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description || "",
    assigneeIds: task.assigneeIds.map((id) => id.toString()),
    deadline: task.deadline || null,
    priority: task.priority,
    status: task.status,
    companyProfileId: task.companyProfileId ? task.companyProfileId.toString() : null,
    totalHours: totalHours || 0,
    overdue: isOverdue(task.deadline, task.status),
    createdBy: task.createdBy ? task.createdBy.toString() : null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

async function hoursByTaskId(taskIds) {
  if (taskIds.length === 0) return {};
  const timeEntriesCol = await timeEntries();
  const rows = await timeEntriesCol
    .aggregate([
      { $match: { taskId: { $in: taskIds } } },
      { $group: { _id: "$taskId", total: { $sum: "$hours" } } },
    ])
    .toArray();
  const map = {};
  for (const row of rows) {
    map[row._id.toString()] = row.total;
  }
  return map;
}

async function validAssigneeIds(rawIds) {
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    return { error: "assigneeIds is required and must be a non-empty array" };
  }
  const ids = rawIds.map(toObjectId);
  if (ids.some((id) => id === null)) {
    return { error: "assigneeIds contains an invalid id" };
  }
  const usersCol = await users();
  const count = await usersCol.countDocuments({ _id: { $in: ids } });
  if (count !== ids.length) {
    return { error: "assigneeIds contains an unknown user" };
  }
  return { ids };
}

router.get("/api/portal/tasks", requirePortalApi, async (req, res) => {
  const filter = {};
  if (req.query.assignee) {
    const assigneeId = toObjectId(req.query.assignee);
    if (!assigneeId) return res.status(400).json({ error: "Invalid assignee id" });
    filter.assigneeIds = assigneeId;
  }
  if (req.query.priority) {
    if (!VALID_PRIORITIES.has(req.query.priority)) {
      return res.status(400).json({ error: `priority must be one of ${[...VALID_PRIORITIES].join(", ")}` });
    }
    filter.priority = req.query.priority;
  }
  if (req.query.status) {
    if (!VALID_STATUSES.has(req.query.status)) {
      return res.status(400).json({ error: `status must be one of ${[...VALID_STATUSES].join(", ")}` });
    }
    filter.status = req.query.status;
  }
  if (req.query.companyProfileId) {
    const companyProfileId = toObjectId(req.query.companyProfileId);
    if (!companyProfileId) return res.status(400).json({ error: "Invalid companyProfileId" });
    filter.companyProfileId = companyProfileId;
  }

  const sortField = req.query.sort === "priority" ? "priority" : "deadline";
  const tasksCol = await tasks();
  const allTasks = await tasksCol.find(filter).sort({ [sortField]: 1 }).toArray();
  const hoursMap = await hoursByTaskId(allTasks.map((t) => t._id));

  res.json(allTasks.map((task) => serializeTask(task, hoursMap[task._id.toString()])));
});

router.post("/api/portal/tasks", requirePortalApi, requireRole("admin"), async (req, res) => {
  const { title, description, assigneeIds, deadline, priority, companyProfileId } = req.body || {};

  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "title is required" });
  }
  if (!VALID_PRIORITIES.has(priority)) {
    return res.status(400).json({ error: `priority must be one of ${[...VALID_PRIORITIES].join(", ")}` });
  }
  if (deadline !== undefined && deadline !== null && !DATE_PATTERN.test(deadline)) {
    return res.status(400).json({ error: "deadline must be a YYYY-MM-DD string or null" });
  }

  const assigneeResult = await validAssigneeIds(assigneeIds);
  if (assigneeResult.error) {
    return res.status(400).json({ error: assigneeResult.error });
  }

  let companyProfileObjectId = null;
  if (companyProfileId) {
    companyProfileObjectId = toObjectId(companyProfileId);
    if (!companyProfileObjectId) {
      return res.status(400).json({ error: "Invalid companyProfileId" });
    }
  }

  const tasksCol = await tasks();
  const now = new Date();
  const result = await tasksCol.insertOne({
    title,
    description: typeof description === "string" ? description : "",
    assigneeIds: assigneeResult.ids,
    deadline: deadline || null,
    priority,
    status: "todo",
    companyProfileId: companyProfileObjectId,
    createdBy: toObjectId(req.session.portalUser.id),
    createdAt: now,
    updatedAt: now,
  });

  const created = await tasksCol.findOne({ _id: result.insertedId });
  res.status(201).json(serializeTask(created, 0));
});

router.get("/api/portal/tasks/:id", requirePortalApi, async (req, res) => {
  const taskId = toObjectId(req.params.id);
  if (!taskId) return res.status(400).json({ error: "Invalid task id" });

  const tasksCol = await tasks();
  const task = await tasksCol.findOne({ _id: taskId });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const hoursMap = await hoursByTaskId([taskId]);
  res.json(serializeTask(task, hoursMap[taskId.toString()]));
});

router.patch("/api/portal/tasks/:id", requirePortalApi, requireRole("admin"), async (req, res) => {
  const taskId = toObjectId(req.params.id);
  if (!taskId) return res.status(400).json({ error: "Invalid task id" });

  const { title, description, assigneeIds, deadline, priority, status, companyProfileId } = req.body || {};
  const update = { updatedAt: new Date() };

  if (title !== undefined) {
    if (typeof title !== "string" || !title) {
      return res.status(400).json({ error: "title must be a non-empty string" });
    }
    update.title = title;
  }
  if (description !== undefined) {
    update.description = typeof description === "string" ? description : "";
  }
  if (assigneeIds !== undefined) {
    const assigneeResult = await validAssigneeIds(assigneeIds);
    if (assigneeResult.error) return res.status(400).json({ error: assigneeResult.error });
    update.assigneeIds = assigneeResult.ids;
  }
  if (deadline !== undefined) {
    if (deadline !== null && !DATE_PATTERN.test(deadline)) {
      return res.status(400).json({ error: "deadline must be a YYYY-MM-DD string or null" });
    }
    update.deadline = deadline;
  }
  if (priority !== undefined) {
    if (!VALID_PRIORITIES.has(priority)) {
      return res.status(400).json({ error: `priority must be one of ${[...VALID_PRIORITIES].join(", ")}` });
    }
    update.priority = priority;
  }
  if (status !== undefined) {
    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ error: `status must be one of ${[...VALID_STATUSES].join(", ")}` });
    }
    update.status = status;
  }
  if (companyProfileId !== undefined) {
    if (companyProfileId === null) {
      update.companyProfileId = null;
    } else {
      const companyProfileObjectId = toObjectId(companyProfileId);
      if (!companyProfileObjectId) return res.status(400).json({ error: "Invalid companyProfileId" });
      update.companyProfileId = companyProfileObjectId;
    }
  }

  const tasksCol = await tasks();
  const result = await tasksCol.findOneAndUpdate(
    { _id: taskId },
    { $set: update },
    { returnDocument: "after" },
  );
  if (!result) return res.status(404).json({ error: "Task not found" });

  const hoursMap = await hoursByTaskId([taskId]);
  res.json(serializeTask(result, hoursMap[taskId.toString()]));
});

router.delete("/api/portal/tasks/:id", requirePortalApi, requireRole("admin"), async (req, res) => {
  const taskId = toObjectId(req.params.id);
  if (!taskId) return res.status(400).json({ error: "Invalid task id" });

  const tasksCol = await tasks();
  const timeEntriesCol = await timeEntries();

  const result = await tasksCol.deleteOne({ _id: taskId });
  if (result.deletedCount === 0) return res.status(404).json({ error: "Task not found" });

  await timeEntriesCol.deleteMany({ taskId });
  res.json({ success: true });
});

// Owner (assignee) or Admin can move a task between columns — the one
// mutation a Teamlid is allowed to make on a task they don't otherwise own.
router.patch("/api/portal/tasks/:id/status", requirePortalApi, async (req, res) => {
  const taskId = toObjectId(req.params.id);
  if (!taskId) return res.status(400).json({ error: "Invalid task id" });

  const { status } = req.body || {};
  if (!VALID_STATUSES.has(status)) {
    return res.status(400).json({ error: `status must be one of ${[...VALID_STATUSES].join(", ")}` });
  }

  const tasksCol = await tasks();
  const task = await tasksCol.findOne({ _id: taskId });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const { portalUser } = req.session;
  if (portalUser.role !== "admin" && !isAssignee(task, portalUser.id)) {
    return res.status(403).json({ error: "Only an assignee or Admin can change this task's status" });
  }

  const result = await tasksCol.findOneAndUpdate(
    { _id: taskId },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  const hoursMap = await hoursByTaskId([taskId]);
  res.json(serializeTask(result, hoursMap[taskId.toString()]));
});

router.get("/api/portal/tasks/:id/time-entries", requirePortalApi, async (req, res) => {
  const taskId = toObjectId(req.params.id);
  if (!taskId) return res.status(400).json({ error: "Invalid task id" });

  const { portalUser } = req.session;
  const filter = { taskId };
  if (portalUser.role !== "admin") {
    filter.personId = toObjectId(portalUser.id);
  }

  const timeEntriesCol = await timeEntries();
  const entries = await timeEntriesCol.find(filter).sort({ date: -1 }).toArray();
  res.json(
    entries.map((entry) => ({
      id: entry._id.toString(),
      taskId: entry.taskId.toString(),
      personId: entry.personId.toString(),
      date: entry.date,
      hours: entry.hours,
      note: entry.note || null,
    })),
  );
});

router.post("/api/portal/tasks/:id/time-entries", requirePortalApi, async (req, res) => {
  const taskId = toObjectId(req.params.id);
  if (!taskId) return res.status(400).json({ error: "Invalid task id" });

  const { date, hours, note, personId } = req.body || {};
  if (!DATE_PATTERN.test(date || "")) {
    return res.status(400).json({ error: "date is required and must be a YYYY-MM-DD string" });
  }
  const numericHours = Number(hours);
  if (!Number.isFinite(numericHours) || numericHours <= 0 || numericHours > 24) {
    return res.status(400).json({ error: "hours must be a positive number no greater than 24" });
  }

  const tasksCol = await tasks();
  const task = await tasksCol.findOne({ _id: taskId });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const { portalUser } = req.session;
  let targetPersonId = toObjectId(portalUser.id);

  // Only Admin may log time on someone else's behalf (e.g. backfilling a
  // forgotten entry) — never trust a client-supplied personId otherwise.
  if (portalUser.role === "admin" && personId) {
    const explicitId = toObjectId(personId);
    if (!explicitId) return res.status(400).json({ error: "Invalid personId" });
    targetPersonId = explicitId;
  } else if (portalUser.role !== "admin" && !isAssignee(task, portalUser.id)) {
    return res.status(403).json({ error: "Only an assignee or Admin can log time on this task" });
  }

  const timeEntriesCol = await timeEntries();
  const now = new Date();
  const result = await timeEntriesCol.insertOne({
    taskId,
    personId: targetPersonId,
    date,
    hours: numericHours,
    note: typeof note === "string" && note ? note : null,
    createdAt: now,
    updatedAt: now,
  });

  res.status(201).json({
    id: result.insertedId.toString(),
    taskId: taskId.toString(),
    personId: targetPersonId.toString(),
    date,
    hours: numericHours,
    note: typeof note === "string" && note ? note : null,
  });
});

async function findOwnedTimeEntry(entryId, portalUser) {
  const timeEntriesCol = await timeEntries();
  const entry = await timeEntriesCol.findOne({ _id: entryId });
  if (!entry) return { error: 404 };
  if (portalUser.role !== "admin" && entry.personId.toString() !== portalUser.id) {
    return { error: 403 };
  }
  return { entry };
}

router.patch("/api/portal/time-entries/:id", requirePortalApi, async (req, res) => {
  const entryId = toObjectId(req.params.id);
  if (!entryId) return res.status(400).json({ error: "Invalid time entry id" });

  const { entry, error } = await findOwnedTimeEntry(entryId, req.session.portalUser);
  if (error === 404) return res.status(404).json({ error: "Time entry not found" });
  if (error === 403) return res.status(403).json({ error: "Not your time entry" });

  const { date, hours, note } = req.body || {};
  const update = { updatedAt: new Date() };
  if (date !== undefined) {
    if (!DATE_PATTERN.test(date)) return res.status(400).json({ error: "date must be a YYYY-MM-DD string" });
    update.date = date;
  }
  if (hours !== undefined) {
    const numericHours = Number(hours);
    if (!Number.isFinite(numericHours) || numericHours <= 0 || numericHours > 24) {
      return res.status(400).json({ error: "hours must be a positive number no greater than 24" });
    }
    update.hours = numericHours;
  }
  if (note !== undefined) {
    update.note = typeof note === "string" && note ? note : null;
  }

  const timeEntriesCol = await timeEntries();
  await timeEntriesCol.updateOne({ _id: entry._id }, { $set: update });
  res.json({ id: entry._id.toString(), ...entry, ...update, taskId: entry.taskId.toString(), personId: entry.personId.toString() });
});

router.delete("/api/portal/time-entries/:id", requirePortalApi, async (req, res) => {
  const entryId = toObjectId(req.params.id);
  if (!entryId) return res.status(400).json({ error: "Invalid time entry id" });

  const { error } = await findOwnedTimeEntry(entryId, req.session.portalUser);
  if (error === 404) return res.status(404).json({ error: "Time entry not found" });
  if (error === 403) return res.status(403).json({ error: "Not your time entry" });

  const timeEntriesCol = await timeEntries();
  await timeEntriesCol.deleteOne({ _id: entryId });
  res.json({ success: true });
});

module.exports = router;
