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
// Australia (NERR Rule 30): 9 months lookback
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
console.log('✔ Australia (NERR 9-month) calculations verified.');

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

// Test 9: Timezone and Local Escalation Date Calculations
import { calculateEscalationDates } from './calculateBackBilling.js';
const oct14Test = calculateEscalationDates('2026-10-14');
assert.equal(oct14Test.isoDate, '2026-10-14', 'Local ISO date must match input exactly');
assert.equal(oct14Test.day1Formatted, '14 October 2026', 'Day 1 Today must show 14 October, never shifted to 13 October');
assert.equal(oct14Test.day14Formatted, '28 October 2026', 'Day 14 must be exactly 14 calendar days later');
assert.equal(oct14Test.day56Formatted, '9 December 2026', 'Day 56 must be exactly 56 calendar days (8 weeks) later');

// Timezone edge: Leap year February
const leapFeb = calculateEscalationDates('2024-02-20');
assert.equal(leapFeb.day14Formatted, '5 March 2024', 'Leap year Feb 20 + 14 days should cross Feb 29 into 5 March');

// Timezone edge: Year-end boundary
const yearEnd = calculateEscalationDates('2025-12-25');
assert.equal(yearEnd.day14Formatted, '8 January 2026', 'Dec 25 + 14 days crosses into January of next year');
console.log('✔ Timezone edge and escalation date calculations verified.');

// Test 10: Exception Toggles (Obstruction and Estimates)
import { evaluateExceptionsAndFormatLetter } from './llmClient.js';
const dummyReg = {
  jurisdiction: 'United Kingdom',
  title: 'SLC 21BA Back-billing Protection',
  clauseReference: 'Standard Licence Condition 21BA',
  lookbackMonths: 12
};

const obstructedCase = await evaluateExceptionsAndFormatLetter({
  isMeterObstructed: true,
  isEstimated: true,
  disputableTotal: 1000.00,
  totalBilled: 1400.00,
  billDate: '2026-10-01',
  cutOffDate: '2025-10-01',
  regulation: dummyReg,
  currency: '£',
  lookbackMonths: 12,
  consumerName: 'Test Consumer',
  supplierName: 'Test Energy',
  accountNumber: 'ACC-12345',
  supplyAddress: '1 Test Street',
  noticeDate: '2026-10-15',
  country: 'United Kingdom'
});

assert.equal(obstructedCase.exceptionTriggered, true, 'Obstruction must trigger exception');
assert.ok(obstructedCase.exceptionNotes.includes('Protection may not apply if the supplier shows you unreasonably prevented access'), 'Must include new exact obstruction caveat');
assert.ok(!obstructedCase.disputeLetter.includes('IMPORTANT NOTICE REGARDING METER ACCESS'), 'Dispute letter must NOT include meter access notice or caution to supplier');
assert.ok(!obstructedCase.disputeLetter.includes('While meter obstruction was indicated'), 'Must not admit meter obstruction in supplier letter');
assert.ok(!obstructedCase.disputeLetter.includes('CAUTION: Meter access obstruction was indicated'), 'Must not include caution paragraph in supplier letter');
assert.ok(!obstructedCase.disputeLetter.includes('I confirm that I have not acted obstructively'), 'Must not claim I have never obstructed access when obstructed');
assert.ok(obstructedCase.disputeLetter.includes('Previous statements were rendered on estimated rather than actual meter readings.'), 'Must reflect estimated bills');

console.log('✔ Obstruction and estimate toggles impact verified (supplier-facing letter does not admit obstruction).');

// Test 11: Overlapping billing periods detection
assert.throws(() => {
  calculateBackBilling({
    billDate: '2026-10-01',
    billingPeriods: [
      { startDate: '2025-01-01', endDate: '2025-06-30', amount: 500 },
      { startDate: '2025-05-01', endDate: '2025-09-30', amount: 400 }
    ]
  });
}, /Billing periods overlap\. Please check the dates\./, 'Should throw "Billing periods overlap. Please check the dates."');
console.log('✔ Overlapping billing periods validation verified.');

