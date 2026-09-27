const { PORTAL_BRAND_HEAD, PORTAL_SCRIPT, portalNav } = require("./brandHead");

function clientDetailPage({ name, role }, clientId) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Klantprofiel — Branch Team Tool</title>
${PORTAL_BRAND_HEAD}
<style>
  .back-link { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 12px; font-size: 0.875rem; font-weight: 600; text-decoration: none; color: var(--text-light); }
  .back-link:hover { color: var(--ink); }
  .detail-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
  @media (max-width: 900px) { .detail-layout { grid-template-columns: 1fr; } }
  .stack { display: flex; flex-direction: column; gap: 16px; }
  dl.facts { display: grid; grid-template-columns: 9rem 1fr; gap: 10px 16px; margin: 0; font-size: 0.9rem; }
  dl.facts dt { color: var(--text-light); font-weight: 600; }
  dl.facts dd { margin: 0; color: var(--ink); overflow-wrap: anywhere; }
  .clamp { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; line-clamp: 3; overflow: hidden; white-space: pre-line; }
  .read-more { margin-top: 4px; padding: 0; border: 0; background: none; font: inherit; font-size: 0.85rem; font-weight: 700; color: var(--link); cursor: pointer; text-decoration: underline; text-decoration-color: color-mix(in srgb, currentColor 35%, transparent); text-underline-offset: 3px; }
  .read-more:hover { text-decoration-color: currentColor; }
  .full-text { white-space: pre-line; overflow-wrap: anywhere; font-size: 0.95rem; line-height: 1.65; color: var(--ink); margin: 12px 0 0; }
  @media (max-width: 480px) { dl.facts { grid-template-columns: 1fr; gap: 2px; } dl.facts dd { margin-bottom: 8px; } }
  .progress { height: 6px; border-radius: 999px; background: var(--surface-sunken); overflow: hidden; margin: 4px 0 12px; }
  .progress > span { display: block; width: 100%; height: 100%; background: var(--branch-green); border-radius: inherit; transform-origin: left; transform: scaleX(0); transition: transform 300ms var(--ease-out); }
  .deliverable-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--hairline); }
  .deliverable-row label { flex: 1; display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: var(--ink); cursor: pointer; }
  .deliverable-row input { width: 17px; height: 17px; accent-color: var(--branch-green); flex: none; }
  .deliverable-row.completed .d-name { text-decoration: line-through; color: var(--text-light); }
  .deliverable-row .d-due { color: var(--text-light); font-size: 0.8rem; white-space: nowrap; }
  .add-deliverable-form { display: grid; grid-template-columns: 1fr 160px auto; gap: 8px; margin-top: 14px; align-items: end; }
  @media (max-width: 560px) { .add-deliverable-form { grid-template-columns: 1fr 1fr; } .add-deliverable-form .field:first-child { grid-column: 1 / -1; } }
  .task-mini { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 0.9rem; padding: 8px 0; border-bottom: 1px solid var(--hairline); color: var(--ink); }
  .section-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
  .section-head .section-title { margin: 0; }
  .stack-form { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
  .file-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 12px; }
  .file-row input[type=file] { font: inherit; font-size: 0.85rem; max-width: 100%; }
