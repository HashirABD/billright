/**
 * BillRight — Frontend Application Logic
 * End-to-end integration: Presets, table management, live API analysis,
 * verdict rendering, itemized calculation tables, and copyable letters.
 */

// Preset definitions conforming to PRD specification and multi-jurisdiction rules
const PRESETS = {
  A: {
    name: 'UK Preset A (Exceeds 12 Months)',
    country: 'United Kingdom',
    billDate: '2026-10-01',
    isEstimated: true,
    isMeterObstructed: false,
    periods: [
      { startDate: '2024-10-01', endDate: '2025-09-30', amount: 1000.00 },
      { startDate: '2025-10-01', endDate: '2026-09-30', amount: 400.00 }
    ]
  },
  B: {
    name: 'UK Preset B (Within 12 Months)',
    country: 'United Kingdom',
    billDate: '2026-10-01',
    isEstimated: false,
    isMeterObstructed: false,
    periods: [
      { startDate: '2025-10-01', endDate: '2026-09-30', amount: 650.00 }
    ]
  },
  D: {
    name: 'AU Preset D (AER Rule 30 - 9 Months)',
    country: 'Australia',
    billDate: '2026-10-01',
    isEstimated: true,
    isMeterObstructed: false,
    periods: [
      { startDate: '2025-04-01', endDate: '2025-12-31', amount: 900.00 },
      { startDate: '2026-01-01', endDate: '2026-09-30', amount: 900.00 }
    ]
  },
  E: {
    name: 'US CA Preset E (CPUC Rule 17.1 - 3 Months)',
    country: 'United States (California)',
    billDate: '2026-10-01',
    isEstimated: false,
    isMeterObstructed: false,
    periods: [
      { startDate: '2026-01-01', endDate: '2026-06-30', amount: 600.00 },
      { startDate: '2026-07-01', endDate: '2026-09-30', amount: 300.00 }
    ]
  },
  C: {
    name: 'Preset C (Missing Data)',
    country: 'United Kingdom',
    billDate: '2026-10-01',
    isEstimated: true,
    isMeterObstructed: false,
    periods: [
      { startDate: '', endDate: '2026-09-30', amount: 350.00 }
    ]
  }
};

/**
 * Returns currency symbol based on country name
 */
function getCurrencySymbol(country = '') {
  if (country === 'Australia') return 'A$';
  if (country && country.includes('United States')) return '$';
  if (country === 'United Kingdom') return '£';
  return '$';
}

// DOM references
const billForm = document.getElementById('bill-form');
const countrySelect = document.getElementById('input-country');
const billDateInput = document.getElementById('input-bill-date');
const periodsTbody = document.getElementById('periods-tbody');
const btnAddRow = document.getElementById('btn-add-row');
const btnAnalyze = document.getElementById('btn-analyze');
const btnAnalyzeText = document.getElementById('btn-analyze-text');
const btnResetAll = document.getElementById('btn-reset-all');
const displayTotalBilled = document.getElementById('display-total-billed');
const validationErrorBanner = document.getElementById('validation-error');
const validationErrorMsg = document.getElementById('validation-error-msg');

// Toggle groups
const groupEstimated = document.getElementById('group-estimated');
const inputEstimated = document.getElementById('input-estimated');
const groupObstructed = document.getElementById('group-obstructed');
const inputObstructed = document.getElementById('input-obstructed');

// Results DOM
const resultsSection = document.getElementById('results-section');
const verdictBadgeContainer = document.getElementById('verdict-badge-container');
const verdictExplanation = document.getElementById('verdict-explanation');
const verdictDisputableSum = document.getElementById('verdict-disputable-sum');
const verdictCutoffDate = document.getElementById('verdict-cutoff-date');
const breakdownTbody = document.getElementById('breakdown-tbody');
const sourcesContainer = document.getElementById('sources-container');
const letterContent = document.getElementById('letter-content');
const btnCopyLetter = document.getElementById('btn-copy-letter');
const copyFeedback = document.getElementById('copy-feedback');

