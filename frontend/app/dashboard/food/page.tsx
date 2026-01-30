'use client';

import { useState, useMemo } from 'react';
import { Utensils, Download } from 'lucide-react';
import { useKPIEntries } from '@/lib/hooks/useKPI';
import { useAuthStore } from '@/lib/store/authStore';
import { KPICard } from '@/components/kpi/KPICard';
import { KPIChart } from '@/components/kpi/KPIChart';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDateRange, formatDateRange } from '@/lib/utils/date';
import { formatCurrency, formatPercentage, formatDate } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';

type DateRangePreset = '7days' | '30days' | '90days' | 'custom';

export default function FoodKPIsPage() {
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

  // Fetch entries
  const { data: entries = [], isLoading, error } = useKPIEntries(
    restaurantId,
    dateRange.startDate,
    dateRange.endDate
  );

  // Calculate aggregates
  const stats = useMemo(() => {
    if (entries.length === 0) return null;

    const totalRevenue = entries.reduce((sum, e) => sum + e.revenue, 0);
    const totalFoodCost = entries.reduce((sum, e) => sum + e.foodCost, 0);
    const avgFoodPercent = totalRevenue > 0 ? (totalFoodCost / totalRevenue) * 100 : 0;

    // Calculate trend (compare first half vs second half)
    const midpoint = Math.floor(entries.length / 2);
    const recentEntries = entries.slice(0, midpoint);
    const olderEntries = entries.slice(midpoint);

    const recentRevenue = recentEntries.reduce((sum, e) => sum + e.revenue, 0);
    const recentFood = recentEntries.reduce((sum, e) => sum + e.foodCost, 0);
    const olderRevenue = olderEntries.reduce((sum, e) => sum + e.revenue, 0);
    const olderFood = olderEntries.reduce((sum, e) => sum + e.foodCost, 0);

    const recentPercent = recentRevenue > 0 ? (recentFood / recentRevenue) * 100 : 0;
    const olderPercent = olderRevenue > 0 ? (olderFood / olderRevenue) * 100 : 0;
    const trend = olderPercent > 0 ? ((recentPercent - olderPercent) / olderPercent) * 100 : 0;

    return {
      totalFoodCost,
      avgFoodPercent,
      trend,
      dailyAvg: totalFoodCost / entries.length,
    };
  }, [entries]);

  // Prepare chart data (sorted by date ASC)
  const chartData = useMemo(() => {
    return [...entries]
      .sort((a, b) => a.entryDate.localeCompare(b.entryDate))
      .map((e) => ({
        date: e.entryDate,
        foodCost: e.foodCost,
        foodCostPercent: e.foodCostPercent,
        revenue: e.revenue,
      }));
  }, [entries]);

  // Export to CSV
  const handleExport = () => {
    const headers = ['Date', 'Food Cost', 'Food %', 'Revenue'];
    const rows = entries.map((e) => [
      e.entryDate,
      e.foodCost.toFixed(2),
      e.foodCostPercent.toFixed(1),
      e.revenue.toFixed(2),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `food-kpis-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Food KPIs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor food costs and optimize your menu profitability
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={entries.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground mr-2">Period:</span>
          {(['7days', '30days', '90days', 'custom'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                preset === p
                  ? 'bg-success text-success-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              )}
            >
              {p === '7days'
                ? '7 Days'
                : p === '30days'
                ? '30 Days'
                : p === '90days'
                ? '90 Days'
                : 'Custom'}
            </button>
          ))}
          {preset === 'custom' && (
            <>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:border-success focus:outline-none"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:border-success focus:outline-none"
              />
            </>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {formatDateRange(dateRange.startDate, dateRange.endDate)}
          </span>
        </div>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
          Failed to load food data. Please try again.
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard
              title="Average Food Cost %"
              value={stats.avgFoodPercent}
              format="percentage"
              trend={stats.trend}
              trendInverse={true}
              icon={<Utensils className="h-4 w-4" />}
              className="md:col-span-1"
            />
            <KPICard
              title="Total Food Cost"
              value={stats.totalFoodCost}
              format="currency"
            />
            <KPICard
              title="Daily Average"
              value={stats.dailyAvg}
              format="currency"
            />
          </div>

          {/* Charts */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <KPIChart
                data={chartData}
                type="line"
                dataKeys={['foodCostPercent']}
                title="Food Cost % Trend"
                height={280}
                yAxisFormatter={(v) => `${v}%`}
              />
              <KPIChart
                data={chartData}
                type="area"
                dataKeys={['foodCost']}
                title="Daily Food Cost"
                height={280}
                yAxisFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
            </div>
          )}

          {/* Food Cost vs Revenue Comparison */}
          {chartData.length > 0 && (
            <KPIChart
              data={chartData}
              type="bar"
              dataKeys={['foodCost', 'revenue']}
              title="Food Cost vs Revenue"
              height={300}
              yAxisFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
          )}

          {/* Data Table */}
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Daily Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Food Cost
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Food %
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => (
                    <tr
                      key={entry.id}
                      className={cn(
                        'border-b border-border/50',
                        index % 2 === 0 ? 'bg-muted/20' : ''
                      )}
                    >
                      <td className="px-4 py-3 text-sm text-foreground">
                        {formatDate(entry.entryDate)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-foreground">
                        {formatCurrency(entry.foodCost)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <span
                          className={cn(
                            entry.foodCostPercent > 35
                              ? 'text-destructive'
                              : entry.foodCostPercent > 32
                              ? 'text-warning'
                              : 'text-success'
                          )}
                        >
                          {formatPercentage(entry.foodCostPercent)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-foreground">
                        {formatCurrency(entry.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!isLoading && entries.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Utensils className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No food data found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add KPI entries to track your food costs
          </p>
        </Card>
      )}
    </div>
  );
}
