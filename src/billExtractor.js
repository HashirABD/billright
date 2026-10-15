/**
 * Multimodal Bill Extractor using Gemini Vision.
 * Extracts bill issue date, billing periods, amounts, and reading types
 * from electricity bill PDFs and images.
 */

import { GoogleGenAI } from '@google/genai';

/**
 * Extracts structured bill metadata and line items from a base64 encoded document.
 * 
 * @param {Object} params
 * @param {string} params.fileData - Base64 encoded file string
 * @param {string} params.mimeType - MIME type (e.g. 'application/pdf', 'image/png', 'image/jpeg')
 * @returns {Promise<Object>} Extracted bill information
 */
export async function extractBillData({ fileData, mimeType }) {
  if (!fileData) {
    throw new Error('fileData (base64 string) is required');
  }
  if (!mimeType) {
    throw new Error('mimeType is required');
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_key_here') {
    throw new Error('GEMINI_API_KEY is not configured. Please enter the values manually.');
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

  const prompt = `You are a forensic utility bill extraction assistant.
Analyze this energy/electricity bill document (PDF or image).
Extract the essential billing details with strict precision into a valid JSON object.

EXTRACTION INSTRUCTIONS:
1. "billDate": The official bill issue date or statement date (format: YYYY-MM-DD). If no clear issue date exists, use the latest period end date.
2. "isEstimated": Boolean true if any readings or earlier bills are marked as "Estimated", "Estimate", or "E", otherwise false.
3. "currency": The currency symbol used on the bill ("£", "A$", or "$").
4. "billingPeriods": An array of one or more distinct consumption periods listed on the bill:
   - "startDate": Start date of the period (YYYY-MM-DD).
   - "endDate": End date of the period (YYYY-MM-DD).
   - "amount": Monetary amount for this specific period as a positive number (float). Do NOT include currency symbols.
5. "supplierName": Name of the energy supplier or utility company if visible, or null.
6. "accountNumber": Account number or customer reference if visible, or null.

STRICT JSON OUTPUT FORMAT:
{
  "billDate": "YYYY-MM-DD",
  "isEstimated": false,
  "currency": "£",
  "supplierName": "Supplier Name",
  "accountNumber": "Reference",
  "billingPeriods": [
    {
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "amount": 0.00
    }
  ]
}`;

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Clean base64 data prefix if present (e.g., data:image/png;base64,...)
    const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, '');

    const generatePromise = ai.models.generateContent({
      model: modelName,
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64
          }
        },
        prompt
      ],
      config: {
        temperature: 0.0,
        responseMimeType: 'application/json'
      }
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini Vision API call timed out after 20 seconds')), 20000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);

    const parsed = JSON.parse(response.text);

    // Validate and sanitize parsed extraction
    if (!parsed.billDate) {
      throw new Error('Could not identify a bill date in the document. Please enter the values manually.');
    }

    if (!Array.isArray(parsed.billingPeriods) || parsed.billingPeriods.length === 0) {
      throw new Error('Could not find itemized billing periods in the document. Please enter the values manually.');
    }

    // Sanitize period numbers
    parsed.billingPeriods = parsed.billingPeriods.map((p, i) => {
      const amt = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount).replace(/[^0-9.]/g, ''));
      if (isNaN(amt) || amt <= 0) {
        throw new Error(`Period ${i + 1} has an invalid charge amount: ${p.amount}`);
      }
      return {
        startDate: p.startDate,
        endDate: p.endDate,
        amount: Math.round(amt * 100) / 100
      };
    });

    return parsed;

  } catch (err) {
    console.error('Gemini Vision extraction call failed:', err.message);
    throw new Error(err.message || 'Could not read this file. Please enter the values manually.');
  }
}
