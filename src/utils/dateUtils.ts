/**
 * Utility functions to consistently format dates in Indian Standard Time (IST - Asia/Kolkata)
 */

export function formatToISTDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';

  // If dateStr is already a simple date YYYY-MM-DD without time/timeZone component
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  return `${year}-${month}-${day}`;
}

export function formatToISTShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export function formatToISTDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  const dayMonth = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
  }).format(date);

  const time = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(date)
    .replace(' ', '')
    .toUpperCase();

  return `${dayMonth} ${time}`;
}

/**
 * Cutoff configuration for operational day transition.
 * Daily schedule runs 12:00 PM to 4:00 AM.
 * The operational day changes at 06:30 AM IST instead of 12:00 AM (midnight).
 * Any activity between 12:00 AM and 06:29:59 AM IST belongs to the previous day's shift.
 */
export const OPERATIONAL_DAY_CUTOFF_OFFSET_MS = (6 * 60 + 30) * 60 * 1000; // 6h 30m in ms

/**
 * Returns a Date object shifted back by 6.5 hours to represent the operational day.
 */
export function getOperationalDateObject(date: Date | string | number = new Date()): Date {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return new Date();
  return new Date(d.getTime() - OPERATIONAL_DAY_CUTOFF_OFFSET_MS);
}

/**
 * Returns the operational date string (YYYY-MM-DD in IST) for any timestamp,
 * where the day changes at 6:30 AM IST.
 */
export function getOperationalISTDate(date: Date | string | number = new Date()): string {
  const shiftedDate = getOperationalDateObject(date);
  return formatToISTDate(shiftedDate.toISOString());
}

/**
 * Converts any timestamp or date string into its operational date (YYYY-MM-DD in IST).
 * If the input is already a plain YYYY-MM-DD, it is returned as is.
 */
export function formatToOperationalDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  return getOperationalISTDate(dateStr);
}

