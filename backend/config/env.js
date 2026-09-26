// Central startup validation. Fails loudly (throws) if anything required is
// missing, rather than letting the app boot into a half-configured state.

const REQUIRED_VARS = [
  "MONGODB_URI",
  "MOLLIE_API_KEY",
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

  // Catches pasting the wrong credential (e.g. an organization access token
  // or profile ID) rather than failing on the first API call days later.
  if (!/^(test|live)_/.test(process.env.MOLLIE_API_KEY)) {
    throw new Error('MOLLIE_API_KEY must be a Mollie API key starting with "test_" or "live_".');
  }
}

const config = {
  appBaseUrl: () => process.env.APP_BASE_URL.replace(/\/+$/, ""),
  billingTimezone: () => process.env.BILLING_TIMEZONE || "Europe/Amsterdam",
  mollie: {
    apiKey: () => process.env.MOLLIE_API_KEY,
    webhookUrl: () => `${process.env.APP_BASE_URL.replace(/\/+$/, "")}/webhooks/mollie`,
  },
  admin: {
    username: () => process.env.ADMIN_USERNAME,
    passwordHash: () => process.env.ADMIN_PASSWORD_HASH,
  },
  sessionSecret: () => process.env.SESSION_SECRET,
};

module.exports = { assertEnv, config };
