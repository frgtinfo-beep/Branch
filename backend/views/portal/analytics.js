const { PORTAL_BRAND_HEAD, PORTAL_SCRIPT, portalNav } = require("./brandHead");

// Website analytics dashboard (admin + bestuur). Client code sits inside a
// template literal, so it avoids backticks and template placeholders.
function analyticsPage({ name, role }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Analytics — Branch Team Tool</title>
${PORTAL_BRAND_HEAD}
<style>
  .an-head { display: flex; align-items: center; justify-content: space-between; gap: 12px 16px; flex-wrap: wrap; margin-bottom: 20px; }
  .an-head h1 { font-size: 1.65rem; font-weight: 800; letter-spacing: -0.02em; color: var(--ink); margin: 0; }
  .an-head-left { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .live { display: inline-flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 600; color: var(--text-2); background: var(--surface); border: 1px solid var(--border); border-radius: 999px; padding: 4px 12px 4px 10px; }
  .live-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success); box-shadow: 0 0 0 0 color-mix(in srgb, var(--success) 50%, transparent); animation: live-pulse 2s ease-out infinite; }
  @keyframes live-pulse { to { box-shadow: 0 0 0 7px transparent; } }
  .seg { display: inline-flex; padding: 3px; gap: 2px; background: var(--surface-sunken); border-radius: 10px; }
  .seg button { min-height: 32px; padding: 0 14px; border: 0; border-radius: 8px; background: transparent; color: var(--text-light); font: inherit; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
  .seg button:hover { color: var(--ink); }
  .seg button[aria-pressed="true"] { background: var(--surface); color: var(--ink); box-shadow: 0 1px 2px var(--shadow); }

  .tiles { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
  @media (max-width: 1100px) { .tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  @media (max-width: 640px) { .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .tile { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; }
  .tile-label { font-size: 0.8rem; font-weight: 600; color: var(--text-light); margin: 0 0 6px; }
  .tile-value { font-size: 1.75rem; font-weight: 800; letter-spacing: -0.02em; color: var(--ink); margin: 0; line-height: 1.1; }
  .tile.hero .tile-value { font-size: 2.6rem; }
  .delta { display: inline-block; margin-top: 6px; font-size: 0.78rem; font-weight: 600; color: var(--text-light); }
  .delta.up { color: var(--success); }
  .delta.down { color: var(--danger); }

  .an-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
  @media (max-width: 900px) { .an-grid { grid-template-columns: 1fr; } }
  .card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
  .card-head h2 { margin: 0; }
  .card-sub { font-size: 0.8rem; color: var(--text-light); }

  /* Column chart */
  .chart-wrap { position: relative; }
  .chart-wrap svg { display: block; width: 100%; height: 240px; overflow: visible; }
  .chart-wrap .grid line { stroke: var(--border); stroke-width: 1; shape-rendering: crispEdges; }
  .chart-wrap .tick { fill: var(--text-light); font-size: 11px; font-variant-numeric: tabular-nums; }
  .chart-wrap .col { fill: var(--primary); transition: opacity 120ms ease; }
  .chart-wrap.hovering .col { opacity: 0.45; }
  .chart-wrap.hovering .col.active { opacity: 1; }
  .chart-wrap .hit { fill: transparent; cursor: default; }
  .tip { position: absolute; top: 0; pointer-events: none; transform: translate(-50%, calc(-100% - 8px)); background: var(--ink); color: var(--background); border-radius: 8px; padding: 7px 10px; font-size: 0.78rem; line-height: 1.45; white-space: nowrap; box-shadow: 0 8px 24px -6px var(--shadow-strong); opacity: 0; transition: opacity 100ms ease; }
  .tip.show { opacity: 1; }
  .tip strong { display: block; font-weight: 700; }
  details.table-view { margin-top: 12px; }
  details.table-view summary { cursor: pointer; font-size: 0.82rem; font-weight: 600; color: var(--text-light); }
  details.table-view summary:hover { color: var(--ink); }
  details.table-view .table-wrap { max-height: 260px; overflow: auto; margin-top: 8px; }

  /* Horizontal bar rows (HTML so labels stay real text) */
  .bars { display: grid; grid-template-columns: minmax(90px, 38%) 1fr auto; align-items: center; gap: 10px; margin: 0; padding: 0; list-style: none; font-size: 0.875rem; }
  .bar-row { display: contents; }
  .bar-label { color: var(--text-dark); min-width: 0; }
  .bar-label .name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bar-label .note { display: block; font-size: 0.75rem; color: var(--text-light); }
  .bar-track { height: 14px; border-radius: 0 4px 4px 0; background: transparent; position: relative; }
  .bar-fill { position: absolute; left: 0; top: 0; bottom: 0; max-width: 100%; min-width: 2px; background: var(--primary); border-radius: 0 4px 4px 0; }
  .bar-fill.zero { background: var(--border); }
  .bar-value { font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; min-width: 3ch; text-align: right; }
  .bar-sub { display: inline-block; min-width: 3.2ch; font-size: 0.75rem; color: var(--text-light); font-weight: 500; margin-left: 6px; text-align: right; }
  .sub-list { margin: 16px 0 0; padding-top: 14px; border-top: 1px solid var(--border); }
  .sub-list h3 { font-size: 0.8rem; font-weight: 700; color: var(--text-light); margin: 0 0 10px; }

  strong.ink { color: var(--ink); }
  .empty-state { text-align: center; padding: 48px 20px; }
  .empty-state h2 { font-size: 1.1rem; margin: 0 0 6px; color: var(--ink); }
  .privacy-note { margin-top: 20px; font-size: 0.8rem; color: var(--text-light); }
  @media (prefers-reduced-motion: reduce) { .live-dot { animation: none; } }
</style>
</head>
<body>
${portalNav({ active: "analytics", role, name })}
<main class="portal-main">
  <div class="an-head">
    <div class="an-head-left">
      <h1>Analytics</h1>
      <span class="live" id="live" title="Unieke bezoekers in de afgelopen 30 minuten"><span class="live-dot" aria-hidden="true"></span><span id="live-count">–</span> nu op de site</span>
    </div>
    <div class="seg" role="group" aria-label="Periode">
      <button type="button" data-days="7" aria-pressed="false">7 dagen</button>
      <button type="button" data-days="30" aria-pressed="true">30 dagen</button>
      <button type="button" data-days="90" aria-pressed="false">90 dagen</button>
    </div>
  </div>

  <div id="content" aria-busy="true">
    <p class="muted">Laden…</p>
  </div>

  <p class="privacy-note">Anoniem gemeten op onze eigen server: geen cookies, geen IP-adressen opgeslagen, bezoekers die “niet volgen” instellen worden overgeslagen. Een bezoek = één bezoeker op één dag.</p>
</main>

${PORTAL_SCRIPT}
<script>
  const EVENT_LABELS = {
    contact_link: "Contact-links", start_project: "Knop “Start een project”", package_cta: "Pakket-knoppen", view_packages: "Knop “Bekijk pakketten”",
    whatsapp: "WhatsApp", phone: "Telefoonnummer", email: "E-mailadres", package_details: "“Alle features” geopend",
    form_submit: "Contactformulier verstuurd", language: "Taal gewisseld", legal_link: "Juridische pagina's", portal_link: "Portal-login",
  };
  const PAGE_NAMES = { "/index.html": "Home", "/about.html": "Over ons", "/contact.html": "Contact", "/projects.html": "Projecten", "/privacy.html": "Privacybeleid", "/terms.html": "Algemene voorwaarden", "/refund.html": "Restitutiebeleid", "/cookies.html": "Cookiebeleid" };
  const nf = new Intl.NumberFormat("nl-NL");
  const fmtDay = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short" });
  const fmtShort = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" });
  let days = 30;
  try { days = Number(localStorage.getItem("portal-analytics-days")) || 30; } catch (e) {}
  if ([7, 30, 90].indexOf(days) === -1) days = 30;
  let data = null;

  function parseDay(s) { const p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }

  function sumEvents(name, current, label) {
    return data.events.filter((e) => e.name === name && e.current === current && (label === undefined || e.label === label)).reduce((a, e) => a + e.count, 0);
  }

  function delta(now, before) {
    if (!before) return now ? '<span class="delta">nieuw t.o.v. vorige periode</span>' : '<span class="delta">geen data vorige periode</span>';
    const pct = Math.round((now - before) / before * 100);
    const cls = pct > 0 ? "up" : pct < 0 ? "down" : "";
    const sign = pct > 0 ? "+" : "";
    return '<span class="delta ' + cls + '">' + sign + pct + "% vs vorige periode</span>";
  }

  function tile(label, now, before, hero, shown) {
    return '<div class="tile' + (hero ? " hero" : "") + '"><p class="tile-label">' + label + '</p><p class="tile-value">' + (shown || nf.format(now)) + "</p>" + delta(now, before) + "</div>";
  }

  // 38 s · 1 min 24 s · 12 min
  function formatDuration(total) {
    const secs = Math.round(total || 0);
    if (secs < 60) return secs + " s";
    const m = Math.floor(secs / 60), r = secs % 60;
    return m >= 10 || !r ? m + " min" : m + " min " + r + " s";
  }

  function barRows(rows, opts) {
    const max = Math.max.apply(null, rows.map((r) => r.value).concat([1]));
    return '<ul class="bars">' + rows.map((r) =>
      '<li class="bar-row">' +
      '<span class="bar-label"><span class="name">' + escapeHtmlClient(r.label) + "</span>" + (r.note ? '<span class="note">' + escapeHtmlClient(r.note) + "</span>" : "") + "</span>" +
      '<span class="bar-track" aria-hidden="true" title="' + escapeHtmlClient(r.label + ": " + nf.format(r.value)) + '"><span class="bar-fill' + (r.value ? "" : " zero") + '" style="width:' + (r.value / max * 100) + '%"></span></span>' +
      '<span class="bar-value">' + nf.format(r.value) + (r.sub ? '<span class="bar-sub">' + r.sub + "</span>" : "") + "</span></li>"
    ).join("") + "</ul>" + (opts && opts.emptyNote && !rows.some((r) => r.value) ? '<p class="muted" style="margin:10px 0 0;">' + opts.emptyNote + "</p>" : "");
  }

  // Axis top = 4 equal whole-number steps (1, 2, 5, 10, 20, 50 …)
  function niceMax(v) {
    const raw = Math.max(1, v) / 4;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / pow;
    const step = Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow);
    return step * 4;
  }

  // Single-series column chart: visits per day
  function renderColumns() {
    const wrap = document.getElementById("visits-chart");
    if (!wrap) return;
    const W = Math.max(wrap.clientWidth, 280), H = 240, padL = 34, padB = 26, padT = 8;
    const series = data.daily;
    const max = niceMax(Math.max.apply(null, series.map((d) => d.visits).concat([0])));
    const plotW = W - padL, plotH = H - padB - padT;
    const slot = plotW / series.length;
    const barW = Math.max(2, Math.min(24, slot - 2));
    const y = (v) => padT + plotH - v / max * plotH;
    let svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Bezoeken per dag, ' + days + ' dagen"><g class="grid">';
    for (let i = 0; i <= 4; i++) {
      const v = max / 4 * i, yy = Math.round(y(v)) + 0.5;
      svg += '<line x1="' + padL + '" x2="' + W + '" y1="' + yy + '" y2="' + yy + '"></line><text class="tick" x="' + (padL - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + nf.format(v) + "</text>";
    }
    svg += "</g>";
    const labelEvery = series.length <= 7 ? 1 : series.length <= 30 ? 5 : 15;
    series.forEach((d, i) => {
      const x = padL + i * slot + (slot - barW) / 2;
      const top = y(d.visits), h = padT + plotH - top;
      if (h > 0) {
        const r = Math.min(4, h, barW / 2);
        // rounded data-end, square at the baseline
        svg += '<path class="col" data-i="' + i + '" d="M' + x + " " + (top + h) + "V" + (top + r) + "Q" + x + " " + top + " " + (x + r) + " " + top + "H" + (x + barW - r) + "Q" + (x + barW) + " " + top + " " + (x + barW) + " " + (top + r) + "V" + (top + h) + 'Z"></path>';
      }
      if (i % labelEvery === 0 || i === series.length - 1 && series.length <= 7) {
        svg += '<text class="tick" x="' + (x + barW / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + fmtShort.format(parseDay(d.day)) + "</text>";
      }
      svg += '<rect class="hit" data-i="' + i + '" x="' + (padL + i * slot) + '" y="' + padT + '" width="' + slot + '" height="' + plotH + '"></rect>';
    });
    svg += "</svg>";
    wrap.innerHTML = svg + '<div class="tip" id="tip" role="presentation"></div>';

    const tip = document.getElementById("tip");
    wrap.querySelectorAll(".hit").forEach((hit) => {
      hit.addEventListener("mouseenter", () => {
        const i = Number(hit.dataset.i), d = series[i];
        wrap.classList.add("hovering");
        wrap.querySelectorAll(".col").forEach((c) => c.classList.toggle("active", Number(c.dataset.i) === i));
        tip.innerHTML = "<strong>" + fmtDay.format(parseDay(d.day)) + "</strong>" + nf.format(d.visits) + " bezoeken · " + nf.format(d.pageviews) + " paginaweergaven";
        const scale = wrap.clientWidth / W;
        tip.style.left = ((padL + i * slot + slot / 2) * scale) + "px";
        tip.style.top = (y(d.visits) * (wrap.querySelector("svg").clientHeight / H)) + "px";
        tip.classList.add("show");
      });
    });
    wrap.addEventListener("mouseleave", () => { wrap.classList.remove("hovering"); tip.classList.remove("show"); });
  }

  function render() {
    const content = document.getElementById("content");
    document.getElementById("live-count").textContent = nf.format(data.liveVisitors);
    const t = data.totals;
    const hasAny = t.current.visits || t.previous.visits || data.events.length;
    if (!hasAny) {
      content.innerHTML = '<div class="portal-card empty-state"><h2>Nog geen bezoekersdata</h2><p class="muted" style="margin:0;">Zodra de website met de nieuwe meetcode live staat, verschijnen hier bezoeken en klikken — meestal binnen een paar minuten na het eerste bezoek.</p></div>';
      return;
    }

    const contactClicks = (c) => sumEvents("contact_link", c) + sumEvents("start_project", c) + sumEvents("package_cta", c);
    let html = '<div class="tiles">' +
      tile("Bezoeken", t.current.visits, t.previous.visits, true) +
      tile("Paginaweergaven", t.current.pageviews, t.previous.pageviews) +
      tile("Contactaanvragen", sumEvents("form_submit", true, "verzonden"), sumEvents("form_submit", false, "verzonden")) +
      tile("WhatsApp-klikken", sumEvents("whatsapp", true), sumEvents("whatsapp", false)) +
      tile("Klikken naar contact", contactClicks(true), contactClicks(false)) +
      tile("Gem. bezoekduur", data.duration.current.avgSeconds, data.duration.previous.avgSeconds, false, data.duration.current.visits ? formatDuration(data.duration.current.avgSeconds) : "–") +
      "</div>";

    html += '<section class="portal-card" aria-labelledby="h-visits"><div class="card-head"><h2 class="section-title" id="h-visits">Bezoeken per dag</h2><span class="card-sub">' + fmtShort.format(parseDay(data.range.from)) + " – " + fmtShort.format(parseDay(data.range.to)) + "</span></div>" +
      '<div class="chart-wrap" id="visits-chart"></div>' +
      '<details class="table-view"><summary>Toon als tabel</summary><div class="table-wrap"><table class="data"><thead><tr><th scope="col">Dag</th><th scope="col" class="right">Bezoeken</th><th scope="col" class="right">Paginaweergaven</th></tr></thead><tbody>' +
      data.daily.slice().reverse().map((d) => "<tr><td>" + fmtDay.format(parseDay(d.day)) + '</td><td class="right num">' + nf.format(d.visits) + '</td><td class="right num">' + nf.format(d.pageviews) + "</td></tr>").join("") +
      "</tbody></table></div></details></section>";

    // Packages: fixed order, all five always shown
    const pkgRows = [1, 2, 3, 4, 5].map((n) => {
      const label = "Pakket " + n;
      return { label, value: sumEvents("package_cta", true, label), note: sumEvents("package_details", true, label) ? sumEvents("package_details", true, label) + "× alle features bekeken" : "" };
    });
    const contactPlaces = {};
    data.events.filter((e) => e.current && (e.name === "contact_link" || e.name === "start_project")).forEach((e) => { contactPlaces[e.label || "Onbekend"] = (contactPlaces[e.label || "Onbekend"] || 0) + e.count; });
    const clickTotals = {};
    data.events.filter((e) => e.current && e.name !== "form_submit").forEach((e) => { clickTotals[e.name] = (clickTotals[e.name] || 0) + e.count; });
    const submitFailed = sumEvents("form_submit", true, "mislukt");

    html += '<div class="an-grid">';
    html += '<section class="portal-card" aria-labelledby="h-pkg"><div class="card-head"><h2 class="section-title" id="h-pkg">Interesse per pakket</h2><span class="card-sub">klikken op “Neem contact op”</span></div>' + barRows(pkgRows, { emptyNote: "Nog geen klikken op pakketten in deze periode." }) + "</section>";
    html += '<section class="portal-card" aria-labelledby="h-clicks"><div class="card-head"><h2 class="section-title" id="h-clicks">Alle klikken</h2></div>' +
      barRows(Object.keys(clickTotals).sort((a, b) => clickTotals[b] - clickTotals[a]).map((k) => ({ label: EVENT_LABELS[k] || k, value: clickTotals[k] })), { emptyNote: "Nog geen klikken in deze periode." }) +
      (Object.keys(contactPlaces).length ? '<div class="sub-list"><h3>Waar wordt op contact geklikt</h3>' + barRows(Object.keys(contactPlaces).sort((a, b) => contactPlaces[b] - contactPlaces[a]).map((k) => ({ label: k, value: contactPlaces[k] }))) + "</div>" : "") +
      (submitFailed ? '<p class="muted" style="margin:14px 0 0;">Let op: ' + nf.format(submitFailed) + "× mislukte verzending van het contactformulier.</p>" : "") +
      "</section>";
    html += '<section class="portal-card" aria-labelledby="h-pages"><div class="card-head"><h2 class="section-title" id="h-pages">Populaire pagina’s</h2><span class="card-sub">paginaweergaven</span></div>' +
      barRows(data.pages.map((p) => ({ label: PAGE_NAMES[p.path] || p.path, value: p.pageviews, note: p.avgSeconds ? "gem. " + formatDuration(p.avgSeconds) + " op de pagina" : "" })), { emptyNote: "Nog geen paginaweergaven." }) + "</section>";

    const dur = data.duration;
    html += '<section class="portal-card" aria-labelledby="h-dur"><div class="card-head"><h2 class="section-title" id="h-dur">Hoe lang blijven bezoekers</h2><span class="card-sub">actieve tijd per bezoek</span></div>' +
      (dur.current.visits
        ? '<p class="muted" style="margin:-4px 0 14px;">Gemiddeld <strong class="ink">' + formatDuration(dur.current.avgSeconds) + '</strong> · de helft van de bezoeken duurt korter dan <strong class="ink">' + formatDuration(dur.current.medianSeconds) + "</strong></p>" +
          barRows(dur.buckets.map((b) => ({ label: b.label, value: b.visits, sub: Math.round(b.visits / dur.current.visits * 100) + "%" })))
        : '<p class="muted" style="margin:0;">Nog geen bezoekduur gemeten in deze periode.</p>') +
      "</section>";
    const totalVisits = t.current.visits || 1;
    const pct = (n) => Math.round((n || 0) / totalVisits * 100) + "%";
    html += '<section class="portal-card" aria-labelledby="h-src"><div class="card-head"><h2 class="section-title" id="h-src">Herkomst</h2><span class="card-sub">binnengekomen via</span></div>' +
      (data.referrers.length ? barRows(data.referrers.map((r) => ({ label: r.source, value: r.visits }))) : '<p class="muted" style="margin:0;">Nog geen bezoekers via andere websites. Direct bezoek (typen of bladwijzer) telt hier niet mee.</p>') +
      '<div class="sub-list"><h3>Apparaat</h3>' + barRows([["mobile", "Mobiel"], ["tablet", "Tablet"], ["desktop", "Desktop"]].map((d) => ({ label: d[1], value: data.devices[d[0]] || 0, sub: pct(data.devices[d[0]]) }))) + "</div>" +
      '<div class="sub-list"><h3>Taal</h3>' + barRows([["nl", "Nederlands"], ["en", "Engels"]].map((l) => ({ label: l[1], value: data.languages[l[0]] || 0, sub: pct(data.languages[l[0]]) }))) + "</div>" +
      "</section>";
    html += "</div>";

    content.innerHTML = html;
    renderColumns();
  }

  let requestId = 0;
  async function load() {
    document.querySelectorAll(".seg [data-days]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.days) === days)));
    const id = ++requestId;
    document.getElementById("content").setAttribute("aria-busy", "true");
    const result = await fetchJson("/api/portal/analytics?days=" + days);
    if (id !== requestId) return;
    data = result;
    render();
    document.getElementById("content").setAttribute("aria-busy", "false");
  }

  document.querySelectorAll(".seg [data-days]").forEach((b) => b.addEventListener("click", () => {
    days = Number(b.dataset.days);
    try { localStorage.setItem("portal-analytics-days", String(days)); } catch (e) {}
    load();
  }));
  let resizeTimer;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (data) renderColumns(); }, 120); });
  // Refresh the live counter and numbers every minute while the tab is open
  setInterval(() => { if (!document.hidden) load(); }, 60 * 1000);

  load();
</script>
</body>
</html>`;
}

module.exports = { analyticsPage };
