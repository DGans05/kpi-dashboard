'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendIndicatorProps {
  value: number;
  inverse?: boolean; // true if lower is better (costs, delivery time)
  size?: 'sm' | 'md';
}

export function TrendIndicator({ value, inverse = false, size = 'sm' }: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  // Determine if the trend is good or bad
  const isGood = inverse ? isNegative : isPositive;
  const isBad = inverse ? isPositive : isNegative;

  const Icon = isNeutral
    ? Minus
    : isPositive
    ? TrendingUp
    : TrendingDown;

  const sign = value >= 0 ? '+' : '';

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 font-medium',
        isGood && 'text-success',
        isBad && 'text-destructive',
        isNeutral && 'text-muted-foreground'
      )}
    >
      <Icon className={iconSize} />
      <span className={textSize}>
        {sign}{value.toFixed(1)}%
      </span>
    </div>
  );
}
