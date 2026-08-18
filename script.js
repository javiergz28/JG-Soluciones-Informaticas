/* ==========================================================================
   JG Soluciones Informáticas
   Sin alert(), sin auto-rotación, con prefers-reduced-motion respetado.
   ========================================================================== */
(function () {
  'use strict';

  // Marca JS para que .reveal solo se oculte si hay JS (crawlers y no-JS ven todo)
  document.documentElement.classList.add('js');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.addEventListener('DOMContentLoaded', function () {

    /* ---------- 1. Año del footer ---------- */
    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    /* ---------- 2. Sombra del header al scrollear ---------- */
    var header = document.querySelector('.site-header');
    if (header) {
      var onScroll = function () {
        header.classList.toggle('is-scrolled', window.scrollY > 8);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    /* ---------- 3. Menú mobile accesible ---------- */
    var toggle = document.getElementById('navToggle');
    var list = document.getElementById('navList');

    if (toggle && list) {
      var mqMobile = window.matchMedia('(max-width: 1100px)');

      var setNav = function (open) {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
        list.hidden = !open;
      };

      var syncNav = function () {
        // En desktop el menú siempre visible; en mobile arranca cerrado
        setNav(!mqMobile.matches);
      };

      toggle.addEventListener('click', function () {
        setNav(toggle.getAttribute('aria-expanded') !== 'true');
      });

      // Cerrar al elegir un destino
      list.addEventListener('click', function (e) {
        if (e.target.closest('a') && mqMobile.matches) setNav(false);
      });

      // Cerrar con Escape y devolver el foco al botón
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && mqMobile.matches && toggle.getAttribute('aria-expanded') === 'true') {
          setNav(false);
          toggle.focus();
        }
      });

      mqMobile.addEventListener('change', syncNav);
      syncNav();
    }

    /* ---------- 4. Link activo según la sección visible ---------- */
    var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__link[href^="#"]'));
    var sections = navLinks
      .map(function (a) { return document.querySelector(a.getAttribute('href')); })
      .filter(Boolean);

    if (sections.length && 'IntersectionObserver' in window) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navLinks.forEach(function (a) {
            var isCurrent = a.getAttribute('href') === '#' + entry.target.id;
            if (isCurrent) { a.setAttribute('aria-current', 'true'); }
            else { a.removeAttribute('aria-current'); }
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach(function (s) { spy.observe(s); });
    }

    /* ---------- 5. Scroll reveal (tier Subtle: fade + 12px) ---------- */
    var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

    var showAll = function () {
      revealEls.forEach(function (el) { el.classList.add('is-in'); });
    };

    var initReveal = function () {
      if (reduced.matches || !('IntersectionObserver' in window)) {
        showAll();               // estado final inmediato, sin animar
        return null;
      }
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          obs.unobserve(entry.target);     // una sola vez, no re-anima al volver
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
      revealEls.forEach(function (el) { io.observe(el); });
      return io;
    };

    var revealObserver = initReveal();

    // Si el usuario cambia la preferencia en caliente, respetarla al instante
    reduced.addEventListener('change', function () {
      if (revealObserver) revealObserver.disconnect();
      showAll();
      revealObserver = reduced.matches ? null : initReveal();
    });

    /* ---------- 6. FAQ: solo un panel abierto a la vez ---------- */
    var faqItems = Array.prototype.slice.call(document.querySelectorAll('.faq__item'));
    faqItems.forEach(function (item) {
      item.addEventListener('toggle', function () {
        if (!item.open) return;
        faqItems.forEach(function (other) { if (other !== item) other.open = false; });
      });
    });

    /* ---------- 7. Formulario: envío sin salir de la página ---------- */
    var form = document.getElementById('contactForm');
    var status = document.getElementById('formStatus');
    var statusText = document.getElementById('formStatusText');

    if (form && status && statusText) {
      form.addEventListener('submit', function (e) {
        // Validación nativa: el foco va al primer campo con error, no a un resumen arriba
        if (!form.checkValidity()) {
          e.preventDefault();
          var firstInvalid = form.querySelector(':invalid');
          if (firstInvalid) firstInvalid.focus();
          return;
        }

        e.preventDefault();
        var submitBtn = form.querySelector('button[type="submit"]');
        var originalLabel = submitBtn ? submitBtn.textContent : '';

        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Enviando…'; }

        fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        })
          .then(function (res) {
            if (!res.ok) throw new Error('Formspree respondió ' + res.status);
            form.reset();
            statusText.textContent = 'Recibimos tu consulta. Te respondemos por correo a la brevedad. Si es urgente, escribinos por WhatsApp al 098 335 277.';
            status.style.borderLeftColor = 'var(--color-success)';
            status.hidden = false;
          })
          .catch(function () {
            statusText.textContent = 'No pudimos enviar el formulario. Escribinos por WhatsApp al 098 335 277 y lo resolvemos igual.';
            status.style.borderLeftColor = 'var(--color-destructive)';
            status.hidden = false;
          })
          .finally(function () {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
            status.scrollIntoView({ block: 'nearest', behavior: reduced.matches ? 'auto' : 'smooth' });
          });
      });
    }
  });
})();
