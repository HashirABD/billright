/**
 * BillRight — Frontend Application Logic
 * End-to-end integration: Presets, table management, live API analysis,
 * verdict rendering, itemized calculation tables, and copyable letters.
 */

import { renderTimeline } from './timeline.js';
import { downloadCalendarEvent } from './calendarHelper.js';
import { sanitizeDisputeLetter } from './letterSanitizer.js';

// Preset definitions conforming to PRD specification and multi-jurisdiction rules
// Preset definitions conforming to PRD specification and multi-jurisdiction rules
const PRESETS = {
  A: {
    name: 'UK Preset A (Exceeds 12 Months)',
    country: 'United Kingdom',
    billDate: '2026-10-01',
    consumerName: 'Jane Example',
    supplierName: 'Example Energy Ltd',
    accountNumber: 'EX-8849201',
    supplyAddress: '1 Example Street, Exampletown, EX1 1AA',
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
    consumerName: 'Jane Example',
    supplierName: 'Example Energy Ltd',
    accountNumber: 'EX-552109',
    supplyAddress: '1 Example Street, Exampletown, EX1 1AA',
    isEstimated: false,
    isMeterObstructed: false,
    periods: [
      { startDate: '2025-10-01', endDate: '2026-09-30', amount: 650.00 }
    ]
  },
  D: {
    name: 'Australia (NERR Rule 30, 9 Mos)',
    country: 'Australia',
    australiaState: 'NSW',
    billDate: '2026-10-01',
    consumerName: 'Jane Example',
    supplierName: 'Example Energy Pty Ltd',
    accountNumber: 'EX-AU-992140',
    supplyAddress: '1 Example Street, Exampletown, EX1 1AA',
    isEstimated: true,
    isMeterObstructed: false,
    periods: [
      { startDate: '2025-04-01', endDate: '2025-12-31', amount: 900.00 },
      { startDate: '2026-01-01', endDate: '2026-09-30', amount: 900.00 }
    ]
  },
  E: {
    name: 'United States - California (PG&E Rule 17.1, 3 Mos)',
    country: 'United States (California)',
    billDate: '2026-10-01',
    consumerName: 'Jane Example',
    supplierName: 'Example Utility Co',
    accountNumber: 'EX-US-7740129',
    supplyAddress: '1 Example Street, Exampletown, EX1 1AA',
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
    consumerName: 'Jane Example',
    supplierName: 'Example Energy Ltd',
    accountNumber: 'EX-8849201',
    supplyAddress: '1 Example Street, Exampletown, EX1 1AA',
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

/**
 * Formats a currency amount with commas and two decimal places (e.g. £1,000.00)
 */
function formatMoney(amount, currency = '£') {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return `${currency}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Validates whether an email string is structurally valid
 */
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Sanitizes dispute letter text to ensure neutral regulatory standards and plain text format
 */
function cleanLetterText(text) {
  if (!text || typeof text !== 'string') return '';
  const isObstructed = (typeof inputObstructed !== 'undefined' && inputObstructed) ? inputObstructed.checked : false;
  return sanitizeDisputeLetter(text, isObstructed);
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

// Australia jurisdiction state elements
const groupAustraliaState = document.getElementById('group-australia-state');
const inputAustraliaState = document.getElementById('input-australia-state');
const victoriaBlockedBanner = document.getElementById('victoria-blocked-banner');

// Party details DOM
const consumerNameInput = document.getElementById('input-consumer-name');
const supplierNameInput = document.getElementById('input-supplier-name');
const accountNumberInput = document.getElementById('input-account-number');
const supplyAddressInput = document.getElementById('input-supply-address');

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
const btnDownloadPdf = document.getElementById('btn-download-pdf');
const btnDownloadPdfText = document.getElementById('btn-download-pdf-text');
const btnEmailSupplier = document.getElementById('btn-email-supplier');
const btnEmailSupplierText = document.getElementById('btn-email-supplier-text');
const btnPrintDossier = document.getElementById('btn-print-dossier');
const unknownSupplierEmailBox = document.getElementById('unknown-supplier-email-box');
const inputUnknownSupplierEmail = document.getElementById('input-unknown-supplier-email');

// Header & Utility Controls
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const disclaimerBanner = document.getElementById('disclaimer-banner');
const btnDismissNotice = document.getElementById('btn-dismiss-notice');

// Statutory Escalation & Calendar DOM
const escalationTrackerCard = document.getElementById('escalation-tracker-card');
const btnAddCalendar = document.getElementById('btn-add-calendar');
const dateStep1 = document.getElementById('date-step-1');
const dateStep2 = document.getElementById('date-step-2');
const dateStep3 = document.getElementById('date-step-3');

// Active analysis cache for PDF packet export & email dispatch
let currentAnalysisResult = null;
let currentMeterEvidence = null;

// Multimodal Upload Switcher Tabs DOM
const tabBtnBill = document.getElementById('tab-btn-bill');
const tabBtnMeter = document.getElementById('tab-btn-meter');
const paneBillUpload = document.getElementById('pane-bill-upload');
const paneMeterUpload = document.getElementById('pane-meter-upload');

// Multimodal Bill Dropzone DOM
const billDropzone = document.getElementById('bill-dropzone');
const fileInput = document.getElementById('file-input');
const dropzonePrompt = document.getElementById('dropzone-prompt');
const dropzoneProcessing = document.getElementById('dropzone-processing');
const processingFilename = document.getElementById('processing-filename');
const dropzoneSuccess = document.getElementById('dropzone-success');
const successFilename = document.getElementById('success-filename');
const successSummary = document.getElementById('success-summary');
const btnClearFile = document.getElementById('btn-clear-file');

// Physical Meter Dropzone DOM
const meterDropzone = document.getElementById('meter-dropzone');
const meterFileInput = document.getElementById('meter-file-input');
const meterDropzonePrompt = document.getElementById('meter-dropzone-prompt');
const meterDropzoneProcessing = document.getElementById('meter-dropzone-processing');
const meterProcessingFilename = document.getElementById('meter-processing-filename');
const meterDropzoneSuccess = document.getElementById('meter-dropzone-success');
const meterSuccessFilename = document.getElementById('meter-success-filename');
const meterSuccessSummary = document.getElementById('meter-success-summary');
const btnClearMeter = document.getElementById('btn-clear-meter');
const meterEvidenceContainer = document.getElementById('meter-evidence-container');
const meterTypeBadge = document.getElementById('meter-type-badge');
const meterReadingVal = document.getElementById('meter-reading-val');
const meterSerialVal = document.getElementById('meter-serial-val');
const meterNotesText = document.getElementById('meter-notes-text');

/**
 * Creates a table row element for a billing period
 */
let isPresetLoading = false;

/**
 * Clears preset active highlights when user edits the form
 */
function clearPresetSelection() {
  if (isPresetLoading) return;
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-checked', 'false');
    btn.setAttribute('tabindex', '-1');
  });
  const demoNote = document.getElementById('demo-data-note');
  if (demoNote) demoNote.style.display = 'none';
}

/**
 * Creates a table row element for a billing period
 */
function createRowElement(data = { startDate: '', endDate: '', amount: '' }) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>
      <span class="mobile-field-label">Start date</span>
      <input type="date" class="form-input row-start-date" value="${data.startDate || ''}" aria-label="Start date" required>
    </td>
    <td>
      <span class="mobile-field-label">End date</span>
      <input type="date" class="form-input row-end-date" value="${data.endDate || ''}" aria-label="End date" required>
    </td>
    <td>
      <span class="mobile-field-label">Amount</span>
      <input type="number" step="0.01" min="0.01" class="form-input row-amount tabular-nums" placeholder="0.00" value="${data.amount !== '' ? data.amount : ''}" aria-label="Amount in pounds" required>
    </td>
    <td class="cell-action" style="text-align: center;">
      <button type="button" class="btn-icon btn-delete-row" title="Delete period" aria-label="Delete period">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        <span class="mobile-btn-label">Delete period</span>
      </button>
    </td>
  `;

  // Attach row event listeners
  const inputs = tr.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      clearPresetSelection();
      validateAndRecalculate();
    });
  });

  const btnDelete = tr.querySelector('.btn-delete-row');
  btnDelete.addEventListener('click', () => {
    clearPresetSelection();
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
  return row;
}

/**
 * Sets up button toggles (Yes/No)
 */
function setupToggle(groupElem, hiddenInput) {
  const buttons = groupElem.querySelectorAll('.toggle-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      hiddenInput.value = btn.getAttribute('data-value');
      clearPresetSelection();
    });
  });
}

