import { collection, getDocs, addDoc, serverTimestamp, doc, getDoc, writeBatch, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export interface TripBundle {
  version: string;
  trip: {
    name: string;
    description: string;
  };
  timeline: any[];
  expenses: any[];
  ideas: any[];
  pot: any[];
}

export const dataService = {
  /**
   * Bundles all trip data into a sanitized JSON object.
   * Strips emails and real UIDs to protect privacy.
   */
  exportTripData: async (tripId: string): Promise<TripBundle> => {
    const tripSnap = await getDoc(doc(db, 'trips', tripId));
    if (!tripSnap.exists()) throw new Error('Trip not found');
    const tripData = tripSnap.data();

    const fetchCollection = async (collName: string) => {
      const snapshot = await getDocs(collection(db, `trips/${tripId}/${collName}`));
      return snapshot.docs.map(doc => {
        const data = doc.data();
        // Sanitize: convert timestamps to ISO strings for JSON
        const sanitized: any = { ...data };
        Object.keys(sanitized).forEach(key => {
          if (sanitized[key] && typeof sanitized[key].toDate === 'function') {
            sanitized[key] = sanitized[key].toDate().toISOString();
          }
        });
        return sanitized;
      });
    };

    const bundle: TripBundle = {
      version: '1.0',
      trip: {
        name: tripData.name,
        description: tripData.description || '',
      },
      timeline: await fetchCollection('timeline'),
      expenses: await fetchCollection('expenses'),
      ideas: await fetchCollection('ideas'),
      pot: await fetchCollection('pot'),
    };

    return bundle;
  },

  /**
   * Imports a trip bundle into a new trip owned by the current user.
   */
  importTripData: async (userId: string, bundle: TripBundle) => {
    // 1. Create the new trip
    const tripRef = await addDoc(collection(db, 'trips'), {
      name: `${bundle.trip.name} (Imported)`,
      description: bundle.trip.description,
      ownerId: userId,
      inviteCode: '', // Will be generated if enabled
      isJoinEnabled: false,
      members: {
        [userId]: 'owner'
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const newTripId = tripRef.id;

    // 2. Batch import sub-collections
    const collections = ['timeline', 'expenses', 'ideas', 'pot'];
    
    for (const coll of collections) {
      const items = (bundle as any)[coll] || [];
      const batch = writeBatch(db);
      
      items.forEach((item: any) => {
        const itemRef = doc(collection(db, `trips/${newTripId}/${coll}`));
        
        // Convert ISO strings back to Date objects for Firestore to handle as Timestamps
        const processed = { ...item };
        Object.keys(processed).forEach(key => {
          if (typeof processed[key] === 'string' && processed[key].match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
            processed[key] = new Date(processed[key]);
          }
        });

        batch.set(itemRef, {
          ...processed,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
    }

    return newTripId;
  },

  /**
   * Saves a snapshot of the current trip state to Firestore.
   */
  createSnapshot: async (tripId: string, userId: string, name: string) => {
    const bundle = await dataService.exportTripData(tripId);
    await addDoc(collection(db, `trips/${tripId}/snapshots`), {
      name,
      bundle,
      createdBy: userId,
      createdAt: serverTimestamp()
    });
  },

  /**
   * Fetches all snapshots for a trip.
   */
  getSnapshots: async (tripId: string) => {
    const q = query(collection(db, `trips/${tripId}/snapshots`), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
  },

  /**
   * Overwrites the current trip state with snapshot data.
   * WARNING: This replaces all current timeline, expenses, ideas, and pot data.
   */
  restoreSnapshot: async (tripId: string, bundle: TripBundle) => {
    const collections = ['timeline', 'expenses', 'ideas', 'pot'];
    
    for (const coll of collections) {
      // 1. Clear current collection
      const currentSnapshot = await getDocs(collection(db, `trips/${tripId}/${coll}`));
      const clearBatch = writeBatch(db);
      currentSnapshot.docs.forEach(doc => clearBatch.delete(doc.ref));
      await clearBatch.commit();

      // 2. Insert bundle items
      const items = (bundle as any)[coll] || [];
      const insertBatch = writeBatch(db);
      items.forEach((item: any) => {
        const itemRef = doc(collection(db, `trips/${tripId}/${coll}`));
        const processed = { ...item };
        Object.keys(processed).forEach(key => {
          if (typeof processed[key] === 'string' && processed[key].match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
            processed[key] = new Date(processed[key]);
          }
        });
        insertBatch.set(itemRef, {
          ...processed,
          updatedAt: serverTimestamp()
        });
      });
      await insertBatch.commit();
    }
  }
};
