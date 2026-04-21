import React from 'react';
import { Button } from '@/components/ui/button';
import { Idea } from '../../../types';
import { Lightbulb, Plus, Trash2, ExternalLink, ThumbsUp } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useTripData } from '../../../contexts/TripDataContext';
import { resolveDisplayName, getUserColorStyles } from '../../../lib/userUtils';

interface IdeaItemProps {
  key?: React.Key;
  idea: Idea;
  canEdit: boolean;
  currentUserId?: string;
  onEdit: (idea: Idea) => void;
  onDelete: (ideaId: string, createdBy: string) => void;
  onToggleVote: (ideaId: string, currentVotes: string[]) => void;
}

export function IdeaItem({
  idea,
  canEdit,
  currentUserId,
  onEdit,
  onDelete,
  onToggleVote
}: IdeaItemProps) {
  const { user } = useAuth();
  const { memberProfiles } = useTripData();
  const { t } = useLanguage();
  const hasVoted = idea.votes?.includes(currentUserId || '');
  const canDelete = canEdit || idea.createdBy === currentUserId;
  const userStyles = getUserColorStyles(idea.createdBy);
  const createdBy = resolveDisplayName(idea.createdBy, user?.uid, memberProfiles, t('you'));

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col h-full transition-colors group hover:shadow-md">
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col flex-1 cursor-pointer" onClick={() => (canEdit || idea.createdBy === currentUserId) && onEdit(idea)}>
          <div className="flex items-center">
            <Lightbulb className="h-4 w-4 text-warning mr-2 flex-shrink-0" />
            <h3 className="font-semibold text-foreground line-clamp-2">{idea.title}</h3>
          </div>
          <span 
            className="text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded border transition-colors self-start"
            style={userStyles.badge}
          >
            {t('by') || 'by'} {createdBy}
          </span>
        </div>
        {canDelete && (
          <div className="flex space-x-1 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEdit(idea)}>
              <Plus className="h-3 w-3 rotate-45" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(idea.id, idea.createdBy)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      
      {idea.description && (
        <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-3 leading-relaxed italic opacity-80">{idea.description}</p>
      )}
      
      {idea.link && (
        <a href={idea.link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center mb-3">
          <ExternalLink className="h-3 w-3 mr-1" />
          {t('view_link')}
        </a>
      )}
      
      <div className="mt-auto pt-3 border-t border-border flex justify-between items-center">
        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
          {idea.votes?.length || 0} {t('votes')}
        </span>
        <Button 
          variant={hasVoted ? "default" : "outline"} 
          size="sm" 
          className="h-8"
          onClick={() => onToggleVote(idea.id, idea.votes || [])}
        >
          <ThumbsUp className={`h-3 w-3 mr-1 ${hasVoted ? 'fill-current' : ''}`} />
          {hasVoted ? t('voted') : t('vote')}
        </Button>
      </div>
    </div>
  );
}
