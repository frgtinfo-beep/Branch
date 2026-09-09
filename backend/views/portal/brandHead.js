// Shared brand chrome for the team portal — same tokens/fonts as the
// onboarding flow's BRAND_HEAD (backend/views/onboardingPage.js), so the
// portal reads as part of branch.nu, plus portal-specific nav chrome.

const { escapeHtml } = require("../../utils/html");

const PORTAL_BRAND_HEAD = `
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
    --danger: #dc2626;
    --danger-bg: #fee2e2;
    --warning: #f59e0b;
    --warning-bg: #fef3c7;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: var(--text-dark);
    background:
      radial-gradient(720px 420px at 8% -8%, rgba(11,109,255,0.10), transparent 60%),
      radial-gradient(640px 380px at 100% 0%, rgba(120,219,85,0.10), transparent 55%),
      var(--background);
    background-attachment: fixed;
  }
  a { color: var(--branch-blue); }
  .glass { background: rgba(255,255,255,0.85); backdrop-filter: blur(28px) saturate(180%); -webkit-backdrop-filter: blur(28px) saturate(180%); border: 1px solid rgba(255,255,255,0.75); box-shadow: 0 8px 32px rgba(3,47,138,0.08); }
  .portal-nav { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.85); backdrop-filter: blur(28px) saturate(180%); -webkit-backdrop-filter: blur(28px) saturate(180%); border-bottom: 1px solid rgba(255,255,255,0.65); box-shadow: 0 8px 32px rgba(3,47,138,0.08); }
  .portal-nav::after { content: ''; display: block; height: 2px; background: linear-gradient(90deg, #032F8A, #0BDDFF, #14B8E6, #78DB55); opacity: 0.7; }
  .portal-nav-inner { max-width: 1200px; margin: 0 auto; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .portal-logo { font-weight: 900; font-size: 1.3rem; letter-spacing: -0.02em; text-decoration: none; background: linear-gradient(90deg, #032F8A, #0BDDFF, #14B8E6, #78DB55); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; white-space: nowrap; }
  .portal-links { display: flex; gap: 4px; flex-wrap: wrap; }
  .portal-links a { text-decoration: none; color: var(--text-light); font-weight: 600; font-size: 0.9rem; padding: 8px 12px; border-radius: 8px; transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease; }
  .portal-links a:hover { background: rgba(11,109,255,0.08); color: var(--branch-blue-dark); transform: translateY(-1px); }
  .portal-links a[aria-current="page"] { color: #fff; background: linear-gradient(90deg, var(--branch-blue-dark), var(--branch-blue)); box-shadow: 0 4px 12px rgba(11,109,255,0.3); }
  .portal-user { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--text-light); }
  .portal-user > span { display: flex; align-items: center; gap: 8px; }
  .portal-user > span::before {
    content: '';
    width: 28px; height: 28px; border-radius: 50%; flex: none;
    background: linear-gradient(135deg, var(--branch-blue), var(--branch-green));
  }
  .portal-logout { background: none; border: 1px solid #d1d5db; border-radius: 8px; padding: 6px 12px; font-size: 0.8rem; font-weight: 600; color: var(--text-dark); cursor: pointer; font-family: inherit; transition: background 0.15s ease, border-color 0.15s ease; }
  .portal-logout:hover { background: #f3f4f6; border-color: #b8bfc9; }
  main.portal-main { max-width: 1200px; margin: 0 auto; padding: 28px 20px 60px; animation: portal-fade-in 0.35s ease both; }
  h1.portal-title { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.01em; margin: 0 0 20px; color: var(--ink); position: relative; padding-left: 14px; }
  h1.portal-title::before { content: ''; position: absolute; left: 0; top: 3px; bottom: 3px; width: 4px; border-radius: 4px; background: linear-gradient(180deg, var(--branch-blue), var(--branch-green)); }
  .portal-card { border-radius: 14px; padding: 20px; background: rgba(255,255,255,0.85); backdrop-filter: blur(28px) saturate(180%); -webkit-backdrop-filter: blur(28px) saturate(180%); border: 1px solid rgba(255,255,255,0.75); box-shadow: 0 8px 32px rgba(3,47,138,0.06); transition: box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease; }
  a.portal-card:hover { box-shadow: 0 14px 36px rgba(3,47,138,0.14); transform: translateY(-3px); border-color: rgba(11,109,255,0.35); }
  .portal-btn { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(115deg, var(--branch-blue-dark), var(--branch-blue)); color: #fff; border: none; text-decoration: none; font-weight: 700; font-size: 0.85rem; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-family: inherit; transition: filter 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease; box-shadow: 0 4px 14px rgba(11,109,255,0.25); }
  .portal-btn:hover { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 6px 18px rgba(11,109,255,0.32); }
  .portal-btn:active { transform: translateY(0); }
  .portal-btn.secondary { background: #fff; color: var(--branch-blue-dark); border: 1px solid #d1d5db; box-shadow: none; }
  .portal-btn.secondary:hover { background: #f3f4f6; filter: none; box-shadow: none; }
  .portal-btn.danger { background: linear-gradient(115deg, #b91c1c, var(--danger)); box-shadow: 0 4px 14px rgba(220,38,38,0.25); }
  .portal-btn.danger:hover { box-shadow: 0 6px 18px rgba(220,38,38,0.32); }
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 22px; }
  .stat-card { border-radius: 14px; padding: 16px 18px; background: rgba(255,255,255,0.85); backdrop-filter: blur(28px) saturate(180%); -webkit-backdrop-filter: blur(28px) saturate(180%); border: 1px solid rgba(255,255,255,0.75); box-shadow: 0 8px 32px rgba(3,47,138,0.06); border-top: 3px solid var(--branch-blue); }
  .stat-card .stat-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-light); margin: 0 0 6px; }
  .stat-card .stat-value { font-size: 1.6rem; font-weight: 800; color: var(--ink); margin: 0; letter-spacing: -0.01em; }
  @keyframes portal-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) {
    main.portal-main { animation: none; }
    a.portal-card:hover, .portal-btn:hover { transform: none; }
  }
  @media (max-width: 640px) {
    .portal-nav-inner { flex-direction: column; align-items: flex-start; }
    .portal-links { width: 100%; }
  }
</style>`;

