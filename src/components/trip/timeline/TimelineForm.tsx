import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '../../../contexts/LanguageContext';

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

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-4">
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
      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>{loading ? t('loading') : submitLabel}</Button>
      </div>
    </form>
  );
}
