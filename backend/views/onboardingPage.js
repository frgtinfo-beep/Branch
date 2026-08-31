// Minimal self-contained HTML — no template engine in this project, and the
// content here is small enough not to need one.

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
  ));
}

function onboardingPage({ client, cancelled }) {
  const name = escapeHtml(client.name);
  const fee = escapeHtml(client.fee_amount.toFixed(2));
  const currency = escapeHtml(client.currency);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Set up payments — ${name}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 560px; margin: 80px auto; padding: 0 20px; color: #111827; }
  h1 { font-size: 22px; margin-bottom: 8px; }
  p { color: #374151; line-height: 1.6; }
  .notice { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; border-radius: 4px; font-size: 14px; }
  a.button { display: inline-block; margin-top: 24px; background: #003399; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; }
</style>
</head>
<body>
  <h1>Set up Direct Debit — ${name}</h1>
  ${cancelled ? '<div class="notice">Authorization was cancelled or did not complete. You can try again below.</div>' : ""}
  <p>
    Branch charges ${name} a flat fee of ${currency} ${fee} per transaction,
    billed monthly via SEPA Direct Debit through GoCardless.
  </p>
  <p>
    To set this up, we need your authorization for GoCardless to collect that fee
    automatically. No payment is taken today — this only sets up permission for
    future monthly collections. Your payment is protected by the SEPA Direct Debit
    Guarantee, and you can cancel the mandate at any time directly with your bank.
  </p>
  <a class="button" href="/onboarding/${encodeURIComponent(client.client_id)}/start">Authorize with GoCardless</a>
</body>
</html>`;
}

function onboardingResultPage({ client, success, heading, message }) {
  const name = escapeHtml(client.name);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${success ? "Authorization received" : "Authorization incomplete"} — ${name}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 560px; margin: 80px auto; padding: 0 20px; color: #111827; text-align: center; }
  h1 { font-size: 22px; color: ${success ? "#16a34a" : "#dc2626"}; }
  p { color: #374151; line-height: 1.6; }
  a { color: #009ce3; }
</style>
</head>
<body>
  <h1>${escapeHtml(heading)}</h1>
  <p>${escapeHtml(message)}</p>
  ${!success ? `<p><a href="/onboarding/${encodeURIComponent(client.client_id)}">Try again</a></p>` : ""}
</body>
</html>`;
}

module.exports = { onboardingPage, onboardingResultPage };
