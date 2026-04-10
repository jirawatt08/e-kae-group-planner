import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { expenseService } from '../services/expenseService';
import { Expense } from '../types';

export function useExpenses(tripId: string, canEdit: boolean) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const createExpense = async (data: any) => {
    if (!user || !canEdit) return false;
    setLoading(true);
    try {
      await expenseService.createExpense(tripId, user.uid, data);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `trips/${tripId}/expenses`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateExpense = async (expenseId: string, data: any) => {
    if (!user || !canEdit) return false;
    setLoading(true);
    try {
      await expenseService.updateExpense(tripId, expenseId, data);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}/expenses/${expenseId}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (expense: Expense) => {
    if (!canEdit && expense.createdBy !== user?.uid) return;
    try {
      await expenseService.deleteExpense(tripId, expense.id, expense.title);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trips/${tripId}/expenses/${expense.id}`);
    }
  };

  const togglePaidStatus = async (expenseId: string, userId: string, currentStatus: boolean) => {
    if (!canEdit) return;
    try {
      await expenseService.togglePaidStatus(tripId, expenseId, userId, currentStatus);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}/expenses/${expenseId}`);
    }
  };

  return {
    createExpense,
    updateExpense,
    deleteExpense,
    togglePaidStatus,
    loading
  };
}
