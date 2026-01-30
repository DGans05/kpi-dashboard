import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = 'md', ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);

    const showFallback = !src || imageError;

    // Generate fallback initials from name or use provided fallback
    const initials = React.useMemo(() => {
      if (fallback) return fallback.slice(0, 2).toUpperCase();
      if (alt) {
        return alt
          .split(' ')
          .map((word) => word[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
      }
      return '?';
    }, [fallback, alt]);

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {showFallback ? (
          <span className="font-medium text-muted-foreground">{initials}</span>
        ) : (
          <img
            src={src!}
            alt={alt || 'Avatar'}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

export { Avatar };
