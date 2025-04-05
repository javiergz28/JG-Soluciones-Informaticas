// Scroll suave para enlaces del menú
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', function (e) {
      if (this.hash !== '') {
        e.preventDefault();
        const target = document.querySelector(this.hash);
        if (target) {
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
  
  // Interacción con botón de servicios
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.querySelector('.hero .btn');
    if (btn) {
      btn.addEventListener('click', () => {
        alert('Te llevaremos a conocer nuestros servicios. ¡Gracias por visitarnos!');
      });
    }
  
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
  });
  