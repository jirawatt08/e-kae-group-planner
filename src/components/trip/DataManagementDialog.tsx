import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { dataService } from '../../services/dataService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Download, Upload, Loader2, Database, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface DataManagementDialogProps {
  tripId: string;
  tripName: string;
}

export function DataManagementDialog({ tripId, tripName }: DataManagementDialogProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const bundle = await dataService.exportTripData(tripId);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ekae_${tripName.replace(/\s+/g, '_')}_backup.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setLoading(true);
        const newTripId = await dataService.importTripData(user.uid, json);
        toast.success(t('import_success'));
        navigate(`/trip/${newTripId}`);
      } catch (error) {
        console.error(error);
        toast.error('Invalid backup file');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
        <Database className="h-4 w-4" />
        {t('data_mgmt')}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-info/10 p-2 rounded-lg text-info">
              <Database className="h-5 w-5" />
            </div>
            <DialogTitle>{t('data_mgmt')}</DialogTitle>
          </div>
          <DialogDescription>
            Export your plan to share with others or import a plan from a file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* Export Section */}
          <div className="p-4 border rounded-xl bg-muted/20 hover:bg-muted/50 transition-colors">
            <h4 className="font-bold flex items-center gap-2 mb-2">
              <Download className="h-4 w-4 text-info" />
              {t('export_json')}
            </h4>
            <p className="text-xs text-muted-foreground mb-4">{t('export_desc')}</p>
            <Button className="w-full gap-2" onClick={handleExport} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t('export_json')}
            </Button>
          </div>

          {/* Import Section */}
          <div className="p-4 border rounded-xl bg-muted/20 hover:bg-muted/50 transition-colors">
            <h4 className="font-bold flex items-center gap-2 mb-2">
              <Upload className="h-4 w-4 text-warning" />
              {t('import_json')}
            </h4>
            <p className="text-xs text-muted-foreground mb-4">{t('import_desc')}</p>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                disabled={loading}
              />
              <Button variant="outline" className="w-full gap-2 border-warning/30 text-warning pointer-events-none">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {t('import_json')}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-info/5 rounded-lg text-[10px] text-info">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Note: Exporting data will not include member emails or private account information. Relationships are preserved via display names.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
