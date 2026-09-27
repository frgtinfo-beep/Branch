const { PORTAL_BRAND_HEAD, PORTAL_SCRIPT, portalNav } = require("./brandHead");

// Shared team calendar: day / week / month views over one set of events.
// Client code below lives inside a template literal, so it avoids backticks
// and template placeholders on purpose.
function calendarPage({ name, role }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kalender — Branch Team Tool</title>
${PORTAL_BRAND_HEAD}
<style>
  :root {
    --hour: 48px;
    --ev-blue-bg: rgba(11,109,255,0.12);  --ev-blue-fg: #0B3D91;  --ev-blue-dot: #0B6DFF;
    --ev-cyan-bg: rgba(20,184,230,0.16);  --ev-cyan-fg: #075E78;  --ev-cyan-dot: #14B8E6;
    --ev-green-bg: rgba(120,219,85,0.22); --ev-green-fg: #2C6A17; --ev-green-dot: #4CAF2F;
    --ev-amber-bg: rgba(245,158,11,0.18); --ev-amber-fg: #8A4B06; --ev-amber-dot: #F59E0B;
    --ev-red-bg: rgba(220,38,38,0.12);    --ev-red-fg: #9B1C1C;   --ev-red-dot: #DC2626;
    --now: #DC2626;
  }
  :root[data-theme="dark"] {
    --ev-blue-bg: rgba(90,150,255,0.22);  --ev-blue-fg: #C9DAFF;
    --ev-cyan-bg: rgba(20,184,230,0.22);  --ev-cyan-fg: #B2EBFA;
    --ev-green-bg: rgba(120,219,85,0.2);  --ev-green-fg: #CBF2BC;
    --ev-amber-bg: rgba(245,158,11,0.22); --ev-amber-fg: #FDE0AE;
    --ev-red-bg: rgba(248,113,113,0.22);  --ev-red-fg: #FED2D2;
    --now: #F87171;
  }

  /* Toolbar */
  .cal-head { display: flex; align-items: center; justify-content: space-between; gap: 12px 16px; flex-wrap: wrap; margin-bottom: 14px; }
  .cal-nav { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .cal-title { font-size: 1.65rem; font-weight: 800; letter-spacing: -0.02em; color: var(--ink); margin: 0 6px 0 0; }
  .cal-range { font-size: 1.05rem; font-weight: 700; color: var(--ink); margin: 0 0 0 6px; min-width: 12ch; }
  .cal-range::first-letter { text-transform: uppercase; }
  .cal-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .seg { display: inline-flex; padding: 3px; gap: 2px; background: var(--surface-sunken); border-radius: 10px; }
  .seg button { min-height: 32px; padding: 0 14px; border: 0; border-radius: 8px; background: transparent; color: var(--text-light); font: inherit; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: background-color 150ms ease, color 150ms ease; }
  .seg button:hover { color: var(--ink); }
  .seg button[aria-pressed="true"] { background: var(--surface); color: var(--ink); box-shadow: 0 1px 2px var(--shadow); }
  .seg kbd { display: none; }
  .cal-sub { display: flex; align-items: center; justify-content: space-between; gap: 10px 16px; flex-wrap: wrap; margin-bottom: 14px; font-size: 0.85rem; color: var(--text-light); }
  .toggle { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 600; color: var(--text-2); }
  .toggle input { width: 16px; height: 16px; accent-color: var(--primary); }
  .shortcuts { display: flex; gap: 12px; flex-wrap: wrap; }
  kbd { display: inline-block; min-width: 20px; padding: 1px 5px; border: 1px solid var(--border-strong); border-bottom-width: 2px; border-radius: 5px; background: var(--surface); font: inherit; font-size: 0.72rem; font-weight: 700; text-align: center; color: var(--ink); }

  .cal-surface { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; box-shadow: 0 1px 2px var(--shadow); }

  /* Event chips */
  .ev { display: flex; align-items: center; gap: 6px; width: 100%; min-width: 0; padding: 2px 6px; margin: 0 0 2px; border: 0; border-radius: 6px; font: inherit; font-size: 0.75rem; font-weight: 600; line-height: 1.5; text-align: left; cursor: pointer; background: var(--ev-bg); color: var(--ev-fg); }
  .ev:hover { filter: brightness(0.97); }
  :root[data-theme="dark"] .ev:hover { filter: brightness(1.15); }
  .ev .dot { width: 7px; height: 7px; border-radius: 50%; flex: none; background: var(--ev-dot); }
  .ev .ev-time { font-variant-numeric: tabular-nums; opacity: 0.8; flex: none; }
  .ev .ev-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .c-blue { --ev-bg: var(--ev-blue-bg); --ev-fg: var(--ev-blue-fg); --ev-dot: var(--ev-blue-dot); }
  .c-cyan { --ev-bg: var(--ev-cyan-bg); --ev-fg: var(--ev-cyan-fg); --ev-dot: var(--ev-cyan-dot); }
  .c-green { --ev-bg: var(--ev-green-bg); --ev-fg: var(--ev-green-fg); --ev-dot: var(--ev-green-dot); }
  .c-amber { --ev-bg: var(--ev-amber-bg); --ev-fg: var(--ev-amber-fg); --ev-dot: var(--ev-amber-dot); }
  .c-red { --ev-bg: var(--ev-red-bg); --ev-fg: var(--ev-red-fg); --ev-dot: var(--ev-red-dot); }
  a.ev { text-decoration: none; }
  .ev.deadline { background: transparent; color: var(--text-2); box-shadow: inset 0 0 0 1px var(--border-strong); }
  .ev.deadline .dot { background: transparent; border: 2px solid var(--text-light); width: 8px; height: 8px; }
  .ev.deadline.overdue { color: var(--danger); box-shadow: inset 0 0 0 1px var(--danger-border); }
  .ev.deadline.overdue .dot { border-color: var(--danger); }

  /* Month */
  .month-head, .month-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
  .month-head div { padding: 8px 10px; font-size: 0.75rem; font-weight: 700; color: var(--text-light); border-bottom: 1px solid var(--border); }
  .m-cell { position: relative; min-height: 118px; padding: 6px; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); cursor: pointer; min-width: 0; }
  .m-cell:nth-child(7n) { border-right: 0; }
  .m-cell:hover { background: var(--surface-muted); }
  .m-cell.outside { background: var(--surface-muted); }
  .m-cell.outside .m-date { color: var(--text-light); opacity: 0.7; }
  .m-cell.weekend:not(.outside) { background: color-mix(in srgb, var(--surface-sunken) 45%, var(--surface)); }
  .m-date { display: inline-flex; align-items: center; justify-content: center; min-width: 26px; height: 26px; padding: 0 6px; margin-bottom: 4px; border: 0; border-radius: 999px; background: none; font: inherit; font-size: 0.8rem; font-weight: 700; color: var(--ink); cursor: pointer; font-variant-numeric: tabular-nums; }
  .m-date:hover { background: var(--chip); }
  .m-cell.today .m-date { background: var(--primary); color: #fff; }
  .more { display: block; border: 0; background: none; padding: 1px 6px; font: inherit; font-size: 0.72rem; font-weight: 700; color: var(--text-light); cursor: pointer; }
  .more:hover { color: var(--ink); }

  /* Week / day time grid */
  .tg-head, .tg-allday, .tg-body { display: grid; grid-template-columns: 58px repeat(var(--days), minmax(0, 1fr)); }
  .tg-head { border-bottom: 1px solid var(--border); }
  .tg-head .day-name { padding: 8px 6px; text-align: center; border-left: 1px solid var(--border); background: none; border-top: 0; border-right: 0; border-bottom: 0; font: inherit; cursor: pointer; color: var(--text-light); }
  .tg-head .day-name:hover { background: var(--surface-muted); }
  .tg-head .dn-label { display: block; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  .tg-head .dn-num { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 32px; margin-top: 2px; padding: 0 6px; border-radius: 999px; font-size: 1.05rem; font-weight: 800; color: var(--ink); font-variant-numeric: tabular-nums; }
  .tg-head .today .dn-num { background: var(--primary); color: #fff; }
  .tg-head .today .dn-label { color: var(--primary); }
  :root[data-theme="dark"] .tg-head .today .dn-label { color: var(--link); }
  .tg-allday { border-bottom: 1px solid var(--border); background: var(--surface-muted); }
  .tg-allday .gutter { font-size: 0.65rem; color: var(--text-light); padding: 6px 6px 0 0; text-align: right; }
  .tg-allday .ad-cell { border-left: 1px solid var(--border); padding: 4px; min-height: 30px; min-width: 0; }
  .tg-scroll { max-height: max(420px, calc(100dvh - 320px)); overflow-y: auto; overscroll-behavior: contain; }
  .tg-body { position: relative; }
  .tg-hours { position: relative; }
  .tg-hours span { position: absolute; right: 8px; transform: translateY(-50%); font-size: 0.68rem; color: var(--text-light); font-variant-numeric: tabular-nums; }
  .tg-col { position: relative; height: calc(var(--hour) * 24); border-left: 1px solid var(--border); cursor: crosshair;
    background-image: linear-gradient(to bottom, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--hairline) 1px, transparent 1px);
    background-size: 100% var(--hour), 100% var(--hour); background-position: 0 0, 0 calc(var(--hour) / 2); }
  .tg-col.weekend { background-color: color-mix(in srgb, var(--surface-sunken) 45%, var(--surface)); }
  .tg-col.today { background-color: color-mix(in srgb, var(--accent-soft) 40%, var(--surface)); }
  .tg-ev { position: absolute; display: flex; flex-direction: column; gap: 1px; overflow: hidden; padding: 3px 6px; border: 0; border-radius: 6px; font: inherit; font-size: 0.75rem; line-height: 1.3; text-align: left; cursor: pointer; background: var(--ev-bg); color: var(--ev-fg); box-shadow: inset 3px 0 0 var(--ev-dot), 0 0 0 1px var(--surface); }
  .tg-ev:hover { z-index: 3; filter: brightness(0.97); }
  .tg-ev strong { flex: none; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tg-ev .t { flex: none; }
  .tg-ev .t { font-variant-numeric: tabular-nums; opacity: 0.85; }
  .now-line { position: absolute; left: -1px; right: 0; height: 2px; background: var(--now); z-index: 4; pointer-events: none; }
  .now-line::before { content: ''; position: absolute; left: -5px; top: -4px; width: 10px; height: 10px; border-radius: 50%; background: var(--now); }

  /* Event modal */
  .swatches { display: flex; flex-direction: row; gap: 10px; flex-wrap: wrap; border: 0; padding: 0; margin: 0; }
  .swatches legend { float: left; width: 100%; }
  .swatches legend { margin-bottom: 6px; }
  .swatch { position: relative; }
  .swatch input { position: absolute; opacity: 0; inset: 0; margin: 0; cursor: pointer; }
  .swatch span { display: block; width: 28px; height: 28px; border-radius: 50%; background: var(--ev-dot); box-shadow: 0 0 0 2px var(--surface), 0 0 0 3px transparent; transition: box-shadow 150ms ease; }
  .swatch input:checked + span { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--ink); }
  .swatch input:focus-visible + span { outline: 2px solid var(--focus); outline-offset: 4px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .when-grid { display: grid; grid-template-columns: 1fr 110px; gap: 8px 10px; align-items: end; }
  .all-day .when-grid { grid-template-columns: 1fr; }
  .all-day .time-field { display: none; }
  .check { display: inline-flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: 600; color: var(--ink); cursor: pointer; }
  .check input { width: 16px; height: 16px; accent-color: var(--primary); }
  .event-meta { font-size: 0.8rem; color: var(--text-light); margin: 0; }

  .feed-link { display: flex; gap: 8px; }
  .feed-link input { flex: 1; min-width: 0; font-size: 0.8rem !important; color: var(--text-2) !important; }
  .steps-list { margin: 0; padding-left: 1.2rem; font-size: 0.875rem; color: var(--text-2); line-height: 1.6; }
  .steps-list li { margin-bottom: 4px; }
  .feed-section h3 { font-size: 0.9rem; font-weight: 700; color: var(--ink); margin: 0 0 6px; }
  .feed-note { font-size: 0.82rem; color: var(--text-light); background: var(--surface-muted); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; margin: 0; }
  .feed-body { display: flex; flex-direction: column; gap: 16px; margin-top: 12px; }
  .apple-btn svg { width: 16px; height: 16px; }
  @media (min-width: 900px) { .seg kbd { display: inline-block; margin-left: 6px; min-width: 18px; padding: 0 4px; font-size: 0.65rem; opacity: 0.7; } }
  @media (max-width: 720px) {
    .m-cell { min-height: 74px; padding: 3px; }
    .month .ev { font-size: 0; height: 6px; padding: 0; gap: 0; margin-bottom: 3px; }
    .month .ev .dot { display: none; }
    .month .more { font-size: 0.65rem; padding: 0 2px; }
    .tg-head, .tg-allday, .tg-body { grid-template-columns: 40px repeat(var(--days), minmax(0, 1fr)); }
    .tg-head .dn-label { font-size: 0.62rem; }
    .tg-head .dn-num { font-size: 0.9rem; min-width: 26px; height: 26px; }
    .tg-ev { padding: 2px 3px; font-size: 0.68rem; }
    .shortcuts { display: none; }
    .form-row { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
${portalNav({ active: "calendar", role, name })}
<main class="portal-main">
  <div class="cal-head">
    <div class="cal-nav">
      <h1 class="cal-title">Kalender</h1>
      <button type="button" class="portal-btn secondary small" id="today-btn">Vandaag</button>
      <button type="button" class="icon-btn" id="prev-btn" aria-label="Vorige">←</button>
      <button type="button" class="icon-btn" id="next-btn" aria-label="Volgende">→</button>
      <h2 class="cal-range" id="range-label" aria-live="polite"></h2>
    </div>
    <div class="cal-actions">
      <div class="seg" role="group" aria-label="Weergave">
        <button type="button" data-view="day" aria-pressed="false">Dag<kbd>D</kbd></button>
        <button type="button" data-view="week" aria-pressed="false">Week<kbd>W</kbd></button>
        <button type="button" data-view="month" aria-pressed="false">Maand<kbd>M</kbd></button>
      </div>
      <button type="button" class="portal-btn secondary apple-btn" id="feed-btn" aria-haspopup="dialog">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M12 14v4M10 16h4"/></svg>
        Apple Agenda
      </button>
      <button type="button" class="portal-btn" id="new-event-btn">+ Afspraak</button>
    </div>
  </div>
  <div class="cal-sub">
    <label class="toggle"><input type="checkbox" id="show-deadlines"> Taakdeadlines tonen</label>
    <div class="shortcuts" aria-label="Sneltoetsen">
      <span><kbd>D</kbd> <kbd>W</kbd> <kbd>M</kbd> weergave</span>
      <span><kbd>←</kbd> <kbd>→</kbd> vorige / volgende</span>
      <span><kbd>T</kbd> vandaag</span>
      <span><kbd>N</kbd> nieuwe afspraak</span>
    </div>
  </div>

  <div class="cal-surface" id="cal" aria-busy="true"></div>
</main>

<div class="modal-backdrop" id="feed-backdrop">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="feed-title" style="max-width:540px;">
    <div class="modal-header">
      <h2 id="feed-title">Kalender in Apple Agenda</h2>
      <button type="button" class="icon-btn modal-close" data-close-modal aria-label="Sluiten">✕</button>
    </div>
    <div class="feed-body">
      <p class="muted" style="margin:0;">Abonneer je één keer op deze link. Daarna verschijnt alles wat in de portal-kalender wordt gezet automatisch in je Apple Agenda.</p>
      <a class="portal-btn" id="feed-webcal" href="#" style="align-self:flex-start;">Toevoegen aan Apple Agenda</a>
      <div class="feed-section">
        <h3>Of kopieer de link om te delen</h3>
        <div class="feed-link">
          <label class="sr-only" for="feed-url">Abonnementslink</label>
          <input id="feed-url" readonly value="Laden…">
          <button type="button" class="portal-btn secondary" id="feed-copy">Kopiëren</button>
        </div>
      </div>
      <div class="feed-section">
        <h3>Handmatig toevoegen</h3>
        <ol class="steps-list">
          <li><strong>iPhone:</strong> Instellingen › Agenda › Accounts › Voeg account toe › Anders › Voeg agenda-abonnement toe › plak de link.</li>
          <li><strong>Mac:</strong> Agenda › Archief › Nieuw agenda-abonnement… › plak de link › zet “Automatisch vernieuwen” op <strong>Elke 5 minuten</strong>.</li>
        </ol>
      </div>
      <p class="feed-note">Wijzigingen verschijnen niet meteen: Apple haalt de kalender periodiek op (op de Mac zo vaak als je instelt, op de iPhone bepaalt iOS dat). Het abonnement is alleen-lezen; afspraken maak en wijzig je in de portal. Deel deze link alleen met teamleden — iedereen met de link kan de agenda lezen.</p>
      ${role === "admin" ? `<div class="modal-actions" style="justify-content:flex-start;margin-top:0;"><button type="button" class="portal-btn ghost-danger small" id="feed-rotate">Nieuwe link maken</button><span class="muted" style="font-size:0.8rem;align-self:center;">De oude link stopt dan direct met werken.</span></div>` : ""}
    </div>
  </div>
</div>

<div class="modal-backdrop" id="event-backdrop">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="event-modal-title">
    <div class="modal-header">
      <h2 id="event-modal-title">Nieuwe afspraak</h2>
      <button type="button" class="icon-btn modal-close" data-close-modal aria-label="Sluiten">✕</button>
    </div>
    <form id="event-form" novalidate>
      <input type="hidden" id="ev-id">
      <label class="field"><span>Titel</span><input id="ev-title" required maxlength="200" autocomplete="off"></label>
      <label class="check"><input type="checkbox" id="ev-allday"> Hele dag</label>
      <div class="when" id="when">
        <div class="when-grid">
          <label class="field"><span>Begin</span><input type="date" id="ev-start-date" required></label>
          <label class="field time-field"><span class="sr-only">Begintijd</span><input type="time" id="ev-start-time" step="900"></label>
          <label class="field"><span>Einde</span><input type="date" id="ev-end-date" required></label>
          <label class="field time-field"><span class="sr-only">Eindtijd</span><input type="time" id="ev-end-time" step="900"></label>
        </div>
      </div>
      <fieldset class="swatches field">
        <legend class="field-label">Kleur</legend>
        <label class="swatch c-blue" title="Blauw"><input type="radio" name="ev-color" value="blue" checked aria-label="Blauw"><span></span></label>
        <label class="swatch c-cyan" title="Cyaan"><input type="radio" name="ev-color" value="cyan" aria-label="Cyaan"><span></span></label>
        <label class="swatch c-green" title="Groen"><input type="radio" name="ev-color" value="green" aria-label="Groen"><span></span></label>
        <label class="swatch c-amber" title="Oranje"><input type="radio" name="ev-color" value="amber" aria-label="Oranje"><span></span></label>
        <label class="swatch c-red" title="Rood"><input type="radio" name="ev-color" value="red" aria-label="Rood"><span></span></label>
      </fieldset>
      <label class="field"><span>Locatie</span><input id="ev-location" maxlength="200" autocomplete="off"></label>
      <label class="field"><span>Omschrijving</span><textarea id="ev-description" maxlength="5000"></textarea></label>
      <p class="event-meta" id="ev-meta" hidden></p>
      <p class="form-error" id="ev-error" role="alert"></p>
      <div class="modal-actions">
        <button type="button" class="portal-btn ghost-danger" id="ev-delete" hidden style="margin-right:auto;">Verwijderen</button>
        <button type="button" class="portal-btn secondary" data-close-modal>Annuleren</button>
        <button type="submit" class="portal-btn" id="ev-save">Opslaan</button>
      </div>
    </form>
  </div>
</div>

${PORTAL_SCRIPT}
<script>
  const HOUR_PX = 48;
  const DAY_MS = 86400000;
  const MAX_CHIPS = 3;
  const cal = document.getElementById("cal");
  const backdrop = document.getElementById("event-backdrop");

  const fmtMonth = new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric" });
  const fmtDayLong = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fmtDayShort = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" });
  const fmtWeekday = new Intl.DateTimeFormat("nl-NL", { weekday: "short" });
  const fmtTime = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit" });
  const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];

  function readPref(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; } }
  function writePref(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }

  const state = {
    view: readPref("portal-cal-view", window.matchMedia("(max-width: 720px)").matches ? "day" : "week"),
    cursor: startOfDay(new Date()),
    events: [],
    deadlines: [],
    showDeadlines: readPref("portal-cal-deadlines", "1") === "1",
  };
  if (["day", "week", "month"].indexOf(state.view) === -1) state.view = "week";
  document.getElementById("show-deadlines").checked = state.showDeadlines;

  // ---- date helpers (all local time)
  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function startOfWeek(d) { const x = startOfDay(d); const dow = (x.getDay() + 6) % 7; return addDays(x, -dow); }
  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function dateInput(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function timeInput(d) { return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function fromInputs(dateStr, timeStr) {
    const parts = dateStr.split("-").map(Number);
    const t = (timeStr || "00:00").split(":").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], t[0], t[1], 0, 0);
  }
  function isWeekendDay(d) { const g = d.getDay(); return g === 0 || g === 6; }

  function visibleRange() {
    if (state.view === "day") return { from: startOfDay(state.cursor), to: addDays(startOfDay(state.cursor), 1) };
    if (state.view === "week") { const from = startOfWeek(state.cursor); return { from, to: addDays(from, 7) }; }
    const first = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), 1);
    const from = startOfWeek(first);
    return { from, to: addDays(from, 42) };
  }

  function rangeLabel() {
    const r = visibleRange();
    if (state.view === "day") return fmtDayLong.format(state.cursor);
    if (state.view === "month") return fmtMonth.format(state.cursor);
    const last = addDays(r.to, -1);
    return fmtDayShort.format(r.from) + " – " + fmtDayShort.format(last) + " " + last.getFullYear();
  }

  // ---- data
  let loadId = 0;
  async function load() {
    const r = visibleRange();
    const id = ++loadId;
    cal.setAttribute("aria-busy", "true");
    const params = "from=" + encodeURIComponent(r.from.toISOString()) + "&to=" + encodeURIComponent(r.to.toISOString());
    const requests = [fetchJson("/api/portal/events?" + params)];
    if (state.showDeadlines) requests.push(fetchJson("/api/portal/tasks"));
    const results = await Promise.all(requests);
    if (id !== loadId) return; // a newer navigation already won
    state.events = results[0].map((e) => Object.assign({}, e, { start: new Date(e.start), end: new Date(e.end) }));
    state.deadlines = state.showDeadlines
      ? results[1].filter((t) => t.deadline && t.status !== "klaar").map((t) => ({ id: t.id, title: t.title, date: fromInputs(t.deadline), overdue: t.overdue }))
      : [];
    render();
    cal.setAttribute("aria-busy", "false");
  }

  // Events touching a given local day, split into what that day shows
  function itemsForDay(day) {
    const dayStart = startOfDay(day), dayEnd = addDays(dayStart, 1);
    const allDay = [], timed = [];
    state.events.forEach((e) => {
      if (!(e.start < dayEnd && e.end > dayStart)) return;
      const multiDay = !sameDay(e.start, new Date(e.end.getTime() - 1));
      if (e.allDay || multiDay) allDay.push(e);
      else timed.push(e);
    });
    const deadlines = state.deadlines.filter((d) => sameDay(d.date, day));
    return { allDay, timed, deadlines };
  }

  function chipHtml(e, withTime) {
    const time = withTime && !e.allDay && sameDay(e.start, new Date(e.end.getTime() - 1)) ? '<span class="ev-time">' + fmtTime.format(e.start) + "</span>" : "";
    return '<button type="button" class="ev c-' + e.color + '" data-event="' + e.id + '" title="' + escapeHtmlClient(e.title) + '">' +
      '<span class="dot" aria-hidden="true"></span>' + time + '<span class="ev-title">' + escapeHtmlClient(e.title) + "</span></button>";
  }
  function deadlineHtml(d) {
    return '<a class="ev deadline' + (d.overdue ? " overdue" : "") + '" href="/portal" title="Deadline: ' + escapeHtmlClient(d.title) + '">' +
      '<span class="dot" aria-hidden="true"></span><span class="ev-title">' + escapeHtmlClient(d.title) + "</span></a>";
  }

  // ---- month view
  function renderMonth() {
    const r = visibleRange();
    const today = new Date();
    let html = '<div class="month"><div class="month-head" aria-hidden="true">' + WEEKDAYS.map((d) => "<div>" + d + "</div>").join("") + '</div><div class="month-grid">';
    for (let i = 0; i < 42; i++) {
      const day = addDays(r.from, i);
      const items = itemsForDay(day);
      const all = items.allDay.map((e) => chipHtml(e, false))
        .concat(items.timed.map((e) => chipHtml(e, true)))
        .concat(items.deadlines.map(deadlineHtml));
      const shown = all.slice(0, MAX_CHIPS).join("");
      const extra = all.length - MAX_CHIPS;
      const classes = ["m-cell"];
      if (day.getMonth() !== state.cursor.getMonth()) classes.push("outside");
      if (sameDay(day, today)) classes.push("today");
      if (isWeekendDay(day)) classes.push("weekend");
      html += '<div class="' + classes.join(" ") + '" data-date="' + dateInput(day) + '">' +
        '<button type="button" class="m-date" data-goto="' + dateInput(day) + '" aria-label="' + fmtDayLong.format(day) + (all.length ? ", " + all.length + " items" : "") + '">' + day.getDate() + "</button>" +
        shown + (extra > 0 ? '<button type="button" class="more" data-goto="' + dateInput(day) + '">+' + extra + " meer</button>" : "") + "</div>";
    }
    html += "</div></div>";
    cal.innerHTML = html;
  }

  // ---- week / day view
  function layoutTimed(list) {
    // Greedy lanes: overlapping events sit side by side
    const sorted = list.slice().sort((a, b) => a.start - b.start || b.end - a.end);
    const out = [];
    let cluster = [], clusterEnd = 0;
    function flush() {
      const lanes = [];
      cluster.forEach((e) => {
        let lane = lanes.findIndex((end) => end <= e.start.getTime());
        if (lane === -1) { lane = lanes.length; lanes.push(0); }
        lanes[lane] = e.end.getTime();
        out.push({ e, lane });
      });
      const count = lanes.length;
      out.slice(out.length - cluster.length).forEach((o) => { o.lanes = count; });
      cluster = [];
    }
    sorted.forEach((e) => {
      if (cluster.length && e.start.getTime() >= clusterEnd) flush();
      cluster.push(e);
      clusterEnd = Math.max(clusterEnd, e.end.getTime());
    });
    if (cluster.length) flush();
    return out;
  }

  function renderTimeGrid(days) {
    const today = new Date();
    const style = ' style="--days:' + days.length + '"';
    let head = '<div class="tg-head"' + style + '><div></div>';
    let allDayRow = '<div class="tg-allday"' + style + '><div class="gutter">hele dag</div>';
    let cols = "";
    days.forEach((day) => {
      const isToday = sameDay(day, today);
      head += '<button type="button" class="day-name' + (isToday ? " today" : "") + '" data-goto="' + dateInput(day) + '" aria-label="' + fmtDayLong.format(day) + '">' +
        '<span class="dn-label">' + fmtWeekday.format(day).replace(".", "") + '</span><span class="dn-num">' + day.getDate() + "</span></button>";
      const items = itemsForDay(day);
      allDayRow += '<div class="ad-cell">' + items.allDay.map((e) => chipHtml(e, false)).join("") + items.deadlines.map(deadlineHtml).join("") + "</div>";

      let blocks = "";
      layoutTimed(items.timed).forEach((o) => {
        const minutesStart = o.e.start.getHours() * 60 + o.e.start.getMinutes();
        const minutesEnd = sameDay(o.e.end, day) ? o.e.end.getHours() * 60 + o.e.end.getMinutes() : 1440;
        const top = minutesStart / 60 * HOUR_PX;
        const height = Math.max((minutesEnd - minutesStart) / 60 * HOUR_PX - 2, 20);
        const width = 100 / o.lanes;
        blocks += '<button type="button" class="tg-ev c-' + o.e.color + '" data-event="' + o.e.id + '" style="top:' + top + "px;height:" + height + "px;left:calc(" + (o.lane * width) + "% + 2px);width:calc(" + width + '% - 4px)"' +
          ' aria-label="' + escapeHtmlClient(o.e.title + ", " + fmtTime.format(o.e.start) + " tot " + fmtTime.format(o.e.end)) + '">' +
          "<strong>" + escapeHtmlClient(o.e.title) + '</strong><span class="t">' + fmtTime.format(o.e.start) + " – " + fmtTime.format(o.e.end) + "</span>" +
          (o.e.location && height > 44 ? "<span>" + escapeHtmlClient(o.e.location) + "</span>" : "") + "</button>";
      });
      const nowLine = isToday ? '<div class="now-line" style="top:' + ((today.getHours() * 60 + today.getMinutes()) / 60 * HOUR_PX) + 'px"></div>' : "";
      cols += '<div class="tg-col' + (isToday ? " today" : "") + (isWeekendDay(day) ? " weekend" : "") + '" data-date="' + dateInput(day) + '">' + blocks + nowLine + "</div>";
    });
    head += "</div>";
    allDayRow += "</div>";
    let hours = '<div class="tg-hours">';
    for (let h = 1; h < 24; h++) hours += '<span style="top:' + (h * HOUR_PX) + 'px">' + pad(h) + ":00</span>";
    hours += "</div>";
    cal.innerHTML = head + allDayRow + '<div class="tg-scroll" id="tg-scroll"><div class="tg-body"' + style + ">" + hours + cols + "</div></div>";

    // Start the day around working hours, or just above "now" when today is visible
    const scroller = document.getElementById("tg-scroll");
    const hasToday = days.some((d) => sameDay(d, today));
    const focusHour = hasToday ? Math.max(0, Math.min(today.getHours() - 1, 16)) : 8;
    scroller.scrollTop = focusHour * HOUR_PX;
  }

  function render() {
    document.getElementById("range-label").textContent = rangeLabel();
    document.querySelectorAll(".seg [data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === state.view)));
    if (state.view === "month") renderMonth();
    else if (state.view === "week") { const f = startOfWeek(state.cursor); renderTimeGrid([0, 1, 2, 3, 4, 5, 6].map((i) => addDays(f, i))); }
    else renderTimeGrid([startOfDay(state.cursor)]);
  }

  // ---- navigation
  function setView(view) {
    if (view === state.view) return;
    state.view = view;
    writePref("portal-cal-view", view);
    load();
  }
  function step(direction) {
    if (state.view === "day") state.cursor = addDays(state.cursor, direction);
    else if (state.view === "week") state.cursor = addDays(state.cursor, 7 * direction);
    else state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + direction, 1);
    load();
  }
  function goToday() { state.cursor = startOfDay(new Date()); load(); }
  function goToDay(dateStr) { state.cursor = fromInputs(dateStr); state.view = "day"; writePref("portal-cal-view", "day"); load(); }

  document.querySelectorAll(".seg [data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
  document.getElementById("prev-btn").addEventListener("click", () => step(-1));
  document.getElementById("next-btn").addEventListener("click", () => step(1));
  document.getElementById("today-btn").addEventListener("click", goToday);
  document.getElementById("new-event-btn").addEventListener("click", () => {
    const base = sameDay(state.cursor, new Date()) || state.view !== "day" ? new Date() : state.cursor;
    const start = new Date(base); start.setMinutes(0, 0, 0); start.setHours(Math.min(Math.max(start.getHours() + 1, 9), 22));
    openEditor(null, start, new Date(start.getTime() + 3600000), false);
  });
  document.getElementById("show-deadlines").addEventListener("change", (e) => {
    state.showDeadlines = e.target.checked;
    writePref("portal-cal-deadlines", e.target.checked ? "1" : "0");
    load();
  });

  // One delegated handler for everything clickable inside the calendar
  cal.addEventListener("click", (e) => {
    const eventBtn = e.target.closest("[data-event]");
    if (eventBtn) { e.stopPropagation(); const ev = state.events.find((x) => x.id === eventBtn.dataset.event); if (ev) openEditor(ev); return; }
    if (e.target.closest("a.ev")) return; // deadline link navigates to Taken
    const goto = e.target.closest("[data-goto]");
    if (goto) { goToDay(goto.dataset.goto); return; }
    const col = e.target.closest(".tg-col");
    if (col) {
      const y = e.clientY - col.getBoundingClientRect().top;
      const minutes = Math.max(0, Math.min(1410, Math.floor(y / HOUR_PX * 2) * 30));
      const start = fromInputs(col.dataset.date); start.setMinutes(minutes);
      openEditor(null, start, new Date(start.getTime() + 3600000), false);
      return;
    }
    const cell = e.target.closest(".m-cell");
    if (cell) { const start = fromInputs(cell.dataset.date, "09:00"); openEditor(null, start, new Date(start.getTime() + 3600000), false); }
  });

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || document.querySelector(".modal-backdrop.open")) return;
    if (e.target.closest("input, textarea, select, [contenteditable]")) return;
    const key = e.key.toLowerCase();
    if (key === "d") setView("day");
    else if (key === "w") setView("week");
    else if (key === "m") setView("month");
    else if (key === "t") goToday();
    else if (key === "n") { e.preventDefault(); document.getElementById("new-event-btn").click(); }
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else return;
  });

  // ---- editor
  let editing = null;
  const form = document.getElementById("event-form");
  const allDayBox = document.getElementById("ev-allday");
  const when = document.getElementById("when");
  const FIELD_IDS = ["ev-title", "ev-allday", "ev-start-date", "ev-start-time", "ev-end-date", "ev-end-time", "ev-location", "ev-description"];

  allDayBox.addEventListener("change", () => when.classList.toggle("all-day", allDayBox.checked));
  // Moving the start keeps the duration, like most calendars
  let lastStart = null;
  ["ev-start-date", "ev-start-time"].forEach((id) => document.getElementById(id).addEventListener("change", () => {
    const sd = document.getElementById("ev-start-date").value, ed = document.getElementById("ev-end-date").value;
    if (!sd || !ed || !lastStart) return;
    const newStart = fromInputs(sd, allDayBox.checked ? "00:00" : document.getElementById("ev-start-time").value);
    const oldEnd = fromInputs(ed, allDayBox.checked ? "00:00" : document.getElementById("ev-end-time").value);
    const moved = new Date(oldEnd.getTime() + (newStart - lastStart));
    document.getElementById("ev-end-date").value = dateInput(moved);
    if (!allDayBox.checked) document.getElementById("ev-end-time").value = timeInput(moved);
    lastStart = newStart;
  }));

  function openEditor(ev, start, end, allDay) {
    editing = ev;
    const canEdit = !ev || ev.canEdit;
    document.getElementById("event-modal-title").textContent = ev ? (canEdit ? "Afspraak bewerken" : ev.title) : "Nieuwe afspraak";
    document.getElementById("ev-id").value = ev ? ev.id : "";
    document.getElementById("ev-title").value = ev ? ev.title : "";
    const s = ev ? ev.start : start, en = ev ? ev.end : end, ad = ev ? ev.allDay : allDay;
    allDayBox.checked = ad;
    when.classList.toggle("all-day", ad);
    document.getElementById("ev-start-date").value = dateInput(s);
    document.getElementById("ev-start-time").value = timeInput(s);
    // All-day end is stored exclusive (next midnight); show the last day instead
    const shownEnd = ad ? addDays(en, -1) : en;
    document.getElementById("ev-end-date").value = dateInput(shownEnd);
    document.getElementById("ev-end-time").value = timeInput(en);
    lastStart = ad ? startOfDay(s) : s;
    const color = ev ? ev.color : "blue";
    form.querySelectorAll('input[name="ev-color"]').forEach((r) => { r.checked = r.value === color; r.disabled = !canEdit; });
    document.getElementById("ev-location").value = ev ? ev.location : "";
    document.getElementById("ev-description").value = ev ? ev.description : "";
    FIELD_IDS.forEach((id) => { document.getElementById(id).disabled = !canEdit; });
    const meta = document.getElementById("ev-meta");
    meta.hidden = !ev;
    if (ev) meta.textContent = "Aangemaakt door " + ev.createdByName + (canEdit ? "" : " · alleen de maker of een admin kan deze afspraak wijzigen");
    document.getElementById("ev-delete").hidden = !(ev && canEdit);
    document.getElementById("ev-save").hidden = !canEdit;
    document.getElementById("ev-error").textContent = "";
    openModal(backdrop);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("ev-error");
    errorEl.textContent = "";
    const title = document.getElementById("ev-title").value.trim();
    const sd = document.getElementById("ev-start-date").value, ed = document.getElementById("ev-end-date").value;
    if (!title) { errorEl.textContent = "Geef de afspraak een titel."; document.getElementById("ev-title").focus(); return; }
    if (!sd || !ed) { errorEl.textContent = "Kies een begin- en einddatum."; return; }
    const allDay = allDayBox.checked;
    const start = allDay ? fromInputs(sd) : fromInputs(sd, document.getElementById("ev-start-time").value || "09:00");
    const end = allDay ? addDays(fromInputs(ed), 1) : fromInputs(ed, document.getElementById("ev-end-time").value || "10:00");
    if (end <= start) { errorEl.textContent = "Het einde moet na het begin liggen."; return; }
    const payload = {
      title, allDay, start: start.toISOString(), end: end.toISOString(),
      color: (form.querySelector('input[name="ev-color"]:checked') || {}).value || "blue",
      location: document.getElementById("ev-location").value,
      description: document.getElementById("ev-description").value,
    };
    await withBusy(document.getElementById("ev-save"), async () => {
      try {
        if (editing) await fetchJson("/api/portal/events/" + editing.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        else await fetchJson("/api/portal/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } catch (err) { errorEl.textContent = err.message; return; }
      closeModal(backdrop);
      toast(editing ? "Afspraak opgeslagen" : "Afspraak toegevoegd", "success");
      load();
    });
  });

  document.getElementById("ev-delete").addEventListener("click", async (e) => {
    if (!editing || !confirm("Afspraak “" + editing.title + "” verwijderen?")) return;
    await withBusy(e.currentTarget, () => fetchJson("/api/portal/events/" + editing.id, { method: "DELETE" }));
    closeModal(backdrop);
    toast("Afspraak verwijderd", "success");
    load();
  });

  // ---- Apple Calendar subscription
  const feedBackdrop = document.getElementById("feed-backdrop");
  function showFeed(urls) {
    document.getElementById("feed-url").value = urls.httpsUrl;
    document.getElementById("feed-webcal").href = urls.webcalUrl;
  }
  document.getElementById("feed-btn").addEventListener("click", async () => {
    openModal(feedBackdrop);
    showFeed(await fetchJson("/api/portal/calendar/feed"));
  });
  document.getElementById("feed-copy").addEventListener("click", async () => {
    const input = document.getElementById("feed-url");
    try { await navigator.clipboard.writeText(input.value); }
    catch (e) { input.select(); document.execCommand("copy"); }
    toast("Link gekopieerd", "success");
  });
  const rotateBtn = document.getElementById("feed-rotate");
  if (rotateBtn) rotateBtn.addEventListener("click", async () => {
    if (!confirm("Nieuwe link maken? Iedereen die nu geabonneerd is, moet zich opnieuw abonneren met de nieuwe link.")) return;
    await withBusy(rotateBtn, async () => {
      showFeed(await fetchJson("/api/portal/calendar/feed/rotate", { method: "POST" }));
      toast("Nieuwe link gemaakt — deel hem opnieuw met het team", "success");
    });
  });

  // Keep the "now" line honest if the page stays open
  setInterval(() => {
    const line = cal.querySelector(".now-line");
    if (!line) return;
    const now = new Date();
    if (!sameDay(now, fromInputs(line.parentElement.dataset.date))) { render(); return; }
    line.style.top = ((now.getHours() * 60 + now.getMinutes()) / 60 * HOUR_PX) + "px";
  }, 60 * 1000);

  load();
</script>
</body>
</html>`;
}

module.exports = { calendarPage };
