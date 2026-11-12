const { PORTAL_BRAND_HEAD, PORTAL_SCRIPT, portalNav } = require("./brandHead");

// "Gratis website" sign-ups from the public site. Every team member can see them,
// call them, set a status and leave a note.
function registrationsPage({ name, role }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aanmeldingen — Branch Team Tool</title>
${PORTAL_BRAND_HEAD}
<style>
  .status-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px; }
  .status-tab { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 4px 12px; border-radius: 999px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--text-2); font: inherit; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  @media (hover: hover) and (pointer: fine) { .status-tab:hover { background: var(--surface-hover); } }
  .status-tab[aria-pressed="true"] { background: var(--primary); border-color: var(--primary); color: #fff; }
  .status-tab .count { font-variant-numeric: tabular-nums; opacity: 0.75; font-weight: 600; }

  .reg-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
  .reg-card { display: flex; flex-direction: column; gap: 14px; }
  .reg-card.is-new { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
  .reg-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .reg-head h2 { margin: 0; font-size: 1.05rem; font-weight: 800; color: var(--ink); letter-spacing: -0.01em; }
  .reg-head .muted { margin: 2px 0 0; }
  .reg-facts { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; margin: 0; font-size: 0.9rem; }
  .reg-facts dt { color: var(--text-light); }
  .reg-facts dd { margin: 0; color: var(--ink); font-weight: 600; overflow-wrap: anywhere; }
  .reg-facts a { color: var(--accent-text); }
  .reg-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .reg-edit { display: grid; gap: 10px; padding-top: 14px; border-top: 1px solid var(--border); }
  .reg-edit textarea { min-height: 64px; resize: vertical; }
  .reg-meta { font-size: 0.78rem; color: var(--text-light); margin: 0; }
  .mail-warn { color: var(--danger-text); background: var(--danger-bg); border-radius: 6px; padding: 6px 10px; font-size: 0.8rem; margin: 0; }
</style>
</head>
<body>
${portalNav({ active: "registrations", role, name })}
<main class="portal-main">
  <div class="page-head">
    <h1>Aanmeldingen gratis website</h1>
  </div>
  <div class="status-tabs" id="status-tabs" role="group" aria-label="Filter op status"></div>
  <div class="reg-list" id="reg-list" aria-busy="true"><p class="muted">Laden…</p></div>
</main>

${PORTAL_SCRIPT}
<script>
  const STATUS = [
    { key: "nieuw", label: "Nieuw", badge: "badge-blue" },
    { key: "gebeld", label: "Gebeld", badge: "badge-gemiddeld" },
    { key: "in_aanbouw", label: "Site in aanbouw", badge: "badge-gemiddeld" },
    { key: "live", label: "Live", badge: "badge-success" },
    { key: "geen_interesse", label: "Geen interesse", badge: "badge-laag" },
  ];
  const STATUS_BY_KEY = Object.fromEntries(STATUS.map((s) => [s.key, s]));
  let activeStatus = "";

  function formatDateTime(iso) {
    const d = new Date(iso);
    return formatDate(d.toISOString()) + ", " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function renderTabs(counts) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const tabs = [{ key: "", label: "Alle", n: total }].concat(STATUS.map((s) => ({ key: s.key, label: s.label, n: counts[s.key] || 0 })));
    document.getElementById("status-tabs").innerHTML = tabs.map((t) =>
      '<button type="button" class="status-tab" data-status="' + t.key + '" aria-pressed="' + (t.key === activeStatus) + '">' +
      escapeHtmlClient(t.label) + ' <span class="count">' + t.n + "</span></button>"
    ).join("");
  }

  function card(r) {
    const status = STATUS_BY_KEY[r.status] || STATUS[0];
    const tel = r.phone.replace(/[^0-9+]/g, "");
    const wa = tel.replace(/^\\+/, "").replace(/^0/, "31");
    const mailIssues = [];
    if (r.emails && r.emails.confirmation === false) mailIssues.push("bevestigingsmail aan klant");
    if (r.emails && r.emails.team === false) mailIssues.push("teammelding");
    return '<article class="portal-card reg-card' + (r.status === "nieuw" ? " is-new" : "") + '" data-id="' + r.id + '">' +
      '<div class="reg-head"><div><h2>' + escapeHtmlClient(r.companyName) + '</h2><p class="muted">' + escapeHtmlClient(r.sector) + " · " + formatDateTime(r.createdAt) + "</p></div>" +
      '<span class="badge ' + status.badge + '">' + escapeHtmlClient(status.label) + "</span></div>" +
      '<dl class="reg-facts">' +
        (r.contactName ? "<dt>Naam</dt><dd>" + escapeHtmlClient(r.contactName) + "</dd>" : "") +
        "<dt>Telefoon</dt><dd><a class=\\"num\\" href=\\"tel:" + escapeHtmlClient(tel) + "\\">" + escapeHtmlClient(r.phone) + "</a></dd>" +
        "<dt>E-mail</dt><dd><a href=\\"mailto:" + escapeHtmlClient(r.email) + "\\">" + escapeHtmlClient(r.email) + "</a></dd>" +
        "<dt>KvK</dt><dd>" + escapeHtmlClient(r.kvk) + "</dd>" +
        "<dt>Klanten p/m</dt><dd class=\\"num\\">" + escapeHtmlClient(r.clientsPerMonth) + "</dd>" +
      "</dl>" +
      (mailIssues.length ? '<p class="mail-warn">Niet verstuurd: ' + mailIssues.join(" en ") + ".</p>" : "") +
      '<div class="reg-actions">' +
        '<a class="portal-btn small" href="tel:' + escapeHtmlClient(tel) + '">Bellen</a>' +
        '<a class="portal-btn secondary small" href="https://wa.me/' + escapeHtmlClient(wa) + '" target="_blank" rel="noopener">WhatsApp</a>' +
        '<a class="portal-btn secondary small" href="mailto:' + escapeHtmlClient(r.email) + '">Mailen</a>' +
      "</div>" +
      '<div class="reg-edit">' +
        '<label class="field"><span>Status</span><select data-field="status">' +
          STATUS.map((s) => '<option value="' + s.key + '"' + (s.key === r.status ? " selected" : "") + ">" + escapeHtmlClient(s.label) + "</option>").join("") +
        "</select></label>" +
        '<label class="field"><span>Notitie</span><textarea data-field="note" placeholder="Bijv. teruggebeld, wil starten in januari">' + escapeHtmlClient(r.note) + "</textarea></label>" +
        (r.updatedBy ? '<p class="reg-meta">Laatst bijgewerkt door ' + escapeHtmlClient(r.updatedBy) + "</p>" : "") +
      "</div>" +
    "</article>";
  }

  async function load() {
    const list = document.getElementById("reg-list");
    const data = await fetchJson("/api/portal/registrations" + (activeStatus ? "?status=" + activeStatus : ""));
    renderTabs(data.counts);
    list.setAttribute("aria-busy", "false");
    list.innerHTML = data.registrations.map(card).join("") ||
      '<p class="empty" style="grid-column:1/-1;">' + (activeStatus ? "Geen aanmeldingen met deze status." : "Nog geen aanmeldingen. Ze verschijnen hier zodra iemand het formulier op de site invult.") + "</p>";
  }

  async function save(cardEl, field, value) {
    const id = cardEl.getAttribute("data-id");
    await fetchJson("/api/portal/registrations/" + id, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    toast(field === "status" ? "Status bijgewerkt" : "Notitie opgeslagen", "success");
  }

  document.getElementById("status-tabs").addEventListener("click", (e) => {
    const tab = e.target.closest(".status-tab");
    if (!tab) return;
    activeStatus = tab.getAttribute("data-status");
    load();
  });

  const listEl = document.getElementById("reg-list");
  listEl.addEventListener("change", async (e) => {
    const el = e.target;
    if (el.getAttribute("data-field") !== "status") return;
    await save(el.closest(".reg-card"), "status", el.value);
    load();
  });
  // Notes save when the field loses focus, only if they changed
  listEl.addEventListener("focusin", (e) => {
    if (e.target.getAttribute("data-field") === "note") e.target.dataset.before = e.target.value;
  });
  listEl.addEventListener("focusout", async (e) => {
    const el = e.target;
    if (el.getAttribute("data-field") !== "note" || el.value === el.dataset.before) return;
    await save(el.closest(".reg-card"), "note", el.value);
    el.dataset.before = el.value;
  });

  load();
</script>
</body>
</html>`;
}

module.exports = { registrationsPage };
