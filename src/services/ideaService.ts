import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { activityService } from './activityService';

export const ideaService = {
  createIdea: async (tripId: string, userId: string, data: { title: string; description: string; link: string }) => {
    const docRef = await addDoc(collection(db, `trips/${tripId}/ideas`), {
      tripId,
      title: data.title,
      description: data.description,
      link: data.link,
      votes: [],
      createdBy: userId,
      createdAt: serverTimestamp()
    });
    await activityService.logActivity(tripId, 'Shared an idea', data.title);
    return docRef;
  },

  updateIdea: async (tripId: string, ideaId: string, data: { title: string; description: string; link: string }) => {
    await updateDoc(doc(db, `trips/${tripId}/ideas`, ideaId), {
      title: data.title,
      description: data.description,
      link: data.link,
      updatedAt: serverTimestamp()
    });
    await activityService.logActivity(tripId, 'Updated an idea', data.title);
  },

  deleteIdea: async (tripId: string, ideaId: string, title: string) => {
    await deleteDoc(doc(db, `trips/${tripId}/ideas`, ideaId));
    await activityService.logActivity(tripId, 'Deleted an idea', title);
  },

  toggleVote: async (tripId: string, ideaId: string, userId: string, hasVoted: boolean) => {
    await updateDoc(doc(db, `trips/${tripId}/ideas`, ideaId), {
      votes: hasVoted ? arrayRemove(userId) : arrayUnion(userId)
    });
  }
};
