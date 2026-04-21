import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Plus, X, UserPlus } from 'lucide-react';

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
  const guestNames: string[] = data.guestNames || [];
  const extraDetails: any[] = data.extraDetails || [];

  // All people involved = members + guests
  const allPeople = [...memberIds, ...guestNames.map((_: string, i: number) => `guest:${i}`)];

  const getPersonName = (id: string) => {
    if (id.startsWith('guest:')) {
      const idx = parseInt(id.split(':')[1]);
      return guestNames[idx] || `Guest ${idx + 1}`;
    }
    return displayName(id, currentUserId, memberProfiles, t('me'));
  };

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

  // Guest management
  const addGuest = () => {
    setState((prev: any) => ({
      ...prev,
      guestNames: [...(prev.guestNames || []), ''],
      splitAmong: [...(prev.splitAmong || []), `guest:${(prev.guestNames || []).length}`]
    }));
  };

  const updateGuest = (index: number, name: string) => {
    setState((prev: any) => {
      const names = [...(prev.guestNames || [])];
      names[index] = name;
      return { ...prev, guestNames: names };
    });
  };

  const removeGuest = (index: number) => {
    setState((prev: any) => {
      const names = [...(prev.guestNames || [])];
      names.splice(index, 1);
      const guestId = `guest:${index}`;
      const splitAmong = (prev.splitAmong || []).filter((id: string) => id !== guestId);
      const extras = { ...(prev.extras || {}) };
      delete extras[guestId];
      return { ...prev, guestNames: names, splitAmong, extras };
    });
  };

  // Extra detail management
  const addExtraDetail = () => {
    setState((prev: any) => ({
      ...prev,
      extraDetails: [...(prev.extraDetails || []), { id: crypto.randomUUID(), label: '', amount: '', forPerson: memberIds[0] || '' }]
    }));
  };

  const updateExtraDetail = (id: string, field: string, value: string) => {
    setState((prev: any) => ({
      ...prev,
      extraDetails: (prev.extraDetails || []).map((item: any) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeExtraDetail = (id: string) => {
    setState((prev: any) => ({
      ...prev,
      extraDetails: (prev.extraDetails || []).filter((item: any) => item.id !== id)
    }));
  };

  // Compute extras map from extraDetails for preview
  const computedExtras: Record<string, number> = {};
  extraDetails.forEach((detail: any) => {
    const amt = parseFloat(detail.amount) || 0;
    if (amt > 0 && detail.forPerson) {
      computedExtras[detail.forPerson] = (computedExtras[detail.forPerson] || 0) + amt;
    }
  });
  // Also merge old-style extras
  if (data.extras) {
    Object.entries(data.extras).forEach(([uid, val]: [string, any]) => {
      const v = parseFloat(val || '0') || 0;
      if (v > 0) computedExtras[uid] = (computedExtras[uid] || 0) + v;
    });
  }

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

      {/* Guest Names */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          <UserPlus className="h-4 w-4" />
          {t('guests') || 'Guests (not in trip)'}
        </Label>
        <p className="text-xs text-muted-foreground">{t('guests_hint') || 'Add people who are not trip members but need to be included in this expense.'}</p>
        <div className="space-y-2 bg-info/5 p-3 rounded-md border border-info/20">
          {guestNames.map((name: string, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                className="flex-1 h-8 text-sm"
                placeholder={t('guest_name_placeholder') || 'Guest name...'}
                value={name}
                onChange={e => updateGuest(index, e.target.value)}
              />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80" onClick={() => removeGuest(index)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={addGuest}>
            <Plus className="h-3 w-3 mr-1" />
            {t('add_guest') || 'Add Guest'}
          </Button>
        </div>
      </div>

      {/* Who paid */}
      <div className="space-y-2">
        <Label>{t('who_paid')}</Label>
        <p className="text-xs text-muted-foreground">{t('multi_payer_hint') || 'Check who paid and enter their amount'}</p>
        <div className="space-y-2 bg-muted/20 p-3 rounded-md border">
          {memberIds.map(uid => {
            const isChecked = (data.paidByUids || []).includes(uid);
            return (
              <div key={uid} className="flex items-center gap-2">
                <Checkbox checked={isChecked} onCheckedChange={(c) => togglePayer(uid, !!c)} />
                <span className="flex-1 text-sm truncate">{displayName(uid, currentUserId, memberProfiles, t('me'))}</span>
                {isChecked && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">฿</span>
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

      {/* Extra costs with details */}
      <div className="space-y-2">
        <Label>{t('extra_costs') || 'Extra / Personal Items'}</Label>
        <p className="text-xs text-muted-foreground">{t('extra_detail_hint') || 'Add specific extra costs with a label, amount, and who it\'s for.'}</p>
        <div className="space-y-2 bg-warning/5 p-3 rounded-md border border-warning/20">
          {extraDetails.map((detail: any) => (
            <div key={detail.id} className="flex items-center gap-2 flex-wrap">
              <Input
                className="flex-1 min-w-[100px] h-8 text-sm"
                placeholder={t('extra_label_placeholder') || 'e.g. Extra beer'}
                value={detail.label}
                onChange={e => updateExtraDetail(detail.id, 'label', e.target.value)}
              />
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">฿</span>
                <Input type="number" step="0.01" min="0" className="w-20 h-8 text-sm" placeholder="0"
                  value={detail.amount}
                  onChange={e => updateExtraDetail(detail.id, 'amount', e.target.value)}
                />
              </div>
              <select
                className="h-8 text-sm border rounded-md px-2 bg-card"
                value={detail.forPerson}
                onChange={e => updateExtraDetail(detail.id, 'forPerson', e.target.value)}
              >
                {allPeople.map(id => (
                  <option key={id} value={id}>{getPersonName(id)}</option>
                ))}
              </select>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80" onClick={() => removeExtraDetail(detail.id)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={addExtraDetail}>
            <Plus className="h-3 w-3 mr-1" />
            {t('add_extra_detail') || 'Add extra cost'}
          </Button>
        </div>
        
        {/* Preview */}
        {data.amount && parseFloat(data.amount) > 0 && (() => {
          const amt = parseFloat(data.amount) || 0;
          const splitMembers = (data.splitAmong || memberIds);
          const shares = calcShares(amt, splitMembers, computedExtras);
          const totalExtras = Object.values(computedExtras).reduce((s, v) => s + v, 0);
          const sharedBase = Math.max(0, amt - totalExtras);
          const perPerson = splitMembers.length > 0 ? sharedBase / splitMembers.length : 0;

          return (
            <div className="mt-3 p-3 bg-card rounded-md border text-sm">
              <p className="font-medium text-foreground mb-2">{t('preview') || '💡 Preview'}</p>
              <p className="text-xs text-muted-foreground mb-1">
                {t('shared_base') || 'Shared base'}: ฿{sharedBase.toLocaleString()} ÷ {splitMembers.length} = ฿{perPerson.toLocaleString(undefined, { maximumFractionDigits: 2 })} {t('each') || 'each'}
              </p>
              <div className="space-y-1">
                {splitMembers.map((id: string) => (
                  <div key={id} className="flex justify-between">
                    <span className="text-muted-foreground">{getPersonName(id)}</span>
                    <span className="font-medium">
                      ฿{(shares[id] || perPerson)?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      {(computedExtras[id] || 0) > 0 && <span className="text-warning text-xs ml-1">(+฿{computedExtras[id]})</span>}
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
