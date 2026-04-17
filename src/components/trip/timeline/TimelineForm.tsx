import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Plus, X } from 'lucide-react';

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
      <div className="space-y-2">
        <Label htmlFor="startTime">{t('time')}</Label>
        <Input 
          id="startTime" 
          type="datetime-local" 
          value={data.startTime} 
          onChange={e => setState((p: any) => ({...p, startTime: e.target.value}))} 
          required 
        />
      </div>
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
        <p className="text-xs text-gray-500">{t('checklist_hint') || 'Add reminders like "Book hotel", "Reserve table", "Walk-in only"'}</p>
        <div className="space-y-2 bg-blue-50 p-3 rounded-md border border-blue-200">
          {checklist.map((item: any) => (
            <div key={item.id} className="flex items-center gap-2">
              <Input
                className="flex-1 h-8 text-sm"
                placeholder={t('checklist_placeholder') || 'e.g. Book hotel, Reserve table...'}
                value={item.text}
                onChange={e => updateChecklistItem(item.id, e.target.value)}
              />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => removeChecklistItem(item.id)}>
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
