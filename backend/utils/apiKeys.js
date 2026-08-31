const crypto = require("crypto");

const KEY_PREFIX = "branch_live_";

// Per-client API keys: high-entropy random tokens, so a fast deterministic
// hash (not bcrypt) is the right tool — we need an equality lookup by hash,
// not a slow comparison against a small guessable keyspace like a password.
function generateApiKey() {
  return `${KEY_PREFIX}${crypto.randomBytes(32).toString("hex")}`;
}

function hashApiKey(apiKey) {
  return crypto.createHash("sha256").update(apiKey, "utf8").digest("hex");
}

module.exports = { generateApiKey, hashApiKey };
