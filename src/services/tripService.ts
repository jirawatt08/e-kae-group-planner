import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteField, deleteDoc, query, where, getDocs, limit, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { activityService } from './activityService';
import { Role, Trip } from '../types';

const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0, O, 1, I, l
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const tripService = {
  createTrip: async (userId: string, name: string) => {
    return await addDoc(collection(db, 'trips'), {
      name,
      description: '',
      ownerId: userId,
      inviteCode: generateInviteCode(),
      isJoinEnabled: true,
      lastCodeGeneratedAt: serverTimestamp(),
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
  },

  getTripByCode: async (code: string): Promise<Trip | null> => {
    const q = query(
      collection(db, 'trips'),
      where('inviteCode', '==', code.toUpperCase()),
      where('isJoinEnabled', '==', true),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const tripData = doc.data() as Trip;

    // Check expiration (30 minutes)
    if (tripData.lastCodeGeneratedAt) {
      const generatedAt = (tripData.lastCodeGeneratedAt as any).toDate().getTime();
      const now = Date.now();
      const thirtyMinutes = 30 * 60 * 1000;
      if (now - generatedAt > thirtyMinutes) {
        return null; // Code has expired
      }
    }

    return { id: doc.id, ...tripData };
  },

  refreshInviteCode: async (tripId: string) => {
    const tripRef = doc(db, 'trips', tripId);
    const newCode = generateInviteCode();
    await updateDoc(tripRef, {
      inviteCode: newCode,
      lastCodeGeneratedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return newCode;
  },

  toggleJoinCode: async (tripId: string, enabled: boolean) => {
    const tripRef = doc(db, 'trips', tripId);
    const updates: any = {
      isJoinEnabled: enabled,
      updatedAt: serverTimestamp()
    };
    
    // If enabling and no code exists, generate one
    const tripSnap = await getDoc(tripRef);
    if (tripSnap.exists()) {
      const tripData = tripSnap.data();
      if (enabled && !tripData.inviteCode) {
        updates.inviteCode = generateInviteCode();
        updates.lastCodeGeneratedAt = serverTimestamp();
      }
    }

    await updateDoc(tripRef, updates);
    await activityService.logActivity(tripId, 'Security Update', `Join by code ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }
};
