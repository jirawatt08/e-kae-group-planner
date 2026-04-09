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
import { Plus, Receipt, Trash2, Users } from 'lucide-react';

// === Helpers ===

/** Backward-compat: build a paidByMap from old or new data */
function getPaidByMap(expense: any): Record<string, number> {
  if (expense.paidByMap && typeof expense.paidByMap === 'object') return expense.paidByMap;
  if (expense.paidBy) return { [expense.paidBy]: expense.amount };
  return {};
}

/** Calculate what each person owes for an expense */
function calcShares(amount: number, splitAmong: string[], extras: Record<string, number>): Record<string, number> {
  const totalExtras = Object.values(extras).reduce((s, v) => s + v, 0);
  const sharedBase = Math.max(0, amount - totalExtras);
  const perPerson = splitAmong.length > 0 ? sharedBase / splitAmong.length : 0;
  const shares: Record<string, number> = {};
  for (const uid of splitAmong) {
    shares[uid] = perPerson + (extras[uid] || 0);
  }
  return shares;
}

function displayName(uid: string, currentUid: string | undefined, tYou: string, tMe: string): string {
  return uid === currentUid ? tYou : `User ${uid.substring(0, 5)}`;
}

// === Component ===

export function ExpensesTab({ tripId, canEdit, tripMembers }: { tripId: string; canEdit: boolean; tripMembers: Record<string, string> }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { expenses } = useTripData();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  const memberIds = Object.keys(tripMembers);

  const emptyForm = () => ({
    title: '',
    amount: '',
    paidByUids: [user?.uid || ''] as string[],
    paidAmounts: {} as Record<string, string>,
    splitAmong: [...memberIds],
    extras: {} as Record<string, string>, // uid -> extra amount string
  });

  const [newExpense, setNewExpense] = useState(emptyForm());

  useEffect(() => {
    if (user && newExpense.paidByUids.length === 0) {
      setNewExpense(prev => ({ ...prev, paidByUids: [user.uid] }));
    }
  }, [user]);

  // --- Payer toggles ---
  const togglePayer = (uid: string, checked: boolean, setState: React.Dispatch<React.SetStateAction<any>>) => {
    setState((prev: any) => {
      let uids = [...(prev.paidByUids || [])];
      const amounts = { ...(prev.paidAmounts || {}) };
      if (checked) {
        if (!uids.includes(uid)) uids.push(uid);
      } else {
        uids = uids.filter((u: string) => u !== uid);
        delete amounts[uid];
      }
      return { ...prev, paidByUids: uids, paidAmounts: amounts };
    });
  };

  // --- Create ---
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

    try {
      await addDoc(collection(db, `trips/${tripId}/expenses`), {
        tripId,
        title: newExpense.title,
        amount: amountNum,
        paidBy: newExpense.paidByUids[0],
        paidByMap,
        splitAmong: newExpense.splitAmong,
        extras,
        splitMode: Object.keys(extras).length > 0 ? 'extras' : 'equal',
        exactSplits: {},
        paidStatus: initialPaidStatus,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await logActivity(tripId, 'Added expense', `${newExpense.title} (฿${amountNum})`);
      setIsCreateOpen(false);
      setNewExpense(emptyForm());
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `trips/${tripId}/expenses`);
    }
  };

  // --- Update ---
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canEdit || !editingExpense) return;
    const amountNum = parseFloat(editingExpense.amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const paidByMap: Record<string, number> = {};
    for (const uid of editingExpense.paidByUids) {
      paidByMap[uid] = parseFloat(editingExpense.paidAmounts[uid] || '0') || 0;
    }
    if (editingExpense.paidByUids.length === 1 && paidByMap[editingExpense.paidByUids[0]] === 0) {
      paidByMap[editingExpense.paidByUids[0]] = amountNum;
    }

    const extras: Record<string, number> = {};
    for (const uid of editingExpense.splitAmong) {
      const v = parseFloat(editingExpense.extras?.[uid] || '0') || 0;
      if (v > 0) extras[uid] = v;
    }

    try {
      await updateDoc(doc(db, `trips/${tripId}/expenses`, editingExpense.id), {
        title: editingExpense.title,
        amount: amountNum,
        paidBy: editingExpense.paidByUids[0],
        paidByMap,
        extras,
        splitMode: Object.keys(extras).length > 0 ? 'extras' : 'equal',
        exactSplits: {},
        updatedAt: serverTimestamp(),
      });
      await logActivity(tripId, 'Updated expense', `${editingExpense.title} (฿${amountNum})`);
      setIsEditOpen(false);
      setEditingExpense(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}/expenses/${editingExpense.id}`);
    }
  };

  // --- Edit dialog prep ---
  const openEdit = (expense: any) => {
    const existingMap = getPaidByMap(expense);
    const paidByUids = Object.keys(existingMap);
    const paidAmounts: Record<string, string> = {};
    paidByUids.forEach(uid => { paidAmounts[uid] = existingMap[uid].toString(); });

    const extrasStr: Record<string, string> = {};
    if (expense.extras) {
      Object.entries(expense.extras).forEach(([k, v]) => { extrasStr[k] = String(v); });
    }

    setEditingExpense({
      ...expense,
      amount: expense.amount.toString(),
      paidByUids,
      paidAmounts,
      extras: extrasStr,
    });
    setIsEditOpen(true);
  };

  // --- Toggle paid status ---
  const togglePaid = async (expenseId: string, userId: string, current: boolean) => {
    if (!canEdit) return;
    try {
      await updateDoc(doc(db, `trips/${tripId}/expenses`, expenseId), {
        [`paidStatus.${userId}`]: !current,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}/expenses/${expenseId}`);
    }
  };

  // --- Delete ---
  const handleDelete = async (expenseId: string) => {
    if (!canEdit) return;
    const exp = expenses.find(e => e.id === expenseId);
    try {
      await deleteDoc(doc(db, `trips/${tripId}/expenses`, expenseId));
      if (exp) await logActivity(tripId, 'Deleted expense', exp.title);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trips/${tripId}/expenses/${expenseId}`);
    }
  };

  // === Shared form renderer ===
  const renderForm = (data: any, setState: React.Dispatch<React.SetStateAction<any>>, onSubmit: (e: React.FormEvent) => void, submitLabel: string) => (
    <form onSubmit={onSubmit} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
      {/* Title */}
      <div className="space-y-2">
        <Label>{t('what_for')}</Label>
        <Input value={data.title} onChange={e => setState((p: any) => ({ ...p, title: e.target.value }))} required />
      </div>

      {/* Total Amount */}
      <div className="space-y-2">
        <Label>{t('amount')} (฿)</Label>
        <Input type="number" step="0.01" min="0" value={data.amount} onChange={e => setState((p: any) => ({ ...p, amount: e.target.value }))} required />
      </div>

      {/* Who Paid */}
      <div className="space-y-2">
        <Label>{t('who_paid')}</Label>
        <p className="text-xs text-gray-500">{t('multi_payer_hint') || 'Check who paid and enter their amount'}</p>
        <div className="space-y-2 bg-gray-50 p-3 rounded-md border">
          {memberIds.map(uid => {
            const isChecked = (data.paidByUids || []).includes(uid);
            return (
              <div key={uid} className="flex items-center gap-2">
                <Checkbox checked={isChecked} onCheckedChange={(c) => togglePayer(uid, !!c, setState)} />
                <span className="flex-1 text-sm truncate">{displayName(uid, user?.uid, t('me'), t('me'))}</span>
                {isChecked && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">฿</span>
                    <Input type="number" step="0.01" min="0" className="w-24 h-8" placeholder="Amount"
                      value={data.paidAmounts?.[uid] || ''}
                      onChange={e => setState((p: any) => ({ ...p, paidAmounts: { ...(p.paidAmounts || {}), [uid]: e.target.value } }))} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Extra Costs */}
      <div className="space-y-2">
        <Label>{t('extra_costs') || 'Extra / Personal Items'}</Label>
        <p className="text-xs text-gray-500">{t('extra_costs_hint') || 'Add extra cost if someone ordered something just for themselves (e.g. extra dish). Leave blank if none.'}</p>
        <div className="space-y-2 bg-amber-50 p-3 rounded-md border border-amber-200">
          {memberIds.map(uid => (
            <div key={uid} className="flex items-center gap-2">
              <span className="flex-1 text-sm truncate">{displayName(uid, user?.uid, t('me'), t('me'))}</span>
              <span className="text-xs text-gray-500">+฿</span>
              <Input type="number" step="0.01" min="0" className="w-24 h-8" placeholder="0"
                value={data.extras?.[uid] || ''}
                onChange={e => setState((p: any) => ({ ...p, extras: { ...(p.extras || {}), [uid]: e.target.value } }))} />
            </div>
          ))}
        </div>
        {/* Live preview */}
        {data.amount && parseFloat(data.amount) > 0 && (() => {
          const amt = parseFloat(data.amount) || 0;
          const extrasNum: Record<string, number> = {};
          memberIds.forEach(uid => {
            const v = parseFloat(data.extras?.[uid] || '0') || 0;
            if (v > 0) extrasNum[uid] = v;
          });
          const shares = calcShares(amt, data.splitAmong || memberIds, extrasNum);
          const totalExtras = Object.values(extrasNum).reduce((s, v) => s + v, 0);
          const sharedBase = Math.max(0, amt - totalExtras);
          const perPerson = (data.splitAmong || memberIds).length > 0 ? sharedBase / (data.splitAmong || memberIds).length : 0;

          return (
            <div className="mt-3 p-3 bg-white rounded-md border text-sm">
              <p className="font-medium text-gray-700 mb-2">{t('preview') || '💡 Preview'}</p>
              <p className="text-xs text-gray-500 mb-1">
                {t('shared_base') || 'Shared base'}: ฿{sharedBase.toLocaleString()} ÷ {(data.splitAmong || memberIds).length} = ฿{perPerson.toLocaleString(undefined, { maximumFractionDigits: 2 })} {t('each') || 'each'}
              </p>
              <div className="space-y-1">
                {(data.splitAmong || memberIds).map((uid: string) => (
                  <div key={uid} className="flex justify-between">
                    <span className="text-gray-600">{displayName(uid, user?.uid, t('you'), t('me'))}</span>
                    <span className="font-medium">
                      ฿{shares[uid]?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      {(extrasNum[uid] || 0) > 0 && <span className="text-amber-600 text-xs ml-1">(+฿{extrasNum[uid]})</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );

  // === Main render ===
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
              {renderForm(newExpense, setNewExpense, handleCreate, t('save_expense'))}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('edit_expense') || 'Edit Expense'}</DialogTitle>
          </DialogHeader>
          {editingExpense && renderForm(editingExpense, setEditingExpense, handleUpdate, t('update_event') || 'Update')}
        </DialogContent>
      </Dialog>

      {/* Expense List */}
      <div className="flex-1 overflow-y-auto">
        {expenses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{t('no_expenses')}</div>
        ) : (
          <div className="space-y-4">
            {expenses.map(expense => {
              const paidByMap = getPaidByMap(expense);
              const extras: Record<string, number> = expense.extras || {};
              const shares = calcShares(expense.amount, expense.splitAmong, extras);
              const totalExtras = Object.values(extras).reduce((s: number, v: number) => s + v, 0);
              const sharedBase = Math.max(0, expense.amount - totalExtras);
              const perPerson = expense.splitAmong.length > 0 ? sharedBase / expense.splitAmong.length : 0;
              const payerNames = Object.entries(paidByMap)
                .map(([uid, amt]) => `${displayName(uid, user?.uid, t('you'), t('me'))} ฿${(amt as number).toLocaleString()}`)
                .join(', ');

              return (
                <div key={expense.id} className="bg-white border rounded-lg p-4 shadow-sm">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center cursor-pointer" onClick={() => canEdit && openEdit(expense)}>
                      <div className="bg-green-100 p-2 rounded-full mr-3">
                        <Receipt className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{expense.title}</h3>
                        <p className="text-sm text-gray-500">{t('paid_by')} {payerNames} • ฿{expense.amount.toLocaleString()}</p>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary" onClick={() => openEdit(expense)}>
                          <Plus className="h-4 w-4 rotate-45" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(expense.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Split breakdown */}
                  <div className="bg-gray-50 rounded-md p-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      {t('split_each')} (฿{perPerson.toLocaleString(undefined, { maximumFractionDigits: 2 })} {t('each') || 'each'}
                      {totalExtras > 0 && ` + ${t('extras') || 'extras'}`})
                    </h4>
                    <div className="space-y-2">
                      {expense.splitAmong.map((uid: string) => {
                        const personShare = shares[uid] || 0;
                        const personExtra = extras[uid] || 0;
                        const hasPaid = expense.paidStatus?.[uid] || false;
                        const isPayer = uid in paidByMap;

                        return (
                          <div key={uid} className="flex items-center justify-between text-sm">
                            <span className={isPayer ? 'font-medium' : ''}>
                              {displayName(uid, user?.uid, t('you'), t('me'))}
                              {isPayer && ` (${t('payer')})`}
                              <span className="text-gray-500 ml-1">
                                ฿{personShare.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </span>
                              {personExtra > 0 && (
                                <span className="text-amber-600 text-xs ml-1">(+฿{personExtra.toLocaleString()})</span>
                              )}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className={hasPaid ? 'text-green-600' : 'text-orange-500'}>
                                {hasPaid ? t('settled') : t('owes')}
                              </span>
                              {!isPayer && (
                                <Checkbox
                                  checked={hasPaid}
                                  onCheckedChange={() => togglePaid(expense.id, uid, hasPaid)}
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
