/**
 * Simple LocalStorage based cache for user profiles to reduce Firestore reads.
 */

const CACHE_KEY = 'ekae_profile_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const profileCache = {
  get: (uid: string) => {
    try {
      const cacheStr = localStorage.getItem(CACHE_KEY);
      if (!cacheStr) return null;
      const cache = JSON.parse(cacheStr);
      const entry = cache[uid];
      
      if (entry && (Date.now() - entry.timestamp < CACHE_TTL)) {
        return entry.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  set: (uid: string, data: any) => {
    try {
      const cacheStr = localStorage.getItem(CACHE_KEY) || '{}';
      const cache = JSON.parse(cacheStr);
      cache[uid] = {
        timestamp: Date.now(),
        data
      };
      
      // Basic cleanup for old entries if cache gets large
      const entries = Object.entries(cache);
      if (entries.length > 200) {
        const sorted = entries.sort((a: any, b: any) => a[1].timestamp - b[1].timestamp);
        const newCache = Object.fromEntries(sorted.slice(50));
        localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
      } else {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      }
    } catch (err) {
      console.warn('Failed to update profile cache', err);
    }
  }
};
