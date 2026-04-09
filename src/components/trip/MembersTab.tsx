import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTripData } from '../../contexts/TripDataContext';
import { db } from '../../firebase';
import { doc, updateDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../lib/firestoreError';
import { logActivity } from '../../lib/activityLogger';
import { Button } from '@/components/ui/button';
import { Shield, Edit3, Eye, Crown, UserMinus } from 'lucide-react';
import { toast } from 'sonner';

const roleConfig: Record<string, { label: string; thLabel: string; icon: any; color: string; bg: string }> = {
  owner:  { label: 'Owner',  thLabel: 'เจ้าของ',     icon: Crown,   color: 'text-amber-600',  bg: 'bg-amber-100' },
  editor: { label: 'Editor', thLabel: 'แก้ไขได้',     icon: Edit3,   color: 'text-blue-600',   bg: 'bg-blue-100' },
  viewer: { label: 'Viewer', thLabel: 'ดูได้อย่างเดียว', icon: Eye,     color: 'text-gray-600',   bg: 'bg-gray-100' },
};

export function MembersTab({ tripId, tripMembers }: { tripId: string; tripMembers: Record<string, string> }) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { trip } = useTripData();

  const currentUserRole = tripMembers[user?.uid || ''];
  const isOwner = currentUserRole === 'owner';
  const memberEntries = Object.entries(tripMembers);

  const handleRoleChange = async (uid: string, newRole: string) => {
    if (!isOwner || !user) return;
    if (uid === user.uid) {
      toast.error(t('cannot_change_own_role') || "You can't change your own role");
      return;
    }

    try {
      const tripRef = doc(db, 'trips', tripId);
      await updateDoc(tripRef, {
        [`members.${uid}`]: newRole,
        updatedAt: serverTimestamp()
      });
      await logActivity(tripId, 'Updated member role', `User ${uid.substring(0, 5)} → ${newRole}`);
      toast.success(t('role_updated') || 'Role updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}`);
    }
  };

  const handleRemoveMember = async (uid: string) => {
    if (!isOwner || !user) return;
    if (uid === user.uid) {
      toast.error(t('cannot_remove_self') || "You can't remove yourself");
      return;
    }
    if (tripMembers[uid] === 'owner') {
      toast.error(t('cannot_remove_owner') || "You can't remove another owner");
      return;
    }

    try {
      const tripRef = doc(db, 'trips', tripId);
      await updateDoc(tripRef, {
        [`members.${uid}`]: deleteField(),
        updatedAt: serverTimestamp()
      });
      await logActivity(tripId, 'Removed member', `User ${uid.substring(0, 5)}`);
      toast.success(t('member_removed') || 'Member removed');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t('members_title') || 'Members'}
        </h2>
        <span className="text-sm text-gray-500">
          {memberEntries.length} {t('members')}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3">
          {memberEntries.map(([uid, role]) => {
            const config = roleConfig[role] || roleConfig.viewer;
            const RoleIcon = config.icon;
            const isMe = uid === user?.uid;

            return (
              <div key={uid} className="flex items-center justify-between p-3 rounded-lg border bg-white shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`${config.bg} p-2 rounded-full`}>
                    <RoleIcon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {isMe ? t('you') : `User ${uid.substring(0, 8)}`}
                      {isMe && <span className="ml-1 text-xs text-gray-400">({t('me')})</span>}
                    </p>
                    <p className={`text-xs ${config.color} font-medium`}>
                      {language === 'th' ? config.thLabel : config.label}
                    </p>
                  </div>
                </div>

                {isOwner && !isMe && (
                  <div className="flex items-center gap-1.5">
                    <select
                      className="text-xs border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                      value={role}
                      onChange={(e) => handleRoleChange(uid, e.target.value)}
                    >
                      <option value="editor">{language === 'th' ? 'แก้ไขได้' : 'Editor'}</option>
                      <option value="viewer">{language === 'th' ? 'ดูได้อย่างเดียว' : 'Viewer'}</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRemoveMember(uid)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
