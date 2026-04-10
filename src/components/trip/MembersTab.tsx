import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTripData } from '../../contexts/TripDataContext';
import { useMembers } from '../../hooks/useMembers';
import { Role } from '../../types';
import { Button } from '@/components/ui/button';
import { Shield, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { tripService } from '../../services/tripService';
import { useNavigate } from 'react-router-dom';
import { MemberItem } from './members/MemberItem';

export function MembersTab({ tripId, tripMembers }: { tripId: string; tripMembers: Record<string, string> }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { memberProfiles } = useTripData();

  const currentUserRole = tripMembers[user?.uid || ''];
  const isOwner = currentUserRole === 'owner';
  const memberEntries = Object.entries(tripMembers);
  const { updateRole, removeMember } = useMembers(tripId, isOwner);

  const handleRoleChange = async (uid: string, newRole: string) => {
    if (uid === user?.uid) {
      toast.error(t('cannot_change_own_role') || "You can't change your own role");
      return;
    }
    const success = await updateRole(uid, newRole as Role);
    if (success) {
      toast.success(t('role_updated') || 'Role updated');
    }
  };

  const handleRemoveMember = async (uid: string) => {
    if (uid === user?.uid) {
      toast.error(t('cannot_remove_self') || "You can't remove yourself");
      return;
    }
    if (tripMembers[uid] === 'owner') {
      toast.error(t('cannot_remove_owner') || "You can't remove another owner");
      return;
    }
    const success = await removeMember(uid, tripMembers[uid]);
    if (success) {
      toast.success(t('member_removed') || 'Member removed');
    }
  };

  const handleDeleteTrip = async () => {
    if (!window.confirm(t('confirm_delete_trip') || 'Are you absolutely sure you want to delete this trip? All data will be lost.')) return;
    
    try {
      await tripService.deleteTrip(tripId);
      toast.success(t('trip_deleted') || 'Trip deleted successfully');
      navigate('/');
    } catch (err) {
      console.error(err);
      toast.error(t('delete_failed') || 'Failed to delete trip');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-start mb-6 pb-4 border-b">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('members_title') || 'Members'}
          </h2>
          <span className="text-sm text-gray-500">
            {memberEntries.length} {t('members')}
          </span>
        </div>
        {isOwner && (
          <Button variant="destructive" size="sm" onClick={handleDeleteTrip} className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            {t('delete_trip') || 'Delete Entire Trip'}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3">
          {memberEntries.map(([uid, role]) => {
            const isMe = uid === user?.uid;
            return (
              <MemberItem
                key={uid}
                uid={uid}
                role={role}
                isMe={isMe}
                isOwner={isOwner}
                displayName={memberProfiles[uid]?.displayName || `User ${uid.substring(0, 8)}`}
                onRoleChange={handleRoleChange}
                onRemoveMember={handleRemoveMember}
              />
            );
          })}
        </div>
      </div>

    </div>
  );
}
