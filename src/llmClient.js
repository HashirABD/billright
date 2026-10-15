/**
 * Gemini LLM Client for constrained exception evaluation and letter formatting.
 * Uses official @google/genai SDK targeting GEMINI_MODEL (default: gemini-3.8-flash) at temperature 0.0.
 * AI never does mathematical calculation; only evaluates exceptions and formats letters.
 */

import { GoogleGenAI } from '@google/genai';

/**
 * Localized statutory ombudsman escalation paths by jurisdiction.
 */
function getEscalationPath(jurisdiction = '') {
  if (jurisdiction === 'Australia') {
    return 'State Energy and Water Ombudsman (e.g. EWON, EWOQ, EWOSA) under the National Energy Retail Rules (NERR Rule 30)';
  }
  if (jurisdiction.includes('California')) {
    return 'California Public Utilities Commission (CPUC) Consumer Affairs Branch under PG&E Electric Rule 17.1 (or equivalent SCE/SDG&E tariffs)';
  }
  if (jurisdiction.includes('Texas')) {
    // TODO verify REP limit in 16 TAC 25.480(e)
    return 'Public Utility Commission of Texas (PUCT) Customer Protection Division under 16 TAC §25.28(d) / §25.480(e)';
  }
  if (jurisdiction === 'United Kingdom') {
    return 'Energy Ombudsman (www.energyombudsman.org) after the standard 8-week period or upon receipt of a deadlock letter under Ofgem SLC 21BA';
  }
  return 'relevant statutory utility ombudsman or Public Utilities Commission';
}

/**
 * Formats a date string nicely or returns a fallback.
 */
function formatDate(d) {
  if (!d) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-').map(Number);
    const dateObj = new Date(y, m - 1, day);
    return dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return String(d);
}

/**
 * Deterministic fallback letter generator if AI API is unavailable.
 */
function generateDeterministicLetter({
  disputableTotal,
  totalBilled,
  billDate,
  cutOffDate,
  regulation,
  isEstimated,
  isMeterObstructed = false,
  currency = '£',
  lookbackMonths = 12,
  consumerName,
  supplierName,
  accountNumber,
  supplyAddress,
  noticeDate
}) {
  const formattedDisputable = `${currency}${disputableTotal.toFixed(2)}`;
  const formattedTotal = `${currency}${totalBilled.toFixed(2)}`;
  const escalation = getEscalationPath(regulation.jurisdiction);
  const letterDate = formatDate(noticeDate);

  const partyName = consumerName || 'Account Holder';
  const supplier = supplierName || 'Energy Supplier';
  const accNum = accountNumber || 'Reference On File';
  const address = supplyAddress || 'Supply Address On File';

  const obstructionWarningParagraph = isMeterObstructed
    ? `\nIMPORTANT NOTICE REGARDING METER ACCESS:
Please note that meter access obstruction was indicated for this account. Under statutory rules (such as ${regulation.clauseReference || 'statutory utility codes'}), back-billing protections may not apply if the supplier can demonstrate that the customer acted obstructively or prevented meter access. This letter is submitted without prejudice to investigate whether access attempts were legitimately made.\n`
    : '';

  const isTexas = Boolean(regulation.clauseReference && (regulation.clauseReference.includes('§25.28') || regulation.clauseReference.includes('25.28')));
  const statutoryRuleText = isTexas
    ? `Under PUCT §25.28(d) for electric utilities, back-billing adjustments are limited to 6 months counted from the date the error was discovered. For retail electric providers under §25.480(e), a 6-month limit applies (verify current limit).`
    : `Under ${regulation.title || 'statutory back-billing regulations'}, energy retailers are restricted from recovering catch-up charges for energy consumed more than ${lookbackMonths} months prior to the bill issuance date, where the customer has not been billed previously and has not obstructed meter access.`;

  return `${partyName}
${address}
Account Reference: ${accNum}
Date: ${letterDate}

Complaints Handling Team
${supplier}

FORMAL COMPLAINT: Back-billing Dispute under ${regulation.clauseReference || 'Statutory Utility Code'}

Dear Complaints Team,

Account Reference: ${accNum}
Supply Address: ${address}

I am writing to formally raise a complaint regarding my recent energy bill dated ${billDate} for the total amount of ${formattedTotal}.
${obstructionWarningParagraph}
Upon reviewing the itemized breakdown against statutory regulatory standards, I have identified that ${formattedDisputable} of this total relates to energy consumed prior to ${cutOffDate} (more than ${lookbackMonths} calendar months before the bill date).

${statutoryRuleText}

${isMeterObstructed ? 'While meter access issues were noted, I request full disclosure of all alleged visit records and meter reading attempts.' : 'I confirm that I have not acted obstructively or prevented meter access at any time'}${isEstimated ? ', and earlier bills were based on estimated rather than actual readings' : ''}.

In light of these back-billing rules, I formally request that you:
1. Revise the bill to remove the ${formattedDisputable} accrued prior to ${cutOffDate}.
2. Issue an updated statement showing only charges legitimately recoverable within the statutory ${lookbackMonths}-month permitted window.
3. Place a temporary hold on collection action for the disputed sum while this complaint is investigated.

Please treat this as a formal complaint in accordance with your complaint handling procedure. I suggest a written response within 14 calendar days. Should we not reach an agreed resolution within 8 weeks, I reserve the right to escalate this matter to the ${escalation}.

Yours sincerely,

${partyName}
Account Holder`;
}

