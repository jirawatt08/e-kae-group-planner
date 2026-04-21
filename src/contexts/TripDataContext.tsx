import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc, where, documentId, getDocs, limit } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { tripService } from '../services/tripService';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { profileCache } from '../lib/profileCache';
import { useMemo } from 'react';

interface TripDataContextType {
  trip: any;
  timeline: any[];
  expenses: any[];
  ideas: any[];
  activities: any[];
  potTransactions: any[];
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
  const [potTransactions, setPotTransactions] = useState<any[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const migrationAttempted = useRef<string | null>(null);

  // Fetch member profiles when trip members change
  useEffect(() => {
    if (!trip?.members) return;
    const uids = Object.keys(trip.members);
    
    const fetchProfiles = async () => {
      const newProfiles: Record<string, any> = {};
      const uidsToFetch: string[] = [];

      // 1. Check local state and cache first
      uids.forEach(uid => {
        const cached = profileCache.get(uid);
        if (memberProfiles[uid]) {
          newProfiles[uid] = memberProfiles[uid];
        } else if (cached) {
          newProfiles[uid] = cached;
        } else {
          uidsToFetch.push(uid);
        }
      });

      if (uidsToFetch.length === 0) {
        if (Object.keys(newProfiles).length > Object.keys(memberProfiles).length) {
          setMemberProfiles(newProfiles);
        }
        return;
      }

      // 2. Batch fetch missing profiles (Firestore 'in' limit is 30)
      try {
        const chunks = [];
        for (let i = 0; i < uidsToFetch.length; i += 30) {
          chunks.push(uidsToFetch.slice(i, i + 30));
        }

        await Promise.all(chunks.map(async (chunk) => {
          const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));
          const snap = await getDocs(q);
          snap.docs.forEach(d => {
            const data = d.data();
            newProfiles[d.id] = data;
            profileCache.set(d.id, data);
          });
        }));

        setMemberProfiles(prev => ({ ...prev, ...newProfiles }));
      } catch (error) {
        console.error('Error batch fetching profiles:', error);
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

    // 5. Activities Listener (Limited to 50 for performance)
    const unsubActivities = onSnapshot(query(collection(db, `trips/${tripId}/activity`), orderBy('createdAt', 'desc'), limit(50)), (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `trips/${tripId}/activity`);
    });

    // 6. Pot Listener
    const unsubPot = onSnapshot(query(collection(db, `trips/${tripId}/pot`), orderBy('createdAt', 'desc')), (snapshot) => {
      setPotTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `trips/${tripId}/pot`);
    });

    return () => {
      unsubTrip();
      unsubTimeline();
      unsubExpenses();
      unsubIdeas();
      unsubActivities();
      unsubPot();
    };
  }, [tripId, user, !!trip?.members?.[user?.uid]]);

  const contextValue = useMemo(() => ({
    trip,
    timeline,
    expenses,
    ideas,
    activities,
    potTransactions,
    memberProfiles,
    loading
  }), [trip, timeline, expenses, ideas, activities, potTransactions, memberProfiles, loading]);

  return (
    <TripDataContext.Provider value={contextValue}>
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
