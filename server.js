import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { calculateBackBilling } from './src/calculateBackBilling.js';
import { searchRegulations } from './src/tavilyClient.js';
import { evaluateExceptionsAndFormatLetter } from './src/llmClient.js';
import { extractBillData } from './src/billExtractor.js';
import { generateLegalPacketPdf } from './src/pdfGenerator.js';
import { getSupplierContact } from './src/supplierDirectory.js';
import { extractMeterReading } from './src/meterExtractor.js';
import { sanitizeDisputeLetter } from './src/letterSanitizer.js';

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
// TODO verify REP limit in 16 TAC 25.480(e)
const JURISDICTION_CONFIGS = {
  'United Kingdom': {
    lookbackMonths: 12,
    currency: '£',
    label: 'United Kingdom (Ofgem SLC 21BA)'
  },
  'Australia': {
    lookbackMonths: 9,
    currency: 'A$',
    label: 'Australia (NERR Rule 30, 9 Mos)' // Scope: NERR participating states, e.g. NSW, QLD, SA. Note: Victoria has its own code and is not covered.
  },
  'United States (California)': {
    lookbackMonths: 3,
    currency: '$',
    label: 'United States - California (PG&E Rule 17.1, 3 Mos)' // Residential undercharges due to billing error only, 3 months.
  },
  'United States (Texas)': {
    lookbackMonths: 6,
    currency: '$',
    label: 'United States - Texas (PUCT §25.28(d), 6 Mos)' // Electric utilities (§25.28(d)): 6 months from error discovery; limit under §25.480(e) must be verified with the PUCT.
  },
  'Other Country': {
    lookbackMonths: 12,
    currency: '$',
    label: 'Other Country (Provisional Placeholder - Must Be Verified)'
  }
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

// Physical meter photo OCR & inspection endpoint using Gemini Vision
app.post('/api/extract-meter', async (req, res) => {
  try {
    const { fileData, mimeType } = req.body;
    if (!fileData) {
      return res.status(400).json({
        error: 'fileData (base64) is required'
      });
    }

    const meterData = await extractMeterReading({ fileData, mimeType });
    return res.json(meterData);

  } catch (err) {
    console.error('Error handling /api/extract-meter:', err.message);
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
      australiaState = '',
      billDate,
      billingPeriods,
      isEstimated = false,
      isMeterObstructed = false,
      lookbackMonths: customLookbackMonths,
      currency: customCurrency,
      consumerName,
      supplierName,
      accountNumber,
      supplyAddress,
      noticeDate
    } = req.body;

    // Australia: Block Victoria audits
    if (country === 'Australia' && String(australiaState).toUpperCase() === 'VIC') {
      return res.status(400).json({
        error: 'Victoria has its own code; this tool does not cover it'
      });
    }

    // 1. Client input validation
    if (!consumerName || !supplierName || !accountNumber || !supplyAddress) {
      return res.status(400).json({
        error: 'consumerName, supplierName, accountNumber, and supplyAddress are required'
      });
    }

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

    // 4. Resolve verified supplier contact before formatting letter
    const supplierContact = getSupplierContact(supplierName, country, australiaState);
    const resolvedSupplierEmail = req.body.supplierEmail || supplierContact.email;

    // 5. Stage 3: Constrained Exception Evaluation & Letter Formatting (Gemini)
    const evaluation = await evaluateExceptionsAndFormatLetter({
      isMeterObstructed: Boolean(isMeterObstructed),
      isEstimated: Boolean(isEstimated),
      disputableTotal: mathResult.disputableTotal,
      totalBilled: mathResult.totalBilled,
      billDate: mathResult.billDate,
      cutOffDate: mathResult.cutOffDate,
      regulation,
      currency,
      lookbackMonths,
      consumerName,
      supplierName,
      accountNumber,
      supplyAddress,
      noticeDate,
      country,
      supplierEmail: resolvedSupplierEmail,
      supplierContact,
      state: australiaState
    });

    console.log(`[/api/analyze] Dispute letter produced by: ${evaluation.letterSource || 'Template'}`);

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
      disputeLetter: evaluation.disputeLetter ? sanitizeDisputeLetter(evaluation.disputeLetter, Boolean(isMeterObstructed)) : null,
      letterSource: evaluation.letterSource || 'Template',
      consumerName,
      supplierName,
      accountNumber,
      supplyAddress,
      supplierContact,
      supplierEmail: resolvedSupplierEmail,
      australiaState,
      billDate,
      noticeDate: evaluation.noticeDate || noticeDate
    });

  } catch (err) {
    console.error('Error handling /api/analyze request:', err.message);
    return res.status(400).json({
      error: err.message
    });
  }
});

// Official Multi-Page Dispute Packet (draft) Generator Endpoint (PDF Engine)
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const {
      consumerName,
      supplierName,
      accountNumber,
      supplyAddress,
      country = 'United Kingdom',
      australiaState = '',
      billDate,
      cutOffDate,
      noticeDate,
      lookbackMonths = 12,
      currency = '£',
      disputableTotal = 0,
      totalBilled = 0,
      itemizedBreakdown = [],
      regulation = {},
      isEstimated = false,
      isMeterObstructed = false,
      disputeLetter = '',
      meterEvidence = null,
      supplierEmail,
      supplierContact: passedContact
    } = req.body;

    if (!consumerName || !supplierName || !accountNumber || !supplyAddress) {
      return res.status(400).json({
        error: 'consumerName, supplierName, accountNumber, and supplyAddress are required'
      });
    }

    if (!billDate || !cutOffDate) {
      return res.status(400).json({
        error: 'billDate and cutOffDate are required to generate legal packet'
      });
    }

    const supplierContact = passedContact || getSupplierContact(supplierName, country, australiaState);
    const resolvedEmail = supplierEmail || supplierContact.email;

    const pdfBuffer = await generateLegalPacketPdf({
      consumerName,
      supplierName,
      accountNumber,
      supplyAddress,
      country,
      australiaState,
      billDate,
      cutOffDate,
      noticeDate,
      lookbackMonths,
      currency,
      disputableTotal,
      totalBilled,
      itemizedBreakdown,
      regulation,
      isEstimated,
      isMeterObstructed,
      disputeLetter: disputeLetter ? sanitizeDisputeLetter(disputeLetter, Boolean(isMeterObstructed)) : '',
      meterEvidence,
      supplierEmail: resolvedEmail,
      supplierContact
    });

    const safeRef = (accountNumber || 'Reference').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `BillRight_Dispute_Packet_Draft_${safeRef}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);

  } catch (err) {
    console.error('Error generating PDF packet:', err.message);
    return res.status(500).json({
      error: `Failed to generate PDF legal packet: ${err.message}`
    });
  }
});

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`⚡ BillRight server running at http://localhost:${PORT}`);
  });
}

export default app;
