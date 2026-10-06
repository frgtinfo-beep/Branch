const { sendAlertEmail } = require("./emailService");

// The single place every "a human needs to look at this" situation goes
// through: a loud, greppable log line plus an email to Branch's own mailbox
// (ALERT_EMAIL, falling back to GMAIL_USER). The email is best-effort — a mail
// outage must never break the billing job or make a webhook fail.
async function flagForManualFollowUp({ subject, summary, ...details }) {
  console.error("MANUAL FOLLOW-UP REQUIRED:", JSON.stringify(details));
  try {
    await sendAlertEmail({
      subject: subject || `Action needed: ${details.stage}${details.client_id ? ` (${details.client_id})` : ""}`,
      summary: summary || "Something in billing needs manual follow-up.",
      details,
    });
  } catch (error) {
    console.error("Alert email failed:", error.message);
  }
}

module.exports = { flagForManualFollowUp };
