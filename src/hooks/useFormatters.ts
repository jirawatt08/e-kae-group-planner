import { useTripData } from '../contexts/TripDataContext';
import { safeFormat } from '../lib/dateUtils';

/**
 * Hook providing centralized formatting functions based on trip-level settings.
 * Ensures consistent time (12h/24h) and currency (฿/$/¥ etc) across the app.
 */
export function useFormatters() {
  const { tripSettings } = useTripData();

  /** 
   * Format time respecting the trip's 12h/24h setting.
   * Falls back to "Pending" if date is invalid.
   */
  const formatTime = (value: any, tz?: string) => {
    const fmt = tripSettings.timeFormat === '24h' ? 'HH:mm' : 'h:mm a';
    return safeFormat(value, fmt, 'Pending', tz);
  };

  /** 
   * Format a number as currency using the native Intl.NumberFormat API.
   * Automatically handles symbols, commas, and currency-specific decimals.
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: tripSettings.currency,
      // No decimals for specific currencies often handled as whole units
      maximumFractionDigits: ['JPY', 'KRW', 'VND'].includes(tripSettings.currency) ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return { 
    formatTime, 
    formatCurrency, 
    currency: tripSettings.currency,
    timeFormat: tripSettings.timeFormat 
  };
}
