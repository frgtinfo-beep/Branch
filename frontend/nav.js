// Shared mobile nav toggle — same markup/behavior on every page (#hamburger-btn + #mobile-menu)
(function () {
  function init() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (!hamburgerBtn || !mobileMenu) return;

    const setMenuOpen = (open) => {
      mobileMenu.classList.toggle('open', open);
      hamburgerBtn.classList.toggle('open', open);
      hamburgerBtn.setAttribute('aria-expanded', String(open));
    };

    hamburgerBtn.addEventListener('click', () => {
      setMenuOpen(!mobileMenu.classList.contains('open'));
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMenuOpen(false));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