// Test 12: Texas retail electric provider text under §25.480(e) does not assert a number
const txCase = await evaluateExceptionsAndFormatLetter({
  isMeterObstructed: false,
  isEstimated: false,
  disputableTotal: 600.00,
  totalBilled: 1200.00,
  billDate: '2026-10-01',
  cutOffDate: '2026-04-01',
  regulation: {
    jurisdiction: 'United States (Texas)',
    title: 'PUCT §25.28(d) / §25.480(e)',
    clauseReference: 'PUCT §25.28(d) / §25.480(e)',
    summary: 'For electric utilities under PUCT §25.28(d), underbilling adjustments are limited to 6 months. For REPs, limit under §25.480(e) must be verified with PUCT.'
  },
  currency: '$',
  lookbackMonths: 6,
  consumerName: 'TX Consumer',
  supplierName: 'TX Retail Electric',
  accountNumber: 'TX-9988',
  supplyAddress: '100 Austin Blvd, Austin, TX',
  noticeDate: '2026-10-15',
  country: 'United States (Texas)'
});

assert.ok(txCase.disputeLetter.includes('limit under §25.480(e) must be verified with the PUCT'), 'Texas letter must state limit under §25.480(e) must be verified with the PUCT');
assert.ok(!txCase.disputeLetter.includes('retail electric providers under §25.480(e), a 6-month limit applies'), 'Must not assert a 6-month number for REPs');
console.log('✔ Texas retail electric provider §25.480(e) verification text verified.');

// Test 13: Tavily fallback with missing/failing key provides built-in citations (liveSearch: false) and produces letter
import { getBuiltInCitation } from './tavilyClient.js';
const builtInUK = getBuiltInCitation('United Kingdom');
assert.equal(builtInUK.builtIn, true);
assert.equal(builtInUK.liveSearch, false);
assert.equal(builtInUK.fallbackNotice, 'Live search unavailable. Showing built-in statutory reference. Please verify with the regulator.');

const fallbackCase = await evaluateExceptionsAndFormatLetter({
  isMeterObstructed: false,
  isEstimated: false,
  disputableTotal: 500.00,
  totalBilled: 800.00,
  billDate: '2026-10-01',
  cutOffDate: '2025-10-01',
  regulation: builtInUK,
  currency: '£',
  lookbackMonths: 12,
  consumerName: 'Jane Example',
  supplierName: 'Example Energy Ltd',
  accountNumber: 'EX-8849201',
  supplyAddress: '1 Example Street, Exampletown, EX1 1AA',
  noticeDate: '2026-10-15',
  country: 'United Kingdom'
});

assert.equal(fallbackCase.badgeType, 'consumer_protected');
assert.ok(fallbackCase.disputeLetter !== null, 'Letter must be produced when liveSearch is false');
console.log('✔ Tavily fallback and built-in citation letter generation verified.');

// Test 14: Letter Grammar Across All 4 Toggle Combinations
const toggleCases = [
  { isEstimated: false, isMeterObstructed: false },
  { isEstimated: true, isMeterObstructed: false },
  { isEstimated: false, isMeterObstructed: true },
  { isEstimated: true, isMeterObstructed: true }
];

