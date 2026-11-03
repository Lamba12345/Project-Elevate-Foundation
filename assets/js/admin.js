// ============================================================
// Admin Panel — Mock data display + Spring Boot API integration
// ============================================================

// Tab switching
const navLinks = document.querySelectorAll('.admin-nav-link');
const tabs     = document.querySelectorAll('.admin-tab');

navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    navLinks.forEach(l => l.classList.remove('active'));
    tabs.forEach(t => t.classList.remove('active'));
    link.classList.add('active');
    document.getElementById('tab-' + link.dataset.tab).classList.add('active');
  });
});

// ── Mock data (replace with actual API calls in production) ──
// In production, fetch from Spring Boot:
// const res = await fetch('/api/contacts');
// const data = await res.json();

const contacts = [
  { id: 1, name: 'Sarah Johnson', email: 'sarah.j@email.com', subject: 'Partnership Inquiry', dept: 'Partnerships', date: '2026-10-30', status: 'new' },
  { id: 2, name: 'Michael Chen', email: 'm.chen@corp.com', subject: 'Donation Query', dept: 'Donations', date: '2026-10-29', status: 'read' },
  { id: 3, name: 'Amara Diallo', email: 'amara@example.com', subject: 'Volunteer Question', dept: 'Volunteer', date: '2026-10-28', status: 'new' },
  { id: 4, name: 'Yuki Tanaka', email: 'yuki.t@press.com', subject: 'Media Interview Request', dept: 'Media', date: '2026-10-27', status: 'read' },
  { id: 5, name: 'Omar Hassan', email: 'omar.h@email.com', subject: 'General Enquiry', dept: 'General', date: '2026-10-25', status: 'new' },
];

const volunteers = [
  { id: 1, name: 'Emily Rodriguez', email: 'emily.r@gmail.com', country: 'Spain', role: 'Education Facilitator', avail: 'Full-time', date: '2026-10-31', status: 'pending' },
  { id: 2, name: 'David Okafor', email: 'd.okafor@email.com', country: 'Nigeria', role: 'Community Health Worker', avail: 'Part-time', date: '2026-10-30', status: 'approved' },
  { id: 3, name: 'Laura Müller', email: 'laura.m@email.de', country: 'Germany', role: 'Digital Marketing', avail: 'Remote flexible', date: '2026-10-28', status: 'pending' },
  { id: 4, name: 'James Kariuki Jr', email: 'james.k@email.ke', country: 'Kenya', role: 'Data Analyst', avail: 'Weekends', date: '2026-10-26', status: 'approved' },
  { id: 5, name: 'Priya Sharma', email: 'p.sharma@email.in', country: 'India', role: 'Women\'s Programme Trainer', avail: 'Full-time', date: '2026-10-24', status: 'pending' },
  { id: 6, name: 'Luca Ferreira', email: 'luca.f@email.br', country: 'Brazil', role: 'Environmental Specialist', avail: 'Part-time', date: '2026-10-22', status: 'approved' },
];

const donations = [
  { id: 1, name: 'Anonymous', email: '***@email.com', amount: 'GH₵500', freq: 'One-time', program: 'Where Most Needed', date: '2026-10-31' },
  { id: 2, name: 'Bill & Sarah Thomson', email: 'b.thomson@corp.com', amount: 'GH₵250', freq: 'Monthly', program: 'Elevate Learn', date: '2026-10-30' },
  { id: 3, name: 'Maria Gonzalez', email: 'm.gonzalez@email.es', amount: 'GH₵100', freq: 'One-time', program: 'Elevate Her', date: '2026-10-29' },
  { id: 4, name: 'TechCorp Foundation', email: 'giving@techcorp.com', amount: 'GH₵5,000', freq: 'Annually', program: 'Elevate Roots', date: '2026-10-28' },
  { id: 5, name: 'James Osei', email: 'j.osei@email.gh', amount: 'GH₵50', freq: 'Monthly', program: 'Health Initiative', date: '2026-10-27' },
];

const subscribers = [
  { id: 1, email: 'sarah.j@email.com', date: '2026-10-31', status: 'active' },
  { id: 2, email: 'm.chen@corp.com', date: '2026-10-30', status: 'active' },
  { id: 3, email: 'amara@example.com', date: '2026-10-29', status: 'active' },
  { id: 4, email: 'yuki.t@press.com', date: '2026-10-25', status: 'active' },
  { id: 5, email: 'omar.h@email.com', date: '2026-10-20', status: 'active' },
  { id: 6, email: 'emily.r@gmail.com', date: '2026-10-18', status: 'active' },
];

// ── Render tables ──────────────────────────────────────────
function statusBadge(status) {
  const map = { new: 'status-new', read: 'status-read', pending: 'status-pending', approved: 'status-approved', active: 'status-approved' };
  return `<span class="status-badge ${map[status] || ''}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
}

function renderContacts() {
  const tbody = document.getElementById('contacts-tbody');
  if (!tbody) return;
  tbody.innerHTML = contacts.map(r => `
    <tr>
      <td>${r.id}</td><td>${r.name}</td><td>${r.email}</td>
      <td>${r.subject}</td><td>${r.dept}</td><td>${r.date}</td>
      <td>${statusBadge(r.status)}</td>
    </tr>`).join('');
}

function renderVolunteers() {
  const tbody = document.getElementById('volunteers-tbody');
  if (!tbody) return;
  tbody.innerHTML = volunteers.map(r => `
    <tr>
      <td>${r.id}</td><td>${r.name}</td><td>${r.email}</td>
      <td>${r.country}</td><td>${r.role}</td><td>${r.avail}</td>
      <td>${r.date}</td><td>${statusBadge(r.status)}</td>
    </tr>`).join('');
}

function renderDonations() {
  const tbody = document.getElementById('donations-tbody');
  if (!tbody) return;
  tbody.innerHTML = donations.map(r => `
    <tr>
      <td>${r.id}</td><td>${r.name}</td><td>${r.email}</td>
      <td><strong>${r.amount}</strong></td><td>${r.freq}</td>
      <td>${r.program}</td><td>${r.date}</td>
    </tr>`).join('');
}

function renderNewsletter() {
  const tbody = document.getElementById('newsletter-tbody');
  if (!tbody) return;
  tbody.innerHTML = subscribers.map(r => `
    <tr>
      <td>${r.id}</td><td>${r.email}</td><td>${r.date}</td>
      <td>${statusBadge(r.status)}</td>
    </tr>`).join('');
}

// ── CSV Export ──────────────────────────────────────────────
function exportCSV(data, filename) {
  const headers = Object.keys(data[0]).join(',');
  const rows    = data.map(r => Object.values(r).join(',')).join('\n');
  const csv     = headers + '\n' + rows;
  const blob    = new Blob([csv], { type: 'text/csv' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href = url; a.download = filename;
  a.click(); URL.revokeObjectURL(url);
}

document.getElementById('export-contacts-btn')?.addEventListener('click', () => exportCSV(contacts, 'contacts.csv'));
document.getElementById('export-volunteers-btn')?.addEventListener('click', () => exportCSV(volunteers, 'volunteers.csv'));
document.getElementById('export-donations-btn')?.addEventListener('click', () => exportCSV(donations, 'donations.csv'));
document.getElementById('export-newsletter-btn')?.addEventListener('click', () => exportCSV(subscribers, 'subscribers.csv'));

// Init
renderContacts();
renderVolunteers();
renderDonations();
renderNewsletter();
