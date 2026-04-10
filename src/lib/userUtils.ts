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
  owner:  { label: 'Owner',  thLabel: 'เจ้าของ',     icon: Crown,   color: 'text-amber-600',  bg: 'bg-amber-100' },
  editor: { label: 'Editor', thLabel: 'แก้ไขได้',     icon: Edit3,   color: 'text-blue-600',   bg: 'bg-blue-100' },
  viewer: { label: 'Viewer', thLabel: 'ดูได้อย่างเดียว', icon: Eye,     color: 'text-gray-600',   bg: 'bg-gray-100' },
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
