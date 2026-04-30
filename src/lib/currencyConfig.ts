import { CurrencyCode } from '../types';

export interface CurrencyConfig {
  symbol: string;
  name: string;
  locale: string;
  decimals: number;
  flag: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  THB: { symbol: '฿', name: 'Thai Baht', locale: 'th-TH', decimals: 2, flag: '🇹🇭' },
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US', decimals: 2, flag: '🇺🇸' },
  JPY: { symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP', decimals: 0, flag: '🇯🇵' },
  EUR: { symbol: '€', name: 'Euro', locale: 'de-DE', decimals: 2, flag: '🇪🇺' },
  GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB', decimals: 2, flag: '🇬🇧' },
  KRW: { symbol: '₩', name: 'South Korean Won', locale: 'ko-KR', decimals: 0, flag: '🇰🇷' },
  CNY: { symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN', decimals: 2, flag: '🇨🇳' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG', decimals: 2, flag: '🇸🇬' },
  MYR: { symbol: 'RM', name: 'Malaysian Ringgit', locale: 'ms-MY', decimals: 2, flag: '🇲🇾' },
  VND: { symbol: '₫', name: 'Vietnamese Dong', locale: 'vi-VN', decimals: 0, flag: '🇻🇳' },
  AUD: { symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', decimals: 2, flag: '🇦🇺' },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];
