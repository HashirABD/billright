/**
 * Shared dispute letter sanitizer for BillRight (Client / Browser runtime).
 * Applied across all output paths: Gemini-generated letters, template fallback letters,
 * UI preview, clipboard copy, mailto/Gmail/Outlook compose bodies, and PDFKit rendering.
 */

function isUrlOrDomain(str) {
  if (!str || typeof str !== 'string') return false;
  const s = str.trim();
  if (/^https?:\/\//i.test(s)) return true;
  if (/^www\./i.test(s)) return true;
  if (/^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:\/[^\s]*)?$/i.test(s)) return true;
  return false;
}

export function sanitizeDisputeLetter(text, isMeterObstructed = false) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text;

  // 1. Convert markdown links: [text](url) -> 'text' (if text is URL/domain) or 'text (url)'
  cleaned = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, linkUrl) => {
    const t = linkText.trim();
    const u = linkUrl.trim();
    if (isUrlOrDomain(t)) {
      return t;
    }
    return `${t} (${u})`;
  });

  // 2. Remove stray double parentheses ((...)) -> (...)
  while (/\(\s*\(([^\(\)]+)\)\s*\)/.test(cleaned)) {
    cleaned = cleaned.replace(/\(\s*\(([^\(\)]+)\)\s*\)/g, '($1)');
  }
  cleaned = cleaned.replace(/\(\s*([^\(\)]*?)\s*\(\s*([^\(\)]+)\s*\)\s*\)/g, '$1 ($2)');

  // 3. Ombudsman website must appear only as bare text www.energyombudsman.org with no brackets, no parentheses and no https prefix
  cleaned = cleaned.replace(/Energy\s+Ombudsman\s*[\(\[]\s*(?:https?:\/\/)?(?:www\.)?energyombudsman\.org[^\)\]]*[\)\]]/gi, 'Energy Ombudsman, www.energyombudsman.org');
  cleaned = cleaned.replace(/[\(\[]\s*(?:https?:\/\/)?(?:www\.)?energyombudsman\.org[^\)\]]*[\)\]]/gi, 'www.energyombudsman.org');
  cleaned = cleaned.replace(/(?:https?:\/\/)(?:www\.)?energyombudsman\.org(?:\/[^\s\)\],.]*)?/gi, 'www.energyombudsman.org');
  cleaned = cleaned.replace(/[\(\[]\s*www\.energyombudsman\.org\s*[\)\]]/gi, 'www.energyombudsman.org');

  // 4. Strip other Markdown artifacts (bold, italic, # headings, backticks)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  cleaned = cleaned.replace(/`+([^`]+)`+/g, '$1');
  cleaned = cleaned.replace(/`/g, '');
  cleaned = cleaned.replace(/\*\*\*([^*]+)\*\*\*/g, '$1');
  cleaned = cleaned.replace(/___([^_]+)___/g, '$1');
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/(^|[^*])\*([^*\n]+)\*([^*]|$)/g, '$1$2$3');
  cleaned = cleaned.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;!?]|$)/g, '$1$2');
  cleaned = cleaned.replace(/\*/g, '');

  // 5. Unverified legal precedents claim removal
  cleaned = cleaned.replace(/In accordance with published regulatory precedents,\s*the retailer bears responsibility for timely billing\./gi, '');

  // 6. Additional Reference block removal
  cleaned = cleaned.replace(/\n*Additional Reference:[\s\S]*?(?=\n\n[A-Z]|\n*$)/gi, '');
  cleaned = cleaned.replace(/Note: Retrieved by search, not verified/gi, '');

  // 7. Meter obstruction statement handling
  if (isMeterObstructed) {
    cleaned = cleaned.replace(/I (?:confirm|expressly confirm) that I have (?:not acted obstructively or |never )?prevented meter (?:reader )?access(?: at any time)?(?:, and (?:earlier|previous) (?:bills|statements) were based on estimated rather than actual readings)?\./gi, '');
  }

  // 8. UK rule wording: replace where the customer has not been previously billed with where the delay or error was the supplier's responsibility
  cleaned = cleaned.replace(/where the customer has not been (?:previously )?billed(?: previously)?(?: and has not obstructed meter access)?/gi, "where the delay or error was the supplier's responsibility");
  cleaned = cleaned.replace(/where previous accurate billing was not provided/gi, "where the delay or error was the supplier's responsibility");

  // 9. Clean up spacing, trailing punctuation glitches, and blank lines
  cleaned = cleaned.replace(/Energy\s+Ombudsman\s*,?\s*www\.energyombudsman\.org/gi, 'Energy Ombudsman, www.energyombudsman.org');
  cleaned = cleaned.replace(/,\s*,/g, ',');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

if (typeof window !== 'undefined') {
  window.sanitizeDisputeLetter = sanitizeDisputeLetter;
}
if (typeof globalThis !== 'undefined') {
  globalThis.sanitizeDisputeLetter = sanitizeDisputeLetter;
}
