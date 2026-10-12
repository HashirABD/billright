import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { calculateBackBilling } from './src/calculateBackBilling.js';
import { searchRegulations } from './src/tavilyClient.js';
import { evaluateExceptionsAndFormatLetter } from './src/llmClient.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
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

// Single unified analysis endpoint coordinating the 3-stage engine
app.post('/api/analyze', async (req, res) => {
  try {
    const {
      country = 'United Kingdom',
      billDate,
      billingPeriods,
      isEstimated = false,
      isMeterObstructed = false
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

    // 2. Stage 1: Deterministic Mathematical Calculation
    const mathResult = calculateBackBilling({
      billDate,
      billingPeriods
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
      regulation
    });

    // 5. Final unified response payload matching spec.md
    return res.json({
      verdict: evaluation.verdict,
      badgeType: evaluation.badgeType,
      disputableTotal: mathResult.disputableTotal,
      totalBilled: mathResult.totalBilled,
      cutOffDate: mathResult.cutOffDate,
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
