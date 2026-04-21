import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTripData } from '../../contexts/TripDataContext';
import { useExpenses } from '../../hooks/useExpenses';
import { Expense } from '../../types';
import { resolveDisplayName } from '../../lib/userUtils';
import { expenseService } from '../../services/expenseService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { ExpenseForm } from './expenses/ExpenseForm';
import { ExpenseItem } from './expenses/ExpenseItem';
import { Skeleton } from '@/components/ui/skeleton';

export function ExpensesTab({ tripId, canEdit, tripMembers }: { tripId: string; canEdit: boolean; tripMembers: Record<string, string> }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { expenses, memberProfiles, loading: dataLoading } = useTripData();
  const { createExpense, updateExpense, deleteExpense, togglePaidStatus, loading } = useExpenses(tripId, canEdit);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const memberIds = Object.keys(tripMembers);

  const emptyForm = () => ({
    title: '',
    amount: '',
    paidByUids: [user?.uid || ''] as string[],
    paidAmounts: {} as Record<string, string>,
    splitAmong: [...memberIds],
    extras: {} as Record<string, string>, // uid -> extra amount string
    extraDetails: [] as any[],
    guestNames: [] as string[],
  });

  const [newExpense, setNewExpense] = useState(emptyForm());

  useEffect(() => {
    if (user && newExpense.paidByUids.length === 0) {
      setNewExpense(prev => ({ ...prev, paidByUids: [user.uid] }));
    }
  }, [user]);

  // --- Handlers ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canEdit) return;
    const amountNum = parseFloat(newExpense.amount);
    if (isNaN(amountNum) || amountNum <= 0) return;
    if (newExpense.paidByUids.length === 0) return;

    // Build paidByMap
    const paidByMap: Record<string, number> = {};
    for (const uid of newExpense.paidByUids) {
      paidByMap[uid] = parseFloat(newExpense.paidAmounts[uid] || '0') || 0;
    }
    if (newExpense.paidByUids.length === 1 && paidByMap[newExpense.paidByUids[0]] === 0) {
      paidByMap[newExpense.paidByUids[0]] = amountNum;
    }

    // Build extras
    const extras: Record<string, number> = {};
    for (const uid of newExpense.splitAmong) {
      const v = parseFloat(newExpense.extras[uid] || '0') || 0;
      if (v > 0) extras[uid] = v;
    }

    const initialPaidStatus: Record<string, boolean> = {};
    newExpense.splitAmong.forEach(uid => {
      initialPaidStatus[uid] = uid in paidByMap;
    });

    // Build extraDetails for DB
    const extraDetails = (newExpense.extraDetails || []).filter((d: any) => d.label && parseFloat(d.amount) > 0).map((d: any) => ({
      id: d.id,
      label: d.label,
      amount: parseFloat(d.amount) || 0,
      forPerson: d.forPerson
    }));

    const success = await createExpense({
      title: newExpense.title,
      amount: amountNum,
      paidByUids: newExpense.paidByUids,
      paidByMap,
      splitAmong: newExpense.splitAmong,
      extras,
      extraDetails,
      guestNames: (newExpense.guestNames || []).filter((n: string) => n.trim()),
      paidStatus: initialPaidStatus,
    });
    
    if (success) {
      setIsCreateOpen(false);
      setNewExpense(emptyForm());
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canEdit || !editingExpense) return;
    const amountNum = parseFloat(editingExpense.amount as unknown as string);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const paidByMap: Record<string, number> = {};
    for (const uid of editingExpense.paidByUids || []) {
      const v = (editingExpense as any).paidAmounts?.[uid];
      paidByMap[uid] = parseFloat(v || '0') || 0;
    }
    if ((editingExpense.paidByUids?.length || 0) === 1 && paidByMap[editingExpense.paidByUids![0]] === 0) {
      paidByMap[editingExpense.paidByUids![0]] = amountNum;
    }

    const extras: Record<string, number> = {};
    for (const uid of editingExpense.splitAmong || []) {
      const v = parseFloat((editingExpense as any).extras?.[uid] || '0') || 0;
      if (v > 0) extras[uid] = v;
    }

    // Build extraDetails for DB
    const extraDetails = ((editingExpense as any).extraDetails || []).filter((d: any) => d.label && parseFloat(d.amount) > 0).map((d: any) => ({
      id: d.id,
      label: d.label,
      amount: parseFloat(d.amount) || 0,
      forPerson: d.forPerson
    }));

    const success = await updateExpense(editingExpense.id, {
      title: editingExpense.title,
      amount: amountNum,
      paidByUids: (editingExpense as any).paidByUids || [],
      paidByMap,
      splitAmong: editingExpense.splitAmong || [],
      extras,
      extraDetails,
      guestNames: ((editingExpense as any).guestNames || []).filter((n: string) => n.trim()),
      paidStatus: editingExpense.paidStatus || {},
    });

    if (success) {
      setIsEditOpen(false);
      setEditingExpense(null);
    }
  };

  const openEdit = (expense: Expense) => {
    const existingMap = expenseService.getPaidByMap(expense);
    const paidByUids = Object.keys(existingMap);
    const paidAmounts: Record<string, string> = {};
    paidByUids.forEach(uid => { paidAmounts[uid] = existingMap[uid].toString(); });

    const extrasStr: Record<string, string> = {};
    if (expense.extras) {
      Object.entries(expense.extras).forEach(([k, v]) => { extrasStr[k] = String(v); });
    }

    setEditingExpense({
      ...expense,
      amount: expense.amount.toString() as any,
      paidByUids,
      paidAmounts,
      extras: extrasStr,
      extraDetails: expense.extraDetails || [],
      guestNames: expense.guestNames || [],
    } as any);
    setIsEditOpen(true);
  };

  const handleDelete = async (expenseId: string) => {
    const exp = expenses.find(e => e.id === expenseId);
    if (exp) {
      await deleteExpense(exp);
    }
  };

  const togglePaid = async (expenseId: string, userId: string, current: boolean) => {
    await togglePaidStatus(expenseId, userId, current);
  };

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
              <ExpenseForm
                data={newExpense}
                setState={setNewExpense}
                onSubmit={handleCreate}
                submitLabel={t('save_expense')}
                loading={loading}
                memberIds={memberIds}
                memberProfiles={memberProfiles}
                currentUserId={user?.uid}
                calcShares={expenseService.calculateShares}
                displayName={resolveDisplayName}
              />
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
            <ExpenseForm
              data={editingExpense}
              setState={setEditingExpense}
              onSubmit={handleUpdate}
              submitLabel={t('update_event') || 'Update'}
              loading={loading}
              memberIds={memberIds}
              memberProfiles={memberProfiles}
              currentUserId={user?.uid}
              calcShares={expenseService.calculateShares}
              displayName={resolveDisplayName}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-y-auto">
        {dataLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 flex justify-between items-center">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-8 w-16 rounded-lg" />
              </div>
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border hover:bg-muted/30 transition-colors">
            {t('no_expenses')}
          </div>
        ) : (
          <div className="space-y-4">
            {expenses.map((expense) => (
              <ExpenseItem
                key={expense.id}
                expense={expense as Expense}
                canEdit={canEdit}
                memberProfiles={memberProfiles}
                currentUserId={user?.uid}
                calcShares={expenseService.calculateShares}
                getPaidByMap={expenseService.getPaidByMap}
                displayName={resolveDisplayName}
                onEdit={openEdit}
                onDelete={handleDelete}
                onTogglePaid={togglePaid}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
