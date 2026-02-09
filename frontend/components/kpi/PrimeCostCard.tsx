'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkline } from './Sparkline';
import { cn } from '@/lib/utils';
import { formatPercentage } from '@/lib/utils/formatters';

interface PrimeCostCardProps {
  labourPercent: number;
  foodPercent: number;
  target?: number;
  sparklineData?: number[];
  trend?: number;
  className?: string;
}

export function PrimeCostCard({
  labourPercent,
  foodPercent,
  target = 60, // Industry standard: 60% or less
  sparklineData,
  trend,
  className = '',
}: PrimeCostCardProps) {
  const primeCost = labourPercent + foodPercent;

  // Status based on industry benchmarks
  // Good: < 60%, Warning: 60-65%, Critical: > 65%
  const status =
    primeCost < target
      ? 'good'
      : primeCost < target + 5
      ? 'warning'
      : 'critical';

  const statusColors = {
    good: {
      bg: 'bg-success/10',
      border: 'border-success/20',
      text: 'text-success',
      bar: 'bg-success',
    },
    warning: {
      bg: 'bg-warning/10',
      border: 'border-warning/20',
      text: 'text-warning',
      bar: 'bg-warning',
    },
    critical: {
      bg: 'bg-destructive/10',
      border: 'border-destructive/20',
      text: 'text-destructive',
      bar: 'bg-destructive',
    },
  };

  const colors = statusColors[status];

  const sparklineColor =
    status === 'critical'
      ? 'rgb(239 68 68)'
      : status === 'warning'
      ? 'rgb(245 158 11)'
      : 'rgb(34 197 94)';

  return (
    <Card
      className={cn(
        'relative overflow-hidden p-4 sm:p-6 transition-all duration-300',
        'hover:shadow-lg hover:scale-[1.02] hover:border-primary/50',
        status === 'critical' && 'animate-pulse-glow',
        colors.border,
        className
      )}
    >
      {/* Status indicator bar */}
      <div className={cn('absolute left-0 top-0 h-1 w-full', colors.bar)} />

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              <h3 className="text-sm font-medium text-muted-foreground">
                Prime Cost
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Labour + Food Cost
            </p>
          </div>

          <Badge
            variant={
              status === 'critical'
                ? 'destructive'
                : status === 'warning'
                ? 'warning'
                : 'default'
            }
          >
            {status === 'good' && 'On Track'}
            {status === 'warning' && 'Warning'}
            {status === 'critical' && 'Critical'}
          </Badge>
        </div>

        {/* Prime Cost Value */}
        <div>
          <p
            className={cn(
              'text-3xl sm:text-4xl font-bold tracking-tight animate-count-up',
              colors.text
            )}
          >
            {formatPercentage(primeCost)}
          </p>

          {/* Sparkline */}
          {sparklineData && sparklineData.length > 0 && (
            <div className="mt-2">
              <Sparkline
                data={sparklineData}
                width={120}
                height={24}
                lineColor={sparklineColor}
                fillColor={sparklineColor}
                animate={true}
              />
            </div>
          )}

          <p className="mt-2 text-xs text-muted-foreground">
            Target: {formatPercentage(target)} or less
          </p>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Labour</p>
            <p className="text-lg font-semibold text-foreground">
              {formatPercentage(labourPercent)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Food</p>
            <p className="text-lg font-semibold text-foreground">
              {formatPercentage(foodPercent)}
            </p>
          </div>
        </div>

        {/* Trend */}
        {trend !== undefined && (
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">vs last week</span>
            <div className="flex items-center gap-1">
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-destructive" />
              ) : (
                <TrendingDown className="h-4 w-4 text-success" />
              )}
              <span
                className={cn(
                  'text-sm font-semibold',
                  trend > 0 ? 'text-destructive' : 'text-success'
                )}
              >
                {Math.abs(trend).toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Target Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress to target</span>
            <span>
              {primeCost <= target ? 'Under target' : `${(primeCost - target).toFixed(1)}% over`}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all duration-500', colors.bar)}
              style={{
                width: `${Math.min((primeCost / (target + 10)) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
