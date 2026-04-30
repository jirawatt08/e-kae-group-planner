import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteField, deleteDoc, query, where, getDocs, limit, getDoc, FieldValue } from 'firebase/firestore';
import { db, auth } from '../firebase';
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
  /**
   * CENTRALIZED: The ONLY way to create a new trip in the system.
   * Ensures the document always matches the required security rules schema.
   */
  createTrip: async (userId: string, name: string, description: string = '', defaultTimezone?: string, totalBudgetGoal?: number) => {
    const data: any = {
      name,
      description,
      ownerId: userId,
      inviteCode: generateInviteCode(),
      isJoinEnabled: true,
      lastCodeGeneratedAt: serverTimestamp(),
      members: {
        [userId]: 'owner'
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (defaultTimezone) data.defaultTimezone = defaultTimezone;
    if (totalBudgetGoal) data.totalBudgetGoal = totalBudgetGoal;
    return await addDoc(collection(db, 'trips'), data);
  },

  /**
   * CENTRALIZED: The ONLY way for a user to join a trip via code.
   * Handles both the Firestore write and the activity logging.
   */
  joinTripByCode: async (tripId: string, userId: string, members: Record<string, string>) => {
    const tripRef = doc(db, 'trips', tripId);
    
    // Schema check for security rules (must add the user to the existing members map)
    await updateDoc(tripRef, {
      [`members.${userId}`]: 'editor',
      updatedAt: serverTimestamp()
    });
    
    await activityService.logActivity(tripId, 'Joined trip', `User joined via shared link/code`);
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

    try {
      await updateDoc(tripRef, updates);
      await activityService.logActivity(tripId, 'Security Update', `Join by code ${enabled ? 'ENABLED' : 'DISABLED'}`);
    } catch (err: any) {
      console.error('FIREBASE_RAW_ERROR:', {
        code: err.code,
        message: err.message,
        name: err.name,
        stack: err.stack,
        payload: updates
      });
      throw err;
    }
  }
};
