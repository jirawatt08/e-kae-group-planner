import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TimelineEvent, ChecklistItem } from '../../../types';
import { MapPin, ExternalLink, Trash2, Clock, Edit3, ClipboardCheck } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { safeFormat, toDate } from '../../../lib/dateUtils';
import { resolveDisplayName, getUserColorStyles } from '../../../lib/userUtils';
import { useAuth } from '../../../contexts/AuthContext';
import { useTripData } from '../../../contexts/TripDataContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

interface TimelineItemProps {
  key?: React.Key;
  event: TimelineEvent;
  tripId: string;
  canEdit: boolean;
  onEdit: (event: TimelineEvent) => void;
  onDelete: (eventId: string) => void;
  isDayView?: boolean;
}

export function TimelineItem({
  event,
  tripId,
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
  const userStyles = getUserColorStyles(event.createdBy);
  const createdByName = resolveDisplayName(event.createdBy, user?.uid, memberProfiles, t('you'));
  const checklist = event.checklist || [];

  const toggleChecklistItem = async (itemId: string) => {
    if (!canEdit) return;
    const updatedChecklist = checklist.map((item: ChecklistItem) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    try {
      await updateDoc(doc(db, `trips/${tripId}/timeline`, event.id), {
        checklist: updatedChecklist
      });
    } catch (err) {
      console.error('Failed to toggle checklist item:', err);
    }
  };

  const completedCount = checklist.filter((i: ChecklistItem) => i.checked).length;
    
  return (
    <div className={`relative pl-6 md:pl-8 ${isPast ? 'opacity-75' : ''}`}>
      {/* Timeline dot */}
      <div 
        className={`absolute w-4 h-4 rounded-full -left-[9px] top-1.5 border-4 border-white shadow-sm transition-colors ${isPast ? 'opacity-50' : ''}`} 
        style={userStyles.bg} 
      />

      <div className="bg-white border rounded-lg p-4 shadow-sm group hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div className="flex-1 cursor-pointer" onClick={() => onEdit(event)}>
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-lg text-gray-900">{event.title}</h3>
              <span 
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors"
                style={userStyles.badge}
              >
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

        {/* Checklist Reminders */}
        {checklist.length > 0 && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                <ClipboardCheck className="h-3 w-3" />
                {t('checklist') || 'Checklist'}
              </span>
              <span className="text-[10px] text-blue-500">
                {completedCount}/{checklist.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {checklist.map((item: ChecklistItem) => (
                <div key={item.id} className="flex items-center gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={item.checked} 
                    onCheckedChange={() => toggleChecklistItem(item.id)}
                    disabled={!canEdit}
                  />
                  <span className={item.checked ? 'line-through text-gray-400' : 'text-gray-700'}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
