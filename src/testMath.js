import assert from 'node:assert/strict';
import { getCutOffDate, getDaysBetween, calculateBackBilling } from './calculateBackBilling.js';

console.log('Testing back-billing calculation engine...');

// Test 1: getCutOffDate
assert.equal(getCutOffDate('2026-10-01'), '2025-10-01', 'Cut-off for Oct 1 2026 should be Oct 1 2025');
assert.equal(getCutOffDate('2024-02-29'), '2023-02-28', 'Leap year Feb 29 rolls back to Feb 28');
assert.equal(getCutOffDate('2025-05-15'), '2024-05-15', 'May 15 rolls back to May 15');
console.log('✔ Cut-off date calculations verified.');

// Test 2: getDaysBetween
assert.equal(getDaysBetween('2025-01-01', '2025-01-01'), 1, 'Single day should count as 1');
assert.equal(getDaysBetween('2025-01-01', '2025-01-31'), 31, 'January has 31 days');
assert.equal(getDaysBetween('2025-01-01', '2025-12-31'), 365, 'Non-leap year has 365 days');
console.log('✔ Day counting calculations verified.');

// Test 3: Fully before cut-off
const fullyPrior = calculateBackBilling({
  billDate: '2026-10-01',
  billingPeriods: [
    { startDate: '2024-01-01', endDate: '2024-12-31', amount: 800.00 }
  ]
});
assert.equal(fullyPrior.cutOffDate, '2025-10-01');
assert.equal(fullyPrior.disputableTotal, 800.00);
assert.equal(fullyPrior.itemizedBreakdown[0].status, 'fully_before_cutoff');
console.log('✔ Fully prior period verified.');

// Test 4: Fully within allowed window
const fullyWithin = calculateBackBilling({
  billDate: '2026-10-01',
  billingPeriods: [
    { startDate: '2025-10-01', endDate: '2026-09-30', amount: 650.00 }
  ]
});
assert.equal(fullyWithin.disputableTotal, 0.00);
assert.equal(fullyWithin.itemizedBreakdown[0].status, 'within_allowed_window');
console.log('✔ Fully within allowed window verified.');

// Test 5: Straddling period (daily pro-rata)
// Period: 2025-09-01 to 2025-10-31 (61 days). Cut-off is 2025-10-01.
// Days before cut-off: 2025-09-01 to 2025-10-01 = 30 days (all of September).
// Amount: 610.00 -> Disputable should be (30 / 61) * 610 = 300.00
const straddling = calculateBackBilling({
  billDate: '2026-10-01',
  billingPeriods: [
    { startDate: '2025-09-01', endDate: '2025-10-31', amount: 610.00 }
  ]
});
assert.equal(straddling.itemizedBreakdown[0].totalDays, 61);
assert.equal(straddling.itemizedBreakdown[0].disputableDays, 30);
assert.equal(straddling.itemizedBreakdown[0].disputableAmount, 300.00);
assert.equal(straddling.disputableTotal, 300.00);
assert.equal(straddling.itemizedBreakdown[0].status, 'straddles_cutoff');
console.log('✔ Straddling daily pro-rata apportionment verified.');

// Test 6: Multi-period composite (Preset A scenario)
const presetA = calculateBackBilling({
  billDate: '2026-10-01',
  billingPeriods: [
    { startDate: '2024-10-01', endDate: '2025-09-30', amount: 1000.00 }, // 100% prior
    { startDate: '2025-10-01', endDate: '2026-09-30', amount: 400.00 }   // 100% within
  ]
});
assert.equal(presetA.totalBilled, 1400.00);
assert.equal(presetA.disputableTotal, 1000.00);
assert.equal(presetA.itemizedBreakdown[0].status, 'fully_before_cutoff');
assert.equal(presetA.itemizedBreakdown[1].status, 'within_allowed_window');
console.log('✔ Multi-period composite verified.');

// Test 7: Validation errors
assert.throws(() => {
  calculateBackBilling({
    billDate: '2026-10-01',
    billingPeriods: [{ startDate: '2025-10-01', endDate: '2025-09-01', amount: 100 }]
  });
}, /End date cannot precede start date/, 'Should throw on reversed dates');

assert.throws(() => {
  calculateBackBilling({
    billDate: '2026-10-01',
    billingPeriods: [{ startDate: '2025-01-01', endDate: '2025-02-01', amount: -50 }]
  });
}, /Amount must be a positive number/, 'Should throw on negative amounts');

// Test 8: Multi-jurisdiction lookback calculations
// Australia (AER Rule 30): 9 months lookback
assert.equal(getCutOffDate('2026-10-01', 9), '2026-01-01', 'AU 9-month cut-off from Oct 1 2026 should be Jan 1 2026');
const auCase = calculateBackBilling({
  billDate: '2026-10-01',
  billingPeriods: [
    { startDate: '2025-04-01', endDate: '2025-12-31', amount: 900.00 }, // before 2026-01-01 -> 100% disputable
    { startDate: '2026-01-01', endDate: '2026-09-30', amount: 900.00 }  // within window -> 0% disputable
  ],
  lookbackMonths: 9,
  currency: 'A$'
});
assert.equal(auCase.cutOffDate, '2026-01-01');
assert.equal(auCase.disputableTotal, 900.00);
assert.equal(auCase.currency, 'A$');
assert.equal(auCase.itemizedBreakdown[0].status, 'fully_before_cutoff');
assert.equal(auCase.itemizedBreakdown[1].status, 'within_allowed_window');
console.log('✔ Australia (AER 9-month) calculations verified.');

// US - California (CPUC Rule 17.1): 3 months lookback
assert.equal(getCutOffDate('2026-10-01', 3), '2026-07-01', 'US CA 3-month cut-off from Oct 1 2026 should be Jul 1 2026');
const usCaCase = calculateBackBilling({
  billDate: '2026-10-01',
  billingPeriods: [
    { startDate: '2026-01-01', endDate: '2026-06-30', amount: 600.00 }, // before 2026-07-01 -> 100% disputable
    { startDate: '2026-07-01', endDate: '2026-09-30', amount: 300.00 }  // within window -> 0% disputable
  ],
  lookbackMonths: 3,
  currency: '$'
});
assert.equal(usCaCase.cutOffDate, '2026-07-01');
assert.equal(usCaCase.disputableTotal, 600.00);
assert.equal(usCaCase.currency, '$');
console.log('✔ US California (CPUC 3-month) calculations verified.');

console.log('✔ All validation assertions passed.');
console.log('All mathematical engine tests passed successfully!');

