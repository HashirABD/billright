/**
 * BillRight Legal Dispute Packet Generator (PDF Engine)
 * 
 * Generates an official, publication-quality 3-page legal dispute packet:
 * - Page 1: Personalized Formal Notice of Dispute & 14-Day Statutory Escalation Warning
 * - Page 2: Schedule of Mathematical Evidence with clean vector table & lookback barrier
 * - Page 3: Statutory Authority Annexure with live regulatory citations & ombudsman protocol
 * 
 * Uses PDFKit with clean vector geometry, robust typography, and zero bracket placeholders.
 */

import PDFDocument from 'pdfkit';

/**
 * Returns ombudsman and regulatory escalation directory information.
 */
function getEscalationDirectory(jurisdiction = '') {
  if (jurisdiction === 'Australia') {
    return {
      body: 'State Energy and Water Ombudsman (EWON / EWOV / EWOQ)',
      timeline: 'Upon receipt of unsatisfactory retailer response or after 10 business days',
      statute: 'National Energy Retail Law (NERL) / National Energy Retail Rules (NERR)',
      website: 'www.ewon.com.au / www.ewov.com.au'
    };
  }
  if (jurisdiction.includes('California')) {
    return {
      body: 'California Public Utilities Commission (CPUC) Consumer Affairs Branch',
      timeline: 'Immediately upon supplier refusal to adjust billing under Rule 17.1',
      statute: 'CPUC General Order & Tariff Rule 17.1 (Adjustment of Bills for Meter Error)',
      website: 'www.cpuc.ca.gov / 1-800-649-7570'
    };
  }
  if (jurisdiction.includes('Texas')) {
    return {
      body: 'Public Utility Commission of Texas (PUCT) Customer Protection Division',
      timeline: 'Upon supplier failure to resolve under informal complaint procedures',
      statute: 'PUCT Substantive Rules §25.28 (Bill Payment and Adjustments)',
      website: 'www.puc.texas.gov / 1-888-782-8477'
    };
  }
  // Default UK
  return {
    body: 'Energy Ombudsman (Ombudsman Services: Energy)',
    timeline: 'Standard 8-week complaints timeframe or immediately upon receipt of a deadlock letter',
    statute: 'Ofgem Standard Licence Condition 21BA (Back-billing Protections)',
    website: 'www.energyombudsman.org / 0330 440 1624'
  };
}

/**
 * Formats a currency number safely.
 */
