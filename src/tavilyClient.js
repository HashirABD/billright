/**
 * Tavily Search API client for live energy regulatory retrieval.
 * Grounds analysis in actual regulator rules (e.g. Ofgem SLC 21BA).
 * Provides robust built-in fallback citations when live search is unavailable.
 */

const TAVILY_ENDPOINT = 'https://api.tavily.com/search';

export const BUILT_IN_CITATIONS = {
  'United Kingdom': {
    title: 'Ofgem Standard Licence Condition 21BA (Back-billing Principle)',
    clauseReference: 'SLC 21BA',
    summary: 'Under Ofgem Standard Licence Condition 21BA, suppliers cannot demand payment for energy consumed more than 12 months prior to the bill date where the customer has not been previously billed.',
    sourceUrl: 'https://www.ofgem.gov.uk/node/114480'
  },
  'Australia': {
    title: 'NERR Rule 30 (Undercharging in NERR States; Victoria Not Covered)',
    clauseReference: 'NERR Rule 30',
    summary: 'Under National Energy Retail Rules (NERR) Rule 30, energy retailers recovering historical undercharges are strictly capped at a maximum of 9 months prior to notification.',
    sourceUrl: 'https://www.aer.gov.au/consumers/energy-bills-and-charges/billing-problems-and-disputes'
  },
  'United States (California)': {
    title: 'PG&E Electric Rule 17.1 (equivalent tariff rules apply for SCE/SDG&E)',
    clauseReference: 'PG&E Electric Rule 17.1',
    summary: 'Under PG&E Electric Rule 17.1 (and equivalent CPUC tariff rules for SCE/SDG&E), adjustment of residential bills for billing errors where the customer was not at fault is restricted to 3 months.',
    sourceUrl: 'https://www.cpuc.ca.gov/consumer-support/file-a-complaint/utility-complaint-process'
  },
  'United States (Texas)': {
    title: 'PUCT §25.28(d) (electric utilities); §25.480(e) for retail electric providers',
    clauseReference: 'PUCT §25.28(d) / §25.480(e)',
    summary: 'For electric utilities under PUCT §25.28(d), underbilling adjustments are limited to 6 months counted from the date the error was discovered. For retail electric providers, the limit under §25.480(e) must be verified with the PUCT.',
    sourceUrl: 'https://www.puc.texas.gov/consumer/complaints/complaint.aspx'
  },
  'Other Country': {
    title: 'Provisional Benchmark (Unverified Jurisdiction)',
    clauseReference: 'Provisional Limit (Unverified)',
    summary: 'Statutory protections vary significantly by jurisdiction. The 12-month limit shown is a provisional benchmark and must be verified with your regional energy regulator.',
    sourceUrl: null
  }
};

/**
 * Returns built-in statutory reference when live search is unavailable or fails.
 */
export function getBuiltInCitation(country = 'United Kingdom', fallbackReason = 'Live search unavailable') {
  const matchedKey = Object.keys(BUILT_IN_CITATIONS).find(k =>
    country === k || country.includes(k) || k.includes(country)
  ) || 'Other Country';

  const ref = BUILT_IN_CITATIONS[matchedKey];
  return {
    builtIn: true,
    liveSearch: false,
    jurisdiction: country,
    title: ref.title,
    clauseReference: ref.clauseReference,
    summary: ref.summary,
    sourceUrl: ref.sourceUrl,
    fallbackReason,
    fallbackNotice: 'Live search unavailable. Showing built-in statutory reference. Please verify with the regulator.'
  };
}

/**
 * Searches for official back-billing regulations for a given country.
 * Falls back to built-in citations if Tavily key is missing or search fails.
 * 
 * @param {string} country - Target country name
 * @returns {Promise<Object>} Regulation metadata object
 */
export async function searchRegulations(country = 'United Kingdom') {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey || apiKey === 'your_tavily_key_here') {
    console.warn('⚠️ TAVILY_API_KEY missing or placeholder. Using built-in citations.');
    return getBuiltInCitation(country, 'Missing or placeholder TAVILY_API_KEY');
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
    fallbackUrl = 'https://www.ofgem.gov.uk/node/114480';
  } else if (country === 'Australia') {
    query = 'National Energy Retail Rules NERR Rule 30 undercharging 9 months energy retail rules site:aer.gov.au OR site:energyombudsman.com.au';
    defaultTitle = 'NERR Rule 30 (Undercharging in NERR States; Victoria Not Covered)';
    defaultClause = 'NERR Rule 30';
    fallbackUrl = 'https://www.aer.gov.au/consumers/energy-bills-and-charges/billing-problems-and-disputes';
  } else if (country.includes('California')) {
    query = 'PG&E Electric Rule 17.1 underbilling 3 months residential utility tariff site:cpuc.ca.gov';
    defaultTitle = 'PG&E Electric Rule 17.1 (equivalent tariff rules apply for SCE/SDG&E)';
    defaultClause = 'PG&E Electric Rule 17.1';
    fallbackUrl = 'https://www.cpuc.ca.gov/consumer-support/file-a-complaint/utility-complaint-process';
  } else if (country.includes('Texas')) {
    query = 'Public Utility Commission of Texas PUCT Rule 25.28(d) 25.480(e) underbilling electricity meter';
    defaultTitle = 'PUCT §25.28(d) (electric utilities); §25.480(e) for retail electric providers';
    defaultClause = 'PUCT §25.28(d) / §25.480(e)';
    fallbackUrl = 'https://www.puc.texas.gov/consumer/complaints/complaint.aspx';
  } else {
    query = `${country} energy regulator back-billing limit electricity utility law`;
    defaultTitle = `${country} Provisional Placeholder`;
    defaultClause = 'Provisional Limit (Unverified)';
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
      console.warn(`Tavily API returned HTTP status ${response.status}. Using built-in fallback.`);
      return getBuiltInCitation(country, `HTTP_${response.status}`);
    }

    const data = await response.json();
    const results = data.results || [];

    if (results.length === 0) {
      console.warn('No search results returned from Tavily. Using built-in fallback.');
      return getBuiltInCitation(country, 'No search results found');
    }

    // Best matching result
    const topResult = results[0];

    return {
      builtIn: false,
      liveSearch: true,
      jurisdiction: country,
      title: defaultTitle,
      summary: data.answer || topResult.content || 'Statutory protections restrict the recovery of unbilled historical charges beyond the statutory window.',
      clauseReference: defaultClause,
      sourceUrl: topResult.url || fallbackUrl
    };

  } catch (err) {
    console.warn(`Error querying Tavily API (${err.message}). Using built-in fallback.`);
    return getBuiltInCitation(country, err.name === 'AbortError' ? 'Search request timed out' : err.message);
  }
}
