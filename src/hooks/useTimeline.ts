import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { timelineService, TimelineEventInput } from '../services/timelineService';
import { TimelineEvent } from '../types';

export function useTimeline(tripId: string, canEdit: boolean) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const createEvent = async (data: TimelineEventInput) => {
    if (!user || !canEdit) return false;
    setLoading(true);
    try {
      await timelineService.createEvent(tripId, user.uid, data);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `trips/${tripId}/timeline`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateEvent = async (eventId: string, data: TimelineEventInput) => {
    if (!user || !canEdit) return false;
    setLoading(true);
    try {
      await timelineService.updateEvent(tripId, eventId, data);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}/timeline/${eventId}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (event: TimelineEvent) => {
    if (!canEdit) return;
    try {
      await timelineService.deleteEvent(tripId, event.id, event.title);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trips/${tripId}/timeline/${event.id}`);
    }
  };

  return {
    createEvent,
    updateEvent,
    deleteEvent,
    loading
  };
}
