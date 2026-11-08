/**
 * Utility for Scanner Attendee Data Privacy calculations based on the event's local timezone.
 * Enforces Specification v2.1: Local Timezone Aware (Africa/Addis_Ababa / EAT, UTC+3).
 */
export class ScannerPrivacyUtil {
  static readonly TIMEZONE = 'Africa/Addis_Ababa';

  /**
   * Formats a given ISO date string or Date object to YYYY-MM-DD in the local Addis Ababa timezone.
   */
  static toLocalDayString(dateInput: string | Date): string {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  }

  /**
   * Checks whether the event takes place today in the local EAT timezone.
   */
  static isEventTodayInLocalTime(eventDateInput: string | Date): boolean {
    const todayLocal = this.toLocalDayString(new Date());
    const eventLocal = this.toLocalDayString(eventDateInput);
    if (!todayLocal || !eventLocal) return false;
    return todayLocal === eventLocal;
  }

  /**
   * Checks whether the event has passed in the local EAT timezone.
   */
  static isEventPassedInLocalTime(eventDateInput: string | Date): boolean {
    const todayLocal = this.toLocalDayString(new Date());
    const eventLocal = this.toLocalDayString(eventDateInput);
    if (!todayLocal || !eventLocal) return false;
    return todayLocal > eventLocal;
  }
}

