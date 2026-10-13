/**
 * Gemini LLM Client for constrained exception evaluation and letter formatting.
 * Uses official @google/genai SDK targeting gemini-2.5-flash at temperature 0.0.
 * AI never does mathematical calculation; only evaluates exceptions and formats letters.
 */

import { GoogleGenAI } from '@google/genai';

/**
 * Localized statutory ombudsman escalation paths by jurisdiction.
 */
function getEscalationPath(jurisdiction = '') {
  if (jurisdiction === 'Australia') {
    return 'State Energy and Water Ombudsman (e.g. EWON, EWOV, EWOQ) in accordance with the National Energy Retail Law';
  }
  if (jurisdiction.includes('California')) {
    return 'California Public Utilities Commission (CPUC) Consumer Affairs Branch (www.cpuc.ca.gov)';
  }
  if (jurisdiction.includes('Texas')) {
    return 'Public Utility Commission of Texas (PUCT) Customer Protection Division';
  }
  if (jurisdiction === 'United Kingdom') {
    return 'Energy Ombudsman (www.energyombudsman.org) after the standard 8-week period or upon receipt of a deadlock letter';
  }
  return 'relevant statutory utility ombudsman or Public Utilities Commission';
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
  currency = '£',
  lookbackMonths = 12,
  consumerName = 'Sarah Jenkins',
  supplierName = 'British Gas',
  accountNumber = 'BG-8849201',
  supplyAddress = '14 Windsor Gardens, Bristol, BS8 4UQ'
}) {
  const formattedDisputable = `${currency}${disputableTotal.toFixed(2)}`;
  const formattedTotal = `${currency}${totalBilled.toFixed(2)}`;
  const escalation = getEscalationPath(regulation.jurisdiction);

  const partyName = consumerName || 'Account Holder';
  const supplier = supplierName || 'Energy Supplier';
  const accNum = accountNumber || 'Reference On File';
  const address = supplyAddress || 'Supply Address On File';

  return `${partyName}
${address}
Account Reference: ${accNum}
Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}

Complaints Handling Team
${supplier}

FORMAL COMPLAINT: Back-billing Dispute under ${regulation.clauseReference || 'Statutory Utility Code'}

Dear Complaints Team,

Account Reference: ${accNum}
Supply Address: ${address}

I am writing to formally raise a complaint regarding my recent energy bill dated ${billDate} for the total amount of ${formattedTotal}.

Upon reviewing the itemized breakdown against statutory regulatory standards, I have identified that ${formattedDisputable} of this total relates to energy consumed prior to ${cutOffDate} (more than ${lookbackMonths} calendar months before the bill date).

Under ${regulation.title || 'statutory back-billing regulations'}, energy retailers are prohibited from recovering catch-up charges for energy consumed more than ${lookbackMonths} months prior to the bill issuance date, where the customer has not been billed previously and has not obstructed meter access.

I confirm that I have not acted obstructively or prevented meter access at any time${isEstimated ? ', and earlier bills were based on estimated rather than actual readings' : ''}.

In light of these statutory back-billing rules, I formally request that you:
1. Revise the bill to remove the ${formattedDisputable} accrued prior to ${cutOffDate}.
2. Issue an updated statement showing only charges legitimately recoverable within the statutory ${lookbackMonths}-month permitted window.
3. Place a temporary hold on collection action for the disputed sum while this complaint is investigated.

Please treat this as a formal complaint in accordance with your statutory complaint handling procedure. As per regulatory rules, should we not reach an agreed resolution within the statutory timeframe, I reserve the right to escalate this matter to the ${escalation}.

I look forward to your prompt written response within 10 working days.

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
 * @param {Object} params.regulation - Regulation object from Tavily * @param {string} [params.currency='£'] - Currency symbol
 * @param {number} [params.lookbackMonths=12] - Regulatory lookback limit in months
 * @param {string} [params.consumerName] - Consumer full name
 * @param {string} [params.supplierName] - Energy supplier company name
 * @param {string} [params.accountNumber] - Account/customer reference
 * @param {string} [params.supplyAddress] - Supply property address
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
  consumerName = 'Sarah Jenkins',
  supplierName = 'British Gas',
  accountNumber = 'BG-8849201',
  supplyAddress = '14 Windsor Gardens, Bristol, BS8 4UQ'
}) {
  // Case A: Meter obstruction triggered -> statutory exception overrides protections
  if (isMeterObstructed) {
    return {
      verdict: 'Rule does not apply',
      badgeType: 'rule_does_not_apply',
      exceptionTriggered: true,
      exceptionNotes: `Under energy regulatory rules (such as ${regulation.clauseReference || 'statutory utility codes'}), statutory back-billing protections do not apply when a consumer has behaved obstructively or prevented the supplier or meter reader from inspecting or reading the meter.`,
      disputeLetter: null,
      disputeLetterReason: 'Dispute letter suppressed because meter access obstruction was indicated.'
    };
  }

  // Case B: Regulation could not be verified (Search failure / unsupported country)
  if (!regulation.verified) {
    return {
      verdict: 'More evidence needed',
      badgeType: 'more_evidence_needed',
      exceptionTriggered: false,
      exceptionNotes: regulation.summary,
      disputeLetter: null,
      disputeLetterReason: 'Dispute letter disabled because official regulatory rules could not be verified for this jurisdiction.'
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
      disputeLetterReason: `All billing periods are within the permitted ${lookbackMonths}-month window.`
    };
  }

  // Case D: Disputable charges exist under verified regulation
  // Attempt to call Gemini for letter styling, falling back safely to deterministic generator
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_key_here') {
    console.warn('⚠️ GEMINI_API_KEY not configured. Generating standard dispute letter.');
    const letter = generateDeterministicLetter({
      disputableTotal,
      totalBilled,
      billDate,
      cutOffDate,
      regulation,
      isEstimated,
      currency,
      lookbackMonths,
      consumerName,
      supplierName,
      accountNumber,
      supplyAddress
    });
    return {
      verdict: 'Likely not recoverable under the rule',
      badgeType: 'consumer_protected',
      exceptionTriggered: false,
      exceptionNotes: null,
      disputeLetter: letter
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const escalation = getEscalationPath(regulation.jurisdiction);
    const partyName = consumerName || 'Account Holder';
    const supplier = supplierName || 'Energy Supplier';
    const accNum = accountNumber || 'Reference On File';
    const address = supplyAddress || 'Supply Address On File';

    const prompt = `You are an expert consumer advocacy assistant specializing in energy utility regulations.
Generate a structured JSON response evaluating a back-billing complaint.

PARTIES & ACCOUNT:
- Consumer Full Name: ${partyName}
- Supply Address: ${address}
- Account Reference Number: ${accNum}
- Energy Supplier: ${supplier}

FACTS:
- Country/Jurisdiction: ${regulation.jurisdiction}
- Regulation: ${regulation.title} (${regulation.clauseReference || 'Statutory Code'})
- Regulation Summary: ${regulation.summary}
- Bill Issue Date: ${billDate}
- Statutory ${lookbackMonths}-Month Lookback Cut-off: ${cutOffDate}
- Total Billed: ${currency}${totalBilled.toFixed(2)}
- Disputable Sum Accrued Before Cut-off: ${currency}${disputableTotal.toFixed(2)}
- Meter Reading Status: ${isEstimated ? 'Previously estimated readings' : 'Actual readings'}
- Customer Obstruction: No (Meter access was never denied)

INSTRUCTIONS:
1. Verdict must be "Likely not recoverable under the rule".
2. exceptionTriggered must be false.
3. Formulate a polite, professional, formal complaint letter from ${partyName} to the ${supplier} Complaints Department.
   - Use the exact Consumer Name (${partyName}), Energy Supplier (${supplier}), Account Reference (${accNum}), and Supply Address (${address}).
   - DO NOT USE any bracketed placeholders like [Your Name], [Account Number], [Supplier Name], or [Address]. The real details provided above must be directly embedded.
   - Reference the exact regulation name and clause (${regulation.clauseReference || 'Statutory Code'}).
   - Insert the exact pre-calculated disputable sum of ${currency}${disputableTotal.toFixed(2)}.
   - Explicitly cite the statutory escalation path: internal supplier dispute followed by ${escalation}.
   - Include a 14-day statutory response deadline and request to suspend debt recovery actions on the disputed amount.
   - Do NOT declare the charge "illegal"; frame it as an unrecoverable back-billing charge under the statutory rule.

Return strictly a JSON object with this shape:
{
  "verdict": "Likely not recoverable under the rule",
  "disputeLetter": "The complete formatted letter text..."
}`;

    const generatePromise = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.0,
        responseMimeType: 'application/json'
      }
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API call timed out after 4 seconds')), 4000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);

    const parsed = JSON.parse(response.text);
    return {
      verdict: 'Likely not recoverable under the rule',
      badgeType: 'consumer_protected',
      exceptionTriggered: false,
      exceptionNotes: null,
      disputeLetter: parsed.disputeLetter || generateDeterministicLetter({
        disputableTotal,
        totalBilled,
        billDate,
        cutOffDate,
        regulation,
        isEstimated,
        currency,
        lookbackMonths,
        consumerName,
        supplierName,
        accountNumber,
        supplyAddress
      })
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
      currency,
      lookbackMonths,
      consumerName,
      supplierName,
      accountNumber,
      supplyAddress
    });
    return {
      verdict: 'Likely not recoverable under the rule',
      badgeType: 'consumer_protected',
      exceptionTriggered: false,
      exceptionNotes: null,
      disputeLetter: letter
    };
  }
}

