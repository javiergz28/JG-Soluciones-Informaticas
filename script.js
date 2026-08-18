// Scroll suave para cualquier enlace interno (#ancla)
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', function (e) {
    const hash = this.getAttribute('href');
    if (hash.length > 1) {
      const target = document.querySelector(hash);
      if (target) {
        e.preventDefault();
        window.scrollTo({
          top: target.offsetTop - 80,
          behavior: 'smooth'
        });
      }
    }
  });
});

// Mensaje de bienvenida en consola
console.log("Bienvenido a JG Soluciones Informáticas");

document.addEventListener('DOMContentLoaded', () => {
  // Slider de contacto con clases "active"
  const slides = document.querySelectorAll('#slider-contacto .slide');
  if (slides.length > 0) {
    let currentIndex = 0;

    function showSlide(index) {
      slides.forEach((slide, i) => {
        slide.classList.remove('active');
        if (i === index) slide.classList.add('active');
      });
    }

    showSlide(currentIndex);

    setInterval(() => {
      currentIndex = (currentIndex + 1) % slides.length;
      showSlide(currentIndex);
    }, 3000);
  }

  // Acordeón de preguntas frecuentes
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(open => open.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  // Header que se contrae al hacer scroll
  const header = document.querySelector('.main-header');
  if (header) {
    const updateHeader = () => header.classList.toggle('scrolled', window.scrollY > 40);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  // Reveal-on-scroll con animación escalonada por grupo
  const revealGroups = document.querySelectorAll('.cards-grid, .price-list, .faq-list');
  revealGroups.forEach(group => {
    group.querySelectorAll('.reveal').forEach((el, i) => {
      el.style.transitionDelay = `${i * 80}ms`;
    });
  });

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // Scrollspy: resalta el link del nav de la sección visible
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  const sections = Array.from(navLinks)
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if (sections.length > 0) {
    const spyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(link => link.classList.remove('active'));
          const activeLink = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
          if (activeLink) activeLink.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(section => spyObserver.observe(section));
  }
});
