/**
 * Pure deterministic back-billing calculation engine.
 * Calculates lookback cut-off dates and daily pro-rata apportionment.
 * Independent of external APIs or AI models.
 */

/**
 * Calculates the 12-month lookback cut-off date.
 * Exactly 12 calendar months before the bill date.
 * @param {string} billDateStr - YYYY-MM-DD
 * @returns {string} - YYYY-MM-DD
 */
export function getCutOffDate(billDateStr) {
  const parts = billDateStr.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid bill date format: ${billDateStr}`);
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  // 12 months prior: year - 1, keeping day and month
  // Handles leap year edge cases (e.g. Feb 29 -> Feb 28)
  const prevYear = year - 1;
  const daysInMonth = new Date(Date.UTC(prevYear, month, 0)).getUTCDate();
  const adjustedDay = Math.min(day, daysInMonth);

  const mm = String(month).padStart(2, '0');
  const dd = String(adjustedDay).padStart(2, '0');
  return `${prevYear}-${mm}-${dd}`;
}

/**
 * Calculates the inclusive number of calendar days between two dates.
 * @param {string} startStr - YYYY-MM-DD
 * @param {string} endStr - YYYY-MM-DD
 * @returns {number}
 */
export function getDaysBetween(startStr, endStr) {
  const start = new Date(startStr + 'T00:00:00Z');
  const end = new Date(endStr + 'T00:00:00Z');
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Analyzes billing periods against the 12-month back-billing cut-off date.
 * 
 * @param {Object} params
 * @param {string} params.billDate - YYYY-MM-DD
 * @param {Array<{ startDate: string, endDate: string, amount: number }>} params.billingPeriods
 * @returns {Object} itemized breakdown and totals
 */
export function calculateBackBilling({ billDate, billingPeriods }) {
  if (!billDate) {
    throw new Error('billDate is required');
  }
  if (!Array.isArray(billingPeriods) || billingPeriods.length === 0) {
    throw new Error('billingPeriods must be a non-empty array');
  }

  const cutOffDate = getCutOffDate(billDate);
  let totalBilled = 0;
  let disputableTotal = 0;

  const itemizedBreakdown = billingPeriods.map((period, index) => {
    const { startDate, endDate, amount } = period;
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error(`Row ${index + 1}: Amount must be a positive number`);
    }
    if (!startDate || !endDate) {
      throw new Error(`Row ${index + 1}: Start and end dates are required`);
    }
    if (endDate < startDate) {
      throw new Error(`Row ${index + 1}: End date cannot precede start date`);
    }

    totalBilled += numAmount;
    const totalDays = getDaysBetween(startDate, endDate);

    let disputableDays = 0;
    let disputableAmount = 0.00;
    let status = 'within_allowed_window';

    // Case 1: Entirely before cut-off date
    if (endDate < cutOffDate) {
      disputableDays = totalDays;
      disputableAmount = Math.round(numAmount * 100) / 100;
      status = 'fully_before_cutoff';
    }
    // Case 2: Straddling cut-off date (starts before, ends on or after)
    else if (startDate < cutOffDate && endDate >= cutOffDate) {
      // Days before cut-off date (startDate to day before cutOffDate inclusive)
      // Difference in days between startDate and cutOffDate
      const startMs = new Date(startDate + 'T00:00:00Z').getTime();
      const cutOffMs = new Date(cutOffDate + 'T00:00:00Z').getTime();
      disputableDays = Math.round((cutOffMs - startMs) / (1000 * 60 * 60 * 24));
      
      const proRataRatio = disputableDays / totalDays;
      disputableAmount = Math.round((proRataRatio * numAmount) * 100) / 100;
      status = 'straddles_cutoff';
    }
    // Case 3: Entirely on or after cut-off date
    else {
      disputableDays = 0;
      disputableAmount = 0.00;
      status = 'within_allowed_window';
    }

    disputableTotal += disputableAmount;

    return {
      startDate,
      endDate,
      amount: Math.round(numAmount * 100) / 100,
      totalDays,
      disputableDays,
      disputableAmount,
      status
    };
  });

  totalBilled = Math.round(totalBilled * 100) / 100;
  disputableTotal = Math.round(disputableTotal * 100) / 100;

  return {
    billDate,
    cutOffDate,
    totalBilled,
    disputableTotal,
    itemizedBreakdown
  };
}
