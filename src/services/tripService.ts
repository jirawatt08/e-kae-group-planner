import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteField, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { activityService } from './activityService';
import { Role } from '../types';

export const tripService = {
  createTrip: async (userId: string, name: string) => {
    return await addDoc(collection(db, 'trips'), {
      name,
      description: '',
      ownerId: userId,
      members: {
        [userId]: 'owner'
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },

  joinTripAsEditor: async (tripId: string, userId: string) => {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
      [`members.${userId}`]: 'editor',
      updatedAt: serverTimestamp()
    });
    await activityService.logActivity(tripId, 'Joined trip', `User joined via shared link`);
  },

  updateMemberRole: async (tripId: string, uid: string, newRole: Role) => {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
      [`members.${uid}`]: newRole,
      updatedAt: serverTimestamp()
    });
    await activityService.logActivity(tripId, 'Updated member role', `User ${uid.substring(0, 5)} → ${newRole}`);
  },

  removeMember: async (tripId: string, uid: string) => {
    const tripRef = doc(db, 'trips', tripId);
    await updateDoc(tripRef, {
      [`members.${uid}`]: deleteField(),
      updatedAt: serverTimestamp()
    });
    await activityService.logActivity(tripId, 'Removed member', `User ${uid.substring(0, 5)}`);
  },

  deleteTrip: async (tripId: string) => {
    await deleteDoc(doc(db, 'trips', tripId));
  }
};
