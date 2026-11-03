// Donate page interactive logic — Ghana Cedis (GH₵)

const impacts = {
  50:   "GH₵50 provides a full week of meals for one child.",
  100:  "GH₵100 provides a full month of school supplies and textbooks for one child.",
  250:  "GH₵250 funds a complete health check-up and medication for a family.",
  500:  "GH₵500 sponsors a woman through a vocational skills and entrepreneurship cohort.",
  1000: "GH₵1,000 covers a full scholarship and learning materials for one school term.",
  2500: "GH₵2,500 supports clean water filtration and hygiene infrastructure for a community."
};

function updateAmount(val) {
  const num = parseFloat(val) || 0;
  // Update button
  const btnAmt = document.getElementById('btn-amount');
  if (btnAmt) btnAmt.textContent = num > 0 ? Math.round(num).toLocaleString() : '0';
  // Update impact text
  const impactText = document.getElementById('impact-text');
  if (impactText) {
    const closest = [50, 100, 250, 500, 1000, 2500].reduce((p, c) => Math.abs(c - num) < Math.abs(p - num) ? c : p);
    impactText.textContent = impacts[closest] || `GH₵${Math.round(num).toLocaleString()} helps empower our communities across Ghana.`;
  }
}

// Payment method switching (Mobile Money, Card, Bank)
document.querySelectorAll('.payment-method-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.payment-method-card').forEach(c => {
      c.classList.remove('active');
      c.setAttribute('aria-checked', 'false');
    });
    card.classList.add('active');
    card.setAttribute('aria-checked', 'true');

    const method = card.dataset.method;
    const momoBox = document.getElementById('momo-fields');
    const cardBox = document.getElementById('card-fields');
    const bankBox = document.getElementById('bank-fields');

    if (momoBox) momoBox.style.display = method === 'momo' ? 'block' : 'none';
    if (cardBox) cardBox.style.display = method === 'card' ? 'block' : 'none';
    if (bankBox) bankBox.style.display = method === 'bank' ? 'block' : 'none';
  });
});

// Amount preset buttons
document.querySelectorAll('.amount-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const amt = btn.dataset.amount;
    const customInput = document.getElementById('custom-amount');
    if (customInput) customInput.value = amt;
    updateAmount(amt);
  });
});

// Custom amount input
const customInput = document.getElementById('custom-amount');
if (customInput) {
  customInput.addEventListener('input', () => {
    document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
    updateAmount(customInput.value);
  });
}

// Frequency toggle
document.querySelectorAll('.freq-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Init
updateAmount(100);
