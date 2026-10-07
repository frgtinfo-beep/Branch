// Google Analytics, loaded only after the visitor agrees (Dutch law: analytics cookies need consent).
// Must load before translations.js so the banner's data-i18n text is translated with the rest of the page.
(function () {
  var GA_ID = 'G-Y0YBBMP6QF';
  var STORAGE_KEY = 'branch_consent';

  // Dutch fallback; translations.js swaps the data-i18n text when another language is active
  var FALLBACK = {
    consent_text: 'Mogen we Google Analytics gebruiken? Dat plaatst cookies waarmee we zien hoe de website wordt gebruikt. U kunt uw keuze altijd wijzigen via “Cookie-instellingen” onderaan de pagina. Lees ons <a href="cookies.html" class="font-semibold underline underline-offset-4">cookiebeleid</a>.',
    consent_accept: 'Accepteren',
    consent_decline: 'Weigeren',
  };
  function t(key) { return (window.branchT && window.branchT(key)) || FALLBACK[key]; }

  function getChoice() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function saveChoice(choice) {
    try { localStorage.setItem(STORAGE_KEY, choice); } catch (e) {}
  }

  function loadAnalytics() {
    if (window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  function clearAnalyticsCookies() {
    var host = location.hostname;
    var domains = ['', host, '.' + host, '.' + host.split('.').slice(-2).join('.')];
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name.indexOf('_ga') !== 0) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  var banner = null;
  function hideBanner() {
    if (banner) { banner.remove(); banner = null; }
  }

  function showBanner() {
    if (banner) return;
    banner = document.createElement('div');
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookies');
    banner.className = 'fixed z-[60] bottom-4 left-4 right-4 sm:right-auto sm:max-w-[26rem] bg-white text-ink border border-black/10 shadow-[0_16px_48px_-12px_rgba(3,47,138,0.35)] p-5';
    banner.innerHTML =
      '<p class="text-[0.92rem] leading-relaxed text-[#374151] mb-4" data-i18n="consent_text"></p>' +
      '<div class="grid grid-cols-2 gap-3">' +
        '<button type="button" data-consent="granted" class="btn inline-flex justify-center items-center py-3 px-4 text-sm font-bold uppercase tracking-wide text-white bg-branch-blue-dark border-2 border-branch-blue-dark hover:bg-ink hover:border-ink" data-i18n="consent_accept"></button>' +
        '<button type="button" data-consent="denied" class="btn inline-flex justify-center items-center py-3 px-4 text-sm font-bold uppercase tracking-wide text-branch-blue-dark border-2 border-branch-blue-dark hover:bg-branch-blue-dark hover:text-white" data-i18n="consent_decline"></button>' +
      '</div>';
    banner.querySelectorAll('[data-i18n]').forEach(function (el) { el.innerHTML = t(el.getAttribute('data-i18n')); });
    banner.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-consent]');
      if (!btn) return;
      var choice = btn.getAttribute('data-consent');
      var previous = getChoice();
      saveChoice(choice);
      hideBanner();
      if (choice === 'granted') {
        loadAnalytics();
      } else if (previous === 'granted') {
        // Withdrawn: stop GA and remove its cookies; reload so the loaded script is gone too
        window['ga-disable-' + GA_ID] = true;
        clearAnalyticsCookies();
        location.reload();
      }
    });
    document.body.appendChild(banner);
  }

  // Footer "Cookie-instellingen" reopens the choice
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('[data-cookie-settings]')) return;
    e.preventDefault();
    showBanner();
    var first = banner && banner.querySelector('button');
    if (first) first.focus();
  });

  // A browser "do not track" signal counts as a refusal: no banner, no Google Analytics
  var gpc = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  var choice = getChoice();
  if (choice === 'granted' && !gpc) loadAnalytics();
  else if (!choice && !gpc) showBanner();
})();
