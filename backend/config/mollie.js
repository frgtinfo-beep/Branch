const { createMollieClient } = require("@mollie/api-client");
const { config } = require("./env");

let client;

// Lazily constructed so env vars are guaranteed to be validated (assertEnv)
// before we ever try to read them. Test vs live mode is decided by the API
// key itself (test_... / live_...), not by a separate setting.
function getMollieClient() {
  if (!client) {
    client = createMollieClient({ apiKey: config.mollie.apiKey() });
  }
  return client;
}

module.exports = { getMollieClient };
