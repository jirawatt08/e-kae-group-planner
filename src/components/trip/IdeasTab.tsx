import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTripData } from '../../contexts/TripDataContext';
import { handleFirestoreError, OperationType } from '../../lib/firestoreError';
import { logActivity } from '../../lib/activityLogger';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Lightbulb, ThumbsUp, Trash2, ExternalLink } from 'lucide-react';

export function IdeasTab({ tripId, canEdit }: { tripId: string, canEdit: boolean }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { ideas: rawIdeas } = useTripData();
  
  // Sort by votes length client-side
  const ideas = [...rawIdeas].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0));

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<any>(null);
  const [newIdea, setNewIdea] = useState({
    title: '',
    description: '',
    link: ''
  });

  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, `trips/${tripId}/ideas`), {
        tripId,
        title: newIdea.title,
        description: newIdea.description,
        link: newIdea.link,
        votes: [],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });
      await logActivity(tripId, 'Shared an idea', newIdea.title);
      setIsCreateOpen(false);
      setNewIdea({ title: '', description: '', link: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `trips/${tripId}/ideas`);
    }
  };

  const handleUpdateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingIdea) return;

    try {
      await updateDoc(doc(db, `trips/${tripId}/ideas`, editingIdea.id), {
        title: editingIdea.title,
        description: editingIdea.description,
        link: editingIdea.link,
        updatedAt: serverTimestamp()
      });
      await logActivity(tripId, 'Updated an idea', editingIdea.title);
      setIsEditOpen(false);
      setEditingIdea(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}/ideas/${editingIdea.id}`);
    }
  };

  const openEditDialog = (idea: any) => {
    setEditingIdea({ ...idea });
    setIsEditOpen(true);
  };

  const toggleVote = async (ideaId: string, currentVotes: string[]) => {
    if (!user) return;
    const hasVoted = currentVotes.includes(user.uid);
    
    try {
      await updateDoc(doc(db, `trips/${tripId}/ideas`, ideaId), {
        votes: hasVoted ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}/ideas/${ideaId}`);
    }
  };

  const handleDelete = async (ideaId: string, createdBy: string) => {
    // Can delete if editor/owner OR if they created it
    if (!canEdit && createdBy !== user?.uid) return;
    
    const ideaToDelete = ideas.find(i => i.id === ideaId);
    try {
      await deleteDoc(doc(db, `trips/${tripId}/ideas`, ideaId));
      if (ideaToDelete) {
        await logActivity(tripId, 'Deleted an idea', ideaToDelete.title);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trips/${tripId}/ideas/${ideaId}`);
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
            <form onSubmit={handleCreateIdea} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t('idea')}</Label>
                <Input id="title" value={newIdea.title} onChange={e => setNewIdea({...newIdea, title: e.target.value})} placeholder={t('idea')} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link">{t('link_optional')}</Label>
                <Input id="link" type="url" value={newIdea.link} onChange={e => setNewIdea({...newIdea, link: e.target.value})} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t('why_should_we')}</Label>
                <Input id="description" value={newIdea.description} onChange={e => setNewIdea({...newIdea, description: e.target.value})} />
              </div>
              <div className="flex justify-end">
                <Button type="submit">{t('share_idea')}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('edit_idea') || 'Edit Idea'}</DialogTitle>
          </DialogHeader>
          {editingIdea && (
            <form onSubmit={handleUpdateIdea} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">{t('idea')}</Label>
                <Input id="edit-title" value={editingIdea.title} onChange={e => setEditingIdea({...editingIdea, title: e.target.value})} placeholder={t('idea')} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-link">{t('link_optional')}</Label>
                <Input id="edit-link" type="url" value={editingIdea.link} onChange={e => setEditingIdea({...editingIdea, link: e.target.value})} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">{t('why_should_we')}</Label>
                <Input id="edit-description" value={editingIdea.description} onChange={e => setEditingIdea({...editingIdea, description: e.target.value})} />
              </div>
              <div className="flex justify-end">
                <Button type="submit">{t('update_event') || 'Update Idea'}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-y-auto">
        {ideas.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {t('no_ideas')}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ideas.map((idea) => {
              const hasVoted = idea.votes?.includes(user?.uid);
              const canDelete = canEdit || idea.createdBy === user?.uid;
              
              return (
                <div key={idea.id} className="bg-white border rounded-lg p-4 shadow-sm flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center flex-1 cursor-pointer" onClick={() => (canEdit || idea.createdBy === user?.uid) && openEditDialog(idea)}>
                      <Lightbulb className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0" />
                      <h3 className="font-semibold text-gray-900 line-clamp-2">{idea.title}</h3>
                    </div>
                    {canDelete && (
                      <div className="flex space-x-1 -mr-2 -mt-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-primary" onClick={() => openEditDialog(idea)}>
                          <Plus className="h-3 w-3 rotate-45" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-500" onClick={() => handleDelete(idea.id, idea.createdBy)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {idea.description && (
                    <p className="text-sm text-gray-600 mb-3 flex-1 line-clamp-3">{idea.description}</p>
                  )}
                  
                  {idea.link && (
                    <a href={idea.link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center mb-3">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {t('view_link')}
                    </a>
                  )}
                  
                  <div className="mt-auto pt-3 border-t flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {idea.votes?.length || 0} {t('votes')}
                    </span>
                    <Button 
                      variant={hasVoted ? "default" : "outline"} 
                      size="sm" 
                      className="h-8"
                      onClick={() => toggleVote(idea.id, idea.votes || [])}
                    >
                      <ThumbsUp className={`h-3 w-3 mr-1 ${hasVoted ? 'fill-current' : ''}`} />
                      {hasVoted ? t('voted') : t('vote')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