const NAV_ITEMS = [
  { href: "/portal", label: "Taken", key: "tasks" },
  { href: "/portal/availability", label: "Beschikbaarheid", key: "availability" },
  { href: "/portal/clients", label: "Klanten", key: "clients" },
  { href: "/portal/reports", label: "Rapportages", key: "reports" },
];

// role/active are trusted server-side values (from req.session.portalUser and
// the calling route), name is a user-entered string and must be escaped.
function portalNav({ active, role, name }) {
  const links = NAV_ITEMS.map(
    (item) =>
      `<a href="${item.href}"${item.key === active ? ' aria-current="page"' : ""}>${item.label}</a>`,
  ).join("");
  const settingsLink =
    role === "admin"
      ? `<a href="/portal/settings"${active === "settings" ? ' aria-current="page"' : ""}>Instellingen</a>`
      : "";

  return `
<nav class="portal-nav">
  <div class="portal-nav-inner">
    <a href="/portal" class="portal-logo" translate="no">Branch</a>
    <div class="portal-links">${links}${settingsLink}</div>
    <div class="portal-user">
      <span>${escapeHtml(name)}</span>
      <button class="portal-logout" id="portal-logout">Uitloggen</button>
    </div>
  </div>
</nav>
<script>
  document.getElementById("portal-logout").addEventListener("click", async () => {
    await fetch("/portal/logout", { method: "POST" });
    window.location.href = "/portal/login";
  });
</script>`;
}

module.exports = { PORTAL_BRAND_HEAD, portalNav };
