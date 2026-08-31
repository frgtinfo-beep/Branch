const { PORTAL_BRAND_HEAD, portalNav } = require("./brandHead");

function tasksPage({ name, role }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Taken — Branch Team Tool</title>
${PORTAL_BRAND_HEAD}
<style>
  .filters { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; align-items: center; }
  .filters select { padding: 8px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-family: inherit; font-size: 0.85rem; background: #fff; }
  .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; align-items: start; }
  @media (max-width: 800px) { .board { grid-template-columns: 1fr; } }
  .column { background: rgba(255,255,255,0.6); border-radius: 14px; padding: 14px; min-height: 120px; }
  .column h2 { font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-light); margin: 0 0 12px; }
  .task-card { background: #fff; border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border-left: 4px solid transparent; cursor: pointer; }
  .task-card.overdue { border-left-color: var(--danger); background: #fff7f7; }
  .task-card h3 { margin: 0 0 6px; font-size: 0.95rem; color: var(--ink); }
  .task-meta { display: flex; flex-wrap: wrap; gap: 6px; font-size: 0.75rem; color: var(--text-light); align-items: center; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 0.7rem; font-weight: 700; }
  .badge-laag { background: #e5e7eb; color: #374151; }
  .badge-gemiddeld { background: var(--warning-bg); color: #92400e; }
  .badge-hoog { background: var(--danger-bg); color: #991b1b; }
  .task-card select { margin-top: 8px; font-size: 0.75rem; padding: 4px 6px; border-radius: 6px; border: 1px solid #d1d5db; }
  .modal-backdrop { position: fixed; inset: 0; background: rgba(5,7,15,0.4); display: none; align-items: center; justify-content: center; padding: 20px; z-index: 100; }
  .modal-backdrop.open { display: flex; }
  .modal { background: #fff; border-radius: 16px; padding: 28px; max-width: 480px; width: 100%; max-height: 90vh; overflow-y: auto; }
  .modal h2 { margin-top: 0; font-size: 1.1rem; }
  .modal label { display: block; font-size: 0.8rem; font-weight: 600; color: #374151; margin-top: 14px; margin-bottom: 4px; }
  .modal input, .modal textarea, .modal select { width: 100%; box-sizing: border-box; padding: 9px 11px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.85rem; font-family: inherit; }
  .modal textarea { min-height: 70px; resize: vertical; }
  .assignee-list { display: flex; flex-direction: column; gap: 2px; margin-top: 6px; max-height: 180px; overflow-y: auto; border: 1px solid #d1d5db; border-radius: 8px; padding: 6px 8px; }
  .assignee-list label { display: flex; align-items: center; gap: 8px; font-weight: 500; font-size: 0.85rem; color: var(--ink); padding: 5px 2px; margin: 0; white-space: nowrap; }
  .assignee-list label input { width: auto; flex: none; }
  .modal-actions { display: flex; gap: 10px; margin-top: 22px; justify-content: flex-end; }
  .time-entries { margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 14px; }
  .time-entry-row { display: flex; justify-content: space-between; font-size: 0.8rem; padding: 4px 0; color: var(--text-light); }
  .log-time-form { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
  .log-time-form input { width: auto; flex: 1; min-width: 80px; }
</style>
</head>
<body>
${portalNav({ active: "tasks", role, name })}
<main class="portal-main">
  <h1 class="portal-title">Taken</h1>
  <div class="filters">
    <select id="filter-assignee"><option value="">Iedereen</option></select>
    <select id="filter-priority">
      <option value="">Alle prioriteiten</option>
      <option value="hoog">Hoog</option>
      <option value="gemiddeld">Gemiddeld</option>
      <option value="laag">Laag</option>
    </select>
    <select id="sort-by">
      <option value="deadline">Sorteer op deadline</option>
      <option value="priority">Sorteer op prioriteit</option>
    </select>
    ${role === "admin" ? '<button class="portal-btn" id="new-task-btn">+ Nieuwe taak</button>' : ""}
  </div>

  <div class="board">
    <div class="column"><h2>To do</h2><div id="col-todo"></div></div>
    <div class="column"><h2>Bezig</h2><div id="col-bezig"></div></div>
    <div class="column"><h2>Klaar</h2><div id="col-klaar"></div></div>
  </div>
</main>

<div class="modal-backdrop" id="task-modal-backdrop">
  <div class="modal" id="task-modal">
    <h2 id="modal-title">Nieuwe taak</h2>
    <form id="task-form">
      <input type="hidden" id="task-id">
      <label for="task-title">Titel</label>
      <input id="task-title" required>
      <label for="task-description">Beschrijving</label>
      <textarea id="task-description"></textarea>
      <label>Toegewezen aan</label>
      <div class="assignee-list" id="assignee-list"></div>
      <label for="task-deadline">Deadline</label>
      <input id="task-deadline" type="date">
      <label for="task-priority">Prioriteit</label>
      <select id="task-priority">
        <option value="laag">Laag</option>
        <option value="gemiddeld" selected>Gemiddeld</option>
        <option value="hoog">Hoog</option>
      </select>
      <div class="modal-actions">
        <button type="button" class="portal-btn secondary" id="delete-task-btn" style="display:none; margin-right:auto;">Verwijderen</button>
        <button type="button" class="portal-btn secondary" id="cancel-task-btn">Annuleren</button>
        <button type="submit" class="portal-btn">Opslaan</button>
      </div>
    </form>
    <div class="time-entries" id="time-entries-section" style="display:none;">
      <strong style="font-size:0.85rem;">Tijdregistraties</strong>
      <div id="time-entries-list"></div>
      <form class="log-time-form" id="log-time-form">
        <input type="date" id="log-date" required>
        <input type="number" id="log-hours" step="0.25" min="0.25" max="24" placeholder="Uren" required>
        <input type="text" id="log-note" placeholder="Notitie (optioneel)">
        <button type="submit" class="portal-btn secondary">Loggen</button>
      </form>
    </div>
  </div>
</div>

<script>
  const ROLE = ${JSON.stringify(role)};
  const MY_ID = null; // resolved from /portal/me below
  let activeUsers = [];
  let myId = null;
  let currentTask = null;

  async function fetchJson(url, opts) {
    const res = await fetch(url, opts);
    if (res.status === 401) { window.location.href = "/portal/login"; throw new Error("unauthenticated"); }
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || ("HTTP " + res.status)); }
    return res.status === 204 ? null : res.json();
  }

  function userName(id) {
    const u = activeUsers.find((u) => u.id === id);
    return u ? u.name : "(onbekend)";
  }

  function taskCardHtml(task) {
    const overdueClass = task.overdue ? " overdue" : "";
    const assignees = task.assigneeIds.map(userName).join(", ") || "—";
    const canChangeStatus = ROLE === "admin" || task.assigneeIds.includes(myId);
    const statusOptions = ["todo", "bezig", "klaar"].map((s) =>
      '<option value="' + s + '"' + (s === task.status ? " selected" : "") + '>' + (s === "todo" ? "To do" : s === "bezig" ? "Bezig" : "Klaar") + "</option>"
    ).join("");
    return (
      '<div class="task-card' + overdueClass + '" data-id="' + task.id + '">' +
      "<h3>" + escapeHtmlClient(task.title) + "</h3>" +
      '<div class="task-meta">' +
      '<span class="badge badge-' + task.priority + '">' + task.priority + "</span>" +
      "<span>" + escapeHtmlClient(assignees) + "</span>" +
      (task.deadline ? "<span>" + task.deadline + "</span>" : "") +
      (task.totalHours ? "<span>" + task.totalHours + "u</span>" : "") +
      "</div>" +
      '<select class="status-select" data-id="' + task.id + '"' + (canChangeStatus ? "" : " disabled") + ">" + statusOptions + "</select>" +
      "</div>"
    );
  }

  function escapeHtmlClient(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function loadTasks() {
    const params = new URLSearchParams();
    const assignee = document.getElementById("filter-assignee").value;
    const priority = document.getElementById("filter-priority").value;
    const sort = document.getElementById("sort-by").value;
    if (assignee) params.set("assignee", assignee);
    if (priority) params.set("priority", priority);
    if (sort) params.set("sort", sort);

    const list = await fetchJson("/api/portal/tasks?" + params.toString());
    const cols = { todo: document.getElementById("col-todo"), bezig: document.getElementById("col-bezig"), klaar: document.getElementById("col-klaar") };
    cols.todo.innerHTML = ""; cols.bezig.innerHTML = ""; cols.klaar.innerHTML = "";
    list.forEach((task) => { cols[task.status].innerHTML += taskCardHtml(task); });

    document.querySelectorAll(".status-select").forEach((select) => {
      select.addEventListener("click", (e) => e.stopPropagation());
      select.addEventListener("change", async (e) => {
        e.stopPropagation();
        await fetchJson("/api/portal/tasks/" + select.dataset.id + "/status", {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: select.value }),
        });
        loadTasks();
      });
    });
    document.querySelectorAll(".task-card").forEach((card) => {
      card.addEventListener("click", () => openTaskDetail(card.dataset.id));
    });
  }

  function populateAssigneeFilter() {
    const select = document.getElementById("filter-assignee");
    activeUsers.forEach((u) => { select.innerHTML += '<option value="' + u.id + '">' + escapeHtmlClient(u.name) + "</option>"; });
  }

  function populateAssigneeChecklist(selectedIds) {
    const container = document.getElementById("assignee-list");
    container.innerHTML = activeUsers.map((u) =>
      '<label><input type="checkbox" value="' + u.id + '"' + (selectedIds.includes(u.id) ? " checked" : "") + "> " + escapeHtmlClient(u.name) + "</label>"
    ).join("");
  }

  function openNewTaskModal() {
    currentTask = null;
    document.getElementById("modal-title").textContent = "Nieuwe taak";
    document.getElementById("task-id").value = "";
    document.getElementById("task-title").value = "";
    document.getElementById("task-description").value = "";
    document.getElementById("task-deadline").value = "";
    document.getElementById("task-priority").value = "gemiddeld";
    populateAssigneeChecklist([]);
    document.getElementById("delete-task-btn").style.display = "none";
    document.getElementById("time-entries-section").style.display = "none";
    document.getElementById("task-modal-backdrop").classList.add("open");
  }

  async function openTaskDetail(id) {
    const task = await fetchJson("/api/portal/tasks/" + id);
    currentTask = task;
    document.getElementById("modal-title").textContent = ROLE === "admin" ? "Taak bewerken" : task.title;
    document.getElementById("task-id").value = task.id;
    document.getElementById("task-title").value = task.title;
    document.getElementById("task-description").value = task.description;
    document.getElementById("task-deadline").value = task.deadline || "";
    document.getElementById("task-priority").value = task.priority;
    populateAssigneeChecklist(task.assigneeIds);

    const isAdmin = ROLE === "admin";
    document.getElementById("task-title").disabled = !isAdmin;
    document.getElementById("task-description").disabled = !isAdmin;
    document.getElementById("task-deadline").disabled = !isAdmin;
    document.getElementById("task-priority").disabled = !isAdmin;
    document.querySelectorAll("#assignee-list input").forEach((el) => (el.disabled = !isAdmin));
    document.querySelector('#task-form button[type="submit"]').style.display = isAdmin ? "" : "none";
    document.getElementById("delete-task-btn").style.display = isAdmin ? "" : "none";

    const canLogTime = isAdmin || task.assigneeIds.includes(myId);
    document.getElementById("time-entries-section").style.display = "block";
    document.getElementById("log-time-form").style.display = canLogTime ? "flex" : "none";
    await loadTimeEntries(task.id);

    document.getElementById("task-modal-backdrop").classList.add("open");
  }

  async function loadTimeEntries(taskId) {
    const entries = await fetchJson("/api/portal/tasks/" + taskId + "/time-entries");
    document.getElementById("time-entries-list").innerHTML = entries.map((e) =>
      '<div class="time-entry-row"><span>' + e.date + " — " + userName(e.personId) + (e.note ? " (" + escapeHtmlClient(e.note) + ")" : "") + "</span><span>" + e.hours + "u</span></div>"
    ).join("") || '<div class="time-entry-row"><span>Nog geen registraties</span></div>';
  }

  document.getElementById("cancel-task-btn").addEventListener("click", () => {
    document.getElementById("task-modal-backdrop").classList.remove("open");
  });

  const newTaskBtn = document.getElementById("new-task-btn");
  if (newTaskBtn) newTaskBtn.addEventListener("click", openNewTaskModal);

  document.getElementById("task-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (ROLE !== "admin") { document.getElementById("task-modal-backdrop").classList.remove("open"); return; }
    const id = document.getElementById("task-id").value;
    const assigneeIds = Array.from(document.querySelectorAll("#assignee-list input:checked")).map((el) => el.value);
    const payload = {
      title: document.getElementById("task-title").value,
      description: document.getElementById("task-description").value,
      assigneeIds,
      deadline: document.getElementById("task-deadline").value || null,
      priority: document.getElementById("task-priority").value,
    };
    if (id) {
      await fetchJson("/api/portal/tasks/" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetchJson("/api/portal/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    document.getElementById("task-modal-backdrop").classList.remove("open");
    loadTasks();
  });

  document.getElementById("delete-task-btn").addEventListener("click", async () => {
    if (!currentTask) return;
    if (!confirm("Deze taak verwijderen?")) return;
    await fetchJson("/api/portal/tasks/" + currentTask.id, { method: "DELETE" });
    document.getElementById("task-modal-backdrop").classList.remove("open");
    loadTasks();
  });

  document.getElementById("log-time-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentTask) return;
    await fetchJson("/api/portal/tasks/" + currentTask.id + "/time-entries", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: document.getElementById("log-date").value, hours: Number(document.getElementById("log-hours").value), note: document.getElementById("log-note").value }),
    });
    document.getElementById("log-date").value = "";
    document.getElementById("log-hours").value = "";
    document.getElementById("log-note").value = "";
    await loadTimeEntries(currentTask.id);
    loadTasks();
  });

  document.getElementById("filter-assignee").addEventListener("change", loadTasks);
  document.getElementById("filter-priority").addEventListener("change", loadTasks);
  document.getElementById("sort-by").addEventListener("change", loadTasks);

  (async function init() {
    const me = await fetchJson("/portal/me");
    myId = me.id;
    activeUsers = await fetchJson("/api/portal/users/active");
    populateAssigneeFilter();
    loadTasks();
  })();
</script>
</body>
</html>`;
}

module.exports = { tasksPage };
