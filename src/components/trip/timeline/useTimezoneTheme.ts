import { useMemo } from 'react';
import { getStringHue } from '../../../lib/dateUtils';

/** Derived color tokens for a timezone-themed card */
export interface TimezoneTheme {
  hue: number;
  /** Primary accent color for icons, badges, borders */
  accent: string;
  /** Very subtle tinted background for the card */
  cardBg: string;
  /** Subtle tinted border for the card and dividers */
  cardBorder: string;
}

/**
 * Derives a consistent color theme from a timezone string.
 * Uses the deterministic hue from `getStringHue` and adapts
 * saturation/lightness for dark vs. light mode.
 */
export function useTimezoneTheme(timezone: string): TimezoneTheme {
  return useMemo(() => {
    const hue = getStringHue(timezone);
    const isDark = document.documentElement.classList.contains('dark');
    return {
      hue,
      accent: `hsl(${hue}, ${isDark ? '60%' : '70%'}, ${isDark ? '60%' : '45%'})`,
      cardBg: `hsla(${hue}, 70%, 45%, 0.03)`,
      cardBorder: `hsla(${hue}, 70%, 45%, 0.15)`,
    };
  }, [timezone]);
}
