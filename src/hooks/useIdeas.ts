import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { ideaService } from '../services/ideaService';
import { Idea } from '../types';

export function useIdeas(tripId: string, canEdit: boolean) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const createIdea = async (data: { title: string; description: string; link: string }) => {
    if (!user) return false;
    setLoading(true);
    try {
      await ideaService.createIdea(tripId, user.uid, data);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `trips/${tripId}/ideas`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateIdea = async (ideaId: string, data: { title: string; description: string; link: string }) => {
    if (!user) return false;
    setLoading(true);
    try {
      await ideaService.updateIdea(tripId, ideaId, data);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}/ideas/${ideaId}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteIdea = async (idea: Idea) => {
    if (!canEdit && idea.createdBy !== user?.uid) return;
    try {
      await ideaService.deleteIdea(tripId, idea.id, idea.title);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trips/${tripId}/ideas/${idea.id}`);
    }
  };

  const toggleVote = async (ideaId: string, currentVotes: string[]) => {
    if (!user) return;
    const hasVoted = currentVotes.includes(user.uid);
    try {
      await ideaService.toggleVote(tripId, ideaId, user.uid, hasVoted);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}/ideas/${ideaId}`);
    }
  };

  return {
    createIdea,
    updateIdea,
    deleteIdea,
    toggleVote,
    loading
  };
}
