import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';

interface TripDataContextType {
  trip: any;
  timeline: any[];
  expenses: any[];
  ideas: any[];
  activities: any[];
  loading: boolean;
}

const TripDataContext = createContext<TripDataContextType | undefined>(undefined);

export function TripDataProvider({ tripId, children }: { tripId: string, children: ReactNode }) {
  const [trip, setTrip] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;

    // 1. Trip Listener
    const tripRef = doc(db, 'trips', tripId);
    const unsubTrip = onSnapshot(tripRef, (docSnap) => {
      if (docSnap.exists()) {
        setTrip({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `trips/${tripId}`);
    });

    // 2. Timeline Listener
    const timelineQ = query(collection(db, `trips/${tripId}/timeline`), orderBy('startTime', 'asc'));
    const unsubTimeline = onSnapshot(timelineQ, (snapshot) => {
      setTimeline(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `trips/${tripId}/timeline`);
    });

    // 3. Expenses Listener
    const expensesQ = query(collection(db, `trips/${tripId}/expenses`), orderBy('createdAt', 'desc'));
    const unsubExpenses = onSnapshot(expensesQ, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `trips/${tripId}/expenses`);
    });

    // 4. Ideas Listener
    const ideasQ = query(collection(db, `trips/${tripId}/ideas`), orderBy('createdAt', 'desc'));
    const unsubIdeas = onSnapshot(ideasQ, (snapshot) => {
      setIdeas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `trips/${tripId}/ideas`);
    });

    // 5. Activities Listener
    const activitiesQ = query(collection(db, `trips/${tripId}/activity`), orderBy('createdAt', 'desc'));
    const unsubActivities = onSnapshot(activitiesQ, (snapshot) => {
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
  }, [tripId]);

  return (
    <TripDataContext.Provider value={{ trip, timeline, expenses, ideas, activities, loading }}>
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
