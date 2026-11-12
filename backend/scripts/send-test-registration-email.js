// Sends both "gratis website" emails (team notification + client confirmation)
// with example data, without saving anything. Run where GMAIL_USER and
// GMAIL_APP_PASSWORD are set (e.g. the Render shell):
//   npm run test-registration-email -- --to you@example.com
// The team email goes to contact@infobranch.nl as usual; the confirmation goes to --to.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { sendRegistrationTeamEmail, sendRegistrationConfirmationEmail } = require("../services/emailService");

const toIndex = process.argv.indexOf("--to");
const to = toIndex > -1 ? process.argv[toIndex + 1] : null;
if (!to) {
  console.error("Usage: npm run test-registration-email -- --to you@example.com");
  process.exit(1);
}
if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  console.error("GMAIL_USER and GMAIL_APP_PASSWORD must be set.");
  process.exit(1);
}

const example = {
  companyName: "TEST · Prime Cuts",
  sector: "Kapper / barber",
  kvk: "Ja",
  clientsPerMonth: "50-100",
  phone: "06 12345678",
  email: to,
};

(async () => {
  await sendRegistrationTeamEmail(example);
  console.log("Team email sent to contact@infobranch.nl");
  await sendRegistrationConfirmationEmail(example);
  console.log(`Confirmation email sent to ${to}`);
})().catch((error) => {
  console.error("Sending failed:", error.message);
  process.exit(1);
});
