const { GoCardlessClient, Environments } = require("gocardless-nodejs");
const { config } = require("./env");

let client;

// Lazily constructed so env vars are guaranteed to be validated (assertEnv)
// before we ever try to read them.
function getGoCardlessClient() {
  if (!client) {
    const environment =
      config.goCardless.environment() === "live" ? Environments.Live : Environments.Sandbox;
    client = new GoCardlessClient(config.goCardless.accessToken(), environment);
  }
  return client;
}

module.exports = { getGoCardlessClient };
