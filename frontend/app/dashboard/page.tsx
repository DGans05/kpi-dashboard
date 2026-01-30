'use client';

import { useState, useMemo } from 'react';
import { DollarSign, Users, Utensils, TrendingUp, AlertTriangle } from 'lucide-react';
import { useDashboardSummary } from '@/lib/hooks/useKPI';
import { useAuthStore } from '@/lib/store/authStore';
import { KPICard } from '@/components/kpi/KPICard';
import { KPIChart } from '@/components/kpi/KPIChart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDateRange, formatDateRange } from '@/lib/utils/date';
import { cn } from '@/lib/utils';

type DateRangePreset = '7days' | '30days' | '90days' | 'custom';

export default function DashboardOverviewPage() {
  const user = useAuthStore((state) => state.user);
  const restaurantId = user?.restaurantId ?? undefined;

  // Date range state
  const [preset, setPreset] = useState<DateRangePreset>('7days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Calculate effective date range
  const dateRange = useMemo(() => {
    switch (preset) {
      case '30days':
        return getDateRange(30);
      case '90days':
        return getDateRange(90);
      case 'custom':
        return customStart && customEnd
          ? { startDate: customStart, endDate: customEnd }
          : getDateRange(7);
      default:
        return getDateRange(7);
    }
  }, [preset, customStart, customEnd]);

  // Fetch dashboard data
  const {
    data: summary,
    isLoading,
    error,
  } = useDashboardSummary(restaurantId, dateRange.startDate, dateRange.endDate);

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = user?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {summary?.restaurantName || 'Your restaurant'} performance overview
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {formatDateRange(dateRange.startDate, dateRange.endDate)}
        </div>
      </div>

      {/* Date Range Selector */}
      <Card className="p-1">
        <div className="flex flex-wrap items-center gap-2 p-2">
          {(['7days', '30days', '90days', 'custom'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                preset === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              )}
            >
              {p === '7days'
                ? 'Last 7 Days'
                : p === '30days'
                ? 'Last 30 Days'
                : p === '90days'
                ? 'Last 90 Days'
                : 'Custom'}
            </button>
          ))}
          {preset === 'custom' && (
            <>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </>
          )}
        </div>
      </Card>

      {/* Alerts */}
      {summary && (summary.alerts.labourCost !== 'good' || summary.alerts.foodCost !== 'good') && (
        <div className="space-y-2">
          {summary.alerts.labourCost === 'critical' && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">Labour Cost Alert:</span> Currently at{' '}
                {summary.current.labourCostPercent.toFixed(1)}% (target: {summary.targets.labourCost}%)
              </p>
            </div>
          )}
          {summary.alerts.labourCost === 'warning' && (
            <div className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">Labour Cost Warning:</span> Approaching target at{' '}
                {summary.current.labourCostPercent.toFixed(1)}%
              </p>
            </div>
          )}
          {summary.alerts.foodCost === 'critical' && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">Food Cost Alert:</span> Currently at{' '}
                {summary.current.foodCostPercent.toFixed(1)}% (target: {summary.targets.foodCost}%)
              </p>
            </div>
          )}
          {summary.alerts.foodCost === 'warning' && (
            <div className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">Food Cost Warning:</span> Approaching target at{' '}
                {summary.current.foodCostPercent.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-5 animate-pulse">
              <div className="h-4 w-24 bg-muted rounded mb-3" />
              <div className="h-8 w-32 bg-muted rounded" />
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
          Failed to load dashboard data. Please try again.
        </div>
      )}

      {/* KPI Cards */}
      {summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <KPICard
              title="Labour Cost"
              value={summary.current.labourCostPercent}
              format="percentage"
              trend={summary.trends.labourCost}
              trendInverse={true}
              status={summary.alerts.labourCost}
              target={summary.targets.labourCost}
              icon={<Users className="h-4 w-4" />}
            />
            <KPICard
              title="Food Cost"
              value={summary.current.foodCostPercent}
              format="percentage"
              trend={summary.trends.foodCost}
              trendInverse={true}
              status={summary.alerts.foodCost}
              target={summary.targets.foodCost}
              icon={<Utensils className="h-4 w-4" />}
            />
            <KPICard
              title="Total Revenue"
              value={summary.current.totalRevenue}
              format="currency"
              trend={summary.trends.revenue}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KPICard
              title="Total Orders"
              value={summary.current.totalOrders}
              format="number"
              trend={summary.trends.orders}
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard
              title="Average Ticket"
              value={summary.current.avgTicket}
              format="currency"
            />
            <Card className="md:col-span-2 p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Labour Target</p>
                  <p className="text-2xl font-bold text-foreground">{summary.targets.labourCost}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Food Target</p>
                  <p className="text-2xl font-bold text-foreground">{summary.targets.foodCost}%</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Charts */}
          {summary.chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <KPIChart
                data={summary.chartData}
                type="area"
                dataKeys={['revenue']}
                title="Revenue Trend"
                height={280}
                yAxisFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <KPIChart
                data={summary.chartData}
                type="line"
                dataKeys={['labourCostPercent', 'foodCostPercent']}
                title="Cost Percentages"
                height={280}
                yAxisFormatter={(v) => `${v}%`}
              />
            </div>
          )}

          {summary.chartData.length > 0 && (
            <KPIChart
              data={summary.chartData}
              type="bar"
              dataKeys={['labourCost', 'foodCost']}
              title="Daily Cost Breakdown"
              height={300}
              yAxisFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
          )}
        </>
      )}

      {/* Empty State */}
      {!isLoading && !error && !summary?.chartData?.length && (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No KPI data for this period</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add KPI entries to see your dashboard metrics
          </p>
        </Card>
      )}
    </div>
  );
}
