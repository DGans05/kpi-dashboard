'use client';

import type { ReactNode } from 'react';
import { TrendIndicator } from './TrendIndicator';
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

  return (
    <Card
      className={cn(
        'relative overflow-hidden p-5 transition-all hover:shadow-elevated',
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

      <div className="flex items-start justify-between gap-4">
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
          <p className="text-3xl font-bold tracking-tight text-foreground">
            {formattedValue}
          </p>

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
      {trend !== undefined && (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs text-muted-foreground">vs previous period</span>
          <TrendIndicator value={trend} inverse={trendInverse} />
        </div>
      )}
    </Card>
  );
}