/**
 * Evaluates exception conditions and formats dispute response.
 * 
 * @param {Object} params
 * @param {boolean} params.isMeterObstructed - Whether user prevented meter access
 * @param {boolean} params.isEstimated - Whether previous readings were estimated
 * @param {number} params.disputableTotal - Calculated disputable amount from math engine
 * @param {number} params.totalBilled - Total bill amount
 * @param {string} params.billDate - YYYY-MM-DD
 * @param {string} params.cutOffDate - YYYY-MM-DD
 * @param {Object} params.regulation - Regulation object from Tavily
 * @param {string} [params.currency='£'] - Currency symbol
 * @param {number} [params.lookbackMonths=12] - Regulatory lookback limit in months
 * @param {string} [params.consumerName] - Consumer full name
 * @param {string} [params.supplierName] - Energy supplier company name
 * @param {string} [params.accountNumber] - Account/customer reference
 * @param {string} [params.supplyAddress] - Supply property address
 * @param {string} [params.noticeDate] - User local date string
 * @param {string} [params.country] - Selected jurisdiction
 * @returns {Promise<Object>} Evaluated verdict, badges, and dispute letter
 */
export async function evaluateExceptionsAndFormatLetter({
  isMeterObstructed,
  isEstimated,
  disputableTotal,
  totalBilled,
  billDate,
  cutOffDate,
  regulation,
  currency = '£',
  lookbackMonths = 12,
  consumerName,
  supplierName,
  accountNumber,
  supplyAddress,
  noticeDate,
  country = 'United Kingdom'
}) {
  const partyName = consumerName || 'Account Holder';
  const supplier = supplierName || 'Energy Supplier';
  const accNum = accountNumber || 'Reference On File';
  const address = supplyAddress || 'Supply Address On File';
  const letterDate = formatDate(noticeDate);

  // Case 0: Other Country selected -> Explicit provisional placeholder
  if (country === 'Other Country') {
    const letter = generateDeterministicLetter({
      disputableTotal,
      totalBilled,
      billDate,
      cutOffDate,
      regulation,
      isEstimated,
      isMeterObstructed,
      currency,
      lookbackMonths,
      consumerName: partyName,
      supplierName: supplier,
      accountNumber: accNum,
      supplyAddress: address,
      noticeDate: letterDate
    });

    return {
      verdict: 'Provisional assessment (Unverified Jurisdiction)',
      badgeType: 'incomplete',
      exceptionTriggered: false,
      exceptionNotes: 'The 12-month limit shown is a provisional placeholder. Statutory back-billing protections vary significantly by jurisdiction and must be verified with your national or regional energy regulator.',
      disputeLetter: letter,
      noticeDate: letterDate
    };
  }

  // Case A: Meter obstruction triggered -> show clear warning that protection may not apply, but include letter with warning
  if (isMeterObstructed) {
    const letter = generateDeterministicLetter({
      disputableTotal,
      totalBilled,
      billDate,
      cutOffDate,
      regulation,
      isEstimated,
      isMeterObstructed: true,
      currency,
      lookbackMonths,
      consumerName: partyName,
      supplierName: supplier,
      accountNumber: accNum,
      supplyAddress: address,
      noticeDate: letterDate
    });

    return {
      verdict: 'Protection may not apply (Obstruction indicated)',
      badgeType: 'rule_does_not_apply',
      exceptionTriggered: true,
      exceptionNotes: `WARNING: Meter access obstruction was indicated. Under statutory back-billing rules (such as ${regulation.clauseReference || 'applicable regulations'}), protections do not apply if the customer unreasonably prevented meter reading access. If the supplier proves access was denied, this entire catch-up amount may remain payable.`,
      disputeLetter: letter,
      noticeDate: letterDate
    };
  }

  // Case B: Regulation could not be verified (Search failure / unconfigured)
  if (!regulation.verified) {
    return {
      verdict: 'More evidence needed',
      badgeType: 'more_evidence_needed',
      exceptionTriggered: false,
      exceptionNotes: regulation.summary,
      disputeLetter: null,
      disputeLetterReason: 'Dispute letter disabled because official regulatory rules could not be verified for this jurisdiction.',
      noticeDate: letterDate
    };
  }

  // Case C: No charges fall before the cut-off date
  if (disputableTotal <= 0) {
    return {
      verdict: 'Rule does not apply',
      badgeType: 'rule_does_not_apply',
      exceptionTriggered: false,
      exceptionNotes: `All charges on this bill fall within the statutory ${lookbackMonths}-month permitted billing window. The back-billing limit does not restrict charges accrued within the last ${lookbackMonths} months.`,
      disputeLetter: null,
      disputeLetterReason: `All billing periods are within the permitted ${lookbackMonths}-month window.`,
      noticeDate: letterDate
    };
  }

  // Case D: Disputable charges exist under verified regulation
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

  if (!apiKey || apiKey === 'your_gemini_key_here') {
    console.warn('⚠️ GEMINI_API_KEY not configured. Generating standard dispute letter.');
    const letter = generateDeterministicLetter({
      disputableTotal,
      totalBilled,
      billDate,
      cutOffDate,
      regulation,
      isEstimated,
      isMeterObstructed: false,
      currency,
      lookbackMonths,
      consumerName: partyName,
      supplierName: supplier,
      accountNumber: accNum,
      supplyAddress: address,
      noticeDate: letterDate
    });
    return {
      verdict: 'Likely Disputable Amount',
      badgeType: 'consumer_protected',
      exceptionTriggered: false,
      exceptionNotes: isEstimated ? 'Prior bills based on estimates: supports dispute because supplier delayed actual meter inspection.' : null,
      disputeLetter: letter,
      noticeDate: letterDate
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const escalation = getEscalationPath(regulation.jurisdiction);

    const prompt = `You are an expert consumer advocacy assistant specializing in energy utility regulations.
Generate a structured JSON response evaluating a back-billing complaint.

PARTIES & ACCOUNT:
- Consumer Full Name: ${partyName}
- Supply Address: ${address}
- Account Reference Number: ${accNum}
- Energy Supplier: ${supplier}
- Date of Letter: ${letterDate}

FACTS:
- Country/Jurisdiction: ${regulation.jurisdiction}
- Regulation: ${regulation.title} (${regulation.clauseReference || 'Statutory Code'})
- Regulation Summary: ${regulation.summary}
- Bill Issue Date: ${billDate}
- Statutory ${lookbackMonths}-Month Lookback Cut-off: ${cutOffDate}
- Total Billed: ${currency}${totalBilled.toFixed(2)}
- Disputable Sum Accrued Before Cut-off: ${currency}${disputableTotal.toFixed(2)}
- Meter Reading Status: ${isEstimated ? 'Previously estimated readings (supplier delayed actual reading)' : 'Actual readings'}
- Customer Obstruction: No (Meter access was never denied)

INSTRUCTIONS:
1. Verdict must be "Likely Disputable Amount".
2. exceptionTriggered must be false.
3. Formulate a polite, professional, formal complaint letter from ${partyName} to the ${supplier} Complaints Department.
   - Use the exact Consumer Name (${partyName}), Energy Supplier (${supplier}), Account Reference (${accNum}), and Supply Address (${address}).
   - Use the exact letter date: ${letterDate}.
   - DO NOT USE any bracketed placeholders like [Your Name], [Account Number], [Supplier Name], or [Address]. The real details provided above must be directly embedded.
   - Reference the exact regulation name and clause (${regulation.clauseReference || 'Statutory Code'}).
   - Insert the exact pre-calculated disputable sum of ${currency}${disputableTotal.toFixed(2)}.
   - Explicitly cite the escalation path: internal supplier dispute followed by ${escalation} after 8 weeks.
   - Include a suggested 14-day response deadline and polite request to pause debt recovery actions on the disputed amount while under investigation.
   - Do NOT claim the supplier is statutorily bound to pause debt collection or that non-response constitutes regulatory non-compliance.
   - If Texas (§25.28(d)/§25.480(e)): for electric utilities under §25.28(d), note the 6-month limit is counted from the date the error was discovered; for retail electric providers under §25.480(e), add "verify current limit".
   - Frame it as an unrecoverable back-billing charge under the statutory rule.

Return strictly a JSON object with this shape:
{
  "verdict": "Likely Disputable Amount",
  "disputeLetter": "The complete formatted letter text..."
}`;

    const generatePromise = ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        temperature: 0.0,
        responseMimeType: 'application/json'
      }
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API call timed out after 8 seconds')), 8000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const parsed = JSON.parse(response.text);

    return {
      verdict: parsed.verdict || 'Likely Disputable Amount',
      badgeType: 'consumer_protected',
      exceptionTriggered: false,
      exceptionNotes: isEstimated ? 'Prior bills based on estimates: supports dispute because supplier delayed actual meter inspection.' : null,
      disputeLetter: parsed.disputeLetter || generateDeterministicLetter({
        disputableTotal,
        totalBilled,
        billDate,
        cutOffDate,
        regulation,
        isEstimated,
        isMeterObstructed: false,
        currency,
        lookbackMonths,
        consumerName: partyName,
        supplierName: supplier,
        accountNumber: accNum,
        supplyAddress: address,
        noticeDate: letterDate
      }),
      noticeDate: letterDate
    };

  } catch (err) {
    console.warn('Gemini API call failed or timed out. Falling back to deterministic letter format:', err.message);
    const letter = generateDeterministicLetter({
      disputableTotal,
      totalBilled,
      billDate,
      cutOffDate,
      regulation,
      isEstimated,
      isMeterObstructed: false,
      currency,
      lookbackMonths,
      consumerName: partyName,
      supplierName: supplier,
      accountNumber: accNum,
      supplyAddress: address,
      noticeDate: letterDate
    });
    return {
      verdict: 'Likely Disputable Amount',
      badgeType: 'consumer_protected',
      exceptionTriggered: false,
      exceptionNotes: isEstimated ? 'Prior bills based on estimates: supports dispute because supplier delayed actual meter inspection.' : null,
      disputeLetter: letter,
      noticeDate: letterDate
    };
  }
}
