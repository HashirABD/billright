/**
 * iCalendar (RFC 5545) generator for statutory escalation deadlines.
 * Generates an .ics file with automated reminder alarms for Day 14 and Day 56 (8 Weeks).
 */

export function generateIcsCalendar({
  supplierName = 'Energy Supplier',
  accountNumber = 'Reference',
  disputableTotal = 0,
  currency = '£',
  startDate = new Date()
}) {
  const pad = (n) => String(n).padStart(2, '0');

  const formatIcsDate = (d) => {
    return (
      d.getUTCFullYear() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) +
      'T' +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) +
      'Z'
    );
  };

  const day14 = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  const day56 = new Date(startDate.getTime() + 56 * 24 * 60 * 60 * 1000);
  const now = formatIcsDate(new Date());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BillRight//Statutory Escalation Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',

    // Event 1: Suggested Response Deadline (Day 14)
    'BEGIN:VEVENT',
    `UID:billright-14d-${Date.now()}@billright.org`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatIcsDate(day14)}`,
    `DTEND:${formatIcsDate(new Date(day14.getTime() + 3600000))}`,
    `SUMMARY:📅 Suggested Response Deadline: ${supplierName} (${accountNumber})`,
    `DESCRIPTION:Suggested 14-day response deadline for ${supplierName} to reply in writing to back-billing dispute for ${currency}${disputableTotal.toFixed(2)}. If no acceptable resolution is reached after 8 weeks, initiate ombudsman escalation.`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT9H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Energy supplier suggested response deadline today.',
    'END:VALARM',
    'END:VEVENT',

    // Event 2: 8-Week / 56-Day Ombudsman Escalation Date
    'BEGIN:VEVENT',
    `UID:billright-56d-${Date.now()}@billright.org`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatIcsDate(day56)}`,
    `DTEND:${formatIcsDate(new Date(day56.getTime() + 3600000))}`,
    `SUMMARY:⚖️ Independent Ombudsman Escalation Date: ${supplierName} (${accountNumber})`,
    `DESCRIPTION:Standard 8-week complaint period expired. Suggested response window has passed; you may now escalate this dispute directly to the independent Energy Ombudsman.`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT9H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Independent Ombudsman escalation date reached.',
    'END:VALARM',
    'END:VEVENT',

    'END:VCALENDAR'
  ];

  return lines.join('\r\n');
}

/**
 * Prompts user download of the .ics file.
 */
export function downloadCalendarEvent(data) {
  const icsContent = generateIcsCalendar(data);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeRef = (data.accountNumber || 'Dispute').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = `BillRight_Statutory_Deadlines_${safeRef}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
