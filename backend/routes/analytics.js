// Cookieless, first-party website analytics.
//
// Privacy design (see frontend/privacy.html and cookies.html):
// - No cookies or other identifiers are stored on the visitor's device.
// - IP addresses are never stored. A visitor is counted once per day through
//   a hash of (daily salt + IP + user agent); the salt is replaced every day
//   and the old one discarded, so hashes can't be linked across days or
//   reversed to an IP.
// - Browsers that send Global Privacy Control or Do Not Track are skipped
//   client-side; bots are dropped here.
// - Raw events expire after ~13 months (TTL index in db/index.js).

const crypto = require("crypto");
const express = require("express");
const { analytics, settings } = require("../db");
const { requirePortalPage, requirePortalApi, requireRole } = require("../middleware/portalAuth");
const { analyticsPage } = require("../views/portal/analytics");

const router = express.Router();

const TIME_ZONE = "Europe/Amsterdam";
const SALT_DOC_ID = "analyticsSalt";
const BOT_PATTERN = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python|axios|node-fetch/i;
const LOCAL_HOSTS = ["localhost", "127.0.0.1", ""];
// Names the site script is allowed to send; anything else is dropped
const EVENT_NAMES = new Set([
  "contact_link", "whatsapp", "phone", "email", "package_cta", "package_details",
  "view_packages", "start_project", "form_submit", "language", "legal_link", "portal_link",
]);

const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
function amsterdamDay(date) {
  return dayFormatter.format(date);
}

function clean(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// --- daily salt (kept in the db so restarts on the same day don't double-count)
let cachedSalt = null;
async function saltFor(day) {
  if (cachedSalt && cachedSalt.day === day) return cachedSalt.salt;
  const col = await settings();
  const doc = await col.findOne({ _id: SALT_DOC_ID });
  if (doc && doc.day === day) {
    cachedSalt = { day, salt: doc.salt };
    return doc.salt;
  }
  // New day: replace (not keep) yesterday's salt
  const salt = crypto.randomBytes(32).toString("hex");
  await col.updateOne({ _id: SALT_DOC_ID }, { $set: { day, salt } }, { upsert: true });
  cachedSalt = { day, salt };
  return salt;
}

// --- simple per-IP rate limit (in memory; IPs are not persisted)
const hits = new Map();
setInterval(() => hits.clear(), 60 * 1000).unref();
function rateLimited(ip) {
  const count = (hits.get(ip) || 0) + 1;
  hits.set(ip, count);
  return count > 120;
}

// Public collector. sendBeacon posts text/plain (no CORS preflight), so the
// body is parsed by hand.
router.post("/api/collect", express.text({ type: "*/*", limit: "4kb" }), async (req, res) => {
  res.status(204).end(); // never make the visitor wait on analytics
  try {
    const ua = req.get("user-agent") || "";
    if (!ua || BOT_PATTERN.test(ua) || rateLimited(req.ip)) return;

    let body;
    try { body = JSON.parse(typeof req.body === "string" ? req.body : "{}"); } catch { return; }

    const type = body.type === "pageview" ? "pageview" : body.type === "event" ? "event" : null;
    if (!type) return;
    const name = type === "event" ? clean(body.name, 40) : "";
    if (type === "event" && !EVENT_NAMES.has(name)) return;

    const now = new Date();
    const day = amsterdamDay(now);
    const salt = await saltFor(day);
    const visitor = crypto.createHash("sha256").update(`${salt}|${req.ip}|${ua}`).digest("hex").slice(0, 16);

    const device = ["mobile", "tablet", "desktop"].includes(body.device) ? body.device : "desktop";
    const col = await analytics();
    await col.insertOne({
      ts: now,
      day,
      type,
      name,
      label: clean(body.label, 60),
      path: clean(body.path, 120) || "/",
      ref: clean(body.ref, 80).toLowerCase(),
      device,
      lang: body.lang === "nl" ? "nl" : "en",
      host: clean(body.host, 80).toLowerCase(),
      v: visitor,
    });
  } catch (err) {
    console.error("analytics collect failed:", err.message);
  }
});

// --- dashboard

router.get("/portal/analytics", requirePortalPage, (req, res) => {
  if (!["admin", "bestuur"].includes(req.session.portalUser.role)) return res.redirect("/portal");
  res.send(analyticsPage(req.session.portalUser));
});

function dayList(endDay, count) {
  const [y, m, d] = endDay.split("-").map(Number);
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(Date.UTC(y, m - 1, d - i, 12));
    out.push(date.toISOString().slice(0, 10));
  }
  return out;
}

