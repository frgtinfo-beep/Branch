const crypto = require("crypto");

// Per-client secret in the onboarding link, so knowing (or guessing) a
// client_id isn't enough to start a mandate authorization for that client.
// Stored in plaintext rather than hashed so the link can be printed again.
function generateOnboardingToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function onboardingTokenMatches(client, token) {
  if (typeof token !== "string" || typeof client.onboarding_token !== "string") return false;
  const given = Buffer.from(token, "utf8");
  const expected = Buffer.from(client.onboarding_token, "utf8");
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

function onboardingPath(client, suffix = "") {
  return `/onboarding/${encodeURIComponent(client.client_id)}${suffix}?token=${encodeURIComponent(client.onboarding_token)}`;
}

module.exports = { generateOnboardingToken, onboardingTokenMatches, onboardingPath };
