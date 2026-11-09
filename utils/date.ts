/**
 * Centralized Indian Standard Time (IST) Date and Time Utilities for Nurofin Executive AI.
 * Ensures consistent parsing of UTC server datetimes and displays accurate IST timestamps.
 */

export function parseUTC(dateInput: string | Date | number | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  }
  let str = String(dateInput).trim();
  if (!str) return null;

  // Handle date-only strings like "2026-11-09"
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    str += 'T00:00:00Z';
  } else {
    // Replace space with 'T' (e.g., "2026-11-09 06:15:30")
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(str)) {
      str = str.replace(' ', 'T');
    }
    // Append 'Z' if missing timezone offset so naive server datetimes parse as UTC
    if (!str.endsWith('Z') && !/[+-]\d{2}(:?\d{2})?$/.test(str)) {
      str += 'Z';
    }
  }

  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return null;

  // Auto-correct timestamps that were saved as local IST (UTC+5:30) in PostgreSQL
  // and subsequently tagged with 'Z', causing them to appear ~5.5 hours in the future
  const now = Date.now();
  const futureDiff = parsed.getTime() - now;
  // If the parsed date is between 15 minutes and 6.5 hours in the future,
  // it was an IST timestamp mislabeled as UTC. Shift it back by 5.5 hours (19,800,000 ms).
  if (futureDiff > 15 * 60 * 1000 && futureDiff <= 6.5 * 60 * 60 * 1000) {
    return new Date(parsed.getTime() - (5 * 60 + 30) * 60 * 1000);
  }

  return parsed;
}

/**
 * Formats a date into Indian Standard Time (IST) with date, 12-hour time and AM/PM.
 * Example output: "09 Nov 2026, 11:30 AM IST"
 */
export function formatISTDateTime(
  dateInput: string | Date | number | null | undefined,
  options: { showSeconds?: boolean; shortMonth?: boolean; withTimezone?: boolean } = {}
): string {
  const date = parseUTC(dateInput);
  if (!date) return '';

  const { showSeconds = false, shortMonth = true, withTimezone = true } = options;

  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: shortMonth ? 'short' : 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
    hour12: true,
  });

  const formatted = formatter.format(date);
  return withTimezone ? `${formatted} IST` : formatted;
}

/**
 * Formats time in Indian Standard Time (IST).
 * Example: "11:30 AM IST"
 */
export function formatISTTime(
  dateInput: string | Date | number | null | undefined,
  options: { showSeconds?: boolean; withTimezone?: boolean } = {}
): string {
  const date = parseUTC(dateInput);
  if (!date) return '';
  const { showSeconds = false, withTimezone = true } = options;
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
    hour12: true,
  });
  const formatted = formatter.format(date);
  return withTimezone ? `${formatted} IST` : formatted;
}

/**
 * Formats date in Indian Standard Time (IST).
 * Example: "09 Nov 2026"
 */
export function formatISTDate(dateInput: string | Date | number | null | undefined): string {
  const date = parseUTC(dateInput);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Accurately calculates relative time against UTC parsed date.
 * Returns "Just now", "2m ago", "1h ago", etc.
 */
export function accurateTimeAgo(dateInput: string | Date | number | null | undefined): string {
  const date = parseUTC(dateInput);
  if (!date) return '';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'Just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/**
 * Combines explicit IST timestamp and accurate relative time.
 * Example: "09 Nov 2026, 11:30 AM IST (Just now)"
 */
export function formatTimestampWithAgo(dateInput: string | Date | number | null | undefined): string {
  const date = parseUTC(dateInput);
  if (!date) return '';
  const ist = formatISTDateTime(date);
  const ago = accurateTimeAgo(date);
  return `${ist} (${ago})`;
}
