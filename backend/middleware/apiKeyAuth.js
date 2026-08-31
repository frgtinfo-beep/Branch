const { clients } = require("../db");
const { hashApiKey } = require("../utils/apiKeys");

// Authenticates a client by bearer API key and attaches the client record
// (minus the key hash) to req.client. Any client can only ever act as itself
// — there is no notion of one client's key acting on another client's data.
async function apiKeyAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or malformed Authorization header. Expected: Bearer <api_key>" });
  }

  try {
    const clientsCol = await clients();
    const client = await clientsCol.findOne({ api_key_hash: hashApiKey(token), active: true });

    if (!client) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    req.client = client;
    next();
  } catch (error) {
    console.error("apiKeyAuth error:", error);
    res.status(500).json({ error: "Internal error while authenticating" });
  }
}

module.exports = { apiKeyAuth };
