/**
 * BillRight Dispute Packet (draft) Generator (PDF Engine)
 * 
 * Generates an official, publication-quality 3-page Dispute Packet (draft):
 * - Page 1: Personalized Formal Notice of Dispute & Suggested Response Deadline
 * - Page 2: Schedule of Mathematical Evidence with clean vector table & lookback barrier
 * - Page 3: Statutory Authority Annexure with live regulatory citations & ombudsman protocol
 * 
 * Uses PDFKit with clean vector geometry, robust typography, and zero bracket placeholders.
 */

import PDFDocument from 'pdfkit';

/**
 * Returns ombudsman and regulatory escalation directory information.
 */
function getEscalationDirectory(jurisdiction = '', state = '') {
  if (jurisdiction === 'Australia') {
    const s = String(state || '').toUpperCase();
    let body = 'Energy and Water Ombudsman NSW (EWON)';
    let website = 'www.ewon.com.au / 1800 246 545';
    if (s === 'QLD') {
      body = 'Energy and Water Ombudsman Queensland (EWOQ)';
      website = 'www.ewoq.com.au / 1800 662 837';
    } else if (s === 'SA') {
      body = 'Energy and Water Ombudsman SA (EWOSA)';
      website = 'www.ewosa.com.au / 1800 665 565';
    }
    return {
      body,
      timeline: 'If unresolved after the standard 8-week complaints timeframe or upon receipt of formal deadlock / dispute response',
      statute: 'National Energy Retail Rules (NERR Rule 30) - Scope: NERR participating states (NSW, QLD, SA). Note: Victoria has its own code and is not covered.',
      website
    };
  }
  if (jurisdiction.includes('California')) {
    return {
      body: 'California Public Utilities Commission (CPUC) Consumer Affairs Branch',
      timeline: 'If unresolved directly with utility or upon written dispute rejection',
      statute: 'PG&E Electric Rule 17.1 (equivalent tariff rules apply for SCE/SDG&E) - 3 months residential underbilling error',
      website: 'www.cpuc.ca.gov / 1-800-649-7570'
    };
  }
  if (jurisdiction.includes('Texas')) {
    return {
      body: 'Public Utility Commission of Texas (PUCT) Customer Protection Division',
      timeline: 'Upon supplier failure to resolve under utility / REP dispute procedures',
      statute: 'PUCT §25.28(d) (electric utilities - 6 mos); limit under §25.480(e) for REPs must be verified with the PUCT',
      website: 'www.puc.texas.gov / 1-888-782-8477'
    };
  }
  // Default UK
  return {
    body: 'Energy Ombudsman (Ombudsman Services: Energy)',
    timeline: 'Standard 8-week complaints timeframe or immediately upon receipt of a deadlock letter',
    statute: 'Ofgem Standard Licence Condition 21BA',
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
 * Formats a date string nicely or returns a fallback.
 */
function formatDate(d) {
  if (!d) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-').map(Number);
    const dateObj = new Date(y, m - 1, day);
    return dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return String(d);
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
  doc.text('BILLRIGHT DISPUTE PACKET (DRAFT)', leftMargin, 22, { lineBreak: false });
  doc.font('Helvetica').fillColor('#94a3b8');
  doc.text(` | CASE REF: ${accountNumber || 'ON FILE'}`, doc.x, 22, { lineBreak: false });
  doc.font('Helvetica').text(`PARTY: ${consumerName || 'ACCOUNT HOLDER'}`, rightMargin - 150, 22, { width: 150, align: 'right' });

  doc.strokeColor('#cbd5e1').lineWidth(0.5);
  doc.moveTo(leftMargin, 33).lineTo(rightMargin, 33).stroke();

  // Running Footer (bottom)
  doc.moveTo(leftMargin, 805).lineTo(rightMargin, 805).stroke();
  doc.fontSize(7).font('Helvetica').fillColor('#94a3b8');
  doc.text('Prepared via BillRight Consumer Protection Utility • Dispute Packet (draft)', leftMargin, 812, { lineBreak: false });
  doc.font('Helvetica-Bold').fillColor('#475569');
  doc.text(`Page ${pageNum} of ${totalPages}`, rightMargin - 80, 812, { width: 80, align: 'right' });
  doc.restore();
}

/**
 * Generates the complete Dispute Packet (draft) PDF as a Buffer.
 * 
 * @param {Object} data
 * @returns {Promise<Buffer>}
 */
export async function generateLegalPacketPdf(data) {
  return new Promise((resolve, reject) => {
    try {
      const {
        consumerName = '',
        supplierName = '',
        accountNumber = '',
        supplyAddress = '',
        country = 'United Kingdom',
        billDate = '2026-10-01',
        cutOffDate = '2025-10-01',
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
        supplierContact,
        australiaState = '',
        state = ''
      } = data;

      const resolvedState = australiaState || state;
      const escalation = getEscalationDirectory(regulation.jurisdiction || country, resolvedState);
      const totalPages = isMeterObstructed ? 4 : 3;
      const formattedNoticeDate = formatDate(noticeDate);

      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        autoFirstPage: true,
        info: {
          Title: `Dispute Packet (draft) - ${accountNumber || 'Dispute'}`,
          Author: 'BillRight Consumer Protection Utility',
          Subject: `Back-Billing Dispute under ${regulation.clauseReference || 'Statutory Code'}`,
          Keywords: 'back-billing, dispute, energy, statutory, ofgem, nerr, cpuc, puct'
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
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#ffffff')
        .text('FORMAL NOTICE OF BACK-BILLING DISPUTE', leftMargin + 16, 52);
      doc.fontSize(8.5).font('Helvetica').fillColor('#94a3b8')
        .text(`STATUTORY LOOKBACK DISPUTE PURSUANT TO ${regulation.clauseReference || 'APPLICABLE STATUTORY CODE'} | DRAFT, NOT LEGAL ADVICE`, leftMargin + 16, 70);

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

      let emailText = '';
      const isDemo = supplierContact?.isDemo || supplierEmail === 'complaints@example.com' || supplierContact?.email === 'complaints@example.com' || (supplierName && supplierName.toLowerCase().includes('example'));
      if (isDemo) {
        emailText = 'complaints@example.com (demo address)';
      } else if (supplierEmail) {
        emailText = supplierEmail;
      } else if (supplierContact?.email) {
        emailText = supplierContact.email;
      }

      doc.fontSize(7.5).font('Helvetica').fillColor('#334155')
        .text(emailText ? `Complaints Email: ${emailText}` : 'Complaints Handling Team', col2X, partyBoxY + 36, { width: colWidth });
      doc.fontSize(7.5).font('Helvetica').fillColor('#475569')
        .text(`Notice Date: ${formattedNoticeDate}`, col2X, partyBoxY + 49);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#047857')
        .text(`Governing Rule: ${regulation.clauseReference || 'Statutory Utility Code'}`, col2X, partyBoxY + 62);

      // Subject Headline Banner
      const subY = 188;
      doc.rect(leftMargin, subY, contentWidth, 24).fill('#e2e8f0');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a')
        .text(`RE: FORMAL DISPUTE OF UNBILLED BACK-BILLING CHARGES — DISPUTED SUM: ${fmtCurr(disputableTotal, currency)}`, leftMargin + 12, subY + 7);

      // Letter Formal Text Body
      const bodyY = 220;
      doc.fontSize(8.5).font('Helvetica').fillColor('#1e293b');
      
      const p1 = `Dear Complaints Handling Team,

I am writing to formally dispute the catch-up charges itemized on my recent energy statement dated ${billDate} in the total sum of ${fmtCurr(totalBilled, currency)}.

A precise calendar audit against statutory utility standards indicates that ${fmtCurr(disputableTotal, currency)} of this billed balance relates exclusively to energy consumption accrued prior to ${cutOffDate}—exceeding the statutory ${lookbackMonths}-month lookback limitation prescribed by ${regulation.title || regulation.clauseReference || 'statutory back-billing regulations'}.`;

      doc.text(p1, leftMargin, bodyY, { width: contentWidth, lineGap: 3.5 });

      const p2Y = doc.y + 6;
      const isAustralia = Boolean(country === 'Australia' || (regulation.clauseReference && regulation.clauseReference.includes('NERR')));
      const isTexas = Boolean(regulation.clauseReference && (regulation.clauseReference.includes('§25.28') || regulation.clauseReference.includes('25.28')));

      let p2Statute;
      if (isAustralia) {
        p2Statute = 'Under NERR Rule 30, charges more than 9 months before the date the customer was notified of the undercharge cannot be recovered unless the customer was at fault.';
      } else if (isTexas) {
        p2Statute = 'Under PUCT §25.28(d) for electric utilities, back-billing adjustments are limited to 6 months counted from the date the error was discovered. For retail electric providers, the limit under §25.480(e) must be verified with the PUCT.';
      } else {
        p2Statute = `Under statutory regulatory rules, licensed energy retailers are prohibited from seeking to recover catch-up charges for energy consumed more than ${lookbackMonths} months prior to the date of the bill, where the delay or error was the supplier's responsibility.`;
      }

      let p2Access = '';
      if (isMeterObstructed) {
        if (isEstimated) {
          p2Access = 'Previous statements were rendered on estimated rather than actual readings.';
        } else {
          p2Access = '';
        }
      } else {
        if (isEstimated) {
          p2Access = 'I confirm that I have not acted obstructively or prevented meter access at any time, and previous statements were rendered on estimated rather than actual readings.';
        } else {
          p2Access = 'I confirm that I have not acted obstructively or prevented meter access at any time.';
        }
      }

      const p2 = p2Access ? `${p2Statute}\n\n${p2Access}` : p2Statute;

      doc.text(p2, leftMargin, p2Y, { width: contentWidth, lineGap: 3.5 });

      const remediesY = doc.y + 8;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a')
        .text('FORMAL REMEDIES REQUESTED PURSUANT TO STATUTE:', leftMargin, remediesY);
      
      doc.fontSize(8.5).font('Helvetica').fillColor('#1e293b');
      const remedies = [
        `1. Revise the bill to remove the ${fmtCurr(disputableTotal, currency)} accrued prior to ${cutOffDate}.`,
        `2. Issue an adjusted, revised statement reflecting only charges within the statutory window: ${fmtCurr(totalBilled - disputableTotal, currency)}.`,
        `3. Place a temporary hold on debt collection activity for the disputed sum while this complaint is investigated.`
      ];
      doc.text(remedies.join('\n'), leftMargin + 10, remediesY + 14, { width: contentWidth - 10, lineGap: 3 });

      // Suggested Response Deadline Box
      const alertY = doc.y + 12;
      const alertH = 74;
      const alertBg = '#f8fafc';
      const alertStroke = '#94a3b8';
      doc.roundedRect(leftMargin, alertY, contentWidth, alertH, 4).fillAndStroke(alertBg, alertStroke);

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1e3a8a')
        .text('SUGGESTED RESPONSE DEADLINE & OMBUDSMAN PROTOCOL', leftMargin + 14, alertY + 8);

      const alertMsg = `Please provide your written confirmation of bill review within a suggested 14-day timeframe. Should we not reach an agreed resolution within the standard 8-week complaints timeframe, this dispute, together with the attached Schedule of Mathematical Evidence, will be formally submitted to the ${escalation.body} for independent review.`;

      doc.fontSize(7.5).font('Helvetica').fillColor('#334155')
        .text(alertMsg, leftMargin + 14, alertY + 22, { width: contentWidth - 28, lineGap: 2.5 });

      // Sign-off
      const signY = alertY + alertH + 10;
      doc.fontSize(8.5).font('Helvetica').fillColor('#1e293b').text('Yours sincerely,', leftMargin, signY);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text(consumerName || 'Account Holder', leftMargin, signY + 13);
      doc.fontSize(8).font('Helvetica').fillColor('#475569').text(`Registered Account Holder • ${accountNumber || 'Reference On File'}`, leftMargin, signY + 25);

      // One-line draft note on Page 1
      doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#64748b')
        .text('Draft, not legal advice. Review before sending.', leftMargin, 792, { width: contentWidth, align: 'center' });

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
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#065f46').text('PERMISSIBLE CHARGES', c3X + 8, metricY + 8);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#047857').text(fmtCurr(lawfulTotal, currency), c3X + 8, metricY + 22);
      doc.fontSize(6.5).font('Helvetica').fillColor('#059669').text('Within permitted window', c3X + 8, metricY + 36);

      // Card 4: Disputable
      const c4X = c3X + cardW + 6;
      doc.roundedRect(c4X, metricY, cardW, cardH, 3).fillAndStroke('#fef2f2', '#fecaca');
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#991b1b').text('LIKELY DISPUTABLE', c4X + 8, metricY + 8);
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
      doc.rect(barX, barY, redW, barH).fill('#dc2626');
      // Green bar
      doc.rect(barX + redW, barY, greenW, barH).fill('#059669');

      // Barrier divider notch
      doc.rect(barX + redW - 1.5, barY - 4, 3, barH + 8).fill('#0f172a');

      // Labels below bar
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#dc2626')
        .text(`DISPUTABLE WINDOW (${fmtCurr(disputableTotal, currency)})`, barX, barY + 16);
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#0f172a')
        .text(`BARRIER: ${cutOffDate}`, barX + redW - 40, barY + 16, { width: 80, align: 'center' });
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#059669')
        .text(`PERMITTED WINDOW (${fmtCurr(lawfulTotal, currency)})`, barX + barW - 140, barY + 16, { width: 140, align: 'right' });

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
        { label: 'Classification', x: leftMargin + 418, width: 90, align: 'center' }
      ];

      doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff');
      colDefs.forEach(col => {
        doc.text(col.label, col.x, thY + 6, { width: col.width, align: col.align });
      });

      // Table Data Rows
      let currRowY = thY + thH;
      const rowH = 22;

      itemizedBreakdown.forEach((item, idx) => {
        const isEven = idx % 2 === 0;
        doc.rect(leftMargin, currRowY, contentWidth, rowH).fill(isEven ? '#ffffff' : '#f8fafc');
        doc.strokeColor('#e2e8f0').lineWidth(0.5).rect(leftMargin, currRowY, contentWidth, rowH).stroke();

        doc.fontSize(7).font('Helvetica').fillColor('#1e293b');
        doc.text(`${item.startDate} to ${item.endDate}`, leftMargin + 8, currRowY + 7, { width: 130, align: 'left' });
        doc.text(`${item.totalDays}d`, leftMargin + 142, currRowY + 7, { width: 45, align: 'center' });
        doc.text(`${item.disputableDays}d`, leftMargin + 192, currRowY + 7, { width: 55, align: 'center' });
        doc.text(fmtCurr(item.amount, currency), leftMargin + 252, currRowY + 7, { width: 75, align: 'right' });

        doc.font('Helvetica-Bold').fillColor(item.disputableAmount > 0 ? '#dc2626' : '#059669');
        doc.text(fmtCurr(item.disputableAmount, currency), leftMargin + 332, currRowY + 7, { width: 80, align: 'right' });

        const badgeLabel = item.status === 'fully_before_cutoff'
          ? '100% Pre-Cutoff'
          : item.status === 'straddles_cutoff'
            ? 'Pro-Rata Split'
            : 'Within Window';
        
        doc.font('Helvetica').fontSize(6.5).fillColor(item.disputableAmount > 0 ? '#b91c1c' : '#047857');
        doc.text(badgeLabel, leftMargin + 418, currRowY + 7, { width: 90, align: 'center' });

        currRowY += rowH;
      });

      // Totals Row
      doc.rect(leftMargin, currRowY, contentWidth, 24).fill('#0f172a');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
        .text('CUMULATIVE AUDIT TOTALS', leftMargin + 10, currRowY + 8);
      doc.text(fmtCurr(totalBilled, currency), leftMargin + 252, currRowY + 8, { width: 75, align: 'right' });
      doc.fillColor('#f87171')
        .text(fmtCurr(disputableTotal, currency), leftMargin + 332, currRowY + 8, { width: 80, align: 'right' });

      // Pro-Rata Math Method Box
      const mathNoteY = currRowY + 34;
      doc.roundedRect(leftMargin, mathNoteY, contentWidth, 48, 3).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#334155')
        .text('DAILY PRO-RATA APPORTIONMENT METHODOLOGY:', leftMargin + 10, mathNoteY + 7);
      doc.fontSize(7).font('Helvetica').fillColor('#64748b')
        .text('Where a billing period straddles the statutory lookback cut-off barrier, charges are apportioned on a uniform daily consumption basis: Disputable Charge = Total Period Charge * (Days Elapsed Prior to Cut-off / Total Days in Billing Period). This provides an equitable, deterministic partition compliant with regulatory principles.', leftMargin + 10, mathNoteY + 18, { width: contentWidth - 20, lineGap: 2 });

      // =========================================================================
      // PAGE 3: STATUTORY AUTHORITY ANNEXURE
      // =========================================================================
      doc.addPage();
      drawHeaderFooter(doc, { pageNum: 3, totalPages, accountNumber, consumerName });

      // Title Banner
      doc.rect(leftMargin, 42, contentWidth, 44).fill('#0f172a');
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff')
        .text('ANNEXURE A: STATUTORY AUTHORITY & REGULATORY RULE CHECK', leftMargin + 16, 52);
      doc.fontSize(8).font('Helvetica').fillColor('#94a3b8')
        .text('Statutory reference and retrieved sources', leftMargin + 16, 68);

      // Curated Primary Statutory Authority Box (shown first)
      const primaryAuth = regulation.primaryAuthority || {
        title: regulation.title || 'Statutory Utility Code',
        clauseReference: regulation.clauseReference || 'Applicable Code',
        summary: regulation.summary || 'Under mandatory back-billing rules, energy suppliers are barred from seeking recovery of charges for energy consumed more than the statutory limit prior to the bill date where previous accurate billing was not provided.',
        sourceUrl: regulation.sourceUrl
      };

      const statBoxY = 94;
      const statBoxH = primaryAuth.sourceUrl ? 78 : 66;
      doc.roundedRect(leftMargin, statBoxY, contentWidth, statBoxH, 4).fillAndStroke('#eff6ff', '#bfdbfe');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e40af')
        .text(`PRIMARY STATUTORY AUTHORITY: ${primaryAuth.title}`, leftMargin + 14, statBoxY + 9);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#1d4ed8')
        .text(`Regulatory Reference: ${primaryAuth.clauseReference} | Statutory Limitation: ${lookbackMonths} Calendar Months`, leftMargin + 14, statBoxY + 22);
      doc.fontSize(7.5).font('Helvetica').fillColor('#1e293b')
        .text(primaryAuth.summary, leftMargin + 14, statBoxY + 35, { width: contentWidth - 28, lineGap: 2 });
      if (primaryAuth.sourceUrl) {
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#2563eb')
          .text(`Official Reference URL: ${primaryAuth.sourceUrl}`, leftMargin + 14, statBoxY + 63, {
            width: contentWidth - 28,
            link: primaryAuth.sourceUrl,
            underline: true
          });
      }

      // Live Retrieved Results under "Additional retrieved source" or Built-in Reference Note
      const citesY = statBoxY + statBoxH + 12;
      const addSource = regulation.additionalSource;
      let nextY = citesY;

      if (addSource && addSource.url) {
        const docTypeBadge = addSource.docTypeLabel ? ` (${addSource.docTypeLabel})` : '';
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a')
          .text(`ADDITIONAL RETRIEVED SOURCE${docTypeBadge}`, leftMargin, citesY);

        const hostName = addSource.host || (() => {
          try { return new URL(addSource.url).hostname.replace(/^www\./, ''); } catch { return ''; }
        })();

        const isConsultation = Boolean(addSource.docTypeLabel || (addSource.url && addSource.url.toLowerCase().includes('consultation')));
        const itemY = citesY + 14;
        let itemH = 56;
        if (isConsultation) itemH += 12;

        doc.roundedRect(leftMargin, itemY, contentWidth, itemH, 3).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a')
          .text(`Title: ${addSource.title || 'Official Regulatory Documentation'}`, leftMargin + 10, itemY + 8, { width: contentWidth - 20 });

        let currentTextY = itemY + 20;
        if (hostName) {
          doc.fontSize(7.5).font('Helvetica').fillColor('#334155')
            .text(`Host: ${hostName}`, leftMargin + 10, currentTextY, { width: contentWidth - 20 });
          currentTextY += 10;
        }

        doc.fontSize(7).font('Helvetica').fillColor('#2563eb')
          .text(`URL: ${addSource.url}`, leftMargin + 10, currentTextY, {
            width: contentWidth - 20,
            link: addSource.url,
            underline: true
          });
        currentTextY += 10;

        doc.fontSize(6.5).font('Helvetica-Oblique').fillColor('#64748b')
          .text('Retrieved by search, not verified', leftMargin + 10, currentTextY, { width: contentWidth - 20 });
        currentTextY += 9;

        if (isConsultation) {
          doc.fontSize(6.5).font('Helvetica-Oblique').fillColor('#b45309')
            .text(`Note: Retrieved source URL is a consultation document (${addSource.docTypeLabel || 'consultation'}). Primary statutory authority is cited above.`, leftMargin + 10, currentTextY, { width: contentWidth - 20 });
        }

        nextY = itemY + itemH + 10;
      } else {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a')
          .text('STATUTORY CITATION REFERENCE', leftMargin, citesY);

        const itemY = citesY + 14;
        const itemH = primaryAuth.sourceUrl ? 44 : 32;

        doc.roundedRect(leftMargin, itemY, contentWidth, itemH, 3).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fontSize(7.5).font('Helvetica').fillColor('#64748b')
          .text('Live search unavailable. Showing built-in statutory reference. Please verify with the regulator.', leftMargin + 10, itemY + 8, { width: contentWidth - 20 });
        if (primaryAuth.sourceUrl) {
          doc.fontSize(7).font('Helvetica').fillColor('#2563eb')
            .text(`Official Reference URL: ${primaryAuth.sourceUrl}`, leftMargin + 10, itemY + 24, {
              width: contentWidth - 20,
              link: primaryAuth.sourceUrl,
              underline: true
            });
        }

        nextY = itemY + itemH + 10;
      }

      // Statutory Exception & Consumer Rule Check
      const auditY = nextY;
      const auditH = isMeterObstructed ? 70 : 82;
      doc.roundedRect(leftMargin, auditY, contentWidth, auditH, 4).fillAndStroke('#f1f5f9', '#cbd5e1');

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a')
        .text('STATUTORY EXCEPTION EVALUATION & CONSUMER RULE CHECK', leftMargin + 14, auditY + 10);

      const auditLines = [
        ...(isMeterObstructed ? [] : ['• Physical Meter Obstruction: NO OBSTRUCTION: Customer permitted physical access.']),
        `• Historical Billing Basis: ${isEstimated ? 'ESTIMATED: Previous bills were rendered on estimates; supports dispute regarding delayed actual meter readings.' : 'ACTUAL: Previous bills recorded normally.'}`,
        ...(meterEvidence ? [`• Meter Photo Evidence: Serial ${meterEvidence.serialNumber || 'Recorded'} (${meterEvidence.meterType || 'Physical meter'}). Physical reading ${meterEvidence.readingValue} ${meterEvidence.unit || 'kWh'} attached as supporting evidence.`] : []),
        `• Statutory Regulatory Standing: Consumer seeks resolution under ${regulation.clauseReference || 'statutory back-billing rules'}.`,
        `• Disputed Sum: Requesting removal of ${fmtCurr(disputableTotal, currency)} accrued prior to ${cutOffDate}.`
      ];

      doc.fontSize(7.5).font('Helvetica').fillColor('#1e293b')
        .text(auditLines.join('\n'), leftMargin + 14, auditY + 24, { width: contentWidth - 28, lineGap: 3 });

      // Statutory Ombudsman Escalation Directory
      const ombY = auditY + auditH + 10;
      doc.roundedRect(leftMargin, ombY, contentWidth, 84, 4).fillAndStroke('#f8fafc', '#bfdbfe');

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1e3a8a')
        .text('OFFICIAL OMBUDSMAN ESCALATION DIRECTORY & PROTOCOL', leftMargin + 14, ombY + 10);

      const ombText = `Designated Statutory Body: ${escalation.body}
Statutory Enabling Code: ${escalation.statute}
Escalation Threshold: ${escalation.timeline}
Official Online Portal / Contact: ${escalation.website}

Escalation Protocol Instructions:
If the energy supplier fails to resolve this dispute within the standard 8-week complaints timeframe, lodge a formal dispute directly with the ombudsman above. Attach this complete dossier including the Schedule of Mathematical Evidence.`;

      doc.fontSize(7.5).font('Helvetica').fillColor('#1e293b')
        .text(ombText, leftMargin + 14, ombY + 24, { width: contentWidth - 28, lineGap: 2.5 });

      // Disclaimer Box at Bottom
      const discY = ombY + 94;
      doc.roundedRect(leftMargin, discY, contentWidth, 34, 2).fillAndStroke('#f8fafc', '#e2e8f0');
      doc.fontSize(6.5).font('Helvetica').fillColor('#64748b')
        .text('NON-LEGAL ADVICE DISCLAIMER: This document was produced using BillRight, an AI-assisted consumer advocacy utility. The mathematical calculations reflect strict calendar pro-rata apportionment against statutory lookback rules. This document is designed for consumer dispute resolution and does not constitute formal legal counsel. For complex claims, contact your statutory ombudsman.', leftMargin + 8, discY + 6, { width: contentWidth - 16, lineGap: 2 });

      // =========================================================================
      // PAGE 4: INTERNAL RISK SUMMARY (FOR YOUR RECORDS - DO NOT SEND TO THE SUPPLIER)
      // =========================================================================
      if (isMeterObstructed) {
        doc.addPage();
        drawHeaderFooter(doc, { pageNum: 4, totalPages, accountNumber, consumerName });

        // Title Banner (Internal Records Only)
        doc.rect(leftMargin, 42, contentWidth, 48).fill('#450a0a');
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff')
          .text('For your records - do not send to the supplier', leftMargin + 16, 52);
        doc.fontSize(8.5).font('Helvetica').fillColor('#fca5a5')
          .text('INTERNAL CONSUMER RISK SUMMARY • METER ACCESS EXCEPTION ADVISORY', leftMargin + 16, 70);

        // Warning Callout Box
        const warnY = 98;
        const warnH = 76;
        doc.roundedRect(leftMargin, warnY, contentWidth, warnH, 4).fillAndStroke('#fef2f2', '#ef4444');
        doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#991b1b')
          .text('CRITICAL NOTICE: POTENTIAL STATUTORY EXCEPTION APPLIES', leftMargin + 14, warnY + 10);
        doc.fontSize(8).font('Helvetica').fillColor('#7f1d1d')
          .text('Protection may not apply if the supplier shows you unreasonably prevented access to read the meter. Consider getting advice before sending.', leftMargin + 14, warnY + 26, { width: contentWidth - 28, lineGap: 3 });
        doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#b91c1c')
          .text('This internal risk assessment page has been generated for your personal records only and must not be sent to your energy supplier.', leftMargin + 14, warnY + 54, { width: contentWidth - 28 });

        // Detailed Guidance Box
        const guideY = warnY + warnH + 16;
        const guideH = 260;
        doc.roundedRect(leftMargin, guideY, contentWidth, guideH, 4).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a')
          .text('CONSUMER ADVOCACY & EVIDENCE RECOMMENDATIONS', leftMargin + 14, guideY + 12);

        const guidancePoints = [
          '1. Statutory Exception Principle: Across all covered jurisdictions (Ofgem SLC 21BA in the UK, NERR Rule 30 in Australia, and PG&E Electric Rule 17.1 (SCE/SDG&E equivalents) in California), statutory back-billing caps protect consumers from delayed billing errors. In the UK, exceptions under SLC 21BA include where the consumer was obstructive or manifestly unreasonable, or contracts under 12 months. Many back-billing rules contain exceptions; check the rule for your jurisdiction where the consumer unreasonably prevented or denied meter reading access.',
          '2. Evidencing Exceptions: A supplier relying on an exception would normally be expected to evidence it; check your regulator\'s guidance. For unfulfilled appointments or failure to read without proof of attempted visits, check the regulator\'s guidance.',
          '3. What the Supplier Must Produce: If the retailer claims obstruction, request contemporaneous records: specific dates and times of alleged visits, meter reader GPS timestamps, logs of customer contact, and physical proof that notification was left.',
          '4. Preserving Your Legal Position: The accompanying formal dispute notice (Pages 1–3) disputes the unbilled back-billing sum without volunteering or admitting obstruction. Do not concede access issues in oral or written communications without verifying the supplier\'s logs.',
          '5. Independent Escalation: If the supplier produces credible evidence of obstruction, consult your statutory ombudsman (' + escalation.body + ') or a certified consumer advice service before proceeding to formal arbitration.'
        ];

        doc.fontSize(7.5).font('Helvetica').fillColor('#334155')
          .text(guidancePoints.join('\n\n'), leftMargin + 14, guideY + 30, { width: contentWidth - 28, lineGap: 2.5 });

        // Contact Directory Box
        const ctcY = guideY + guideH + 14;
        doc.roundedRect(leftMargin, ctcY, contentWidth, 70, 4).fillAndStroke('#eff6ff', '#93c5fd');
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1e40af')
          .text('FREE INDEPENDENT ADVICE RESOURCES', leftMargin + 14, ctcY + 10);
        const adviceText = `• Designated Statutory Ombudsman: ${escalation.body}\n• Official Portal: ${escalation.website}\n• Consumer Advisory: For confidential, free assistance with energy disputes, contact Citizens Advice (UK), your state community legal centre (AU), or the CPUC Public Advisor's Office (US).`;
        doc.fontSize(7.5).font('Helvetica').fillColor('#1e293b')
          .text(adviceText, leftMargin + 14, ctcY + 24, { width: contentWidth - 28, lineGap: 2.5 });
      }

      doc.end();

    } catch (err) {
      reject(err);
    }
  });
}

