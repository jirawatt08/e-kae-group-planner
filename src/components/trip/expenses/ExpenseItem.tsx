import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Receipt, Plus, Trash2, UserPlus } from 'lucide-react';
import { Expense, ExtraDetail } from '../../../types';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getUserColorStyles } from '../../../lib/userUtils';

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
  const guestNames: string[] = expense.guestNames || [];
  const extraDetails: ExtraDetail[] = expense.extraDetails || [];

  const paidByMap = getPaidByMap(expense);
  const extras: Record<string, number> = expense.extras || {};
  
  // Merge extraDetails into extras for calculation
  const computedExtras = { ...extras };
  extraDetails.forEach((detail) => {
    const amt = detail.amount || 0;
    if (amt > 0 && detail.forPerson) {
      computedExtras[detail.forPerson] = (computedExtras[detail.forPerson] || 0) + amt;
    }
  });

  const shares = calcShares(expense.amount, expense.splitAmong, computedExtras);
  const totalExtras = Object.values(computedExtras).reduce((s: number, v: number) => s + v, 0);
  const sharedBase = Math.max(0, expense.amount - totalExtras);
  const perPerson = expense.splitAmong.length > 0 ? sharedBase / expense.splitAmong.length : 0;
  
  const getPersonName = (id: string) => {
    if (id.startsWith('guest:')) {
      const idx = parseInt(id.split(':')[1]);
      return guestNames[idx] || `Guest ${idx + 1}`;
    }
    return displayName(id, currentUserId, memberProfiles, t('you'));
  };

  const payerNames = Object.entries(paidByMap)
    .map(([uid, amt]) => {
      const styles = getUserColorStyles(uid);
      return (
        <span key={uid} style={styles.text}>
          {getPersonName(uid)} ฿{(amt as number).toLocaleString()}
        </span>
      );
    });

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center cursor-pointer" onClick={() => canEdit && onEdit(expense)}>
          <div className="bg-emerald-500/10 p-2 rounded-full mr-3">
            <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{expense.title}</h3>
            <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-1">
              <span>{t('paid_by')}</span> 
              <div className="flex flex-wrap gap-1">
                {payerNames}
              </div>
              <span>• ฿{expense.amount.toLocaleString()}</span>
            </div>
          </div>
        </div>
        {canEdit && (
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary whitespace-nowrap" onClick={() => onEdit(expense)}>
              <Plus className="h-4 w-4 rotate-45" />
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => onDelete(expense.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Guest names badge */}
      {guestNames.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {guestNames.map((name, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              <UserPlus className="h-2.5 w-2.5" />
              {name || `Guest ${i + 1}`}
            </span>
          ))}
        </div>
      )}

      {/* Extra Details */}
      {extraDetails.length > 0 && (
        <div className="mb-3 bg-amber-500/10 border border-amber-500/20 rounded-md p-2">
          <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">{t('extra_costs') || 'Extra Costs'}</p>
          {extraDetails.map((detail, idx) => (
            <div key={detail.id || idx} className="flex justify-between text-xs text-amber-900 dark:text-amber-200">
              <span className="opacity-80">{detail.label || 'Item'} → {getPersonName(detail.forPerson)}</span>
              <span className="font-bold">+฿{(detail.amount || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-muted/50 rounded-md p-3">
        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">
          {t('split_each')} (฿{perPerson.toLocaleString(undefined, { maximumFractionDigits: 2 })} {t('each')}
          {totalExtras > 0 && ` + ${t('extras')}`})
        </h4>
        <div className="space-y-2">
          {expense.splitAmong.map((uid: string) => {
            const personShare = shares[uid] || 0;
            const personExtra = computedExtras[uid] || 0;
            const hasPaid = expense.paidStatus?.[uid] || false;
            const isPayer = uid in paidByMap;

            return (
              <div key={uid} className="flex items-center justify-between text-sm">
                <span className={isPayer ? 'font-medium' : ''}>
                  <span style={getUserColorStyles(uid).text}>{getPersonName(uid)}</span>
                  {isPayer && ` (${t('payer')})`}
                  <span className="text-muted-foreground ml-1">
                    ฿{personShare.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  {personExtra > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold ml-1 tracking-tighter">(+฿{personExtra.toLocaleString()})</span>
                  )}
                </span>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-bold leading-none ${hasPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-500'}`}>
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