for (const tCase of toggleCases) {
  const result = await evaluateExceptionsAndFormatLetter({
    ...tCase,
    disputableTotal: 750.00,
    totalBilled: 1200.00,
    billDate: '2026-10-01',
    cutOffDate: '2025-10-01',
    regulation: dummyReg,
    currency: '£',
    lookbackMonths: 12,
    consumerName: 'Jane Example',
    supplierName: 'Example Energy Ltd',
    accountNumber: 'EX-8849201',
    supplyAddress: '1 Example Street, Exampletown, EX1 1AA',
    noticeDate: '2026-10-15',
    country: 'United Kingdom'
  });

  const letter = result.disputeLetter;
  assert.ok(!letter.includes('.,'), `Letter must not contain broken punctuation ".," (case: est=${tCase.isEstimated}, obs=${tCase.isMeterObstructed})`);
  assert.ok(!letter.includes('..'), `Letter must not contain double periods ".." (case: est=${tCase.isEstimated}, obs=${tCase.isMeterObstructed})`);

  if (tCase.isMeterObstructed) {
    assert.ok(!letter.includes('I confirm that I have not acted obstructively'), 'Obstructed case must NOT claim non-obstruction');
    assert.ok(!letter.includes('While meter obstruction was indicated'), 'Obstructed case must NOT admit obstruction to supplier');
    assert.ok(!letter.includes('CAUTION: Meter access obstruction'), 'Obstructed case must NOT include caution notes in letter');
  } else {
    assert.ok(letter.includes('I confirm that I have not acted obstructively'), 'Non-obstructed case confirms no obstruction');
  }

  if (tCase.isEstimated) {
    assert.ok(letter.includes('estimated rather than actual'), 'Estimated case must mention estimated readings');
  }
}
console.log('✔ Grammar and syntax verified across all 4 toggle combinations (no ".," or "..").');

// Test 15: Australia State Ombudsman Routing & NERR Rule 30 Specific Wording
import { getOmbudsmanByCountry } from './supplierDirectory.js';

assert.equal(getOmbudsmanByCountry('Australia', 'NSW'), 'Energy and Water Ombudsman NSW (EWON)');
assert.equal(getOmbudsmanByCountry('Australia', 'QLD'), 'Energy and Water Ombudsman Queensland (EWOQ)');
assert.equal(getOmbudsmanByCountry('Australia', 'SA'), 'Energy and Water Ombudsman SA (EWOSA)');

// Verify no "e.g." in ombudsman names
['NSW', 'QLD', 'SA'].forEach(st => {
  const omb = getOmbudsmanByCountry('Australia', st);
  assert.ok(!omb.includes('e.g.'), `AU state ${st} ombudsman must not contain "e.g."`);
});

const auReg = getBuiltInCitation('Australia');
const auLetterResult = await evaluateExceptionsAndFormatLetter({
  isEstimated: true,
  isMeterObstructed: false,
  disputableTotal: 900.00,
  totalBilled: 1800.00,
  billDate: '2026-10-01',
  cutOffDate: '2026-01-01',
  regulation: auReg,
  currency: 'A$',
  lookbackMonths: 9,
  consumerName: 'Jane Example',
  supplierName: 'Example Energy Pty Ltd',
  accountNumber: 'EX-AU-992140',
  supplyAddress: '1 Example Street, Exampletown, EX1 1AA',
  noticeDate: '2026-10-15',
  country: 'Australia',
  state: 'NSW'
});

const auLetter = auLetterResult.disputeLetter;
assert.ok(auLetter.includes('Under NERR Rule 30, charges more than 9 months before the date the customer was notified of the undercharge cannot be recovered unless the customer was at fault.'), 'AU letter must use exact NERR Rule 30 wording');
assert.ok(!auLetter.includes('where the consumer has not previously received an accurate bill'), 'AU letter must omit the UK-specific phrase');
assert.ok(auLetter.includes('Energy and Water Ombudsman NSW (EWON)'), 'AU NSW letter must escalate to EWON');
// Verify no duplicate "(NERR Rule 30)" label at the end of the letter
const countNERRInEscalation = (auLetter.match(/EWON.*NERR/i) || []).length;
assert.equal(countNERRInEscalation, 0, 'AU letter must not duplicate "(NERR Rule 30)" label in escalation sentence');
console.log('✔ Australia state ombudsman mapping and NERR Rule 30 wording verified.');

// Test 16: No Generic Placeholder Citation Snippet
const ukCitation = getBuiltInCitation('United Kingdom');
assert.ok(!ukCitation.summary.includes('Suppliers must not bill consumers for unbilled energy used beyond the statutory lookback window'), 'Must not contain generic placeholder snippet');
assert.ok(!ukCitation.summary.endsWith('...'), 'Summary must not end with trailing "..."');

console.log('✔ Absence of placeholder citation snippets verified.');

console.log('✔ All validation assertions passed.');
console.log('All mathematical engine tests passed successfully!');

