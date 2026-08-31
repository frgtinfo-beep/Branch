const { PORTAL_BRAND_HEAD, portalNav } = require("./brandHead");

function availabilityPage({ name, role }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Beschikbaarheid — Branch Team Tool</title>
${PORTAL_BRAND_HEAD}
<style>
  .month-nav { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
  .month-nav button { background: #fff; border: 1px solid #d1d5db; border-radius: 8px; padding: 6px 12px; cursor: pointer; font-family: inherit; }
  .month-nav span { font-weight: 700; min-width: 160px; text-align: center; }
  .grid-wrap { overflow-x: auto; border-radius: 12px; }
  table.availability { border-collapse: collapse; width: 100%; min-width: 900px; background: #fff; }
  table.availability th, table.availability td { border: 1px solid #e5e7eb; padding: 4px; text-align: center; font-size: 0.7rem; }
  table.availability th.person-col, table.availability td.person-col { text-align: left; padding: 6px 10px; font-size: 0.8rem; font-weight: 600; white-space: nowrap; position: sticky; left: 0; background: #fff; z-index: 2; }
  table.availability th { background: #f9fafb; color: var(--text-light); font-weight: 700; }
  th.weekend, td.weekend { background: #f3f4f6; }
  td.cell { cursor: pointer; width: 28px; height: 28px; }
  td.cell.readonly { cursor: default; }
  td.cell.vrij { background: #dcfce7; }
  td.cell.niet_vrij { background: #fee2e2; }
  td.summary-col { font-weight: 700; background: #f9fafb; }
  tr.summary-row td { font-weight: 700; background: #f9fafb; }
  .legend { display: flex; gap: 16px; margin-top: 14px; font-size: 0.8rem; color: var(--text-light); }
  .legend span { display: inline-flex; align-items: center; gap: 6px; }
  .swatch { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
</style>
</head>
<body>
${portalNav({ active: "availability", role, name })}
<main class="portal-main">
  <h1 class="portal-title">Beschikbaarheid</h1>
  <div class="month-nav">
    <button id="prev-month">←</button>
    <span id="month-label"></span>
    <button id="next-month">→</button>
  </div>
  <div class="grid-wrap">
    <table class="availability" id="availability-table"></table>
  </div>
  <div class="legend">
    <span><span class="swatch" style="background:#dcfce7;"></span> Vrij</span>
    <span><span class="swatch" style="background:#fee2e2;"></span> Niet vrij</span>
    <span><span class="swatch" style="background:#f3f4f6;"></span> Weekend</span>
  </div>
</main>

<script>
  const ROLE = ${JSON.stringify(role)};
  let myId = null;
  let current = new Date();
  current.setDate(1);

  async function fetchJson(url, opts) {
    const res = await fetch(url, opts);
    if (res.status === 401) { window.location.href = "/portal/login"; throw new Error("unauthenticated"); }
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || ("HTTP " + res.status)); }
    return res.json();
  }

  function escapeHtmlClient(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  const MONTH_NAMES = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];

  function isWeekend(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDay();
    return day === 0 || day === 6;
  }

  async function loadGrid() {
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    document.getElementById("month-label").textContent = MONTH_NAMES[month - 1] + " " + year;

    const data = await fetchJson("/api/portal/availability?year=" + year + "&month=" + month);
    const table = document.getElementById("availability-table");

    let html = "<thead><tr><th class=\\"person-col\\">Teamlid</th>";
    data.days.forEach((d) => {
      const dayNum = Number(d.slice(-2));
      html += "<th" + (isWeekend(d) ? ' class="weekend"' : "") + ">" + dayNum + "</th>";
    });
    html += '<th class="summary-col">Dagen vrij</th></tr></thead><tbody>';

    data.people.forEach((person) => {
      const canEdit = ROLE === "admin" || person.id === myId;
      html += '<tr><td class="person-col">' + escapeHtmlClient(person.name) + "</td>";
      data.days.forEach((d) => {
        const entry = (data.entries[person.id] || {})[d];
        const status = entry ? entry.status : "";
        const weekendClass = isWeekend(d) ? " weekend" : "";
        const cellClass = "cell" + (status ? " " + status : "") + weekendClass + (canEdit ? "" : " readonly");
        html += '<td class="' + cellClass + '" data-person="' + person.id + '" data-date="' + d + '"' + (entry && entry.reason ? ' title="' + escapeHtmlClient(entry.reason) + '"' : "") + "></td>";
      });
      html += '<td class="summary-col">' + (data.personSummary[person.id] || 0) + "</td></tr>";
    });

    html += '<tr class="summary-row"><td class="person-col">Aantal beschikbaar</td>';
    data.days.forEach((d) => {
      html += "<td" + (isWeekend(d) ? ' class="weekend"' : "") + ">" + (data.dailySummary[d] || 0) + "</td>";
    });
    html += "<td></td></tr>";
    html += "</tbody>";

    table.innerHTML = html;

    table.querySelectorAll("td.cell:not(.readonly)").forEach((cell) => {
      cell.addEventListener("click", async () => {
        const currentStatus = cell.classList.contains("vrij") ? "vrij" : cell.classList.contains("niet_vrij") ? "niet_vrij" : "";
        let nextStatus;
        let reason = null;
        if (currentStatus === "") {
          nextStatus = "vrij";
        } else if (currentStatus === "vrij") {
          nextStatus = "niet_vrij";
          reason = window.prompt("Reden (optioneel):", "") || null;
        } else {
          nextStatus = "vrij";
        }
        await fetchJson("/api/portal/availability/" + cell.dataset.person + "/" + cell.dataset.date, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus, reason }),
        });
        loadGrid();
      });
    });
  }

  document.getElementById("prev-month").addEventListener("click", () => { current.setMonth(current.getMonth() - 1); loadGrid(); });
  document.getElementById("next-month").addEventListener("click", () => { current.setMonth(current.getMonth() + 1); loadGrid(); });

  (async function init() {
    const me = await fetchJson("/portal/me");
    myId = me.id;
    loadGrid();
  })();
</script>
</body>
</html>`;
}

module.exports = { availabilityPage };
