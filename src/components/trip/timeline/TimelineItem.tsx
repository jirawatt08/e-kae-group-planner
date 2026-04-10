import React from 'react';
import { Button } from '@/components/ui/button';
import { TimelineEvent } from '../../../types';
import { MapPin, ExternalLink, Trash2, Clock, Edit3 } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { safeFormat, toDate } from '../../../lib/dateUtils';
import { resolveDisplayName } from '../../../lib/userUtils';
import { useAuth } from '../../../contexts/AuthContext';
import { useTripData } from '../../../contexts/TripDataContext';

interface TimelineItemProps {
  key?: React.Key;
  event: TimelineEvent;
  canEdit: boolean;
  onEdit: (event: TimelineEvent) => void;
  onDelete: (eventId: string) => void;
  isDayView?: boolean;
}

export function TimelineItem({
  event,
  canEdit,
  isDayView,
  onEdit,
  onDelete
}: TimelineItemProps) {
  const { user } = useAuth();
  const { memberProfiles } = useTripData();
  const { t } = useLanguage();
  const eventDate = toDate(event.startTime);
  const isPast = eventDate ? eventDate < new Date() : false;
  const createdByName = resolveDisplayName(event.createdBy, user?.uid, memberProfiles, t('you'));
    
  return (
    <div className={`relative pl-6 md:pl-8 ${isPast ? 'opacity-75' : ''}`}>
      {/* Timeline dot */}
      <div className={`absolute w-4 h-4 rounded-full -left-[9px] top-1.5 border-4 border-white shadow-sm ${isPast ? 'bg-gray-300' : 'bg-primary'}`} />

      <div className="bg-white border rounded-lg p-4 shadow-sm group hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div className="flex-1 cursor-pointer" onClick={() => onEdit(event)}>
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-lg text-gray-900">{event.title}</h3>
              <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border">
                {t('by') || 'by'} {createdByName}
              </span>
            </div>
            <div className="flex items-center text-sm text-gray-500 mt-1 space-x-4">
              <span className="flex items-center">
                <Clock className="h-3.5 w-3.5 mr-1" />
                {safeFormat(event.startTime, 'h:mm a', 'Pending')}
                {!isDayView && (
                  <span className="ml-1 text-xs text-gray-400">
                    ({safeFormat(event.startTime, 'MMM d')})
                  </span>
                )}
              </span>
              {event.location && (
                <span className="flex items-center">
                  <MapPin className="h-3.5 w-3.5 mr-1" />
                  {event.mapLink ? (
                    <a href={event.mapLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                      {event.location}
                    </a>
                  ) : (
                    event.location
                  )}
                </span>
              )}
            </div>
          </div>
          
          {canEdit && (
            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary" onClick={() => onEdit(event)}>
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(event.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {event.description && (
          <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
            {event.description}
          </p>
        )}
      </div>
    </div>
  );
}
