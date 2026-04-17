import { format as dateFnsFormat, isValid } from 'date-fns';

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
 */
export function safeFormat(value: any, formatStr: string, fallback: string = ''): string {
  const date = toDate(value);
  if (!date) return fallback;
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

/**
 * Generates a stable HSL color based on a date string.
 */
export function getDayColor(dateStr: string): string {
  if (!dateStr) return 'hsl(210, 100%, 50%)';
  
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 45%)`;
}