function setToggleValue(groupElem, hiddenInput, value) {
  hiddenInput.value = String(value);
  const buttons = groupElem.querySelectorAll('.toggle-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('data-value') === String(value)) {
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-checked', 'false');
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

  const parsedPeriods = [];

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
    } else {
      parsedPeriods.push({ idx, startDate, endDate, startInput, endInput, row });
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

  // Check for overlapping billing periods
  if (!hasErrors && parsedPeriods.length > 1) {
    for (let i = 0; i < parsedPeriods.length; i++) {
      for (let j = i + 1; j < parsedPeriods.length; j++) {
        const p1 = parsedPeriods[i];
        const p2 = parsedPeriods[j];
        if (p1.startDate <= p2.endDate && p2.startDate <= p1.endDate) {
          hasErrors = true;
          errorMessage = 'Billing periods overlap. Please check the dates.';
          p1.startInput.classList.add('error');
          p1.endInput.classList.add('error');
          p1.row.classList.add('has-error');
          p2.startInput.classList.add('error');
          p2.endInput.classList.add('error');
          p2.row.classList.add('has-error');
          break;
        }
      }
      if (hasErrors) break;
    }
  }

  const currencySymbol = getCurrencySymbol(countrySelect.value);
  displayTotalBilled.textContent = formatMoney(totalBilled, currencySymbol);

  const isVicBlocked = countrySelect.value === 'Australia' && inputAustraliaState && inputAustraliaState.value === 'VIC';

  if (hasErrors) {
    validationErrorBanner.classList.add('visible');
    validationErrorMsg.textContent = errorMessage;
    btnAnalyze.disabled = true;
  } else if (isVicBlocked) {
    btnAnalyze.disabled = true;
    btnAnalyze.title = 'Victoria has its own code; this tool does not cover it';
    return false;
  } else {
    validationErrorBanner.classList.remove('visible');
    btnAnalyze.disabled = false;
    btnAnalyze.removeAttribute('title');
  }

  return !hasErrors;
}

/**
 * Resets the results area to its neutral empty state before an audit is run
 */
function resetResultsToEmptyState() {
  const plainHeadline = document.getElementById('plain-result-headline');
  const plainWhy = document.getElementById('plain-result-why');
  const plainTag = document.getElementById('plain-result-tag');
  const plainNextSteps = document.getElementById('plain-next-steps');
  const authorityBadge = document.getElementById('authority-trust-badge');
  const verdictContainer = document.getElementById('verdict-badge-container');
  const verdictExp = document.getElementById('verdict-explanation');
  const verdictSum = document.getElementById('verdict-disputable-sum');
  const verdictCut = document.getElementById('verdict-cutoff-date');
  const breakdownTb = document.getElementById('breakdown-tbody');
  const letterCont = document.getElementById('letter-content');
  const sourcesCont = document.getElementById('sources-container');
  const timelineCont = document.getElementById('timeline-container');
  const obsWarning = document.getElementById('obstruction-warning-container');
  const otherCountryWarning = document.getElementById('other-country-warning-container');

  const cardEl = document.querySelector('.plain-result-card');
  if (cardEl) cardEl.classList.remove('warning');
  const amountTitleEl = document.getElementById('verdict-disputable-title') || document.querySelector('.verdict-amount-title');
  if (amountTitleEl) {
    amountTitleEl.innerHTML = 'Likely Disputable Amount: <span class="trust-badge trust-code">Calculated by code</span>';
  }

  if (plainHeadline) plainHeadline.textContent = 'Run an audit to see your result';
  if (plainWhy) plainWhy.textContent = 'Submit your billing records to evaluate charges against statutory back-billing limits.';
  if (plainTag) { plainTag.style.display = 'none'; plainTag.className = 'plain-result-badge-tag'; }
  if (plainNextSteps) plainNextSteps.style.display = 'none';
  const step1ContentEl = document.getElementById('plain-step-1-content');
  if (step1ContentEl) {
    step1ContentEl.innerHTML = `
      <div class="step-title-row">
        <strong>Send the dispute notice</strong>
        <button type="button" id="btn-plain-send-dispute" class="btn-primary btn-sm plain-dispute-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          Open Dispute Dispatcher
        </button>
      </div>
      <p class="step-desc">Deliver the formal dispute notice and Schedule of Mathematical Evidence to your supplier's complaints team.</p>
    `;
  }
  if (authorityBadge) authorityBadge.style.display = 'none';
  if (verdictContainer) verdictContainer.innerHTML = '';
  if (verdictExp) verdictExp.textContent = '';
  const currency = getCurrencySymbol(countrySelect ? countrySelect.value : 'United Kingdom');
  if (verdictSum) verdictSum.textContent = formatMoney(0, currency);
  if (verdictCut) verdictCut.textContent = '--';
  if (breakdownTb) breakdownTb.innerHTML = '';
  if (sourcesCont) sourcesCont.innerHTML = '';
  if (timelineCont) timelineCont.innerHTML = '';
  if (obsWarning) obsWarning.style.display = 'none';
  if (otherCountryWarning) otherCountryWarning.style.display = 'none';

  // Hide and disable action buttons until a letter exists
  if (btnCopyLetter) { btnCopyLetter.disabled = true; btnCopyLetter.style.display = 'none'; }
  if (btnEmailSupplier) { btnEmailSupplier.disabled = true; btnEmailSupplier.style.display = 'none'; }
  if (btnPrintDossier) { btnPrintDossier.disabled = true; btnPrintDossier.style.display = 'none'; }
  if (btnDownloadPdf) { btnDownloadPdf.disabled = true; btnDownloadPdf.style.display = 'none'; }
  if (unknownSupplierEmailBox) unknownSupplierEmailBox.style.display = 'none';
  if (inputUnknownSupplierEmail) inputUnknownSupplierEmail.value = '';

  // Hide result-dependent sections
  document.querySelectorAll('.result-dependent-card').forEach(card => {
    card.classList.remove('visible');
    card.style.display = 'none';
  });

  if (resultsSection) resultsSection.classList.remove('visible');
}

/**
 * Loads a sample preset into the form
 */
function loadPreset(presetKey) {
  const preset = PRESETS[presetKey];
  if (!preset) return;

  isPresetLoading = true;
  try {
    // Highlight active preset button with radio group semantics
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-checked', 'false');
      btn.setAttribute('tabindex', '-1');
    });
    const activeBtn = document.getElementById(`preset-${presetKey.toLowerCase()}`);
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.setAttribute('aria-checked', 'true');
      activeBtn.setAttribute('tabindex', '0');
    }

    const demoNote = document.getElementById('demo-data-note');
    if (demoNote) {
      demoNote.style.display = 'inline-flex';
    }

    // Fill form values
    countrySelect.value = preset.country;
    billDateInput.value = preset.billDate;
    if (preset.country === 'Australia' && inputAustraliaState) {
      inputAustraliaState.value = preset.australiaState || 'NSW';
    }
    updateAustraliaStateVisibility();
    setToggleValue(groupEstimated, inputEstimated, preset.isEstimated);
    setToggleValue(groupObstructed, inputObstructed, preset.isMeterObstructed);

    // Fill party identity details
    if (consumerNameInput && preset.consumerName) consumerNameInput.value = preset.consumerName;
    if (supplierNameInput && preset.supplierName) supplierNameInput.value = preset.supplierName;
    if (accountNumberInput && preset.accountNumber) accountNumberInput.value = preset.accountNumber;
    if (supplyAddressInput && preset.supplyAddress) supplyAddressInput.value = preset.supplyAddress;

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

    // Clear OCR review highlights on preset load
    document.querySelectorAll('.ocr-highlight').forEach(el => el.classList.remove('ocr-highlight'));
    document.querySelectorAll('.ocr-review-hint').forEach(el => el.remove());

    // Reset results area to neutral empty state on preset switch
    resetResultsToEmptyState();
    validateAndRecalculate();
    showToast(`Loaded ${preset.name}`, 'info', 2200);
  } finally {
    isPresetLoading = false;
  }
}

/**
 * Updates Australia state selector visibility and checks for blocked Victoria code
 */
function updateAustraliaStateVisibility() {
  const isAustralia = countrySelect.value === 'Australia';
  if (groupAustraliaState) {
    groupAustraliaState.style.display = isAustralia ? 'block' : 'none';
  }
  if (isAustralia && inputAustraliaState && inputAustraliaState.value === 'VIC') {
    if (victoriaBlockedBanner) victoriaBlockedBanner.style.display = 'flex';
    btnAnalyze.disabled = true;
    btnAnalyze.title = 'Victoria has its own code; this tool does not cover it';
    resetResultsToEmptyState();
    return true; // blocked
  } else {
    if (victoriaBlockedBanner) victoriaBlockedBanner.style.display = 'none';
    btnAnalyze.disabled = false;
    btnAnalyze.removeAttribute('title');
    return false;
  }
}

/**
 * Resets the entire form to clean defaults
 */
function resetForm() {
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-checked', 'false');
    btn.setAttribute('tabindex', '-1');
  });
  const firstPreset = document.getElementById('preset-a');
  if (firstPreset) firstPreset.setAttribute('tabindex', '0');

  const demoNote = document.getElementById('demo-data-note');
  if (demoNote) demoNote.style.display = 'none';

  countrySelect.value = 'United Kingdom';
  billDateInput.value = '2026-10-01';
  if (inputAustraliaState) inputAustraliaState.value = 'NSW';
  updateAustraliaStateVisibility();
  setToggleValue(groupEstimated, inputEstimated, false);
  setToggleValue(groupObstructed, inputObstructed, false);
  showToast('Audit form reset to defaults', 'info', 2000);

  if (consumerNameInput) consumerNameInput.value = '';
  if (supplierNameInput) supplierNameInput.value = '';
  if (accountNumberInput) accountNumberInput.value = '';
  if (supplyAddressInput) supplyAddressInput.value = '';

  const currencyHeader = document.getElementById('currency-symbol-header');
  if (currencyHeader) currencyHeader.textContent = '£';
  const countryMismatchWarning = document.getElementById('country-mismatch-warning');
  if (countryMismatchWarning) countryMismatchWarning.style.display = 'none';

  // Clear OCR review highlights
  document.querySelectorAll('.ocr-highlight').forEach(el => el.classList.remove('ocr-highlight'));
  document.querySelectorAll('.ocr-review-hint').forEach(el => el.remove());

  periodsTbody.innerHTML = '';
  addRow();
  resetResultsToEmptyState();
  validateAndRecalculate();
}

// Attach preset buttons
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const presetKey = btn.getAttribute('data-preset');
    loadPreset(presetKey);
  });
});

// Remove preset highlight whenever user edits the form
billForm.addEventListener('input', () => {
  clearPresetSelection();
});
billForm.addEventListener('change', () => {
  clearPresetSelection();
});

// Update currency and Australia state visibility on country change
countrySelect.addEventListener('change', () => {
  const symbol = getCurrencySymbol(countrySelect.value);
  const currencyHeader = document.getElementById('currency-symbol-header');
  if (currencyHeader) currencyHeader.textContent = symbol;
  updateAustraliaStateVisibility();
  validateAndRecalculate();
});

if (inputAustraliaState) {
  inputAustraliaState.addEventListener('change', () => {
    const isBlocked = updateAustraliaStateVisibility();
    if (isBlocked) {
      showToast('Victoria has its own code; this tool does not cover it', 'error', 4000);
    } else {
      validateAndRecalculate();
    }
  });
}

btnAddRow.addEventListener('click', () => {
  clearPresetSelection();
  addRow();
});

btnResetAll.addEventListener('click', resetForm);

/**
 * Applies subtle highlight and "Review" status hint to an auto-filled field.
 * Removed once the user interacts with, confirms, or edits the field.
 */
function markFieldForOcrReview(inputElem) {
  if (!inputElem) return;
  inputElem.classList.add('ocr-highlight');

  const parent = inputElem.closest('.form-group') || inputElem.parentElement;
  if (!parent) return;

  const existingHint = parent.querySelector('.ocr-review-hint');
  if (existingHint) existingHint.remove();

  const hint = document.createElement('span');
  hint.className = 'ocr-review-hint';
  hint.setAttribute('role', 'status');
  hint.innerHTML = '<span class="review-tag">Review</span> Read by AI, please verify';

  const label = parent.querySelector('.form-label');
  if (label) {
    label.appendChild(hint);
  } else {
    inputElem.insertAdjacentElement('afterend', hint);
  }

  const clearHandler = () => {
    inputElem.classList.remove('ocr-highlight');
    if (hint && hint.parentNode) {
      hint.remove();
    }
    inputElem.removeEventListener('input', clearHandler);
    inputElem.removeEventListener('change', clearHandler);
  };

  inputElem.addEventListener('input', clearHandler, { once: true });
  inputElem.addEventListener('change', clearHandler, { once: true });
}

/**
 * Resolves the statutory ombudsman or regulatory body name for a jurisdiction
 */