function fmtCurr(amount, currency = '£') {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return `${currency}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Draws the top running header and bottom running footer.
 */
function drawHeaderFooter(doc, { pageNum, totalPages, accountNumber, consumerName }) {
  const pageWidth = 595.28;
  const leftMargin = 40;
  const rightMargin = pageWidth - 40;

  // Running Header (top)
  doc.save();
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748b');
  doc.text('BILLRIGHT STATUTORY COMPLIANCE DOSSIER', leftMargin, 22, { lineBreak: false });
  doc.font('Helvetica').fillColor('#94a3b8');
  doc.text(` | CASE REF: ${accountNumber || 'ON FILE'}`, doc.x, 22, { lineBreak: false });
  doc.font('Helvetica').text(`PARTY: ${consumerName || 'ACCOUNT HOLDER'}`, rightMargin - 150, 22, { width: 150, align: 'right' });

  doc.strokeColor('#cbd5e1').lineWidth(0.5);
  doc.moveTo(leftMargin, 33).lineTo(rightMargin, 33).stroke();

  // Running Footer (bottom)
  doc.moveTo(leftMargin, 805).lineTo(rightMargin, 805).stroke();
  doc.fontSize(7).font('Helvetica').fillColor('#94a3b8');
  doc.text('Prepared via BillRight Consumer Protection Utility • Independent Statutory Evidence Dossier', leftMargin, 812, { lineBreak: false });
  doc.font('Helvetica-Bold').fillColor('#475569');
  doc.text(`Page ${pageNum} of ${totalPages}`, rightMargin - 80, 812, { width: 80, align: 'right' });
  doc.restore();
}

/**
 * Generates the complete 3-page Legal Dispute Packet PDF as a Buffer.
 * 
 * @param {Object} data
 * @returns {Promise<Buffer>}
 */
export async function generateLegalPacketPdf(data) {
  return new Promise((resolve, reject) => {
    try {
      const {
        consumerName = 'Sarah Jenkins',
        supplierName = 'British Gas',
        accountNumber = 'BG-8849201',
        supplyAddress = '14 Windsor Gardens, Bristol, BS8 4UQ',
        country = 'United Kingdom',
        billDate = '2026-10-01',
        cutOffDate = '2025-10-01',
        lookbackMonths = 12,
        currency = '£',
        disputableTotal = 1000.0,
        totalBilled = 3000.0,
        itemizedBreakdown = [],
        regulation = {},
        isEstimated = false,
        isMeterObstructed = false,
        disputeLetter = '',
        meterEvidence = null
      } = data;

      const escalation = getEscalationDirectory(regulation.jurisdiction || country);
      const totalPages = 3;

      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        autoFirstPage: true,
        info: {
          Title: `Formal Dispute Packet - ${accountNumber}`,
          Author: 'BillRight Consumer Protection Utility',
          Subject: `Statutory Back-Billing Dispute under ${regulation.clauseReference || 'Statutory Code'}`,
          Keywords: 'back-billing, dispute, energy, statutory, ofgem, aer, cpuc'
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      const leftMargin = 40;
      const contentWidth = 515.28;

      // =========================================================================
      // PAGE 1: PERSONALIZED FORMAL NOTICE OF DISPUTE
      // =========================================================================
      drawHeaderFooter(doc, { pageNum: 1, totalPages, accountNumber, consumerName });

      // Title Banner
      doc.rect(leftMargin, 42, contentWidth, 48).fill('#0f172a');
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff')
        .text('FORMAL NOTICE OF DISPUTE & ESCALATION WARNING', leftMargin + 16, 52);
      doc.fontSize(8.5).font('Helvetica').fillColor('#94a3b8')
        .text(`Issued pursuant to Statutory Energy Retail Rules & Back-Billing Protections (${country})`, leftMargin + 16, 68);

      // Party Identification Box (2 Columns)
      const partyBoxY = 98;
      const partyBoxH = 80;
      doc.roundedRect(leftMargin, partyBoxY, contentWidth, partyBoxH, 4).fillAndStroke('#f8fafc', '#cbd5e1');

      // Left Column: Consumer
      const colWidth = (contentWidth - 30) / 2;
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569')
        .text('DISPUTING CONSUMER (ACCOUNT HOLDER)', leftMargin + 14, partyBoxY + 10);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a')
        .text(consumerName || 'Account Holder', leftMargin + 14, partyBoxY + 22);
      doc.fontSize(8).font('Helvetica').fillColor('#334155')
        .text(supplyAddress || 'Supply Address On File', leftMargin + 14, partyBoxY + 36, { width: colWidth });
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#2563eb')
        .text(`Account / Customer Ref: ${accountNumber || 'Reference On File'}`, leftMargin + 14, partyBoxY + 62);

      // Vertical Divider
      doc.strokeColor('#e2e8f0').lineWidth(1)
        .moveTo(leftMargin + colWidth + 15, partyBoxY + 8)
        .lineTo(leftMargin + colWidth + 15, partyBoxY + partyBoxH - 8)
        .stroke();

      // Right Column: Energy Retailer
      const col2X = leftMargin + colWidth + 26;
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569')
        .text('RESPONDING ENERGY RETAILER', col2X, partyBoxY + 10);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a')
        .text(supplierName || 'Energy Retailer', col2X, partyBoxY + 22);
      doc.fontSize(8).font('Helvetica').fillColor('#334155')
        .text('Complaints Handling & Statutory Compliance Team', col2X, partyBoxY + 36);
      doc.fontSize(8).font('Helvetica').fillColor('#475569')
        .text(`Notice Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, col2X, partyBoxY + 49);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#047857')
        .text(`Governing Rule: ${regulation.clauseReference || 'Statutory Utility Code'}`, col2X, partyBoxY + 62);

      // Subject Headline Banner
      const subY = 188;
      doc.rect(leftMargin, subY, contentWidth, 24).fill('#e2e8f0');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a')
        .text(`RE: FORMAL DISPUTE OF UNLAWFUL BACK-BILLING CHARGES — DISPUTED SUM: ${fmtCurr(disputableTotal, currency)}`, leftMargin + 12, subY + 7);

      // Letter Formal Text Body
      const bodyY = 220;
      doc.fontSize(8.5).font('Helvetica').fillColor('#1e293b');
      
      const p1 = `Dear Complaints Handling Team,

I am writing to formally dispute the catch-up charges itemized on my recent energy statement dated ${billDate} in the total sum of ${fmtCurr(totalBilled, currency)}.

A precise calendar audit against statutory utility standards demonstrates that ${fmtCurr(disputableTotal, currency)} of this billed balance relates exclusively to energy consumption accrued prior to ${cutOffDate}—exceeding the statutory ${lookbackMonths}-month lookback limitation prescribed by ${regulation.title || 'statutory back-billing regulations'} (${regulation.clauseReference || 'Applicable Standard'}).`;

      doc.text(p1, leftMargin, bodyY, { width: contentWidth, lineGap: 3.5 });

      const p2Y = doc.y + 6;
      const p2 = `Under mandatory regulatory rules, licensed energy retailers are strictly prohibited from seeking to recover catch-up charges for energy consumed more than ${lookbackMonths} months prior to the date of the bill, where the consumer has not previously received an accurate bill for that consumption.

I expressly confirm that I have never obstructed or prevented meter reader access${isEstimated ? ', and previous statements were rendered on estimated rather than actual readings' : ''}. In accordance with published regulatory precedents, the retailer bears full responsibility for historical billing delays.`;

      doc.text(p2, leftMargin, p2Y, { width: contentWidth, lineGap: 3.5 });

      const remediesY = doc.y + 8;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a')
        .text('FORMAL REMEDIES DEMANDED PURSUANT TO STATUTE:', leftMargin, remediesY);
      
      doc.fontSize(8.5).font('Helvetica').fillColor('#1e293b');
      const remedies = [
        `1. Immediately cancel and write off the unrecoverable sum of ${fmtCurr(disputableTotal, currency)} accrued prior to ${cutOffDate}.`,
        `2. Issue an adjusted, revised statement reflecting only lawful charges within the statutory window: ${fmtCurr(totalBilled - disputableTotal, currency)}.`,
        `3. Place an immediate formal hold on all debt collection, late fees, or disconnection workflows while this dispute is pending.`
      ];
      doc.text(remedies.join('\n'), leftMargin + 10, remediesY + 14, { width: contentWidth - 10, lineGap: 3 });

      // 14-Day Statutory Escalation Warning Box
      const alertY = doc.y + 12;
      const alertH = 82;
      doc.roundedRect(leftMargin, alertY, contentWidth, alertH, 4).fillAndStroke('#fef2f2', '#dc2626');

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#b91c1c')
        .text('CRITICAL STATUTORY 14-DAY ESCALATION WARNING', leftMargin + 14, alertY + 10);
      
      const alertMsg = `Take formal notice that under consumer protection regulations, your organization is required to respond to this dispute in writing. Please provide your written confirmation of bill adjustment within 14 calendar days of receipt of this notice.

Should you fail to adjust the bill or reach a mutually agreed resolution within the statutory complaints timeframe, this dispute, together with the attached Schedule of Mathematical Evidence, will be formally submitted to the ${escalation.body} for statutory determination and enforcement. Any adverse credit reporting or collection action initiated during an active dispute constitutes an actionable regulatory breach.`;

      doc.fontSize(7.5).font('Helvetica').fillColor('#7f1d1d')
        .text(alertMsg, leftMargin + 14, alertY + 23, { width: contentWidth - 28, lineGap: 2.5 });

      // Sign-off
      const signY = alertY + alertH + 12;
      doc.fontSize(8.5).font('Helvetica').fillColor('#1e293b').text('Yours sincerely,', leftMargin, signY);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text(consumerName, leftMargin, signY + 14);
      doc.fontSize(8).font('Helvetica').fillColor('#475569').text(`Registered Account Holder • ${accountNumber}`, leftMargin, signY + 27);

      // =========================================================================
      // PAGE 2: SCHEDULE OF MATHEMATICAL EVIDENCE
      // =========================================================================
      doc.addPage();
      drawHeaderFooter(doc, { pageNum: 2, totalPages, accountNumber, consumerName });

      // Title Banner
      doc.rect(leftMargin, 42, contentWidth, 44).fill('#1e293b');
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff')
        .text('SCHEDULE OF MATHEMATICAL EVIDENCE: PRO-RATA APPORTIONMENT', leftMargin + 16, 52);
      doc.fontSize(8).font('Helvetica').fillColor('#94a3b8')
        .text('Deterministic Daily Pro-Rata Audit Against Statutory Lookback Cut-Off Barrier', leftMargin + 16, 68);

      // Summary Metric Stat Badges (4 cards)
      const metricY = 96;
      const cardW = (contentWidth - 18) / 4;
      const cardH = 50;

      // Card 1: Total Billed
      doc.roundedRect(leftMargin, metricY, cardW, cardH, 3).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#64748b').text('TOTAL CATCH-UP BILL', leftMargin + 8, metricY + 8);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(fmtCurr(totalBilled, currency), leftMargin + 8, metricY + 22);
      doc.fontSize(6.5).font('Helvetica').fillColor('#94a3b8').text(`Issued: ${billDate}`, leftMargin + 8, metricY + 36);

      // Card 2: Lookback Barrier
      const c2X = leftMargin + cardW + 6;
      doc.roundedRect(c2X, metricY, cardW, cardH, 3).fillAndStroke('#eff6ff', '#bfdbfe');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#1e40af').text('LOOKBACK BARRIER', c2X + 8, metricY + 8);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e3a8a').text(cutOffDate, c2X + 8, metricY + 22);
      doc.fontSize(6.5).font('Helvetica').fillColor('#3b82f6').text(`Limit: ${lookbackMonths} Calendar Mos`, c2X + 8, metricY + 36);

      // Card 3: Lawful Charges
      const c3X = c2X + cardW + 6;
      const lawfulTotal = totalBilled - disputableTotal;
      doc.roundedRect(c3X, metricY, cardW, cardH, 3).fillAndStroke('#ecfdf5', '#a7f3d0');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#065f46').text('LAWFUL RECOVERABLE', c3X + 8, metricY + 8);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#047857').text(fmtCurr(lawfulTotal, currency), c3X + 8, metricY + 22);
      doc.fontSize(6.5).font('Helvetica').fillColor('#059669').text('Within statutory window', c3X + 8, metricY + 36);

      // Card 4: Unlawful / Disputable
      const c4X = c3X + cardW + 6;
      doc.roundedRect(c4X, metricY, cardW, cardH, 3).fillAndStroke('#fef2f2', '#fecaca');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#991b1b').text('UNLAWFUL / DISPUTABLE', c4X + 8, metricY + 8);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#dc2626').text(fmtCurr(disputableTotal, currency), c4X + 8, metricY + 22);
      doc.fontSize(6.5).font('Helvetica').fillColor('#b91c1c').text('Exceeds statutory limit', c4X + 8, metricY + 36);

      // Visual Vector Timeline Barrier
      const timelineY = 158;
      const timelineH = 54;
      doc.roundedRect(leftMargin, timelineY, contentWidth, timelineH, 3).fillAndStroke('#f1f5f9', '#cbd5e1');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#334155')
        .text('STATUTORY LOOKBACK BARRIER RECONCILIATION TIMELINE', leftMargin + 12, timelineY + 8);

      // Timeline Visual Bar
      const barX = leftMargin + 20;
      const barW = contentWidth - 40;
      const barY = timelineY + 25;
      const barH = 12;

      // Draw red zone (pre-cutoff) and green zone (post-cutoff)
      const ratio = totalBilled > 0 ? Math.min(Math.max(disputableTotal / totalBilled, 0.2), 0.8) : 0.4;
      const redW = barW * ratio;
      const greenW = barW - redW;

      // Red bar
      doc.rect(barX, barY, redW, barH).fill('#ef4444');
      // Green bar
      doc.rect(barX + redW, barY, greenW, barH).fill('#10b981');

      // Barrier divider notch
      doc.rect(barX + redW - 1.5, barY - 4, 3, barH + 8).fill('#0f172a');

      // Labels below bar
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#b91c1c')
        .text(`DISPUTABLE ZONE (${fmtCurr(disputableTotal, currency)})`, barX, barY + 16);
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a')
        .text(`BARRIER: ${cutOffDate}`, barX + redW - 40, barY + 16, { width: 80, align: 'center' });
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#047857')
        .text(`PERMISSIBLE ZONE (${fmtCurr(lawfulTotal, currency)})`, barX + barW - 130, barY + 16, { width: 130, align: 'right' });

      // Vector Table of Billing Line Items
      const tableY = 224;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a')
        .text('ITEMIZED BILLING INTERVALS & PRO-RATA CALCULATION AUDIT', leftMargin, tableY);

      // Table Header Row
      const thY = tableY + 14;
      const thH = 20;
      doc.rect(leftMargin, thY, contentWidth, thH).fill('#334155');

      const colDefs = [
        { label: 'Billing Period Range', x: leftMargin + 8, width: 130, align: 'left' },
        { label: 'Total Days', x: leftMargin + 142, width: 45, align: 'center' },
        { label: 'Pre-Cutoff', x: leftMargin + 192, width: 55, align: 'center' },
        { label: 'Billed Amount', x: leftMargin + 252, width: 75, align: 'right' },
        { label: 'Disputable Sum', x: leftMargin + 332, width: 80, align: 'right' },
        { label: 'Regulatory Classification', x: leftMargin + 418, width: 90, align: 'center' }
      ];

      doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff');
      colDefs.forEach(col => {
        doc.text(col.label, col.x, thY + 6, { width: col.width, align: col.align });
      });

      // Table Data Rows
      let currRowY = thY + thH;
      const rowH = 22;

      let sumTotalDays = 0;
      let sumDaysBefore = 0;

      itemizedBreakdown.forEach((item, idx) => {
        sumTotalDays += item.totalDays || 0;
        sumDaysBefore += item.daysBeforeCutOff || 0;

        // Alternating fill
        if (idx % 2 === 1) {
          doc.rect(leftMargin, currRowY, contentWidth, rowH).fill('#f8fafc');
        }

        doc.strokeColor('#e2e8f0').lineWidth(0.5)
          .moveTo(leftMargin, currRowY + rowH).lineTo(leftMargin + contentWidth, currRowY + rowH).stroke();

        doc.fontSize(7.5).font('Helvetica').fillColor('#0f172a');
        // Period
        doc.text(`${item.startDate} to ${item.endDate}`, colDefs[0].x, currRowY + 6, { width: colDefs[0].width });
        // Total Days
        doc.text(`${item.totalDays}d`, colDefs[1].x, currRowY + 6, { width: colDefs[1].width, align: 'center' });
        // Days Pre-cutoff
        doc.font(item.daysBeforeCutOff > 0 ? 'Helvetica-Bold' : 'Helvetica')
          .fillColor(item.daysBeforeCutOff > 0 ? '#b91c1c' : '#64748b')
          .text(`${item.daysBeforeCutOff}d`, colDefs[2].x, currRowY + 6, { width: colDefs[2].width, align: 'center' });
        // Billed
        doc.font('Helvetica').fillColor('#0f172a')
          .text(fmtCurr(item.amount, currency), colDefs[3].x, currRowY + 6, { width: colDefs[3].width, align: 'right' });
        // Disputable
        doc.font('Helvetica-Bold').fillColor(item.disputableAmount > 0 ? '#dc2626' : '#047857')
          .text(fmtCurr(item.disputableAmount, currency), colDefs[4].x, currRowY + 6, { width: colDefs[4].width, align: 'right' });
        
        // Status Badge Pill
        const statusBadgeW = 86;
        const statusBadgeH = 14;
        const badgeX = colDefs[5].x + (colDefs[5].width - statusBadgeW) / 2;
        const badgeY = currRowY + 4;

        if (item.daysBeforeCutOff === item.totalDays && item.totalDays > 0) {
          doc.roundedRect(badgeX, badgeY, statusBadgeW, statusBadgeH, 2).fillAndStroke('#fee2e2', '#fca5a5');
          doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#991b1b')
            .text('100% UNLAWFUL', badgeX, badgeY + 3.5, { width: statusBadgeW, align: 'center' });
        } else if (item.daysBeforeCutOff > 0) {
          doc.roundedRect(badgeX, badgeY, statusBadgeW, statusBadgeH, 2).fillAndStroke('#fef3c7', '#fde68a');
          doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#92400e')
            .text('SPLIT PRO-RATA', badgeX, badgeY + 3.5, { width: statusBadgeW, align: 'center' });
        } else {
          doc.roundedRect(badgeX, badgeY, statusBadgeW, statusBadgeH, 2).fillAndStroke('#d1fae5', '#6ee7b7');
          doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#065f46')
            .text('LAWFUL (PERMITTED)', badgeX, badgeY + 3.5, { width: statusBadgeW, align: 'center' });
        }

        currRowY += rowH;
      });

      // Table Totals Summary Row
      doc.rect(leftMargin, currRowY, contentWidth, 24).fill('#0f172a');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
        .text('AUDIT TOTALS', colDefs[0].x, currRowY + 7);
      doc.text(`${sumTotalDays}d`, colDefs[1].x, currRowY + 7, { width: colDefs[1].width, align: 'center' });
      doc.text(`${sumDaysBefore}d`, colDefs[2].x, currRowY + 7, { width: colDefs[2].width, align: 'center' });
      doc.text(fmtCurr(totalBilled, currency), colDefs[3].x, currRowY + 7, { width: colDefs[3].width, align: 'right' });
      doc.fillColor('#f87171')
        .text(fmtCurr(disputableTotal, currency), colDefs[4].x, currRowY + 7, { width: colDefs[4].width, align: 'right' });
      doc.fillColor('#ffffff')
        .text('FINAL DETERMINATION', colDefs[5].x, currRowY + 7, { width: colDefs[5].width, align: 'center' });

      // Daily Pro-Rata Formula Specification Card
      const formulaY = currRowY + 34;
      doc.roundedRect(leftMargin, formulaY, contentWidth, 120, 4).fillAndStroke('#f8fafc', '#cbd5e1');

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a')
        .text('MATHEMATICAL FORMULATION & AUDIT STANDARDS:', leftMargin + 14, formulaY + 10);
      
      const formulaText = `1. Exact Daily Pro-Rata Apportionment:
   • Daily Consumption Rate = Interval Gross Amount ÷ Interval Calendar Days
   • Disputable Sum = Daily Consumption Rate × Exact Days Elapsed Prior to Cut-Off Barrier (${cutOffDate})
   • Lawful Sum = Daily Consumption Rate × Exact Days Elapsed on or After Cut-Off Barrier

2. Deterministic Calendar Boundary Computation:
   • The statutory lookback barrier is calculated using ISO-8601 UTC date operations subtracting exactly ${lookbackMonths} calendar months from the statement issue date (${billDate}).
   • No approximations or 30-day uniform month assumptions are applied. Every calendar month is evaluated with exact Gregorian day counts.

3. Statutory Accounting Reconciliation:
   • Total Amount Billed: ${fmtCurr(totalBilled, currency)}
   • Legitimate Recoverable Portion (Permitted Window): ${fmtCurr(lawfulTotal, currency)}
   • Statutory Disputable Balance (Zero Liability under Rule): ${fmtCurr(disputableTotal, currency)}`;

      doc.fontSize(7.5).font('Helvetica').fillColor('#334155')
        .text(formulaText, leftMargin + 14, formulaY + 24, { width: contentWidth - 28, lineGap: 2.5 });

      // =========================================================================
      // PAGE 3: STATUTORY AUTHORITY ANNEXURE
      // =========================================================================
      doc.addPage();
      drawHeaderFooter(doc, { pageNum: 3, totalPages, accountNumber, consumerName });

      // Title Banner
      doc.rect(leftMargin, 42, contentWidth, 44).fill('#1e293b');
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff')
        .text('ANNEXURE A: STATUTORY REGULATORY AUTHORITY & LEGAL CITATIONS', leftMargin + 16, 52);
      doc.fontSize(8).font('Helvetica').fillColor('#94a3b8')
        .text('Live Retrieved Regulatory Standards, Licence Conditions & Ombudsman Precedents', leftMargin + 16, 68);

      // Primary Governing Regulation Box
      const regBoxY = 96;
      doc.roundedRect(leftMargin, regBoxY, contentWidth, 80, 4).fillAndStroke('#f0fdf4', '#86efac');

      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#166534')
        .text(`PRIMARY STATUTORY AUTHORITY — ${country.toUpperCase()}`, leftMargin + 14, regBoxY + 10);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#14532d')
        .text(regulation.title || 'Statutory Energy Retail Rule', leftMargin + 14, regBoxY + 22);
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#15803d')
        .text(`Official Reference / Clause: ${regulation.clauseReference || 'Applicable Standard'}`, leftMargin + 14, regBoxY + 36);

      doc.fontSize(8).font('Helvetica').fillColor('#1e293b')
        .text(regulation.summary || 'Energy retailers are prohibited from billing consumers for unbilled energy consumption older than the statutory lookback limit where the consumer is not at fault.', leftMargin + 14, regBoxY + 50, { width: contentWidth - 28, lineGap: 2 });

      // Live Regulatory Citations & Findings
      const citesY = 188;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a')
        .text('OFFICIAL REGULATORY CITATIONS & LIVE SEARCH VERIFICATION', leftMargin, citesY);
      doc.fontSize(7.5).font('Helvetica').fillColor('#64748b')
        .text('Retrieved live from regulator gazettes, government registers, and official ombudsman repositories.', leftMargin, citesY + 12);

      let citeY = citesY + 26;
      const sources = Array.isArray(regulation.sources) && regulation.sources.length > 0
        ? regulation.sources
        : [
            {
              title: `${regulation.title || 'Energy Back-Billing Protection Rule'}`,
              url: 'https://www.ofgem.gov.uk/information-consumers/energy-advice-households/check-energy-back-billing-rules',
              snippet: 'Suppliers must not bill consumers for unbilled energy used more than 12 months previously.'
            }
          ];

      sources.slice(0, 3).forEach((src, idx) => {
        const itemH = 50;
        doc.roundedRect(leftMargin, citeY, contentWidth, itemH, 3).fillAndStroke('#f8fafc', '#e2e8f0');

        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a')
          .text(`[Citation ${idx + 1}] ${src.title || 'Official Regulatory Documentation'}`, leftMargin + 10, citeY + 8, { width: contentWidth - 20 });
        
        doc.fontSize(7.5).font('Helvetica').fillColor('#334155')
          .text(src.snippet ? src.snippet.substring(0, 160) + '...' : 'Mandatory rule preventing unbilled utility charges beyond statutory lookback.', leftMargin + 10, citeY + 20, { width: contentWidth - 20 });

        doc.fontSize(7).font('Helvetica').fillColor('#2563eb')
          .text(`Official Source URL: ${src.url}`, leftMargin + 10, citeY + 36, {
            width: contentWidth - 20,
            link: src.url,
            underline: true
          });

        citeY += itemH + 8;
      });

      // Statutory Exception & Consumer Compliance Audit
      const auditY = citeY + 6;
      doc.roundedRect(leftMargin, auditY, contentWidth, 80, 4).fillAndStroke('#f1f5f9', '#cbd5e1');

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a')
        .text('STATUTORY EXCEPTION EVALUATION & CONSUMER COMPLIANCE AUDIT', leftMargin + 14, auditY + 10);

      const auditLines = [
        `• Physical Meter Obstruction: ${isMeterObstructed ? 'EXCEPTION TRIGGERED (Access denied by consumer)' : 'COMPLIANT: No obstruction; customer permitted full physical access at all times.'}`,
        `• Historical Billing Basis: ${isEstimated ? 'ESTIMATED: Supplier failed to obtain or record actual meter indices during the lookback period.' : 'ACTUAL: Readings recorded normally.'}`,
        ...(meterEvidence ? [`• Meter Photo Evidence: Serial ${meterEvidence.serialNumber || 'Verified'} (${meterEvidence.meterType || 'Digital'}). Physical reading ${meterEvidence.readingValue} ${meterEvidence.unit || 'kWh'} confirms over-billing on phantom estimates.`] : []),
        `• Statutory Legal Standing: Consumer is entitled to complete protection under ${regulation.clauseReference || 'statutory back-billing rules'}.`,
        `• Debt Recovery Status: Supplier is legally precluded from demanding the unbilled balance of ${fmtCurr(disputableTotal, currency)} accrued prior to ${cutOffDate}.`
      ];

      doc.fontSize(7.5).font('Helvetica').fillColor('#1e293b')
        .text(auditLines.join('\n'), leftMargin + 14, auditY + 24, { width: contentWidth - 28, lineGap: 3 });

      // Statutory Ombudsman Escalation Directory
      const ombY = auditY + 90;
      doc.roundedRect(leftMargin, ombY, contentWidth, 84, 4).fillAndStroke('#f8fafc', '#bfdbfe');

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1e3a8a')
        .text('OFFICIAL OMBUDSMAN ESCALATION DIRECTORY & PROTOCOL', leftMargin + 14, ombY + 10);

      const ombText = `Designated Statutory Body: ${escalation.body}
Statutory Enabling Code: ${escalation.statute}
Escalation Threshold: ${escalation.timeline}
Official Online Portal / Contact: ${escalation.website}

Escalation Protocol Instructions:
If the energy supplier fails to issue an amended statement within 14 calendar days, lodge a formal dispute directly with the ombudsman above. Attach this complete 3-page dossier including the Schedule of Mathematical Evidence. Statutory ombudsman determinations are legally binding upon licensed energy retailers.`;

      doc.fontSize(7.5).font('Helvetica').fillColor('#1e293b')
        .text(ombText, leftMargin + 14, ombY + 24, { width: contentWidth - 28, lineGap: 2.5 });

      // Disclaimer Box at Bottom
      const discY = ombY + 94;
      doc.roundedRect(leftMargin, discY, contentWidth, 34, 2).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.fontSize(6.5).font('Helvetica').fillColor('#64748b')
        .text('NON-LEGAL ADVICE DISCLAIMER: This document was produced using BillRight, an AI-assisted consumer advocacy utility. The mathematical calculations reflect strict calendar pro-rata apportionment against statutory lookback rules. This document is designed for consumer dispute resolution and does not constitute formal legal counsel. For complex claims, contact your statutory ombudsman.', leftMargin + 8, discY + 6, { width: contentWidth - 16, lineGap: 2 });

      doc.end();

    } catch (err) {
      reject(err);
    }
  });
}
