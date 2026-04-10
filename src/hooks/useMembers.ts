import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { tripService } from '../services/tripService';
import { Role } from '../types';

export function useMembers(tripId: string, isOwner: boolean) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const updateRole = async (targetUid: string, newRole: Role) => {
    if (!isOwner || !user) return false;
    if (targetUid === user.uid) return false; // Handled by UI toast

    setLoading(true);
    try {
      await tripService.updateMemberRole(tripId, targetUid, newRole);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (targetUid: string, currentRole: string) => {
    if (!isOwner || !user) return false;
    if (targetUid === user.uid || currentRole === 'owner') return false; // Handled by UI toast

    setLoading(true);
    try {
      await tripService.removeMember(tripId, targetUid);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${tripId}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateRole,
    removeMember,
    loading
  };
}
