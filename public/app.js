/**
 * BillRight — Frontend Application Logic
 * End-to-end integration: Presets, table management, live API analysis,
 * verdict rendering, itemized calculation tables, and copyable letters.
 */

import { renderTimeline } from './timeline.js';
import { downloadCalendarEvent } from './calendarHelper.js';

// Preset definitions conforming to PRD specification and multi-jurisdiction rules
const PRESETS = {
  A: {
    name: 'UK Preset A (Exceeds 12 Months)',
    country: 'United Kingdom',
    billDate: '2026-10-01',
    consumerName: 'Sarah Jenkins',
    supplierName: 'British Gas',
    accountNumber: 'BG-8849201',
    supplyAddress: '14 Windsor Gardens, Bristol, BS8 4UQ',
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
    consumerName: 'James Wood',
    supplierName: 'Octopus Energy',
    accountNumber: 'OCT-552109',
    supplyAddress: '22 Richmond Way, London, SW15 2RF',
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
    consumerName: 'David Miller',
    supplierName: 'Origin Energy',
    accountNumber: 'ORG-992140',
    supplyAddress: '45 St Kilda Road, Melbourne, VIC 3004',
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
    consumerName: 'Elena Rodriguez',
    supplierName: 'Pacific Gas and Electric (PG&E)',
    accountNumber: 'PGE-7740129',
    supplyAddress: '108 Mission Street, San Francisco, CA 94105',
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
    consumerName: 'Sarah Jenkins',
    supplierName: 'British Gas',
    accountNumber: 'BG-8849201',
    supplyAddress: '14 Windsor Gardens, Bristol, BS8 4UQ',
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

  if (consumerNameInput) consumerNameInput.value = 'Sarah Jenkins';
  if (supplierNameInput) supplierNameInput.value = 'British Gas';
  if (accountNumberInput) accountNumberInput.value = 'BG-8849201';
  if (supplyAddressInput) supplyAddressInput.value = '14 Windsor Gardens, Bristol, BS8 4UQ';

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
      <td>${item.startDate} &rarr; ${item.endDate}</td>
      <td class="tabular-nums">${item.totalDays} days</td>
      <td class="tabular-nums">${item.disputableDays} days</td>
      <td class="tabular-nums">${currency}${item.amount.toFixed(2)}</td>
      <td class="tabular-nums"><strong>${currency}${item.disputableAmount.toFixed(2)}</strong></td>
      <td>${statusBadge}</td>
    `;
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
    if (btnDownloadPdf) btnDownloadPdf.style.display = 'inline-flex';

    // Direct Supplier Email Launcher Button
    if (btnEmailSupplier) {
      btnEmailSupplier.style.display = 'inline-flex';
      const contact = data.supplierContact || {};
      if (contact.email) {
        btnEmailSupplier.title = `Launch pre-filled formal dispute email directly to ${contact.email}`;
        if (btnEmailSupplierText) {
          btnEmailSupplierText.textContent = `Email Dispute (${contact.email})`;
        }
      } else {
        if (btnEmailSupplierText) {
          btnEmailSupplierText.textContent = 'Email Dispute to Supplier';
        }
      }
    }

    // Statutory Escalation & Ombudsman Timeline Tracker
    if (escalationTrackerCard) {
      escalationTrackerCard.style.display = 'block';
      updateEscalationDates();
    }

  } else {
    letterContent.textContent = `[Formal Dispute Letter Not Applicable]

Reason: ${data.exceptionNotes || 'Charges are within statutory limits or meter access was obstructed. A formal back-billing dispute cannot be issued.'}`;
    btnCopyLetter.style.display = 'none';
    if (btnDownloadPdf) btnDownloadPdf.style.display = 'none';
    if (btnEmailSupplier) btnEmailSupplier.style.display = 'none';
    if (escalationTrackerCard) escalationTrackerCard.style.display = 'none';
  }

  // Cache current analysis result for PDF export & email dispatch
  currentAnalysisResult = data;

  // Reveal results
  resultsSection.classList.add('visible');
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Calculates dynamic dates for Day 1, Day 14, and Day 56 (8 Weeks).
 */
function updateEscalationDates() {
  const now = new Date();
  const day14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const day56 = new Date(now.getTime() + 56 * 24 * 60 * 60 * 1000);

  const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  if (dateStep1) dateStep1.textContent = fmt(now);
  if (dateStep2) dateStep2.textContent = fmt(day14);
  if (dateStep3) dateStep3.textContent = fmt(day56);
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
    consumerName: consumerNameInput ? consumerNameInput.value.trim() : 'Sarah Jenkins',
    supplierName: supplierNameInput ? supplierNameInput.value.trim() : 'British Gas',
    accountNumber: accountNumberInput ? accountNumberInput.value.trim() : 'BG-8849201',
    supplyAddress: supplyAddressInput ? supplyAddressInput.value.trim() : '14 Windsor Gardens, Bristol, BS8 4UQ',
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

// Direct Supplier Email Launcher (mailto: with pre-populated fields)
if (btnEmailSupplier) {
  btnEmailSupplier.addEventListener('click', () => {
    if (!currentAnalysisResult || !currentAnalysisResult.disputeLetter) {
      alert('Please analyze a bill with disputable charges first.');
      return;
    }

    const contact = currentAnalysisResult.supplierContact || {};
    const targetEmail = contact.email || 'complaints@energy-supplier.co.uk';
    const accNum = currentAnalysisResult.accountNumber || (accountNumberInput ? accountNumberInput.value.trim() : 'Reference');
    const clause = currentAnalysisResult.regulation?.clauseReference || 'Statutory Utility Code';

    const subject = `FORMAL DISPUTE: Back-billing catch-up charges (${clause}) - Account ${accNum}`;
    const noticeHeader = `[NOTICE TO COMPLAINTS TEAM: Please find our complete 3-Page Schedule of Mathematical Evidence & Legal Dossier attached as a PDF.]\n\n`;
    const fullBody = noticeHeader + currentAnalysisResult.disputeLetter;

    const mailtoUrl = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullBody)}`;
    window.location.href = mailtoUrl;
  });
}