function getOmbudsmanForJurisdiction(country, supplierContact) {
  if (supplierContact && supplierContact.ombudsman) {
    return supplierContact.ombudsman.split(' (')[0];
  }
  if (country === 'United Kingdom') {
    return 'the Energy Ombudsman';
  }
  if (country === 'Australia') {
    const state = inputAustraliaState ? inputAustraliaState.value : 'NSW';
    if (state === 'QLD') return 'the Energy and Water Ombudsman Queensland (EWOQ)';
    if (state === 'SA') return 'the Energy and Water Ombudsman SA (EWOSA)';
    return 'the Energy and Water Ombudsman NSW (EWON)';
  }
  if (country && country.includes('California')) {
    return 'the California Public Utilities Commission (CPUC) Consumer Affairs Branch';
  }
  if (country && country.includes('Texas')) {
    return 'the Public Utility Commission of Texas (PUCT)';
  }
  return 'the statutory energy regulator or ombudsman';
}

/**
 * Renders the top Plain-Language Result Card and 3-step action guide
 */
function updatePlainLanguageResultCard(data, currency, lookbackMonths) {
  const headlineEl = document.getElementById('plain-result-headline');
  const whyEl = document.getElementById('plain-result-why');
  const tagEl = document.getElementById('plain-result-tag');
  const nextStepsEl = document.getElementById('plain-next-steps');
  const ombudsmanEl = document.getElementById('plain-ombudsman-name');
  const sendBtn = document.getElementById('btn-plain-send-dispute');
  const cardEl = document.querySelector('.plain-result-card');

  if (!headlineEl || !whyEl) return;

  if (cardEl) cardEl.classList.remove('warning');
  if (nextStepsEl) nextStepsEl.style.display = 'block';
  if (tagEl) {
    tagEl.style.display = 'inline-block';
    tagEl.className = 'plain-result-badge-tag';
  }

  const regClause = data.regulation?.clauseReference || data.regulation?.title || 'statutory rules';
  const cutOff = data.cutOffDate || '--';

  // Variant 1: Missing data
  if (data.badgeType === 'incomplete_data' || (data.itemizedBreakdown && data.itemizedBreakdown.some(i => !i.startDate || !i.endDate))) {
    if (tagEl) tagEl.textContent = 'Action Required';
    headlineEl.textContent = 'We need more information';
    whyEl.textContent = 'Start or end dates are missing for one or more billing periods. Please complete the dates to determine statutory protection.';
    if (sendBtn) sendBtn.style.display = 'none';
    return;
  }

  // Variant 2: Obstruction or Exception Flagged (Merged Single Clear Warning Block)
  const isObstructed = Boolean(data.isMeterObstructed || inputObstructed.value === 'true' || data.exceptionTriggered);

  // Update Step 1 based on obstruction state
  const step1ContentEl = document.getElementById('plain-step-1-content');
  if (step1ContentEl) {
    if (isObstructed) {
      step1ContentEl.innerHTML = `
        <p class="step-desc" style="margin: 0; color: var(--text-primary); font-size: 0.875rem; line-height: 1.5;">
          Before sending anything, consider free advice (for example Citizens Advice). Ask the supplier for the billing breakdown and meter reading history, and when and how they tried to read the meter.
        </p>
      `;
    } else {
      step1ContentEl.innerHTML = `
        <div class="step-title-row">
          <strong>Send the dispute notice</strong>
          <button type="button" id="btn-plain-send-dispute" class="btn-primary btn-sm plain-dispute-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            Open Dispute Dispatcher
          </button>
        </div>
        <p class="step-desc">Deliver the formal dispute notice and Schedule of Mathematical Evidence to your supplier's complaints team.</p>
      `;
      const plainSendBtn = document.getElementById('btn-plain-send-dispute');
      if (plainSendBtn) {
        if (!data.disputableTotal || data.disputableTotal <= 0) {
          plainSendBtn.style.display = 'none';
        } else {
          plainSendBtn.style.display = 'inline-flex';
          plainSendBtn.onclick = (e) => {
            e.preventDefault();
            openEmailDispatcherModal();
          };
        }
      }
    }
  }

  if (ombudsmanEl) {
    ombudsmanEl.textContent = getOmbudsmanForJurisdiction(countrySelect.value, data.supplierContact);
  }

  if (isObstructed) {
    if (cardEl) cardEl.classList.add('warning');
    if (tagEl) {
      tagEl.textContent = 'Protection Warning';
      tagEl.className = 'plain-result-badge-tag warning';
    }
    headlineEl.textContent = 'Protection may not apply';
    whyEl.textContent = 'Protection may not apply if the supplier shows you unreasonably prevented access to read the meter. Consider getting advice before sending.';
    return;
  }

  // Variant 3: Nothing disputable
  if (!data.disputableTotal || data.disputableTotal <= 0) {
    if (tagEl) tagEl.textContent = 'Statutory Assessment';
    headlineEl.textContent = 'Your bill appears to be within the limit';
    whyEl.textContent = `Based on the ${lookbackMonths}-month limit (${regClause}), all charges fall after ${cutOff} and appear to be within the permitted window.`;
    return;
  }

  // Variant 4: Disputable (partly or fully disputable)
  if (tagEl) tagEl.textContent = 'Possible Dispute';
  const dispStr = formatMoney(data.disputableTotal, currency);
  const totalStr = formatMoney(data.totalBilled || 0, currency);

  headlineEl.textContent = `You may not have to pay ${dispStr} of your ${totalStr} bill`;
  whyEl.textContent = `Based on the ${lookbackMonths}-month limit (${regClause}). Charges before ${cutOff} are outside the limit.`;
}

/**
 * Renders the returned analysis results into the DOM
 */
