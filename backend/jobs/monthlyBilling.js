const { isFirstOfMonth, addLocalDays, startOfNextMonthLocal, toLocalNoon } = require("../utils/dates");
const { sendInvoices, runCollections, INVOICE_DAYS_BEFORE_COLLECTION } = require("../services/billingService");

// Runs once a day. Two independent checks, both driven off the *local*
// (billing-timezone) calendar date so day-of-month math is correct
// regardless of month length:
//   - "is today N days before the 1st of the upcoming month?" -> send invoices
//   - "is today the 1st?" -> collect every invoice that's due
// Fixed day-of-month cron schedules (e.g. "run on the 24th") would drift
// wrong around February; this doesn't.
async function runDailyBillingCheck({ now = new Date() } = {}) {
  const results = { invoicesSent: false, collectionsRun: false };

  if (isFirstOfMonth(addLocalDays(now, INVOICE_DAYS_BEFORE_COLLECTION))) {
    const upcomingCollectionDate = startOfNextMonthLocal(now);
    await sendInvoices({ collectionDate: upcomingCollectionDate, now });
    results.invoicesSent = true;
  }

  if (isFirstOfMonth(now)) {
    await runCollections({ collectionDate: toLocalNoon(now) });
    results.collectionsRun = true;
  }

  return results;
}

module.exports = { runDailyBillingCheck };
