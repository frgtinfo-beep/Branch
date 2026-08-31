// Team-portal date helpers. Calendar-day fields (deadlines, availability,
// time-entry dates) are plain "YYYY-MM-DD" strings throughout the portal —
// compared/sorted lexically, never round-tripped through Date/UTC — which
// sidesteps the timezone bug class utils/dates.js exists to work around for
// billing. The one place a real "what day is it right now" check is needed
// is the overdue calculation below, which must use the branch's own
// timezone rather than the server's or a visitor's device clock.

const PORTAL_TIMEZONE = "Europe/Amsterdam";

// Returns today's calendar date, as seen in PORTAL_TIMEZONE, as "YYYY-MM-DD".
function todayLocal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PORTAL_TIMEZONE }).format(new Date());
}

function isOverdue(deadline, status) {
  return Boolean(deadline) && status !== "klaar" && deadline < todayLocal();
}

module.exports = { todayLocal, isOverdue };
