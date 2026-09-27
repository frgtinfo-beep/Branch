const { PORTAL_BRAND_HEAD, PORTAL_SCRIPT, portalNav } = require("./brandHead");

function settingsPage({ name, role }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Instellingen — Branch Team Tool</title>
${PORTAL_BRAND_HEAD}
<style>
  .settings-grid { display: grid; grid-template-columns: minmax(0, 380px) minmax(0, 1fr); gap: 16px; align-items: start; }
  @media (max-width: 960px) { .settings-grid { grid-template-columns: 1fr; } }
  .section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
  .section-head h2 { margin: 0; }
  .stage-row { display: flex; align-items: center; gap: 6px; padding: 4px 0; }
  .stage-row .stage-num { color: var(--text-light); width: 20px; font-size: 0.85rem; text-align: right; flex: none; }
  .stage-row input { flex: 1; }
  .add-stage-row { display: flex; gap: 8px; margin-top: 10px; }
  .add-stage-row input { flex: 1; }
  .stage-actions { display: flex; align-items: center; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
  .unsaved { font-size: 0.8rem; font-weight: 600; color: var(--warning-text); }
  .inactive-row td { color: var(--text-light); }
  .row-actions { display: flex; gap: 6px; justify-content: flex-end; }
  .user-email { color: var(--text-light); }
</style>
</head>
<body>
${portalNav({ active: "settings", role, name })}
<main class="portal-main">
  <div class="page-head"><h1>Instellingen</h1></div>

  <div class="settings-grid">
    <section class="portal-card" aria-labelledby="h-stages">
      <div class="section-head"><h2 class="section-title" id="h-stages">Klanttraject-fases</h2></div>
      <p class="muted" style="margin:-6px 0 12px;">De volgorde hier is de volgorde op elk klantprofiel.</p>
      <div id="stage-list"></div>
      <form class="add-stage-row" id="add-stage-form">
        <label class="sr-only" for="new-stage-name">Nieuwe fase</label>
        <input id="new-stage-name" placeholder="Nieuwe fase">
        <button type="submit" class="portal-btn secondary">Toevoegen</button>
      </form>
      <div class="stage-actions">
        <button type="button" class="portal-btn" id="save-stages-btn">Fases opslaan</button>
        <span class="unsaved" id="stages-dirty" hidden>Niet opgeslagen wijzigingen</span>
      </div>
      <p class="form-error" id="stages-error" role="alert" style="margin:10px 0 0;"></p>
    </section>

    <section class="portal-card" aria-labelledby="h-users">
      <div class="section-head">
        <h2 class="section-title" id="h-users">Teamleden</h2>
        <button type="button" class="portal-btn small" id="new-user-btn">+ Nieuw teamlid</button>
      </div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th scope="col">Naam</th><th scope="col">Rol</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Acties</span></th></tr></thead>
          <tbody id="user-table-body"><tr><td colspan="4" class="muted">Laden…</td></tr></tbody>
        </table>
      </div>
    </section>
  </div>
</main>

<div class="modal-backdrop" id="user-modal-backdrop">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
    <div class="modal-header">
      <h2 id="user-modal-title">Nieuw teamlid</h2>
      <button type="button" class="icon-btn modal-close" data-close-modal aria-label="Sluiten">✕</button>
    </div>
    <form id="user-form">
      <input type="hidden" id="u-id">
      <label class="field"><span>Naam</span><input id="u-name" required autocomplete="off"></label>
      <label class="field"><span>E-mailadres</span><input id="u-email" type="email" required autocomplete="off"></label>
      <label class="field"><span>Rol</span>
        <select id="u-role">
          <option value="teamlid">Teamlid</option>
          <option value="bestuur">Bestuur</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <label class="field"><span id="u-password-label">Wachtwoord</span><input id="u-password" type="text" minlength="8" autocomplete="off" placeholder="Minimaal 8 tekens"></label>
      <p class="form-error" id="user-form-error" role="alert"></p>
      <div class="modal-actions">
        <button type="button" class="portal-btn secondary" data-close-modal>Annuleren</button>
        <button type="submit" class="portal-btn" id="save-user-btn">Opslaan</button>
      </div>
    </form>
  </div>
</div>

${PORTAL_SCRIPT}
<script>
  let stages = [];
  let savedStages = [];
  let users = [];
  const userBackdrop = document.getElementById("user-modal-backdrop");

  function markDirty() {
    document.getElementById("stages-dirty").hidden = JSON.stringify(stages) === JSON.stringify(savedStages);
  }

  function renderStages(focusSelector) {
    document.getElementById("stage-list").innerHTML = stages.map((s, i) =>
      '<div class="stage-row">' +
      '<span class="stage-num num" aria-hidden="true">' + (i + 1) + "</span>" +
      '<input value="' + escapeHtmlClient(s) + '" data-index="' + i + '" aria-label="Fase ' + (i + 1) + '">' +
      '<button type="button" class="icon-btn" data-up="' + i + '" aria-label="' + escapeHtmlClient(s) + ' omhoog"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
      '<button type="button" class="icon-btn" data-down="' + i + '" aria-label="' + escapeHtmlClient(s) + ' omlaag"' + (i === stages.length - 1 ? " disabled" : "") + ">↓</button>" +
      '<button type="button" class="icon-btn" data-remove="' + i + '" aria-label="' + escapeHtmlClient(s) + ' verwijderen">✕</button>' +
      "</div>"
    ).join("") || '<p class="empty">Nog geen fases.</p>';
    markDirty();
    if (focusSelector) { const el = document.querySelector(focusSelector); if (el) el.focus(); }

    document.querySelectorAll("#stage-list input").forEach((input) => {
      input.addEventListener("input", () => { stages[Number(input.dataset.index)] = input.value; markDirty(); });
    });
    document.querySelectorAll("#stage-list [data-up]").forEach((btn) => {
      btn.addEventListener("click", () => { const i = Number(btn.dataset.up); [stages[i - 1], stages[i]] = [stages[i], stages[i - 1]]; renderStages('[data-up="' + (i - 1) + '"]:not(:disabled), [data-down="' + (i - 1) + '"]'); });
    });
    document.querySelectorAll("#stage-list [data-down]").forEach((btn) => {
      btn.addEventListener("click", () => { const i = Number(btn.dataset.down); [stages[i + 1], stages[i]] = [stages[i], stages[i + 1]]; renderStages('[data-down="' + (i + 1) + '"]:not(:disabled), [data-up="' + (i + 1) + '"]'); });
    });
    document.querySelectorAll("#stage-list [data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => { stages.splice(Number(btn.dataset.remove), 1); renderStages("#new-stage-name"); });
    });
  }

  async function loadStages() {
    const data = await fetchJson("/api/portal/settings/journey-stages");
    stages = data.stages.slice();
    savedStages = data.stages.slice();
    renderStages();
  }

  document.getElementById("add-stage-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("new-stage-name");
    if (!input.value.trim()) return;
    stages.push(input.value.trim());
    input.value = "";
    renderStages("#new-stage-name");
  });

  document.getElementById("save-stages-btn").addEventListener("click", async (e) => {
    const errorEl = document.getElementById("stages-error");
    errorEl.textContent = "";
    await withBusy(e.currentTarget, async () => {
      try {
        await fetchJson("/api/portal/settings/journey-stages", {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stages }),
        });
      } catch (err) {
        errorEl.textContent = err.message;
        return;
      }
      toast("Fases opgeslagen", "success");
      await loadStages();
    });
  });

  async function loadUsers() {
    users = await fetchJson("/api/portal/users");
    document.getElementById("user-table-body").innerHTML = users.map((u) =>
      '<tr class="' + (u.active ? "" : "inactive-row") + '">' +
      "<td><strong>" + escapeHtmlClient(u.name) + '</strong><br><span class="user-email">' + escapeHtmlClient(u.email) + "</span></td>" +
      '<td><span class="badge' + (u.role === "admin" ? " badge-blue" : "") + '">' + (ROLE_LABELS[u.role] || u.role) + "</span></td>" +
      "<td>" + (u.active ? "Actief" : "Inactief") + "</td>" +
      '<td><div class="row-actions"><button type="button" class="portal-btn secondary small" data-edit="' + u.id + '" aria-label="' + escapeHtmlClient(u.name) + ' bewerken">Bewerken</button>' +
      (u.active ? '<button type="button" class="portal-btn ghost-danger small" data-deactivate="' + u.id + '" aria-label="' + escapeHtmlClient(u.name) + ' deactiveren">Deactiveren</button>' : "") +
      "</div></td></tr>"
    ).join("") || '<tr><td colspan="4" class="muted">Nog geen teamleden.</td></tr>';

    document.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => openUserModal(users.find((u) => u.id === btn.dataset.edit)));
    });
    document.querySelectorAll("[data-deactivate]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const user = users.find((u) => u.id === btn.dataset.deactivate);
        if (!confirm((user ? user.name : "Dit teamlid") + " deactiveren? Diegene kan dan niet meer inloggen.")) return;
        await withBusy(btn, () => fetchJson("/api/portal/users/" + btn.dataset.deactivate + "/deactivate", { method: "PATCH" }));
        toast("Teamlid gedeactiveerd", "success");
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
    const password = document.getElementById("u-password");
    password.value = "";
    password.required = !user;
    document.getElementById("u-password-label").textContent = user ? "Nieuw wachtwoord (leeg = ongewijzigd)" : "Wachtwoord";
    document.getElementById("user-form-error").textContent = "";
    openModal(userBackdrop);
  }

  document.getElementById("new-user-btn").addEventListener("click", () => openUserModal(null));

  document.getElementById("user-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("user-form-error");
    errorEl.textContent = "";
    const id = document.getElementById("u-id").value;
    const payload = {
      name: document.getElementById("u-name").value.trim(),
      email: document.getElementById("u-email").value.trim(),
      role: document.getElementById("u-role").value,
    };
    const password = document.getElementById("u-password").value;
    if (password) payload.password = password;

    await withBusy(document.getElementById("save-user-btn"), async () => {
      try {
        if (id) {
          await fetchJson("/api/portal/users/" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        } else {
          await fetchJson("/api/portal/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        }
      } catch (err) {
        errorEl.textContent = err.message;
        return;
      }
      closeModal(userBackdrop);
      toast(id ? "Teamlid opgeslagen" : "Teamlid toegevoegd", "success");
      loadUsers();
    });
  });

  window.addEventListener("beforeunload", (event) => {
    if (JSON.stringify(stages) !== JSON.stringify(savedStages)) event.preventDefault();
  });

  loadStages();
  loadUsers();
</script>
</body>
</html>`;
}

module.exports = { settingsPage };
