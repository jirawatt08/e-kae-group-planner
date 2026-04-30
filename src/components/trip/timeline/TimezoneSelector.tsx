import React from 'react';
import { Button } from '@/components/ui/button';
import { Search, Globe, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useLanguage } from '../../../contexts/LanguageContext';

interface TimezoneSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  align?: "start" | "center" | "end";
}

export function TimezoneSelector({ value, onChange, className, align = "start" }: TimezoneSelectorProps) {
  const { t } = useLanguage();
  const [search, setSearch] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);

  const timezoneOptions = React.useMemo(() => 
    Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [Intl.DateTimeFormat().resolvedOptions().timeZone],
  []);

  const filteredOptions = React.useMemo(() => 
    timezoneOptions.filter(tz => tz.toLowerCase().includes(search.toLowerCase())),
  [timezoneOptions, search]);

  const displayValue = React.useMemo(() => 
    value.split('/').pop()?.replace(/_/g, ' ') || value,
  [value]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger render={
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn("w-full h-10 justify-between rounded-md border border-input bg-background px-3 text-sm font-normal shadow-sm hover:bg-accent hover:text-accent-foreground transition-all text-left", className)}
        >
          <span className="truncate flex items-center gap-2">
            <Globe className="h-4 w-4 shrink-0 opacity-50" />
            {displayValue}
          </span>
          <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      } />
      <PopoverContent className="w-[280px] p-0 border border-border rounded-lg overflow-hidden shadow-md bg-popover" align={align}>
        <div className="flex items-center border-b px-3 py-2 gap-2 bg-muted/30">
          <Search className="h-4 w-4 shrink-0 opacity-50" />
          <input
            placeholder={t('search_timezone') || 'Search...'}
            className="flex h-9 w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ScrollArea className="h-[250px]">
          <div className="p-1">
            {filteredOptions.map((tz) => (
              <button
                key={tz}
                type="button"
                onClick={() => {
                  onChange(tz);
                  setIsOpen(false);
                  setSearch('');
                }}
                className={cn(
                  "w-full text-left px-3 py-1.5 rounded-sm text-sm transition-colors mb-0.5 last:mb-0 hover:bg-accent hover:text-accent-foreground",
                  value === tz && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {tz}
              </button>
            ))}
            {search && filteredOptions.length === 0 && (
              <div className="py-6 text-center text-xs text-muted-foreground italic">
                No results found.
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
