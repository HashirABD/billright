/**
 * Physical Meter Dial / Display OCR & Discrepancy Verification Engine
 * Uses Gemini Vision with Model Fallback to extract exact physical consumption indices
 * from photographs of electric/gas meters (digital LCD or analog rotating dials).
 */

import { GoogleGenAI } from '@google/genai';
import { executeWithModelFallback } from './geminiFallback.js';

/**
 * Extracts meter reading and serial number from a physical meter photograph.
 * 
 * @param {Object} params
 * @param {string} params.fileData - Base64 data URL
 * @param {string} params.mimeType - e.g. 'image/jpeg', 'image/png'
 * @param {Object} [params.aiInstance] - Optional injected GoogleGenAI instance (for unit testing)
 * @returns {Promise<Object>}
 */
export async function extractMeterReading({ fileData, mimeType, aiInstance } = {}) {
  if (!fileData) {
    throw new Error('fileData is required');
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!aiInstance && (!apiKey || apiKey === 'your_gemini_key_here')) {
    throw new Error('GEMINI_API_KEY is not configured. Please enter the values manually.');
  }

  // Strip Data URL prefix if present
  let base64Clean = fileData;
  if (base64Clean.includes(';base64,')) {
    base64Clean = base64Clean.split(';base64,')[1];
  }

  try {
    const ai = aiInstance || new GoogleGenAI({ apiKey });

    const prompt = `You are a utility meter inspection auditor. Analyze this photograph of an electric or gas utility meter.

Extract the physical cumulative consumption index and identification details.
Be extremely careful:
1. Identify meterType: e.g. "Digital LCD Display", "Mechanical Rotating Dial", or "Clockwork Dial Register".
2. Extract the readingValue as a number representing the current physical index (ignore any red decimal digits or final fractional dial if present).
3. Extract unit (e.g. "kWh", "m³", or "ft³").
4. Extract the Meter Serial Number (MSN) if visible on the faceplate or barcode label, or null if not visible.
5. Provide a brief 1-sentence verification observation in "notes".

Return ONLY a JSON object with this exact schema:
{
  "meterType": "Meter Type Name",
  "readingValue": 0.00,
  "unit": "kWh",
  "serialNumber": "Serial Number or null",
  "confidence": "high | medium | low",
  "notes": "Observation details"
}`;

    const { result: response } = await executeWithModelFallback({
      isVision: true,
      timeoutMs: 20000,
      label: 'meterExtractor',
      execute: (targetModel) => ai.models.generateContent({
        model: targetModel,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Clean,
                  mimeType: mimeType || 'image/jpeg'
                }
              }
            ]
          }
        ],
        config: {
          temperature: 0.0,
          responseMimeType: 'application/json'
        }
      })
    });

    const parsed = JSON.parse(response.text);

    const numValue = typeof parsed.readingValue === 'number'
      ? parsed.readingValue
      : parseFloat(String(parsed.readingValue).replace(/[^0-9.]/g, ''));

    if (isNaN(numValue)) {
      throw new Error('Could not identify a numeric meter reading from the photograph.');
    }

    return {
      meterType: parsed.meterType || 'Utility Meter',
      readingValue: numValue,
      unit: parsed.unit || 'kWh',
      serialNumber: parsed.serialNumber && parsed.serialNumber !== 'null' ? parsed.serialNumber : null,
      confidence: parsed.confidence || 'medium',
      notes: parsed.notes || 'Meter reading attached as supporting evidence.'
    };

  } catch (err) {
    console.error('Gemini meter extraction failed:', err.message);
    if (err.isQuota) {
      throw err;
    }
    throw new Error(err.message || 'Could not read this file. Please enter the values manually.');
  }
}
