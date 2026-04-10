import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '../../../contexts/LanguageContext';

interface ExpenseFormProps {
  data: any;
  setState: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  loading: boolean;
  memberIds: string[];
  memberProfiles: Record<string, any>;
  currentUserId?: string;
  calcShares: (amount: number, splitAmong: string[], extras: Record<string, number>) => Record<string, number>;
  displayName: (uid: string, currentUid: string | undefined, memberProfiles: Record<string, any>, tYou: string) => string;
}

export function ExpenseForm({
  data,
  setState,
  onSubmit,
  submitLabel,
  loading,
  memberIds,
  memberProfiles,
  currentUserId,
  calcShares,
  displayName
}: ExpenseFormProps) {
  const { t } = useLanguage();

  const togglePayer = (uid: string, checked: boolean) => {
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

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
      <div className="space-y-2">
        <Label>{t('what_for')}</Label>
        <Input value={data.title} onChange={e => setState((p: any) => ({ ...p, title: e.target.value }))} required />
      </div>

      <div className="space-y-2">
        <Label>{t('amount')} (฿)</Label>
        <Input type="number" step="0.01" min="0" value={data.amount} onChange={e => setState((p: any) => ({ ...p, amount: e.target.value }))} required />
      </div>

      <div className="space-y-2">
        <Label>{t('who_paid')}</Label>
        <p className="text-xs text-gray-500">{t('multi_payer_hint') || 'Check who paid and enter their amount'}</p>
        <div className="space-y-2 bg-gray-50 p-3 rounded-md border">
          {memberIds.map(uid => {
            const isChecked = (data.paidByUids || []).includes(uid);
            return (
              <div key={uid} className="flex items-center gap-2">
                <Checkbox checked={isChecked} onCheckedChange={(c) => togglePayer(uid, !!c)} />
                <span className="flex-1 text-sm truncate">{displayName(uid, currentUserId, memberProfiles, t('me'))}</span>
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

      <div className="space-y-2">
        <Label>{t('extra_costs') || 'Extra / Personal Items'}</Label>
        <p className="text-xs text-gray-500">{t('extra_costs_hint') || 'Add extra cost if someone ordered something just for themselves (e.g. extra dish). Leave blank if none.'}</p>
        <div className="space-y-2 bg-amber-50 p-3 rounded-md border border-amber-200">
          {memberIds.map(uid => (
            <div key={uid} className="flex items-center gap-2">
              <span className="flex-1 text-sm truncate">{displayName(uid, currentUserId, memberProfiles, t('me'))}</span>
              <span className="text-xs text-gray-500">+฿</span>
              <Input type="number" step="0.01" min="0" className="w-24 h-8" placeholder="0"
                value={data.extras?.[uid] || ''}
                onChange={e => setState((p: any) => ({ ...p, extras: { ...(p.extras || {}), [uid]: e.target.value } }))} />
            </div>
          ))}
        </div>
        
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
                    <span className="text-gray-600">{displayName(uid, currentUserId, memberProfiles, t('you'))}</span>
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
        <Button type="submit" disabled={loading}>{loading ? t('loading') : submitLabel}</Button>
      </div>
    </form>
  );
}
