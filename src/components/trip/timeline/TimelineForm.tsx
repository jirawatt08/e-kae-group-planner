import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimezoneSelector } from './TimezoneSelector';

interface TimelineFormProps {
  data: any;
  setState: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  loading: boolean;
}

export function TimelineForm({
  data,
  setState,
  onSubmit,
  submitLabel,
  loading
}: TimelineFormProps) {
  const { t } = useLanguage();
  const checklist = data.checklist || [];

  const addChecklistItem = () => {
    setState((p: any) => ({
      ...p,
      checklist: [...(p.checklist || []), { id: crypto.randomUUID(), text: '', checked: false }]
    }));
  };

  const updateChecklistItem = (id: string, text: string) => {
    setState((p: any) => ({
      ...p,
      checklist: (p.checklist || []).map((item: any) =>
        item.id === id ? { ...item, text } : item
      )
    }));
  };

  const removeChecklistItem = (id: string) => {
    setState((p: any) => ({
      ...p,
      checklist: (p.checklist || []).filter((item: any) => item.id !== id)
    }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
      <div className="space-y-2">
        <Label htmlFor="title">{t('event_title')}</Label>
        <Input 
          id="title" 
          value={data.title} 
          onChange={e => setState((p: any) => ({...p, title: e.target.value}))} 
          required 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">{t('time')}</Label>
          <Input 
            id="startTime" 
            type="datetime-local" 
            value={data.startTime} 
            onChange={e => setState((p: any) => ({...p, startTime: e.target.value}))} 
            required 
            className="h-10 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">{t('timezone') || 'Timezone'}</Label>
          <TimezoneSelector 
            value={data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
            onChange={(tz) => setState((p: any) => ({...p, timezone: tz}))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('category') || 'Category'}</Label>
        <div className="flex gap-4 p-2 bg-muted/30 rounded-md border border-border">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="category"
              value="activity" 
              checked={data.category === 'activity' || !data.category} 
              onChange={e => setState((p: any) => ({...p, category: e.target.value}))} 
              className="accent-primary"
            />
            <span className="text-sm font-medium">Activity</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="category"
              value="booking" 
              checked={data.category === 'booking'} 
              onChange={e => setState((p: any) => ({...p, category: e.target.value}))} 
              className="accent-primary"
            />
            <span className="text-sm font-medium">Booking / Milestone</span>
          </label>
        </div>
      </div>

      {data.category === 'booking' && (
        <div className="space-y-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
          <Label className="text-amber-700 dark:text-amber-400">Estimated Cost (฿)</Label>
          <Input 
            type="number"
            placeholder="0.00"
            value={data.estimatedCost || ''} 
            onChange={e => setState((p: any) => ({...p, estimatedCost: parseFloat(e.target.value) || undefined}))} 
            className="border-amber-500/30 focus-visible:ring-amber-500"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="location">{t('location')}</Label>
        <Input 
          id="location" 
          value={data.location} 
          onChange={e => setState((p: any) => ({...p, location: e.target.value}))} 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mapLink">{t('map_link')}</Label>
        <Input 
          id="mapLink" 
          type="url" 
          value={data.mapLink} 
          onChange={e => setState((p: any) => ({...p, mapLink: e.target.value}))} 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">{t('description')} ({t('optional')})</Label>
        <Input 
          id="description" 
          value={data.description} 
          onChange={e => setState((p: any) => ({...p, description: e.target.value}))} 
        />
      </div>

      {/* Checklist / Reminders */}
      <div className="space-y-2">
        <Label>{t('checklist') || 'Checklist / Reminders'}</Label>
        <p className="text-xs text-muted-foreground">{t('checklist_hint') || 'Add reminders like "Book hotel", "Reserve table", "Walk-in only"'}</p>
        <div className="space-y-2 bg-muted/50 p-3 rounded-md border border-border">
          {checklist.map((item: any) => (
            <div key={item.id} className="flex items-center gap-2">
              <Input
                className="flex-1 h-8 text-sm"
                placeholder={t('checklist_placeholder') || 'e.g. Book hotel, Reserve table...'}
                value={item.text}
                onChange={e => updateChecklistItem(item.id, e.target.value)}
              />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80" onClick={() => removeChecklistItem(item.id)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={addChecklistItem}>
            <Plus className="h-3 w-3 mr-1" />
            {t('add_checklist_item') || 'Add reminder'}
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>{loading ? t('loading') : submitLabel}</Button>
      </div>
    </form>
  );
}
