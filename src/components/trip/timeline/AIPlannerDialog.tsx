import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Calendar, MapPin, Loader2, CheckCircle2, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { aiService } from '../../../services/aiService';
import { toast } from 'sonner';
import { timelineService } from '../../../services/timelineService';
import { useAuth } from '../../../contexts/AuthContext';

interface AIPlannerDialogProps {
  tripId: string;
  tripName: string;
  onSuccess: () => void;
}

export function AIPlannerDialog({ tripId, tripName, onSuccess }: AIPlannerDialogProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'review'>('input');
  
  const [formData, setFormData] = useState({
    destination: tripName || '',
    days: 3,
    vibe: '',
    apiKey: localStorage.getItem('gemini_api_key') || ''
  });

  const [generatedEvents, setGeneratedEvents] = useState<any[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const handleGenerate = async () => {
    if (!formData.apiKey) {
      toast.error(t('ai_apiKey_required'));
      return;
    }

    setLoading(true);
    localStorage.setItem('gemini_api_key', formData.apiKey);

    try {
      const results = await aiService.generateItinerary(
        formData.apiKey,
        formData.destination,
        formData.days,
        formData.vibe,
        language as 'en' | 'th'
      );
      setGeneratedEvents(results);
      setSelectedIndices(new Set(results.map((_: any, i: number) => i))); // Select all by default
      setStep('review');
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : t('update_failed');
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (idx: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedIndices(newSelected);
  };

  const toggleAll = () => {
    if (selectedIndices.size === generatedEvents.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(generatedEvents.map((_, i) => i)));
    }
  };

  const handleApply = async () => {
    if (!user) return;
    if (selectedIndices.size === 0) {
      toast.error("Please select at least one plan to add.");
      return;
    }

    setLoading(true);
    try {
      const selectedEvents = generatedEvents.filter((_, i) => selectedIndices.has(i));
      
      for (const event of selectedEvents) {
        await timelineService.createEvent(tripId, user.uid, {
          title: event.title,
          description: event.description || '',
          startTime: event.startTime,
          location: event.location || '',
          mapLink: '',
          checklist: (event.checklist || []).map((text: string) => ({
            id: crypto.randomUUID(),
            text,
            checked: false
          }))
        });
      }
      toast.success(t('join_success'));
      setIsOpen(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : t('update_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2 border-primary/20 hover:border-primary/50 text-indigo-600 shadow-sm" />}>
        <Sparkles className="h-4 w-4" />
        {t('magic_ai_plan')}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Sparkles className="h-5 w-5 text-indigo-600" />
            </div>
            <DialogTitle className="text-xl">{t('ai_planner_title')}</DialogTitle>
          </div>
          <DialogDescription>
            {t('ai_planner_desc')}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="flex items-center gap-2">
                {t('ai_apiKey_required')}
                <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 hover:underline">
                  (Get one here)
                </a>
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={t('ai_apiKey_placeholder')}
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dest">{t('ai_destination')}</Label>
                <Input
                  id="dest"
                  placeholder="e.g. Tokyo, Japan"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="days">{t('ai_days')}</Label>
                <Input
                  id="days"
                  type="number"
                  min={1}
                  max={7}
                  value={formData.days}
                  onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vibe">{t('ai_vibe')}</Label>
              <Input
                id="vibe"
                placeholder="e.g. Food tour, slow travel, instagrammable spots"
                value={formData.vibe}
                onChange={(e) => setFormData({ ...formData, vibe: e.target.value })}
              />
            </div>

            <div className="pt-4">
              <Button 
                className="w-full gap-2 py-6 text-lg font-bold shadow-lg" 
                onClick={handleGenerate}
                disabled={loading || !formData.apiKey || !formData.destination}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                {loading ? t('ai_generating') : t('ai_generate')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4 flex justify-between items-center">
              <div>
                <h4 className="font-semibold text-indigo-700 flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('ai_review')}
                </h4>
                <p className="text-[10px] text-indigo-600">
                  {selectedIndices.size} / {generatedEvents.length} {t('selected') || 'selected'}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={toggleAll} className="text-[10px] h-8 text-indigo-700 hover:bg-indigo-100">
                {selectedIndices.size === generatedEvents.length ? <Square className="h-3 w-3 mr-1" /> : <CheckSquare className="h-3 w-3 mr-1" />}
                {selectedIndices.size === generatedEvents.length ? 'Unselect All' : 'Select All'}
              </Button>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
              {generatedEvents.map((event, idx) => {
                const isSelected = selectedIndices.has(idx);
                return (
                  <div 
                    key={idx} 
                    className={`flex items-start gap-3 border rounded-lg p-3 text-sm transition-all cursor-pointer ${
                      isSelected ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white opacity-60 border-gray-100'
                    }`}
                    onClick={() => toggleSelect(idx)}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(idx)} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h5 className="font-bold text-gray-900">{event.title}</h5>
                        <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-mono">
                          {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">{event.description}</p>
                      {event.checklist && event.checklist.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {event.checklist.slice(0, 2).map((item: string, i: number) => (
                            <span key={i} className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-100">
                              {item}
                            </span>
                          ))}
                          {event.checklist.length > 2 && <span className="text-[9px] text-gray-400">+{event.checklist.length - 2} more</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setStep('input')} disabled={loading}>
                {t('go_back') || 'Back'}
              </Button>
              <Button 
                className={`flex-[2] gap-2 ${selectedIndices.size === 0 ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`} 
                onClick={handleApply} 
                disabled={loading || selectedIndices.size === 0}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {t('ai_apply')} ({selectedIndices.size})
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
