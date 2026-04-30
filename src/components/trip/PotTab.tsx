import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTripData } from '../../contexts/TripDataContext';
import { potService } from '../../services/potService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, Plus, Minus, ArrowUpRight, ArrowDownRight, User, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { PotTransaction } from '../../types';
import { Skeleton } from '@/components/ui/skeleton';
import { useFormatters } from '../../hooks/useFormatters';
import { CurrencyConverter } from './CurrencyConverter';

export function PotTab({ tripId, canEdit }: { tripId: string; canEdit: boolean }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { potTransactions, timeline, trip, memberProfiles, loading: dataLoading } = useTripData();
  const [loading, setLoading] = useState(false);
  const { formatCurrency } = useFormatters();
  
  const [isContributionOpen, setIsContributionOpen] = useState(false);
  const [isSpendingOpen, setIsSpendingOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: '',
    description: ''
  });

  const { totalIn, totalOut, balance, totalGoal, savingsProgress, totalEstimatedCost } = React.useMemo(() => {
    const inT = potTransactions.filter(t => t.type === 'contribution');
    const outT = potTransactions.filter(t => t.type === 'spending');
    const tin = inT.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const tout = outT.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const bal = tin - tout;

    const estimated = timeline
      .filter((event: any) => event.category === 'booking' && event.estimatedCost)
      .reduce((sum: number, event: any) => sum + (event.estimatedCost || 0), 0);
    
    const tripGoal = trip?.totalBudgetGoal || 0;
    const goal = tripGoal + estimated;
    const progress = goal > 0 ? Math.min(100, Math.max(0, (bal / goal) * 100)) : 0;

    return { totalIn: tin, totalOut: tout, balance: bal, totalGoal: goal, savingsProgress: progress, totalEstimatedCost: estimated };
  }, [potTransactions, timeline, trip]);

  const handleSubmit = async (type: 'contribution' | 'spending') => {
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      await potService.addTransaction(tripId, type, amountNum, formData.description);
      toast.success(t('join_success'));
      setIsContributionOpen(false);
      setIsSpendingOpen(false);
      setFormData({ amount: '', description: '' });
    } catch (error) {
      toast.error('Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {dataLoading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : (
        <>
          {totalGoal > 0 && (
            <Card className="bg-card text-card-foreground border border-border shadow-sm">
              <CardContent className="pt-4 pb-4 px-5 sm:px-8">
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('savings_goal') || 'Savings Goal'}</span>
                   <span className="text-xs sm:text-sm font-bold text-foreground">{formatCurrency(balance)} / {formatCurrency(totalGoal)}</span>
                 </div>
                 <div className="w-full bg-muted/50 rounded-full h-2.5 overflow-hidden">
                   <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${savingsProgress}%` }}></div>
                 </div>
                 {totalEstimatedCost > 0 && (
                   <p className="text-[10px] text-muted-foreground mt-2 italic opacity-80">
                     * Includes {formatCurrency(totalEstimatedCost)} from booking milestones.
                   </p>
                 )}
              </CardContent>
            </Card>
          )}

        <Card className="bg-card text-card-foreground border-2 border-primary/10 shadow-sm overflow-hidden bg-linear-to-br from-card to-muted/20">
          <CardContent className="pt-6 sm:pt-8 pb-6 sm:pb-8 px-5 sm:px-8">
            <div className="flex justify-between items-center mb-6">
              <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('pot_balance')}</span>
            </div>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">{formatCurrency(balance)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
              <div className="space-y-1">
                <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold tracking-tighter opacity-80">{t('contributions')}</div>
                <div className="text-base sm:text-lg font-bold flex items-center gap-1 text-success">
                  <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  {formatCurrency(totalIn)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold tracking-tighter opacity-80">{t('spending')}</div>
                <div className="text-base sm:text-lg font-bold flex items-center gap-1 text-destructive">
                  <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  {formatCurrency(totalOut)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </>
      )}

      {/* Action Buttons */}
      {canEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Dialog open={isContributionOpen} onOpenChange={setIsContributionOpen}>
            <DialogTrigger render={<Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-2 h-12 text-sm font-bold" />}>
              <Plus className="h-4 w-4" />
              {t('add_contribution')}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t('add_contribution')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t('contribution_amount')}</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={formData.amount} 
                    onChange={e => setFormData({ ...formData, amount: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('notes')}</Label>
                  <Input 
                    placeholder="e.g. Initial contribution" 
                    value={formData.description} 
                    onChange={e => setFormData({ ...formData, description: e.target.value })} 
                  />
                </div>
                <Button className="w-full h-12" onClick={() => handleSubmit('contribution')} disabled={loading}>
                  {t('save_event')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isSpendingOpen} onOpenChange={setIsSpendingOpen}>
            <DialogTrigger render={<Button variant="outline" className="gap-2 h-12 border-destructive/20 text-destructive hover:bg-destructive/10" />}>
              <Minus className="h-4 w-4" />
              {t('add_spending')}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('add_spending')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t('spending_amount')}</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={formData.amount} 
                    onChange={e => setFormData({ ...formData, amount: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('spending_title')}</Label>
                  <Input 
                    placeholder="e.g. Taxi home" 
                    value={formData.description} 
                    onChange={e => setFormData({ ...formData, description: e.target.value })} 
                  />
                </div>
                <Button variant="destructive" className="w-full h-12" onClick={() => handleSubmit('spending')} disabled={loading}>
                  {t('save_event')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-6 pb-6">
        {dataLoading ? (
          <div className="space-y-6">
            {[1, 2].map(section => (
              <div key={section} className="space-y-4">
                <Skeleton className="h-4 w-1/4 rounded" />
                <div className="space-y-2">
                  {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Contributions List */}
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-success" />
                {t('contributions')}
              </h3>
              <div className="space-y-2">
                {potTransactions.filter(t => t.type === 'contribution').length === 0 && <p className="text-sm text-muted-foreground italic text-center py-4">{t('no_contributions')}</p>}
                {potTransactions.filter(t => t.type === 'contribution').map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl shadow-sm hover:border-success/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-success" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-foreground truncate">{item.userName}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{item.description}</div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-success shrink-0 ml-2">+{formatCurrency(item.amount)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spending List */}
            <div>
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-destructive" />
                {t('spending')}
              </h3>
              <div className="space-y-2">
                {potTransactions.filter(t => t.type === 'spending').length === 0 && <p className="text-sm text-muted-foreground italic text-center py-4">{t('no_spending')}</p>}
                {potTransactions.filter(t => t.type === 'spending').map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl shadow-sm hover:border-destructive/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                        <Coins className="h-4 w-4 text-destructive" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-foreground truncate">{item.description}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{item.userName}</div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-destructive shrink-0 ml-2">-{formatCurrency(item.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-8 pt-8 border-t border-border/50">
        <CurrencyConverter />
      </div>
    </div>
  );
}
