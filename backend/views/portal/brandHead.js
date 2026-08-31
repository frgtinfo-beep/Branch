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
  body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--background); color: var(--text-dark); }
  a { color: var(--branch-blue); }
  .glass { background: rgba(255,255,255,0.85); backdrop-filter: blur(28px) saturate(180%); -webkit-backdrop-filter: blur(28px) saturate(180%); border: 1px solid rgba(255,255,255,0.75); box-shadow: 0 8px 32px rgba(3,47,138,0.08); }
  .portal-nav { position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.85); backdrop-filter: blur(28px) saturate(180%); -webkit-backdrop-filter: blur(28px) saturate(180%); border-bottom: 1px solid rgba(255,255,255,0.65); box-shadow: 0 8px 32px rgba(3,47,138,0.08); }
  .portal-nav-inner { max-width: 1200px; margin: 0 auto; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .portal-logo { font-weight: 900; font-size: 1.3rem; letter-spacing: -0.02em; text-decoration: none; background: linear-gradient(90deg, #032F8A, #0BDDFF, #14B8E6, #78DB55); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; white-space: nowrap; }
  .portal-links { display: flex; gap: 4px; flex-wrap: wrap; }
  .portal-links a { text-decoration: none; color: var(--text-light); font-weight: 600; font-size: 0.9rem; padding: 8px 12px; border-radius: 8px; transition: background 0.15s ease, color 0.15s ease; }
  .portal-links a:hover { background: rgba(11,109,255,0.08); color: var(--branch-blue-dark); }
  .portal-links a[aria-current="page"] { color: var(--branch-blue-dark); background: rgba(11,109,255,0.12); }
  .portal-user { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--text-light); }
  .portal-logout { background: none; border: 1px solid #d1d5db; border-radius: 8px; padding: 6px 12px; font-size: 0.8rem; font-weight: 600; color: var(--text-dark); cursor: pointer; font-family: inherit; }
  .portal-logout:hover { background: #f3f4f6; }
  main.portal-main { max-width: 1200px; margin: 0 auto; padding: 28px 20px 60px; }
  h1.portal-title { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.01em; margin: 0 0 20px; color: var(--ink); }
  .portal-card { border-radius: 14px; padding: 20px; background: rgba(255,255,255,0.85); backdrop-filter: blur(28px) saturate(180%); -webkit-backdrop-filter: blur(28px) saturate(180%); border: 1px solid rgba(255,255,255,0.75); box-shadow: 0 8px 32px rgba(3,47,138,0.06); }
  .portal-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--branch-blue-dark); color: #fff; border: none; text-decoration: none; font-weight: 700; font-size: 0.85rem; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-family: inherit; transition: background 0.15s ease; }
  .portal-btn:hover { background: var(--branch-blue); }
  .portal-btn.secondary { background: #fff; color: var(--branch-blue-dark); border: 1px solid #d1d5db; }
  .portal-btn.secondary:hover { background: #f3f4f6; }
  .portal-btn.danger { background: var(--danger); }
  .portal-btn.danger:hover { background: #b91c1c; }
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
