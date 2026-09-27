const { PORTAL_BRAND_HEAD, PORTAL_SCRIPT, portalNav } = require("./brandHead");

function clientsPage({ name, role }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Klanten — Branch Team Tool</title>
${PORTAL_BRAND_HEAD}
<style>
  .client-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }
  .client-card { display: flex; flex-direction: column; gap: 4px; text-decoration: none; color: inherit; }
  .client-card h2 { margin: 0 0 2px; font-size: 1rem; font-weight: 700; color: var(--ink); }
  .client-card p { margin: 0; font-size: 0.85rem; color: var(--text-light); }
  .client-card .badge { align-self: flex-start; margin-top: 10px; }
  .search { margin-bottom: 18px; max-width: 320px; }
</style>
</head>
<body>
${portalNav({ active: "clients", role, name })}
<main class="portal-main">
  <div class="page-head">
    <h1>Klanten</h1>
    ${role === "admin" ? '<button type="button" class="portal-btn" id="new-client-btn">+ Nieuw bedrijf</button>' : ""}
  </div>
  <label class="field search"><span class="sr-only">Zoek klant</span><input type="search" id="client-search" placeholder="Zoek op naam, sector, contactpersoon of nummer"></label>
  <div class="client-grid" id="client-grid" aria-busy="true"></div>
</main>

<div class="modal-backdrop" id="modal-backdrop">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="client-modal-title">
    <div class="modal-header">
      <h2 id="client-modal-title">Nieuw bedrijfsprofiel</h2>
      <button type="button" class="icon-btn modal-close" data-close-modal aria-label="Sluiten">✕</button>
    </div>
    <form id="client-form">
      <label class="field"><span>Bedrijfsnaam</span><input id="c-name" required autocomplete="organization"></label>
      <label class="field"><span>Contactpersoon</span><input id="c-contact" autocomplete="name"></label>
      <label class="field"><span>E-mailadres</span><input id="c-email" type="email" autocomplete="email"></label>
      <label class="field"><span>Telefoonnummer</span><input id="c-phone" type="tel" autocomplete="tel" inputmode="tel"></label>
      <label class="field"><span>Sector</span><input id="c-sector"></label>
      <label class="field"><span>Korte omschrijving</span><textarea id="c-desc"></textarea></label>
      <p class="form-error" id="client-form-error" role="alert"></p>
      <div class="modal-actions">
        <button type="button" class="portal-btn secondary" data-close-modal>Annuleren</button>
        <button type="submit" class="portal-btn" id="create-client-btn">Aanmaken</button>
      </div>
    </form>
  </div>
</div>

${PORTAL_SCRIPT}
<script>
  const IS_ADMIN = ${JSON.stringify(role === "admin")};
  let clients = [];

  function renderClients() {
    const query = document.getElementById("client-search").value.trim().toLowerCase();
    const list = query
      ? clients.filter((c) => [c.name, c.sector, c.contactPerson, c.contactPhone].some((v) => v && v.toLowerCase().includes(query)))
      : clients;
    const grid = document.getElementById("client-grid");
    if (!clients.length) {
      grid.innerHTML = '<p class="empty" style="grid-column:1/-1;">Nog geen klanten toegevoegd.' + (IS_ADMIN ? " Gebruik “+ Nieuw bedrijf” om de eerste aan te maken." : "") + "</p>";
      return;
    }
    grid.innerHTML = list.map((c) =>
      '<a class="client-card portal-card" href="/portal/clients/' + c.id + '">' +
      "<h2>" + escapeHtmlClient(c.name) + "</h2>" +
      (c.sector ? "<p>" + escapeHtmlClient(c.sector) + "</p>" : "") +
      (c.contactPerson ? "<p>" + escapeHtmlClient(c.contactPerson) + "</p>" : "") +
      (c.contactPhone ? '<p class="num">' + escapeHtmlClient(c.contactPhone) + "</p>" : "") +
      (c.currentStage ? '<span class="badge badge-blue">' + escapeHtmlClient(c.currentStage) + "</span>" : "") +
      "</a>"
    ).join("") || '<p class="empty" style="grid-column:1/-1;">Geen klanten gevonden voor “' + escapeHtmlClient(query) + '”.</p>';
  }

  async function loadClients() {
    clients = await fetchJson("/api/portal/company-profiles");
    document.getElementById("client-grid").setAttribute("aria-busy", "false");
    renderClients();
  }

  document.getElementById("client-search").addEventListener("input", renderClients);

  const newBtn = document.getElementById("new-client-btn");
  if (newBtn) {
    const backdrop = document.getElementById("modal-backdrop");
    newBtn.addEventListener("click", () => {
      document.getElementById("client-form-error").textContent = "";
      openModal(backdrop);
    });
    document.getElementById("client-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("client-form-error");
      errorEl.textContent = "";
      await withBusy(document.getElementById("create-client-btn"), async () => {
        try {
          await fetchJson("/api/portal/company-profiles", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: document.getElementById("c-name").value.trim(),
              contactPerson: document.getElementById("c-contact").value,
              contactEmail: document.getElementById("c-email").value,
              contactPhone: document.getElementById("c-phone").value,
              sector: document.getElementById("c-sector").value,
              shortDescription: document.getElementById("c-desc").value,
            }),
          });
        } catch (err) {
          errorEl.textContent = err.message;
          return;
        }
        closeModal(backdrop);
        document.getElementById("client-form").reset();
        toast("Bedrijf aangemaakt", "success");
        loadClients();
      });
    });
  }

  loadClients();
</script>
</body>
</html>`;
}

module.exports = { clientsPage };
