import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTripData } from '../../contexts/TripDataContext';
import { useIdeas } from '../../hooks/useIdeas';
import { Idea } from '../../types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { IdeaForm } from './ideas/IdeaForm';
import { IdeaItem } from './ideas/IdeaItem';
import { Skeleton } from '@/components/ui/skeleton';

export function IdeasTab({ tripId, canEdit }: { tripId: string, canEdit: boolean }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { ideas: rawIdeas, loading: dataLoading } = useTripData();
  
  // Sort by votes length client-side
  const ideas = [...rawIdeas].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0));

  const { createIdea, updateIdea, deleteIdea, toggleVote, loading } = useIdeas(tripId, canEdit);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [newIdea, setNewIdea] = useState({
    title: '',
    description: '',
    link: ''
  });

  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const success = await createIdea(newIdea);
    if (success) {
      setIsCreateOpen(false);
      setNewIdea({ title: '', description: '', link: '' });
    }
  };

  const handleUpdateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingIdea) return;

    const success = await updateIdea(editingIdea.id, {
      title: editingIdea.title,
      description: editingIdea.description,
      link: editingIdea.link,
    });
    if (success) {
      setIsEditOpen(false);
      setEditingIdea(null);
    }
  };

  const openEditDialog = (idea: any) => {
    setEditingIdea({ ...idea } as Idea);
    setIsEditOpen(true);
  };

  const handleToggleVote = async (ideaId: string, currentVotes: string[]) => {
    await toggleVote(ideaId, currentVotes);
  };

  const handleDelete = async (ideaId: string, createdBy: string) => {
    // Can delete if editor/owner OR if they created it
    if (!canEdit && createdBy !== user?.uid) return;
    
    const ideaToDelete = (ideas as Idea[]).find(i => i.id === ideaId);
    if (ideaToDelete) {
      await deleteIdea(ideaToDelete);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">{t('brainstorming')}</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4 mr-2" />
            {t('add_idea')}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('share_idea')}</DialogTitle>
            </DialogHeader>
            <IdeaForm
              data={newIdea}
              setState={setNewIdea}
              onSubmit={handleCreateIdea}
              submitLabel={t('share_idea')}
              loading={loading}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('edit_idea') || 'Edit Idea'}</DialogTitle>
          </DialogHeader>
          {editingIdea && (
            <IdeaForm
              data={editingIdea}
              setState={setEditingIdea}
              onSubmit={handleUpdateIdea}
              submitLabel={t('update_event') || 'Update Idea'}
              loading={loading}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-y-auto">
        {dataLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : ideas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
            {t('no_ideas')}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ideas.map((idea) => (
                <IdeaItem
                  key={idea.id}
                  idea={idea as Idea}
                  canEdit={canEdit}
                  currentUserId={user?.uid}
                  onEdit={openEditDialog}
                  onDelete={handleDelete}
                  onToggleVote={handleToggleVote}
                />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
