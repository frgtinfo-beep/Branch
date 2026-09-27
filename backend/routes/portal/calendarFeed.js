// Subscribable iCalendar (.ics) feed of the shared portal calendar, so team
// members can add it to Apple Calendar (or Google/Outlook). Calendar apps
// can't log in, so the feed URL carries a long random token instead; admins
// can rotate it if the link leaks.

const crypto = require("crypto");
const express = require("express");
const { events, settings, users } = require("../../db");
const { requirePortalApi, requireRole } = require("../../middleware/portalAuth");
const { config } = require("../../config/env");

const router = express.Router();

const TOKEN_DOC_ID = "calendarFeed";
const TIME_ZONE = "Europe/Amsterdam";
const PAST_DAYS = 90; // keep recent history visible, don't ship years of old events
const DAY_MS = 24 * 60 * 60 * 1000;

async function getToken() {
  const col = await settings();
  const doc = await col.findOne({ _id: TOKEN_DOC_ID });
  if (doc && doc.token) return doc.token;
  const token = crypto.randomBytes(24).toString("base64url");
  // Upsert without overwriting a token another request may have just created
  await col.updateOne({ _id: TOKEN_DOC_ID }, { $setOnInsert: { token, createdAt: new Date() } }, { upsert: true });
  return (await col.findOne({ _id: TOKEN_DOC_ID })).token;
}

function feedUrls(token) {
  const httpsUrl = `${config.appBaseUrl()}/calendar/feed/${token}.ics`;
  return { httpsUrl, webcalUrl: httpsUrl.replace(/^https?:\/\//, "webcal://") };
}

function tokensMatch(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// --- iCalendar formatting (RFC 5545) ---

function escapeText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Lines longer than 75 octets must be folded with CRLF + a single space
function foldLine(line) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts = [];
  let current = "";
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (Buffer.byteLength(current + char, "utf8") > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function utcStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// All-day events are stored as local (Amsterdam) midnights; express them as
// floating DATE values so they land on the right day in every time zone.
const dateInZone = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
function localDate(date) {
  return dateInZone.format(date).replace(/-/g, "");
}

function buildCalendar(list, namesById) {
  const now = utcStamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Branch//Team Portal//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Branch Team",
    `X-WR-TIMEZONE:${TIME_ZONE}`,
    "X-WR-CALDESC:Gedeelde agenda van het Branch-team",
    // Hints for how often clients should re-fetch (Apple honours these loosely)
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
  ];

  for (const event of list) {
    const creator = event.createdBy ? namesById[event.createdBy.toString()] : null;
    const description = [event.description, creator ? `Aangemaakt door ${creator}` : ""].filter(Boolean).join("\n\n");
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event._id.toString()}@branch-portal`);
    lines.push(`DTSTAMP:${now}`);
    if (event.updatedAt) lines.push(`LAST-MODIFIED:${utcStamp(event.updatedAt)}`);
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${localDate(event.start)}`);
      lines.push(`DTEND;VALUE=DATE:${localDate(event.end)}`);
    } else {
      lines.push(`DTSTART:${utcStamp(event.start)}`);
      lines.push(`DTEND:${utcStamp(event.end)}`);
    }
    lines.push(`SUMMARY:${escapeText(event.title)}`);
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

// --- routes ---

// Public: the feed calendar apps subscribe to. Express 5 route params can't
// be followed by a literal ".ics", so the extension is stripped by hand.
router.get("/calendar/feed/:file", async (req, res) => {
  const requested = req.params.file.replace(/\.ics$/, "");
  const token = await getToken();
  if (!tokensMatch(requested, token)) return res.status(404).send("Not found");

  const eventsCol = await events();
  const since = new Date(Date.now() - PAST_DAYS * DAY_MS);
  const list = await eventsCol.find({ end: { $gt: since } }).sort({ start: 1 }).toArray();
  const usersCol = await users();
  const all = await usersCol.find({}, { projection: { name: 1 } }).toArray();
  const namesById = Object.fromEntries(all.map((u) => [u._id.toString(), u.name]));

  res.set("Content-Type", "text/calendar; charset=utf-8");
  res.set("Content-Disposition", 'inline; filename="branch-team.ics"');
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  // The URL is a secret; keep it out of search engines and referrers
  res.set("X-Robots-Tag", "noindex");
  res.set("Referrer-Policy", "no-referrer");
  res.send(buildCalendar(list, namesById));
});

// Portal users: fetch the subscription link to share
router.get("/api/portal/calendar/feed", requirePortalApi, async (req, res) => {
  res.json(feedUrls(await getToken()));
});

// Admins: replace the link (the old one stops working immediately)
router.post("/api/portal/calendar/feed/rotate", requirePortalApi, requireRole("admin"), async (req, res) => {
  const col = await settings();
  const token = crypto.randomBytes(24).toString("base64url");
  await col.updateOne({ _id: TOKEN_DOC_ID }, { $set: { token, rotatedAt: new Date() } }, { upsert: true });
  res.json(feedUrls(token));
});

module.exports = router;
module.exports.buildCalendar = buildCalendar;
