import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTripData } from '../../contexts/TripDataContext';
import { handleFirestoreError, OperationType } from '../../lib/firestoreError';
import { logActivity } from '../../lib/activityLogger';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, MapPin, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export function TimelineTab({ tripId, canEdit }: { tripId: string, canEdit: boolean }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { timeline: events } = useTripData();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
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
      const firstDay = format(events[0].startTime.toDate(), 'yyyy-MM-dd');
      setSelectedDay(firstDay);
    }
  }, [events, selectedDay]);

  // Group events by day
  const days = Array.from(new Set(events.map(event => 
    event.startTime?.toDate ? format(event.startTime.toDate(), 'yyyy-MM-dd') : null
  ).filter(Boolean))) as string[];

  const filteredEvents = viewMode === 'full' 
    ? events 
    : events.filter(event => event.startTime?.toDate && format(event.startTime.toDate(), 'yyyy-MM-dd') === selectedDay);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canEdit) return;

    try {
      await addDoc(collection(db, `trips/${tripId}/timeline`), {
        tripId,
        title: newEvent.title,
        description: newEvent.description,
        startTime: new Date(newEvent.startTime),
        location: newEvent.location,
        mapLink: newEvent.mapLink,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await logActivity(tripId, 'Added timeline event', newEvent.title);
      setIsCreateOpen(false);
      setNewEvent({ title: '', description: '', startTime: '', location: '', mapLink: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `trips/${tripId}/timeline`);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canEdit || !editingEvent) return;

    try {
      await updateDoc(doc(db, `trips/${tripId}/timeline`, editingEvent.id), {
        title: editingEvent.title,
        description: editingEvent.description,
        startTime: new Date(editingEvent.startTime),
        location: editingEvent.location,
        mapLink: editingEvent.mapLink,
        updatedAt: serverTimestamp()
      });
      await logActivity(tripId, 'Updated timeline event', editingEvent.title);
      setIsEditOpen(false);
      setEditingEvent(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}/timeline/${editingEvent.id}`);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!canEdit) return;
    const eventToDelete = events.find(e => e.id === eventId);
    try {
      await deleteDoc(doc(db, `trips/${tripId}/timeline`, eventId));
      if (eventToDelete) {
        await logActivity(tripId, 'Deleted timeline event', eventToDelete.title);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trips/${tripId}/timeline/${eventId}`);
    }
  };

  const openEditDialog = (event: any) => {
    const startTimeStr = event.startTime?.toDate 
      ? format(event.startTime.toDate(), "yyyy-MM-dd'T'HH:mm")
      : '';
    
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
                <form onSubmit={handleCreateEvent} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">{t('title')}</Label>
                    <Input id="title" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startTime">{t('start_time')}</Label>
                    <Input id="startTime" type="datetime-local" value={newEvent.startTime} onChange={e => setNewEvent({...newEvent, startTime: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">{t('location')}</Label>
                    <Input id="location" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mapLink">{t('map_link')}</Label>
                    <Input id="mapLink" type="url" value={newEvent.mapLink} onChange={e => setNewEvent({...newEvent, mapLink: e.target.value})} placeholder="https://maps.google.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">{t('notes')}</Label>
                    <Input id="description" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit">{t('save_event')}</Button>
                  </div>
                </form>
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
              {format(new Date(day), 'EEE, MMM d')}
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
            <form onSubmit={handleUpdateEvent} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">{t('title')}</Label>
                <Input id="edit-title" value={editingEvent.title} onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-startTime">{t('start_time')}</Label>
                <Input id="edit-startTime" type="datetime-local" value={editingEvent.startTime} onChange={e => setEditingEvent({...editingEvent, startTime: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">{t('location')}</Label>
                <Input id="edit-location" value={editingEvent.location} onChange={e => setEditingEvent({...editingEvent, location: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mapLink">{t('map_link')}</Label>
                <Input id="edit-mapLink" type="url" value={editingEvent.mapLink} onChange={e => setEditingEvent({...editingEvent, mapLink: e.target.value})} placeholder="https://maps.google.com/..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">{t('notes')}</Label>
                <Input id="edit-description" value={editingEvent.description} onChange={e => setEditingEvent({...editingEvent, description: e.target.value})} />
              </div>
              <div className="flex justify-end">
                <Button type="submit">{t('update_event')}</Button>
              </div>
            </form>
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
            {filteredEvents.map((event, index) => (
              <div key={event.id} className="relative pl-6 md:pl-8">
                <div className="absolute w-4 h-4 bg-primary rounded-full -left-[9px] top-1.5 border-4 border-white" />
                <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 cursor-pointer" onClick={() => canEdit && openEditDialog(event)}>
                      <h3 className="font-semibold text-lg text-gray-900">{event.title}</h3>
                      <div className="flex items-center text-sm text-gray-500 mt-1 space-x-4">
                        <span className="flex items-center">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          {event.startTime?.toDate ? format(event.startTime.toDate(), 'h:mm a') : 'Pending'}
                          {viewMode === 'full' && event.startTime?.toDate && (
                            <span className="ml-1 text-xs text-gray-400">
                              ({format(event.startTime.toDate(), 'MMM d')})
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
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-primary" onClick={() => openEditDialog(event)}>
                          <Plus className="h-4 w-4 rotate-45" /> {/* Using Plus rotated as a placeholder for edit if no Pencil icon, but I'll check lucide */}
                        </Button>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(event.id)}>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
