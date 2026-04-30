import { format as dateFnsFormat, isValid } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Safely converts a value (Firestore Timestamp, Date, string, or number) to a Date object.
 * Returns null if the value is invalid or missing.
 */
export function toDate(value: any): Date | null {
  if (!value) return null;
  
  // Handle Firestore Timestamp
  if (value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  
  // Handle existing Date object
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }
  
  // Handle string or number
  const date = new Date(value);
  return isValid(date) ? date : null;
}

/**
 * Safely formats a date-like value.
 * Returns a fallback string if the date is invalid.
 * If timeZone is provided, formats the date in that specific timezone.
 */
export function safeFormat(value: any, formatStr: string, fallback: string = '', timeZone?: string): string {
  const date = toDate(value);
  if (!date) return fallback;
  
  if (timeZone) {
    try {
      return formatInTimeZone(date, timeZone, formatStr);
    } catch (e) {
      console.warn(`Invalid timezone: ${timeZone}`, e);
    }
  }
  
  return dateFnsFormat(date, formatStr);
}

/**
 * Calculates the day number (starting from 1) relative to a trip start date.
 */
export function getDayNumber(dateValue: any, firstDateValue: any): number {
  const date = toDate(dateValue);
  const firstDate = toDate(firstDateValue);
  if (!date || !firstDate) return 1;

  // Set both to midnight for accurate day difference
  const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const d2 = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());
  
  const diffTime = Math.abs(d1.getTime() - d2.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays + 1;
}

export function getStringHue(str: string): number {
  if (!str) return 210;
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return Math.abs(hash % 360);
}

/**
 * Generates a stable HSL color based on a date string.
 */
export function getDayColor(dateStr: string): string {
  const hue = getStringHue(dateStr);
  return `hsl(${hue}, 70%, 45%)`;
}
