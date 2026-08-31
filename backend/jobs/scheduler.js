const cron = require("node-cron");
const { config } = require("../config/env");
const { runDailyBillingCheck } = require("./monthlyBilling");

// Runs once a day; runDailyBillingCheck itself decides whether today is a
// notice day, a collection day, both, or neither. 08:00 local gives plenty
// of buffer before end-of-day without being the middle of the night.
function startBillingScheduler() {
  cron.schedule(
    "0 8 * * *",
    async () => {
      try {
        const result = await runDailyBillingCheck();
        console.log(JSON.stringify({ at: new Date().toISOString(), job: "dailyBillingCheck", ...result }));
      } catch (error) {
        console.error("Daily billing check failed:", error);
      }
    },
    { timezone: config.billingTimezone() },
  );
}

module.exports = { startBillingScheduler };
