import React, { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';

interface ScrollAwareToolbarProps {
  /** Ref to the "sentinel" element — toolbar appears when this leaves the viewport */
  sentinelRef: React.RefObject<HTMLElement | null>;
  /** Whether the user can edit (controls + button visibility) */
  canEdit: boolean;
  /** Current view mode */
  viewMode: 'full' | 'day';
  /** Callback to change view mode */
  onViewModeChange: (mode: 'full' | 'day') => void;
  /** Callback to open create event dialog */
  onAddEvent: () => void;
  /** Labels */
  labels: {
    fullPlan: string;
    dayView: string;
    addEvent: string;
  };
}

/**
 * A compact toolbar that slides in at the top of the viewport
 * when the original toolbar scrolls out of view.
 *
 * Uses IntersectionObserver for performance (no scroll listeners).
 */
export function ScrollAwareToolbar({
  sentinelRef,
  canEdit,
  viewMode,
  onViewModeChange,
  onAddEvent,
  labels,
}: ScrollAwareToolbarProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show mini-toolbar when the sentinel is NOT intersecting (scrolled away)
        setIsVisible(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelRef]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-30 bg-background/90 backdrop-blur-md border-b border-border
                 px-3 sm:px-6 py-2
                 flex items-center justify-between gap-2
                 animate-in slide-in-from-top-2 fade-in duration-200"
    >
      {/* View mode toggle */}
      <div className="flex bg-muted p-0.5 rounded-md">
        <button
          className={`px-2.5 py-1 text-xs rounded transition-all ${
            viewMode === 'full'
              ? 'bg-card text-foreground shadow-sm font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => onViewModeChange('full')}
        >
          {labels.fullPlan}
        </button>
        <button
          className={`px-2.5 py-1 text-xs rounded transition-all ${
            viewMode === 'day'
              ? 'bg-card text-foreground shadow-sm font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => onViewModeChange('day')}
        >
          {labels.dayView}
        </button>
      </div>

      {/* Quick add */}
      {canEdit && (
        <button
          type="button"
          onClick={onAddEvent}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                     bg-primary text-primary-foreground
                     transition-all hover:bg-primary/90 active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{labels.addEvent}</span>
        </button>
      )}
    </div>
  );
}
