/**
 * Gemini LLM Client for constrained exception evaluation and letter formatting.
 * Uses official @google/genai SDK targeting gemini-2.5-flash at temperature 0.0.
 * AI never does mathematical calculation; only evaluates exceptions and formats letters.
 */

import { GoogleGenAI } from '@google/genai';

/**
 * Deterministic fallback letter generator if AI API is unavailable.
 */
function generateDeterministicLetter({
  disputableTotal,
  totalBilled,
  billDate,
  cutOffDate,
  regulation,
  isEstimated
}) {
  const formattedDisputable = `£${disputableTotal.toFixed(2)}`;
  const formattedTotal = `£${totalBilled.toFixed(2)}`;

  return `[Your Name]
[Your Address]
[Your Account / Customer Reference]
Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}

Complaints Handling Team
[Energy Supplier Name]
[Supplier Address]

FORMAL COMPLAINT: Back-billing Dispute under ${regulation.clauseReference || 'Ofgem Standard Licence Condition 21BA'}

Dear Complaints Team,

Account Reference: [Insert Reference]
Supply Address: [Insert Address]

I am writing to formally raise a complaint regarding my recent energy bill dated ${billDate} for the total amount of ${formattedTotal}.

Upon reviewing the itemized breakdown against statutory regulatory standards, I have identified that ${formattedDisputable} of this total relates to energy consumed prior to ${cutOffDate} (more than 12 calendar months before the bill date).

Under ${regulation.title || 'Ofgem Standard Licence Condition 21BA (the Back-billing Principle)'}, energy suppliers in Great Britain are prohibited from recovering charges for electricity or gas consumed more than 12 months prior to the bill issuance date, where the customer has not been billed previously and has not obstructed meter access.

I confirm that I have not acted obstructively or prevented meter access at any time${isEstimated ? ', and earlier bills were based on estimated rather than actual readings' : ''}.

In light of the statutory back-billing rules, I formally request that you:
1. Revise the bill to remove the ${formattedDisputable} accrued prior to ${cutOffDate}.
2. Issue an updated statement showing only charges legitimately recoverable within the 12-month permitted window.
3. Place a temporary hold on collection action for the disputed sum while this complaint is investigated.

Please treat this as a formal complaint in accordance with your statutory complaint handling procedure. As per regulatory rules, should we not reach an agreed resolution within 8 weeks, or should you issue a final deadlock letter, I reserve the right to escalate this matter to the Energy Ombudsman (www.energyombudsman.org).

I look forward to your prompt written response within 10 working days.

Yours sincerely,

[Your Name]
[Contact Telephone]
[Email Address]`;
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
 * @returns {Promise<Object>} Evaluated verdict, badges, and dispute letter
 */
export async function evaluateExceptionsAndFormatLetter({
  isMeterObstructed,
  isEstimated,
  disputableTotal,
  totalBilled,
  billDate,
  cutOffDate,
  regulation
}) {
  // Case A: Meter obstruction triggered -> statutory exception overrides protections
  if (isMeterObstructed) {
    return {
      verdict: 'Rule does not apply',
      badgeType: 'rule_does_not_apply',
      exceptionTriggered: true,
      exceptionNotes: 'Under energy regulatory rules (such as Ofgem SLC 21BA), statutory back-billing protections do not apply when a consumer has behaved obstructively or prevented the supplier or meter reader from inspecting or reading the meter.',
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
      exceptionNotes: 'All charges on this bill fall within the statutory 12-month permitted billing window. The back-billing limit does not restrict charges accrued within the last 12 months.',
      disputeLetter: null,
      disputeLetterReason: 'All billing periods are within the permitted 12-month window.'
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
      isEstimated
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
    const prompt = `You are an expert consumer advocacy assistant specializing in energy utility regulations.
Generate a structured JSON response evaluating a back-billing complaint.

FACTS:
- Country/Jurisdiction: ${regulation.jurisdiction}
- Regulation: ${regulation.title} (${regulation.clauseReference || 'SLC 21BA'})
- Regulation Summary: ${regulation.summary}
- Bill Issue Date: ${billDate}
- 12-Month Lookback Cut-off: ${cutOffDate}
- Total Billed: £${totalBilled.toFixed(2)}
- Disputable Sum Accrued Before Cut-off: £${disputableTotal.toFixed(2)}
- Meter Reading Status: ${isEstimated ? 'Previously estimated readings' : 'Actual readings'}
- Customer Obstruction: No (Meter access was never denied)

INSTRUCTIONS:
1. Verdict must be "Likely not recoverable under the rule".
2. exceptionTriggered must be false.
3. Formulate a polite, professional, formal complaint letter to the energy supplier's complaints department.
   - Reference the exact regulation name and clause.
   - Include placeholders for user details ([Your Name], [Account Number], [Supplier Name]).
   - Insert the exact pre-calculated disputable sum of £${disputableTotal.toFixed(2)}.
   - Explicitly detail the UK two-step escalation ladder: (1) internal formal supplier complaint (8-week resolution period), followed by (2) the Energy Ombudsman.
   - Do NOT declare the charge "illegal"; frame it as an unrecoverable back-billing charge under the statutory licence condition.

Return strictly a JSON object with this shape:
{
  "verdict": "Likely not recoverable under the rule",
  "disputeLetter": "The complete formatted letter text..."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.0,
        responseMimeType: 'application/json'
      }
    });

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
        isEstimated
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
      isEstimated
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