router.get("/api/portal/analytics", requirePortalApi, requireRole("admin", "bestuur"), async (req, res) => {
  const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const today = amsterdamDay(new Date());
  const all = dayList(today, days * 2);
  const previous = all.slice(0, days);
  const current = all.slice(days);
  const firstCurrent = current[0];
  const match = { day: { $gte: all[0], $lte: today }, host: { $nin: LOCAL_HOSTS } };

  const col = await analytics();
  const [visits, pages, referrers, events, live] = await Promise.all([
    // One row per visitor per day
    col.aggregate([
      { $match: { ...match, type: "pageview" } },
      { $group: { _id: { day: "$day", v: "$v" }, pageviews: { $sum: 1 }, device: { $first: "$device" }, lang: { $first: "$lang" } } },
    ]).toArray(),
    col.aggregate([
      { $match: { ...match, type: "pageview", day: { $gte: firstCurrent, $lte: today } } },
      { $group: { _id: "$path", pageviews: { $sum: 1 } } },
      { $sort: { pageviews: -1 } },
      { $limit: 10 },
    ]).toArray(),
    col.aggregate([
      { $match: { ...match, type: "pageview", day: { $gte: firstCurrent, $lte: today }, ref: { $ne: "" } } },
      { $group: { _id: "$ref", visits: { $sum: 1 } } },
      { $sort: { visits: -1 } },
      { $limit: 10 },
    ]).toArray(),
    col.aggregate([
      { $match: { ...match, type: "event" } },
      { $group: { _id: { name: "$name", label: "$label", current: { $gte: ["$day", firstCurrent] } }, count: { $sum: 1 } } },
    ]).toArray(),
    col.aggregate([
      { $match: { host: { $nin: LOCAL_HOSTS }, ts: { $gte: new Date(Date.now() - 30 * 60 * 1000) } } },
      { $group: { _id: "$v" } },
      { $count: "n" },
    ]).toArray(),
  ]);

  const daily = Object.fromEntries(current.map((d) => [d, { day: d, visits: 0, pageviews: 0 }]));
  const totals = { current: { visits: 0, pageviews: 0 }, previous: { visits: 0, pageviews: 0 } };
  const devices = {};
  const languages = {};
  visits.forEach(({ _id, pageviews, device, lang }) => {
    const bucket = _id.day >= firstCurrent ? "current" : "previous";
    totals[bucket].visits += 1;
    totals[bucket].pageviews += pageviews;
    if (bucket === "current") {
      daily[_id.day].visits += 1;
      daily[_id.day].pageviews += pageviews;
      devices[device] = (devices[device] || 0) + 1;
      languages[lang] = (languages[lang] || 0) + 1;
    }
  });

  const eventRows = events.map(({ _id, count }) => ({ name: _id.name, label: _id.label, current: _id.current, count }));

  res.json({
    days,
    range: { from: firstCurrent, to: today },
    liveVisitors: live[0] ? live[0].n : 0,
    totals,
    daily: current.map((d) => daily[d]),
    pages: pages.map((p) => ({ path: p._id, pageviews: p.pageviews })),
    referrers: referrers.map((r) => ({ source: r._id, visits: r.visits })),
    devices,
    languages,
    events: eventRows,
  });
});

module.exports = router;
