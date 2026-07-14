    // 1. Mobile Hamburger Menu Logic
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    tailwind.config = {
      theme: {
        extend: {
          colors: {
            'branch-blue-dark': '#032f8a',
            'branch-blue': '#0bddff',
            'branch-cyan': '#14b8e6',
            'branch-green': '#78db55',
            'background': '#f7f7f7',
            'text-dark': '#111827',
            'text-light': '#6b7280',
          },
          fontFamily: {
            sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
          }
        }
      }
    }

    if(hamburger && navLinks) {
      hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('hidden');
        navLinks.classList.toggle('flex');
        navLinks.classList.toggle('flex-col');
        navLinks.classList.toggle('absolute');
        navLinks.classList.toggle('top-full');
        navLinks.classList.toggle('left-0');
        navLinks.classList.toggle('w-full');
        navLinks.classList.toggle('bg-white/95');
        navLinks.classList.toggle('backdrop-blur-xl');
        navLinks.classList.toggle('p-6');
        navLinks.classList.toggle('shadow-2xl');
      });
    }

    // 2. Intersection Observer for Scroll Animations
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