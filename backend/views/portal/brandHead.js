// Shared chrome for the team portal: brand tokens, form controls, modals,
// toasts, and the small client helpers every portal page uses. The portal is a
// daily work tool, so it stays calm: solid surfaces, one accent, no glass.

const { escapeHtml } = require("../../utils/html");

const PORTAL_BRAND_HEAD = `
<link rel="icon" href="/images/Ontwerp zonder titel-3.png" type="image/x-icon">
<script>
  // Set the theme before first paint so dark mode never flashes light.
  (function () {
    var theme = null;
    try { theme = localStorage.getItem("portal-theme"); } catch (e) {}
    if (theme !== "light" && theme !== "dark") theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
  })();
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  :root {
    --branch-blue-dark: #032F8A;
    --branch-blue-darker: #02226A;
    --branch-blue: #0B6DFF;
    --branch-cyan: #14B8E6;
    --branch-green: #78DB55;
    --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    --radius: 10px;
    color-scheme: light;
    --background: #F4F7FB;
    --surface: #FFFFFF;
    --surface-muted: #F8FAFC;
    --surface-hover: #F1F5F9;
    --surface-sunken: #EAEFF6;
    --chip: #EEF2F7;
    --hairline: #F1F5F9;
    --border: #E3E8EF;
    --border-strong: #CBD5E1;
    --ink: #05070F;
    --text-dark: #111827;
    --text-2: #374151;
    --text-light: #5B6472;
    --primary: #032F8A;
    --primary-hover: #02226A;
    --link: #032F8A;
    --focus: #0B6DFF;
    --accent-soft: rgba(11,109,255,0.1);
    --accent-text: #032F8A;
    --danger: #B91C1C;
    --danger-solid: #B91C1C;
    --danger-bg: #FEE2E2;
    --danger-text: #991B1B;
    --danger-border: #FCA5A5;
    --warning-bg: #FEF3C7;
    --warning-text: #92400E;
    --success: #15803D;
    --success-solid: #15803D;
    --success-bg: #DCFCE7;
    --shadow: rgba(5,7,15,0.06);
    --shadow-strong: rgba(5,7,15,0.35);
    --backdrop: rgba(5,7,15,0.45);
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --background: #0A1020;
    --surface: #111A2E;
    --surface-muted: #0E1628;
    --surface-hover: #1A2640;
    --surface-sunken: #0C1424;
    --chip: #1C2842;
    --hairline: #1A2640;
    --border: #22304C;
    --border-strong: #34466B;
    --ink: #F3F6FB;
    --text-dark: #DDE4EF;
    --text-2: #C1CAD8;
    --text-light: #93A0B6;
    --primary: #2F6FEB;
    --primary-hover: #4A83F0;
    --link: #8DB4FF;
    --focus: #8DB4FF;
    --accent-soft: rgba(90,150,255,0.16);
    --accent-text: #A9C6FF;
    --danger: #F87171;
    --danger-solid: #DC2626;
    --danger-bg: #3A1518;
    --danger-text: #FCA5A5;
    --danger-border: #7F1D1D;
    --warning-bg: #3A2C0B;
    --warning-text: #FCD34D;
    --success: #4ADE80;
    --success-solid: #15803D;
    --success-bg: #0F2E1C;
    --shadow: rgba(0,0,0,0.3);
    --shadow-strong: rgba(0,0,0,0.6);
    --backdrop: rgba(0,0,0,0.6);
  }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--text-dark); background: var(--background); line-height: 1.5; -webkit-font-smoothing: antialiased; }
  ::selection { background: var(--branch-green); color: var(--ink); }
  a { color: var(--link); text-underline-offset: 3px; }
  :focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
  .num { font-variant-numeric: tabular-nums; }

  /* Navigation */
  .portal-nav { position: sticky; top: 0; z-index: 50; background: var(--surface); border-bottom: 1px solid var(--border); }
  .portal-nav-inner { max-width: 1200px; margin: 0 auto; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .portal-logo { font-weight: 900; font-size: 1.3rem; letter-spacing: -0.02em; text-decoration: none; color: var(--ink); white-space: nowrap; }
  .portal-logo span { color: var(--branch-cyan); }
  .portal-links { display: flex; gap: 2px; flex-wrap: wrap; }
  .portal-links a { position: relative; text-decoration: none; color: var(--text-light); font-weight: 600; font-size: 0.9rem; padding: 8px 12px; border-radius: 8px; transition: background-color 150ms ease, color 150ms ease; }
  .portal-links a:hover { background: var(--chip); color: var(--ink); }
  .portal-links a[aria-current="page"] { color: var(--ink); }
  .portal-links a[aria-current="page"]::after { content: ''; position: absolute; left: 12px; right: 12px; bottom: -11px; height: 2px; background: var(--branch-green); }
  .portal-user { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: var(--text-light); }
  .theme-toggle svg { width: 16px; height: 16px; }
  .theme-toggle .icon-sun { display: none; }
  :root[data-theme="dark"] .theme-toggle .icon-sun { display: block; }
  :root[data-theme="dark"] .theme-toggle .icon-moon { display: none; }
  .portal-avatar { width: 28px; height: 28px; border-radius: 50%; flex: none; display: inline-flex; align-items: center; justify-content: center; background: var(--primary); color: #fff; font-size: 0.75rem; font-weight: 700; }

  /* Page layout */
  main.portal-main { max-width: 1200px; margin: 0 auto; padding: 32px 20px 72px; }
  .page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px 20px; flex-wrap: wrap; margin-bottom: 24px; }
  .page-head h1, h1.portal-title { font-size: 1.65rem; font-weight: 800; letter-spacing: -0.02em; margin: 0; color: var(--ink); }
  h2.section-title { font-size: 1rem; font-weight: 700; color: var(--ink); margin: 0 0 14px; }
  .portal-card { border-radius: var(--radius); padding: 20px; background: var(--surface); border: 1px solid var(--border); box-shadow: 0 1px 2px var(--shadow); }
  a.portal-card { transition: border-color 150ms ease, box-shadow 150ms ease; }
  a.portal-card:hover { border-color: var(--border-strong); box-shadow: 0 6px 20px -8px var(--shadow-strong); }
  .muted { color: var(--text-light); font-size: 0.875rem; }
  .empty { border: 1px dashed var(--border-strong); border-radius: var(--radius); padding: 22px 16px; text-align: center; color: var(--text-light); font-size: 0.875rem; }

  /* Buttons */
  .portal-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 38px; background: var(--primary); color: #fff; border: 1px solid transparent; text-decoration: none; font-weight: 700; font-size: 0.875rem; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-family: inherit; white-space: nowrap; transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, opacity 150ms ease, transform 120ms var(--ease-out); -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  .portal-btn:hover { background: var(--primary-hover); }
  .portal-btn:active { transform: scale(0.97); }
  .portal-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  .portal-btn[aria-busy="true"] { cursor: progress; }
  .portal-btn.secondary { background: var(--surface); color: var(--ink); border-color: var(--border-strong); }
  .portal-btn.secondary:hover { background: var(--surface-hover); }
  .portal-btn.danger { background: var(--danger-solid); }
  .portal-btn.danger:hover { background: var(--danger-solid); filter: brightness(0.9); }
  .portal-btn.ghost-danger { background: transparent; color: var(--danger); border-color: transparent; }
  .portal-btn.ghost-danger:hover { background: var(--danger-bg); }
  .portal-btn.small { min-height: 30px; padding: 4px 10px; font-size: 0.8rem; }
  .icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--ink); cursor: pointer; font: inherit; font-size: 0.9rem; transition: background-color 150ms ease; }
  .icon-btn:hover { background: var(--surface-hover); }
  .icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Form controls */
  /* :where() keeps these at single-class specificity so page styles can override them */
  .control, .portal-main :where(input:not([type=checkbox], [type=file], [type=hidden]), select, textarea), .modal :where(input:not([type=checkbox], [type=file], [type=hidden]), select, textarea) {
    width: 100%; padding: 9px 11px; min-height: 40px; border: 1px solid var(--border-strong); border-radius: 8px; background: var(--surface); color: var(--ink); font: inherit; font-size: 0.9rem; transition: border-color 150ms ease, box-shadow 150ms ease;
  }
  :where(.portal-main, .modal) :where(input:not([type=date]), select) { height: 40px; }
  :where(.portal-main, .modal) input[type=date] { height: 40px; padding-top: 0; padding-bottom: 0; }
  .portal-main :is(input, select, textarea):focus, .modal :is(input, select, textarea):focus { outline: none; border-color: var(--focus); box-shadow: 0 0 0 3px var(--accent-soft); }
  .portal-main :is(input, select, textarea):disabled, .modal :is(input, select, textarea):disabled { background: var(--surface-muted); color: var(--text-light); cursor: not-allowed; }
  textarea { resize: vertical; min-height: 84px; }
  .field { display: flex; flex-direction: column; gap: 5px; }
  .field > span, .field-label { font-size: 0.8rem; font-weight: 600; color: var(--text-2); }
  .toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 20px; }
  .toolbar .field { min-width: 170px; }
  .toolbar .field select, .toolbar .field input { width: auto; min-width: 170px; }

  /* Badges */
  .badge { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; padding: 2px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; line-height: 1.5; background: var(--chip); color: var(--text-2); }
  .badge-hoog { background: var(--danger-bg); color: var(--danger-text); }
  .badge-gemiddeld { background: var(--warning-bg); color: var(--warning-text); }
  .badge-laag { background: var(--chip); color: var(--text-2); }
  .badge-overdue { background: var(--danger-solid); color: #fff; }
  .badge-blue { background: var(--accent-soft); color: var(--accent-text); }

  /* Tables */
  table.data { width: 100%; border-collapse: collapse; }
  table.data th, table.data td { text-align: left; padding: 11px 10px; border-bottom: 1px solid var(--border); font-size: 0.875rem; vertical-align: middle; }
  table.data th { color: var(--text-light); font-size: 0.75rem; font-weight: 700; }
  table.data td.right, table.data th.right { text-align: right; }
  table.data tfoot td { font-weight: 800; color: var(--ink); border-bottom: 0; }
  .table-wrap { overflow-x: auto; }

  /* Modal */
  .modal-backdrop { position: fixed; inset: 0; background: var(--backdrop); display: none; align-items: center; justify-content: center; padding: 20px; z-index: 100; }
  .modal-backdrop.open { display: flex; animation: portal-fade 160ms ease-out; }
  .modal { background: var(--surface); border-radius: 14px; padding: 24px; max-width: 480px; width: 100%; max-height: calc(100vh - 40px); overflow-y: auto; box-shadow: 0 24px 60px -12px var(--shadow-strong); border: 1px solid var(--border); animation: portal-pop 200ms var(--ease-out); }
  .modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
  .modal-header h2 { margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--ink); letter-spacing: -0.01em; }
  .modal form { display: flex; flex-direction: column; gap: 14px; margin-top: 12px; }
  .modal-actions { display: flex; gap: 10px; margin-top: 8px; justify-content: flex-end; flex-wrap: wrap; }
  .form-error { color: var(--danger); font-size: 0.85rem; font-weight: 500; }
  .form-error:empty { display: none; }

  /* Toast */
  .toast-region { position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 200; display: flex; flex-direction: column; gap: 8px; align-items: center; pointer-events: none; width: max-content; max-width: calc(100vw - 32px); }
  .toast { pointer-events: auto; background: var(--ink); color: var(--background); padding: 10px 16px; border-radius: 10px; font-size: 0.875rem; font-weight: 500; box-shadow: 0 12px 32px -8px var(--shadow-strong); animation: portal-toast 220ms var(--ease-out); }
  .toast.error { background: var(--danger-solid); color: #fff; }
  .toast.success { background: var(--success-solid); color: #fff; }

  @keyframes portal-fade { from { opacity: 0; } }
  @keyframes portal-pop { from { opacity: 0; transform: scale(0.97) translateY(4px); } }
  @keyframes portal-toast { from { opacity: 0; transform: translateY(8px); } }
  @media (prefers-reduced-motion: reduce) {
    .modal-backdrop.open, .modal, .toast { animation-duration: 1ms; }
    .portal-btn:active { transform: none; }
  }
  @media (max-width: 720px) {
    .portal-nav-inner { padding: 10px 16px; }
    .portal-links { order: 3; width: 100%; overflow-x: auto; flex-wrap: nowrap; margin: 0 -8px; }
    .portal-links a[aria-current="page"]::after { bottom: 2px; }
    .portal-user > .portal-user-name { display: none; }
    main.portal-main { padding: 24px 16px 64px; }
    .toolbar .field, .toolbar .field select, .toolbar .field input { width: 100%; min-width: 0; }
    .toolbar .field { flex: 1 1 140px; }
  }
</style>`;

// Client helpers shared by every portal page. Unhandled promise rejections
// surface as an error toast, so a failed save never fails silently.
const PORTAL_SCRIPT = `
<div class="toast-region" id="toast-region" role="status" aria-live="polite"></div>
<script>
  function escapeHtmlClient(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function fetchJson(url, opts) {
    const res = await fetch(url, opts);
    if (res.status === 401) { window.location.href = "/portal/login"; throw new Error("unauthenticated"); }
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || ("Serverfout (" + res.status + ")")); }
    return res.status === 204 ? null : res.json();
  }

  function toast(message, tone) {
    const region = document.getElementById("toast-region");
    const el = document.createElement("div");
    el.className = "toast" + (tone ? " " + tone : "");
    el.textContent = message;
    region.appendChild(el);
    setTimeout(() => el.remove(), tone === "error" ? 6000 : 2800);
  }

  function reportError(err) {
    if (err && err.message === "unauthenticated") return;
    const offline = err instanceof TypeError;
    toast(offline ? "Geen verbinding met de server. Probeer het opnieuw." : (err && err.message) || "Er ging iets mis.", "error");
  }
  window.addEventListener("unhandledrejection", (event) => reportError(event.reason));

  // Disables the button while the action runs so a slow save can't be sent twice.
  async function withBusy(button, action) {
    if (!button || button.disabled) return;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    try { return await action(); } finally { button.disabled = false; button.removeAttribute("aria-busy"); }
  }

  const MONTHS_SHORT = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
  function formatDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    const thisYear = new Date().getFullYear();
    return d + " " + MONTHS_SHORT[m - 1] + (y !== thisYear ? " " + y : "");
  }
  function todayIso() {
    const now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  }
  function formatHours(hours) { return String(hours).replace(".", ",") + " u"; }

  const STATUS_LABELS = { todo: "To do", bezig: "Bezig", klaar: "Klaar" };
  const PRIORITY_LABELS = { hoog: "Hoog", gemiddeld: "Gemiddeld", laag: "Laag" };
  const ROLE_LABELS = { admin: "Admin", bestuur: "Bestuur", teamlid: "Teamlid" };
  const COLLABORATION_LABELS = { prospect: "Prospect", in_gesprek: "In gesprek", actieve_klant: "Actieve klant", afgerond: "Afgerond" };

  // Modals: focus moves in on open, Escape and backdrop click close, Tab stays inside,
  // and focus returns to whatever opened it.
  let modalReturnFocus = null;
  const FOCUSABLE = 'button:not(:disabled):not([hidden]), input:not(:disabled):not([type=hidden]), select:not(:disabled), textarea:not(:disabled), a[href]';
  function visibleFocusables(root) {
    return Array.from(root.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);
  }
  function openModal(backdrop) {
    modalReturnFocus = document.activeElement;
    backdrop.classList.add("open");
    const first = visibleFocusables(backdrop.querySelector(".modal")).find((el) => !el.classList.contains("modal-close")) ;
    if (first) first.focus();
  }
  function closeModal(backdrop) {
    backdrop.classList.remove("open");
    if (modalReturnFocus && document.contains(modalReturnFocus)) modalReturnFocus.focus();
  }
  document.addEventListener("keydown", (event) => {
    const open = document.querySelector(".modal-backdrop.open");
    if (!open) return;
    if (event.key === "Escape") { event.preventDefault(); closeModal(open); return; }
    if (event.key === "Tab") {
      const items = visibleFocusables(open);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener("mousedown", (event) => {
    if (event.target.classList && event.target.classList.contains("modal-backdrop")) closeModal(event.target);
  });
  document.addEventListener("click", (event) => {
    const closer = event.target.closest("[data-close-modal]");
    if (closer) closeModal(closer.closest(".modal-backdrop"));
  });
</script>`;

