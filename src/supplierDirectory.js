/**
 * Directory of verified utility supplier complaints departments,
 * statutory escalation contacts, and ombudsman pathways.
 */

export const SUPPLIER_DIRECTORY = {
  // --- United Kingdom (Ofgem regulated) ---
  'british gas': {
    name: 'British Gas',
    country: 'United Kingdom',
    email: 'complaints@britishgas.co.uk',
    phone: '0333 202 9802',
    portalUrl: 'https://www.britishgas.co.uk/complaints',
    ombudsman: 'Energy Ombudsman (www.energyombudsman.org)'
  },
  'octopus energy': {
    name: 'Octopus Energy',
    country: 'United Kingdom',
    email: 'complaints@octopus.energy',
    phone: '0808 164 1088',
    portalUrl: 'https://octopus.energy/unhappy',
    ombudsman: 'Energy Ombudsman (www.energyombudsman.org)'
  },
  'e.on': {
    name: 'E.ON Next',
    country: 'United Kingdom',
    email: 'complaints@eonnext.com',
    phone: '0808 501 5200',
    portalUrl: 'https://www.eonnext.com/complaints',
    ombudsman: 'Energy Ombudsman (www.energyombudsman.org)'
  },
  'e.on next': {
    name: 'E.ON Next',
    country: 'United Kingdom',
    email: 'complaints@eonnext.com',
    phone: '0808 501 5200',
    portalUrl: 'https://www.eonnext.com/complaints',
    ombudsman: 'Energy Ombudsman (www.energyombudsman.org)'
  },
  'scottish power': {
    name: 'ScottishPower',
    country: 'United Kingdom',
    email: 'contactus@scottishpower.com',
    phone: '0800 027 0072',
    portalUrl: 'https://www.scottishpower.co.uk/complaints',
    ombudsman: 'Energy Ombudsman (www.energyombudsman.org)'
  },
  'edf': {
    name: 'EDF Energy',
    country: 'United Kingdom',
    email: 'customer_complaints@edfenergy.com',
    phone: '0333 200 5100',
    portalUrl: 'https://www.edfenergy.com/for-home/help-support/complaints-process',
    ombudsman: 'Energy Ombudsman (www.energyombudsman.org)'
  },
  'edf energy': {
    name: 'EDF Energy',
    country: 'United Kingdom',
    email: 'customer_complaints@edfenergy.com',
    phone: '0333 200 5100',
    portalUrl: 'https://www.edfenergy.com/for-home/help-support/complaints-process',
    ombudsman: 'Energy Ombudsman (www.energyombudsman.org)'
  },
  'ovo energy': {
    name: 'OVO Energy',
    country: 'United Kingdom',
    email: 'complaints@ovoenergy.com',
    phone: '0330 303 5063',
    portalUrl: 'https://www.ovoenergy.com/feedback',
    ombudsman: 'Energy Ombudsman (www.energyombudsman.org)'
  },

  // --- Australia (AER / EWON / EWOV regulated) ---
  'origin energy': {
    name: 'Origin Energy',
    country: 'Australia',
    email: 'disputes@originenergy.com.au',
    phone: '13 24 61',
    portalUrl: 'https://www.originenergy.com.au/complaints',
    ombudsman: 'Energy and Water Ombudsman (EWON / EWOV)'
  },
  'agl': {
    name: 'AGL Energy',
    country: 'Australia',
    email: 'complaints@agl.com.au',
    phone: '131 245',
    portalUrl: 'https://www.agl.com.au/help-support/complaints',
    ombudsman: 'Energy and Water Ombudsman (EWON / EWOV)'
  },
  'agl energy': {
    name: 'AGL Energy',
    country: 'Australia',
    email: 'complaints@agl.com.au',
    phone: '131 245',
    portalUrl: 'https://www.agl.com.au/help-support/complaints',
    ombudsman: 'Energy and Water Ombudsman (EWON / EWOV)'
  },
  'energyaustralia': {
    name: 'EnergyAustralia',
    country: 'Australia',
    email: 'complaints@energyaustralia.com.au',
    phone: '133 466',
    portalUrl: 'https://www.energyaustralia.com.au/complaints',
    ombudsman: 'Energy and Water Ombudsman (EWON / EWOV)'
  },
  'red energy': {
    name: 'Red Energy',
    country: 'Australia',
    email: 'enquiries@redenergy.com.au',
    phone: '131 806',
    portalUrl: 'https://www.redenergy.com.au/complaints',
    ombudsman: 'Energy and Water Ombudsman (EWON / EWOV)'
  },

  // --- United States (CPUC / PUCT regulated) ---
  'pacific gas and electric': {
    name: 'Pacific Gas and Electric (PG&E)',
    country: 'United States (California)',
    email: 'regulatorycomplaints@pge.com',
    phone: '1-800-743-5000',
    portalUrl: 'https://www.pge.com',
    ombudsman: 'California Public Utilities Commission (CPUC)'
  },
  'pg&e': {
    name: 'Pacific Gas and Electric (PG&E)',
    country: 'United States (California)',
    email: 'regulatorycomplaints@pge.com',
    phone: '1-800-743-5000',
    portalUrl: 'https://www.pge.com',
    ombudsman: 'California Public Utilities Commission (CPUC)'
  },
  'southern california edison': {
    name: 'Southern California Edison (SCE)',
    country: 'United States (California)',
    email: 'customercare@sce.com',
    phone: '1-800-655-4555',
    portalUrl: 'https://www.sce.com',
    ombudsman: 'California Public Utilities Commission (CPUC)'
  },
  'txu energy': {
    name: 'TXU Energy',
    country: 'United States (Texas)',
    email: 'complaints@txu.com',
    phone: '1-800-818-6132',
    portalUrl: 'https://www.txu.com',
    ombudsman: 'Public Utility Commission of Texas (PUCT)'
  }
};

