const { PORTAL_BRAND_HEAD, portalNav } = require("./brandHead");

function clientsPage({ name, role }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Klanten — Branch Team Tool</title>
${PORTAL_BRAND_HEAD}
<style>
  .toolbar { margin-bottom: 18px; }
  .client-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
  .client-card { text-decoration: none; color: inherit; }
  .client-card h3 { margin: 0 0 6px; font-size: 1rem; color: var(--ink); }
  .client-card p { margin: 0 0 4px; font-size: 0.8rem; color: var(--text-light); }
  .stage-pill { display: inline-block; margin-top: 8px; font-size: 0.7rem; font-weight: 700; padding: 3px 10px; border-radius: 999px; background: rgba(11,109,255,0.1); color: var(--branch-blue-dark); }
  .modal-backdrop { position: fixed; inset: 0; background: rgba(5,7,15,0.4); display: none; align-items: center; justify-content: center; padding: 20px; z-index: 100; }
  .modal-backdrop.open { display: flex; }
  .modal { background: #fff; border-radius: 16px; padding: 28px; max-width: 440px; width: 100%; }
  .modal label { display: block; font-size: 0.8rem; font-weight: 600; color: #374151; margin-top: 12px; margin-bottom: 4px; }
  .modal input, .modal textarea { width: 100%; box-sizing: border-box; padding: 9px 11px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.85rem; font-family: inherit; }
  .modal-actions { display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end; }
</style>
</head>
<body>
${portalNav({ active: "clients", role, name })}
<main class="portal-main">
  <h1 class="portal-title">Klanten</h1>
  <div class="toolbar">
    ${role === "admin" ? '<button class="portal-btn" id="new-client-btn">+ Nieuw bedrijf</button>' : ""}
  </div>
  <div class="client-grid" id="client-grid"></div>
</main>

<div class="modal-backdrop" id="modal-backdrop">
  <div class="modal">
    <h2 style="margin-top:0; font-size:1.1rem;">Nieuw bedrijfsprofiel</h2>
    <form id="client-form">
      <label for="c-name">Bedrijfsnaam</label>
      <input id="c-name" required>
      <label for="c-contact">Contactpersoon</label>
      <input id="c-contact">
      <label for="c-email">E-mailadres</label>
      <input id="c-email" type="email">
      <label for="c-sector">Sector</label>
      <input id="c-sector">
      <label for="c-desc">Korte omschrijving</label>
      <textarea id="c-desc"></textarea>
      <div class="modal-actions">
        <button type="button" class="portal-btn secondary" id="cancel-client-btn">Annuleren</button>
        <button type="submit" class="portal-btn">Aanmaken</button>
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
    if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || ("HTTP " + res.status)); }
    return res.json();
  }

  async function loadClients() {
    const list = await fetchJson("/api/portal/company-profiles");
    document.getElementById("client-grid").innerHTML = list.map((c) =>
      '<a class="client-card portal-card" href="/portal/clients/' + c.id + '">' +
      "<h3>" + escapeHtmlClient(c.name) + "</h3>" +
      (c.sector ? "<p>" + escapeHtmlClient(c.sector) + "</p>" : "") +
      (c.contactPerson ? "<p>" + escapeHtmlClient(c.contactPerson) + "</p>" : "") +
      (c.currentStage ? '<span class="stage-pill">' + escapeHtmlClient(c.currentStage) + "</span>" : "") +
      "</a>"
    ).join("") || "<p>Nog geen klanten toegevoegd.</p>";
  }

  const newBtn = document.getElementById("new-client-btn");
  if (newBtn) {
    newBtn.addEventListener("click", () => document.getElementById("modal-backdrop").classList.add("open"));
    document.getElementById("cancel-client-btn").addEventListener("click", () => document.getElementById("modal-backdrop").classList.remove("open"));
    document.getElementById("client-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      await fetchJson("/api/portal/company-profiles", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: document.getElementById("c-name").value,
          contactPerson: document.getElementById("c-contact").value,
          contactEmail: document.getElementById("c-email").value,
          sector: document.getElementById("c-sector").value,
          shortDescription: document.getElementById("c-desc").value,
        }),
      });
      document.getElementById("modal-backdrop").classList.remove("open");
      document.getElementById("client-form").reset();
      loadClients();
    });
  }

  loadClients();
</script>
</body>
</html>`;
}

module.exports = { clientsPage };
