import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '../../../contexts/LanguageContext';

interface IdeaFormProps {
  data: any;
  setState: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  loading: boolean;
}

export function IdeaForm({
  data,
  setState,
  onSubmit,
  submitLabel,
  loading
}: IdeaFormProps) {
  const { t } = useLanguage();

  return (
    <form onSubmit={onSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="title">{t('idea')}</Label>
        <Input 
          id="title" 
          value={data.title} 
          onChange={e => setState((p: any) => ({...p, title: e.target.value}))} 
          placeholder={t('idea')} 
          required 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="link">{t('link_optional')}</Label>
        <Input 
          id="link" 
          type="url" 
          value={data.link} 
          onChange={e => setState((p: any) => ({...p, link: e.target.value}))} 
          placeholder="https://..." 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">{t('why_should_we')}</Label>
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
