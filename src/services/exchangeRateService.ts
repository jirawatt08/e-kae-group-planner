import { CurrencyCode } from '../types';

/**
 * Service for fetching and caching exchange rates from Frankfurter API.
 * Rates are based on daily European Central Bank data.
 */

interface CachedRates {
  base: CurrencyCode;
  rates: Record<string, number>;
  fetchedAt: number;
}

const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours cache
const API_BASE = 'https://api.frankfurter.app';

// In-memory cache to avoid redundant network requests during a session
const cache: Record<string, CachedRates> = {};

export const exchangeRateService = {
  /**
   * Fetches latest rates for a specific base currency.
   * Returns cached data if it hasn't expired.
   */
  async getLatestRates(base: CurrencyCode): Promise<Record<string, number>> {
    const cached = cache[base];
    const now = Date.now();

    if (cached && (now - cached.fetchedAt) < CACHE_TTL) {
      return cached.rates;
    }

    try {
      const response = await fetch(`${API_BASE}/latest?from=${base}`);
      if (!response.ok) throw new Error('Failed to fetch exchange rates');
      
      const data = await response.json();
      
      // Store in cache
      cache[base] = {
        base,
        rates: data.rates,
        fetchedAt: now
      };

      return data.rates;
    } catch (error) {
      console.error('Exchange rate fetch error:', error);
      // If network fails, try to return stale cache if available, or empty object
      return cached?.rates || {};
    }
  },

  /**
   * Converts an amount from one currency to another using the provided rates map.
   */
  convert(amount: number, rates: Record<string, number>, targetCurrency: CurrencyCode): number {
    if (targetCurrency === 'THB' && !rates['THB']) return amount; // Base is same as target
    const rate = rates[targetCurrency];
    if (!rate) return amount;
    return amount * rate;
  }
};
