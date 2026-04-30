import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTripData } from '../../contexts/TripDataContext';
import { useTimeline } from '../../hooks/useTimeline';
import { TimelineEvent } from '../../types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { safeFormat, getDayNumber, getDayColor, getStringHue } from '../../lib/dateUtils';
import { TimelineForm } from './timeline/TimelineForm';
import { TimelineItem } from './timeline/TimelineItem';
import { TimezoneBlock } from './timeline/TimezoneBlock';
import { FloatingActions, FloatingAction } from '../ui/FloatingActions';
import { ScrollAwareToolbar } from '../ui/ScrollAwareToolbar';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ──
interface DayGroup {
  dayKey: string;
  dayNumber: number;
  events: TimelineEvent[];
}

interface TzBlock {
  id: string;
  timezone: string;
  events: TimelineEvent[];
  days: DayGroup[];
}

// ── Component ──
export function TimelineTab({ tripId, canEdit }: { tripId: string; canEdit: boolean }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { trip, timeline: events, loading: dataLoading } = useTripData();
  const { createEvent, updateEvent, deleteEvent, loading } = useTimeline(tripId, canEdit);

  // ── Dialog state ──
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);

  // ── View state ──
  const [viewMode, setViewMode] = useState<'full' | 'day'>('full');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<string, boolean>>({});

  // ── Refs ──
  const toolbarRef = useRef<HTMLDivElement>(null);

  // ── New event defaults ──
  const currentTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startTime: '',
    location: '',
    mapLink: '',
    checklist: [] as any[],
    category: 'activity' as 'activity' | 'booking' | 'milestone',
    estimatedCost: undefined as number | undefined,
    timezone: currentTZ,
  });

  // Sync timezone default from latest event
  useEffect(() => {
    if (events.length > 0) {
      const lastEvent = events[events.length - 1];
      setNewEvent((prev) => ({
        ...prev,
        timezone: lastEvent.timezone || trip?.defaultTimezone || currentTZ,
      }));
    } else if (trip?.defaultTimezone) {
      setNewEvent((prev) => ({ ...prev, timezone: trip.defaultTimezone }));
    }
  }, [events, trip?.defaultTimezone, currentTZ]);

  // ── Memoized grouping ──
  const firstEventDate = events.length > 0 ? events[0].startTime : null;

  const { timezoneBlocks, allUniqueDays } = React.useMemo(() => {
    const blocks: TzBlock[] = [];

    events.forEach((event: TimelineEvent, index) => {
      const tz = event.timezone || trip?.defaultTimezone || currentTZ;
      if (blocks.length === 0 || blocks[blocks.length - 1].timezone !== tz) {
        blocks.push({ id: `block-${index}`, timezone: tz, events: [event], days: [] });
      } else {
        blocks[blocks.length - 1].events.push(event);
      }
    });

    blocks.forEach((block) => {
      const dayKeys = Array.from(
        new Set(block.events.map((e) => safeFormat(e.startTime, 'yyyy-MM-dd', '', block.timezone)))
      );
      block.days = dayKeys.map((dayKey) => ({
        dayKey,
        dayNumber: getDayNumber(dayKey, firstEventDate),
        events: block.events.filter(
          (e) => safeFormat(e.startTime, 'yyyy-MM-dd', '', block.timezone) === dayKey
        ),
      }));
    });

    const uniqueDays = Array.from(
      new Set(
        events.map((event) => {
          const tz = event.timezone || trip?.defaultTimezone || currentTZ;
          return safeFormat(event.startTime, 'yyyy-MM-dd', '', tz);
        })
      )
    ).filter(Boolean) as string[];

    return { timezoneBlocks: blocks, allUniqueDays: uniqueDays };
  }, [events, trip?.defaultTimezone, firstEventDate, currentTZ]);

  const filteredEventsForDay = React.useMemo(
    () =>
      events.filter((event) => {
        const tz = event.timezone || trip?.defaultTimezone || currentTZ;
        return safeFormat(event.startTime, 'yyyy-MM-dd', '', tz) === selectedDay;
      }),
    [events, trip?.defaultTimezone, selectedDay, currentTZ]
  );

  // Auto-select first day
  useEffect(() => {
    if (allUniqueDays.length > 0 && !selectedDay) {
      setSelectedDay(allUniqueDays[0]);
    }
  }, [allUniqueDays, selectedDay]);

  // ── Handlers ──
  const toggleBlock = (blockId: string) => {
    setCollapsedBlocks((prev) => ({ ...prev, [blockId]: !prev[blockId] }));
  };

  /** Opens create dialog, optionally pre-filling the timezone */
  const openCreateDialog = (timezone?: string) => {
    if (timezone) {
      setNewEvent((prev) => ({ ...prev, timezone }));
    }
    setIsCreateOpen(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canEdit) return;
    const success = await createEvent(newEvent);
    if (success) {
      setIsCreateOpen(false);
      setNewEvent((prev) => ({
        ...prev,
        title: '',
        description: '',
        startTime: '',
        location: '',
        mapLink: '',
        checklist: [],
        category: 'activity' as const,
        estimatedCost: undefined,
      }));
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canEdit || !editingEvent) return;
    const success = await updateEvent(editingEvent.id, {
      title: editingEvent.title,
      description: editingEvent.description,
      startTime: editingEvent.startTime as unknown as string,
      location: editingEvent.location,
      mapLink: editingEvent.mapLink,
      checklist: editingEvent.checklist || [],
      category: editingEvent.category || 'activity',
      estimatedCost: editingEvent.estimatedCost,
      timezone: editingEvent.timezone || trip?.defaultTimezone || currentTZ,
    });
    if (success) {
      setIsEditOpen(false);
      setEditingEvent(null);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!canEdit) return;
    const eventToDelete = events.find((e) => e.id === eventId);
    if (eventToDelete) await deleteEvent(eventToDelete);
  };

  const openEditDialog = (event: any) => {
    setEditingEvent({
      ...event,
      startTime: safeFormat(event.startTime, "yyyy-MM-dd'T'HH:mm"),
      checklist: event.checklist || [],
      category: event.category || 'activity',
      estimatedCost: event.estimatedCost,
      timezone: event.timezone || trip?.defaultTimezone || currentTZ,
    });
    setIsEditOpen(true);
  };

  // ── FAB actions ──
  const fabActions: FloatingAction[] = canEdit
    ? [
        {
          id: 'add-event',
          label: t('add_event') || 'Add Event',
          icon: <Plus className="h-5 w-5" />,
          onClick: () => openCreateDialog(),
        },
      ]
    : [];

  // ── Render ──
  return (
    <div className="flex flex-col h-full">
      {/* ── Layer 3: Scroll-aware mini-toolbar ── */}
      <ScrollAwareToolbar
        sentinelRef={toolbarRef}
        canEdit={canEdit}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddEvent={() => openCreateDialog()}
        labels={{
          fullPlan: t('full_plan') || 'Full Plan',
          dayView: t('day_view') || 'Day View',
          addEvent: t('add_event') || 'Add Event',
        }}
      />

      {/* ── Original Toolbar (acts as IntersectionObserver sentinel) ── */}
      <div ref={toolbarRef} className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <h2 className="text-xl font-semibold">{t('itinerary')}</h2>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex bg-muted p-1 rounded-lg">
            <button
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                viewMode === 'full'
                  ? 'bg-card text-foreground shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setViewMode('full')}
            >
              {t('full_plan') || 'Full Plan'}
            </button>
            <button
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                viewMode === 'day'
                  ? 'bg-card text-foreground shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setViewMode('day')}
            >
              {t('day_view') || 'Day View'}
            </button>
          </div>

          {/* Create event dialog trigger (original location) */}
          {canEdit && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                <Plus className="h-4 w-4 mr-2" />
                {t('add_event')}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('add_event')}</DialogTitle>
                </DialogHeader>
                <TimelineForm
                  data={newEvent}
                  setState={setNewEvent}
                  onSubmit={handleCreateEvent}
                  submitLabel={t('save_event')}
                  loading={loading}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* ── Day selector (day view only) ── */}
      {viewMode === 'day' && allUniqueDays.length > 0 && (
        <div className="flex overflow-x-auto pb-3 mb-3 gap-2 no-scrollbar -mx-1 px-1">
          {allUniqueDays.map((day) => {
            const isSelected = selectedDay === day;
            const color = getDayColor(day);
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all border ${
                  isSelected
                    ? 'text-white border-transparent'
                    : 'bg-card text-muted-foreground border-border hover:border-muted-foreground/30 hover:text-foreground'
                }`}
                style={isSelected ? { backgroundColor: color } : {}}
              >
                {safeFormat(day, 'EEE, MMM d')}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Edit event dialog (shared, not tied to any trigger) ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('edit_event')}</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <TimelineForm
              data={editingEvent}
              setState={setEditingEvent}
              onSubmit={handleUpdateEvent}
              submitLabel={t('update_event')}
              loading={loading}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        {dataLoading ? (
          /* Loading skeleton */
          <div className="space-y-8">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-12 w-full rounded-xl" />
                <div className="ml-6 space-y-6">
                  {[1, 2].map((j) => (
                    <div key={j} className="flex gap-4 items-start">
                      <Skeleton className="h-4 w-4 rounded-full mt-2 shrink-0" />
                      <Skeleton className="h-24 flex-1 rounded-lg" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          /* Empty state */
          <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
            {t('no_events')}
          </div>
        ) : viewMode === 'full' ? (
          /* ── Full Plan: timezone blocks ── */
          <div className="space-y-6 pb-8">
            {timezoneBlocks.map((block) => (
              <TimezoneBlock
                key={block.id}
                blockId={block.id}
                timezone={block.timezone}
                events={block.events}
                days={block.days}
                isCollapsed={!!collapsedBlocks[block.id]}
                onToggle={() => toggleBlock(block.id)}
                tripId={tripId}
                canEdit={canEdit}
                onEdit={openEditDialog}
                onDelete={handleDelete}
                onAddEvent={openCreateDialog}
              />
            ))}
          </div>
        ) : (
          /* ── Day View: flat event list ── */
          <div className="relative border-l-2 border-dashed border-border ml-2 md:ml-5 space-y-4 sm:space-y-6 pb-8 mt-2">
            {filteredEventsForDay.map((event) => {
              const tz = event.timezone || trip?.defaultTimezone || currentTZ;
              const hue = getStringHue(tz);
              const isDark = document.documentElement.classList.contains('dark');
              const color = `hsl(${hue}, ${isDark ? '60%' : '70%'}, ${isDark ? '60%' : '45%'})`;

              return (
                <TimelineItem
                  key={event.id}
                  event={event}
                  tripId={tripId}
                  canEdit={canEdit}
                  onEdit={openEditDialog}
                  onDelete={handleDelete}
                  isDayView
                  themeColor={color}
                />
              );
            })}
            {filteredEventsForDay.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {t('no_events_on_day') || 'No events planned for this day.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Layer 1: Floating Action Button ── */}
      <FloatingActions
        actions={fabActions}
        visible={canEdit && !dataLoading && events.length > 0}
      />
    </div>
  );
}
