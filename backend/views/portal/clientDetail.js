const { PORTAL_BRAND_HEAD, portalNav } = require("./brandHead");

function clientDetailPage({ name, role }, clientId) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Klantprofiel — Branch Team Tool</title>
${PORTAL_BRAND_HEAD}
<style>
  .back-link { display: inline-block; margin-bottom: 14px; font-size: 0.85rem; font-weight: 600; }
  .detail-grid { display: grid; grid-template-columns: 1fr; gap: 16px; max-width: 720px; }
  .field-row { margin-bottom: 8px; font-size: 0.9rem; }
  .field-row strong { color: var(--text-light); font-weight: 600; margin-right: 6px; }
  select#stage-select { padding: 8px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-family: inherit; }
  .board-card { border-left: 4px solid var(--branch-blue); }
  .deliverable-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
  .deliverable-row.completed span.d-name { text-decoration: line-through; color: var(--text-light); }
  .deliverable-row .d-name { flex: 1; }
  .progress-line { font-size: 0.8rem; color: var(--text-light); margin-bottom: 10px; }
  .add-deliverable-form { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
  .add-deliverable-form input { flex: 1; min-width: 140px; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 8px; font-family: inherit; }
  .task-mini { font-size: 0.85rem; padding: 6px 0; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; }
</style>
</head>
<body>
${portalNav({ active: "clients", role, name })}
<main class="portal-main">
  <a class="back-link" href="/portal/clients">← Terug naar klanten</a>
  <h1 class="portal-title" id="client-name">Laden...</h1>
  <div class="detail-grid">
    <div class="portal-card">
      <div class="field-row"><strong>Contactpersoon:</strong><span id="f-contact"></span></div>
      <div class="field-row"><strong>E-mail:</strong><span id="f-email"></span></div>
      <div class="field-row"><strong>Sector:</strong><span id="f-sector"></span></div>
      <div class="field-row"><strong>Omschrijving:</strong><span id="f-desc"></span></div>
      <div class="field-row" style="margin-top:12px;">
        <strong>Klanttraject:</strong>
        <select id="stage-select"></select>
      </div>
    </div>

    <div class="portal-card board-card" id="board-card" style="display:none;">
      <h2 style="font-size:0.95rem; margin-top:0;">Bestuursweergave</h2>
      <div class="field-row"><strong>Contractwaarde:</strong><span id="b-value"></span></div>
      <div class="field-row"><strong>Status samenwerking:</strong><span id="b-status"></span></div>
      <div class="field-row"><strong>Strategische notities:</strong><br><span id="b-notes"></span></div>
      <div id="board-edit" style="display:none; margin-top:12px;">
        <label style="display:block; font-size:0.8rem; font-weight:600; margin-bottom:4px;">Contractwaarde</label>
        <input id="edit-value" type="number" step="0.01" style="width:100%; padding:8px; border:1px solid #d1d5db; border-radius:8px; margin-bottom:10px;">
        <label style="display:block; font-size:0.8rem; font-weight:600; margin-bottom:4px;">Status samenwerking</label>
        <select id="edit-status" style="width:100%; padding:8px; border:1px solid #d1d5db; border-radius:8px; margin-bottom:10px;">
          <option value="prospect">Prospect</option>
          <option value="in_gesprek">In gesprek</option>
          <option value="actieve_klant">Actieve klant</option>
          <option value="afgerond">Afgerond</option>
        </select>
        <label style="display:block; font-size:0.8rem; font-weight:600; margin-bottom:4px;">Strategische notities</label>
        <textarea id="edit-notes" style="width:100%; min-height:70px; padding:8px; border:1px solid #d1d5db; border-radius:8px; margin-bottom:10px;"></textarea>
        <button class="portal-btn" id="save-board-btn">Opslaan</button>
      </div>
    </div>

    <div class="portal-card">
      <h2 style="font-size:0.95rem; margin-top:0;">Contract</h2>
      <div id="contract-info"></div>
      <div id="contract-admin-controls" style="display:none; margin-top:10px; gap:8px; flex-wrap:wrap; align-items:center;">
        <input type="file" id="contract-file-input" accept="application/pdf">
        <button class="portal-btn secondary" id="contract-upload-btn" type="button">Uploaden</button>
      </div>
    </div>

    <div class="portal-card">
      <h2 style="font-size:0.95rem; margin-top:0;">Deliverables</h2>
      <div class="progress-line" id="deliverable-progress"></div>
      <div id="deliverable-list"></div>
      <form class="add-deliverable-form" id="add-deliverable-form" style="display:none;">
        <input id="d-name" placeholder="Naam" required>
        <input id="d-deadline" type="date">
        <button type="submit" class="portal-btn secondary">Toevoegen</button>
      </form>
    </div>

    <div class="portal-card">
      <h2 style="font-size:0.95rem; margin-top:0;">Taken voor deze klant</h2>
      <div id="linked-tasks"></div>
    </div>
  </div>
</main>

<script>
  const ROLE = ${JSON.stringify(role)};
  const CLIENT_ID = ${JSON.stringify(clientId)};
  let profile = null;

  function escapeHtmlClient(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  async function fetchJson(url, opts) {
    const res = await fetch(url, opts);
    if (res.status === 401) { window.location.href = "/portal/login"; throw new Error("unauthenticated"); }
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || ("HTTP " + res.status)); }
    return res.json();
  }

  async function loadProfile() {
    profile = await fetchJson("/api/portal/company-profiles/" + CLIENT_ID);
    document.getElementById("client-name").textContent = profile.name;
    document.getElementById("f-contact").textContent = profile.contactPerson || "—";
    document.getElementById("f-email").textContent = profile.contactEmail || "—";
    document.getElementById("f-sector").textContent = profile.sector || "—";
    document.getElementById("f-desc").textContent = profile.shortDescription || "—";

    const stages = await fetchJson("/api/portal/settings/journey-stages");
    const select = document.getElementById("stage-select");
    select.innerHTML = stages.stages.map((s) => '<option value="' + escapeHtmlClient(s) + '"' + (s === profile.currentStage ? " selected" : "") + ">" + escapeHtmlClient(s) + "</option>").join("");
    select.disabled = ROLE !== "admin";
    select.addEventListener("change", async () => {
      await fetchJson("/api/portal/company-profiles/" + CLIENT_ID + "/stage", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentStage: select.value }),
      });
    });

    // board is only present at all when the API decided this role may see it —
    // nothing to hide client-side, there's simply no data to leak.
    if (profile.board) {
      document.getElementById("board-card").style.display = "block";
      document.getElementById("b-value").textContent = profile.board.contractValue != null ? "€ " + profile.board.contractValue : "—";
      document.getElementById("b-status").textContent = profile.board.collaborationStatus;
      document.getElementById("b-notes").textContent = profile.board.strategicNotes || "—";
      if (ROLE === "admin") {
        document.getElementById("board-edit").style.display = "block";
        document.getElementById("edit-value").value = profile.board.contractValue != null ? profile.board.contractValue : "";
        document.getElementById("edit-status").value = profile.board.collaborationStatus;
        document.getElementById("edit-notes").value = profile.board.strategicNotes || "";
      }
    }

    loadContract();
  }

  function loadContract() {
    const contractInfo = document.getElementById("contract-info");
    if (profile.contractFile) {
      const uploaded = profile.contractFile.uploadedAt ? new Date(profile.contractFile.uploadedAt).toLocaleDateString("nl-NL") : "—";
      const sizeKb = profile.contractFile.size ? Math.round(profile.contractFile.size / 1024) + " KB" : "";
      contractInfo.innerHTML =
        '<div class="field-row"><strong>Bestand:</strong>' + escapeHtmlClient(profile.contractFile.filename) + " " + sizeKb + "</div>" +
        '<div class="field-row"><strong>Geüpload op:</strong>' + uploaded + "</div>" +
        '<div style="margin-top:8px; display:flex; gap:8px;">' +
        '<button class="portal-btn secondary" id="contract-open-btn" type="button">Openen</button>' +
        (ROLE === "admin" ? '<button class="portal-btn secondary" id="contract-delete-btn" type="button">Verwijderen</button>' : "") +
        "</div>";
      document.getElementById("contract-open-btn").addEventListener("click", () => {
        window.open("/api/portal/company-profiles/" + CLIENT_ID + "/contract", "_blank");
      });
      const deleteBtn = document.getElementById("contract-delete-btn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
          if (!confirm("Weet je zeker dat je dit contract wilt verwijderen?")) return;
          await fetchJson("/api/portal/company-profiles/" + CLIENT_ID + "/contract", { method: "DELETE" });
          loadProfile();
        });
      }
    } else {
      contractInfo.innerHTML = '<p style="font-size:0.85rem; color:#6b7280;">Nog geen contract geüpload.</p>';
    }

    if (ROLE === "admin") {
      document.getElementById("contract-admin-controls").style.display = "flex";
    }
  }

  const saveBoardBtn = document.getElementById("save-board-btn");
  if (saveBoardBtn) {
    saveBoardBtn.addEventListener("click", async () => {
      await fetchJson("/api/portal/company-profiles/" + CLIENT_ID, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board: {
            contractValue: document.getElementById("edit-value").value ? Number(document.getElementById("edit-value").value) : null,
            collaborationStatus: document.getElementById("edit-status").value,
            strategicNotes: document.getElementById("edit-notes").value,
          },
        }),
      });
      loadProfile();
    });
  }

  const contractUploadBtn = document.getElementById("contract-upload-btn");
  if (contractUploadBtn) {
    contractUploadBtn.addEventListener("click", async () => {
      const fileInput = document.getElementById("contract-file-input");
      const file = fileInput.files[0];
      if (!file) { alert("Kies eerst een PDF-bestand."); return; }
      const formData = new FormData();
      formData.append("contract", file);
      contractUploadBtn.disabled = true;
      try {
        const res = await fetch("/api/portal/company-profiles/" + CLIENT_ID + "/contract", { method: "POST", body: formData });
        if (res.status === 401) { window.location.href = "/portal/login"; return; }
        if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || ("HTTP " + res.status)); }
        fileInput.value = "";
        await loadProfile();
      } catch (err) {
        alert(err.message || "Uploaden mislukt.");
      } finally {
        contractUploadBtn.disabled = false;
      }
    });
  }

  async function loadDeliverables() {
    const items = await fetchJson("/api/portal/company-profiles/" + CLIENT_ID + "/deliverables");
    const done = items.filter((d) => d.completed).length;
    document.getElementById("deliverable-progress").textContent = done + " van " + items.length + " afgerond";
    document.getElementById("deliverable-list").innerHTML = items.map((d) =>
      '<div class="deliverable-row' + (d.completed ? " completed" : "") + '">' +
      '<input type="checkbox" data-id="' + d.id + '"' + (d.completed ? " checked" : "") + (ROLE === "admin" ? "" : " disabled") + ">" +
      '<span class="d-name">' + escapeHtmlClient(d.name) + (d.deadline ? " (" + d.deadline + ")" : "") + "</span>" +
      (ROLE === "admin" ? '<button class="portal-btn secondary" data-delete="' + d.id + '" style="padding:4px 10px;">✕</button>' : "") +
      "</div>"
    ).join("") || "<p style=\\"font-size:0.85rem; color:#6b7280;\\">Nog geen deliverables.</p>";

    document.querySelectorAll("#deliverable-list input[type=checkbox]").forEach((cb) => {
      cb.addEventListener("change", async () => {
        await fetchJson("/api/portal/deliverables/" + cb.dataset.id, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: cb.checked }),
        });
        loadDeliverables();
      });
    });
    document.querySelectorAll("#deliverable-list button[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await fetchJson("/api/portal/deliverables/" + btn.dataset.delete, { method: "DELETE" });
        loadDeliverables();
      });
    });
  }

  if (ROLE === "admin") {
    document.getElementById("add-deliverable-form").style.display = "flex";
    document.getElementById("add-deliverable-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      await fetchJson("/api/portal/company-profiles/" + CLIENT_ID + "/deliverables", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: document.getElementById("d-name").value, deadline: document.getElementById("d-deadline").value || null }),
      });
      document.getElementById("d-name").value = "";
      document.getElementById("d-deadline").value = "";
      loadDeliverables();
    });
  }

  async function loadLinkedTasks() {
    const list = await fetchJson("/api/portal/tasks?companyProfileId=" + CLIENT_ID);
    document.getElementById("linked-tasks").innerHTML = list.map((t) =>
      '<div class="task-mini"><span>' + escapeHtmlClient(t.title) + "</span><span>" + t.status + "</span></div>"
    ).join("") || "<p style=\\"font-size:0.85rem; color:#6b7280;\\">Geen taken gekoppeld.</p>";
  }

  loadProfile();
  loadDeliverables();
  loadLinkedTasks();
</script>
</body>
</html>`;
}

module.exports = { clientDetailPage };
