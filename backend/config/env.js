// Central startup validation. Fails loudly (throws) if anything required is
// missing, rather than letting the app boot into a half-configured state.

const REQUIRED_VARS = [
  "MONGODB_URI",
  "GOCARDLESS_ENVIRONMENT",
  "GOCARDLESS_ACCESS_TOKEN",
  "GOCARDLESS_WEBHOOK_SECRET",
  "APP_BASE_URL",
  "SESSION_SECRET",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD_HASH",
];

function assertEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Check backend/.env against backend/.env.example.`,
    );
  }

  const goCardlessEnvironment = process.env.GOCARDLESS_ENVIRONMENT.toLowerCase();
  if (!["sandbox", "live"].includes(goCardlessEnvironment)) {
    throw new Error(
      `GOCARDLESS_ENVIRONMENT must be "sandbox" or "live", got "${process.env.GOCARDLESS_ENVIRONMENT}".`,
    );
  }
}

const config = {
  appBaseUrl: () => process.env.APP_BASE_URL.replace(/\/+$/, ""),
  billingTimezone: () => process.env.BILLING_TIMEZONE || "Europe/Amsterdam",
  goCardless: {
    environment: () => process.env.GOCARDLESS_ENVIRONMENT.toLowerCase(),
    accessToken: () => process.env.GOCARDLESS_ACCESS_TOKEN,
    webhookSecret: () => process.env.GOCARDLESS_WEBHOOK_SECRET,
  },
  admin: {
    username: () => process.env.ADMIN_USERNAME,
    passwordHash: () => process.env.ADMIN_PASSWORD_HASH,
  },
  sessionSecret: () => process.env.SESSION_SECRET,
};

module.exports = { assertEnv, config };