const NAV_ITEMS = [
  { href: "/portal", label: "Taken", key: "tasks" },
  { href: "/portal/calendar", label: "Kalender", key: "calendar" },
  { href: "/portal/availability", label: "Beschikbaarheid", key: "availability" },
  { href: "/portal/clients", label: "Klanten", key: "clients" },
  { href: "/portal/reports", label: "Rapportages", key: "reports" },
];

function initials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

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
<nav class="portal-nav" aria-label="Portal">
  <div class="portal-nav-inner">
    <a href="/portal" class="portal-logo" translate="no">Branch<span>.</span></a>
    <div class="portal-links">${links}${settingsLink}</div>
    <div class="portal-user">
      <span class="portal-avatar" aria-hidden="true">${escapeHtml(initials(name))}</span>
      <span class="portal-user-name">${escapeHtml(name)}</span>
      <button type="button" class="icon-btn theme-toggle" id="theme-toggle" aria-label="Donkere modus" aria-pressed="false" title="Donkere modus">
        <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
        <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      </button>
      <button type="button" class="portal-btn secondary small" id="portal-logout">Uitloggen</button>
    </div>
  </div>
</nav>
<script>
  (function () {
    const toggle = document.getElementById("theme-toggle");
    const sync = () => toggle.setAttribute("aria-pressed", String(document.documentElement.getAttribute("data-theme") === "dark"));
    sync();
    toggle.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("portal-theme", next); } catch (e) {}
      sync();
    });
  })();
  document.getElementById("portal-logout").addEventListener("click", async () => {
    try { await fetch("/portal/logout", { method: "POST" }); } finally { window.location.href = "/portal/login"; }
  });
</script>`;
}

module.exports = { PORTAL_BRAND_HEAD, PORTAL_SCRIPT, portalNav };
