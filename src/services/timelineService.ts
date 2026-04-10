import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { activityService } from './activityService';

export const timelineService = {
  createEvent: async (tripId: string, userId: string, data: { title: string; description: string; startTime: string; location: string; mapLink: string }) => {
    const docRef = await addDoc(collection(db, `trips/${tripId}/timeline`), {
      tripId,
      title: data.title,
      description: data.description,
      startTime: new Date(data.startTime),
      location: data.location,
      mapLink: data.mapLink,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await activityService.logActivity(tripId, 'Added timeline event', data.title);
    return docRef;
  },

  updateEvent: async (tripId: string, eventId: string, data: { title: string; description: string; startTime: string; location: string; mapLink: string }) => {
    await updateDoc(doc(db, `trips/${tripId}/timeline`, eventId), {
      title: data.title,
      description: data.description,
      startTime: new Date(data.startTime),
      location: data.location,
      mapLink: data.mapLink,
      updatedAt: serverTimestamp()
    });
    await activityService.logActivity(tripId, 'Updated timeline event', data.title);
  },

  deleteEvent: async (tripId: string, eventId: string, title: string) => {
    await deleteDoc(doc(db, `trips/${tripId}/timeline`, eventId));
    await activityService.logActivity(tripId, 'Deleted timeline event', title);
  }
};
