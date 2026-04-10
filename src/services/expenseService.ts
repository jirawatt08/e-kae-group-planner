import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { activityService } from './activityService';

export const expenseService = {
  createExpense: async (
    tripId: string, 
    userId: string, 
    data: { 
      title: string; 
      amount: number; 
      paidByUids: string[]; 
      paidByMap: Record<string, number>; 
      splitAmong: string[]; 
      extras: Record<string, number>; 
      paidStatus: Record<string, boolean>; 
    }
  ) => {
    const { title, amount, paidByUids, paidByMap, splitAmong, extras, paidStatus } = data;
    
    // Safety check matching UI
    if (paidByUids.length === 0) throw new Error("No payer selected");

    const splitMode = Object.keys(extras).length > 0 ? 'extras' : 'equal';
    const paidBy = paidByUids[0]; // Primary payer for old schema compat

    const docRef = await addDoc(collection(db, `trips/${tripId}/expenses`), {
      tripId,
      title,
      amount,
      paidBy,
      paidByMap,
      splitAmong,
      extras,
      splitMode,
      exactSplits: {},
      paidStatus,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await activityService.logActivity(tripId, 'Added expense', `${title} (฿${amount})`);
    return docRef;
  },

  updateExpense: async (
    tripId: string,
    expenseId: string,
    data: {
      title: string;
      amount: number;
      paidByUids: string[];
      paidByMap: Record<string, number>;
      splitAmong: string[];
      extras: Record<string, number>;
      paidStatus: Record<string, boolean>;
    }
  ) => {
    const { title, amount, paidByUids, paidByMap, splitAmong, extras, paidStatus } = data;
    const splitMode = Object.keys(extras).length > 0 ? 'extras' : 'equal';
    
    // Safety check mapping
    let paidBy = paidByUids.length > 0 ? paidByUids[0] : '';
    
    const updateData: Record<string, any> = {
      title,
      amount,
      paidByMap,
      splitAmong,
      extras,
      splitMode,
      exactSplits: {},
      paidStatus,
      updatedAt: serverTimestamp(),
    };
    
    // Only send paidBy if it exists (handles edge case bug)
    if (paidBy !== '') {
      updateData.paidBy = paidBy;
    }

    await updateDoc(doc(db, `trips/${tripId}/expenses`, expenseId), updateData);
    await activityService.logActivity(tripId, 'Updated expense', `${title} (฿${amount})`);
  },

  deleteExpense: async (tripId: string, expenseId: string, title: string) => {
    await deleteDoc(doc(db, `trips/${tripId}/expenses`, expenseId));
    await activityService.logActivity(tripId, 'Deleted expense', title);
  },

  togglePaidStatus: async (tripId: string, expenseId: string, userId: string, currentStatus: boolean) => {
    await updateDoc(doc(db, `trips/${tripId}/expenses`, expenseId), {
      [`paidStatus.${userId}`]: !currentStatus,
      updatedAt: serverTimestamp()
    });
  },

  getPaidByMap: (expense: any): Record<string, number> => {
    if (expense.paidByMap && typeof expense.paidByMap === 'object') return expense.paidByMap;
    if (expense.paidBy) return { [expense.paidBy]: expense.amount };
    return {};
  },

  calculateShares: (amount: number, splitAmong: string[], extras: Record<string, number>): Record<string, number> => {
    const totalExtras = Object.values(extras).reduce((s: number, v: number) => s + v, 0);
    const sharedBase = Math.max(0, amount - totalExtras);
    const perPerson = splitAmong.length > 0 ? sharedBase / splitAmong.length : 0;
    const shares: Record<string, number> = {};
    for (const uid of splitAmong) {
      shares[uid] = perPerson + (extras[uid] || 0);
    }
    return shares;
  }
};
