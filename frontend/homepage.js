    // Mobile hamburger menu logic now lives in the shared nav.js (loaded on every page)

    // Intersection Observer for Scroll Animations
    document.addEventListener("DOMContentLoaded", function() {
      const reveals = document.querySelectorAll(".reveal");

      const revealOptions = {
        threshold: 0.15, // Triggers when 15% of the element is visible
        rootMargin: "0px 0px -50px 0px" // Triggers slightly before it enters the viewport completely
      };

      const revealOnScroll = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
          if (!entry.isIntersecting) {
            return;
          } else {
            entry.target.classList.add("active");
            observer.unobserve(entry.target); // Stops observing once the animation completes
          }
        });
      }, revealOptions);

      reveals.forEach(reveal => {
        revealOnScroll.observe(reveal);
      });
    });

// Google Translate Initialization Widget
function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: 'en',
    includedLanguages: 'en,nl,fr,de,es', // English, Dutch, French, German, Spanish
    layout: google.translate.TranslateElement.InlineLayout.SIMPLE
  }, 'google_translate_element');
}