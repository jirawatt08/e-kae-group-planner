import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTripData } from '../../contexts/TripDataContext';
import { useMembers } from '../../hooks/useMembers';
import { Role } from '../../types';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { tripService } from '../../services/tripService';
import { useNavigate } from 'react-router-dom';
import { MemberItem } from './members/MemberItem';
import { Copy, RefreshCw, Shield, Trash2, Link2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

export function MembersTab({ tripId, tripMembers }: { tripId: string; tripMembers: Record<string, string> }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { memberProfiles, trip, loading: dataLoading } = useTripData();

  const inviteCode = trip?.inviteCode || '';

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

  const handleCopyCode = () => {
    if (!inviteCode) return;
    const baseUrl = `${window.location.origin}/trip/${tripId}`;
    let textToCopy = inviteCode;
    
    if (trip?.isJoinEnabled && getExpiryRemaining() > 0) {
      textToCopy = `${baseUrl}?code=${inviteCode}`;
      toast.success(t('share_link_copied') || 'Share link with code copied!');
    } else {
      toast.success(t('copied') || 'Copied to clipboard');
    }
    
    navigator.clipboard.writeText(textToCopy);
  };

  const getCooldownRemaining = () => {
    if (!trip?.lastCodeGeneratedAt) return 0;
    const lastGen = trip.lastCodeGeneratedAt.toDate().getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    const remaining = fiveMinutes - (now - lastGen);
    return remaining > 0 ? remaining : 0;
  };

  const getExpiryRemaining = () => {
    if (!trip?.lastCodeGeneratedAt) return 0;
    const lastGen = trip.lastCodeGeneratedAt.toDate().getTime();
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;
    const remaining = thirtyMinutes - (now - lastGen);
    return remaining > 0 ? remaining : 0;
  };

  const [cooldownTime, setCooldownTime] = React.useState(getCooldownRemaining());
  const [expiryTime, setExpiryTime] = React.useState(getExpiryRemaining());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCooldownTime(getCooldownRemaining());
      setExpiryTime(getExpiryRemaining());
    }, 1000);
    return () => clearInterval(timer);
  }, [trip?.lastCodeGeneratedAt]);

  const handleRefreshCode = async () => {
    if (cooldownTime > 0) return;
    if (!window.confirm(t('confirm_refresh_code') || "Are you sure you want to refresh the invite code?")) return;
    try {
      await tripService.refreshInviteCode(tripId);
      toast.success(t('update_success') || 'Invite code refreshed');
    } catch (err) {
      console.error(err);
      toast.error(t('update_failed') || 'Failed to refresh code');
    }
  };

  const handleToggleJoin = async (checked: boolean) => {
    try {
      await tripService.toggleJoinCode(tripId, checked);
      toast.success(t('update_success') || 'Settings updated');
    } catch (err: any) {
      console.error(err);
      toast.error(`${t('update_failed') || 'Failed to update settings'}: ${err.message || ''}`);
    }
  };

  const formatCooldown = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return t('cooldown_wait')
      .replace('{{minutes}}', minutes.toString())
      .replace('{{seconds}}', seconds.toString());
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-start mb-6 pb-4 border-b border-border">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5" />
            {t('members_title') || 'Members'}
          </h2>
          <span className="text-sm text-muted-foreground">
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

      <div className="bg-card border border-border rounded-xl p-6 mb-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t('invite_code')}</h3>
              <p className="text-xs text-muted-foreground">{t('share_code_desc') || 'Allow others to join using a code'}</p>
            </div>
          </div>
          {isOwner && (
            <div className="flex items-center gap-2">
              <Checkbox 
                id="join-toggle" 
                checked={trip?.isJoinEnabled ?? false} 
                onCheckedChange={(checked) => handleToggleJoin(checked as boolean)}
              />
              <label htmlFor="join-toggle" className="text-sm font-medium cursor-pointer">
                {t('enable_join_code')}
              </label>
            </div>
          )}
        </div>

        {dataLoading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : trip?.isJoinEnabled ? (
          <div className="flex items-center gap-4">
            <div className={`border rounded-lg px-6 py-3 flex-1 text-center relative overflow-hidden ${expiryTime > 0 ? 'bg-muted/50 border-border' : 'bg-destructive/10 border-destructive/20'}`}>
              <span className={`text-3xl font-mono font-bold tracking-[0.3em] ${expiryTime > 0 ? 'text-foreground' : 'text-destructive/40 decoration-destructive/40 line-through opacity-50'}`}>
                {inviteCode}
              </span>
              {expiryTime <= 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow-sm rotate-12">
                    {t('expired') || 'EXPIRED'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={handleCopyCode} className="h-full">
                <Copy className="h-4 w-4 mr-2" />
                {trip?.isJoinEnabled ? t('copy_link') || 'Copy Link' : t('copy_code')}
              </Button>
              {isOwner && (
                <div className="relative group">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleRefreshCode} 
                    disabled={cooldownTime > 0}
                    className="w-full text-xs text-muted-foreground hover:text-primary"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${cooldownTime > 0 ? '' : 'group-hover:rotate-180 transition-transform'}`} />
                    {t('refresh_code')}
                  </Button>
                  {cooldownTime > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-popover text-popover-foreground border border-border text-[10px] rounded shadow-lg z-10 whitespace-nowrap text-center">
                      {formatCooldown(cooldownTime)}
                    </div>
                  )}
                  {expiryTime > 0 && (
                    <div className="mt-1 text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                      {Math.ceil(expiryTime / 60000)}m {t('left') || 'left'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-muted/30 border border-dashed border-border rounded-lg p-6 text-center text-muted-foreground">
            <p className="text-sm italic">{t('join_code_disabled')}</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3">
          {dataLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : memberEntries.map(([uid, role]) => {
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
