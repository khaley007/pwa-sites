document.documentElement.classList.add('js'); // no-JS reveal gate: CSS scopes .reveal hiding under html.js
// Shared site JS: mobile nav toggle, lead form submit, scroll reveal.
(function () {
  // Mobile nav
  var toggle = document.querySelector('[data-nav-toggle]');
  var menu = document.querySelector('[data-nav-menu]');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Preview build: forms remain visible but never submit.
  document.querySelectorAll('[data-lead-form]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    });
  });
  // Scroll reveal (respects reduced motion)
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
  }
})();