function renderResults(data) {
  const currency = data.currency || getCurrencySymbol(countrySelect.value);
  const lookbackMonths = data.lookbackMonths || 12;

  // 0. Plain-Language Result Card & Authority Trust Badge
  updatePlainLanguageResultCard(data, currency, lookbackMonths);

  const isObstructed = Boolean(data.isMeterObstructed || inputObstructed.value === 'true' || data.exceptionTriggered);

  // Update amount title
  const amountTitleEl = document.getElementById('verdict-disputable-title') || document.querySelector('.verdict-amount-title');
  if (amountTitleEl) {
    if (isObstructed) {
      amountTitleEl.innerHTML = 'Amount in dispute (if protection applies): <span class="trust-badge trust-code">Calculated by code</span>';
    } else {
      amountTitleEl.innerHTML = 'Likely Disputable Amount: <span class="trust-badge trust-code">Calculated by code</span>';
    }
  }

  const authorityTrustBadge = document.getElementById('authority-trust-badge');
  if (authorityTrustBadge) {
    authorityTrustBadge.style.display = 'inline-flex';
    authorityTrustBadge.textContent = 'Curated rule';
    authorityTrustBadge.className = 'trust-badge trust-builtin';
  }

  // 1. Verdict Badge & Explanation (when obstruction is flagged, merged into the single clear block above)
  verdictBadgeContainer.innerHTML = '';
  if (isObstructed) {
    verdictExplanation.textContent = '';
  } else {
    const badge = document.createElement('div');

    if (data.badgeType === 'consumer_protected') {
      badge.className = 'verdict-badge protected';
      badge.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>${data.verdict}</span>
      `;
      const jur = data.regulation?.jurisdiction || countrySelect.value || '';
      const isAU = jur === 'Australia' || jur.includes('Australia') || (data.regulation?.clauseReference && data.regulation.clauseReference.includes('NERR'));
      const isCA = jur.includes('California');
      const isTX = jur.includes('Texas');

      let explanationHtml = '';
      if (isAU) {
        explanationHtml = `Under statutory back-billing protections in Australia (NERR Rule 30), energy retailers cannot recover undercharged amounts from more than 9 months before the date the customer was notified.
        <div style="font-size: 0.8125rem; color: var(--color-text-muted); margin-top: 0.35rem; font-style: italic;">For this estimate we treat the bill issue date as the notification date.</div>`;
      } else if (isCA) {
        explanationHtml = `Under California utility tariff rules (PG&E Electric Rule 17.1 and equivalent CPUC rules), adjustments for residential billing errors where the customer was not at fault are restricted to 3 months.`;
      } else if (isTX) {
        explanationHtml = `Under PUCT §25.28(d) for electric utilities, underbilling adjustments are limited to 6 months; for retail electric providers, the limit under §25.480(e) must be verified with the PUCT.`;
      } else {
        explanationHtml = `Under statutory back-billing protections in ${jur || 'the United Kingdom'}, energy suppliers cannot demand payment for charges older than ${lookbackMonths} calendar months prior to the bill date.`;
      }
      verdictExplanation.innerHTML = explanationHtml;
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
  }

  // Render obstruction or provisional country notices
  const obstructionContainer = document.getElementById('obstruction-warning-container');
  if (obstructionContainer) {
    obstructionContainer.style.display = 'none';
    obstructionContainer.innerHTML = '';
  }

  const otherCountryContainer = document.getElementById('other-country-warning-container');
  if (otherCountryContainer) {
    if (countrySelect.value === 'Other Country' || data.regulation?.jurisdiction === 'Other Country') {
      otherCountryContainer.style.display = 'flex';
      otherCountryContainer.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div>
          <strong>Provisional Estimate:</strong> The statutory lookback period for "Other Country" is a default benchmark (12 months) and has not been verified against local laws. Please consult your regional utility regulator or ombudsman before lodging a dispute.
        </div>
      `;
    } else {
      otherCountryContainer.style.display = 'none';
      otherCountryContainer.innerHTML = '';
    }
  }

  // 2. Financial Totals
  const cutoffTitle = document.getElementById('verdict-cutoff-title');
  if (cutoffTitle) {
    cutoffTitle.textContent = `${lookbackMonths}-Month Lookback Cut-off:`;
  }

  verdictDisputableSum.textContent = formatMoney(data.disputableTotal, currency);
  verdictCutoffDate.textContent = data.cutOffDate;

  // 3. Interactive Dispute Timeline Visualizer
  renderTimeline({
    containerId: 'timeline-container',
    tooltipId: 'timeline-tooltip',
    billDate: data.billDate || billDateInput.value,
    cutOffDate: data.cutOffDate,
    itemizedBreakdown: data.itemizedBreakdown,
    currency,
    lookbackMonths
  });

  // 4. Itemized Mathematical Breakdown Table
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
      <td><span class="mobile-field-label">Period</span><span class="breakdown-val">${item.startDate} &rarr; ${item.endDate}</span></td>
      <td class="tabular-nums"><span class="mobile-field-label">Total Days</span><span class="breakdown-val">${item.totalDays} days</span></td>
      <td class="tabular-nums"><span class="mobile-field-label">Pre-Cutoff Days</span><span class="breakdown-val">${item.disputableDays} days</span></td>
      <td class="tabular-nums"><span class="mobile-field-label">Period Billed</span><span class="breakdown-val">${formatMoney(item.amount, currency)}</span></td>
      <td class="tabular-nums"><span class="mobile-field-label">Disputable Amount</span><span class="breakdown-val"><strong>${formatMoney(item.disputableAmount, currency)}</strong></span></td>
      <td><span class="mobile-field-label">Statutory Finding</span><span class="breakdown-val">${statusBadge}</span></td>
    `;
    breakdownTbody.appendChild(tr);
  });

  // 4. Retrieved Regulatory Authority (Curated Primary + Live Retrieved Source)
  sourcesContainer.innerHTML = '';
  const reg = data.regulation || {};
  const primary = reg.primaryAuthority || {
    title: reg.title,
    clauseReference: reg.clauseReference,
    summary: reg.summary,
    sourceUrl: reg.sourceUrl
  };

  const isUkJurisdiction = Boolean(
    (reg.jurisdiction && reg.jurisdiction === 'United Kingdom') ||
    countrySelect.value === 'United Kingdom' ||
    (reg.clauseReference && reg.clauseReference.includes('SLC 21BA'))
  );

  const ukObstructionNotice = (isObstructed && isUkJurisdiction)
    ? `<div style="font-size: 0.8125rem; color: #b45309; margin-top: 0.45rem; padding-top: 0.45rem; border-top: 1px dashed var(--border-color); line-height: 1.45;">
        Exception: protection may not apply where the consumer has been obstructive or manifestly unreasonable (SLC 21BA). Check the Ofgem text.
      </div>`
    : '';

  // Curated built-in statutory summary as primary authority
  const primaryDiv = document.createElement('div');
  primaryDiv.className = 'source-item primary-source-item';
  primaryDiv.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
      <div class="source-title" style="font-weight: 700; color: var(--text-primary); font-size: 0.9375rem;">
        ${primary.title || 'Official Back-billing Principle'} (${reg.jurisdiction || 'General'})
      </div>
      <span class="trust-badge trust-builtin" style="font-size: 0.7rem;">Curated rule</span>
    </div>
    <p style="font-size: 0.875rem; color: var(--color-text-muted); margin: 0.5rem 0 0.4rem 0; line-height: 1.5;">
      ${primary.summary || "Under mandatory back-billing rules, energy suppliers are barred from seeking recovery of charges for energy consumed more than the statutory limit prior to the bill date where the delay or error was the supplier's responsibility."}
    </p>
    ${primary.sourceUrl ? `<a href="${primary.sourceUrl}" target="_blank" rel="noopener noreferrer" class="source-url" style="color: #2563eb; font-size: 0.8125rem; word-break: break-all;">${primary.sourceUrl} &nearr;</a>` : ''}
    ${ukObstructionNotice}
  `;
  sourcesContainer.appendChild(primaryDiv);

  // Live Tavily additional retrieved source
  if (reg.additionalSource && reg.additionalSource.url) {
    const addSource = reg.additionalSource;
    const isConsultation = Boolean(
      addSource.isConsultation ||
      addSource.docTypeLabel ||
      (addSource.url && addSource.url.toLowerCase().includes('consultation')) ||
      (addSource.title && addSource.title.toLowerCase().includes('consultation'))
    );

    const docTypeBadge = addSource.docTypeLabel
      ? `<span class="preset-badge" style="background: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-size: 0.6875rem; margin-left: 0.5rem;">${addSource.docTypeLabel}</span>`
      : '';

    const hostName = addSource.host || (() => {
      try { return new URL(addSource.url).hostname.replace(/^www\./, ''); } catch { return ''; }
    })();

    const sourceCardContent = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; flex-wrap: wrap;">
          <span style="font-weight: 600; font-size: 0.8125rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Additional retrieved source</span>
          ${docTypeBadge}
        </div>
        <span class="trust-badge trust-live" style="font-size: 0.6875rem;">Live source</span>
      </div>
      <div class="source-title" style="font-size: 0.875rem; font-weight: 600; margin-top: 0.25rem;">
        ${addSource.title || 'Retrieved Document'}
      </div>
      ${hostName ? `<div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.2rem;"><strong>Host:</strong> ${hostName}</div>` : ''}
      <div style="margin-top: 0.25rem;">
        <a href="${addSource.url}" target="_blank" rel="noopener noreferrer" class="source-url" style="color: #2563eb; font-size: 0.8125rem; word-break: break-all;">${addSource.url} &nearr;</a>
      </div>
      <div style="font-size: 0.75rem; font-style: italic; color: var(--color-text-muted); margin-top: 0.25rem;">Retrieved by search, not verified</div>
    `;

    if (isConsultation) {
      const detailsEl = document.createElement('details');
      detailsEl.className = 'consultation-details';
      detailsEl.style.cssText = 'margin-top: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px; padding: 0.5rem 0.75rem; background: var(--bg-surface-subtle);';
      detailsEl.innerHTML = `
        <summary style="font-weight: 600; font-size: 0.8125rem; color: var(--text-secondary); cursor: pointer; user-select: none;">Background (proposal stage, not the current rule)</summary>
        <div class="source-item additional-source-item" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border-color);">
          ${sourceCardContent}
        </div>
      `;
      sourcesContainer.appendChild(detailsEl);
    } else {
      const addDiv = document.createElement('div');
      addDiv.className = 'source-item additional-source-item';
      addDiv.style.marginTop = '0.75rem';
      addDiv.style.borderTop = '1px solid var(--border-color)';
      addDiv.style.paddingTop = '0.75rem';
      addDiv.innerHTML = sourceCardContent;
      sourcesContainer.appendChild(addDiv);
    }
  } else if (reg.liveSearch === false || Boolean(reg.fallbackNotice)) {
    const fallbackDiv = document.createElement('div');
    fallbackDiv.className = 'live-search-fallback-notice';
    fallbackDiv.style.cssText = 'margin-top: 0.75rem; padding: 0.5rem 0.75rem; background: var(--bg-surface-subtle); border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 0.8125rem; color: var(--text-secondary);';
    fallbackDiv.innerHTML = '<strong style="color: #f59e0b;">Notice:</strong> Live search unavailable. Showing built-in statutory reference. Please verify with the regulator.';
    sourcesContainer.appendChild(fallbackDiv);
  }

  // 5. Dispute Letter Box & Action Buttons
  if (data.disputeLetter) {
    data.disputeLetter = cleanLetterText(data.disputeLetter);
    letterContent.textContent = data.disputeLetter;
    btnCopyLetter.disabled = false;
    btnCopyLetter.style.display = 'inline-flex';
    if (btnPrintDossier) {
      btnPrintDossier.disabled = false;
      btnPrintDossier.style.display = 'inline-flex';
    }
    if (btnDownloadPdf) {
      btnDownloadPdf.disabled = false;
      btnDownloadPdf.style.display = 'inline-flex';
    }

    // Direct Supplier Email Handling
    const contact = data.supplierContact || {};
    const isDemoSupplier = contact.isDemo || data.supplierEmail === 'complaints@example.com' || (data.supplierName && data.supplierName.toLowerCase().includes('example'));
    const isDirectorySupplier = contact.isDirectory && Boolean(contact.email);

    if (btnEmailSupplier) {
      btnEmailSupplier.style.display = 'inline-flex';

      if (isDemoSupplier) {
        data.supplierEmail = 'complaints@example.com';
        if (unknownSupplierEmailBox) unknownSupplierEmailBox.style.display = 'none';
        btnEmailSupplier.disabled = false;
        btnEmailSupplier.title = 'Launch pre-filled dispute email to complaints@example.com (demo address)';
        if (btnEmailSupplierText) {
          btnEmailSupplierText.textContent = 'Email Dispute (complaints@example.com • demo address)';
        }
      } else if (isDirectorySupplier) {
        data.supplierEmail = contact.email;
        if (unknownSupplierEmailBox) unknownSupplierEmailBox.style.display = 'none';
        btnEmailSupplier.disabled = false;
        btnEmailSupplier.title = `Launch pre-filled dispute email directly to ${contact.email}`;
        if (btnEmailSupplierText) {
          btnEmailSupplierText.textContent = `Email Dispute (${contact.email})`;
        }
      } else {
        // Unknown supplier: show input and disable email buttons until a valid email is entered
        if (unknownSupplierEmailBox) unknownSupplierEmailBox.style.display = 'block';
        const enteredEmail = (inputUnknownSupplierEmail ? inputUnknownSupplierEmail.value.trim() : '') || (data.supplierEmail || '');
        const valid = isValidEmail(enteredEmail);

        if (valid) {
          data.supplierEmail = enteredEmail;
          btnEmailSupplier.disabled = false;
          btnEmailSupplier.title = `Launch pre-filled dispute email directly to ${enteredEmail}`;
          if (btnEmailSupplierText) {
            btnEmailSupplierText.textContent = `Email Dispute (${enteredEmail})`;
          }
        } else {
          data.supplierEmail = null;
          btnEmailSupplier.disabled = true;
          btnEmailSupplier.title = "Enter your supplier's complaints email to enable email buttons";
          if (btnEmailSupplierText) {
            btnEmailSupplierText.textContent = 'Email Dispute to Supplier';
          }
        }
      }
    }

    // Statutory Escalation & Ombudsman Timeline Tracker
    if (escalationTrackerCard) {
      escalationTrackerCard.classList.add('visible');
      escalationTrackerCard.style.display = 'block';
      updateEscalationDates();
    }

  } else {
    letterContent.textContent = `[Formal Dispute Letter Not Applicable]

Reason: ${data.exceptionNotes || 'Charges are within statutory limits or meter access was obstructed. A formal back-billing dispute cannot be issued.'}`;
    btnCopyLetter.disabled = true;
    btnCopyLetter.style.display = 'none';
    if (btnPrintDossier) {
      btnPrintDossier.disabled = true;
      btnPrintDossier.style.display = 'none';
    }
    if (btnDownloadPdf) {
      btnDownloadPdf.disabled = true;
      btnDownloadPdf.style.display = 'none';
    }
    if (btnEmailSupplier) {
      btnEmailSupplier.disabled = true;
      btnEmailSupplier.style.display = 'none';
    }
    if (unknownSupplierEmailBox) unknownSupplierEmailBox.style.display = 'none';
    if (escalationTrackerCard) {
      escalationTrackerCard.classList.remove('visible');
      escalationTrackerCard.style.display = 'none';
    }
  }

  // Show result-dependent sections with fade-in
  const timelineCard = document.getElementById('timeline-card');
  const apportionmentCard = document.getElementById('apportionment-schedule-card');
  const retrievedAuthCard = document.getElementById('retrieved-authority-card');
  const disputeLetterCard = document.getElementById('dispute-letter-card');

  if (timelineCard) { timelineCard.classList.add('visible'); timelineCard.style.display = 'block'; }
  if (apportionmentCard) { apportionmentCard.classList.add('visible'); apportionmentCard.style.display = 'block'; }
  if (retrievedAuthCard) { retrievedAuthCard.classList.add('visible'); retrievedAuthCard.style.display = 'block'; }

  if (data.disputeLetter) {
    if (disputeLetterCard) { disputeLetterCard.classList.add('visible'); disputeLetterCard.style.display = 'block'; }
  } else {
    if (disputeLetterCard) { disputeLetterCard.classList.remove('visible'); disputeLetterCard.style.display = 'none'; }
  }

  // Cache current analysis result for PDF export & email dispatch
  currentAnalysisResult = data;

  // Reveal results section & scroll smoothly to result card
  resultsSection.classList.add('visible');
  const verdictCard = document.getElementById('verdict-card') || document.getElementById('plain-language-result-card') || resultsSection;
  if (verdictCard) {
    verdictCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Calculates dynamic dates for Day 1 (local date), Day 14, and Day 56 (8 Weeks).
 */
export function getLocalEscalationDates(baseDate) {
  let d;
  if (typeof baseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
    const [y, m, day] = baseDate.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else if (baseDate instanceof Date) {
    d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  } else {
    const now = new Date();
    d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const year = d.getFullYear();
  const month = d.getMonth();
  const date = d.getDate();

  const day1 = new Date(year, month, date);
  const day14 = new Date(year, month, date + 14);
  const day56 = new Date(year, month, date + 56);

  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = `${year}-${pad(month + 1)}-${pad(date)}`;
  const fmt = (dt) => dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return {
    isoDate,
    day1Formatted: fmt(day1),
    day14Formatted: fmt(day14),
    day56Formatted: fmt(day56)
  };
}

function updateEscalationDates(baseDate) {
  const dates = getLocalEscalationDates(baseDate);
  if (dateStep1) dateStep1.textContent = dates.day1Formatted;
  if (dateStep2) dateStep2.textContent = dates.day14Formatted;
  if (dateStep3) dateStep3.textContent = dates.day56Formatted;
  return dates;
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

  const consumerName = consumerNameInput ? consumerNameInput.value.trim() : '';
  const supplierName = supplierNameInput ? supplierNameInput.value.trim() : '';
  const accountNumber = accountNumberInput ? accountNumberInput.value.trim() : '';
  const supplyAddress = supplyAddressInput ? supplyAddressInput.value.trim() : '';

  if (!consumerName || !supplierName || !accountNumber || !supplyAddress) {
    validationErrorBanner.classList.add('visible');
    validationErrorMsg.textContent = 'Please provide Consumer Name, Supplier Name, Account Number, and Supply Address.';
    btnAnalyze.disabled = false;
    btnAnalyzeText.textContent = 'Run Statutory Audit';
    return;
  }

  if (countrySelect.value === 'Australia' && inputAustraliaState && inputAustraliaState.value === 'VIC') {
    showToast('Victoria has its own code; this tool does not cover it', 'error', 4000);
    return;
  }

  const localDates = getLocalEscalationDates();

  const payload = {
    country: countrySelect.value,
    australiaState: countrySelect.value === 'Australia' && inputAustraliaState ? inputAustraliaState.value : '',
    billDate: billDateInput.value,
    isEstimated: inputEstimated.value === 'true',
    isMeterObstructed: inputObstructed.value === 'true',
    consumerName,
    supplierName,
    accountNumber,
    supplyAddress,
    billingPeriods,
    noticeDate: localDates.isoDate
  };

  // Button loading state & empty/evaluating state
  btnAnalyze.disabled = true;
  btnAnalyzeText.textContent = 'Analyzing...';

  const plainHeadline = document.getElementById('plain-result-headline');
  const plainWhy = document.getElementById('plain-result-why');
  const plainTag = document.getElementById('plain-result-tag');
  const plainNextSteps = document.getElementById('plain-next-steps');
  const authorityBadge = document.getElementById('authority-trust-badge');

  if (plainHeadline) plainHeadline.textContent = 'Evaluating...';
  if (plainWhy) plainWhy.textContent = 'Evaluating consumption periods against governing regulations...';
  if (plainTag) plainTag.style.display = 'none';
  if (plainNextSteps) plainNextSteps.style.display = 'none';
  if (authorityBadge) authorityBadge.style.display = 'none';

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
    resetResultsToEmptyState();
    validationErrorBanner.classList.add('visible');
    validationErrorMsg.textContent = err.message.includes('Billing periods overlap')
      ? 'Billing periods overlap. Please check the dates.'
      : `Analysis error: ${err.message}`;
    showToast(`Analysis error: ${err.message}`, 'error', 4000);
  } finally {
    btnAnalyze.disabled = false;
    btnAnalyzeText.textContent = 'Run Statutory Audit';
  }
});

// Toast notification helper
function showToast(message, type = 'success', duration = 3200) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
  } else if (type === 'warning') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  } else {
    iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  }

  toast.innerHTML = `
    <div class="toast-icon">${iconSvg}</div>
    <div class="toast-text">${message}</div>
    <button type="button" class="toast-close" aria-label="Close notification">&times;</button>
  `;

  const btnClose = toast.querySelector('.toast-close');
  btnClose.addEventListener('click', () => {
    toast.classList.add('fading');
    setTimeout(() => toast.remove(), 250);
  });

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add('fading');
      setTimeout(() => toast.remove(), 250);
    }
  }, duration);
}

// Copy letter button handler
if (btnCopyLetter) {
  btnCopyLetter.addEventListener('click', async () => {
    const text = cleanLetterText(letterContent.textContent);
    try {
      await navigator.clipboard.writeText(text);
      copyFeedback.classList.add('visible');
      showToast('Dispute letter copied to clipboard!', 'success');
      setTimeout(() => {
        copyFeedback.classList.remove('visible');
      }, 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
      showToast('Could not access clipboard. Please copy manually.', 'error');
    }
  });
}

// Enterprise Dispute Dispatcher Modal DOM references
const emailModal = document.getElementById('email-modal');
const btnCloseEmailModal = document.getElementById('btn-close-email-modal');
const modalEmailTo = document.getElementById('modal-email-to');
const modalEmailToBadge = document.getElementById('modal-email-to-badge');
const modalEmailToHint = document.getElementById('modal-email-to-hint');
const modalEmailSubject = document.getElementById('modal-email-subject');
const modalEmailBody = document.getElementById('modal-email-body');
const modalSupplierSubtitle = document.getElementById('modal-supplier-subtitle');
const modalSupplierInfoBox = document.getElementById('modal-supplier-info-box');
const btnCopyModalTo = document.getElementById('btn-copy-modal-to');
const btnCopyModalSubject = document.getElementById('btn-copy-modal-subject');
const btnModalCopyLetterBody = document.getElementById('btn-modal-copy-letter-body');
const btnLaunchGmail = document.getElementById('btn-launch-gmail');
const btnLaunchOutlook = document.getElementById('btn-launch-outlook');
const btnLaunchMailto = document.getElementById('btn-launch-mailto');
const btnCopyAllEmail = document.getElementById('btn-copy-all-email');

/**
 * Updates the embedded complaints email in the current letter text
 */
function updateDisputeLetterEmail(newEmail) {
  if (!currentAnalysisResult || !currentAnalysisResult.disputeLetter) return;
  let letter = currentAnalysisResult.disputeLetter;
  if (/Email:[^\n]+/i.test(letter)) {
    letter = letter.replace(/Email:[^\n]+/i, `Email: ${newEmail}`);
  } else {
    const supplier = currentAnalysisResult.supplierName || (supplierNameInput ? supplierNameInput.value.trim() : 'Energy Supplier');
    letter = letter.replace(supplier, `${supplier}\nEmail: ${newEmail}`);
  }
  letter = cleanLetterText(letter);
  currentAnalysisResult.disputeLetter = letter;
  if (letterContent) letterContent.textContent = letter;
  if (modalEmailBody) {
    const noticeHeader = `[NOTICE TO COMPLAINTS TEAM: Please find our complete 3-Page Schedule of Mathematical Evidence & Dispute Packet (draft) attached as a PDF.]\n\n`;
    modalEmailBody.value = noticeHeader + letter;
  }
}

/**
 * Opens the Enterprise Email Dispatcher Modal with pre-populated details
 */
function openEmailDispatcherModal() {
  if (!currentAnalysisResult || !currentAnalysisResult.disputeLetter) {
    showToast('Please run an audit on a bill with disputable charges first.', 'warning');
    return;
  }
  currentAnalysisResult.disputeLetter = cleanLetterText(currentAnalysisResult.disputeLetter);

  const contact = currentAnalysisResult.supplierContact || {};
  const supplierName = currentAnalysisResult.supplierName || (supplierNameInput ? supplierNameInput.value.trim() : 'Energy Supplier');
  const isDemoSupplier = contact.isDemo || (supplierName && supplierName.toLowerCase().includes('example')) || currentAnalysisResult.supplierEmail === 'complaints@example.com';
  const isDirectorySupplier = contact.isDirectory && Boolean(contact.email);

  let targetEmail = '';
  if (isDemoSupplier) {
    targetEmail = 'complaints@example.com';
    currentAnalysisResult.supplierEmail = targetEmail;
  } else if (isDirectorySupplier) {
    targetEmail = contact.email;
    currentAnalysisResult.supplierEmail = targetEmail;
  } else if (currentAnalysisResult.supplierEmail) {
    targetEmail = currentAnalysisResult.supplierEmail;
  } else if (inputUnknownSupplierEmail && inputUnknownSupplierEmail.value.trim()) {
    targetEmail = inputUnknownSupplierEmail.value.trim();
    if (isValidEmail(targetEmail)) {
      currentAnalysisResult.supplierEmail = targetEmail;
    }
  }

  const accNum = currentAnalysisResult.accountNumber || (accountNumberInput ? accountNumberInput.value.trim() : 'Reference');
  const clause = currentAnalysisResult.regulation?.clauseReference || 'Statutory Utility Code';

  const subject = `FORMAL DISPUTE: Back-billing catch-up charges (${clause}) - Account ${accNum}`;
  const noticeHeader = `[NOTICE TO COMPLAINTS TEAM: Please find our complete 3-Page Schedule of Mathematical Evidence & Dispute Packet (draft) attached as a PDF.]\n\n`;
  const fullBody = noticeHeader + currentAnalysisResult.disputeLetter;

  const modalEmailToLabel = document.getElementById('modal-email-to-label');
  if (modalEmailTo) {
    modalEmailTo.value = targetEmail;
    if (isDemoSupplier) {
      modalEmailTo.readOnly = true;
      if (modalEmailToLabel) {
        modalEmailToLabel.innerHTML = 'Complaints email: <span class="modal-label-badge valid" id="modal-email-to-badge">demo address</span>';
      }
      if (modalEmailToBadge) {
        modalEmailToBadge.textContent = 'demo address';
        modalEmailToBadge.className = 'modal-label-badge valid';
      }
      if (modalEmailToHint) modalEmailToHint.style.display = 'none';
    } else if (isDirectorySupplier) {
      modalEmailTo.readOnly = true;
      if (modalEmailToLabel) {
        modalEmailToLabel.innerHTML = 'Complaints email: <span class="modal-label-badge valid" id="modal-email-to-badge">Complaints email</span>';
      }
      if (modalEmailToBadge) {
        modalEmailToBadge.textContent = 'Complaints email';
        modalEmailToBadge.className = 'modal-label-badge valid';
      }
      if (modalEmailToHint) modalEmailToHint.style.display = 'none';
    } else {
      modalEmailTo.readOnly = false;
      modalEmailTo.placeholder = "Enter your supplier's complaints email";
      if (modalEmailToLabel) {
        modalEmailToLabel.innerHTML = 'Enter your supplier\'s complaints email: <span class="modal-label-badge" id="modal-email-to-badge">Complaints email</span>';
      }
      if (modalEmailToBadge) {
        modalEmailToBadge.textContent = "Complaints email";
        modalEmailToBadge.className = 'modal-label-badge';
      }
      if (modalEmailToHint) {
        modalEmailToHint.style.display = 'block';
        modalEmailToHint.textContent = "Check your supplier's website";
      }
    }
  }

  // Validate and toggle channel buttons
  const isEmailValid = isValidEmail(targetEmail);
  if (btnLaunchGmail) btnLaunchGmail.disabled = !isEmailValid;
  if (btnLaunchOutlook) btnLaunchOutlook.disabled = !isEmailValid;
  if (btnLaunchMailto) btnLaunchMailto.disabled = !isEmailValid;

  if (modalEmailSubject) modalEmailSubject.value = subject;
  if (modalEmailBody) modalEmailBody.value = fullBody;

  if (modalSupplierSubtitle) {
    modalSupplierSubtitle.textContent = `Supplier complaints channel for ${supplierName} (${currentAnalysisResult.regulation?.jurisdiction || 'Statutory Jurisdiction'})`;
  }

  if (modalSupplierInfoBox) {
    const badgeText = isDemoSupplier ? 'demo address' : (isDirectorySupplier ? 'Verified complaints contact' : "Check your supplier's website");
    const badgeClass = isDemoSupplier || isDirectorySupplier ? 'valid' : '';
    modalSupplierInfoBox.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <strong style="color: var(--color-text-main); font-size: 0.9375rem;">${contact.name || supplierName}</strong>
          <span class="preset-badge ${badgeClass}" style="margin-left: 0.5rem; font-size: 0.6875rem;">${badgeText}</span>
          <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.25rem;">Check your supplier's website for the complaints email address</div>
        </div>
        <div style="font-size: 0.8125rem; color: var(--color-text-muted);">
          ${contact.phone && isDirectorySupplier ? `<span>📞 Phone: <a href="tel:${contact.phone}" style="color: #2563eb; font-weight: 500;">${contact.phone}</a></span> &bull; ` : ''}
          ${contact.portalUrl && isDirectorySupplier ? `<a href="${contact.portalUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">Online Portal &nearr;</a> &bull; ` : ''}
          <span style="color: #475569;">⚖️ ${contact.ombudsman || 'Independent Ombudsman'}</span>
        </div>
      </div>
    `;
  }

  if (emailModal) {
    emailModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  showToast(`Loaded dispatch channel for ${supplierName}`, 'info', 2000);
}

