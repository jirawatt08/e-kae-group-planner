import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTripData } from '../../contexts/TripDataContext';
import { safeFormat } from '../../lib/dateUtils';
import { resolveDisplayName, getUserColorStyles } from '../../lib/userUtils';
import { useAuth } from '../../contexts/AuthContext';
import { dataService } from '../../services/dataService';
import { History, Camera, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export function ActivityTab({ tripId }: { tripId: string }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { activities, trip, memberProfiles, loading: dataLoading } = useTripData();
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const isOwner = user?.uid === trip?.ownerId;

  const fetchSnapshots = async () => {
    try {
      const data = await dataService.getSnapshots(tripId);
      setSnapshots(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOwner) fetchSnapshots();
  }, [tripId, isOwner]);

  const handleCreateSnapshot = async () => {
    const name = window.prompt(t('snapshot_desc') || 'Enter snapshot name') || `Snapshot ${new Date().toLocaleString()}`;
    setLoading(true);
    try {
      await dataService.createSnapshot(tripId, user!.uid, name);
      toast.success('Snapshot saved');
      fetchSnapshots();
    } catch (err) {
      toast.error('Failed to save snapshot');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (snapshot: any) => {
    if (!window.confirm(t('confirm_restore'))) return;
    setLoading(true);
    try {
      await dataService.restoreSnapshot(tripId, snapshot.bundle);
      toast.success(t('restore_success'));
      // No need to redirect, real-time listeners will update the view
    } catch (err) {
      toast.error('Restore failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">{t('activity_history')}</h2>
        {isOwner && (
          <Button size="sm" variant="outline" className="gap-2" onClick={handleCreateSnapshot} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {t('create_snapshot')}
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-8">
        {/* Snapshots Section */}
        {isOwner && snapshots.length > 0 && (
          <div className="bg-warning/5 border border-warning/10 rounded-xl p-4">
            <h3 className="text-xs font-bold text-warning uppercase tracking-widest mb-3 flex items-center gap-2">
              <RotateCcw className="h-3 w-3" />
              RESTORE POINTS
            </h3>
            <div className="space-y-2">
              {snapshots.map(snip => (
                <div key={snip.id} className="flex items-center justify-between bg-card p-2 rounded-lg border border-warning/10 shadow-sm">
                  <div className="text-xs">
                    <div className="font-semibold text-foreground">{snip.name}</div>
                    <div className="text-[10px] text-muted-foreground">{safeFormat(snip.createdAt, 'MMM d, h:mm a', '')}</div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] text-warning hover:text-warning/80 hover:bg-warning/10 gap-1" onClick={() => handleRestore(snip)}>
                    <RotateCcw className="h-3 w-3" />
                    RESTORE
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity List */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">ACTIVITY LOG</h3>
          {dataLoading ? (
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-3 items-start">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3 rounded" />
                    <Skeleton className="h-3 w-1/4 rounded opacity-50" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border hover:bg-muted/30 transition-colors">
              {t('no_activity')}
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const actionText = activity.action.toLowerCase();
                let iconColorClass = "text-muted-foreground";
                let bgColorClass = "bg-muted";
                
                if (actionText.includes('add') || actionText.includes('join') || actionText.includes('create')) {
                  iconColorClass = "text-success";
                  bgColorClass = "bg-success/10";
                } else if (actionText.includes('delet') || actionText.includes('remov')) {
                  iconColorClass = "text-destructive";
                  bgColorClass = "bg-destructive/10";
                } else if (actionText.includes('updat') || actionText.includes('edit')) {
                  iconColorClass = "text-info";
                  bgColorClass = "bg-info/10";
                }
                
                return (
                <div key={activity.id} className="flex items-start space-x-3 text-sm">
                  <div className={`${bgColorClass} p-1.5 rounded-full mt-0.5`}>
                    <History className={`h-3.5 w-3.5 ${iconColorClass}`} />
                  </div>
                  <div>
                    <p className="text-foreground leading-snug">
                      <span 
                        className="font-semibold" 
                        style={getUserColorStyles(activity.userId).text}
                      >
                        {resolveDisplayName(activity.userId, user?.uid, memberProfiles, t('you'))}
                      </span> {activity.action.toLowerCase()}
                      {activity.details && <span className="text-muted-foreground text-xs block mt-0.5 opacity-80">{activity.details}</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {safeFormat(activity.createdAt, 'MMM d, h:mm a', t('just_now'))}
                    </p>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
