# Branch

## Transaction ledger + Mollie fee collection

Business A's site (SumUp payments) reports each completed transaction to this
site via `POST /api/transactions`. Branch collects a flat fee per transaction
from Business A monthly via SEPA Direct Debit through Mollie.

### Monthly invoices

Seven days before the 1st, every active client is invoiced for all reported
transactions not yet on an invoice: 21% btw on top of the fee
(`backend/config/company.js`), numbered `YYYY-NNN` without gaps. The PDF is
emailed to the client's `billing_email`, CC'd to `GMAIL_USER` for the
administration. On the 1st, each due invoice is collected as its own Mollie
payment for exactly the invoice total. Transactions reported after the invoice
went out land on next month's invoice. Paused clients are still invoiced;
their invoices are collected on the first 1st after the pause is lifted.

Invoice PDFs can be re-downloaded from `/admin` (Invoice column) — they're
re-rendered from the snapshot stored on the billing run, identical to what was
sent. `npm run preview-invoice -- --client-id <id> --out draft.pdf` shows what
the next invoice would look like without saving or sending anything. An
invoice made by hand is registered with `npm run record-manual-invoice` (dry
run by default, `--confirm` to write) so it isn't invoiced twice.

When the KOR is approved, set `VAT_RATE_PERCENT` to `0`: invoices then show
the exemption text and the debit no longer includes btw.

### One-time setup

1. Copy `backend/.env.example` to `backend/.env` and fill in every value —
   the server refuses to start if any required var is missing (see
   `backend/config/env.js`).
   - `SESSION_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `ADMIN_PASSWORD_HASH`: `npm run hash-admin-password -- 'your-chosen-password'`
   - `MOLLIE_API_KEY`: the **test** API key (`test_...`) from the Mollie
     dashboard (Developers → API keys). SEPA Direct Debit and iDEAL (and/or
     Bancontact) must be enabled on the profile.
   - `APP_BASE_URL`: a URL Mollie can reach — it's used for both the checkout
     redirect and the webhook (`<APP_BASE_URL>/webhooks/mollie`). Locally,
     use something like `ngrok http 3000`. There's no webhook secret: the
     webhook URL is set on each payment, and the app re-fetches the payment
     from the API instead of trusting the webhook body.
2. `npm install`
3. Seed the Business A client record and get its API key:
   ```
   npm run seed-client -- --client-id business-a --name "Business A" \
     --email billing@businessa.example --fee 3.00 --currency EUR \
     --address "Straat 1|1234 AB Plaats|Nederland"
   ```
   `--address` is printed on invoices. `--savings 0.68` adds an informational
   per-transaction savings line for the client's bookkeeper (not charged).
   This prints an API key **once** — give that to Business A's site to send
   as `Authorization: Bearer <key>` on its calls to `/api/transactions`.
4. Visit `<APP_BASE_URL>/onboarding/business-a` and complete the €0.01
   verification payment. In test mode Mollie shows a page where you choose the
   outcome — pick **Paid** — and the client's `mandate_status` becomes
   `active` (check `/admin`).

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
npm run run-billing -- --date 2026-08-25   # 7 days before Sept 1 -> sends invoices
npm run run-billing -- --date 2026-09-01   # collects every due invoice
```

This hits the Mollie API with the configured key and sends real invoice
emails via the configured Gmail account (and uses up invoice numbers), so
only run it against test data.

### Admin view

`/admin` (session-login, `ADMIN_USERNAME` / a password matching
`ADMIN_PASSWORD_HASH`) shows each client's mandate status, current unbilled
total, and collection history.

### Adding a second client later

`npm run seed-client -- --client-id <id> --name ... --email ... --fee ...`
with a different flat fee/currency, then send them to
`/onboarding/<id>`. Nothing else changes — routes, the billing job, and the
admin view are all client-agnostic.

### Switching test → live

1. Get Mollie's approval for the profile to accept live payments, with SEPA
   Direct Debit and iDEAL/Bancontact enabled.
2. Update `backend/.env`: `MOLLIE_API_KEY=<live_... key>`,
   `APP_BASE_URL=<real production URL>`.
3. Re-run the onboarding flow for Business A against live. Test customers
   and mandates don't exist in live mode, so first clear the client's
   `mollie_customer_id`, `mollie_mandate_id` and `mollie_first_payment_id`.
4. Restart the app so `assertEnv()` picks up the new values.

### Migrating from GoCardless

GoCardless mandates can't be moved to Mollie, so each existing client
re-authorizes once via `/onboarding/<id>`. While a client has
`collection_paused: true`, transactions keep piling up as unbilled and
nothing is charged. Once their Mollie mandate is `active`, unset the flag and
the next collection on the 1st charges the whole backlog. Older billing runs
keep their `gocardless_payment_id` for history. Cancel the old mandate in the
GoCardless dashboard after that.

### Known limitations

- Admin sessions use `express-session`'s in-memory store — restarting the
  server logs out any active admin session. Fine for a single-operator
  internal tool; swap in a persistent session store if that changes.
- `npm audit` flags a moderate `uuid` advisory pulled in transitively by
  `node-cron`'s dependency on `uuid` \<11.1.1 (buffer-bounds check on an API
  path `node-cron` doesn't use). A fix requires a breaking `node-cron` major
  bump; left as-is for now.