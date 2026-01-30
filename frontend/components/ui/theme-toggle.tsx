'use client';

import * as React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  variant?: 'icon' | 'dropdown';
}

export function ThemeToggle({ className, variant = 'icon' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          className
        )}
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4" />
      </button>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={cn('flex items-center gap-1 rounded-lg border border-border bg-background p-1', className)}>
        <button
          onClick={() => setTheme('light')}
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            theme === 'light'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          aria-label="Light mode"
          title="Light mode"
        >
          <Sun className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            theme === 'dark'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          aria-label="Dark mode"
          title="Dark mode"
        >
          <Moon className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setTheme('system')}
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            theme === 'system'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          aria-label="System theme"
          title="System theme"
        >
          <Monitor className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // Icon variant - cycles through themes
  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <button
      onClick={cycleTheme}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className
      )}
      aria-label="Toggle theme"
      title={`Current: ${theme} (click to change)`}
    >
      {resolvedTheme === 'dark' ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </button>
  );
}
