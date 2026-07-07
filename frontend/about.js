// ==========================================
// 1. MOBILE NAVBAR CONTROLS
// ==========================================

const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

// Safety check to ensure elements exist before adding event listeners
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });
}

// ==========================================
// 2. GOOGLE TRANSLATE WIDGET
// ==========================================

function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: 'en', // Your website's default language
    includedLanguages: 'en,nl,fr,de,es', // English, Dutch, French, German, Spanish
    layout: google.translate.TranslateElement.InlineLayout.SIMPLE
  }, 'google_translate_element');
}