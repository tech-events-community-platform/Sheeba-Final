/**
 * Utility functions for robust event date formatting without timezone shifts.
 * Ensures consistent day-of-week and date rendering regardless of the user's local timezone.
 */

export interface CalendarTileData {
  month: string;
  day: number | string;
  weekday: string;
  fullDate: string;
  monthYear: string;
}

/**
 * Parses an event date string (e.g. "2026-09-30", "2026-09-30T00:00:00.000Z")
 * and extracts the calendar day, month, year, and weekday in UTC so that
 * local browser timezone offsets do not cause a shift into the previous day.
 */
export function getCalendarTile(dateStr?: string): CalendarTileData {
  if (!dateStr) {
    return { month: 'EVENT', day: '•', weekday: '', fullDate: '', monthYear: '' };
  }

  try {
    const cleanDateStr = dateStr.includes('T')
      ? dateStr.split('T')[0]
      : dateStr.includes(' ')
      ? dateStr.split(' ')[0]
      : dateStr.trim();

    const parts = cleanDateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);

      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        // Construct in UTC to prevent timezone offsets
        const d = new Date(Date.UTC(year, month - 1, day));
        const monthShort = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
        const weekday = d.toLocaleString('en-US', { weekday: 'long', timeZone: 'UTC' });
        const fullDate = d.toLocaleString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        });
        const monthYear = d.toLocaleString('en-US', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        });

        return {
          month: monthShort,
          day,
          weekday,
          fullDate,
          monthYear,
        };
      }
    }

    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const monthShort = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
      const day = d.getUTCDate();
      const weekday = d.toLocaleString('en-US', { weekday: 'long', timeZone: 'UTC' });
      const fullDate = d.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
      const monthYear = d.toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });

      return {
        month: monthShort,
        day,
        weekday,
        fullDate,
        monthYear,
      };
    }
  } catch {
    // ignore
  }

  return { month: 'EVENT', day: '•', weekday: '', fullDate: dateStr, monthYear: '' };
}

/**
 * Returns a clean YYYY-MM-DD string for HTML <input type="date" />
 */
export function formatDateForInput(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    if (dateStr.includes('T')) {
      return dateStr.split('T')[0];
    }
    if (dateStr.includes(' ')) {
      return dateStr.split(' ')[0];
    }
    const parts = dateStr.trim().split('-');
    if (parts.length === 3) {
      return parts.join('-');
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {
    // ignore
  }
  return dateStr;
}

/**
 * Returns a Date object representing 23:59:59.999 in East Africa Time (EAT, UTC+3)
 * for the given event date, which is exactly 20:59:59.999 UTC.
 */
export function getEndOfEventDay(dateStr?: string | Date): Date {
  if (!dateStr) return new Date();

  let year: number;
  let month: number;
  let day: number;

  if (dateStr instanceof Date) {
    year = dateStr.getUTCFullYear();
    month = dateStr.getUTCMonth() + 1;
    day = dateStr.getUTCDate();
  } else {
    const cleanStr = String(dateStr).trim();
    const isoMatch = cleanStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10);
      month = parseInt(isoMatch[2], 10);
      day = parseInt(isoMatch[3], 10);
    } else {
      const parsed = new Date(cleanStr);
      if (!isNaN(parsed.getTime())) {
        year = parsed.getUTCFullYear();
        month = parsed.getUTCMonth() + 1;
        day = parsed.getUTCDate();
      } else {
        const now = new Date();
        year = now.getUTCFullYear();
        month = now.getUTCMonth() + 1;
        day = now.getUTCDate();
      }
    }
  }

  // 23:59:59.999 in EAT (UTC+3) is exactly 20:59:59.999 UTC
  return new Date(Date.UTC(year, month - 1, day, 20, 59, 59, 999));
}

/**
 * Calculates whether an event has passed (i.e. the current timestamp is past the end of the event day)
 */
export function isEventPassed(dateStr?: string | Date): boolean {
  if (!dateStr) return false;
  const endOfDay = getEndOfEventDay(dateStr);
  return Date.now() > endOfDay.getTime();
}

