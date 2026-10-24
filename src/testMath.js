import assert from 'node:assert/strict';
import zlib from 'zlib';
import { getCutOffDate, getDaysBetween, calculateBackBilling } from './calculateBackBilling.js';
import { sanitizeDisputeLetter } from './letterSanitizer.js';
import { generateLegalPacketPdf } from './pdfGenerator.js';
import {
  isVisionModel,
  getModelList,
  isQuotaOrTimeoutError,
  isRetryableModelError,
  executeWithModelFallback,
  DEFAULT_PRIMARY_MODEL,
  DEFAULT_FALLBACK_MODELS
} from './geminiFallback.js';
import { extractBillData } from './billExtractor.js';
import { extractMeterReading } from './meterExtractor.js';
import { evaluateExceptionsAndFormatLetter } from './llmClient.js';

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
  consumerName: 'Jane Example',
  supplierName: 'Example Energy Ltd',
  accountNumber: 'EX-12345',
  supplyAddress: '1 Example Street, Exampletown, EX1 1AA',
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
  consumerName: 'Jane Example',
  supplierName: 'Example Utility Co',
  accountNumber: 'EX-US-9988',
  supplyAddress: '100 Example Blvd, Austin, TX 78701',
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

// Test 16: No Generic Placeholder Citation Snippet & Correct UK Rule Wording
const ukCitation = getBuiltInCitation('United Kingdom');
assert.ok(!ukCitation.summary.includes('Suppliers must not bill consumers for unbilled energy used beyond the statutory lookback window'), 'Must not contain generic placeholder snippet');
assert.ok(!ukCitation.summary.endsWith('...'), 'Summary must not end with trailing "..."');
assert.ok(ukCitation.summary.includes("where the delay or error was the supplier's responsibility"), 'UK citation summary must state where the delay or error was the supplier\'s responsibility');
assert.ok(!ukCitation.summary.includes('where the customer has not been previously billed'), 'UK citation summary must not contain where the customer has not been previously billed');

// Test 17: Official-source allowlist & title mismatch filters
import {
  OFFICIAL_DOMAIN_ALLOWLIST,
  isAllowedOfficialHost,
  isMismatchedDocumentTitle,
  filterRegulatoryResults
} from './tavilyClient.js';

// 17a: amazonaws.com and cloud-storage hosts rejected
assert.equal(isAllowedOfficialHost('https://s3.amazonaws.com/regulatory-docs/rule30.pdf'), false, 's3.amazonaws.com must be rejected');
assert.equal(isAllowedOfficialHost('https://my-bucket.s3.us-west-2.amazonaws.com/doc.pdf'), false, 'subdomain.s3.amazonaws.com must be rejected');
assert.equal(isAllowedOfficialHost('https://amazonaws.com/file'), false, 'amazonaws.com root must be rejected');
assert.equal(isAllowedOfficialHost('https://untrusted-utility-blog.com/rules'), false, 'Non-allowlisted domain must be rejected');

// 17b: Official allowed hosts accepted
assert.equal(isAllowedOfficialHost('https://www.ofgem.gov.uk/energy-policy-and-regulation'), true, 'ofgem.gov.uk must be allowed');
assert.equal(isAllowedOfficialHost('https://www.aer.gov.au/consumers'), true, 'aer.gov.au must be allowed');
assert.equal(isAllowedOfficialHost('https://www.cpuc.ca.gov/consumer-support'), true, 'cpuc.ca.gov must be allowed');
assert.equal(isAllowedOfficialHost('https://www.puc.texas.gov/consumer'), true, 'puc.texas.gov must be allowed');
assert.equal(isAllowedOfficialHost('https://www.energyombudsman.org/'), true, 'energyombudsman.org must be allowed');
assert.equal(isAllowedOfficialHost('https://www.ewon.com.au/'), true, 'ewon.com.au must be allowed');

// 17c: "Version 30" rejected for NERR Rule 30
assert.equal(isMismatchedDocumentTitle('National Energy Retail Rules Version 30', 'Australia', 'NERR Rule 30'), true, '"Version 30" must be rejected for NERR Rule 30');
assert.equal(isMismatchedDocumentTitle('AEMC NERR v30 Consolidated Rules', 'Australia', 'NERR Rule 30'), true, '"v30" must be rejected for NERR Rule 30');
assert.equal(isMismatchedDocumentTitle('AER Guidance on NERR Rule 30 Undercharging', 'Australia', 'NERR Rule 30'), false, 'Valid Rule 30 title must be accepted');

