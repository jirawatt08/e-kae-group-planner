import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTripData } from '../../contexts/TripDataContext';
import { safeFormat } from '../../lib/dateUtils';
import { resolveDisplayName, getUserColorStyles } from '../../lib/userUtils';
import { useAuth } from '../../contexts/AuthContext';
import { History } from 'lucide-react';

export function ActivityTab({ tripId }: { tripId: string }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { activities, trip, memberProfiles } = useTripData();

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">{t('activity_history')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {t('no_activity')}
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const actionText = activity.action.toLowerCase();
              let iconColorClass = "text-gray-500";
              let bgColorClass = "bg-gray-100";
              
              if (actionText.includes('add') || actionText.includes('join') || actionText.includes('create')) {
                iconColorClass = "text-green-600";
                bgColorClass = "bg-green-100";
              } else if (actionText.includes('delet') || actionText.includes('remov')) {
                iconColorClass = "text-red-600";
                bgColorClass = "bg-red-100";
              } else if (actionText.includes('updat') || actionText.includes('edit')) {
                iconColorClass = "text-blue-600";
                bgColorClass = "bg-blue-100";
              }
              
              return (
              <div key={activity.id} className="flex items-start space-x-3 text-sm">
                <div className={`${bgColorClass} p-1.5 rounded-full mt-0.5`}>
                  <History className={`h-3.5 w-3.5 ${iconColorClass}`} />
                </div>
                <div>
                  <p className="text-gray-900">
                    <span 
                      className="font-semibold" 
                      style={getUserColorStyles(activity.userId).text}
                    >
                      {resolveDisplayName(activity.userId, user?.uid, memberProfiles, t('you'))}
                    </span> {activity.action.toLowerCase()}
                    {activity.details && <span className="text-gray-600">: {activity.details}</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {safeFormat(activity.createdAt, 'MMM d, h:mm a', t('just_now'))}
                  </p>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
}
