import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Settings, Clock, Landmark, Check } from 'lucide-react';
import { useTripData } from '../../contexts/TripDataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CURRENCIES, CURRENCY_CODES } from '../../lib/currencyConfig';
import { toast } from 'sonner';

export function TripSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { tripSettings, updateTripSettings } = useTripData();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  
  const [settings, setSettings] = useState(tripSettings);

  // Sync settings when tripSettings changes (e.g. from another member) 
  // or when dialog opens to ensure fresh data
  React.useEffect(() => {
    if (open) {
      setSettings(tripSettings);
    }
  }, [open, tripSettings]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateTripSettings(settings);
      toast.success(t('settings_updated') || 'Trip settings updated');
      onOpenChange(false);
    } catch (err) {
      toast.error(t('update_failed') || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('trip_settings') || 'Trip Settings'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Time Format */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Clock className="h-3 w-3" />
              {t('time_format') || 'Time Format'}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={settings.timeFormat === '12h' ? 'default' : 'outline'}
                className="h-12 flex flex-col gap-0.5"
                onClick={() => setSettings(s => ({ ...s, timeFormat: '12h' }))}
              >
                <span className="text-sm">12-Hour</span>
                <span className="text-[10px] opacity-60">1:30 PM</span>
              </Button>
              <Button
                variant={settings.timeFormat === '24h' ? 'default' : 'outline'}
                className="h-12 flex flex-col gap-0.5"
                onClick={() => setSettings(s => ({ ...s, timeFormat: '24h' }))}
              >
                <span className="text-sm">24-Hour</span>
                <span className="text-[10px] opacity-60">13:30</span>
              </Button>
            </div>
          </div>

          {/* Currency */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Landmark className="h-3 w-3" />
              {t('primary_currency') || 'Primary Currency'}
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto p-1 pr-2 no-scrollbar">
              {CURRENCY_CODES.map((code) => {
                const config = CURRENCIES[code];
                const isSelected = settings.currency === code;
                return (
                  <Button
                    key={code}
                    variant={isSelected ? 'default' : 'outline'}
                    className="h-10 justify-start px-2 gap-2 relative"
                    onClick={() => setSettings(s => ({ ...s, currency: code }))}
                  >
                    <span className="text-lg leading-none">{config.flag}</span>
                    <span className="text-xs font-bold">{code}</span>
                    {isSelected && <Check className="h-3 w-3 absolute right-2" />}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('save_settings') || 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Loader2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