/**
 * Creates a table row element for a billing period
 */
function createRowElement(data = { startDate: '', endDate: '', amount: '' }) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>
      <input type="date" class="form-input row-start-date" value="${data.startDate || ''}" aria-label="Start date" required>
    </td>
    <td>
      <input type="date" class="form-input row-end-date" value="${data.endDate || ''}" aria-label="End date" required>
    </td>
    <td>
      <input type="number" step="0.01" min="0.01" class="form-input row-amount tabular-nums" placeholder="0.00" value="${data.amount !== '' ? data.amount : ''}" aria-label="Amount in pounds" required>
    </td>
    <td style="text-align: center;">
      <button type="button" class="btn-icon btn-delete-row" title="Delete period" aria-label="Delete period">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </td>
  `;

  // Attach row event listeners
  const inputs = tr.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      validateAndRecalculate();
    });
  });

  const btnDelete = tr.querySelector('.btn-delete-row');
  btnDelete.addEventListener('click', () => {
    tr.remove();
    if (periodsTbody.querySelectorAll('tr').length === 0) {
      addRow();
    }
    validateAndRecalculate();
  });

  return tr;
}

/**
 * Appends a new billing period row
 */
function addRow(data) {
  const row = createRowElement(data);
  periodsTbody.appendChild(row);
  validateAndRecalculate();
}

/**
 * Sets up button toggles (Yes/No)
 */
function setupToggle(groupElem, hiddenInput) {
  const buttons = groupElem.querySelectorAll('.toggle-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      hiddenInput.value = btn.getAttribute('data-value');
    });
  });
}

function setToggleValue(groupElem, hiddenInput, value) {
  hiddenInput.value = String(value);
  const buttons = groupElem.querySelectorAll('.toggle-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('data-value') === String(value)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

/**
 * Validates inputs client-side and updates totals
 */
function validateAndRecalculate() {
  const rows = periodsTbody.querySelectorAll('tr');
  let hasErrors = false;
  let errorMessage = '';
  let totalBilled = 0;

  rows.forEach((row, idx) => {
    const startInput = row.querySelector('.row-start-date');
    const endInput = row.querySelector('.row-end-date');
    const amountInput = row.querySelector('.row-amount');

    const startDate = startInput.value;
    const endDate = endInput.value;
    const amount = parseFloat(amountInput.value);

    // Reset styles
    row.classList.remove('has-error');
    startInput.classList.remove('error');
    endInput.classList.remove('error');
    amountInput.classList.remove('error');

    if (!startDate || !endDate) {
      hasErrors = true;
      errorMessage = `Row ${idx + 1}: Please enter both start and end dates.`;
      if (!startDate) startInput.classList.add('error');
      if (!endDate) endInput.classList.add('error');
    } else if (endDate < startDate) {
      hasErrors = true;
      errorMessage = `Row ${idx + 1}: End date cannot precede start date.`;
      endInput.classList.add('error');
      row.classList.add('has-error');
    }

    if (isNaN(amount) || amount <= 0) {
      hasErrors = true;
      if (!errorMessage) {
        errorMessage = `Row ${idx + 1}: Amount must be a positive number.`;
      }
      amountInput.classList.add('error');
    } else {
      totalBilled += amount;
    }
  });

  const currencySymbol = getCurrencySymbol(countrySelect.value);
  displayTotalBilled.textContent = `${currencySymbol}${totalBilled.toFixed(2)}`;

  if (hasErrors) {
    validationErrorBanner.classList.add('visible');
    validationErrorMsg.textContent = errorMessage;
    btnAnalyze.disabled = true;
  } else {
    validationErrorBanner.classList.remove('visible');
    btnAnalyze.disabled = false;
  }

  return !hasErrors;
}

/**
 * Loads a sample preset into the form
 */
function loadPreset(presetKey) {
  const preset = PRESETS[presetKey];
  if (!preset) return;

  // Highlight active preset button
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`preset-${presetKey.toLowerCase()}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Fill form values
  countrySelect.value = preset.country;
  billDateInput.value = preset.billDate;
  setToggleValue(groupEstimated, inputEstimated, preset.isEstimated);
  setToggleValue(groupObstructed, inputObstructed, preset.isMeterObstructed);

  // Update table header currency
  const currencyHeader = document.getElementById('currency-symbol-header');
  if (currencyHeader) {
    currencyHeader.textContent = getCurrencySymbol(preset.country);
  }

  // Clear and populate rows
  periodsTbody.innerHTML = '';
  preset.periods.forEach(period => {
    addRow(period);
  });

  // Hide any previous results on preset switch
  resultsSection.classList.remove('visible');
  validateAndRecalculate();
}

