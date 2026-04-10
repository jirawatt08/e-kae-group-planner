import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Receipt, Plus, Trash2 } from 'lucide-react';
import { Expense } from '../../../types';
import { useLanguage } from '../../../contexts/LanguageContext';

interface ExpenseItemProps {
  key?: React.Key;
  expense: Expense;
  canEdit: boolean;
  memberProfiles: Record<string, any>;
  currentUserId?: string;
  calcShares: (amount: number, splitAmong: string[], extras: Record<string, number>) => Record<string, number>;
  getPaidByMap: (expense: Expense) => Record<string, number>;
  displayName: (uid: string, currentUid: string | undefined, memberProfiles: Record<string, any>, tYou: string) => string;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
  onTogglePaid: (expenseId: string, userId: string, currentStatus: boolean) => void;
}

export function ExpenseItem({
  expense,
  canEdit,
  memberProfiles,
  currentUserId,
  calcShares,
  getPaidByMap,
  displayName,
  onEdit,
  onDelete,
  onTogglePaid
}: ExpenseItemProps) {
  const { t } = useLanguage();

  const paidByMap = getPaidByMap(expense);
  const extras: Record<string, number> = expense.extras || {};
  const shares = calcShares(expense.amount, expense.splitAmong, extras);
  const totalExtras = Object.values(extras).reduce((s: number, v: number) => s + v, 0);
  const sharedBase = Math.max(0, expense.amount - totalExtras);
  const perPerson = expense.splitAmong.length > 0 ? sharedBase / expense.splitAmong.length : 0;
  
  const payerNames = Object.entries(paidByMap)
    .map(([uid, amt]) => `${displayName(uid, currentUserId, memberProfiles, t('you'))} ฿${(amt as number).toLocaleString()}`)
    .join(', ');

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center cursor-pointer" onClick={() => canEdit && onEdit(expense)}>
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
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-primary" onClick={() => onEdit(expense)}>
              <Plus className="h-4 w-4 rotate-45" />
            </Button>
            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(expense.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

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
                  {displayName(uid, currentUserId, memberProfiles, t('you'))}
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
                      onCheckedChange={() => onTogglePaid(expense.id, uid, hasPaid)}
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
}
