import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { activityService } from './activityService';

export interface TimelineEventInput {
  title: string;
  description: string;
  startTime: string;
  endTime?: string;
  location: string;
  mapLink: string;
  checklist?: { id: string; text: string; checked: boolean }[];
}

export const timelineService = {
  createEvent: async (tripId: string, userId: string, data: TimelineEventInput) => {
    const eventData: Record<string, any> = {
      tripId,
      title: data.title,
      description: data.description || '',
      startTime: new Date(data.startTime),
      location: data.location || '',
      mapLink: data.mapLink || '',
      checklist: (data.checklist || []).filter(i => i.text.trim()),
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (data.endTime) {
      eventData.endTime = new Date(data.endTime);
    }

    const docRef = await addDoc(collection(db, `trips/${tripId}/timeline`), eventData);
    // Non-blocking log
    activityService.logActivity(tripId, 'Added timeline event', data.title).catch(e => console.error(e));
    return docRef;
  },

  updateEvent: async (tripId: string, eventId: string, data: TimelineEventInput) => {
    const eventData: Record<string, any> = {
      title: data.title,
      description: data.description || '',
      startTime: new Date(data.startTime),
      location: data.location || '',
      mapLink: data.mapLink || '',
      checklist: (data.checklist || []).filter(i => i.text.trim()),
      updatedAt: serverTimestamp()
    };

    if (data.endTime) {
      eventData.endTime = new Date(data.endTime);
    } else {
      // If no endTime provided, but we are updating, we should probably set it to null 
      // or just not include it in the update to leave existing value.
      // Given firestore.rules hasOnly, we must ensure it doesn't have extra fields.
    }

    await updateDoc(doc(db, `trips/${tripId}/timeline`, eventId), eventData);
    // Non-blocking log
    activityService.logActivity(tripId, 'Updated timeline event', data.title).catch(e => console.error(e));
  },

  deleteEvent: async (tripId: string, eventId: string, title: string) => {
    await deleteDoc(doc(db, `trips/${tripId}/timeline`, eventId));
    activityService.logActivity(tripId, 'Deleted timeline event', title).catch(e => console.error(e));
  }
};
