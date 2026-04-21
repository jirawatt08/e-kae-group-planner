import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTripData } from '../../contexts/TripDataContext';
import { useTimeline } from '../../hooks/useTimeline';
import { TimelineEvent } from '../../types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, MapPin, Clock, Trash2 } from 'lucide-react';
import { toDate, safeFormat, getDayNumber, getDayColor } from '../../lib/dateUtils';
import { TimelineForm } from './timeline/TimelineForm';
import { TimelineItem } from './timeline/TimelineItem';
import { DayHeader } from './timeline/DayHeader';
import { Skeleton } from '@/components/ui/skeleton';

export function TimelineTab({ tripId, canEdit }: { tripId: string, canEdit: boolean }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { timeline: events, loading: dataLoading } = useTripData();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const { createEvent, updateEvent, deleteEvent, loading } = useTimeline(tripId, canEdit);
  const [viewMode, setViewMode] = useState<'full' | 'day'>('full');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startTime: '',
    location: '',
    mapLink: '',
    checklist: [] as any[]
  });

  useEffect(() => {
    // Set initial selected day if not set
    if (events.length > 0 && !selectedDay) {
      const firstDay = safeFormat(events[0].startTime, 'yyyy-MM-dd');
      setSelectedDay(firstDay);
    }
  }, [events, selectedDay]);

  const firstEventDate = events.length > 0 ? events[0].startTime : null;

  // Group events by day
  const days = Array.from(new Set(events.map(event => 
    safeFormat(event.startTime, 'yyyy-MM-dd')
  ).filter(Boolean))) as string[];

  // Grouped structure for Full Mode
  const groupedEvents = days.map(dayKey => ({
    dayKey,
    dayNumber: getDayNumber(dayKey, firstEventDate),
    events: events.filter(e => safeFormat(e.startTime, 'yyyy-MM-dd') === dayKey)
  }));

  const filteredEventsForDay = events.filter(event => safeFormat(event.startTime, 'yyyy-MM-dd') === selectedDay);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canEdit) return;

    const success = await createEvent(newEvent);
    if (success) {
      setIsCreateOpen(false);
      setNewEvent({ title: '', description: '', startTime: '', location: '', mapLink: '', checklist: [] });
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canEdit || !editingEvent) return;

    const success = await updateEvent(editingEvent.id, {
      title: editingEvent.title,
      description: editingEvent.description,
      startTime: editingEvent.startTime as unknown as string,
      location: editingEvent.location,
      mapLink: editingEvent.mapLink,
      checklist: editingEvent.checklist || [],
    });
    if (success) {
      setIsEditOpen(false);
      setEditingEvent(null);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!canEdit) return;
    const eventToDelete = (events as TimelineEvent[]).find(e => e.id === eventId);
    if (eventToDelete) {
      await deleteEvent(eventToDelete);
    }
  };

  const openEditDialog = (event: any) => {
    const startTimeStr = safeFormat(event.startTime, "yyyy-MM-dd'T'HH:mm");
    
    setEditingEvent({
      ...event,
      startTime: startTimeStr,
      checklist: event.checklist || []
    });
    setIsEditOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{t('itinerary')}</h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted p-1 rounded-lg mr-2">
            <button 
              className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === 'full' ? 'bg-card text-foreground shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setViewMode('full')}
            >
              {t('full_plan') || 'Full Plan'}
            </button>
            <button 
              className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === 'day' ? 'bg-card text-foreground shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setViewMode('day')}
            >
              {t('day_view') || 'Day View'}
            </button>
          </div>
          {canEdit && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                <Plus className="h-4 w-4 mr-2" />
                {t('add_event')}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('add_event')}</DialogTitle>
                </DialogHeader>
                <TimelineForm
                  data={newEvent}
                  setState={setNewEvent}
                  onSubmit={handleCreateEvent}
                  submitLabel={t('save_event')}
                  loading={loading}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {viewMode === 'day' && days.length > 0 && (
        <div className="flex overflow-x-auto pb-4 mb-4 gap-2 no-scrollbar">
          {days.map(day => {
            const isSelected = selectedDay === day;
            const color = getDayColor(day);
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                  isSelected 
                    ? 'text-white border-transparent' 
                    : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/30 hover:text-foreground'
                }`}
                style={isSelected ? { backgroundColor: color } : {}}
              >
                {safeFormat(day, 'EEE, MMM d')}
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('edit_event')}</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <TimelineForm
              data={editingEvent}
              setState={setEditingEvent}
              onSubmit={handleUpdateEvent}
              submitLabel={t('update_event')}
              loading={loading}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        {dataLoading ? (
          <div className="space-y-12">
            {[1, 2].map(day => (
              <div key={day} className="space-y-6">
                <Skeleton className="h-10 w-32 rounded-lg" />
                <div className="ml-6 space-y-8">
                  {[1, 2].map(event => (
                    <div key={event} className="flex gap-4 items-start">
                      <Skeleton className="h-4 w-4 rounded-full mt-2" />
                      <Skeleton className="h-24 flex-1 rounded-xl" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
            {t('no_events')}
          </div>
        ) : viewMode === 'full' ? (
          <div className="space-y-12 pb-8">
            {groupedEvents.map((group) => (
              <div key={group.dayKey} className="relative">
                <DayHeader 
                  dayKey={group.dayKey} 
                  dayNumber={group.dayNumber} 
                  eventCount={group.events.length} 
                />
                <div className="relative border-l-2 border-dashed border-border ml-3 md:ml-6 space-y-8 mt-4">
                  {group.events.map((event) => (
                    <TimelineItem
                      key={event.id}
                      event={event as TimelineEvent}
                      tripId={tripId}
                      canEdit={canEdit}
                      onEdit={openEditDialog}
                      onDelete={handleDelete}
                      isDayView={false}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative border-l-2 border-dashed border-border ml-3 md:ml-6 space-y-8 pb-8 mt-4">
            {filteredEventsForDay.map((event) => (
              <TimelineItem
                key={event.id}
                event={event as TimelineEvent}
                tripId={tripId}
                canEdit={canEdit}
                onEdit={openEditDialog}
                onDelete={handleDelete}
                isDayView={true}
              />
            ))}
            {filteredEventsForDay.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {t('no_events_on_day') || 'No events planned for this day.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
