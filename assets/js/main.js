// ============================================================
// PROJECT ELEVATE FOUNDATION — Shared JavaScript
// ============================================================

/* ── Navbar scroll behaviour ─────────────────────────────── */
const navbar = document.getElementById('navbar');
function updateNavbar() {
  if (!navbar) return;
  if (window.scrollY > 60) {
    navbar.classList.remove('transparent');
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.add('transparent');
    navbar.classList.remove('scrolled');
  }
}
if (navbar) {
  // Only apply transparent mode on index (has hero image)
  if (document.body.dataset.page === 'home') {
    navbar.classList.add('transparent');
  } else {
    navbar.classList.add('scrolled');
  }
  window.addEventListener('scroll', updateNavbar, { passive: true });
}

/* ── Mobile nav toggle ───────────────────────────────────── */
const hamburger  = document.getElementById('hamburger');
const mobileNav  = document.getElementById('mobile-nav');
if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
    const open = mobileNav.classList.contains('open');
    hamburger.setAttribute('aria-expanded', open);
  });
  // Close on link click
  mobileNav.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => mobileNav.classList.remove('open'))
  );
}

/* ── Active nav link ─────────────────────────────────────── */
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a, .mobile-nav a').forEach(a => {
  if (a.getAttribute('href') === currentPage) a.classList.add('active');
});

/* ── Scroll-to-top ───────────────────────────────────────── */
const scrollTopBtn = document.getElementById('scroll-top');
if (scrollTopBtn) {
  window.addEventListener('scroll', () => {
    scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ── Reveal on scroll (IntersectionObserver) ─────────────── */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ── Animated number counter ─────────────────────────────── */
function animateCounter(el) {
  const target  = parseInt(el.dataset.target, 10);
  const duration = 1800;
  const step     = target / (duration / 16);
  let current    = 0;
  const suffix   = el.dataset.suffix || '';
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = Math.floor(current).toLocaleString() + suffix;
    if (current >= target) clearInterval(timer);
  }, 16);
}

const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('[data-target]').forEach(animateCounter);
      counterObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.stats-grid').forEach(el => counterObserver.observe(el));

/* ── Toast notification ──────────────────────────────────── */
function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '✅' : '❌';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

/* ── Generic form handler ────────────────────────────────── */
function handleForm(formId, endpoint, successMsg) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const origText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Sending...';
    btn.disabled = true;

    // Collect form data
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      // -- Spring Boot endpoint integration --
      // In production, replace the mock below with:
      // const res = await fetch(endpoint, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data)
      // });
      // if (!res.ok) throw new Error();

      // Mock success (remove when backend is connected)
      await new Promise(r => setTimeout(r, 1200));

      form.reset();
      const successEl = form.querySelector('.form-success');
      if (successEl) { successEl.classList.add('show'); setTimeout(() => successEl.classList.remove('show'), 5000); }
      showToast(successMsg, 'success');
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      btn.innerHTML = origText;
      btn.disabled = false;
    }
  });
}

// Register forms
handleForm('contact-form',   '/api/contact',   'Message sent! We\'ll get back to you soon.');
handleForm('volunteer-form', '/api/volunteer',  'Thank you for volunteering! We\'ll be in touch.');
handleForm('donate-form',    '/api/donate',     'Thank you for your generous donation! 💚');
handleForm('newsletter-form','/api/newsletter', 'You\'re subscribed to our newsletter!');

/* ── Progress bar animation ──────────────────────────────── */
const progressObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.querySelectorAll('.progress-fill').forEach(fill => {
        const target = fill.dataset.width || '0';
        setTimeout(() => fill.style.width = target, 200);
      });
      progressObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.programs-grid').forEach(el => progressObserver.observe(el));
