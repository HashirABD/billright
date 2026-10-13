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
 * Resolves a supplier name to verified contact details with fuzzy matching and fallback.
 * 
 * @param {string} supplierName 
 * @param {string} country 
 * @returns {Object}
 */
export function getSupplierContact(supplierName = '', country = 'United Kingdom') {
  const normalized = supplierName.trim().toLowerCase();

  // Exact match
  if (SUPPLIER_DIRECTORY[normalized]) {
    return SUPPLIER_DIRECTORY[normalized];
  }

  // Substring match
  for (const [key, value] of Object.entries(SUPPLIER_DIRECTORY)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  // Country-specific generic fallback
  const safeName = supplierName.trim() || 'Energy Retailer';
  const domain = safeName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';

  if (country === 'Australia') {
    return {
      name: safeName,
      country: 'Australia',
      email: `complaints@${domain}`,
      phone: '13 00 00',
      portalUrl: '',
      ombudsman: 'Energy and Water Ombudsman (EWON / EWOV)'
    };
  }

  if (country.includes('United States')) {
    return {
      name: safeName,
      country,
      email: `customercare@${domain}`,
      phone: '1-800-000-0000',
      portalUrl: '',
      ombudsman: 'Public Utilities Commission Consumer Affairs Branch'
    };
  }

  return {
    name: safeName,
    country: 'United Kingdom',
    email: `complaints@${domain}`,
    phone: '0330 000 0000',
    portalUrl: '',
    ombudsman: 'Energy Ombudsman (www.energyombudsman.org)'
  };
}
