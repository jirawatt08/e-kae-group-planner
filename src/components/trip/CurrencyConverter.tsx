import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFormatters } from '../../hooks/useFormatters';
import { useLanguage } from '../../contexts/LanguageContext';
import { exchangeRateService } from '../../services/exchangeRateService';
import { CURRENCIES, CURRENCY_CODES } from '../../lib/currencyConfig';
import { CurrencyCode } from '../../types';
import { ArrowRightLeft, RefreshCw, Calculator } from 'lucide-react';

export function CurrencyConverter() {
  const { t } = useLanguage();
  const { currency: tripCurrency, formatCurrency } = useFormatters();
  
  const [amount, setAmount] = useState<string>('100');
  const [targetCurrency, setTargetCurrency] = useState<CurrencyCode>('USD');
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRates = async () => {
      setLoading(true);
      const data = await exchangeRateService.getLatestRates(tripCurrency as CurrencyCode);
      setRates(data);
      setLoading(false);
    };
    fetchRates();
  }, [tripCurrency]);

  const convertedAmount = exchangeRateService.convert(Number(amount) || 0, rates, targetCurrency);
  
  const formatTarget = (val: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: targetCurrency,
      maximumFractionDigits: ['JPY', 'KRW', 'VND'].includes(targetCurrency) ? 0 : 2
    }).format(val);
  };

  return (
    <Card className="border-border/40 bg-muted/20 shadow-none overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 bg-muted/40">
        <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
          <Calculator className="h-3 w-3" />
          {t('currency_converter') || 'Currency Converter'}
        </CardTitle>
        {loading && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-1.5">
            <Label className="text-[10px] uppercase font-bold opacity-60 pl-1">{tripCurrency}</Label>
            <Input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 font-bold"
            />
          </div>
          
          <ArrowRightLeft className="h-4 w-4 text-muted-foreground mt-4 shrink-0" />
          
          <div className="flex-1 space-y-1.5">
            <Label className="text-[10px] uppercase font-bold opacity-60 pl-1">{targetCurrency}</Label>
            <select
              value={targetCurrency}
              onChange={(e) => setTargetCurrency(e.target.value as CurrencyCode)}
              className="w-full h-9 rounded-md border border-input bg-card px-2 text-sm font-bold focus:ring-1 focus:ring-primary outline-none"
            >
              {CURRENCY_CODES.map(code => (
                <option key={code} value={code}>
                  {CURRENCIES[code].flag} {code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-background/60 rounded-lg p-3 border border-border/30 text-center">
          <div className="text-2xl font-black tracking-tight text-foreground">
            {formatTarget(convertedAmount)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 font-medium italic">
            1 {tripCurrency} ≈ {(rates[targetCurrency] || 0).toFixed(4)} {targetCurrency}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
