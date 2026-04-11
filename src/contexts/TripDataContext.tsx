import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { tripService } from '../services/tripService';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';

interface TripDataContextType {
  trip: any;
  timeline: any[];
  expenses: any[];
  ideas: any[];
  activities: any[];
  memberProfiles: Record<string, any>;
  loading: boolean;
}

const TripDataContext = createContext<TripDataContextType | undefined>(undefined);

export function TripDataProvider({ tripId, children }: { tripId: string, children: ReactNode }) {
  const [trip, setTrip] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const migrationAttempted = useRef<string | null>(null);

  // Fetch member profiles when trip members change
  useEffect(() => {
    if (!trip?.members) return;
    const uids = Object.keys(trip.members);
    
    // We can fetch profiles individually since 'in' query is limited to 10
    const fetchProfiles = async () => {
      const newProfiles: Record<string, any> = {};
      try {
        await Promise.all(uids.map(async (uid) => {
          // If already feched, reuse
          if (memberProfiles[uid]) {
            newProfiles[uid] = memberProfiles[uid];
            return;
          }
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            newProfiles[uid] = userDoc.data();
          }
        }));
        setMemberProfiles(prev => ({ ...prev, ...newProfiles }));
      } catch (error) {
        console.error('Error fetching member profiles:', error);
      }
    };
    fetchProfiles();
  }, [trip?.members]);

  useEffect(() => {
    if (!tripId) return;

    // 1. Trip Listener
    const tripRef = doc(db, 'trips', tripId);
    const unsubTrip = onSnapshot(tripRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTrip({ id: docSnap.id, ...data });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `trips/${tripId}`);
    });

    // Sub-collections Listener (Only if member)
    const isMember = trip?.members?.[user?.uid];
    if (!isMember) {
      setTimeline([]);
      setExpenses([]);
      setIdeas([]);
      setActivities([]);
      return () => unsubTrip();
    }

    // 2. Timeline Listener
    const timelineQ = query(collection(db, `trips/${tripId}/timeline`), orderBy('startTime', 'asc'));
    const unsubTimeline = onSnapshot(timelineQ, (snapshot) => {
      setTimeline(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `trips/${tripId}/timeline`);
    });

    // 3. Expenses Listener
    const unsubExpenses = onSnapshot(query(collection(db, `trips/${tripId}/expenses`), orderBy('createdAt', 'desc')), (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `trips/${tripId}/expenses`);
    });

    // 4. Ideas Listener
    const unsubIdeas = onSnapshot(query(collection(db, `trips/${tripId}/ideas`), orderBy('createdAt', 'desc')), (snapshot) => {
      setIdeas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `trips/${tripId}/ideas`);
    });

    // 5. Activities Listener
    const unsubActivities = onSnapshot(query(collection(db, `trips/${tripId}/activity`), orderBy('createdAt', 'desc')), (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `trips/${tripId}/activity`);
    });

    return () => {
      unsubTrip();
      unsubTimeline();
      unsubExpenses();
      unsubIdeas();
      unsubActivities();
    };
  }, [tripId, user, !!trip?.members?.[user?.uid]]);

  return (
    <TripDataContext.Provider value={{ trip, timeline, expenses, ideas, activities, memberProfiles, loading }}>
      {children}
    </TripDataContext.Provider>
  );
}

export function useTripData() {
  const context = useContext(TripDataContext);
  if (context === undefined) {
    throw new Error('useTripData must be used within a TripDataProvider');
  }
  return context;
}
