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
