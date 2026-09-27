const { PORTAL_BRAND_HEAD, PORTAL_SCRIPT, portalNav } = require("./brandHead");

function reportsPage({ name, role }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rapportages — Branch Team Tool</title>
${PORTAL_BRAND_HEAD}
<style>
  .range-label { font-size: 0.9rem; color: var(--text-light); margin: 0 0 12px; }
  .range-label strong { color: var(--ink); }
  table.data td.hours { font-weight: 700; }
  .report-card { padding: 8px 20px 12px; }
</style>
</head>
<body>
${portalNav({ active: "reports", role, name })}
<main class="portal-main">
  <div class="page-head"><h1>Rapportages</h1></div>
  <div class="toolbar">
    <label class="field"><span>Periode</span>
      <select id="period">
        <option value="week">Week</option>
        <option value="month" selected>Maand</option>
      </select>
    </label>
    <label class="field"><span>Peildatum</span><input type="date" id="date"></label>
    <label class="field"><span>Klant</span><select id="company-filter"><option value="">Alle klanten</option></select></label>
    ${role === "admin" ? '<label class="field"><span>Teamlid</span><select id="person-filter"><option value="">Alle teamleden</option></select></label>' : ""}
  </div>
  <p class="range-label" id="range-label" aria-live="polite"></p>
  <div class="portal-card report-card table-wrap">
    <table class="data">
      <thead><tr><th scope="col">Teamlid</th><th scope="col" class="right">Uren</th></tr></thead>
      <tbody id="report-body"><tr><td colspan="2" class="muted">Laden…</td></tr></tbody>
      <tfoot id="report-foot"></tfoot>
    </table>
  </div>
</main>

${PORTAL_SCRIPT}
<script>
  const IS_ADMIN = ${JSON.stringify(role === "admin")};
  const personFilter = document.getElementById("person-filter");

  document.getElementById("date").value = todayIso();

  if (IS_ADMIN && personFilter) {
    fetchJson("/api/portal/users/active").then((users) => {
      personFilter.insertAdjacentHTML("beforeend", users.map((u) => '<option value="' + u.id + '">' + escapeHtmlClient(u.name) + "</option>").join(""));
    });
  }
  fetchJson("/api/portal/company-profiles").then((profiles) => {
    document.getElementById("company-filter").insertAdjacentHTML("beforeend", profiles.map((p) => '<option value="' + p.id + '">' + escapeHtmlClient(p.name) + "</option>").join(""));
  });

  let requestId = 0;
  async function runReport() {
    const params = new URLSearchParams();
    params.set("period", document.getElementById("period").value);
    const date = document.getElementById("date").value;
    if (date) params.set("date", date);
    const companyProfileId = document.getElementById("company-filter").value;
    if (companyProfileId) params.set("companyProfileId", companyProfileId);
    const personId = personFilter ? personFilter.value : "";
    if (personId) params.set("personId", personId);

    const thisRequest = ++requestId;
    const data = await fetchJson("/api/portal/reports/hours?" + params.toString());
    if (thisRequest !== requestId) return; // a newer filter change already won

    document.getElementById("range-label").innerHTML = "Periode: <strong>" + formatDate(data.from) + " – " + formatDate(data.to) + "</strong>";
    const total = data.rows.reduce((sum, r) => sum + Number(r.totalHours || 0), 0);
    document.getElementById("report-body").innerHTML = data.rows.map((r) =>
      "<tr><td>" + escapeHtmlClient(r.name) + '</td><td class="hours right num">' + formatHours(r.totalHours) + "</td></tr>"
    ).join("") || '<tr><td colspan="2" class="muted">Geen uren gelogd in deze periode.</td></tr>';
    document.getElementById("report-foot").innerHTML = data.rows.length > 1
      ? '<tr><td>Totaal</td><td class="right num">' + formatHours(Math.round(total * 100) / 100) + "</td></tr>"
      : "";
  }

  ["period", "date", "company-filter", "person-filter"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", runReport);
  });
  runReport();
</script>
</body>
</html>`;
}

module.exports = { reportsPage };
