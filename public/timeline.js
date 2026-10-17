/**
 * BillRight — Interactive SVG Dispute Timeline Visualizer
 * Renders statutory lookback cut-off barrier, permissible vs disputable zones,
 * and individual period tracks with pro-rata split segments.
 */

function fmtMoney(amount, currency = '£') {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return `${currency}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function renderTimeline({
  containerId = 'timeline-container',
  tooltipId = 'timeline-tooltip',
  billDate,
  cutOffDate,
  itemizedBreakdown,
  currency = '£',
  lookbackMonths = 12
}) {
  const container = document.getElementById(containerId);
  const tooltip = document.getElementById(tooltipId);
  if (!container || !itemizedBreakdown || itemizedBreakdown.length === 0) return;

  container.innerHTML = '';

  // 1. Calculate time boundaries
  let earliestMs = new Date(cutOffDate + 'T00:00:00Z').getTime() - (30 * 86400000);
  let latestMs = new Date(billDate + 'T00:00:00Z').getTime() + (15 * 86400000);

  itemizedBreakdown.forEach(item => {
    const s = new Date(item.startDate + 'T00:00:00Z').getTime();
    const e = new Date(item.endDate + 'T00:00:00Z').getTime();
    if (s < earliestMs) earliestMs = s - (15 * 86400000);
    if (e > latestMs) latestMs = e + (15 * 86400000);
  });

  const totalTimeSpan = latestMs - earliestMs;

  // 2. Coordinate dimensions
  const svgWidth = 820;
  const padLeft = 45;
  const padRight = 45;
  const chartWidth = svgWidth - padLeft - padRight;

  const trackHeight = 32;
  const trackGap = 16;
  const headerHeight = 55;
  const axisHeight = 45;
  const totalHeight = headerHeight + (itemizedBreakdown.length * (trackHeight + trackGap)) + axisHeight;

  function dateToX(dateStr) {
    const t = new Date(dateStr + 'T00:00:00Z').getTime();
    const ratio = (t - earliestMs) / totalTimeSpan;
    return padLeft + Math.max(0, Math.min(chartWidth, ratio * chartWidth));
  }

  const cutOffX = dateToX(cutOffDate);
  const billDateX = dateToX(billDate);
  const chartBottomY = totalHeight - axisHeight;

  // 3. Construct SVG markup
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${svgWidth} ${totalHeight}`);
  svg.setAttribute('class', 'timeline-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Timeline visualization of back-billing periods against ${lookbackMonths}-month cut-off date`);

  // Background Zones
  // Zone 1: Disputable Back-Billing Zone (Left)
  const disputableWidth = Math.max(0, cutOffX - padLeft);
  if (disputableWidth > 0) {
    const dispRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    dispRect.setAttribute('x', padLeft);
    dispRect.setAttribute('y', 40);
    dispRect.setAttribute('width', disputableWidth);
    dispRect.setAttribute('height', chartBottomY - 40);
    dispRect.setAttribute('class', 'zone-disputable');
    svg.appendChild(dispRect);

    const dispLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    dispLabel.setAttribute('x', padLeft + 12);
    dispLabel.setAttribute('y', 56);
    dispLabel.setAttribute('class', 'zone-label disputable-label');
    dispLabel.textContent = `DISPUTABLE WINDOW (Pre-${cutOffDate})`;
    svg.appendChild(dispLabel);
  }

  // Zone 2: Permissible Billing Zone (Right)
  const permWidth = Math.max(0, (padLeft + chartWidth) - cutOffX);
  if (permWidth > 0) {
    const permRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    permRect.setAttribute('x', cutOffX);
    permRect.setAttribute('y', 40);
    permRect.setAttribute('width', permWidth);
    permRect.setAttribute('height', chartBottomY - 40);
    permRect.setAttribute('class', 'zone-permissible');
    svg.appendChild(permRect);

    const permLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    permLabel.setAttribute('x', cutOffX + 12);
    permLabel.setAttribute('y', 56);
    permLabel.setAttribute('class', 'zone-label permissible-label');
    permLabel.textContent = `PERMITTED WINDOW (${lookbackMonths} Mos)`;
    svg.appendChild(permLabel);
  }

  // 4. Render Billing Period Tracks
  itemizedBreakdown.forEach((item, idx) => {
    const trackY = headerHeight + 15 + (idx * (trackHeight + trackGap));
    const startX = dateToX(item.startDate);
    const endX = dateToX(item.endDate);
    const barWidth = Math.max(6, endX - startX);

    const gTrack = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gTrack.setAttribute('class', 'period-track-group');
    gTrack.setAttribute('data-index', idx);
    gTrack.setAttribute('tabindex', '0');

    // Case 1: 100% Pre-Cutoff (Disputable)
    if (item.status === 'fully_before_cutoff') {
      const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bar.setAttribute('x', startX);
      bar.setAttribute('y', trackY);
      bar.setAttribute('width', barWidth);
      bar.setAttribute('height', trackHeight);
      bar.setAttribute('rx', 6);
      bar.setAttribute('class', 'period-bar bar-disputable');
      gTrack.appendChild(bar);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', startX + 10);
      label.setAttribute('y', trackY + 20);
      label.setAttribute('class', 'bar-text');
      label.textContent = `Period ${idx + 1}: ${fmtMoney(item.amount, currency)} (Disputable)`;
      gTrack.appendChild(label);
    }
    // Case 2: 100% Permissible Window
    else if (item.status === 'within_allowed_window') {
      const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bar.setAttribute('x', startX);
      bar.setAttribute('y', trackY);
      bar.setAttribute('width', barWidth);
      bar.setAttribute('height', trackHeight);
      bar.setAttribute('rx', 6);
      bar.setAttribute('class', 'period-bar bar-permissible');
      gTrack.appendChild(bar);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', startX + 10);
      label.setAttribute('y', trackY + 20);
      label.setAttribute('class', 'bar-text');
      label.textContent = `Period ${idx + 1}: ${fmtMoney(item.amount, currency)} (Permitted)`;
      gTrack.appendChild(label);
    }
    // Case 3: Straddles Cut-off -> Visual Pro-Rata Split
    else {
      const splitX = cutOffX;
      const dispWidth = Math.max(3, splitX - startX);
      const permWidthStraddle = Math.max(3, endX - splitX);

      // Disputable segment (left)
      const barDisp = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      barDisp.setAttribute('x', startX);
      barDisp.setAttribute('y', trackY);
      barDisp.setAttribute('width', dispWidth);
      barDisp.setAttribute('height', trackHeight);
      barDisp.setAttribute('rx', 4);
      barDisp.setAttribute('class', 'period-bar bar-disputable');
      gTrack.appendChild(barDisp);

      // Permissible segment (right)
      const barPerm = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      barPerm.setAttribute('x', splitX);
      barPerm.setAttribute('y', trackY);
      barPerm.setAttribute('width', permWidthStraddle);
      barPerm.setAttribute('height', trackHeight);
      barPerm.setAttribute('rx', 4);
      barPerm.setAttribute('class', 'period-bar bar-permissible');
      gTrack.appendChild(barPerm);

      // Disputable text
      if (dispWidth > 60) {
        const textDisp = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textDisp.setAttribute('x', startX + 8);
        textDisp.setAttribute('y', trackY + 20);
        textDisp.setAttribute('class', 'bar-text');
        textDisp.textContent = fmtMoney(item.disputableAmount, currency);
        gTrack.appendChild(textDisp);
      }

      // Permissible text
      if (permWidthStraddle > 60) {
        const textPerm = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textPerm.setAttribute('x', splitX + 8);
        textPerm.setAttribute('y', trackY + 20);
        textPerm.setAttribute('class', 'bar-text');
        textPerm.textContent = fmtMoney(item.amount - item.disputableAmount, currency);
        gTrack.appendChild(textPerm);
      }
    }

    // Tooltip interaction events
    const attachTooltip = (e) => {
      if (!tooltip) return;
      const permissibleAmt = Math.max(0, item.amount - item.disputableAmount);
      tooltip.innerHTML = `
        <div class="tooltip-header">Period ${idx + 1}: ${item.startDate} &rarr; ${item.endDate}</div>
        <div class="tooltip-row">
          <span>Total Billed:</span> <strong>${fmtMoney(item.amount, currency)}</strong> (${item.totalDays} days)
        </div>
        <div class="tooltip-row" style="color: #dc2626;">
          <span>Disputable Sum:</span> <strong>${fmtMoney(item.disputableAmount, currency)}</strong> (${item.disputableDays} pre-cutoff days)
        </div>
        <div class="tooltip-row" style="color: #059669;">
          <span>Permissible Sum:</span> <strong>${fmtMoney(permissibleAmt, currency)}</strong> (${item.totalDays - item.disputableDays} allowed days)
        </div>
        <div class="tooltip-status">Status: ${item.status.replace(/_/g, ' ')}</div>
      `;
      tooltip.style.display = 'block';
      tooltip.setAttribute('aria-hidden', 'false');

      const rect = container.getBoundingClientRect();
      const clientX = e.clientX || (rect.left + startX + 20);
      const clientY = e.clientY || (rect.top + trackY);
      tooltip.style.left = `${clientX + 14}px`;
      tooltip.style.top = `${clientY + 14}px`;

      // Highlight table row in itemized breakdown table
      const tableRows = document.querySelectorAll('#breakdown-tbody tr');
      if (tableRows[idx]) {
        tableRows[idx].classList.add('table-row-highlight');
      }
    };

    const detachTooltip = () => {
      if (!tooltip) return;
      tooltip.style.display = 'none';
      tooltip.setAttribute('aria-hidden', 'true');
      const tableRows = document.querySelectorAll('#breakdown-tbody tr');
      if (tableRows[idx]) {
        tableRows[idx].classList.remove('table-row-highlight');
      }
    };

    gTrack.addEventListener('mousemove', attachTooltip);
    gTrack.addEventListener('mouseenter', attachTooltip);
    gTrack.addEventListener('mouseleave', detachTooltip);
    gTrack.addEventListener('focus', attachTooltip);
    gTrack.addEventListener('blur', detachTooltip);

    svg.appendChild(gTrack);
  });

  // 5. Statutory Cut-off Barrier Line & Pill
  const barrierLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  barrierLine.setAttribute('x1', cutOffX);
  barrierLine.setAttribute('y1', 28);
  barrierLine.setAttribute('x2', cutOffX);
  barrierLine.setAttribute('y2', chartBottomY);
  barrierLine.setAttribute('class', 'cutoff-barrier-line');
  svg.appendChild(barrierLine);

  // Cut-off Badge Pill
  const pillWidth = 140;
  const pillHeight = 24;
  const pillRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  pillRect.setAttribute('x', cutOffX - (pillWidth / 2));
  pillRect.setAttribute('y', 14);
  pillRect.setAttribute('width', pillWidth);
  pillRect.setAttribute('height', pillHeight);
  pillRect.setAttribute('rx', 12);
  pillRect.setAttribute('class', 'cutoff-pill-rect');
  svg.appendChild(pillRect);

  const pillText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  pillText.setAttribute('x', cutOffX);
  pillText.setAttribute('y', 26);
  pillText.setAttribute('dominant-baseline', 'middle');
  pillText.setAttribute('text-anchor', 'middle');
  pillText.setAttribute('class', 'cutoff-pill-text');
  pillText.textContent = `Cut-off: ${cutOffDate}`;
  svg.appendChild(pillText);

  // 6. Time Axis & Labeled Dates at Bottom
  const axisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  axisLine.setAttribute('x1', padLeft);
  axisLine.setAttribute('y1', chartBottomY);
  axisLine.setAttribute('x2', padLeft + chartWidth);
  axisLine.setAttribute('y2', chartBottomY);
  axisLine.setAttribute('class', 'timeline-axis-line');
  svg.appendChild(axisLine);

  // Axis Labels
  // Text-anchor to 'end' when within 90px of right edge to prevent clipping
  const billDateAlign = (billDateX >= (padLeft + chartWidth - 90)) ? 'end' : 'middle';
  const labels = [
    { text: `Bill Date: ${billDate}`, x: billDateX, align: billDateAlign }
  ];

  labels.forEach(lbl => {
    const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    tick.setAttribute('x1', lbl.x);
    tick.setAttribute('y1', chartBottomY);
    tick.setAttribute('x2', lbl.x);
    tick.setAttribute('y2', chartBottomY + 6);
    tick.setAttribute('class', 'axis-tick');
    svg.appendChild(tick);

    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', lbl.x);
    txt.setAttribute('y', chartBottomY + 20);
    txt.setAttribute('text-anchor', lbl.align);
    txt.setAttribute('class', 'axis-label-text');
    txt.textContent = lbl.text;
    svg.appendChild(txt);
  });

  container.appendChild(svg);
}
