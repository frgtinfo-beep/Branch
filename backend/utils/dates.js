const { config } = require("../config/env");

// Returns { year, month (1-indexed), day } for `date` as seen in the billing
// timezone — this is the calendar date the "1st of the month" logic actually
// cares about, not the UTC date the server's clock happens to be on.
function localCalendarDate(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: config.billingTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [{ value: year }, , { value: month }, , { value: day }] = formatter.formatToParts(date);
  return { year: Number(year), month: Number(month), day: Number(day) };
}

function isFirstOfMonth(date) {
  return localCalendarDate(date).day === 1;
}

// Calendar-day addition done on the local (billing-timezone) date, so it's
// unaffected by which UTC offset `date`'s instant happens to fall in.
function addLocalDays(date, days) {
  const { year, month, day } = localCalendarDate(date);
  // Noon UTC avoids DST-boundary edge cases when this gets re-interpreted.
  return new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
}

function startOfNextMonthLocal(date) {
  const { year, month } = localCalendarDate(date);
  return new Date(Date.UTC(year, month, 1, 12, 0, 0));
}

// Normalizes any instant to a noon-UTC anchor for its local calendar day —
// the same shape addLocalDays/startOfNextMonthLocal return, so all
// billing_run.period_end values are directly comparable regardless of what
// time of day the cron actually fired at.
function toLocalNoon(date) {
  return addLocalDays(date, 0);
}

module.exports = { localCalendarDate, isFirstOfMonth, addLocalDays, startOfNextMonthLocal, toLocalNoon };
