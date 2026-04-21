import { Crown, Edit3, Eye } from 'lucide-react';
import { Role } from '../types';

/**
 * Standard utility for resolving user display names across the app.
 * Handles "You" (me) identification and fallback for missing profiles.
 */
export function resolveDisplayName(
  uid: string,
  currentUserId: string | undefined,
  memberProfiles: Record<string, any>,
  tYou: string = 'You'
): string {
  if (currentUserId && uid === currentUserId) return tYou;
  
  const profile = memberProfiles[uid];
  if (profile?.displayName) return profile.displayName;
  
  // Fallback if profile not yet loaded or not found
  return `User ${uid.substring(0, 8)}`;
}

/**
 * Configuration for user roles with icons and styles.
 */
export const roleConfig: Record<Role, { label: string; thLabel: string; icon: any; color: string; bg: string }> = {
  owner:  { label: 'Owner',  thLabel: 'เจ้าของ',     icon: Crown,   color: 'text-warning',  bg: 'bg-warning/10' },
  editor: { label: 'Editor', thLabel: 'แก้ไขได้',     icon: Edit3,   color: 'text-info',     bg: 'bg-info/10' },
  viewer: { label: 'Viewer', thLabel: 'ดูได้อย่างเดียว', icon: Eye,     color: 'text-muted-foreground',   bg: 'bg-muted/20' },
};

/**
 * Gets the localized label for a role.
 */
export function getRoleLabel(role: Role, language: string): string {
  const config = roleConfig[role] || roleConfig.viewer;
  return language === 'th' ? config.thLabel : config.label;
}

/**
 * Checks if a user is the owner of a trip.
 */
export function isTripOwner(uid: string, ownerId: string): boolean {
  return uid === ownerId;
}

/**
 * Generates a stable, pleasing HSL color from a user ID.
 */
export function getUserColor(uid: string): string {
  if (!uid) return 'hsl(0, 0%, 50%)';
  
  // Hash function
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Hue 0-360
  const hue = Math.abs(hash % 360);
  // Saturation 65% for vibrance
  const saturation = 65;
  // Lightness 45% for readability on white/dark
  const lightness = 45;
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Returns style objects for a user's unique color.
 */
export function getUserColorStyles(uid: string) {
  const color = getUserColor(uid);
  return {
    text: { color },
    bg: { backgroundColor: color },
    border: { borderColor: color },
    badge: {
      backgroundColor: `${color.replace('hsl', 'hsla').replace('%)', ', 0.1%)')}`,
      color: color,
      borderColor: `${color.replace('hsl', 'hsla').replace('%)', ', 0.2%)')}`,
    }
  };
}