</style>
</head>
<body>
${portalNav({ active: "clients", role, name })}
<main class="portal-main">
  <a class="back-link" href="/portal/clients">← Alle klanten</a>
  <div class="page-head">
    <h1 id="client-name">Laden…</h1>
  </div>

  <div class="detail-layout" id="detail-layout">
    <div class="stack">
      <section class="portal-card" aria-labelledby="h-profile">
        <div class="section-head">
          <h2 class="section-title" id="h-profile">Bedrijfsgegevens</h2>
          ${role === "admin" ? '<button type="button" class="portal-btn secondary small" id="edit-profile-btn">Bewerken</button>' : ""}
        </div>
        <dl class="facts">
          <dt>Contactpersoon</dt><dd id="f-contact">—</dd>
          <dt>E-mail</dt><dd id="f-email">—</dd>
          <dt>Telefoon</dt><dd id="f-phone" class="num">—</dd>
          <dt>Sector</dt><dd id="f-sector">—</dd>
          <dt>Omschrijving</dt><dd><div class="clamp" id="f-desc">—</div><button type="button" class="read-more" data-full="f-desc" data-title="Omschrijving" hidden>Lees meer</button></dd>
        </dl>
      </section>

      <section class="portal-card" aria-labelledby="h-deliverables">
        <h2 class="section-title" id="h-deliverables">Deliverables</h2>
        <div class="muted num" id="deliverable-progress"></div>
        <div class="progress" aria-hidden="true"><span id="deliverable-bar"></span></div>
        <div id="deliverable-list"></div>
        <form class="add-deliverable-form" id="add-deliverable-form" hidden>
          <label class="field"><span>Nieuwe deliverable</span><input id="d-name" required></label>
          <label class="field"><span>Deadline</span><input id="d-deadline" type="date"></label>
          <button type="submit" class="portal-btn secondary" id="add-deliverable-btn">Toevoegen</button>
        </form>
      </section>

      <section class="portal-card" aria-labelledby="h-tasks">
        <h2 class="section-title" id="h-tasks">Taken voor deze klant</h2>
        <div id="linked-tasks"></div>
      </section>
    </div>

    <div class="stack">
      <section class="portal-card" aria-labelledby="h-stage">
        <h2 class="section-title" id="h-stage">Klanttraject</h2>
        <label class="field"><span class="sr-only">Huidige fase</span><select id="stage-select"></select></label>
      </section>

      <section class="portal-card" id="board-card" hidden aria-labelledby="h-board">
        <h2 class="section-title" id="h-board">Bestuursweergave</h2>
        <dl class="facts">
          <dt>Contractwaarde</dt><dd class="num" id="b-value"></dd>
          <dt>Samenwerking</dt><dd id="b-status"></dd>
          <dt>Notities</dt><dd><div class="clamp" id="b-notes"></div><button type="button" class="read-more" data-full="b-notes" data-title="Strategische notities" hidden>Lees meer</button></dd>
        </dl>
        <form class="stack-form" id="board-edit" hidden>
          <label class="field"><span>Contractwaarde (€)</span><input id="edit-value" type="number" step="0.01" min="0" inputmode="decimal"></label>
          <label class="field"><span>Status samenwerking</span>
            <select id="edit-status">
              <option value="prospect">Prospect</option>
              <option value="in_gesprek">In gesprek</option>
              <option value="actieve_klant">Actieve klant</option>
              <option value="afgerond">Afgerond</option>
            </select>
          </label>
          <label class="field"><span>Strategische notities</span><textarea id="edit-notes"></textarea></label>
          <button type="submit" class="portal-btn" id="save-board-btn" style="align-self:flex-start;">Opslaan</button>
        </form>
      </section>

      <section class="portal-card" id="contract-card" hidden aria-labelledby="h-contract">
        <h2 class="section-title" id="h-contract">Contract</h2>
        <div id="contract-info"></div>
        <div class="file-row" id="contract-admin-controls" hidden>
          <label class="sr-only" for="contract-file-input">Contract (PDF)</label>
          <input type="file" id="contract-file-input" accept="application/pdf">
          <button class="portal-btn secondary" id="contract-upload-btn" type="button">Uploaden</button>
        </div>
      </section>
    </div>
  </div>
</main>

<div class="modal-backdrop" id="text-modal-backdrop">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="text-modal-title" style="max-width:600px;">
    <div class="modal-header">
      <h2 id="text-modal-title"></h2>
      <button type="button" class="icon-btn modal-close" data-close-modal aria-label="Sluiten">✕</button>
    </div>
    <p class="full-text" id="text-modal-body"></p>
  </div>
</div>

<div class="modal-backdrop" id="profile-modal-backdrop">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
    <div class="modal-header">
      <h2 id="profile-modal-title">Bedrijfsgegevens bewerken</h2>
      <button type="button" class="icon-btn modal-close" data-close-modal aria-label="Sluiten">✕</button>
    </div>
    <form id="profile-form" novalidate>
      <label class="field"><span>Bedrijfsnaam</span><input id="p-name" required autocomplete="organization"></label>
      <label class="field"><span>Contactpersoon</span><input id="p-contact" autocomplete="name"></label>
      <label class="field"><span>E-mailadres</span><input id="p-email" type="email" autocomplete="email"></label>
      <label class="field"><span>Telefoonnummer</span><input id="p-phone" type="tel" autocomplete="tel" inputmode="tel"></label>
      <label class="field"><span>Sector</span><input id="p-sector"></label>
      <label class="field"><span>Korte omschrijving</span><textarea id="p-desc"></textarea></label>
      <p class="form-error" id="profile-form-error" role="alert"></p>
      <div class="modal-actions">
        <button type="button" class="portal-btn secondary" data-close-modal>Annuleren</button>
        <button type="submit" class="portal-btn" id="save-profile-btn">Opslaan</button>
      </div>
    </form>
  </div>