// 17d: filterRegulatoryResults drops amazonaws.com and Version 30
const sampleResults = [
  { title: 'NERR Version 30 PDF', url: 'https://www.aer.gov.au/doc/v30.pdf' },
  { title: 'Rule 30 Guidance', url: 'https://s3.amazonaws.com/bucket/rule30.pdf' },
  { title: 'Unrelated Blog', url: 'https://energyblog.example.com/rule30' },
  { title: 'Billing Problems and Disputes', url: 'https://www.aer.gov.au/consumers/billing-disputes' }
];

const filtered = filterRegulatoryResults(sampleResults, 'Australia', 'NERR Rule 30');
assert.equal(filtered.length, 1, 'Only official matching result should remain');
assert.equal(filtered[0].title, 'Billing Problems and Disputes');
console.log('✔ Official-source allowlist, cloud-storage rejection, and "Version 30" filter verified.');

// Test 18: Additional source formatting in letter without LLM summary
const regWithAdditional = {
  ...auReg,
  additionalSource: {
    title: 'AER Retail Billing Guideline',
    host: 'aer.gov.au',
    url: 'https://www.aer.gov.au/consumers/billing-disputes',
    summary: 'LLM generated excerpt that must NOT appear in PDF or letter',
    note: 'Retrieved by search, not verified'
  }
};