/**
 * Resolves a country and optional state to its default ombudsman body without "e.g.".
 */
export function getOmbudsmanByCountry(country = 'United Kingdom', state = '') {
  if (country === 'Australia') {
    const s = String(state || '').toUpperCase();
    if (s === 'QLD') return 'Energy and Water Ombudsman Queensland (EWOQ)';
    if (s === 'SA') return 'Energy and Water Ombudsman SA (EWOSA)';
    return 'Energy and Water Ombudsman NSW (EWON)';
  }
  if (country.includes('California')) return 'California Public Utilities Commission (CPUC)';
  if (country.includes('Texas')) return 'Public Utility Commission of Texas (PUCT)';
  return 'Energy Ombudsman (www.energyombudsman.org)';
}

/**
 * Resolves a supplier name to verified contact details with directory matching.
 * Never invents an email address. For 'Example Energy Ltd', uses reserved complaints@example.com.
 * For unknown suppliers not in the directory, returns email: null.
 * 
 * @param {string} supplierName 
 * @param {string} country 
 * @param {string} [state]
 * @returns {Object}
 */
export function getSupplierContact(supplierName = '', country = 'United Kingdom', state = '') {
  const normalized = supplierName.trim().toLowerCase();
  const ombudsmanBody = getOmbudsmanByCountry(country, state);

  // Fictional demo suppliers: reserved address complaints@example.com
  if (
    normalized === 'example energy ltd' ||
    normalized === 'example energy pty ltd' ||
    normalized === 'example utility co' ||
    normalized.includes('example energy') ||
    normalized.includes('example utility')
  ) {
    return {
      name: supplierName.trim() || 'Example Energy Ltd',
      country: country || 'United Kingdom',
      email: 'complaints@example.com',
      isDemo: true,
      demoLabel: 'demo address',
      isDirectory: false,
      isUnknown: false,
      phone: '',
      portalUrl: '',
      ombudsman: ombudsmanBody
    };
  }

  // Exact directory match
  if (SUPPLIER_DIRECTORY[normalized]) {
    const entry = SUPPLIER_DIRECTORY[normalized];
    return {
      ...entry,
      ombudsman: country === 'Australia' ? ombudsmanBody : entry.ombudsman,
      isDemo: false,
      isDirectory: true,
      isUnknown: false
    };
  }

  // Substring directory match
  for (const [key, value] of Object.entries(SUPPLIER_DIRECTORY)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return {
        ...value,
        ombudsman: country === 'Australia' ? ombudsmanBody : value.ombudsman,
        isDemo: false,
        isDirectory: true,
        isUnknown: false
      };
    }
  }

  // Non-directory unknown supplier: NEVER invent an email address
  const safeName = supplierName.trim() || 'Energy Supplier';
  return {
    name: safeName,
    country,
    email: null,
    isDemo: false,
    isDirectory: false,
    isUnknown: true,
    phone: '',
    portalUrl: '',
    ombudsman: ombudsmanBody
  };
}

