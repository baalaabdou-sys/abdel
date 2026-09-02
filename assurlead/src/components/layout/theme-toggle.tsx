'use client';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/providers/i18n-provider';

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const { t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Thème">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}><Sun /> {t('theme.light')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}><Moon /> {t('theme.dark')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}><Monitor /> {t('theme.system')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
