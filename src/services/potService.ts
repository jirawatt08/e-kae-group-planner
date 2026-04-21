import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { PotTransaction } from '../types';

export const potService = {
  addTransaction: async (tripId: string, type: 'contribution' | 'spending', amount: number, description: string) => {
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, `trips/${tripId}/pot`), {
        type,
        amount,
        description,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Unknown',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error adding pot transaction:", error);
      throw error;
    }
  },

  getTransactions: async (tripId: string) => {
    const q = query(collection(db, `trips/${tripId}/pot`), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PotTransaction));
  }
};
