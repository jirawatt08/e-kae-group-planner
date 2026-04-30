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
import { useFormatters } from '../../../hooks/useFormatters';

interface TimelineItemProps {
  key?: React.Key;
  event: TimelineEvent;
  tripId: string;
  canEdit: boolean;
  onEdit: (event: TimelineEvent) => void;
  onDelete: (eventId: string) => void;
  isDayView?: boolean;
  themeColor?: string;
  /** When true, renders a minimal single-line summary (for collapsed timezone view) */
  compact?: boolean;
}

export function TimelineItem({
  event,
  tripId,
  canEdit,
  isDayView,
  onEdit,
  onDelete,
  themeColor,
  compact = false
}: TimelineItemProps) {
  const { user } = useAuth();
  const { memberProfiles } = useTripData();
  const { t } = useLanguage();
  const eventDate = toDate(event.startTime);
  const isPast = eventDate ? eventDate < new Date() : false;
  const userStyles = getUserColorStyles(event.createdBy);
  const createdByName = resolveDisplayName(event.createdBy, user?.uid, memberProfiles, t('you'));
  const checklist = event.checklist || [];
  const timezone = event.timezone;
  const { formatTime, formatCurrency } = useFormatters();

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

  // ── Compact mode: single-line summary for collapsed timezone blocks ──
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onEdit(event)}
        className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted/50 ${isPast ? 'opacity-60' : ''}`}
      >
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={userStyles.bg}
        />
        <span className="font-medium text-foreground truncate">{event.title}</span>
        <span className="text-xs text-muted-foreground shrink-0 ml-auto">
          {formatTime(event.startTime, timezone)}
        </span>
        {event.location && (
          <span className="hidden sm:flex items-center text-xs text-muted-foreground shrink-0">
            <MapPin className="h-3 w-3 mr-0.5" />
            <span className="truncate max-w-[100px]">{event.location}</span>
          </span>
        )}
      </button>
    );
  }

  // ── Full mode: standard timeline card ──
  return (
    <div className={`relative pl-6 md:pl-8 ${isPast ? 'opacity-75' : ''}`}>
      {/* Timeline dot – clickable to edit */}
      <button 
        type="button"
        className={`absolute w-3 h-3 md:w-4 md:h-4 rounded-full -left-[7px] md:-left-[9px] top-5 border-2 border-background shadow-sm transition-all hover:scale-125 z-10 cursor-pointer ${isPast ? 'opacity-50' : 'hover:ring-2 hover:ring-offset-1 hover:ring-primary/50'}`} 
        style={userStyles.bg}
        onClick={() => onEdit(event)}
        aria-label={`Edit ${event.title}`}
      />

      <div 
        className="bg-card border border-border rounded-lg p-4 shadow-sm group hover:shadow-md transition-shadow"
        style={themeColor ? { borderLeftWidth: '3px', borderLeftColor: themeColor } : {}}
      >
        <div className="flex justify-between items-start text-foreground">
          <div className="flex-1 cursor-pointer min-w-0" onClick={() => onEdit(event)}>
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-semibold text-base sm:text-lg text-foreground truncate">{event.title}</h3>
              <span 
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors shrink-0"
                style={userStyles.badge}
              >
                {t('by') || 'by'} {createdByName}
              </span>
            </div>
            <div className="flex flex-wrap items-center text-sm text-muted-foreground mt-1 gap-x-3 gap-y-1">
              <span className="flex items-center">
                <Clock className="h-3.5 w-3.5 mr-1 shrink-0" />
                {formatTime(event.startTime, timezone)}
                {!isDayView && (
                  <span className="ml-1 text-xs text-muted-foreground/60">
                    ({safeFormat(event.startTime, 'MMM d', '', timezone)})
                  </span>
                )}
              </span>
              {event.category === 'booking' && (
                <span className="flex items-center text-amber-600 dark:text-amber-400 font-medium">
                  <span className="text-[10px] uppercase border border-amber-500/30 px-1.5 py-0.5 rounded mr-1">Booking</span>
                  {event.estimatedCost ? formatCurrency(event.estimatedCost) : ''}
                </span>
              )}
              {event.location && (
                <span className="flex items-center min-w-0">
                  <MapPin className="h-3.5 w-3.5 mr-1 shrink-0" />
                  {event.mapLink ? (
                    <a href={event.mapLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate" onClick={(e) => e.stopPropagation()}>
                      {event.location}
                    </a>
                  ) : (
                    <span className="truncate">{event.location}</span>
                  )}
                </span>
              )}
            </div>
          </div>
          
          {canEdit && (
            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => onEdit(event)}>
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => onDelete(event.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {event.description && (
          <p className="mt-3 text-sm text-muted-foreground bg-muted/40 p-3 rounded-md italic border-l-2 border-primary/20">
            {event.description}
          </p>
        )}

        {/* Checklist Reminders */}
        {checklist.length > 0 && (
          <div className="mt-3 bg-muted/50 border border-border rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                <ClipboardCheck className="h-3 w-3" />
                {t('checklist') || 'Checklist'}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
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
                  <span className={item.checked ? 'line-through text-muted-foreground/60' : 'text-foreground/90'}>
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