</div>

${PORTAL_SCRIPT}
<script>
  const ROLE = ${JSON.stringify(role)};
  const CLIENT_ID = ${JSON.stringify(clientId)};
  const IS_ADMIN = ROLE === "admin";
  let profile = null;

  const euro = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

  function setText(id, value) { document.getElementById(id).textContent = value || "—"; }

  // Long text shows 3 lines; "Lees meer" appears only when it's actually cut off.
  function updateReadMore() {
    document.querySelectorAll(".read-more").forEach((button) => {
      const text = document.getElementById(button.dataset.full);
      button.hidden = !text.offsetParent || text.scrollHeight <= text.clientHeight + 1;
    });
  }
  window.addEventListener("resize", updateReadMore);
  document.querySelectorAll(".read-more").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById("text-modal-title").textContent = button.dataset.title + " — " + profile.name;
      document.getElementById("text-modal-body").textContent = document.getElementById(button.dataset.full).textContent;
      openModal(document.getElementById("text-modal-backdrop"));
    });
  });

  async function loadProfile() {
    try {
      profile = await fetchJson("/api/portal/company-profiles/" + CLIENT_ID);
    } catch (err) {
      document.getElementById("client-name").textContent = "Klant niet gevonden";
      document.getElementById("detail-layout").innerHTML = '<p class="empty">Dit klantprofiel bestaat niet (meer) of je hebt er geen toegang toe. <a href="/portal/clients">Terug naar klanten</a></p>';
      throw err;
    }
    document.title = profile.name + " — Branch Team Tool";
    document.getElementById("client-name").textContent = profile.name;
    setText("f-contact", profile.contactPerson);
    const emailEl = document.getElementById("f-email");
    emailEl.innerHTML = profile.contactEmail
      ? '<a href="mailto:' + escapeHtmlClient(profile.contactEmail) + '">' + escapeHtmlClient(profile.contactEmail) + "</a>"
      : "—";
    const phoneEl = document.getElementById("f-phone");
    phoneEl.innerHTML = profile.contactPhone
      ? '<a href="tel:' + escapeHtmlClient(profile.contactPhone.replace(/[^+\\d]/g, "")) + '">' + escapeHtmlClient(profile.contactPhone) + "</a>"
      : "—";
    setText("f-sector", profile.sector);
    setText("f-desc", profile.shortDescription);

    const stages = await fetchJson("/api/portal/settings/journey-stages");
    const select = document.getElementById("stage-select");
    select.innerHTML = stages.stages.map((s) => '<option value="' + escapeHtmlClient(s) + '"' + (s === profile.currentStage ? " selected" : "") + ">" + escapeHtmlClient(s) + "</option>").join("");
    select.disabled = !IS_ADMIN;

    // board is only present at all when the API decided this role may see it —
    // nothing to hide client-side, there's simply no data to leak.
    if (profile.board) {
      document.getElementById("board-card").hidden = false;
      document.getElementById("b-value").textContent = profile.board.contractValue != null ? euro.format(profile.board.contractValue) : "—";
      document.getElementById("b-status").textContent = COLLABORATION_LABELS[profile.board.collaborationStatus] || profile.board.collaborationStatus || "—";
      setText("b-notes", profile.board.strategicNotes);
      if (IS_ADMIN) {
        document.getElementById("board-edit").hidden = false;
        document.getElementById("edit-value").value = profile.board.contractValue != null ? profile.board.contractValue : "";
        document.getElementById("edit-status").value = profile.board.collaborationStatus;
        document.getElementById("edit-notes").value = profile.board.strategicNotes || "";
      }
    }

    // contractFile is only ever present in the API response for admin/bestuur
    // (server-side projection) — same sensitivity class as board info, so the
    // whole card stays hidden for anyone else rather than showing an empty
    // "no contract" placeholder that implies access.
    if (ROLE === "admin" || ROLE === "bestuur") {
      document.getElementById("contract-card").hidden = false;
      renderContract();
    }
    updateReadMore();
  }

  // Attached once; loadProfile() re-runs after saves and must not stack listeners.
  const stageSelect = document.getElementById("stage-select");
  stageSelect.addEventListener("change", async () => {
    const previous = profile.currentStage;
    stageSelect.disabled = true;
    try {
      await fetchJson("/api/portal/company-profiles/" + CLIENT_ID + "/stage", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentStage: stageSelect.value }),
      });
      profile.currentStage = stageSelect.value;
      toast("Klanttraject bijgewerkt: " + stageSelect.value, "success");
    } catch (err) {
      stageSelect.value = previous;
      throw err;
    } finally {
      stageSelect.disabled = !IS_ADMIN;
    }
  });

  function renderContract() {
    const contractInfo = document.getElementById("contract-info");
    if (profile.contractFile) {
      const uploaded = profile.contractFile.uploadedAt ? new Date(profile.contractFile.uploadedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : "—";
      const sizeKb = profile.contractFile.size ? Math.round(profile.contractFile.size / 1024) + " KB" : "";
      contractInfo.innerHTML =
        '<dl class="facts"><dt>Bestand</dt><dd>' + escapeHtmlClient(profile.contractFile.filename) + (sizeKb ? ' <span class="muted num">(' + sizeKb + ")</span>" : "") + "</dd>" +
        "<dt>Geüpload op</dt><dd>" + uploaded + "</dd></dl>" +
        '<div class="file-row">' +
        '<a class="portal-btn secondary" href="/api/portal/company-profiles/' + encodeURIComponent(CLIENT_ID) + '/contract" target="_blank" rel="noopener">Openen</a>' +
        (IS_ADMIN ? '<button class="portal-btn ghost-danger" id="contract-delete-btn" type="button">Verwijderen</button>' : "") +
        "</div>";
      const deleteBtn = document.getElementById("contract-delete-btn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
          if (!confirm("Weet je zeker dat je dit contract wilt verwijderen?")) return;
          await withBusy(deleteBtn, () => fetchJson("/api/portal/company-profiles/" + CLIENT_ID + "/contract", { method: "DELETE" }));
          toast("Contract verwijderd", "success");
          loadProfile();
        });
      }
    } else {
      contractInfo.innerHTML = '<p class="muted" style="margin:0;">Nog geen contract geüpload.</p>';
    }
    document.getElementById("contract-admin-controls").hidden = !IS_ADMIN;
    const uploadBtn = document.getElementById("contract-upload-btn");
    if (uploadBtn) uploadBtn.textContent = profile.contractFile ? "Vervangen" : "Uploaden";
  }

  if (IS_ADMIN) {
    const profileBackdrop = document.getElementById("profile-modal-backdrop");
    document.getElementById("edit-profile-btn").addEventListener("click", () => {
      if (!profile) return;
      document.getElementById("p-name").value = profile.name;
      document.getElementById("p-contact").value = profile.contactPerson || "";
      document.getElementById("p-email").value = profile.contactEmail || "";
      document.getElementById("p-phone").value = profile.contactPhone || "";
      document.getElementById("p-sector").value = profile.sector || "";
      document.getElementById("p-desc").value = profile.shortDescription || "";
      document.getElementById("profile-form-error").textContent = "";
      openModal(profileBackdrop);
    });
    document.getElementById("profile-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("profile-form-error");
      errorEl.textContent = "";
      const nameInput = document.getElementById("p-name");
      const emailInput = document.getElementById("p-email");
      if (!nameInput.value.trim()) { errorEl.textContent = "Bedrijfsnaam is verplicht."; nameInput.focus(); return; }
      if (!emailInput.checkValidity()) { errorEl.textContent = "Vul een geldig e-mailadres in."; emailInput.focus(); return; }
      await withBusy(document.getElementById("save-profile-btn"), async () => {
        try {
          await fetchJson("/api/portal/company-profiles/" + CLIENT_ID, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: nameInput.value.trim(),
              contactPerson: document.getElementById("p-contact").value.trim(),
              contactEmail: emailInput.value.trim(),
              contactPhone: document.getElementById("p-phone").value.trim(),
              sector: document.getElementById("p-sector").value.trim(),
              shortDescription: document.getElementById("p-desc").value,
            }),
          });
        } catch (err) {
          errorEl.textContent = err.message;
          return;
        }
        closeModal(profileBackdrop);
        toast("Bedrijfsgegevens opgeslagen", "success");
        await loadProfile();
      });
    });

    document.getElementById("board-edit").addEventListener("submit", async (e) => {
      e.preventDefault();
      await withBusy(document.getElementById("save-board-btn"), async () => {
        const rawValue = document.getElementById("edit-value").value;
        await fetchJson("/api/portal/company-profiles/" + CLIENT_ID, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            board: {
              contractValue: rawValue ? Number(rawValue) : null,
              collaborationStatus: document.getElementById("edit-status").value,
              strategicNotes: document.getElementById("edit-notes").value,
            },
          }),
        });
        toast("Bestuursgegevens opgeslagen", "success");
        await loadProfile();
      });
    });

    const contractUploadBtn = document.getElementById("contract-upload-btn");
    contractUploadBtn.addEventListener("click", async () => {
      const fileInput = document.getElementById("contract-file-input");
      const file = fileInput.files[0];
      if (!file) { toast("Kies eerst een PDF-bestand.", "error"); fileInput.focus(); return; }
      const formData = new FormData();
      formData.append("contract", file);
      await withBusy(contractUploadBtn, async () => {
        const res = await fetch("/api/portal/company-profiles/" + CLIENT_ID + "/contract", { method: "POST", body: formData });
        if (res.status === 401) { window.location.href = "/portal/login"; return; }
        if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || "Uploaden mislukt."); }
        fileInput.value = "";
        toast("Contract geüpload", "success");
        await loadProfile();
      });
    });
  }

  async function loadDeliverables() {
    const items = await fetchJson("/api/portal/company-profiles/" + CLIENT_ID + "/deliverables");
    const done = items.filter((d) => d.completed).length;
    document.getElementById("deliverable-progress").textContent = items.length ? done + " van " + items.length + " afgerond" : "";
    document.getElementById("deliverable-bar").style.transform = "scaleX(" + (items.length ? done / items.length : 0) + ")";
    document.getElementById("deliverable-list").innerHTML = items.map((d) =>
      '<div class="deliverable-row' + (d.completed ? " completed" : "") + '">' +
      '<label><input type="checkbox" data-id="' + d.id + '"' + (d.completed ? " checked" : "") + (IS_ADMIN ? "" : " disabled") + ">" +
      '<span class="d-name">' + escapeHtmlClient(d.name) + "</span></label>" +
      (d.deadline ? '<span class="d-due">' + formatDate(d.deadline) + "</span>" : "") +
      (IS_ADMIN ? '<button type="button" class="icon-btn" data-delete="' + d.id + '" data-name="' + escapeHtmlClient(d.name) + '" aria-label="' + escapeHtmlClient(d.name) + ' verwijderen">✕</button>' : "") +
      "</div>"
    ).join("") || '<p class="muted" style="margin:0;">Nog geen deliverables.</p>';

    document.querySelectorAll("#deliverable-list input[type=checkbox]").forEach((cb) => {
      cb.addEventListener("change", async () => {
        cb.disabled = true;
        try {
          await fetchJson("/api/portal/deliverables/" + cb.dataset.id, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: cb.checked }),
          });
        } finally {
          loadDeliverables();
        }
      });
    });
    document.querySelectorAll("#deliverable-list button[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("“" + btn.dataset.name + "” verwijderen?")) return;
        await withBusy(btn, () => fetchJson("/api/portal/deliverables/" + btn.dataset.delete, { method: "DELETE" }));
        loadDeliverables();
      });
    });
  }

  if (IS_ADMIN) {
    const form = document.getElementById("add-deliverable-form");
    form.hidden = false;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await withBusy(document.getElementById("add-deliverable-btn"), async () => {
        await fetchJson("/api/portal/company-profiles/" + CLIENT_ID + "/deliverables", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: document.getElementById("d-name").value.trim(), deadline: document.getElementById("d-deadline").value || null }),
        });
        form.reset();
        document.getElementById("d-name").focus();
        await loadDeliverables();
      });
    });
  }

  async function loadLinkedTasks() {
    const list = await fetchJson("/api/portal/tasks?companyProfileId=" + CLIENT_ID);
    document.getElementById("linked-tasks").innerHTML = list.map((t) =>
      '<div class="task-mini"><span>' + escapeHtmlClient(t.title) + "</span>" +
      '<span class="badge' + (t.status === "klaar" ? " badge-blue" : "") + '">' + (STATUS_LABELS[t.status] || t.status) + "</span></div>"
    ).join("") || '<p class="muted" style="margin:0;">Geen taken gekoppeld.</p>';
  }

  loadProfile().then(() => { loadDeliverables(); loadLinkedTasks(); });
</script>
</body>
</html>`;
}

module.exports = { clientDetailPage };
