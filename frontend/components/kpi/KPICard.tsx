'use client';

import type { ReactNode } from 'react';
import { TrendIndicator } from './TrendIndicator';
import { Sparkline } from './Sparkline';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatCurrency, formatPercentage, formatNumber } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number;
  format: 'currency' | 'percentage' | 'number' | 'decimal';
  trend?: number;
  trendInverse?: boolean;
  status?: 'good' | 'warning' | 'critical';
  target?: number;
  icon?: ReactNode;
  className?: string;
  sparklineData?: number[]; // 7-day historical data for mini chart
  compareValue?: number; // Value to compare against (yesterday, last week)
  compareLabel?: string; // Label for comparison (e.g., "vs yesterday")
}

export function KPICard({
  title,
  value,
  format,
  trend,
  trendInverse = false,
  status,
  target,
  icon,
  className = '',
  sparklineData,
  compareValue,
  compareLabel = 'vs previous',
}: KPICardProps) {
  // Format the value based on type
  const formattedValue = (() => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return formatPercentage(value);
      case 'decimal':
        return formatNumber(value, 2);
      default:
        return formatNumber(value);
    }
  })();

  // Status badge variants
  const statusBadgeVariant = status
    ? (`status-${status}` as 'status-good' | 'status-warning' | 'status-critical')
    : undefined;

  const statusLabel = {
    good: 'On Track',
    warning: 'Warning',
    critical: 'Critical',
  };

  // Sparkline color based on status
  const sparklineColor = status === 'critical'
    ? 'rgb(239 68 68)'
    : status === 'warning'
    ? 'rgb(245 158 11)'
    : 'rgb(34 197 94)';

  return (
    <Card
      className={cn(
        'relative overflow-hidden p-4 sm:p-6 transition-all duration-300',
        'hover:shadow-lg hover:scale-[1.02] hover:border-primary/50',
        status === 'critical' && 'animate-pulse-glow border-destructive/20',
        className
      )}
    >
      {/* Status indicator bar */}
      {status && (
        <div
          className={cn(
            'absolute left-0 top-0 h-1 w-full',
            status === 'good' && 'bg-success',
            status === 'warning' && 'bg-warning',
            status === 'critical' && 'bg-destructive'
          )}
        />
      )}

      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1 space-y-2">
          {/* Title with icon */}
          <div className="flex items-center gap-2">
            {icon && (
              <span className="text-muted-foreground">{icon}</span>
            )}
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
          </div>

          {/* Value */}
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground animate-count-up">
            {formattedValue}
          </p>

          {/* Sparkline */}
          {sparklineData && sparklineData.length > 0 && (
            <div className="mt-2">
              <Sparkline
                data={sparklineData}
                width={100}
                height={20}
                lineColor={sparklineColor}
                fillColor={sparklineColor}
                animate={true}
              />
            </div>
          )}

          {/* Target */}
          {target !== undefined && (
            <p className="text-xs text-muted-foreground">
              Target: {format === 'percentage' ? formatPercentage(target) : formatCurrency(target)}
            </p>
          )}
        </div>

        {/* Status badge */}
        {status && (
          <Badge variant={statusBadgeVariant}>
            {statusLabel[status]}
          </Badge>
        )}
      </div>

      {/* Trend section */}
      {(trend !== undefined || compareValue !== undefined) && (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs text-muted-foreground">{compareLabel}</span>
          {trend !== undefined ? (
            <TrendIndicator value={trend} inverse={trendInverse} />
          ) : compareValue !== undefined ? (
            <div className="text-xs font-semibold">
              {compareValue > 0 ? '+' : ''}{compareValue.toFixed(1)}%
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
