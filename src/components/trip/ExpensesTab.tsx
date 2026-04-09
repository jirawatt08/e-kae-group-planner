import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTripData } from '../../contexts/TripDataContext';
import { handleFirestoreError, OperationType } from '../../lib/firestoreError';
import { logActivity } from '../../lib/activityLogger';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Receipt, Trash2 } from 'lucide-react';

export function ExpensesTab({ tripId, canEdit, tripMembers }: { tripId: string, canEdit: boolean, tripMembers: Record<string, string> }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { expenses } = useTripData();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    paidBy: user?.uid || '',
    splitAmong: Object.keys(tripMembers)
  });

  useEffect(() => {
    if (user && !newExpense.paidBy) {
      setNewExpense(prev => ({ ...prev, paidBy: user.uid }));
    }
  }, [user]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canEdit) return;

    const amountNum = parseFloat(newExpense.amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const initialPaidStatus: Record<string, boolean> = {};
    newExpense.splitAmong.forEach(uid => {
      initialPaidStatus[uid] = uid === newExpense.paidBy; // Payer has already "paid" their share
    });

    try {
      await addDoc(collection(db, `trips/${tripId}/expenses`), {
        tripId,
        title: newExpense.title,
        amount: amountNum,
        paidBy: newExpense.paidBy,
        splitAmong: newExpense.splitAmong,
        paidStatus: initialPaidStatus,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await logActivity(tripId, 'Added expense', `${newExpense.title} (฿${amountNum})`);
      setIsCreateOpen(false);
      setNewExpense({ title: '', amount: '', paidBy: user.uid, splitAmong: Object.keys(tripMembers) });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `trips/${tripId}/expenses`);
    }
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canEdit || !editingExpense) return;

    const amountNum = parseFloat(editingExpense.amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    try {
      await updateDoc(doc(db, `trips/${tripId}/expenses`, editingExpense.id), {
        title: editingExpense.title,
        amount: amountNum,
        paidBy: editingExpense.paidBy,
        updatedAt: serverTimestamp()
      });
      await logActivity(tripId, 'Updated expense', `${editingExpense.title} (฿${amountNum})`);
      setIsEditOpen(false);
      setEditingExpense(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}/expenses/${editingExpense.id}`);
    }
  };

  const openEditDialog = (expense: any) => {
    setEditingExpense({
      ...expense,
      amount: expense.amount.toString()
    });
    setIsEditOpen(true);
  };

  const togglePaidStatus = async (expenseId: string, userId: string, currentStatus: boolean) => {
    if (!canEdit) return;
    try {
      await updateDoc(doc(db, `trips/${tripId}/expenses`, expenseId), {
        [`paidStatus.${userId}`]: !currentStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}/expenses/${expenseId}`);
    }
  };

  const handleDelete = async (expenseId: string) => {
    if (!canEdit) return;
    const expenseToDelete = expenses.find(e => e.id === expenseId);
    try {
      await deleteDoc(doc(db, `trips/${tripId}/expenses`, expenseId));
      if (expenseToDelete) {
        await logActivity(tripId, 'Deleted expense', expenseToDelete.title);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trips/${tripId}/expenses/${expenseId}`);
    }
  };

  const memberIds = Object.keys(tripMembers);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">{t('expenses_title')}</h2>
        {canEdit && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <Plus className="h-4 w-4 mr-2" />
              {t('add_expense')}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('add_new_expense')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateExpense} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t('what_for')}</Label>
                  <Input id="title" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">{t('amount')} (฿)</Label>
                  <Input id="amount" type="number" step="0.01" min="0" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>{t('who_paid')}</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={newExpense.paidBy}
                    onChange={e => setNewExpense({...newExpense, paidBy: e.target.value})}
                  >
                    {memberIds.map(uid => (
                      <option key={uid} value={uid}>{uid === user?.uid ? t('me') : `User ${uid.substring(0,5)}`}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end">
                  <Button type="submit">{t('save_expense')}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('edit_expense') || 'Edit Expense'}</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <form onSubmit={handleUpdateExpense} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">{t('what_for')}</Label>
                <Input id="edit-title" value={editingExpense.title} onChange={e => setEditingExpense({...editingExpense, title: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-amount">{t('amount')} (฿)</Label>
                <Input id="edit-amount" type="number" step="0.01" min="0" value={editingExpense.amount} onChange={e => setEditingExpense({...editingExpense, amount: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{t('who_paid')}</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={editingExpense.paidBy}
                  onChange={e => setEditingExpense({...editingExpense, paidBy: e.target.value})}
                >
                  {memberIds.map(uid => (
                    <option key={uid} value={uid}>{uid === user?.uid ? t('me') : `User ${uid.substring(0,5)}`}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end">
                <Button type="submit">{t('update_event') || 'Update Expense'}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-y-auto">
        {expenses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {t('no_expenses')}
          </div>
        ) : (
          <div className="space-y-4">
            {expenses.map((expense) => {
              const splitAmount = expense.amount / expense.splitAmong.length;
              
              return (
                <div key={expense.id} className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <div className="bg-green-100 p-2 rounded-full mr-3 cursor-pointer" onClick={() => canEdit && openEditDialog(expense)}>
                        <Receipt className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="cursor-pointer" onClick={() => canEdit && openEditDialog(expense)}>
                        <h3 className="font-semibold text-gray-900">{expense.title}</h3>
                        <p className="text-sm text-gray-500">
                          {t('paid_by')} {expense.paidBy === user?.uid ? t('you') : `User ${expense.paidBy.substring(0,5)}`} • ฿{expense.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary" onClick={() => openEditDialog(expense)}>
                          <Plus className="h-4 w-4 rotate-45" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(expense.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 rounded-md p-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('split_each')} (฿{splitAmount.toLocaleString()} each)</h4>
                    <div className="space-y-2">
                      {expense.splitAmong.map((uid: string) => {
                        const hasPaid = expense.paidStatus[uid] || false;
                        const isPayer = uid === expense.paidBy;
                        
                        return (
                          <div key={uid} className="flex items-center justify-between text-sm">
                            <span className={isPayer ? "font-medium" : ""}>
                              {uid === user?.uid ? t('you') : `User ${uid.substring(0,5)}`} {isPayer && `(${t('payer')})`}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className={hasPaid ? "text-green-600" : "text-orange-500"}>
                                {hasPaid ? t('settled') : t('owes')}
                              </span>
                              {!isPayer && (
                                <Checkbox 
                                  checked={hasPaid} 
                                  onCheckedChange={() => togglePaidStatus(expense.id, uid, hasPaid)}
                                  disabled={!canEdit}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