function closeEmailDispatcherModal() {
  if (emailModal) {
    emailModal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// Modal event listeners
if (btnEmailSupplier) {
  btnEmailSupplier.addEventListener('click', (e) => {
    e.preventDefault();
    openEmailDispatcherModal();
  });
}

if (btnCloseEmailModal) {
  btnCloseEmailModal.addEventListener('click', closeEmailDispatcherModal);
}

if (emailModal) {
  emailModal.addEventListener('click', (e) => {
    if (e.target === emailModal) {
      closeEmailDispatcherModal();
    }
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && emailModal && emailModal.style.display === 'flex') {
    closeEmailDispatcherModal();
  }
});

// Real-time synchronization between unknown supplier inputs
if (modalEmailTo) {
  modalEmailTo.addEventListener('input', () => {
    const val = modalEmailTo.value.trim();
    if (inputUnknownSupplierEmail) inputUnknownSupplierEmail.value = val;
    const valid = isValidEmail(val);
    if (btnLaunchGmail) btnLaunchGmail.disabled = !valid;
    if (btnLaunchOutlook) btnLaunchOutlook.disabled = !valid;
    if (btnLaunchMailto) btnLaunchMailto.disabled = !valid;
    if (btnEmailSupplier) {
      btnEmailSupplier.disabled = !valid;
      if (btnEmailSupplierText) {
        btnEmailSupplierText.textContent = valid ? `Email Dispute (${val})` : 'Email Dispute to Supplier';
      }
    }
    if (valid) {
      if (currentAnalysisResult) {
        currentAnalysisResult.supplierEmail = val;
        updateDisputeLetterEmail(val);
      }
    } else if (currentAnalysisResult) {
      currentAnalysisResult.supplierEmail = null;
    }
  });
}

if (inputUnknownSupplierEmail) {
  inputUnknownSupplierEmail.addEventListener('input', () => {
    const val = inputUnknownSupplierEmail.value.trim();
    if (modalEmailTo) modalEmailTo.value = val;
    const valid = isValidEmail(val);
    if (btnEmailSupplier) {
      btnEmailSupplier.disabled = !valid;
      if (btnEmailSupplierText) {
        btnEmailSupplierText.textContent = valid ? `Email Dispute (${val})` : 'Email Dispute to Supplier';
      }
    }
    if (btnLaunchGmail) btnLaunchGmail.disabled = !valid;
    if (btnLaunchOutlook) btnLaunchOutlook.disabled = !valid;
    if (btnLaunchMailto) btnLaunchMailto.disabled = !valid;
    if (valid) {
      if (currentAnalysisResult) {
        currentAnalysisResult.supplierEmail = val;
        updateDisputeLetterEmail(val);
      }
    } else if (currentAnalysisResult) {
      currentAnalysisResult.supplierEmail = null;
    }
  });
}

// Copy inline buttons inside modal
if (btnCopyModalTo) {
  btnCopyModalTo.addEventListener('click', async () => {
    if (!modalEmailTo) return;
    await navigator.clipboard.writeText(modalEmailTo.value);
    showToast('Recipient complaints email copied!', 'success');
  });
}

if (btnCopyModalSubject) {
  btnCopyModalSubject.addEventListener('click', async () => {
    if (!modalEmailSubject) return;
    await navigator.clipboard.writeText(modalEmailSubject.value);
    showToast('Formal subject line copied!', 'success');
  });
}

if (btnModalCopyLetterBody) {
  btnModalCopyLetterBody.addEventListener('click', async () => {
    if (!modalEmailBody) return;
    const cleaned = cleanLetterText(modalEmailBody.value);
    await navigator.clipboard.writeText(cleaned);
    showToast('Full letter text copied!', 'success');
  });
}

// 1. Gmail Web Launcher
if (btnLaunchGmail) {
  btnLaunchGmail.addEventListener('click', async () => {
    if (!currentAnalysisResult) return;
    const to = modalEmailTo.value.trim();
    if (!isValidEmail(to)) {
      showToast("Please enter a valid supplier complaints email address.", 'warning');
      return;
    }
    const sub = modalEmailSubject.value;
    const fullText = cleanLetterText(modalEmailBody.value);

    const clause = currentAnalysisResult.regulation?.clauseReference || 'Statutory Utility Code';
    const acc = currentAnalysisResult.accountNumber || 'Reference';
    const conciseBody = `Dear Complaints Department,\n\nPlease find our formal dispute notice regarding back-billing charges that appear to exceed the statutory limit under ${clause} (Account ${acc}).\n\n[Full 3-Page Dispute Letter and Schedule of Evidence copied to your clipboard. Paste into this email or attach Dispute Packet (draft).]\n\nKind regards,\n${currentAnalysisResult.consumerName || 'Consumer'}`;

    try {
      await navigator.clipboard.writeText(fullText);
    } catch (_) {}

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(sub)}&body=${encodeURIComponent(conciseBody)}`;
    window.open(gmailUrl, '_blank');
    showToast('Opened Gmail web compose! Full letter copied to clipboard.', 'success', 4000);
  });
}

// 2. Outlook Web Launcher
if (btnLaunchOutlook) {
  btnLaunchOutlook.addEventListener('click', async () => {
    if (!currentAnalysisResult) return;
    const to = modalEmailTo.value.trim();
    if (!isValidEmail(to)) {
      showToast("Please enter a valid supplier complaints email address.", 'warning');
      return;
    }
    const sub = modalEmailSubject.value;
    const fullText = cleanLetterText(modalEmailBody.value);

    const clause = currentAnalysisResult.regulation?.clauseReference || 'Statutory Utility Code';
    const acc = currentAnalysisResult.accountNumber || 'Reference';
    const conciseBody = `Dear Complaints Department,\n\nPlease find our formal dispute notice regarding back-billing charges that appear to exceed the statutory limit under ${clause} (Account ${acc}).\n\n[Full 3-Page Dispute Letter copied to your clipboard. Paste into this email or attach Dispute Packet (draft).]\n\nKind regards,\n${currentAnalysisResult.consumerName || 'Consumer'}`;

    try {
      await navigator.clipboard.writeText(fullText);
    } catch (_) {}

    const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(conciseBody)}`;
    window.open(outlookUrl, '_blank');
    showToast('Opened Outlook web compose! Full letter copied to clipboard.', 'success', 4000);
  });
}

// 3. Default OS Mail Client (safe mailto URL)
if (btnLaunchMailto) {
  btnLaunchMailto.addEventListener('click', async () => {
    if (!currentAnalysisResult) return;
    const to = modalEmailTo.value.trim();
    if (!isValidEmail(to)) {
      showToast("Please enter a valid supplier complaints email address.", 'warning');
      return;
    }
    const sub = modalEmailSubject.value;
    const fullText = cleanLetterText(modalEmailBody.value);

    const clause = currentAnalysisResult.regulation?.clauseReference || 'Statutory Utility Code';
    const acc = currentAnalysisResult.accountNumber || 'Reference';
    const conciseBody = `Dear Complaints Department,\n\nPlease find our formal dispute notice regarding back-billing charges that appear to exceed the statutory limit under ${clause} (Account ${acc}).\n\n[Complete Dispute Packet (draft) copied to clipboard. Paste below or attach PDF.]\n\nKind regards,\n${currentAnalysisResult.consumerName || 'Consumer'}`;

    try {
      await navigator.clipboard.writeText(fullText);
    } catch (_) {}

    const safeMailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(conciseBody)}`;
    window.location.href = safeMailto;
    showToast('Triggered default mail app! Full letter copied to clipboard.', 'success', 4000);
  });
}

// 4. Copy All to Clipboard
if (btnCopyAllEmail) {
  btnCopyAllEmail.addEventListener('click', async () => {
    const to = modalEmailTo.value;
    const sub = modalEmailSubject.value;
    const body = cleanLetterText(modalEmailBody.value);

    const packet = `TO: ${to}\nSUBJECT: ${sub}\n\n---\n\n${body}`;
    try {
      await navigator.clipboard.writeText(packet);
      showToast('Complete dispute packet (draft) copied to clipboard!', 'success', 3500);
    } catch (err) {
      showToast('Could not access clipboard.', 'error');
    }
  });
}

// Add Deadlines to Calendar (.ics) button handler
if (btnAddCalendar) {
  btnAddCalendar.addEventListener('click', () => {
    if (!currentAnalysisResult) {
      showToast('Please run an audit on a bill first.', 'warning');
      return;
    }

    downloadCalendarEvent({
      supplierName: currentAnalysisResult.supplierName || (supplierNameInput ? supplierNameInput.value.trim() : 'Energy Supplier'),
      accountNumber: currentAnalysisResult.accountNumber || (accountNumberInput ? accountNumberInput.value.trim() : 'Reference'),
      disputableTotal: currentAnalysisResult.disputableTotal || 0,
      currency: currentAnalysisResult.currency || '£',
      startDate: new Date()
    });
    showToast('Statutory dispute deadlines saved to calendar (.ics)!', 'success');
  });
}

// Download Dispute Packet (draft) (.pdf) button handler
if (btnDownloadPdf) {
  btnDownloadPdf.addEventListener('click', async () => {
    if (!currentAnalysisResult) {
      showToast('Please run an audit before downloading the dispute packet.', 'warning');
      return;
    }

    const originalBtnText = btnDownloadPdfText ? btnDownloadPdfText.textContent : 'Download Dispute Packet (draft) (.pdf)';
    const cName = consumerNameInput ? consumerNameInput.value.trim() : (currentAnalysisResult.consumerName || '');
    const sName = supplierNameInput ? supplierNameInput.value.trim() : (currentAnalysisResult.supplierName || '');
    const aNum = accountNumberInput ? accountNumberInput.value.trim() : (currentAnalysisResult.accountNumber || '');
    const sAddr = supplyAddressInput ? supplyAddressInput.value.trim() : (currentAnalysisResult.supplyAddress || '');

    if (!cName || !sName || !aNum || !sAddr) {
      showToast('Please provide Consumer Name, Supplier Name, Account Number, and Supply Address.', 'error');
      return;
    }

    if (btnDownloadPdfText) btnDownloadPdfText.textContent = 'Generating PDF Packet...';
    btnDownloadPdf.disabled = true;

    try {
      const localDates = getLocalEscalationDates();
      const resolvedSupplierEmail = currentAnalysisResult.supplierEmail || (inputUnknownSupplierEmail ? inputUnknownSupplierEmail.value.trim() : null);

      const pdfPayload = {
        consumerName: cName,
        supplierName: sName,
        accountNumber: aNum,
        supplyAddress: sAddr,
        country: countrySelect.value,
        australiaState: countrySelect.value === 'Australia' && inputAustraliaState ? inputAustraliaState.value : '',
        billDate: currentAnalysisResult.billDate || billDateInput.value,
        cutOffDate: currentAnalysisResult.cutOffDate,
        noticeDate: currentAnalysisResult.noticeDate || localDates.isoDate,
        lookbackMonths: currentAnalysisResult.lookbackMonths,
        currency: currentAnalysisResult.currency,
        disputableTotal: currentAnalysisResult.disputableTotal,
        totalBilled: currentAnalysisResult.totalBilled,
        itemizedBreakdown: currentAnalysisResult.itemizedBreakdown,
        regulation: currentAnalysisResult.regulation,
        isEstimated: inputEstimated.value === 'true',
        isMeterObstructed: inputObstructed.value === 'true',
        disputeLetter: currentAnalysisResult.disputeLetter,
        meterEvidence: currentMeterEvidence,
        supplierEmail: resolvedSupplierEmail,
        supplierContact: currentAnalysisResult.supplierContact
      };

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pdfPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate PDF (HTTP ${response.status})`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      const safeRef = (pdfPayload.accountNumber || 'Reference').replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadLink.download = `BillRight_Dispute_Packet_Draft_${safeRef}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.URL.revokeObjectURL(blobUrl);

      showToast('Dispute packet (draft) PDF downloaded!', 'success');

    } catch (err) {
      console.error('PDF generation error:', err);
      showToast(`Could not generate PDF packet: ${err.message}`, 'error');
    } finally {
      btnDownloadPdf.disabled = false;
      if (btnDownloadPdfText) btnDownloadPdfText.textContent = originalBtnText;
    }
  });
}

function resetDropzone() {
  if (fileInput) fileInput.value = '';
  if (dropzonePrompt) dropzonePrompt.style.display = 'block';
  if (dropzoneProcessing) dropzoneProcessing.style.display = 'none';
  if (dropzoneSuccess) dropzoneSuccess.style.display = 'none';
  const countryMismatchWarning = document.getElementById('country-mismatch-warning');
  if (countryMismatchWarning) countryMismatchWarning.style.display = 'none';
}

async function processFile(file) {
  if (!file) return;

  // Validate file type
  const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
  if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|png|jpe?g|webp)$/i)) {
    validationErrorBanner.classList.add('visible');
    validationErrorMsg.textContent = 'Unsupported file format. Please upload a PDF, PNG, JPG, or WebP bill.';
    return;
  }

  // Validate size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    validationErrorBanner.classList.add('visible');
    validationErrorMsg.textContent = 'File too large. Maximum supported size is 10MB.';
    return;
  }

  // UI state: Processing
  validationErrorBanner.classList.remove('visible');
  dropzonePrompt.style.display = 'none';
  dropzoneSuccess.style.display = 'none';
  dropzoneProcessing.style.display = 'flex';
  processingFilename.textContent = `Extracting ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`;

  try {
    // Read file as base64
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    const res = await fetch('/api/extract-bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileData: base64Data,
        mimeType: file.type || 'application/pdf'
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    const data = await res.json();

    // Populate form with extracted data and mark for OCR review
    if (data.billDate) {
      billDateInput.value = data.billDate;
      markFieldForOcrReview(billDateInput);
    }

    if (data.supplierName && supplierNameInput) {
      supplierNameInput.value = data.supplierName;
      markFieldForOcrReview(supplierNameInput);
    }

    if (data.accountNumber && accountNumberInput) {
      accountNumberInput.value = data.accountNumber;
      markFieldForOcrReview(accountNumberInput);
    }

    if (typeof data.isEstimated === 'boolean') {
      setToggleValue(groupEstimated, inputEstimated, data.isEstimated);
    }

    // Check if extracted currency or country conflicts with selected jurisdiction
    const currentJurisdiction = countrySelect.value;
    let isCountryConflict = false;
    if (data.currency) {
      if (currentJurisdiction === 'United Kingdom' && (data.currency === '$' || data.currency === 'A$')) {
        isCountryConflict = true;
      } else if (currentJurisdiction === 'Australia' && data.currency === '£') {
        isCountryConflict = true;
      } else if (currentJurisdiction.includes('United States') && (data.currency === '£' || data.currency === 'A$')) {
        isCountryConflict = true;
      }
    }
    if (data.country) {
      if (data.country === 'UK' && currentJurisdiction !== 'United Kingdom') isCountryConflict = true;
      if (data.country === 'Australia' && currentJurisdiction !== 'Australia') isCountryConflict = true;
      if (data.country === 'US' && !currentJurisdiction.includes('United States')) isCountryConflict = true;
    }

    const countryMismatchWarning = document.getElementById('country-mismatch-warning');
    if (isCountryConflict) {
      if (countryMismatchWarning) {
        countryMismatchWarning.textContent = 'This bill looks like it is from a different country than the one selected. Please check.';
        countryMismatchWarning.style.display = 'block';
      }
      showToast('This bill looks like it is from a different country than the one selected. Please check.', 'warning', 6000);
    } else {
      if (countryMismatchWarning) {
        countryMismatchWarning.style.display = 'none';
      }
    }

    // Update header currency
    const symbol = getCurrencySymbol(countrySelect.value);
    const header = document.getElementById('currency-symbol-header');
    if (header) header.textContent = symbol;

    // Populate billing periods table with OCR review hints
    periodsTbody.innerHTML = '';
    if (Array.isArray(data.billingPeriods) && data.billingPeriods.length > 0) {
      data.billingPeriods.forEach(p => {
        const row = addRow(p);
        if (row) {
          const s = row.querySelector('.row-start-date');
          const e = row.querySelector('.row-end-date');
          const a = row.querySelector('.row-amount');
          if (s) markFieldForOcrReview(s);
          if (e) markFieldForOcrReview(e);
          if (a) markFieldForOcrReview(a);
        }
      });
    } else {
      addRow();
    }

    clearPresetSelection();
    validateAndRecalculate();
    resetResultsToEmptyState();

    // UI state: Success with Trust Badge
    dropzoneProcessing.style.display = 'none';
    dropzoneSuccess.style.display = 'flex';
    successFilename.textContent = file.name;
    successSummary.innerHTML = `Extracted ${data.billingPeriods.length} billing periods from ${data.supplierName || 'statement'}. Please verify these values against your document. <span class="trust-badge trust-ai">Read by AI, please verify</span>`;

  } catch (err) {
    console.error('Extraction error:', err);
    resetDropzone();
    validationErrorBanner.classList.add('visible');
    validationErrorMsg.textContent = 'Could not read this file. Please enter the values manually.';
    showToast('Could not read this file. Please enter the values manually.', 'error', 4000);
  }
}

function setupDropzone() {
  if (!billDropzone || !fileInput) return;

  billDropzone.addEventListener('click', (e) => {
    if (e.target === btnClearFile || (btnClearFile && btnClearFile.contains(e.target))) return;
    fileInput.click();
  });

  billDropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    billDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      billDropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    billDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      billDropzone.classList.remove('drag-over');
    });
  });

  billDropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      processFile(fileInput.files[0]);
    }
  });

  if (btnClearFile) {
    btnClearFile.addEventListener('click', (e) => {
      e.stopPropagation();
      resetDropzone();
    });
  }

  // Try a sample bill button handler (loads synthetic sample-bill.png via real API)
  const btnTrySampleBill = document.getElementById('btn-try-sample-bill');
  if (btnTrySampleBill) {
    btnTrySampleBill.addEventListener('click', async (e) => {
      e.stopPropagation();
      // Set jurisdiction to United Kingdom (reset/hide Australian state selector, currency £)
      countrySelect.value = 'United Kingdom';
      if (inputAustraliaState) inputAustraliaState.value = 'NSW';
      updateAustraliaStateVisibility();
      const currencyHeader = document.getElementById('currency-symbol-header');
      if (currencyHeader) currencyHeader.textContent = '£';
      const countryMismatchWarning = document.getElementById('country-mismatch-warning');
      if (countryMismatchWarning) countryMismatchWarning.style.display = 'none';

      validationErrorBanner.classList.remove('visible');
      dropzonePrompt.style.display = 'none';
      dropzoneSuccess.style.display = 'none';
      dropzoneProcessing.style.display = 'flex';
      processingFilename.textContent = 'Loading sample bill (sample-bill.png)...';

      try {
        const resp = await fetch('/samples/sample-bill.png');
        if (!resp.ok) {
          throw new Error(`Failed to load sample image (HTTP ${resp.status})`);
        }
        const blob = await resp.blob();
        const file = new File([blob], 'sample-bill.png', { type: 'image/png' });
        await processFile(file);
      } catch (err) {
        console.error('Sample bill load error:', err);
        resetDropzone();
        validationErrorBanner.classList.add('visible');
        validationErrorMsg.textContent = 'Could not read this file. Please enter the values manually.';
        showToast('Could not read this file. Please enter the values manually.', 'error', 4000);
      }
    });
  }
}

function resetMeterDropzone() {
  if (meterFileInput) meterFileInput.value = '';
  if (meterDropzonePrompt) meterDropzonePrompt.style.display = 'block';
  if (meterDropzoneProcessing) meterDropzoneProcessing.style.display = 'none';
  if (meterDropzoneSuccess) meterDropzoneSuccess.style.display = 'none';
  if (meterEvidenceContainer) meterEvidenceContainer.style.display = 'none';
  currentMeterEvidence = null;
}

async function processMeterFile(file) {
  if (!file) return;

  // Validate image file type
  const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
  if (!validTypes.includes(file.type) && !file.name.match(/\.(png|jpe?g|webp)$/i)) {
    validationErrorBanner.classList.add('visible');
    validationErrorMsg.textContent = 'Please upload a photo of your meter faceplate (PNG, JPG, or WebP).';
    return;
  }

  // Validate size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    validationErrorBanner.classList.add('visible');
    validationErrorMsg.textContent = 'File too large. Maximum supported size is 10MB.';
    return;
  }

  validationErrorBanner.classList.remove('visible');
  if (meterDropzonePrompt) meterDropzonePrompt.style.display = 'none';
  if (meterDropzoneSuccess) meterDropzoneSuccess.style.display = 'none';
  if (meterDropzoneProcessing) meterDropzoneProcessing.style.display = 'flex';
  if (meterProcessingFilename) meterProcessingFilename.textContent = `Analyzing ${file.name}...`;

  try {
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    const res = await fetch('/api/extract-meter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileData: base64Data,
        mimeType: file.type || 'image/jpeg'
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    currentMeterEvidence = data;

    // UI state: Success
    if (meterDropzoneProcessing) meterDropzoneProcessing.style.display = 'none';
    if (meterDropzoneSuccess) meterDropzoneSuccess.style.display = 'flex';
    if (meterSuccessFilename) meterSuccessFilename.textContent = file.name;
    if (meterSuccessSummary) meterSuccessSummary.textContent = `Meter reading extracted: ${data.readingValue} ${data.unit || 'kWh'} (${data.meterType || 'Physical meter'}). Please verify these values against your document.`;

    // Render Evidence Card
    if (meterEvidenceContainer) meterEvidenceContainer.style.display = 'block';
    if (meterTypeBadge) meterTypeBadge.textContent = data.meterType || 'Digital LCD';
    if (meterReadingVal) meterReadingVal.textContent = `${data.readingValue} ${data.unit || 'kWh'}`;
    if (meterSerialVal) meterSerialVal.textContent = data.serialNumber || 'Not detected on photo';
    if (meterNotesText) meterNotesText.textContent = data.notes || 'Meter reading attached as supporting evidence.';

    // Meter photo upload confirms supplier billed on estimates
    setToggleValue(groupEstimated, inputEstimated, true);
    validateAndRecalculate();

  } catch (err) {
    console.error('Meter OCR error:', err);
    resetMeterDropzone();
    validationErrorBanner.classList.add('visible');
    validationErrorMsg.textContent = 'Could not read this file. Please enter the values manually.';
  }
}

function setupMeterDropzone() {
  if (!meterDropzone || !meterFileInput) return;

  meterDropzone.addEventListener('click', (e) => {
    if (e.target === btnClearMeter || (btnClearMeter && btnClearMeter.contains(e.target))) return;
    meterFileInput.click();
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    meterDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      meterDropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    meterDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      meterDropzone.classList.remove('drag-over');
    });
  });

  meterDropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processMeterFile(files[0]);
    }
  });

  meterFileInput.addEventListener('change', () => {
    if (meterFileInput.files && meterFileInput.files.length > 0) {
      processMeterFile(meterFileInput.files[0]);
    }
  });

  if (btnClearMeter) {
    btnClearMeter.addEventListener('click', (e) => {
      e.stopPropagation();
      resetMeterDropzone();
    });
  }
}

function setupUploadTabs() {
  if (!tabBtnBill || !tabBtnMeter) return;

  tabBtnBill.addEventListener('click', () => {
    tabBtnBill.classList.add('active');
    tabBtnBill.setAttribute('aria-selected', 'true');
    tabBtnMeter.classList.remove('active');
    tabBtnMeter.setAttribute('aria-selected', 'false');
    if (paneBillUpload) paneBillUpload.style.display = 'block';
    if (paneMeterUpload) paneMeterUpload.style.display = 'none';
  });

  tabBtnMeter.addEventListener('click', () => {
    tabBtnMeter.classList.add('active');
    tabBtnMeter.setAttribute('aria-selected', 'true');
    tabBtnBill.classList.remove('active');
    tabBtnBill.setAttribute('aria-selected', 'false');
    if (paneMeterUpload) paneMeterUpload.style.display = 'block';
    if (paneBillUpload) paneBillUpload.style.display = 'none';
  });
}

// Preset RadioGroup Arrow Key Navigation
function setupPresetKeyboardNav() {
  const presetButtons = Array.from(document.querySelectorAll('.preset-btn'));
  presetButtons.forEach((btn, index) => {
    btn.addEventListener('keydown', (e) => {
      let targetIndex = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        targetIndex = (index + 1) % presetButtons.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        targetIndex = (index - 1 + presetButtons.length) % presetButtons.length;
      }
      if (targetIndex >= 0) {
        e.preventDefault();
        const targetBtn = presetButtons[targetIndex];
        targetBtn.focus();
        targetBtn.click();
      }
    });
  });
}

// Theme Switcher & Persistence
function updateThemeIcon(theme) {
  if (!btnThemeToggle) return;
  if (theme === 'dark') {
    btnThemeToggle.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    `;
    btnThemeToggle.setAttribute('title', 'Switch to Light Theme');
  } else {
    btnThemeToggle.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    `;
    btnThemeToggle.setAttribute('title', 'Switch to Dark Theme');
  }
}

function setupTheme() {
  if (!btnThemeToggle) return;
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  updateThemeIcon(current);

  btnThemeToggle.addEventListener('click', () => {
    const active = document.documentElement.getAttribute('data-theme') || 'light';
    const next = active === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('billright-theme', next);
    } catch (_) {}
    updateThemeIcon(next);
    showToast(`Switched to ${next} theme`, 'info', 1800);
  });
}

// Notice Banner Dismissal Persistence
function setupNoticeDismissal() {
  if (disclaimerBanner) {
    try {
      if (localStorage.getItem('billright-notice-dismissed') === 'true') {
        disclaimerBanner.classList.add('dismissed');
      }
    } catch (_) {}
  }

  if (btnDismissNotice && disclaimerBanner) {
    btnDismissNotice.addEventListener('click', () => {
      disclaimerBanner.classList.add('dismissed');
      try {
        localStorage.setItem('billright-notice-dismissed', 'true');
      } catch (_) {}
    });
  }
}

// Print Dispute Packet (draft)
function setupPrintDossier() {
  if (!btnPrintDossier) return;
  btnPrintDossier.addEventListener('click', () => {
    if (!currentAnalysisResult || !currentAnalysisResult.disputeLetter) {
      showToast('Please run an audit before printing the dispute packet.', 'warning');
      return;
    }
    showToast('Preparing dispute packet (draft) for print...', 'info', 1800);
    setTimeout(() => {
      window.print();
    }, 200);
  });
}

// Reset Audit Action
function setupResetAll() {
  const btnResetAll = document.getElementById('btn-reset-all');
  if (!btnResetAll) return;
  btnResetAll.addEventListener('click', () => {
    loadPreset('A');
    showToast('Audit reset to standard baseline (Preset A).', 'info', 2200);
  });
}

// Dedicated Statutory Rules Modal
function setupRulesModal() {
  const rulesModal = document.getElementById('rules-modal');
  const btnOpenHeader = document.getElementById('btn-open-rules-modal');
  const btnOpenFooter = document.getElementById('btn-footer-rules-modal');
  const btnClose = document.getElementById('btn-close-rules-modal');

  if (!rulesModal) return;

  const openModal = () => {
    rulesModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    rulesModal.style.display = 'none';
    document.body.style.overflow = '';
  };

  if (btnOpenHeader) btnOpenHeader.addEventListener('click', openModal);
  if (btnOpenFooter) btnOpenFooter.addEventListener('click', openModal);
  if (btnClose) btnClose.addEventListener('click', closeModal);

  rulesModal.addEventListener('click', (e) => {
    if (e.target === rulesModal) closeModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && rulesModal.style.display === 'flex') {
      closeModal();
    }
  });
}

// Initialize toggles, dropzones & tabs
setupToggle(groupEstimated, inputEstimated);
setupToggle(groupObstructed, inputObstructed);
setupDropzone();
setupMeterDropzone();
setupUploadTabs();
setupPresetKeyboardNav();
setupTheme();
setupNoticeDismissal();
setupPrintDossier();
setupResetAll();
setupRulesModal();

// Synchronize timeline escalation dates with local date immediately on load
updateEscalationDates();

// Initial bootstrap with Preset A loaded for instant demo readiness
loadPreset('A');

