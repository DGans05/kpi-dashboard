'use client';

import { useState } from 'react';
import { Pencil, Trash2, FileSpreadsheet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { KPIEntry } from '@/lib/api/kpi';

interface KPITableProps {
  entries: KPIEntry[];
  isLoading?: boolean;
  onEdit?: (entry: KPIEntry) => void;
  onDelete?: (id: string) => void;
  showRestaurant?: boolean;
}

/**
 * Format currency value
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Format percentage
 */
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Get color class for percentage
 */
function getPercentColor(value: number, thresholds: { warning: number; critical: number }): string {
  if (value >= thresholds.critical) return 'text-destructive';
  if (value >= thresholds.warning) return 'text-warning';
  return 'text-success';
}

export function KPITable({
  entries,
  isLoading,
  onEdit,
  onDelete,
  showRestaurant = false,
}: KPITableProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId && onDelete) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Date
              </th>
              {showRestaurant && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Restaurant
                </th>
              )}
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Revenue
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Labour
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Food
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Orders
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Avg Ticket
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="px-4 py-4">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </td>
                {showRestaurant && (
                  <td className="px-4 py-4">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  </td>
                )}
                <td className="px-4 py-4 text-right">
                  <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="ml-auto h-4 w-12 animate-pulse rounded bg-muted" />
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No KPI entries found</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Click &quot;Add Entry&quot; to create your first KPI record.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Date
              </th>
              {showRestaurant && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Restaurant
                </th>
              )}
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Revenue
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Labour
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Food
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Orders
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Avg Ticket
              </th>
              {(onEdit || onDelete) && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr
                key={entry.id}
                className={cn(
                  'border-b border-border/50 hover:bg-muted/50 transition',
                  index % 2 === 0 ? 'bg-muted/20' : ''
                )}
              >
                <td className="px-4 py-4 text-sm text-foreground">
                  {formatDate(entry.entryDate)}
                </td>
                {showRestaurant && (
                  <td className="px-4 py-4 text-sm text-muted-foreground">
                    {entry.restaurant?.name ?? 'Unknown'}
                  </td>
                )}
                <td className="px-4 py-4 text-right text-sm font-medium text-foreground">
                  {formatCurrency(entry.revenue)}
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="text-sm text-foreground">{formatCurrency(entry.labourCost)}</div>
                  <div className={cn('text-xs', getPercentColor(entry.labourCostPercent, { warning: 25, critical: 30 }))}>
                    {formatPercent(entry.labourCostPercent)}
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="text-sm text-foreground">{formatCurrency(entry.foodCost)}</div>
                  <div className={cn('text-xs', getPercentColor(entry.foodCostPercent, { warning: 32, critical: 35 }))}>
                    {formatPercent(entry.foodCostPercent)}
                  </div>
                </td>
                <td className="px-4 py-4 text-right text-sm text-foreground">
                  {entry.orders.toLocaleString()}
                </td>
                <td className="px-4 py-4 text-right text-sm font-medium text-foreground">
                  {formatCurrency(entry.avgTicket)}
                </td>
                {(onEdit || onDelete) && (
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(entry)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
                          title="Edit entry"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => handleDeleteClick(entry.id)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition"
                          title="Delete entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-foreground">Delete Entry</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete this KPI entry? This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={handleCancelDelete} className="flex-1">
                Cancel
              </Button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 transition"
              >
                Delete
              </button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
