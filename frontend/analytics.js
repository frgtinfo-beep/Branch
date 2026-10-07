// Cookieless site analytics for the Branch team portal.
// Stores nothing on the visitor's device and sends no identifiers; the server
// counts unique visitors per day without keeping IP addresses. Visitors whose
// browser asks not to be tracked (GPC / Do Not Track) are skipped entirely.
(function () {
  var optedOut = navigator.globalPrivacyControl === true || navigator.doNotTrack === "1" || window.doNotTrack === "1";
  if (optedOut) {
    window.branchTrack = function () {};
    return;
  }

  var host = location.hostname;
  var sameOrigin = host === "localhost" || host === "127.0.0.1" || /onrender\.com$/.test(host);
  var ENDPOINT = sameOrigin ? "/api/collect" : "https://branchdb.onrender.com/api/collect";

  function device() {
    var w = window.innerWidth || screen.width;
    return w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop";
  }
  function lang() {
    // Same rule as translations.js: Dutch unless the visitor picked English
    try { return localStorage.getItem("branch_language") === "en" ? "en" : "nl"; } catch (e) { return "nl"; }
  }
  function path() {
    var p = location.pathname.replace(/\/+$/, "") || "/";
    return p === "/" ? "/index.html" : p;
  }

  function send(payload) {
    payload.path = path();
    payload.device = device();
    payload.lang = lang();
    payload.host = host;
    var body = JSON.stringify(payload);
    // text/plain keeps this a "simple" request: no CORS preflight, survives page unload
    if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "text/plain" }))) return;
    try { fetch(ENDPOINT, { method: "POST", body: body, keepalive: true, headers: { "Content-Type": "text/plain" } }); } catch (e) {}
  }

  // Page view: referrer is reduced to a host name, and only when it's another site
  var ref = "";
  try {
    var params = new URLSearchParams(location.search);
    ref = params.get("utm_source") || "";
    if (!ref && document.referrer) {
      var refHost = new URL(document.referrer).hostname.replace(/^www\./, "");
      if (refHost && refHost !== host.replace(/^www\./, "")) ref = refHost;
    }
  } catch (e) {}
  send({ type: "pageview", ref: ref });

  window.branchTrack = function (name, label) { send({ type: "event", name: name, label: label || "" }); };

  // Time on page: only counts while the tab is visible AND the visitor was
  // active in the last minute, so a forgotten background tab doesn't inflate it.
  var TICK = 5, IDLE_MS = 60000;
  var activeSeconds = 0;
  var lastActivity = Date.now();
  ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"].forEach(function (type) {
    window.addEventListener(type, function () { lastActivity = Date.now(); }, { passive: true, capture: true });
  });
  setInterval(function () {
    if (document.visibilityState === "visible" && Date.now() - lastActivity < IDLE_MS) activeSeconds += TICK;
  }, TICK * 1000);
  function flushDuration() {
    if (activeSeconds <= 0) return;
    send({ type: "duration", seconds: activeSeconds });
    activeSeconds = 0; // coming back to the tab starts a new segment
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") flushDuration();
    else lastActivity = Date.now();
  });
  window.addEventListener("pagehide", flushDuration);

  // Where on the page a click happened, in words the dashboard can show
  function placeOf(el) {
    if (el.closest("#site-nav, #mobile-menu")) return "Menu";
    if (el.closest("footer")) return "Footer";
    var section = el.closest("section, header");
    if (!section) return "Pagina";
    if (section.querySelector("h1")) return "Hero";
    if (section.id === "packages") return "Pakketten";
    if (section.classList.contains("bg-cta-gradient")) return "Call-to-action";
    return "Pagina";
  }
  function packageName(el) {
    var card = el.closest("article");
    var heading = card && card.querySelector("h3[data-i18n]");
    var m = heading && heading.getAttribute("data-i18n").match(/^pkg(\d)_name$/);
    return m ? "Pakket " + m[1] : "";
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("a, button, summary");
    if (!el) return;
    var href = el.getAttribute("href") || "";

    if (el.matches("summary") && el.closest("#packages")) return window.branchTrack("package_details", packageName(el));
    if (el.matches(".lang-option")) return window.branchTrack("language", el.getAttribute("data-lang") || "");
    if (/wa\.me|whatsapp/i.test(href)) return window.branchTrack("whatsapp", placeOf(el));
    if (href.indexOf("tel:") === 0) return window.branchTrack("phone", placeOf(el));
    if (href.indexOf("mailto:") === 0) return window.branchTrack("email", placeOf(el));
    if (href === "#packages") return window.branchTrack("view_packages", placeOf(el));
    if (/contact\.html/.test(href)) {
      var pkg = packageName(el);
      if (pkg) return window.branchTrack("package_cta", pkg);
      if (el.getAttribute("data-i18n") === "hero_cta") return window.branchTrack("start_project", placeOf(el));
      return window.branchTrack("contact_link", placeOf(el));
    }
    if (/(privacy|terms|refund|cookies)\.html/.test(href)) return window.branchTrack("legal_link", href.replace(".html", ""));
    if (/\/portal\/login|\/admin/.test(href)) return window.branchTrack("portal_link", "");
  }, true);
})();
