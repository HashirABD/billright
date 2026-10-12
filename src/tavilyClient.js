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
  if (country === 'United Kingdom') {
    query = 'Ofgem Standard Licence Condition 21BA back-billing electricity 12 months rule site:ofgem.gov.uk OR site:citizensadvice.org.uk OR site:legislation.gov.uk';
  } else {
    query = `${country} energy regulator back-billing limit electricity utility law`;
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
    const isUK = country === 'United Kingdom';

    return {
      verified: true,
      jurisdiction: country,
      title: isUK 
        ? 'Ofgem Standard Licence Condition 21BA (Back-billing Principle)'
        : topResult.title || `${country} Energy Regulatory Guideline`,
      summary: data.answer || topResult.content || 'Suppliers cannot bill domestic or microbusiness customers for energy consumed more than 12 months prior to the bill date unless the customer behaved obstructively.',
      clauseReference: isUK ? 'SLC 21BA' : 'Statutory Utility Code',
      sourceUrl: topResult.url || 'https://www.ofgem.gov.uk/information-consumers/energy-advice-households/check-energy-back-billing-rules'
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