const letterWithSource = await evaluateExceptionsAndFormatLetter({
  isEstimated: false,
  isMeterObstructed: false,
  disputableTotal: 900.00,
  totalBilled: 1800.00,
  billDate: '2026-10-01',
  cutOffDate: '2026-01-01',
  regulation: regWithAdditional,
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

assert.ok(!letterWithSource.disputeLetter.includes('Additional Reference:'), 'Supplier-facing dispute letter must NOT include Additional Reference header');
assert.ok(!letterWithSource.disputeLetter.includes('Retrieved by search, not verified'), 'Supplier-facing dispute letter must NOT include Retrieved by search disclaimer');
assert.ok(!letterWithSource.disputeLetter.includes('In accordance with published regulatory precedents'), 'Letter must not contain unverified precedents sentence');
assert.ok(letterWithSource.disputeLetter.includes('I confirm that I have not acted obstructively or prevented meter access at any time'), 'Letter must confirm non-obstruction when unobstructed');

const obstructedLetter = await evaluateExceptionsAndFormatLetter({
  isEstimated: true,
  isMeterObstructed: true,
  disputableTotal: 900.00,
  totalBilled: 1800.00,
  billDate: '2026-10-01',
  cutOffDate: '2026-01-01',
  regulation: regWithAdditional,
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
assert.ok(!obstructedLetter.disputeLetter.includes('I confirm that I have not acted obstructively'), 'Letter must NOT state non-obstruction when obstructed');
assert.ok(!obstructedLetter.disputeLetter.includes('obstruct'), 'Letter must omit obstruction entirely when obstructed');

// Verify UK dispute letter uses supplier responsibility wording
const ukLetterResult = await evaluateExceptionsAndFormatLetter({
  isEstimated: true,
  isMeterObstructed: false,
  disputableTotal: 1000.00,
  totalBilled: 1400.00,
  billDate: '2026-10-01',
  cutOffDate: '2025-10-01',
  regulation: ukCitation,
  currency: '£',
  lookbackMonths: 12,
  consumerName: 'Jane Example',
  supplierName: 'Example Energy Ltd',
  accountNumber: 'EX-552109',
  supplyAddress: '1 Example Street, Exampletown, EX1 1AA',
  noticeDate: '2026-10-15',
  country: 'United Kingdom'
});
assert.ok(ukLetterResult.disputeLetter.includes("where the delay or error was the supplier's responsibility"), 'UK letter must include delay or error was the supplier\'s responsibility');
assert.ok(!ukLetterResult.disputeLetter.includes('where the customer has not been previously billed'), 'UK letter must not include customer has not been previously billed');

// Verify markdown link syntax is completely removed and ombudsman appears as bare text www.energyombudsman.org
assert.ok(!ukLetterResult.disputeLetter.includes(']('), 'Final letter must contain no Markdown link syntax "]("');
assert.ok(!ukLetterResult.disputeLetter.includes('[www'), 'Final letter must contain no "[www" syntax');
assert.ok(ukLetterResult.disputeLetter.includes('www.energyombudsman.org'), 'Final letter must contain bare text www.energyombudsman.org');
assert.ok(!ukLetterResult.disputeLetter.includes('(www.energyombudsman.org)'), 'Final letter must contain no parentheses around www.energyombudsman.org');
assert.ok(!ukLetterResult.disputeLetter.includes('https://www.energyombudsman.org'), 'Final letter must contain no https prefix before energyombudsman');

// Verify shared sanitizeDisputeLetter function handles markdown links, double parens, and markdown artifacts
const testMarkdownInput = `FORMAL NOTICE\n\nI reserve the right to escalate to the Energy Ombudsman ([www.energyombudsman.org](https://www.energyombudsman.org)).\n\nAlso check [Ofgem guidance](https://www.ofgem.gov.uk/rules) and [www.aer.gov.au](https://www.aer.gov.au).\n\n# Heading 1\n**Bold Text** and *Italic Text* and \`code snippet\`\nDouble parens: ((test value)).`;

const sanitizedOutput = sanitizeDisputeLetter(testMarkdownInput);
assert.ok(!sanitizedOutput.includes(']('), 'Sanitizer must eliminate all "](" link syntax');
assert.ok(!sanitizedOutput.includes('[www'), 'Sanitizer must eliminate all "[www" syntax');
assert.ok(sanitizedOutput.includes('www.energyombudsman.org'), 'Sanitizer must preserve bare ombudsman website');
assert.ok(!sanitizedOutput.includes('(www.energyombudsman.org)'), 'Sanitizer must remove parens around ombudsman website');
assert.ok(!sanitizedOutput.includes('https://www.energyombudsman.org'), 'Sanitizer must remove https prefix for ombudsman website');
assert.ok(sanitizedOutput.includes('Ofgem guidance'), 'Markdown link must be replaced with link text');
assert.ok(!sanitizedOutput.includes('https://www.ofgem.gov.uk/rules'), 'Markdown link URL must be stripped');
assert.ok(sanitizedOutput.includes('www.aer.gov.au') && !sanitizedOutput.includes('(https://www.aer.gov.au)'), 'Domain link text must format as plain domain');
assert.ok(!sanitizedOutput.includes('((test value))'), 'Double parens must be simplified');
assert.ok(sanitizedOutput.includes('(test value)'), 'Single parens must remain for non-ombudsman content');
assert.ok(!sanitizedOutput.includes('# Heading 1') && sanitizedOutput.includes('Heading 1'), 'Headings must be stripped of #');
assert.ok(!sanitizedOutput.includes('**Bold Text**') && sanitizedOutput.includes('Bold Text'), 'Bold asterisks must be stripped');
assert.ok(!sanitizedOutput.includes('*Italic Text*') && sanitizedOutput.includes('Italic Text'), 'Italic asterisks must be stripped');
assert.ok(!sanitizedOutput.includes('`code snippet`') && sanitizedOutput.includes('code snippet'), 'Backticks must be stripped');

console.log('✔ Additional source omitted from letter (UI/annexure only), obstruction, precedent, and UK rule wording verified.');
console.log('✔ Markdown links, ombudsman bare text, double parentheses, and Markdown artifacts sanitization verified.');

// Test exact Gemini-style sentence asserting "Energy Ombudsman, www.energyombudsman.org, after" and no "](" and no "[www"
const geminiStyleSentence = 'to the Energy Ombudsman, [www.energyombudsman.org](https://www.energyombudsman.org), after the standard';
const sanitizedGeminiSentence = sanitizeDisputeLetter(geminiStyleSentence);
assert.ok(
  sanitizedGeminiSentence.includes('Energy Ombudsman, www.energyombudsman.org, after'),
  'Output must contain "Energy Ombudsman, www.energyombudsman.org, after"'
);
assert.ok(!sanitizedGeminiSentence.includes(']('), 'Output must contain no "]("');
assert.ok(!sanitizedGeminiSentence.includes('[www'), 'Output must contain no "[www"');
assert.strictEqual(
  sanitizedGeminiSentence,
  'to the Energy Ombudsman, www.energyombudsman.org, after the standard'
);

// Test exact full sentence with markdown link through the letter pipeline
const exactTestSentence = 'Should we not reach an agreed resolution, I reserve the right to escalate this matter to the Energy Ombudsman, [www.energyombudsman.org](https://www.energyombudsman.org), after the standard 8-week period.';
const sanitizedSentenceOutput = sanitizeDisputeLetter(exactTestSentence);
assert.ok(sanitizedSentenceOutput.includes('www.energyombudsman.org'), 'Sanitized sentence must contain "www.energyombudsman.org"');
assert.ok(!sanitizedSentenceOutput.includes(']('), 'Sanitized sentence must not contain "]("');
assert.ok(!sanitizedSentenceOutput.includes('[www'), 'Sanitized sentence must not contain "[www"');
assert.strictEqual(
  sanitizedSentenceOutput,
  'Should we not reach an agreed resolution, I reserve the right to escalate this matter to the Energy Ombudsman, www.energyombudsman.org, after the standard 8-week period.'
);

const exactPhrase = 'escalate this matter to the Energy Ombudsman, [www.energyombudsman.org](https://www.energyombudsman.org), after the standard 8-week period';
const sanitizedPhraseOutput = sanitizeDisputeLetter(exactPhrase);
assert.ok(sanitizedPhraseOutput.includes('www.energyombudsman.org'), 'Sanitized phrase must contain "www.energyombudsman.org"');
assert.ok(!sanitizedPhraseOutput.includes(']('), 'Sanitized phrase must not contain "]("');
assert.ok(!sanitizedPhraseOutput.includes('[www'), 'Sanitized phrase must not contain "[www"');
assert.strictEqual(
  sanitizedPhraseOutput,
  'escalate this matter to the Energy Ombudsman, www.energyombudsman.org, after the standard 8-week period'
);
console.log('✔ Exact Energy Ombudsman markdown link sentence verified through letter pipeline.');

// Helper to extract text from PDFKit compressed stream buffers
function extractTextFromPdfBuffer(buf) {
  let fullDecoded = '';
  let idx = 0;
  while ((idx = buf.indexOf('stream', idx)) !== -1) {
    let start = idx + 6;
    if (buf[start] === 0x0d) start++;
    if (buf[start] === 0x0a) start++;
    let end = buf.indexOf('endstream', start);
    if (end !== -1) {
      try {
        const dec = zlib.inflateSync(buf.subarray(start, end)).toString('utf8');
        const tjRegex = /\[([\s\S]*?)\]\s*TJ/g;
        let m;
        while ((m = tjRegex.exec(dec)) !== null) {
          const hexRegex = /<([0-9a-fA-F]+)>/g;
          let h;
          let lineText = '';
          while ((h = hexRegex.exec(m[1])) !== null) {
            lineText += Buffer.from(h[1], 'hex').toString('latin1');
          }
          fullDecoded += ' ' + lineText;
        }
      } catch (e) {}
    }
    idx = end + 9;
  }
  return fullDecoded.replace(/\s+/g, ' ');
}

// =========================================================================
// End-to-End Pipeline Test 1: Real Letter Pipeline with Deterministic Fallback
// =========================================================================
const e2eDeterministicEvaluation = await evaluateExceptionsAndFormatLetter({
  isMeterObstructed: false,
  isEstimated: true,
  disputableTotal: 1000.00,
  totalBilled: 1400.00,
  billDate: '2026-10-01',
  cutOffDate: '2025-10-01',
  regulation: {
    jurisdiction: 'United Kingdom',
    title: 'Ofgem SLC 21BA',
    clauseReference: 'Ofgem SLC 21BA',
    lookbackMonths: 12
  },
  currency: '£',
  lookbackMonths: 12,
  consumerName: 'Jane Example',
  supplierName: 'Example Energy Ltd',
  accountNumber: 'EX-8849201',
  supplyAddress: '1 Example Street, Exampletown, EX1 1AA',
  noticeDate: '2026-10-24',
  country: 'United Kingdom'
});

// Server response field:
const e2eServerLetter1 = e2eDeterministicEvaluation.disputeLetter
  ? sanitizeDisputeLetter(e2eDeterministicEvaluation.disputeLetter, false)
  : '';

// Client Sinks:
const previewString1 = sanitizeDisputeLetter(e2eServerLetter1);
const clipboardString1 = sanitizeDisputeLetter(previewString1);
const noticeHeader = '[NOTICE TO COMPLAINTS TEAM: Please find our complete 3-Page Schedule of Mathematical Evidence & Dispute Packet (draft) attached as a PDF.]\n\n';
const emailBodyString1 = sanitizeDisputeLetter(noticeHeader + sanitizeDisputeLetter(e2eServerLetter1));
const clipboardBodyString1 = sanitizeDisputeLetter(emailBodyString1);

// PDF Sink:
const pdfBuffer1 = await generateLegalPacketPdf({
  billDate: '2026-10-01',
  cutOffDate: '2025-10-01',
  disputableTotal: 1000.00,
  totalBilled: 1400.00,
  regulation: { jurisdiction: 'United Kingdom', title: 'Ofgem SLC 21BA', clauseReference: 'Ofgem SLC 21BA' },
  isEstimated: true,
  isMeterObstructed: false,
  currency: '£',
  lookbackMonths: 12,
  consumerName: 'Jane Example',
  supplierName: 'Example Energy Ltd',
  accountNumber: 'EX-8849201',
  supplyAddress: '1 Example Street, Exampletown, EX1 1AA',
  disputeLetter: e2eServerLetter1,
  itemizedBreakdown: [{ periodStart: '2024-10-01', periodEnd: '2025-09-30', originalCharge: 1000, daysPrior: 365, daysPermitted: 0, disputableAmount: 1000 }]
});
const pdfText1 = extractTextFromPdfBuffer(pdfBuffer1);

for (const [name, str] of [
  ['Preview Element', previewString1],
  ['Clipboard Write', clipboardString1],
  ['Email Body', emailBodyString1],
  ['Modal Clipboard Body', clipboardBodyString1],
  ['PDF Text', pdfText1]
]) {
  assert.ok(str.includes('www.energyombudsman.org'), `${name} must contain "www.energyombudsman.org" (deterministic fallback)`);
  assert.ok(!str.includes(']('), `${name} must not contain "](" (deterministic fallback)`);
  assert.ok(!str.includes('[www'), `${name} must not contain "[www" (deterministic fallback)`);
}
console.log('✔ End-to-end letter pipeline (deterministic fallback) verified across preview, clipboard, email, and PDF.');

// =========================================================================
// End-to-End Pipeline Test 2: Real Letter Pipeline with Mocked Gemini Markdown Link
// =========================================================================
const rawGeminiMockLetter = `Jane Example
1 Example Street, Exampletown, EX1 1AA
Account Reference: EX-8849201
Date: 24 October 2026

Complaints Handling Team
Example Energy Ltd

FORMAL COMPLAINT: Back-billing Dispute under Ofgem SLC 21BA

Dear Complaints Team,

Account Reference: EX-8849201
Supply Address: 1 Example Street, Exampletown, EX1 1AA

I am writing to formally raise a complaint regarding my recent energy bill dated 2026-10-01 for the total amount of £1,400.00.

A precise calendar audit against statutory utility standards indicates that £1,000.00 of this total relates to energy consumed prior to 2025-10-01 (more than 12 calendar months before the bill date).

Under Ofgem SLC 21BA, energy retailers are restricted from recovering catch-up charges for energy consumed more than 12 months prior to the bill issuance date, where the delay or error was the supplier's responsibility.

I confirm that I have not acted obstructively or prevented meter access at any time, and earlier bills were based on estimated rather than actual readings.

In light of these back-billing rules, I formally request that you:
1. Revise the bill to remove the £1,000.00 accrued prior to 2025-10-01.
2. Issue an updated statement showing only charges legitimately recoverable within the statutory 12-month permitted window.
3. Place a temporary hold on collection action for the disputed sum while this complaint is investigated.

Please treat this as a formal complaint in accordance with your complaint handling procedure. I suggest a written response within 14 calendar days. Should we not reach an agreed resolution within the standard 8-week complaints timeframe, I reserve the right to escalate this matter to the Energy Ombudsman, [www.energyombudsman.org](https://www.energyombudsman.org), after the standard 8-week period or upon receipt of a deadlock letter under Ofgem SLC 21BA.

Yours sincerely,

Jane Example
Account Holder`;

// Server intake:
const serverMockedLetter = sanitizeDisputeLetter(rawGeminiMockLetter, false);

// Client Sinks:
const previewString2 = sanitizeDisputeLetter(serverMockedLetter);
const clipboardString2 = sanitizeDisputeLetter(previewString2);
const emailBodyString2 = sanitizeDisputeLetter(noticeHeader + sanitizeDisputeLetter(serverMockedLetter));
const clipboardBodyString2 = sanitizeDisputeLetter(emailBodyString2);

// PDF Sink:
const pdfBuffer2 = await generateLegalPacketPdf({
  billDate: '2026-10-01',
  cutOffDate: '2025-10-01',
  disputableTotal: 1000.00,
  totalBilled: 1400.00,
  regulation: { jurisdiction: 'United Kingdom', title: 'Ofgem SLC 21BA', clauseReference: 'Ofgem SLC 21BA' },
  isEstimated: true,
  isMeterObstructed: false,
  currency: '£',
  lookbackMonths: 12,
  consumerName: 'Jane Example',
  supplierName: 'Example Energy Ltd',
  accountNumber: 'EX-8849201',
  supplyAddress: '1 Example Street, Exampletown, EX1 1AA',
  disputeLetter: serverMockedLetter,
  itemizedBreakdown: [{ periodStart: '2024-10-01', periodEnd: '2025-09-30', originalCharge: 1000, daysPrior: 365, daysPermitted: 0, disputableAmount: 1000 }]
});
const pdfText2 = extractTextFromPdfBuffer(pdfBuffer2);

for (const [name, str] of [
  ['Mocked Preview Element', previewString2],
  ['Mocked Clipboard Write', clipboardString2],
  ['Mocked Email Body', emailBodyString2],
  ['Mocked Modal Clipboard Body', clipboardBodyString2],
  ['Mocked PDF Text', pdfText2]
]) {
  assert.ok(str.includes('www.energyombudsman.org'), `${name} must contain "www.energyombudsman.org" (mocked Gemini markdown link)`);
  assert.ok(!str.includes(']('), `${name} must not contain "](" (mocked Gemini markdown link)`);
  assert.ok(!str.includes('[www'), `${name} must not contain "[www" (mocked Gemini markdown link)`);
}
console.log('✔ End-to-end letter pipeline (mocked Gemini markdown link) verified across preview, clipboard, email, and PDF.');

// =========================================================================
// Gemini Multi-Model Fallback & Quota Resiliency Unit Tests (Mocked Only)
// (Verifies HTTP 429 / RESOURCE_EXHAUSTED fallback chain without live calls)
// =========================================================================

console.log('Testing Gemini multi-model fallback and quota resiliency...');

// Test F1: isVisionModel filtering
assert.equal(isVisionModel('gemini-3.8-flash'), true, 'gemini-3.8-flash must be recognized as vision model');
assert.equal(isVisionModel('gemini-3-flash'), true, 'gemini-3-flash must be recognized as vision model');
assert.equal(isVisionModel('gemini-3.1-flash-lite'), true, 'gemini-3.1-flash-lite must be recognized as vision model');
assert.equal(isVisionModel('gemini-3.5-flash-lite'), true, 'gemini-3.5-flash-lite must be recognized as vision model');
assert.equal(isVisionModel('gemma-4-31b-it'), false, 'gemma models must be excluded from vision extraction');
assert.equal(isVisionModel('text-embedding-004'), false, 'embedding models must be excluded from vision extraction');
assert.equal(isVisionModel('imagen-3.0-generate-002'), false, 'generation-only models must be excluded from vision extraction');
assert.equal(isVisionModel('text-bison'), false, 'text-only legacy models must be excluded from vision extraction');
console.log('✔ Vision capability model filtering verified.');

// Test F2: getModelList deduplication and vision filtering
const listText = getModelList({
  isVision: false,
  primaryModel: 'gemini-3.8-flash',
  fallbackModels: 'gemini-3-flash,gemini-3.8-flash,gemma-4-31b-it,gemini-3.1-flash-lite'
});
assert.deepEqual(listText, ['gemini-3.8-flash', 'gemini-3-flash', 'gemma-4-31b-it', 'gemini-3.1-flash-lite']);

const listVision = getModelList({
  isVision: true,
  primaryModel: 'gemini-3.8-flash',
  fallbackModels: 'gemini-3-flash,gemma-4-31b-it,gemini-3.1-flash-lite'
});
assert.deepEqual(listVision, ['gemini-3.8-flash', 'gemini-3-flash', 'gemini-3.1-flash-lite'], 'Vision model list must skip non-vision gemma model');
console.log('✔ getModelList sequence deduplication and vision filtering verified.');

// Test F3: isQuotaOrTimeoutError & isRetryableModelError detection
const quotaErr429 = { status: 429, message: 'Resource has been exhausted (e.g. check quota).' };
const quotaErrCode = { code: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded' };
const timeoutErr = new Error('Call timed out after 20s');
const badRequestErr = { status: 400, message: 'Invalid payload' };

assert.equal(isQuotaOrTimeoutError(quotaErr429), true);
assert.equal(isQuotaOrTimeoutError(quotaErrCode), true);
assert.equal(isQuotaOrTimeoutError(timeoutErr), true);
assert.equal(isQuotaOrTimeoutError(badRequestErr), false);
assert.equal(isRetryableModelError(badRequestErr), false);
console.log('✔ Quota, timeout, and retryable error classification verified.');

// Test F4: executeWithModelFallback simulates 429 on model 1 and success on model 2
const fallbackAttemptSequence = [];
const fallbackResult = await executeWithModelFallback({
  label: 'mockFallbackTest',
  overrideModels: ['gemini-mock-1', 'gemini-mock-2', 'gemini-mock-3'],
  timeoutMs: 2000,
  execute: async (targetModel) => {
    fallbackAttemptSequence.push(targetModel);
    if (targetModel === 'gemini-mock-1') {
      const err = new Error('HTTP 429: Rate limit exceeded');
      err.status = 429;
      throw err;
    }
    return { success: true, text: '{"served": true}' };
  }
});
assert.deepEqual(fallbackAttemptSequence, ['gemini-mock-1', 'gemini-mock-2'], 'Must retry on model 2 and stop upon success');
assert.equal(fallbackResult.model, 'gemini-mock-2');
assert.equal(fallbackResult.result.success, true);
console.log('✔ Fallback execution on HTTP 429 to next model verified.');

// Test F5: executeWithModelFallback stops after list exhausted (no loop) and formats clear quota message
const exhaustedSequence = [];
await assert.rejects(async () => {
  await executeWithModelFallback({
    label: 'mockExhaustedTest',
    overrideModels: ['gemini-mock-1', 'gemini-mock-2'],
    timeoutMs: 2000,
    execute: async (targetModel) => {
      exhaustedSequence.push(targetModel);
      const err = new Error('RESOURCE_EXHAUSTED');
      err.status = 429;
      throw err;
    }
  });
}, (err) => {
  assert.equal(err.isQuota, true);
  assert.equal(err.message, 'The AI reader is busy right now. Please try again later or enter the values manually.');
  return true;
});
assert.deepEqual(exhaustedSequence, ['gemini-mock-1', 'gemini-mock-2'], 'Must visit each model once and stop without looping');
console.log('✔ Exhausted quota behavior and clear user message verified.');

// Test F6: extractBillData with mocked AI fallback (429 on model 1 -> success on model 2)
const billAttemptedModels = [];
const mockBillAi = {
  models: {
    generateContent: async ({ model }) => {
      billAttemptedModels.push(model);
      if (model === DEFAULT_PRIMARY_MODEL) {
        const err = new Error('RESOURCE_EXHAUSTED: 20 requests per day per model reached');
        err.status = 429;
        throw err;
      }
      return {
        text: JSON.stringify({
          billDate: '2026-10-01',
          isEstimated: false,
          currency: '£',
          supplierName: 'Mock Energy Ltd',
          accountNumber: 'ACC-8899',
          billingPeriods: [
            { startDate: '2024-10-01', endDate: '2025-09-30', amount: 850.00 }
          ]
        })
      };
    }
  }
};
const billExtractionResult = await extractBillData({
  fileData: 'data:application/pdf;base64,mockPdfData',
  mimeType: 'application/pdf',
  aiInstance: mockBillAi
});
assert.equal(billAttemptedModels[0], DEFAULT_PRIMARY_MODEL);
assert.equal(billAttemptedModels[1], 'gemini-3-flash');
assert.equal(billExtractionResult.billDate, '2026-10-01');
assert.equal(billExtractionResult.supplierName, 'Mock Energy Ltd');
assert.equal(billExtractionResult.billingPeriods[0].amount, 850.00);
console.log('✔ extractBillData mocked fallback from 429 verified.');

// Test F7: extractMeterReading with mocked AI fallback (429 on model 1 -> success on model 2)
const meterAttemptedModels = [];
const mockMeterAi = {
  models: {
    generateContent: async ({ model }) => {
      meterAttemptedModels.push(model);
      if (model === DEFAULT_PRIMARY_MODEL) {
        const err = new Error('HTTP 429 Quota Exceeded');
        err.status = 429;
        throw err;
      }
      return {
        text: JSON.stringify({
          meterType: 'Digital LCD Display',
          readingValue: 35420,
          unit: 'kWh',
          serialNumber: 'MSN-554433',
          confidence: 'high',
          notes: 'Clear digital meter display.'
        })
      };
    }
  }
};
const meterExtractionResult = await extractMeterReading({
  fileData: 'data:image/jpeg;base64,mockMeterData',
  mimeType: 'image/jpeg',
  aiInstance: mockMeterAi
});
assert.equal(meterAttemptedModels[0], DEFAULT_PRIMARY_MODEL);
assert.equal(meterAttemptedModels[1], 'gemini-3-flash');
assert.equal(meterExtractionResult.readingValue, 35420);
assert.equal(meterExtractionResult.serialNumber, 'MSN-554433');
console.log('✔ extractMeterReading mocked fallback from 429 verified.');

// Test F8: evaluateExceptionsAndFormatLetter mocked fallback (429 on model 1 -> success on model 2)
const letterAttemptedModels = [];
const mockLetterAi = {
  models: {
    generateContent: async ({ model }) => {
      letterAttemptedModels.push(model);
      if (model === DEFAULT_PRIMARY_MODEL) {
        const err = new Error('HTTP 429 RESOURCE_EXHAUSTED');
        err.status = 429;
        throw err;
      }
      return {
        text: JSON.stringify({
          verdict: 'Likely Disputable Amount',
          disputeLetter: 'Formal complaint dispute letter generated by fallback model gemini-3-flash.'
        })
      };
    }
  }
};
const letterFallbackResult = await evaluateExceptionsAndFormatLetter({
  billDate: '2026-10-01',
  cutOffDate: '2025-10-01',
  disputableTotal: 1000.00,
  totalBilled: 1400.00,
  consumerName: 'Jane Example',
  supplierName: 'Example Energy Ltd',
  accountNumber: 'EX-8849201',
  supplyAddress: '1 Example Street',
  noticeDate: '2026-10-24',
  aiInstance: mockLetterAi
});
assert.equal(letterAttemptedModels[0], DEFAULT_PRIMARY_MODEL);
assert.equal(letterAttemptedModels[1], 'gemini-3-flash');
assert.equal(letterFallbackResult.letterSource, 'Gemini');
assert.ok(letterFallbackResult.disputeLetter.includes('gemini-3-flash'));
console.log('✔ evaluateExceptionsAndFormatLetter mocked fallback from 429 verified.');

// Test F9: evaluateExceptionsAndFormatLetter when all models fail falls back to template
const allFailingAi = {
  models: {
    generateContent: async () => {
      const err = new Error('RESOURCE_EXHAUSTED: daily limit exhausted for all models');
      err.status = 429;
      throw err;
    }
  }
};
const templateFallbackResult = await evaluateExceptionsAndFormatLetter({
  billDate: '2026-10-01',
  cutOffDate: '2025-10-01',
  disputableTotal: 1000.00,
  totalBilled: 1400.00,
  consumerName: 'Jane Example',
  supplierName: 'Example Energy Ltd',
  accountNumber: 'EX-8849201',
  supplyAddress: '1 Example Street',
  noticeDate: '2026-10-24',
  aiInstance: allFailingAi
});
assert.equal(templateFallbackResult.letterSource, 'Template');
assert.ok(templateFallbackResult.disputeLetter.includes('FORMAL COMPLAINT'));
assert.ok(templateFallbackResult.disputeLetter.includes('£1,000.00'));
console.log('✔ evaluateExceptionsAndFormatLetter clean deterministic template fallback verified when all models exhausted.');

console.log('✔ All validation assertions passed.');
console.log('All mathematical engine tests passed successfully!');