// Add Deadlines to Calendar (.ics) button handler
if (btnAddCalendar) {
  btnAddCalendar.addEventListener('click', () => {
    if (!currentAnalysisResult) {
      alert('Please analyze a bill first.');
      return;
    }

    downloadCalendarEvent({
      supplierName: currentAnalysisResult.supplierName || (supplierNameInput ? supplierNameInput.value.trim() : 'Energy Supplier'),
      accountNumber: currentAnalysisResult.accountNumber || (accountNumberInput ? accountNumberInput.value.trim() : 'Reference'),
      disputableTotal: currentAnalysisResult.disputableTotal || 0,
      currency: currentAnalysisResult.currency || '£',
      startDate: new Date()
    });
  });
}

// Download Formal Legal Packet (.pdf) button handler
if (btnDownloadPdf) {
  btnDownloadPdf.addEventListener('click', async () => {
    if (!currentAnalysisResult) {
      alert('Please analyze a bill before downloading the legal dispute packet.');
      return;
    }

    const originalBtnText = btnDownloadPdfText ? btnDownloadPdfText.textContent : 'Download Formal Legal Packet (.pdf)';
    if (btnDownloadPdfText) btnDownloadPdfText.textContent = 'Generating PDF Packet...';
    btnDownloadPdf.disabled = true;

    try {
      const pdfPayload = {
        consumerName: consumerNameInput ? consumerNameInput.value.trim() : currentAnalysisResult.consumerName || 'Sarah Jenkins',
        supplierName: supplierNameInput ? supplierNameInput.value.trim() : currentAnalysisResult.supplierName || 'British Gas',
        accountNumber: accountNumberInput ? accountNumberInput.value.trim() : currentAnalysisResult.accountNumber || 'BG-8849201',
        supplyAddress: supplyAddressInput ? supplyAddressInput.value.trim() : currentAnalysisResult.supplyAddress || '14 Windsor Gardens, Bristol, BS8 4UQ',
        country: countrySelect.value,
        billDate: currentAnalysisResult.billDate || billDateInput.value,
        cutOffDate: currentAnalysisResult.cutOffDate,
        lookbackMonths: currentAnalysisResult.lookbackMonths,
        currency: currentAnalysisResult.currency,
        disputableTotal: currentAnalysisResult.disputableTotal,
        totalBilled: currentAnalysisResult.totalBilled,
        itemizedBreakdown: currentAnalysisResult.itemizedBreakdown,
        regulation: currentAnalysisResult.regulation,
        isEstimated: inputEstimated.value === 'true',
        isMeterObstructed: inputObstructed.value === 'true',
        disputeLetter: currentAnalysisResult.disputeLetter,
        meterEvidence: currentMeterEvidence
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
      downloadLink.download = `BillRight_Legal_Dispute_Packet_${safeRef}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.URL.revokeObjectURL(blobUrl);

    } catch (err) {
      console.error('PDF generation error:', err);
      alert(`Could not generate PDF packet: ${err.message}`);
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

    // Populate form with extracted data
    if (data.billDate) {
      billDateInput.value = data.billDate;
    }

    if (data.supplierName && supplierNameInput) {
      supplierNameInput.value = data.supplierName;
    }

    if (data.accountNumber && accountNumberInput) {
      accountNumberInput.value = data.accountNumber;
    }

    if (typeof data.isEstimated === 'boolean') {
      setToggleValue(groupEstimated, inputEstimated, data.isEstimated);
    }

    // Auto-select jurisdiction if currency gives a clear cue
    if (data.currency === 'A$' || (data.notes && data.notes.includes('Australia'))) {
      countrySelect.value = 'Australia';
    } else if (data.currency === '$' && countrySelect.value === 'United Kingdom') {
      countrySelect.value = 'United States (California)';
    }

    // Update header currency
    const symbol = getCurrencySymbol(countrySelect.value);
    const header = document.getElementById('currency-symbol-header');
    if (header) header.textContent = symbol;

    // Populate billing periods table
    periodsTbody.innerHTML = '';
    if (Array.isArray(data.billingPeriods) && data.billingPeriods.length > 0) {
      data.billingPeriods.forEach(p => addRow(p));
    } else {
      addRow();
    }

    validateAndRecalculate();
    resultsSection.classList.remove('visible');

    // UI state: Success
    dropzoneProcessing.style.display = 'none';
    dropzoneSuccess.style.display = 'flex';
    successFilename.textContent = file.name;
    successSummary.textContent = `Extracted ${data.billingPeriods.length} billing periods from ${data.supplierName || 'statement'}. Review details below and click 'Analyze Bill'.`;

  } catch (err) {
    console.error('Extraction error:', err);
    resetDropzone();
    validationErrorBanner.classList.add('visible');
    validationErrorMsg.textContent = `Document extraction failed: ${err.message}`;
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
  if (meterProcessingFilename) meterProcessingFilename.textContent = `Analyzing ${file.name} with Gemini Vision...`;

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
    if (meterSuccessSummary) meterSuccessSummary.textContent = `Verified ${data.readingValue} ${data.unit || 'kWh'} (${data.meterType || 'Physical meter'}).`;

    // Render Evidence Card
    if (meterEvidenceContainer) meterEvidenceContainer.style.display = 'block';
    if (meterTypeBadge) meterTypeBadge.textContent = data.meterType || 'Digital LCD';
    if (meterReadingVal) meterReadingVal.textContent = `${data.readingValue} ${data.unit || 'kWh'}`;
    if (meterSerialVal) meterSerialVal.textContent = data.serialNumber || 'Verified on Photo';
    if (meterNotesText) meterNotesText.textContent = data.notes || 'Physical reading confirms actual discrepancy against supplier estimates.';

    // Meter photo upload confirms supplier billed on estimates
    setToggleValue(groupEstimated, inputEstimated, true);
    validateAndRecalculate();

  } catch (err) {
    console.error('Meter OCR error:', err);
    resetMeterDropzone();
    validationErrorBanner.classList.add('visible');
    validationErrorMsg.textContent = `Meter OCR failed: ${err.message}`;
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
    tabBtnMeter.classList.remove('active');
    if (paneBillUpload) paneBillUpload.style.display = 'block';
    if (paneMeterUpload) paneMeterUpload.style.display = 'none';
  });

  tabBtnMeter.addEventListener('click', () => {
    tabBtnMeter.classList.add('active');
    tabBtnBill.classList.remove('active');
    if (paneMeterUpload) paneMeterUpload.style.display = 'block';
    if (paneBillUpload) paneBillUpload.style.display = 'none';
  });
}

// Initialize toggles, dropzones & tabs
setupToggle(groupEstimated, inputEstimated);
setupToggle(groupObstructed, inputObstructed);
setupDropzone();
setupMeterDropzone();
setupUploadTabs();

// Initial bootstrap with Preset A loaded for instant demo readiness
loadPreset('A');
