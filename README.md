# Branch

## Transaction ledger + GoCardless fee collection

Business A's site (SumUp payments) reports each completed transaction to this
site via `POST /api/transactions`. Branch collects a flat fee per transaction
from Business A monthly via SEPA Direct Debit through GoCardless.

### One-time setup

1. Copy `backend/.env.example` to `backend/.env` and fill in every value —
   the server refuses to start if any required var is missing (see
   `backend/config/env.js`).
   - `SESSION_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `ADMIN_PASSWORD_HASH`: `npm run hash-admin-password -- 'your-chosen-password'`
   - `GOCARDLESS_ACCESS_TOKEN` / `GOCARDLESS_WEBHOOK_SECRET`: from your
     GoCardless **sandbox** dashboard (Developers → Create access token,
     Developers → Webhook endpoints).
2. In the GoCardless sandbox dashboard, add a webhook endpoint pointing at
   `https://<your-dev-tunnel-or-host>/webhooks/gocardless` and copy its
   secret into `GOCARDLESS_WEBHOOK_SECRET`. (Locally, use something like
   `ngrok http 3000` to get a URL GoCardless can reach.)
3. `npm install`
4. Seed the Business A client record and get its API key:
   ```
   npm run seed-client -- --client-id business-a --name "Business A" \
     --email billing@businessa.example --fee 3.00 --currency EUR
   ```
   This prints an API key **once** — give that to Business A's site to send
   as `Authorization: Bearer <key>` on its calls to `/api/transactions`.
5. Visit `http://localhost:3000/onboarding/business-a`, authorize with a
   [GoCardless sandbox test bank account](https://developer.gocardless.com/getting-started/api/testing-guide/)
   (e.g. sort code `200000`, account number `55779911` for a GB test payer —
   check GoCardless's testing guide for the current SEPA/EUR test details),
   and confirm the client's `mandate_status` becomes `active` once the
   `mandates` webhook fires (check `/admin`).

### Simulating an incoming transaction

```
curl -X POST http://localhost:3000/api/transactions \
  -H "Authorization: Bearer <api_key_from_seed-client>" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "business-a",
    "amount": 42.50,
    "currency": "EUR",
    "transaction_id": "sumup-test-001",
    "timestamp": "2026-08-31T10:00:00Z"
  }'
```

Or: `npm run simulate-transaction -- --api-key <key> --amount 42.50`. Calling
it twice with the same `transaction_id` returns `already_recorded: true`
instead of creating a duplicate row.

### Testing the monthly billing job

The job runs daily via an in-process cron (`backend/jobs/scheduler.js`) and
only actually sends a notice or collects on the right calendar days. To test
without waiting for those dates:

```
npm run run-billing -- --date 2026-08-27   # 5 days before Sept 1 -> sends notices
npm run run-billing -- --date 2026-09-01   # collects against unbilled transactions
```

This hits the real GoCardless sandbox API and sends a real email via the
configured Gmail account, so use test data.

### Admin view

`/admin` (session-login, `ADMIN_USERNAME` / a password matching
`ADMIN_PASSWORD_HASH`) shows each client's mandate status, current unbilled
total, and collection history.

### Adding a second client later

`npm run seed-client -- --client-id <id> --name ... --email ... --fee ...`
with a different flat fee/currency, then send them to
`/onboarding/<id>`. Nothing else changes — routes, the billing job, and the
admin view are all client-agnostic.

### Switching sandbox → live

1. Create a **live** GoCardless account/access token and a **separate** live
   webhook endpoint (the sandbox webhook secret does not carry over —
   sandbox and live are registered independently in the dashboard).
2. Update `backend/.env`: `GOCARDLESS_ENVIRONMENT=live`,
   `GOCARDLESS_ACCESS_TOKEN=<live token>`,
   `GOCARDLESS_WEBHOOK_SECRET=<live webhook secret>`, `APP_BASE_URL=<real
   production URL>`.
3. Re-run the onboarding flow for Business A against live — sandbox mandates
   don't exist in live, so `gocardless_mandate_id` must be re-established.
4. Restart the app so `assertEnv()` picks up the new values.

### Known limitations

- Admin sessions use `express-session`'s in-memory store — restarting the
  server logs out any active admin session. Fine for a single-operator
  internal tool; swap in a persistent session store if that changes.
- `npm audit` flags a moderate `uuid` advisory pulled in transitively by
  `node-cron`'s dependency on `uuid` \<11.1.1 (buffer-bounds check on an API
  path `node-cron` doesn't use). A fix requires a breaking `node-cron` major
  bump; left as-is for now.