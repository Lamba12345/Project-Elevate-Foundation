// Supabase-backed admin panel. Table access is enforced by database RLS.

const supabaseClient = window.elevateSupabase;
const authPanel = document.getElementById('admin-auth');
const adminLayout = document.getElementById('admin-layout');
const loginForm = document.getElementById('admin-login-form');
const authError = document.getElementById('admin-auth-error');
const dataMessage = document.getElementById('admin-data-message');
const records = {
  contacts: [],
  volunteers: [],
  donations: [],
  subscribers: []
};

function showAuthError(message) {
  authError.textContent = message;
  authError.hidden = !message;
}

function setAuthenticated(visible) {
  authPanel.hidden = visible;
  adminLayout.hidden = !visible;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

function statusBadge(status) {
  const value = String(status || 'pending');
  const classes = {
    new: 'status-new',
    read: 'status-read',
    pending: 'status-pending',
    approved: 'status-approved',
    paid: 'status-approved',
    active: 'status-approved',
    rejected: 'status-read'
  };
  return `<span class="status-badge ${classes[value] || ''}">${escapeHtml(value.charAt(0).toUpperCase() + value.slice(1))}</span>`;
}

function renderTable(elementId, rows, columns) {
  const tbody = document.getElementById(elementId);
  if (!tbody) return;
  tbody.innerHTML = rows.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      ${columns.map(column => `<td>${column(row)}</td>`).join('')}
    </tr>`).join('');
}

function renderRecords() {
  renderTable('contacts-tbody', records.contacts, [
    row => escapeHtml(row.name),
    row => escapeHtml(row.email),
    row => escapeHtml(row.subject),
    row => escapeHtml(row.department),
    row => escapeHtml(formatDate(row.created_at)),
    row => statusBadge(row.status)
  ]);
  renderTable('volunteers-tbody', records.volunteers, [
    row => escapeHtml(`${row.first_name} ${row.last_name}`.trim()),
    row => escapeHtml(row.email),
    row => escapeHtml(row.country),
    row => escapeHtml(row.role),
    row => escapeHtml(row.availability),
    row => escapeHtml(formatDate(row.created_at)),
    row => statusBadge(row.status)
  ]);
  renderTable('donations-tbody', records.donations, [
    row => escapeHtml(row.name),
    row => escapeHtml(row.email),
    row => `GH₵${Number(row.amount).toLocaleString()}`,
    row => escapeHtml(row.frequency),
    row => escapeHtml(row.program || 'Where most needed'),
    row => `${escapeHtml(formatDate(row.created_at))} · ${statusBadge(row.payment_status)}`
  ]);
  renderTable('newsletter-tbody', records.subscribers, [
    row => escapeHtml(row.email),
    row => escapeHtml(formatDate(row.created_at)),
    row => statusBadge(row.status)
  ]);

  document.getElementById('stat-contacts').textContent = records.contacts.length;
  document.getElementById('stat-volunteers').textContent = records.volunteers.length;
  document.getElementById('stat-donations').textContent = records.donations
    .filter(row => row.payment_status === 'paid').length;
  document.getElementById('stat-newsletter').textContent = records.subscribers.length;

  const paidTotal = records.donations
    .filter(row => row.payment_status === 'paid')
    .reduce((sum, row) => sum + Number(row.amount), 0);
  document.getElementById('donation-total').textContent =
    `GH₵${paidTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function loadTable(tableName) {
  const { data, error } = await supabaseClient
    .from(tableName)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return data || [];
}

async function loadAdminData() {
  dataMessage.textContent = 'Loading records…';
  const [contacts, volunteers, donations, subscribers] = await Promise.all([
    loadTable('contact_messages'),
    loadTable('volunteer_applications'),
    loadTable('donations'),
    loadTable('newsletter_subscribers')
  ]);
  records.contacts = contacts;
  records.volunteers = volunteers;
  records.donations = donations;
  records.subscribers = subscribers;
  renderRecords();
  dataMessage.textContent = 'Records are current. Payment totals include confirmed payments only.';
}

function exportCsv(data, filename) {
  if (!data.length) {
    dataMessage.textContent = 'There are no records to export.';
    return;
  }
  const headers = Object.keys(data[0]);
  const csvValue = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [
    headers.map(csvValue).join(','),
    ...data.map(row => headers.map(header => csvValue(row[header])).join(','))
  ].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

document.querySelectorAll('.admin-nav-link').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    document.querySelectorAll('.admin-nav-link').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    link.classList.add('active');
    document.getElementById(`tab-${link.dataset.tab}`).classList.add('active');
  });
});

document.getElementById('export-contacts-btn').addEventListener('click', () =>
  exportCsv(records.contacts, 'contacts.csv'));
document.getElementById('export-volunteers-btn').addEventListener('click', () =>
  exportCsv(records.volunteers, 'volunteer-applications.csv'));
document.getElementById('export-donations-btn').addEventListener('click', () =>
  exportCsv(records.donations, 'donations.csv'));
document.getElementById('export-newsletter-btn').addEventListener('click', () =>
  exportCsv(records.subscribers, 'newsletter-subscribers.csv'));

async function authorizeUser(session) {
  setAuthenticated(false);
  if (!session) {
    showAuthError('');
    return;
  }

  try {
    const { data, error } = await supabaseClient.rpc('is_admin');
    if (error) throw error;
    if (!data) {
      await supabaseClient.auth.signOut();
      showAuthError('This account is not authorized for the admin panel.');
      return;
    }

    showAuthError('');
    setAuthenticated(true);
    await loadAdminData();
  } catch (error) {
    console.error('Unable to verify or load admin records:', error);
    setAuthenticated(false);
    showAuthError('Could not verify admin access. Check the Supabase setup and try again.');
  }
}

if (!supabaseClient) {
  showAuthError('Supabase did not initialize. Check the connection settings and reload.');
} else {
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;

    const button = document.getElementById('admin-login-btn');
    button.disabled = true;
    showAuthError('');
    try {
      const values = new FormData(loginForm);
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: values.get('email'),
        password: values.get('password')
      });
      if (error) throw error;
      await authorizeUser(data.session);
    } catch (error) {
      console.error('Admin sign-in failed:', error);
      showAuthError('Sign-in failed. Check your credentials and Supabase Auth settings.');
    } finally {
      button.disabled = false;
    }
  });

  document.getElementById('admin-signout-btn').addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.error('Admin sign-out failed:', error);
      dataMessage.textContent = 'Sign out failed. Please try again.';
      return;
    }
    records.contacts = [];
    records.volunteers = [];
    records.donations = [];
    records.subscribers = [];
    setAuthenticated(false);
    showAuthError('');
  });

  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error('Unable to read Supabase session:', error);
      showAuthError('Could not read the sign-in session. Reload and try again.');
      return;
    }
    return authorizeUser(data.session);
  });

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') setAuthenticated(false);
  });
}
