import React from 'react';
import { safeFormat, getDayColor } from '../../../lib/dateUtils';
import { Calendar } from 'lucide-react';

interface DayHeaderProps {
  dayKey: string;
  dayNumber: number;
  eventCount: number;
}

export function DayHeader({ dayKey, dayNumber, eventCount }: DayHeaderProps) {
  const color = getDayColor(dayKey);
  const badgeBg = color.replace('hsl', 'hsla').replace('%)', ', 0.1%)');
  const borderCol = color.replace('hsl', 'hsla').replace('%)', ', 0.2%)');

  return (
    <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm -mx-4 px-4 py-2 mb-4 border-y border-gray-100 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div 
          className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border shadow-sm"
          style={{ backgroundColor: badgeBg, color: color, borderColor: borderCol }}
        >
          Day {dayNumber}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900">
            {safeFormat(dayKey, 'EEEE, MMM d')}
          </span>
        </div>
      </div>
      
      <div className="flex items-center text-[10px] text-gray-400 font-medium bg-white px-2 py-0.5 rounded-full border shadow-xs">
        <Calendar className="h-3 w-3 mr-1" />
        {eventCount} {eventCount === 1 ? 'event' : 'events'}
      </div>
    </div>
  );
}
