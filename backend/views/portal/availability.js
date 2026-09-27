const { PORTAL_BRAND_HEAD, PORTAL_SCRIPT, portalNav } = require("./brandHead");

function availabilityPage({ name, role }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Beschikbaarheid — Branch Team Tool</title>
${PORTAL_BRAND_HEAD}
<style>
  .month-nav { display: flex; align-items: center; gap: 8px; }
  .month-nav .month-label { font-weight: 700; color: var(--ink); min-width: 150px; text-align: center; text-transform: capitalize; }
  .hint { margin: -8px 0 16px; }
  .grid-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
  table.availability { border-collapse: separate; border-spacing: 0; width: 100%; min-width: 960px; }
  table.availability th, table.availability td { border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 3px; text-align: center; font-size: 0.72rem; }
  table.availability th { background: var(--surface-muted); color: var(--text-light); font-weight: 700; padding: 6px 2px; }
  table.availability th .dow { display: block; font-weight: 500; font-size: 0.65rem; }
  table.availability .person-col { text-align: left; padding: 6px 12px; font-size: 0.85rem; font-weight: 600; color: var(--ink); white-space: nowrap; position: sticky; left: 0; background: var(--surface); z-index: 2; }
  table.availability thead .person-col { background: var(--surface-muted); }
  .weekend { background: var(--surface-sunken); }
  th.today { background: var(--primary); color: #fff; }
  th.today .dow { color: rgba(255,255,255,0.85); }
  td.today { box-shadow: inset 2px 0 0 var(--primary), inset -2px 0 0 var(--primary); }
  .day-btn { display: block; width: 100%; min-width: 24px; height: 28px; border: 0; border-radius: 5px; background: transparent; cursor: pointer; font: inherit; font-size: 0.8rem; font-weight: 700; transition: background-color 120ms ease; }
  .day-btn:hover { background: var(--surface-hover); }
  .day-btn.vrij { background: var(--success-bg); color: var(--success); }
  .day-btn.niet_vrij { background: var(--danger-bg); color: var(--danger); }
  .day-btn:disabled { cursor: default; }
  .day-btn:disabled:hover { background: transparent; }
  .day-btn.vrij:disabled:hover { background: var(--success-bg); }
  .day-btn.niet_vrij:disabled:hover { background: var(--danger-bg); }
  td.summary-col, th.summary-col { font-weight: 700; background: var(--surface-muted); color: var(--ink); min-width: 70px; }
  tr.summary-row td { font-weight: 700; background: var(--surface-muted); color: var(--ink); }
  .legend { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 14px; font-size: 0.82rem; color: var(--text-light); }
  .legend span { display: inline-flex; align-items: center; gap: 6px; }
  .swatch { width: 18px; height: 18px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; }
</style>
</head>
<body>
${portalNav({ active: "availability", role, name })}
<main class="portal-main">
  <div class="page-head">
    <h1>Beschikbaarheid</h1>
    <div class="month-nav">
      <button type="button" class="icon-btn" id="prev-month" aria-label="Vorige maand">←</button>
      <span class="month-label" id="month-label" aria-live="polite"></span>
      <button type="button" class="icon-btn" id="next-month" aria-label="Volgende maand">→</button>
      <button type="button" class="portal-btn secondary small" id="this-month">Deze maand</button>
    </div>
  </div>
  <p class="muted hint">Klik op een dag om te wisselen tussen vrij, niet vrij en leeg.</p>
  <div class="grid-wrap">
    <table class="availability" id="availability-table" aria-busy="true"></table>
  </div>
  <div class="legend" aria-hidden="true">
    <span><span class="swatch" style="background:var(--success-bg); color:var(--success);">✓</span> Vrij</span>
    <span><span class="swatch" style="background:var(--danger-bg); color:var(--danger);">✕</span> Niet vrij</span>
    <span><span class="swatch" style="background:var(--surface-sunken); border:1px solid var(--border);"></span> Weekend</span>
    <span><span class="swatch" style="background:var(--primary);"></span> Vandaag</span>
  </div>
</main>

${PORTAL_SCRIPT}
<script>
  const ROLE = ${JSON.stringify(role)};
  let myId = null;
  let current = new Date();
  current.setDate(1);

  const MONTH_NAMES = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];
  const DAY_SHORT = ["zo","ma","di","wo","do","vr","za"];
  const STATUS_TEXT = { vrij: "vrij", niet_vrij: "niet vrij", "": "niet ingevuld" };
  const STATUS_MARK = { vrij: "✓", niet_vrij: "✕", "": "" };

  function dayOfWeek(dateStr) { return new Date(dateStr + "T00:00:00").getDay(); }
  function isWeekend(dateStr) { const day = dayOfWeek(dateStr); return day === 0 || day === 6; }

  function dayButton(person, d, entry, canEdit) {
    const status = entry ? entry.status : "";
    const label = person.name + ", " + formatDate(d) + ": " + STATUS_TEXT[status] + (entry && entry.reason ? " (" + entry.reason + ")" : "");
    return '<button type="button" class="day-btn' + (status ? " " + status : "") + '" data-person="' + person.id + '" data-date="' + d + '" data-status="' + status + '"' +
      ' aria-label="' + escapeHtmlClient(label) + '"' + (entry && entry.reason ? ' title="' + escapeHtmlClient(entry.reason) + '"' : "") + (canEdit ? "" : " disabled") + ">" +
      STATUS_MARK[status] + "</button>";
  }

  async function loadGrid() {
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    document.getElementById("month-label").textContent = MONTH_NAMES[month - 1] + " " + year;

    const data = await fetchJson("/api/portal/availability?year=" + year + "&month=" + month);
    const table = document.getElementById("availability-table");
    const today = todayIso();
    const colClass = (d) => [isWeekend(d) ? "weekend" : "", d === today ? "today" : ""].filter(Boolean).join(" ");

    let html = '<thead><tr><th class="person-col" scope="col">Teamlid</th>';
    data.days.forEach((d) => {
      html += '<th scope="col" class="' + colClass(d) + '">' + Number(d.slice(-2)) + '<span class="dow">' + DAY_SHORT[dayOfWeek(d)] + "</span></th>";
    });
    html += '<th class="summary-col" scope="col">Dagen vrij</th></tr></thead><tbody>';

    if (!data.people.length) {
      html += '<tr><td class="person-col" colspan="' + (data.days.length + 2) + '"><span class="muted">Nog geen actieve teamleden.</span></td></tr>';
    }

    data.people.forEach((person) => {
      const canEdit = ROLE === "admin" || person.id === myId;
      html += '<tr><th scope="row" class="person-col">' + escapeHtmlClient(person.name) + (person.id === myId ? ' <span class="badge badge-blue">jij</span>' : "") + "</th>";
      data.days.forEach((d) => {
        const entry = (data.entries[person.id] || {})[d];
        html += '<td class="' + colClass(d) + '">' + dayButton(person, d, entry, canEdit) + "</td>";
      });
      html += '<td class="summary-col num">' + (data.personSummary[person.id] || 0) + "</td></tr>";
    });

    html += '<tr class="summary-row"><th scope="row" class="person-col">Aantal beschikbaar</th>';
    data.days.forEach((d) => {
      html += '<td class="num ' + colClass(d) + '">' + (data.dailySummary[d] || 0) + "</td>";
    });
    html += "<td></td></tr></tbody>";

    table.innerHTML = html;
    table.setAttribute("aria-busy", "false");

    table.querySelectorAll(".day-btn:not(:disabled)").forEach((button) => {
      button.addEventListener("click", async () => {
        const currentStatus = button.dataset.status;
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
        const focusKey = button.dataset.person + "|" + button.dataset.date;
        await withBusy(button, () => fetchJson("/api/portal/availability/" + button.dataset.person + "/" + button.dataset.date, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus, reason }),
        }));
        await loadGrid();
        // Keep keyboard users on the cell they just changed
        const [personId, date] = focusKey.split("|");
        const again = table.querySelector('.day-btn[data-person="' + personId + '"][data-date="' + date + '"]');
        if (again) again.focus();
      });
    });
  }

  document.getElementById("prev-month").addEventListener("click", () => { current.setMonth(current.getMonth() - 1); loadGrid(); });
  document.getElementById("next-month").addEventListener("click", () => { current.setMonth(current.getMonth() + 1); loadGrid(); });
  document.getElementById("this-month").addEventListener("click", () => { current = new Date(); current.setDate(1); loadGrid(); });

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
