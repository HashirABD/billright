/**
 * Tavily Search API client for live energy regulatory retrieval.
 * Grounds analysis in actual regulator rules (e.g. Ofgem SLC 21BA).
 */

const TAVILY_ENDPOINT = 'https://api.tavily.com/search';

/**
 * Searches for official back-billing regulations for a given country.
 * 
 * @param {string} country - Target country name
 * @returns {Promise<Object>} Regulation metadata object
 */
export async function searchRegulations(country = 'United Kingdom') {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey || apiKey === 'your_tavily_key_here') {
    console.warn('⚠️ TAVILY_API_KEY missing or placeholder. Using safe fallback.');
    return {
      verified: false,
      jurisdiction: country,
      title: 'Unverified Regulatory Status',
      summary: 'Tavily API key is not configured. Live search unavailable; analysis paused to prevent guesswork.',
      sourceUrl: null,
      fallbackReason: 'Missing or placeholder TAVILY_API_KEY'
    };
  }

  // Construct query targeted at official energy regulatory bodies
  let query;
  let defaultTitle;
  let defaultClause;
  let fallbackUrl;

  if (country === 'United Kingdom') {
    query = 'Ofgem Standard Licence Condition 21BA back-billing electricity 12 months rule site:ofgem.gov.uk OR site:citizensadvice.org.uk OR site:legislation.gov.uk';
    defaultTitle = 'Ofgem Standard Licence Condition 21BA (Back-billing Principle)';
    defaultClause = 'SLC 21BA';
    fallbackUrl = 'https://www.ofgem.gov.uk/information-consumers/energy-advice-households/check-energy-back-billing-rules';
  } else if (country === 'Australia') {
    query = 'Australian Energy Regulator AER Rule 30 undercharging 9 months energy retail rules site:aer.gov.au OR site:energyombudsman.com.au';
    defaultTitle = 'AER National Energy Retail Rules (Rule 30: Undercharging)';
    defaultClause = 'NERR Rule 30';
    fallbackUrl = 'https://www.aer.gov.au/consumers/energy-bills-and-charges/billing-problems-and-disputes';
  } else if (country.includes('California')) {
    query = 'California Public Utilities Commission CPUC Rule 17 underbilling 3 months electricity tariff site:cpuc.ca.gov';
    defaultTitle = 'CPUC Tariff Rule 17.1 (Adjustment of Bills for Underbilling)';
    defaultClause = 'CPUC Rule 17.1';
    fallbackUrl = 'https://www.cpuc.ca.gov/consumer-support/file-a-complaint/utility-complaint-process';
  } else if (country.includes('Texas')) {
    query = 'Public Utility Commission of Texas PUCT Rule 25.28 underbilling 6 months electricity meter';
    defaultTitle = 'PUCT Substantive Rule §25.28 (Bill Payment and Adjustments)';
    defaultClause = 'PUCT §25.28(h)';
    fallbackUrl = 'https://www.puc.texas.gov/consumer/complaints/complaint.aspx';
  } else {
    query = `${country} energy regulator back-billing limit electricity utility law`;
    defaultTitle = `${country} Statutory Utility Regulation`;
    defaultClause = 'Statutory Utility Code';
    fallbackUrl = null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(TAVILY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: 'advanced',
        include_answer: true,
        max_results: 3
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`Tavily API returned HTTP status ${response.status}`);
      return {
        verified: false,
        jurisdiction: country,
        title: 'Unverified Regulatory Status',
        summary: `Search service returned HTTP error (${response.status}). Could not verify live back-billing regulations.`,
        sourceUrl: null,
        fallbackReason: `HTTP_${response.status}`
      };
    }

    const data = await response.json();
    const results = data.results || [];

    if (results.length === 0) {
      return {
        verified: false,
        jurisdiction: country,
        title: 'Unverified Regulatory Status',
        summary: `No verified statutory back-billing regulations found for ${country}. Analysis paused to prevent guesswork.`,
        sourceUrl: null,
        fallbackReason: 'No search results found'
      };
    }

    // Best matching result
    const topResult = results[0];

    return {
      verified: true,
      jurisdiction: country,
      title: defaultTitle,
      summary: data.answer || topResult.content || `Statutory protections restrict the recovery of unbilled historical charges beyond the statutory window.`,
      clauseReference: defaultClause,
      sourceUrl: topResult.url || fallbackUrl
    };

  } catch (err) {
    console.error('Error querying Tavily API:', err.message);
    return {
      verified: false,
      jurisdiction: country,
      title: 'Unverified Regulatory Status',
      summary: `Could not retrieve verified back-billing regulations due to network or timeout error (${err.message}). Analysis paused to prevent guesswork.`,
      sourceUrl: null,
      fallbackReason: err.name === 'AbortError' ? 'Search request timed out' : err.message
    };
  }
}
