/**
 * Date Utilities
 */

/**
 * Get date string (YYYY-MM-DD) from timezone name.
 */
export function getDateFromTimezone(timezone: string): string | null {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;

    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Invalid timezone
  }
  return null;
}

/**
 * Get date string from UTC offset in minutes.
 */
export function getDateFromOffset(offsetMinutes: number): string {
  const localNow = new Date(Date.now() - offsetMinutes * 60_000);
  return localNow.toISOString().slice(0, 10);
}

/**
 * Get local day key from request headers.
 * Checks x-client-timezone and x-client-tz-offset-minutes.
 * Falls back to UTC.
 */
export function getLocalDayKey(req: {
  header: (name: string) => string | string[] | undefined;
}): string {
  const timeZoneHeader = (req.header('x-client-timezone') || '').toString().trim();
  if (timeZoneHeader) {
    const dateFromTz = getDateFromTimezone(timeZoneHeader);
    if (dateFromTz) return dateFromTz;
  }

  const offsetHeader = (req.header('x-client-tz-offset-minutes') || '').toString().trim();
  const offsetMinutes = Number.parseInt(offsetHeader, 10);
  if (Number.isFinite(offsetMinutes)) {
    return getDateFromOffset(offsetMinutes);
  }

  return new Date().toISOString().slice(0, 10); // UTC fallback
}
