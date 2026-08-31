// Minimal self-contained HTML — no template engine in this project, and the
// content here is small enough not to need one.

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]
  ));
}

// Shared brand chrome (fonts, tokens, nav, card shell) so the onboarding
// flow reads as part of branch.nu rather than a generic third-party page —
// deliberately hand-rolled rather than pulling in the full marketing site's
// Tailwind bundle/nav.js, since this page has one job and no language
// switcher/hamburger menu to run.
const BRAND_HEAD = `
<link rel="icon" href="/images/Ontwerp zonder titel-3.png" type="image/x-icon">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  :root {
    --branch-blue-dark: #032F8A;
    --branch-blue: #0B6DFF;
    --branch-cyan: #14B8E6;
    --branch-green: #78DB55;
    --background: #F7F7F7;
    --ink: #05070F;
    --text-dark: #111827;
    --text-light: #6B7280;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--background); color: var(--text-dark); }
  .brand-nav { position: fixed; top: 0; left: 0; width: 100%; z-index: 50; background: rgba(255,255,255,0.65); backdrop-filter: blur(28px) saturate(180%); -webkit-backdrop-filter: blur(28px) saturate(180%); border-bottom: 1px solid rgba(255,255,255,0.65); box-shadow: 0 8px 32px rgba(3,47,138,0.08); }
  .brand-nav-inner { max-width: 1400px; margin: 0 auto; padding: 16px 24px; }
  .brand-logo { font-weight: 900; font-size: 1.6rem; letter-spacing: -0.02em; text-decoration: none; background: linear-gradient(90deg, #032F8A, #0BDDFF, #14B8E6, #78DB55); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
  main { padding: 140px 20px 60px; }
  .card { max-width: 560px; margin: 0 auto; padding: 44px; border-radius: 16px; background: rgba(255,255,255,0.85); backdrop-filter: blur(28px) saturate(180%); -webkit-backdrop-filter: blur(28px) saturate(180%); border: 1px solid rgba(255,255,255,0.75); box-shadow: 0 8px 32px rgba(3,47,138,0.08); }
  h1 { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.01em; margin: 0 0 12px; color: var(--ink); }
  p { color: #374151; line-height: 1.7; }
  a { color: var(--branch-blue); }
</style>`;

function onboardingPage({ client, cancelled }) {
  const name = escapeHtml(client.name);
  const fee = escapeHtml(client.fee_amount.toFixed(2));
  const currency = escapeHtml(client.currency);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Set up payments — ${name} | Branch</title>
${BRAND_HEAD}
<style>
  .notice { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0 28px; border-radius: 8px; font-size: 14px; color: #78350f; }
  .btn { display: inline-block; margin-top: 8px; background: var(--branch-blue-dark); color: #fff; text-decoration: none; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; font-size: 0.95rem; padding: 16px 32px; box-shadow: 6px 6px 0 0 var(--ink); transition: all 0.2s ease; }
  .btn:hover { background: #fff; color: var(--branch-blue-dark); transform: translateY(-2px); box-shadow: 6px 6px 0 0 var(--branch-green); }
</style>
</head>
<body>
  <nav class="brand-nav"><div class="brand-nav-inner"><a href="/" class="brand-logo" translate="no">Branch</a></div></nav>
  <main>
    <div class="card">
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
      <a class="btn" href="/onboarding/${encodeURIComponent(client.client_id)}/start">Authorize with GoCardless</a>
    </div>
  </main>
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
<title>${success ? "Authorization received" : "Authorization incomplete"} — ${name} | Branch</title>
${BRAND_HEAD}
<style>
  main { padding-top: 140px; }
  .card { text-align: center; }
  h1 { color: ${success ? "#16a34a" : "#dc2626"}; }
</style>
</head>
<body>
  <nav class="brand-nav"><div class="brand-nav-inner"><a href="/" class="brand-logo" translate="no">Branch</a></div></nav>
  <main>
    <div class="card">
      <h1>${escapeHtml(heading)}</h1>
      <p>${escapeHtml(message)}</p>
      ${!success ? `<p><a href="/onboarding/${encodeURIComponent(client.client_id)}">Try again</a></p>` : ""}
    </div>
  </main>
</body>
</html>`;
}

module.exports = { onboardingPage, onboardingResultPage };
