const { PORTAL_BRAND_HEAD, portalNav } = require("./brandHead");

function reportsPage({ name, role }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rapportages — Branch Team Tool</title>
${PORTAL_BRAND_HEAD}
<style>
  .filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
  .filters select, .filters input { padding: 8px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-family: inherit; font-size: 0.85rem; }
  .range-label { font-size: 0.8rem; color: var(--text-light); margin-bottom: 16px; }
  table.report-table { width: 100%; border-collapse: collapse; }
  table.report-table th, table.report-table td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 0.85rem; }
  table.report-table th { color: var(--text-light); text-transform: uppercase; font-size: 0.7rem; }
  table.report-table td.hours { text-align: right; font-weight: 700; }
</style>
</head>
<body>
${portalNav({ active: "reports", role, name })}
<main class="portal-main">
  <h1 class="portal-title">Rapportages</h1>
  <div class="filters">
    <select id="period">
      <option value="week">Week</option>
      <option value="month" selected>Maand</option>
    </select>
    <input type="date" id="date">
    <select id="company-filter"><option value="">Alle klanten</option></select>
    <select id="person-filter" style="display:none;"><option value="">Alle teamleden</option></select>
    <button class="portal-btn" id="run-btn">Genereer</button>
  </div>
  <div class="range-label" id="range-label"></div>
  <div class="portal-card">
    <table class="report-table">
      <thead><tr><th>Teamlid</th><th style="text-align:right;">Uren</th></tr></thead>
      <tbody id="report-body"></tbody>
    </table>
  </div>
</main>

<script>
  const ROLE = ${JSON.stringify(role)};

  async function fetchJson(url) {
    const res = await fetch(url);
    if (res.status === 401) { window.location.href = "/portal/login"; throw new Error("unauthenticated"); }
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || ("HTTP " + res.status)); }
    return res.json();
  }
  function escapeHtmlClient(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  if (ROLE === "admin") {
    document.getElementById("person-filter").style.display = "inline-block";
    fetchJson("/api/portal/users/active").then((users) => {
      const select = document.getElementById("person-filter");
      users.forEach((u) => { select.innerHTML += '<option value="' + u.id + '">' + escapeHtmlClient(u.name) + "</option>"; });
    });
  }
  fetchJson("/api/portal/company-profiles").then((profiles) => {
    const select = document.getElementById("company-filter");
    profiles.forEach((p) => { select.innerHTML += '<option value="' + p.id + '">' + escapeHtmlClient(p.name) + "</option>"; });
  });

  async function runReport() {
    const params = new URLSearchParams();
    params.set("period", document.getElementById("period").value);
    const date = document.getElementById("date").value;
    if (date) params.set("date", date);
    const companyProfileId = document.getElementById("company-filter").value;
    if (companyProfileId) params.set("companyProfileId", companyProfileId);
    const personId = document.getElementById("person-filter").value;
    if (personId) params.set("personId", personId);

    const data = await fetchJson("/api/portal/reports/hours?" + params.toString());
    document.getElementById("range-label").textContent = "Periode: " + data.from + " t/m " + data.to;
    document.getElementById("report-body").innerHTML = data.rows.map((r) =>
      "<tr><td>" + escapeHtmlClient(r.name) + '</td><td class="hours">' + r.totalHours + "u</td></tr>"
    ).join("") || '<tr><td colspan="2">Geen registraties in deze periode.</td></tr>';
  }

  document.getElementById("run-btn").addEventListener("click", runReport);
  runReport();
</script>
</body>
</html>`;
}

module.exports = { reportsPage };
