const { PORTAL_BRAND_HEAD, PORTAL_SCRIPT, portalNav } = require("./brandHead");

function tasksPage({ name, role }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Taken — Branch Team Tool</title>
${PORTAL_BRAND_HEAD}
<style>
  .board { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start; }
  @media (max-width: 860px) { .board { grid-template-columns: 1fr; } }
  .column { background: var(--surface-sunken); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; min-width: 0; }
  .column-head { display: flex; align-items: center; justify-content: space-between; margin: 2px 4px 12px; }
  .column-head h2 { font-size: 0.9rem; font-weight: 700; color: var(--ink); margin: 0; }
  .column-count { font-size: 0.8rem; font-weight: 700; color: var(--text-light); background: var(--surface); border-radius: 999px; padding: 1px 9px; }
  /* Each column scrolls on its own so the board fits the screen instead of growing the page */
  .task-list { display: flex; flex-direction: column; gap: 6px; min-height: 60px; max-height: max(320px, calc(100dvh - 300px)); overflow-y: auto; overscroll-behavior: contain; padding: 2px; margin: -2px; scrollbar-width: thin; }
  .task-card { display: flex; align-items: flex-start; gap: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 10px 10px 10px 12px; box-shadow: 0 1px 2px var(--shadow); transition: border-color 150ms ease, box-shadow 150ms ease; }
  .task-card:hover { border-color: var(--border-strong); box-shadow: 0 4px 14px -6px var(--shadow-strong); }
  .task-card.overdue { border-color: var(--danger-border); }
  .task-open { display: block; flex: 1; min-width: 0; text-align: left; background: none; border: 0; padding: 0; font: inherit; color: inherit; cursor: pointer; }
  .task-open h3 { margin: 0 0 5px; font-size: 0.9rem; font-weight: 700; color: var(--ink); line-height: 1.35; }
  .task-meta { display: flex; flex-wrap: wrap; gap: 4px 8px; font-size: 0.75rem; color: var(--text-light); align-items: center; }
  .task-meta .due-overdue { color: var(--danger); font-weight: 700; }
  .task-card .status-select { flex: none; height: 28px; min-height: 28px; padding: 0 4px 0 6px; font-size: 0.75rem; width: auto; }
  .show-more { margin-top: 6px; width: 100%; background: none; border: 1px dashed var(--border-strong); border-radius: 8px; padding: 7px; font: inherit; font-size: 0.8rem; font-weight: 600; color: var(--text-light); cursor: pointer; }
  .show-more:hover { color: var(--ink); background: var(--surface); }
  .toolbar .search-field { flex: 1 1 220px; }
  .toolbar .search-field input { width: 100%; min-width: 0; }
  .board-tabs { display: none; }
  @media (max-width: 860px) {
    .board-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 4px; margin-bottom: 12px; background: var(--surface-sunken); border-radius: 10px; }
    .board-tabs button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 38px; border: 0; border-radius: 8px; background: transparent; font: inherit; font-size: 0.875rem; font-weight: 700; color: var(--text-light); cursor: pointer; }
    .board-tabs button[aria-selected="true"] { background: var(--surface); color: var(--ink); box-shadow: 0 1px 2px var(--shadow); }
    .board-tabs .column-count { background: var(--chip); }
    .board .column:not(.is-active) { display: none; }
    .board .column .column-head { display: none; }
    .task-list { max-height: none; overflow: visible; }
  }
  .column .empty { background: transparent; padding: 16px 10px; }
  .assignee-list { display: flex; flex-direction: column; gap: 0; max-height: 190px; overflow-y: auto; border: 1px solid var(--border-strong); border-radius: 8px; padding: 4px 6px; }
  .assignee-list label { display: flex; align-items: center; gap: 10px; font-weight: 500; font-size: 0.9rem; color: var(--ink); padding: 6px 4px; margin: 0; border-radius: 6px; cursor: pointer; }
  .assignee-list label:hover { background: var(--surface-hover); }
  .assignee-list input { width: 16px; height: 16px; accent-color: var(--primary); flex: none; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .readonly-note { font-size: 0.8rem; color: var(--text-light); background: var(--surface-muted); border-radius: 8px; padding: 8px 10px; }
  .time-entries { margin-top: 20px; border-top: 1px solid var(--border); padding-top: 16px; }
  .time-entries h3 { font-size: 0.9rem; margin: 0 0 8px; color: var(--ink); display: flex; justify-content: space-between; }
  .time-entry-row { display: flex; justify-content: space-between; gap: 12px; font-size: 0.85rem; padding: 6px 0; border-bottom: 1px solid var(--hairline); color: var(--text-dark); }
  .time-entry-row span:first-child { color: var(--text-light); }
  .log-time-form { display: grid; grid-template-columns: 1fr 90px; gap: 8px; margin-top: 12px; }
  .log-time-form .note { grid-column: 1 / -1; }
  .log-time-form button { grid-column: 1 / -1; justify-self: start; }
  @media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } }
</style>
</head>
<body>
${portalNav({ active: "tasks", role, name })}
<main class="portal-main">
  <div class="page-head">
    <h1>Taken</h1>
    ${role === "admin" || role === "teamlid" ? '<button type="button" class="portal-btn" id="new-task-btn">+ Nieuwe taak</button>' : ""}
  </div>

  <div class="toolbar">
    <label class="field"><span>Toegewezen aan</span><select id="filter-assignee"><option value="">Iedereen</option></select></label>
    <label class="field"><span>Prioriteit</span>
      <select id="filter-priority">
        <option value="">Alle prioriteiten</option>
        <option value="hoog">Hoog</option>
        <option value="gemiddeld">Gemiddeld</option>
        <option value="laag">Laag</option>
      </select>
    </label>
    <label class="field search-field"><span>Zoeken</span><input type="search" id="task-search" placeholder="Zoek op titel"></label>
    <label class="field"><span>Sorteren</span>
      <select id="sort-by">
        <option value="deadline">Op deadline</option>
        <option value="priority">Op prioriteit</option>
      </select>
    </label>
  </div>

  <div class="board-tabs" role="tablist" aria-label="Kolommen">
    <button type="button" role="tab" data-tab="todo" aria-selected="true">To do <span class="column-count num" data-count="todo">–</span></button>
    <button type="button" role="tab" data-tab="bezig" aria-selected="false">Bezig <span class="column-count num" data-count="bezig">–</span></button>
    <button type="button" role="tab" data-tab="klaar" aria-selected="false">Klaar <span class="column-count num" data-count="klaar">–</span></button>
  </div>

  <div class="board" aria-busy="true" id="board">
    <section class="column is-active" data-column="todo" aria-labelledby="h-todo"><div class="column-head"><h2 id="h-todo">To do</h2><span class="column-count num" id="count-todo">–</span></div><div class="task-list" id="col-todo"></div></section>
    <section class="column" data-column="bezig" aria-labelledby="h-bezig"><div class="column-head"><h2 id="h-bezig">Bezig</h2><span class="column-count num" id="count-bezig">–</span></div><div class="task-list" id="col-bezig"></div></section>
    <section class="column" data-column="klaar" aria-labelledby="h-klaar"><div class="column-head"><h2 id="h-klaar">Klaar</h2><span class="column-count num" id="count-klaar">–</span></div><div class="task-list" id="col-klaar"></div></section>
  </div>
</main>

<div class="modal-backdrop" id="task-modal-backdrop">
  <div class="modal" id="task-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="modal-header">
      <h2 id="modal-title">Nieuwe taak</h2>
      <button type="button" class="icon-btn modal-close" data-close-modal aria-label="Sluiten">✕</button>
    </div>
    <form id="task-form">
      <input type="hidden" id="task-id">
      <p class="readonly-note" id="readonly-note" hidden>Alleen een admin kan deze taak bewerken. Je kunt wel uren loggen als je eraan bent toegewezen.</p>
      <label class="field"><span>Titel</span><input id="task-title" required></label>
      <label class="field"><span>Beschrijving</span><textarea id="task-description"></textarea></label>
      <fieldset class="field" style="border:0; padding:0; margin:0;">
        <legend class="field-label" style="margin-bottom:5px;">Toegewezen aan</legend>
        <div class="assignee-list" id="assignee-list"></div>
      </fieldset>
      <div class="form-row">
        <label class="field"><span>Deadline</span><input id="task-deadline" type="date"></label>
        <label class="field"><span>Prioriteit</span>
          <select id="task-priority">
            <option value="laag">Laag</option>
            <option value="gemiddeld" selected>Gemiddeld</option>
            <option value="hoog">Hoog</option>
          </select>
        </label>
      </div>
      <p class="form-error" id="task-form-error" role="alert"></p>
      <div class="modal-actions">
        <button type="button" class="portal-btn ghost-danger" id="delete-task-btn" hidden style="margin-right:auto;">Verwijderen</button>
        <button type="button" class="portal-btn secondary" data-close-modal>Annuleren</button>
        <button type="submit" class="portal-btn" id="save-task-btn">Opslaan</button>
      </div>
    </form>
    <section class="time-entries" id="time-entries-section" hidden aria-labelledby="time-title">
      <h3><span id="time-title">Tijdregistraties</span><span class="num" id="time-total"></span></h3>
      <div id="time-entries-list"></div>
      <form class="log-time-form" id="log-time-form">
        <label class="field"><span>Datum</span><input type="date" id="log-date" required></label>
        <label class="field"><span>Uren</span><input type="number" id="log-hours" step="0.25" min="0.25" max="24" inputmode="decimal" required></label>
        <label class="field note"><span>Notitie (optioneel)</span><input type="text" id="log-note"></label>
        <button type="submit" class="portal-btn secondary" id="log-time-btn">Uren loggen</button>
      </form>
    </section>
  </div>
