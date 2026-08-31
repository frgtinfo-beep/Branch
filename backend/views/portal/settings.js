const { PORTAL_BRAND_HEAD, portalNav } = require("./brandHead");

function settingsPage({ name, role }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Instellingen — Branch Team Tool</title>
${PORTAL_BRAND_HEAD}
<style>
  .section { margin-bottom: 32px; }
  .section h2 { font-size: 1.05rem; margin-bottom: 12px; }
  .stage-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
  .stage-row input { flex: 1; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 8px; font-family: inherit; }
  .stage-row button { background: none; border: 1px solid #d1d5db; border-radius: 6px; padding: 4px 8px; cursor: pointer; font-family: inherit; }
  .add-stage-row { display: flex; gap: 8px; margin-top: 10px; }
  .add-stage-row input { flex: 1; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 8px; font-family: inherit; }
  table.user-table { width: 100%; border-collapse: collapse; }
  table.user-table th, table.user-table td { text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 0.85rem; }
  table.user-table th { color: var(--text-light); font-size: 0.75rem; text-transform: uppercase; }
  .role-pill { font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: #e5e7eb; }
  .inactive-row { opacity: 0.5; }
  .modal-backdrop { position: fixed; inset: 0; background: rgba(5,7,15,0.4); display: none; align-items: center; justify-content: center; padding: 20px; z-index: 100; }
  .modal-backdrop.open { display: flex; }
  .modal { background: #fff; border-radius: 16px; padding: 28px; max-width: 400px; width: 100%; }
  .modal label { display: block; font-size: 0.8rem; font-weight: 600; color: #374151; margin-top: 12px; margin-bottom: 4px; }
  .modal input, .modal select { width: 100%; box-sizing: border-box; padding: 9px 11px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.85rem; font-family: inherit; }
  .modal-actions { display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end; }
  .error-msg { color: #dc2626; font-size: 0.8rem; margin-top: 10px; display: none; }
</style>
</head>
<body>
${portalNav({ active: "settings", role, name })}
<main class="portal-main">
  <h1 class="portal-title">Instellingen</h1>

  <div class="section portal-card">
    <h2>Klanttraject-fases</h2>
    <div id="stage-list"></div>
    <div class="add-stage-row">
      <input id="new-stage-name" placeholder="Nieuwe fase">
      <button type="button" class="portal-btn secondary" id="add-stage-btn">+ Toevoegen</button>
    </div>
    <div class="modal-actions" style="justify-content:flex-start; margin-top:16px;">
      <button class="portal-btn" id="save-stages-btn">Opslaan</button>
    </div>
    <div class="error-msg" id="stages-error"></div>
  </div>

  <div class="section portal-card">
    <h2>Teamleden</h2>
    <button class="portal-btn" id="new-user-btn" style="margin-bottom:14px;">+ Nieuw teamlid</button>
    <table class="user-table">
      <thead><tr><th>Naam</th><th>E-mail</th><th>Rol</th><th>Status</th><th></th></tr></thead>
      <tbody id="user-table-body"></tbody>
    </table>
  </div>
</main>

<div class="modal-backdrop" id="user-modal-backdrop">
  <div class="modal">
    <h2 id="user-modal-title" style="margin-top:0; font-size:1.05rem;">Nieuw teamlid</h2>
    <form id="user-form">
      <input type="hidden" id="u-id">
      <label for="u-name">Naam</label>
      <input id="u-name" required>
      <label for="u-email">E-mailadres</label>
      <input id="u-email" type="email" required>
      <label for="u-role">Rol</label>
      <select id="u-role">
        <option value="teamlid">Teamlid</option>
        <option value="bestuur">Bestuur</option>
        <option value="admin">Admin</option>
      </select>
      <label for="u-password" id="u-password-label">Wachtwoord</label>
      <input id="u-password" type="text" placeholder="Minimaal 8 tekens">
      <div class="modal-actions">
        <button type="button" class="portal-btn secondary" id="cancel-user-btn">Annuleren</button>
        <button type="submit" class="portal-btn">Opslaan</button>
      </div>
    </form>
  </div>
</div>

<script>
  function escapeHtmlClient(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  async function fetchJson(url, opts) {
    const res = await fetch(url, opts);
    if (res.status === 401) { window.location.href = "/portal/login"; throw new Error("unauthenticated"); }
    if (!res.ok) { const body = await res.json().catch(() => ({})); const err = new Error(body.error || ("HTTP " + res.status)); throw err; }
    return res.json();
  }

  let stages = [];

  function renderStages() {
    document.getElementById("stage-list").innerHTML = stages.map((s, i) =>
      '<div class="stage-row">' +
      '<span style="color:#9ca3af; width:20px;">' + (i + 1) + "</span>" +
      '<input value="' + escapeHtmlClient(s) + '" data-index="' + i + '">' +
      '<button type="button" data-up="' + i + '"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
      '<button type="button" data-down="' + i + '"' + (i === stages.length - 1 ? " disabled" : "") + ">↓</button>" +
      '<button type="button" data-remove="' + i + '">✕</button>' +
      "</div>"
    ).join("");

    document.querySelectorAll("#stage-list input").forEach((input) => {
      input.addEventListener("input", () => { stages[Number(input.dataset.index)] = input.value; });
    });
    document.querySelectorAll("#stage-list [data-up]").forEach((btn) => {
      btn.addEventListener("click", () => { const i = Number(btn.dataset.up); [stages[i - 1], stages[i]] = [stages[i], stages[i - 1]]; renderStages(); });
    });
    document.querySelectorAll("#stage-list [data-down]").forEach((btn) => {
      btn.addEventListener("click", () => { const i = Number(btn.dataset.down); [stages[i + 1], stages[i]] = [stages[i], stages[i + 1]]; renderStages(); });
    });
    document.querySelectorAll("#stage-list [data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => { stages.splice(Number(btn.dataset.remove), 1); renderStages(); });
    });
  }

  async function loadStages() {
    const data = await fetchJson("/api/portal/settings/journey-stages");
    stages = data.stages;
    renderStages();
  }

  document.getElementById("add-stage-btn").addEventListener("click", () => {
    const input = document.getElementById("new-stage-name");
    if (!input.value.trim()) return;
    stages.push(input.value.trim());
    input.value = "";
    renderStages();
  });

  document.getElementById("save-stages-btn").addEventListener("click", async () => {
    const errorEl = document.getElementById("stages-error");
    errorEl.style.display = "none";
    try {
      await fetchJson("/api/portal/settings/journey-stages", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stages }),
      });
      loadStages();
    } catch (e) {
      errorEl.textContent = e.message;
      errorEl.style.display = "block";
    }
  });

  async function loadUsers() {
    const list = await fetchJson("/api/portal/users");
    document.getElementById("user-table-body").innerHTML = list.map((u) =>
      '<tr class="' + (u.active ? "" : "inactive-row") + '">' +
      "<td>" + escapeHtmlClient(u.name) + "</td>" +
      "<td>" + escapeHtmlClient(u.email) + "</td>" +
      '<td><span class="role-pill">' + u.role + "</span></td>" +
      "<td>" + (u.active ? "Actief" : "Inactief") + "</td>" +
      '<td><button class="portal-btn secondary" data-edit="' + u.id + '" style="padding:4px 10px; margin-right:6px;">Bewerken</button>' +
      (u.active ? '<button class="portal-btn danger" data-deactivate="' + u.id + '" style="padding:4px 10px;">Deactiveren</button>' : "") +
      "</td></tr>"
    ).join("");

    window.__users = list;
    document.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => openUserModal(window.__users.find((u) => u.id === btn.dataset.edit)));
    });
    document.querySelectorAll("[data-deactivate]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Dit teamlid deactiveren?")) return;
        await fetchJson("/api/portal/users/" + btn.dataset.deactivate + "/deactivate", { method: "PATCH" });
        loadUsers();
      });
    });
  }

  function openUserModal(user) {
    document.getElementById("user-modal-title").textContent = user ? "Teamlid bewerken" : "Nieuw teamlid";
    document.getElementById("u-id").value = user ? user.id : "";
    document.getElementById("u-name").value = user ? user.name : "";
    document.getElementById("u-email").value = user ? user.email : "";
    document.getElementById("u-role").value = user ? user.role : "teamlid";
    document.getElementById("u-password").value = "";
    document.getElementById("u-password-label").textContent = user ? "Nieuw wachtwoord (leeg = ongewijzigd)" : "Wachtwoord";
    document.getElementById("user-modal-backdrop").classList.add("open");
  }

  document.getElementById("new-user-btn").addEventListener("click", () => openUserModal(null));
  document.getElementById("cancel-user-btn").addEventListener("click", () => document.getElementById("user-modal-backdrop").classList.remove("open"));

  document.getElementById("user-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("u-id").value;
    const payload = {
      name: document.getElementById("u-name").value,
      email: document.getElementById("u-email").value,
      role: document.getElementById("u-role").value,
    };
    const password = document.getElementById("u-password").value;
    if (password) payload.password = password;

    try {
      if (id) {
        await fetchJson("/api/portal/users/" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        if (!password) { alert("Wachtwoord is verplicht voor een nieuw teamlid."); return; }
        await fetchJson("/api/portal/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      document.getElementById("user-modal-backdrop").classList.remove("open");
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  });

  loadStages();
  loadUsers();
</script>
</body>
</html>`;
}

module.exports = { settingsPage };
