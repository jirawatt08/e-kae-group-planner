import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

/** A single action item in the FAB menu */
export interface FloatingAction {
  /** Unique key for React */
  id: string;
  /** Accessible label */
  label: string;
  /** Icon component to render */
  icon: React.ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Optional accent color (CSS value) */
  color?: string;
}

interface FloatingActionsProps {
  /** List of actions to display. If only 1 action, renders a single button (no expand). */
  actions: FloatingAction[];
  /** Whether the FAB is visible at all */
  visible?: boolean;
}

/**
 * A Floating Action Button (FAB) pinned to the bottom-right corner.
 *
 * - **1 action** → renders a single round button directly (no expand menu)
 * - **2+ actions** → renders an expandable menu triggered by a `+` button
 *
 * Designed to be reusable across any tab, not just Timeline.
 */
export function FloatingActions({ actions, visible = true }: FloatingActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!visible || actions.length === 0) return null;

  // Single action: render directly, no menu
  if (actions.length === 1) {
    const action = actions[0];
    return (
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-30">
        <button
          type="button"
          onClick={action.onClick}
          className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary text-primary-foreground shadow-lg
                     flex items-center justify-center
                     transition-all hover:scale-105 hover:shadow-xl active:scale-95
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={action.color ? { backgroundColor: action.color } : {}}
          aria-label={action.label}
        >
          {action.icon}
        </button>
      </div>
    );
  }

  // Multiple actions: expandable menu
  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-30 flex flex-col-reverse items-end gap-3">
      {/* Main toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary text-primary-foreground shadow-lg
                   flex items-center justify-center
                   transition-all hover:scale-105 hover:shadow-xl active:scale-95
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={isOpen ? 'Close actions' : 'Open actions'}
        aria-expanded={isOpen}
      >
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>
          {isOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Plus className="h-5 w-5 sm:h-6 sm:w-6" />}
        </div>
      </button>

      {/* Action items — appear above the main button */}
      {isOpen && (
        <div className="flex flex-col-reverse items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-card border border-border shadow-md
                         text-sm font-medium text-foreground
                         transition-all hover:shadow-lg hover:bg-muted/50 active:scale-95
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={action.label}
            >
              <span
                className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                style={action.color ? { backgroundColor: action.color, color: 'white' } : {}}
              >
                {action.icon}
              </span>
              <span className="whitespace-nowrap">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Backdrop to close on outside click */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