</div>

${PORTAL_SCRIPT}
<script>
  const ROLE = ${JSON.stringify(role)};
  let activeUsers = [];
  let myId = null;
  let currentTask = null;
  const backdrop = document.getElementById("task-modal-backdrop");
  const EDITABLE_IDS = ["task-title", "task-description", "task-deadline", "task-priority"];

  function userName(id) {
    const u = activeUsers.find((u) => u.id === id);
    return u ? u.name : "(onbekend)";
  }

  function taskCardHtml(task) {
    const assignees = task.assigneeIds.map(userName).join(", ") || "Niet toegewezen";
    const canChangeStatus = ROLE === "admin" || task.assigneeIds.includes(myId);
    const statusOptions = ["todo", "bezig", "klaar"].map((s) =>
      '<option value="' + s + '"' + (s === task.status ? " selected" : "") + ">" + STATUS_LABELS[s] + "</option>"
    ).join("");
    const due = task.deadline
      ? '<span class="' + (task.overdue ? "due-overdue" : "") + '">' + (task.overdue ? "Te laat · " : "Deadline ") + formatDate(task.deadline) + "</span>"
      : "";
    return (
      '<article class="task-card' + (task.overdue ? " overdue" : "") + '">' +
      '<button type="button" class="task-open" data-id="' + task.id + '">' +
      "<h3>" + escapeHtmlClient(task.title) + "</h3>" +
      '<div class="task-meta">' +
      '<span class="badge badge-' + task.priority + '">' + (PRIORITY_LABELS[task.priority] || task.priority) + "</span>" +
      "<span>" + escapeHtmlClient(assignees) + "</span>" +
      due +
      (task.totalHours ? '<span class="num">' + formatHours(task.totalHours) + "</span>" : "") +
      "</div></button>" +
      '<select class="status-select" data-id="' + task.id + '" aria-label="Status van ' + escapeHtmlClient(task.title) + '"' + (canChangeStatus ? "" : " disabled") + ">" + statusOptions + "</select>" +
      "</article>"
    );
  }

  async function loadTasks() {
    const params = new URLSearchParams();
    const assignee = document.getElementById("filter-assignee").value;
    const priority = document.getElementById("filter-priority").value;
    const sort = document.getElementById("sort-by").value;
    if (assignee) params.set("assignee", assignee);
    if (priority) params.set("priority", priority);
    if (sort) params.set("sort", sort);

    allTasks = await fetchJson("/api/portal/tasks?" + params.toString());
    renderBoard();
  }

  const DONE_PREVIEW = 5;
  let allTasks = [];
  let showAllDone = false;

  function renderBoard() {
    const query = document.getElementById("task-search").value.trim().toLowerCase();
    const list = query ? allTasks.filter((t) => t.title.toLowerCase().includes(query)) : allTasks;
    const buckets = { todo: [], bezig: [], klaar: [] };
    list.forEach((task) => buckets[task.status].push(task));
    // Most recently finished first; older done work folds away behind "Toon alle"
    buckets.klaar.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    const filtered = document.getElementById("filter-assignee").value || document.getElementById("filter-priority").value || query;
    Object.entries(buckets).forEach(([status, tasks]) => {
      document.getElementById("count-" + status).textContent = tasks.length;
      document.querySelector('[data-count="' + status + '"]').textContent = tasks.length;
      const visible = status === "klaar" && !showAllDone ? tasks.slice(0, DONE_PREVIEW) : tasks;
      const hiddenCount = tasks.length - visible.length;
      document.getElementById("col-" + status).innerHTML = tasks.length
        ? visible.map(taskCardHtml).join("") +
          (status === "klaar" && tasks.length > DONE_PREVIEW
            ? '<button type="button" class="show-more" id="toggle-done">' + (showAllDone ? "Minder tonen" : "Toon alle " + tasks.length + " (" + hiddenCount + " ouder)") + "</button>"
            : "")
        : '<p class="empty">' + (filtered ? "Geen taken die aan de filters voldoen." : "Geen taken.") + "</p>";
    });
    document.getElementById("board").setAttribute("aria-busy", "false");

    const toggleDone = document.getElementById("toggle-done");
    if (toggleDone) toggleDone.addEventListener("click", () => { showAllDone = !showAllDone; renderBoard(); });

    document.querySelectorAll(".status-select").forEach((select) => {
      select.addEventListener("change", async () => {
        select.disabled = true;
        try {
          await fetchJson("/api/portal/tasks/" + select.dataset.id + "/status", {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: select.value }),
          });
          toast("Status bijgewerkt: " + STATUS_LABELS[select.value], "success");
        } finally {
          loadTasks();
        }
      });
    });
    document.querySelectorAll(".task-open").forEach((button) => {
      button.addEventListener("click", () => openTaskDetail(button.dataset.id));
    });
  }

  function populateAssigneeFilter() {
    const select = document.getElementById("filter-assignee");
    select.insertAdjacentHTML("beforeend", activeUsers.map((u) =>
      '<option value="' + u.id + '">' + escapeHtmlClient(u.name) + (u.id === myId ? " (jij)" : "") + "</option>"
    ).join(""));
  }

  function populateAssigneeChecklist(selectedIds) {
    document.getElementById("assignee-list").innerHTML = activeUsers.map((u) =>
      '<label><input type="checkbox" value="' + u.id + '"' + (selectedIds.includes(u.id) ? " checked" : "") + "> " + escapeHtmlClient(u.name) + "</label>"
    ).join("") || '<p class="muted" style="margin:6px 4px;">Geen actieve teamleden.</p>';
  }

  function setEditable(editable) {
    EDITABLE_IDS.forEach((id) => (document.getElementById(id).disabled = !editable));
    document.querySelectorAll("#assignee-list input").forEach((el) => (el.disabled = !editable));
    document.getElementById("save-task-btn").hidden = !editable;
    document.getElementById("readonly-note").hidden = editable;
  }

  function openNewTaskModal() {
    currentTask = null;
    document.getElementById("modal-title").textContent = "Nieuwe taak";
    document.getElementById("task-form").reset();
    document.getElementById("task-id").value = "";
    document.getElementById("task-priority").value = "gemiddeld";
    document.getElementById("task-form-error").textContent = "";
    populateAssigneeChecklist([]);
    setEditable(true);
    document.getElementById("delete-task-btn").hidden = true;
    document.getElementById("time-entries-section").hidden = true;
    openModal(backdrop);
  }

  async function openTaskDetail(id) {
    const task = await fetchJson("/api/portal/tasks/" + id);
    currentTask = task;
    const isAdmin = ROLE === "admin";
    document.getElementById("modal-title").textContent = isAdmin ? "Taak bewerken" : task.title;
    document.getElementById("task-id").value = task.id;
    document.getElementById("task-title").value = task.title;
    document.getElementById("task-description").value = task.description;
    document.getElementById("task-deadline").value = task.deadline || "";
    document.getElementById("task-priority").value = task.priority;
    document.getElementById("task-form-error").textContent = "";
    populateAssigneeChecklist(task.assigneeIds);
    setEditable(isAdmin);
    document.getElementById("delete-task-btn").hidden = !isAdmin;

    const canLogTime = isAdmin || task.assigneeIds.includes(myId);
    document.getElementById("time-entries-section").hidden = false;
    document.getElementById("log-time-form").hidden = !canLogTime;
    document.getElementById("log-date").value = todayIso();
    await loadTimeEntries(task.id);
    openModal(backdrop);
  }

  async function loadTimeEntries(taskId) {
    const entries = await fetchJson("/api/portal/tasks/" + taskId + "/time-entries");
    const total = entries.reduce((sum, e) => sum + Number(e.hours || 0), 0);
    document.getElementById("time-total").textContent = entries.length ? "Totaal " + formatHours(total) : "";
    document.getElementById("time-entries-list").innerHTML = entries.map((e) =>
      '<div class="time-entry-row"><span>' + formatDate(e.date) + " · " + escapeHtmlClient(userName(e.personId)) + (e.note ? " — " + escapeHtmlClient(e.note) : "") + '</span><span class="num">' + formatHours(e.hours) + "</span></div>"
    ).join("") || '<p class="muted" style="margin:4px 0;">Nog geen uren gelogd.</p>';
  }

  const newTaskBtn = document.getElementById("new-task-btn");
  if (newTaskBtn) newTaskBtn.addEventListener("click", openNewTaskModal);

  document.getElementById("task-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("task-id").value;
    // Creating is open to admin + teamlid; editing an existing task stays admin-only.
    const allowed = id ? ROLE === "admin" : (ROLE === "admin" || ROLE === "teamlid");
    if (!allowed) { closeModal(backdrop); return; }
    const errorEl = document.getElementById("task-form-error");
    errorEl.textContent = "";
    const payload = {
      title: document.getElementById("task-title").value.trim(),
      description: document.getElementById("task-description").value,
      assigneeIds: Array.from(document.querySelectorAll("#assignee-list input:checked")).map((el) => el.value),
      deadline: document.getElementById("task-deadline").value || null,
      priority: document.getElementById("task-priority").value,
    };
    await withBusy(document.getElementById("save-task-btn"), async () => {
      try {
        if (id) {
          await fetchJson("/api/portal/tasks/" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        } else {
          await fetchJson("/api/portal/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        }
      } catch (err) {
        errorEl.textContent = err.message;
        return;
      }
      closeModal(backdrop);
      toast(id ? "Taak opgeslagen" : "Taak aangemaakt", "success");
      loadTasks();
    });
  });

  document.getElementById("delete-task-btn").addEventListener("click", async (e) => {
    if (!currentTask) return;
    if (!confirm("Taak “" + currentTask.title + "” verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;
    await withBusy(e.currentTarget, async () => {
      await fetchJson("/api/portal/tasks/" + currentTask.id, { method: "DELETE" });
      closeModal(backdrop);
      toast("Taak verwijderd", "success");
      loadTasks();
    });
  });

  document.getElementById("log-time-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentTask) return;
    await withBusy(document.getElementById("log-time-btn"), async () => {
      await fetchJson("/api/portal/tasks/" + currentTask.id + "/time-entries", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: document.getElementById("log-date").value, hours: Number(document.getElementById("log-hours").value), note: document.getElementById("log-note").value }),
      });
      document.getElementById("log-hours").value = "";
      document.getElementById("log-note").value = "";
      toast("Uren gelogd", "success");
      await loadTimeEntries(currentTask.id);
      loadTasks();
    });
  });

  document.getElementById("filter-assignee").addEventListener("change", (e) => {
    try { localStorage.setItem("portal-task-assignee", e.target.value); } catch (err) {}
    loadTasks();
  });
  document.getElementById("task-search").addEventListener("input", renderBoard);

  document.querySelectorAll(".board-tabs [data-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".board-tabs [data-tab]").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      document.querySelectorAll(".board .column").forEach((col) => col.classList.toggle("is-active", col.dataset.column === tab.dataset.tab));
    });
  });
  document.getElementById("filter-priority").addEventListener("change", loadTasks);
  document.getElementById("sort-by").addEventListener("change", loadTasks);

  (async function init() {
    const me = await fetchJson("/portal/me");
    myId = me.id;
    activeUsers = await fetchJson("/api/portal/users/active");
    populateAssigneeFilter();
    // Reopen on the assignee filter this person last used (e.g. only their own tasks)
    let savedAssignee = "";
    try { savedAssignee = localStorage.getItem("portal-task-assignee") || ""; } catch (err) {}
    const assigneeSelect = document.getElementById("filter-assignee");
    if (savedAssignee && Array.from(assigneeSelect.options).some((o) => o.value === savedAssignee)) assigneeSelect.value = savedAssignee;
    loadTasks();
  })();
</script>
</body>
</html>`;
}

module.exports = { tasksPage };
