const { isFirstOfMonth, addLocalDays, startOfNextMonthLocal, toLocalNoon } = require("../utils/dates");
const { sendPreCollectionNotices, runCollections, NOTICE_DAYS_BEFORE_COLLECTION } = require("../services/billingService");

// Runs once a day. Two independent checks, both driven off the *local*
// (billing-timezone) calendar date so day-of-month math is correct
// regardless of month length:
//   - "is today N days before the 1st of the upcoming month?" -> send notices
//   - "is today the 1st?" -> run the actual collection
// Fixed day-of-month cron schedules (e.g. "run on the 27th") would drift
// wrong around February; this doesn't.
async function runDailyBillingCheck({ now = new Date() } = {}) {
  const results = { noticesSent: false, collectionsRun: false };

  if (isFirstOfMonth(addLocalDays(now, NOTICE_DAYS_BEFORE_COLLECTION))) {
    const upcomingCollectionDate = startOfNextMonthLocal(now);
    await sendPreCollectionNotices({ collectionDate: upcomingCollectionDate });
    results.noticesSent = true;
  }

  if (isFirstOfMonth(now)) {
    await runCollections({ collectionDate: toLocalNoon(now) });
    results.collectionsRun = true;
  }

  return results;
}

module.exports = { runDailyBillingCheck };
