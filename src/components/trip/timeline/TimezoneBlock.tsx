import React from 'react';
import { MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { TimelineEvent } from '../../../types';
import { useTimezoneTheme } from './useTimezoneTheme';
import { TimelineItem } from './TimelineItem';
import { DayHeader } from './DayHeader';

interface DayGroup {
  dayKey: string;
  dayNumber: number;
  events: TimelineEvent[];
}

interface TimezoneBlockProps {
  /** Unique block identifier */
  blockId: string;
  /** IANA timezone name, e.g. "Asia/Bangkok" */
  timezone: string;
  /** All events in this timezone block */
  events: TimelineEvent[];
  /** Events grouped by day */
  days: DayGroup[];
  /** Whether the block body is collapsed */
  isCollapsed: boolean;
  /** Toggle collapsed state */
  onToggle: () => void;
  /** Trip ID for Firestore operations */
  tripId: string;
  /** Whether the current user can edit */
  canEdit: boolean;
  /** Opens the edit dialog for an event */
  onEdit: (event: TimelineEvent) => void;
  /** Deletes an event by ID */
  onDelete: (eventId: string) => void;
}

/**
 * A self-contained timezone card that renders:
 * - A sticky, collapsible header with timezone info
 * - When collapsed: compact event summary list (titles + times)
 * - When expanded: day-grouped timeline with dot-connected event cards
 */
export function TimezoneBlock({
  timezone,
  events,
  days,
  isCollapsed,
  onToggle,
  tripId,
  canEdit,
  onEdit,
  onDelete,
}: TimezoneBlockProps) {
  const { t } = useLanguage();
  const theme = useTimezoneTheme(timezone);

  return (
    <div
      className="relative rounded-xl border transition-shadow shadow-sm"
      style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
    >
      {/* ── Sticky Timezone Header ── */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left sticky top-0 z-20 rounded-t-xl bg-background/95 backdrop-blur-md
                   px-3 py-2.5 sm:px-4 sm:py-3 border-b
                   flex items-center justify-between gap-2
                   transition-colors hover:bg-muted/30 cursor-pointer"
        style={{ borderColor: theme.cardBorder }}
      >
        {/* Left: chevron + location + count */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div
            className="p-1 sm:p-1.5 rounded-md shrink-0"
            style={{ backgroundColor: `hsla(${theme.hue}, 70%, 45%, 0.1)` }}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" style={{ color: theme.accent }} />
            ) : (
              <ChevronDown className="h-4 w-4" style={{ color: theme.accent }} />
            )}
          </div>
          <MapPin className="h-4 w-4 shrink-0 hidden xs:block" style={{ color: theme.accent }} />
          <span className="font-bold text-foreground text-sm sm:text-base truncate">
            {timezone}
          </span>
          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded-full border border-border bg-background shrink-0">
            {events.length} {t('events') || 'events'}
          </span>
        </div>

        {/* Right: current time badge */}
        <div
          className="text-[10px] sm:text-xs font-mono font-bold px-2 py-1 rounded-md shrink-0"
          style={{
            backgroundColor: `hsla(${theme.hue}, 70%, 45%, 0.1)`,
            color: theme.accent,
          }}
        >
          {new Intl.DateTimeFormat(undefined, {
            timeZone: timezone,
            timeZoneName: 'short',
          }).format(new Date())}
        </div>
      </button>

      {/* ── Collapsed: compact event summary ── */}
      {isCollapsed && (
        <div className="px-2 sm:px-3 py-2 space-y-0.5">
          {events.map((event) => (
            <TimelineItem
              key={event.id}
              event={event}
              tripId={tripId}
              canEdit={canEdit}
              onEdit={onEdit}
              onDelete={onDelete}
              compact
            />
          ))}
        </div>
      )}

      {/* ── Expanded: full day-grouped timeline ── */}
      {!isCollapsed && (
        <div className="px-3 sm:px-5 pb-3 sm:pb-5 pt-2 space-y-6">
          {days.map((group) => (
            <div key={group.dayKey}>
              <DayHeader
                dayKey={group.dayKey}
                dayNumber={group.dayNumber}
                eventCount={group.events.length}
              />
              <div
                className="relative border-l-2 border-dashed ml-2 md:ml-4 space-y-4 sm:space-y-6 pb-1"
                style={{ borderColor: theme.cardBorder }}
              >
                {group.events.map((event) => (
                  <TimelineItem
                    key={event.id}
                    event={event}
                    tripId={tripId}
                    canEdit={canEdit}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isDayView={false}
                    themeColor={theme.accent}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
