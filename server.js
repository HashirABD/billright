import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { calculateBackBilling } from './src/calculateBackBilling.js';
import { searchRegulations } from './src/tavilyClient.js';
import { evaluateExceptionsAndFormatLetter } from './src/llmClient.js';
import { extractBillData } from './src/billExtractor.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BillRight',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Multi-jurisdiction statutory configurations
const JURISDICTION_CONFIGS = {
  'United Kingdom': { lookbackMonths: 12, currency: '£', label: 'United Kingdom (Ofgem SLC 21BA)' },
  'Australia': { lookbackMonths: 9, currency: 'A$', label: 'Australia (AER Rule 30)' },
  'United States (California)': { lookbackMonths: 3, currency: '$', label: 'United States - California (CPUC Rule 17.1)' },
  'United States (Texas)': { lookbackMonths: 6, currency: '$', label: 'United States - Texas (PUCT §25.28)' },
  'Other Country': { lookbackMonths: 12, currency: '$', label: 'Other Country (Statutory Window)' }
};

// Multimodal bill extraction endpoint using Gemini Vision
app.post('/api/extract-bill', async (req, res) => {
  try {
    const { fileData, mimeType } = req.body;
    if (!fileData || !mimeType) {
      return res.status(400).json({
        error: 'fileData (base64) and mimeType are required'
      });
    }

    const extracted = await extractBillData({ fileData, mimeType });
    return res.json(extracted);

  } catch (err) {
    console.error('Error handling /api/extract-bill:', err.message);
    return res.status(400).json({
      error: err.message
    });
  }
});

// Single unified analysis endpoint coordinating the 3-stage engine
app.post('/api/analyze', async (req, res) => {
  try {
    const {
      country = 'United Kingdom',
      billDate,
      billingPeriods,
      isEstimated = false,
      isMeterObstructed = false,
      lookbackMonths: customLookbackMonths,
      currency: customCurrency
    } = req.body;

    // 1. Client input validation
    if (!billDate) {
      return res.status(400).json({
        error: 'billDate is required (YYYY-MM-DD)'
      });
    }

    if (!Array.isArray(billingPeriods) || billingPeriods.length === 0) {
      return res.status(400).json({
        error: 'billingPeriods must be a non-empty array'
      });
    }

    const config = JURISDICTION_CONFIGS[country] || {
      lookbackMonths: 12,
      currency: '$',
      label: country
    };

    const lookbackMonths = typeof customLookbackMonths === 'number' ? customLookbackMonths : config.lookbackMonths;
    const currency = customCurrency || config.currency;

    // 2. Stage 1: Deterministic Mathematical Calculation
    const mathResult = calculateBackBilling({
      billDate,
      billingPeriods,
      lookbackMonths,
      currency
    });

    // 3. Stage 2: Live Regulatory Retrieval (Tavily)
    const regulation = await searchRegulations(country);

    // 4. Stage 3: Constrained Exception Evaluation & Letter Formatting (Gemini)
    const evaluation = await evaluateExceptionsAndFormatLetter({
      isMeterObstructed: Boolean(isMeterObstructed),
      isEstimated: Boolean(isEstimated),
      disputableTotal: mathResult.disputableTotal,
      totalBilled: mathResult.totalBilled,
      billDate: mathResult.billDate,
      cutOffDate: mathResult.cutOffDate,
      regulation,
      currency,
      lookbackMonths
    });

    // 5. Final unified response payload matching spec.md
    return res.json({
      verdict: evaluation.verdict,
      badgeType: evaluation.badgeType,
      disputableTotal: mathResult.disputableTotal,
      totalBilled: mathResult.totalBilled,
      cutOffDate: mathResult.cutOffDate,
      lookbackMonths,
      currency,
      itemizedBreakdown: mathResult.itemizedBreakdown,
      regulation,
      exceptionTriggered: evaluation.exceptionTriggered,
      exceptionNotes: evaluation.exceptionNotes,
      disputeLetter: evaluation.disputeLetter
    });

  } catch (err) {
    console.error('Error handling /api/analyze request:', err.message);
    return res.status(400).json({
      error: err.message
    });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`⚡ BillRight server running at http://localhost:${PORT}`);
  });
}

export default app;
