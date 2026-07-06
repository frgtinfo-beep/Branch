function googleTranslateElementInit() {
      new google.translate.TranslateElement({
        pageLanguage: 'en', // Your website's default language
        includedLanguages: 'en,nl,fr,de,es', // Optional: Limit the languages (English, Dutch, French, German, Spanish). Remove this line for all languages.
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE
      }, 'google_translate_element');
    }
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });