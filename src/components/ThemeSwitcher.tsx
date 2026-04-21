import React from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <Tooltip>
      <TooltipTrigger render={
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" />}>
            {theme === 'light' && <Sun className="h-4 w-4" />}
            {theme === 'dark' && <Moon className="h-4 w-4" />}
            {theme === 'system' && <Monitor className="h-4 w-4" />}
            <span className="sr-only">Toggle Theme</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')} className="gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                <span>Light</span>
              </div>
              {theme === 'light' && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')} className="gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                <span>Dark</span>
              </div>
              {theme === 'dark' && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')} className="gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                <span>System</span>
              </div>
              {theme === 'system' && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }>
      </TooltipTrigger>
      <TooltipContent>
        <p>Switch Theme</p>
      </TooltipContent>
    </Tooltip>
  );
}
