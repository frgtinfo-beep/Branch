// Mobile hamburger menu logic now lives in the shared nav.js (loaded on every page)

// ==========================================
// GOOGLE TRANSLATE WIDGET
// ==========================================

function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: 'en', // Your website's default language
    includedLanguages: 'en,nl,fr,de,es', // English, Dutch, French, German, Spanish
    layout: google.translate.TranslateElement.InlineLayout.SIMPLE
  }, 'google_translate_element');
}