/**
 * Resets the entire form to clean defaults
 */
function resetForm() {
  document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
  countrySelect.value = 'United Kingdom';
  billDateInput.value = '2026-10-01';
  setToggleValue(groupEstimated, inputEstimated, false);
  setToggleValue(groupObstructed, inputObstructed, false);

  const currencyHeader = document.getElementById('currency-symbol-header');
  if (currencyHeader) currencyHeader.textContent = '£';

  periodsTbody.innerHTML = '';
  addRow();
  resultsSection.classList.remove('visible');
  validateAndRecalculate();
}

// Attach preset buttons
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const presetKey = btn.getAttribute('data-preset');
    loadPreset(presetKey);
  });
});

// Update currency on country change
countrySelect.addEventListener('change', () => {
  const symbol = getCurrencySymbol(countrySelect.value);
  const currencyHeader = document.getElementById('currency-symbol-header');
  if (currencyHeader) currencyHeader.textContent = symbol;
  validateAndRecalculate();
});

btnAddRow.addEventListener('click', () => {
  addRow();
});

btnResetAll.addEventListener('click', resetForm);

/**
 * Renders the returned analysis results into the DOM
 */
function renderResults(data) {
  const currency = data.currency || getCurrencySymbol(countrySelect.value);
  const lookbackMonths = data.lookbackMonths || 12;

  // 1. Verdict Badge & Explanation
  verdictBadgeContainer.innerHTML = '';
  const badge = document.createElement('div');

  if (data.badgeType === 'consumer_protected') {
    badge.className = 'verdict-badge protected';
    badge.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>${data.verdict}</span>
    `;
    verdictExplanation.textContent = `Under statutory back-billing protections in ${data.regulation?.jurisdiction || 'this jurisdiction'}, energy suppliers cannot demand payment for charges older than ${lookbackMonths} calendar months prior to the bill date.`;
  } else if (data.badgeType === 'rule_does_not_apply') {
    badge.className = 'verdict-badge valid';
    badge.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
      <span>${data.verdict}</span>
    `;
    verdictExplanation.textContent = data.exceptionNotes || `All billing periods fall within the permitted statutory ${lookbackMonths}-month billing window.`;
  } else {
    badge.className = 'verdict-badge incomplete';
    badge.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span>${data.verdict}</span>
    `;
    verdictExplanation.textContent = data.exceptionNotes || 'Official regulatory rules could not be verified for this jurisdiction. Analysis paused to avoid guesswork.';
  }

  verdictBadgeContainer.appendChild(badge);

  // 2. Financial Totals
  const cutoffTitle = document.getElementById('verdict-cutoff-title');
  if (cutoffTitle) {
    cutoffTitle.textContent = `${lookbackMonths}-Month Lookback Cut-off:`;
  }

  verdictDisputableSum.textContent = `${currency}${data.disputableTotal.toFixed(2)}`;
  verdictCutoffDate.textContent = data.cutOffDate;

  // 3. Itemized Mathematical Breakdown Table
  breakdownTbody.innerHTML = '';
  data.itemizedBreakdown.forEach(item => {
    const tr = document.createElement('tr');
    let statusBadge = '';

    if (item.status === 'fully_before_cutoff') {
      statusBadge = '<span class="preset-badge protected">100% Pre-Cutoff</span>';
    } else if (item.status === 'straddles_cutoff') {
      statusBadge = '<span class="preset-badge protected">Pro-Rata Apportioned</span>';
    } else {
      statusBadge = '<span class="preset-badge valid">Within Window</span>';
    }

    tr.innerHTML = `
      <td>${item.startDate} &rarr; ${item.endDate}</td>
      <td class="tabular-nums">${item.totalDays} days</td>
      <td class="tabular-nums">${item.disputableDays} days</td>
      <td class="tabular-nums">${currency}${item.amount.toFixed(2)}</td>
      <td class="tabular-nums"><strong>${currency}${item.disputableAmount.toFixed(2)}</strong></td>
      <td>${statusBadge}</td>
    `;
    breakdownTbody.appendChild(tr);
  });
    breakdownTbody.appendChild(tr);
  });

  // 4. Retrieved Regulatory Authority
  sourcesContainer.innerHTML = '';
  const reg = data.regulation || {};
  const sourceDiv = document.createElement('div');
  sourceDiv.className = 'source-item';
  sourceDiv.innerHTML = `
    <div class="source-title">${reg.title || 'Official Back-billing Principle'} (${reg.jurisdiction || 'General'})</div>
    <p style="font-size: 0.875rem; color: var(--color-text-muted); margin: 0.35rem 0;">
      ${reg.summary || 'Suppliers cannot back-bill customers for energy used more than 12 months ago.'}
    </p>
    ${reg.sourceUrl ? `<a href="${reg.sourceUrl}" target="_blank" rel="noopener noreferrer" class="source-url">${reg.sourceUrl} &nearr;</a>` : '<span style="font-size: 0.8125rem; color: #b45309;">Live search unverified</span>'}
  `;
  sourcesContainer.appendChild(sourceDiv);

  // 5. Dispute Letter Box
  if (data.disputeLetter) {
    letterContent.textContent = data.disputeLetter;
    btnCopyLetter.style.display = 'inline-flex';
  } else {
    letterContent.textContent = `[Formal Dispute Letter Not Applicable]

Reason: ${data.exceptionNotes || 'Charges are within statutory limits or meter access was obstructed. A formal back-billing dispute cannot be issued.'}`;
    btnCopyLetter.style.display = 'none';
  }

  // Reveal results
  resultsSection.classList.add('visible');
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Form submission handler
billForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateAndRecalculate()) return;

  // Gather payload
  const rows = periodsTbody.querySelectorAll('tr');
  const billingPeriods = [];

  rows.forEach(row => {
    const startDate = row.querySelector('.row-start-date').value;
    const endDate = row.querySelector('.row-end-date').value;
    const amount = parseFloat(row.querySelector('.row-amount').value);
    billingPeriods.push({ startDate, endDate, amount });
  });

  const payload = {
    country: countrySelect.value,
    billDate: billDateInput.value,
    isEstimated: inputEstimated.value === 'true',
    isMeterObstructed: inputObstructed.value === 'true',
    billingPeriods
  };

  // Button loading state
  btnAnalyze.disabled = true;
  btnAnalyzeText.textContent = 'Verifying with Live Regulations...';

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    renderResults(data);

  } catch (err) {
    console.error('Analysis failed:', err);
    validationErrorBanner.classList.add('visible');
    validationErrorMsg.textContent = `Analysis error: ${err.message}`;
  } finally {
    btnAnalyze.disabled = false;
    btnAnalyzeText.textContent = 'Analyze Bill';
  }
});

// Copy letter button handler
if (btnCopyLetter) {
  btnCopyLetter.addEventListener('click', async () => {
    const text = letterContent.textContent;
    try {
      await navigator.clipboard.writeText(text);
      copyFeedback.classList.add('visible');
      setTimeout(() => {
        copyFeedback.classList.remove('visible');
      }, 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  });
}

// Initialize toggles
setupToggle(groupEstimated, inputEstimated);
setupToggle(groupObstructed, inputObstructed);

// Initial bootstrap with Preset A loaded for instant demo readiness
loadPreset('A');
