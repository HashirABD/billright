/**
 * BillRight — Frontend Application Logic
 * Manages presets, dynamic billing rows, client-side validation, and UI states.
 */

// Preset definitions conforming to PRD specification
const PRESETS = {
  A: {
    name: 'Preset A (Exceeds 12 Months)',
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
    name: 'Preset B (Within 12 Months)',
    country: 'United Kingdom',
    billDate: '2026-10-01',
    isEstimated: false,
    isMeterObstructed: false,
    periods: [
      { startDate: '2025-10-01', endDate: '2026-09-30', amount: 650.00 }
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
    // Ensure at least one row exists
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

  displayTotalBilled.textContent = `£${totalBilled.toFixed(2)}`;

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

btnAddRow.addEventListener('click', () => {
  addRow();
});

btnResetAll.addEventListener('click', resetForm);

// Form submission handler (Slice 4 will complete backend wire-up)
billForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateAndRecalculate()) return;

  // Placeholder for Slice 4 full execution
  console.log('Submitting bill for analysis...');
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
