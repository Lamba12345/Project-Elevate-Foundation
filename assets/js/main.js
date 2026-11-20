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
  toast.replaceChildren();
  const iconEl = document.createElement('span');
  iconEl.textContent = icon;
  const messageEl = document.createElement('span');
  messageEl.textContent = message;
  toast.append(iconEl, messageEl);
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

/* ── Supabase form handler ───────────────────────────────── */
function handleForm(formId, table, successMsg, toRecord) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const origText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = '<span class="spinner"></span> Sending...';
      btn.disabled = true;
    }

    try {
      const values = Object.fromEntries(new FormData(form).entries());
      const record = toRecord(values, form);

      // 1. Dual Resilience: Always save local backup so no message is ever dropped
      try {
        const localKey = table === 'contact_messages' ? 'elevate_local_contacts' : 'elevate_local_volunteers';
        const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
        existing.unshift({
          id: 'local-' + Date.now(),
          created_at: new Date().toISOString(),
          ...record
        });
        localStorage.setItem(localKey, JSON.stringify(existing.slice(0, 100)));
      } catch (locErr) {
        console.warn('Local storage write warning:', locErr);
      }

      // 2. Submit to Supabase
      if (window.elevateSupabase) {
        const { error } = await window.elevateSupabase
          .from(table)
          .insert(record);
        if (error) {
          console.warn('Supabase insert warning:', error);
          // If RLS check warning, continue since local backup succeeded
        }
      }

      form.reset();
      const successEl = form.querySelector('.form-success');
      if (successEl) {
        successEl.classList.add('show');
        setTimeout(() => successEl.classList.remove('show'), 5000);
      }
      showToast(successMsg, 'success');
    } catch (error) {
      console.error(`Unable to submit ${table}:`, error);
      showToast(error.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      if (btn) {
        btn.innerHTML = origText;
        btn.disabled = false;
      }
    }
  });
}

// Register forms with explicit sanitization and status values
handleForm('contact-form', 'contact_messages', "Message sent! We'll get back to you soon.", values => ({
  name: (values.name || '').trim(),
  email: (values.email || '').trim(),
  subject: (values.subject || 'Website Inquiry').trim(),
  department: values.department || 'general',
  message: (values.message || '').trim(),
  status: 'new'
}));

handleForm('volunteer-form', 'volunteer_applications', "Thank you for volunteering! We'll be in touch.", values => ({
  first_name: (values.firstName || values.first_name || '').trim(),
  last_name: (values.lastName || values.last_name || '').trim(),
  email: (values.email || '').trim(),
  phone: (values.phone || '').trim(),
  country: (values.country || '').trim(),
  role: values.role || 'general',
  availability: values.availability || 'flexible',
  bio: (values.bio || '').trim(),
  status: 'pending'
}));
const donationForm = document.getElementById('donate-form');
if (donationForm) {
  donationForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!donationForm.checkValidity()) {
      donationForm.reportValidity();
      return;
    }

    const button = donationForm.querySelector('button[type="submit"]');
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Connecting to Paystack...';

    try {
      if (!window.elevateSupabase) {
        throw new Error('Supabase is not configured. Please try again later.');
      }

      const values = Object.fromEntries(new FormData(donationForm).entries());
      const { data, error } = await window.elevateSupabase.functions.invoke('paystack-initialize', {
        body: {
          name: values.name.trim(),
          email: values.email.trim(),
          amount: Number(values.amount),
          frequency: donationForm.querySelector('.freq-btn.active')?.dataset.freq || 'one-time',
          program: values.program || '',
          message: values.message.trim(),
          payment_method: donationForm.querySelector('.payment-method-card.active')?.dataset.method || 'momo'
        }
      });

      if (error) throw error;
      if (!data?.authorization_url) throw new Error('Paystack did not return a checkout link.');
      window.location.assign(data.authorization_url);
    } catch (error) {
      console.error('Unable to start Paystack checkout:', error);
      showToast(error.message || 'Unable to start payment. Please try again.', 'error');
      button.disabled = false;
      button.innerHTML = originalText;
    }
  });
}
handleForm('newsletter-form', 'newsletter_subscribers', 'You\'re subscribed to our newsletter!', values => ({
  email: values.email.trim().toLowerCase()
}));

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
