import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

export const activityService = {
  logActivity: async (tripId: string, action: string, details: string = '') => {
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, `trips/${tripId}/activity`), {
        tripId,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Unknown',
        action,
        details,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  }
};
