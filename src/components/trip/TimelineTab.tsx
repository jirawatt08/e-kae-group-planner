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
import { toDate, safeFormat } from '../../lib/dateUtils';
import { TimelineForm } from './timeline/TimelineForm';
import { TimelineItem } from './timeline/TimelineItem';

export function TimelineTab({ tripId, canEdit }: { tripId: string, canEdit: boolean }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { timeline: events } = useTripData();
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
    mapLink: ''
  });

  useEffect(() => {
    // Set initial selected day if not set
    if (events.length > 0 && !selectedDay) {
      const firstDay = safeFormat(events[0].startTime, 'yyyy-MM-dd');
      setSelectedDay(firstDay);
    }
  }, [events, selectedDay]);

  // Group events by day
  const days = Array.from(new Set(events.map(event => 
    safeFormat(event.startTime, 'yyyy-MM-dd')
  ).filter(Boolean))) as string[];

  const filteredEvents = viewMode === 'full' 
    ? events 
    : events.filter(event => safeFormat(event.startTime, 'yyyy-MM-dd') === selectedDay);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canEdit) return;

    const success = await createEvent(newEvent);
    if (success) {
      setIsCreateOpen(false);
      setNewEvent({ title: '', description: '', startTime: '', location: '', mapLink: '' });
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
      startTime: startTimeStr
    });
    setIsEditOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{t('itinerary')}</h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-lg mr-2">
            <button 
              className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === 'full' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}
              onClick={() => setViewMode('full')}
            >
              {t('full_plan') || 'Full Plan'}
            </button>
            <button 
              className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === 'day' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}
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
          {days.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm transition-all border ${
                selectedDay === day 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
              }`}
            >
              {safeFormat(day, 'EEE, MMM d')}
            </button>
          ))}
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

      <div className="flex-1 overflow-y-auto pr-2">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {t('no_events')}
          </div>
        ) : (
          <div className="relative border-l-2 border-gray-200 ml-3 md:ml-6 space-y-8 pb-8">
            {filteredEvents.map((event) => (
              <TimelineItem
                key={event.id}
                event={event as TimelineEvent}
                canEdit={canEdit}
                onEdit={openEditDialog}
                onDelete={handleDelete}
                isDayView={viewMode === 'day'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
