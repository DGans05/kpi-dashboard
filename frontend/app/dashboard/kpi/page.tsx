'use client';

import { useState, useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import { useKPIEntries, useDeleteKPIEntry } from '@/lib/hooks/useKPI';
import { useAuthStore } from '@/lib/store/authStore';
import { KPIEntryForm } from '@/components/kpi/KPIEntryForm';
import { KPITable } from '@/components/kpi/KPITable';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { KPIEntry } from '@/lib/api/kpi';

export default function KPIEntriesPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';

  // Date range state (default: last 7 days)
  const defaultEndDate = new Date().toISOString().split('T')[0];
  const defaultStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: defaultStartDate,
    endDate: defaultEndDate,
  });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KPIEntry | undefined>(undefined);

  // Fetch entries
  const {
    data: entries = [],
    isLoading,
    error,
    refetch,
  } = useKPIEntries(
    undefined, // restaurantId is handled by backend based on user role
    appliedFilters.startDate,
    appliedFilters.endDate
  );

  // Delete mutation
  const deleteMutation = useDeleteKPIEntry();

  // Apply date filters
  const handleApplyFilters = () => {
    setAppliedFilters({ startDate, endDate });
  };

  // Reset filters
  const handleResetFilters = () => {
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setAppliedFilters({
      startDate: defaultStartDate,
      endDate: defaultEndDate,
    });
  };

  // Open create modal
  const handleOpenCreate = () => {
    setEditingEntry(undefined);
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleEdit = (entry: KPIEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEntry(undefined);
  };

  // Handle successful form submission
  const handleFormSuccess = () => {
    handleCloseModal();
    refetch();
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // Summary stats
  const stats = useMemo(() => {
    if (entries.length === 0) return null;

    const totalRevenue = entries.reduce((sum, e) => sum + e.revenue, 0);
    const totalLabour = entries.reduce((sum, e) => sum + e.labourCost, 0);
    const totalFood = entries.reduce((sum, e) => sum + e.foodCost, 0);
    const totalOrders = entries.reduce((sum, e) => sum + e.orders, 0);

    return {
      totalRevenue,
      avgLabourPercent: totalRevenue > 0 ? (totalLabour / totalRevenue) * 100 : 0,
      avgFoodPercent: totalRevenue > 0 ? (totalFood / totalRevenue) * 100 : 0,
      totalOrders,
      avgTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };
  }, [entries]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            KPI Entries
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage daily performance metrics for your restaurant
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Entry
        </Button>
      </div>

      {/* Date Range Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              max={new Date().toISOString().split('T')[0]}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button variant="outline" onClick={handleApplyFilters}>
            Apply
          </Button>
          <Button variant="ghost" onClick={handleResetFilters}>
            Reset
          </Button>
        </div>
      </Card>

      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
            <p className="mt-1 text-xl font-bold text-foreground">
              ${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Avg Labour %</p>
            <p className={cn(
              'mt-1 text-xl font-bold',
              stats.avgLabourPercent > 30 ? 'text-destructive' : stats.avgLabourPercent > 25 ? 'text-warning' : 'text-success'
            )}>
              {stats.avgLabourPercent.toFixed(1)}%
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Avg Food %</p>
            <p className={cn(
              'mt-1 text-xl font-bold',
              stats.avgFoodPercent > 35 ? 'text-destructive' : stats.avgFoodPercent > 32 ? 'text-warning' : 'text-success'
            )}>
              {stats.avgFoodPercent.toFixed(1)}%
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Orders</p>
            <p className="mt-1 text-xl font-bold text-foreground">
              {stats.totalOrders.toLocaleString()}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Avg Ticket</p>
            <p className="mt-1 text-xl font-bold text-foreground">
              ${stats.avgTicket.toFixed(2)}
            </p>
          </Card>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
          Failed to load KPI entries. Please try again.
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <KPITable
          entries={entries}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={isAdmin ? handleDelete : undefined}
          showRestaurant={isAdmin}
        />
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                {editingEntry ? 'Edit KPI Entry' : 'New KPI Entry'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <KPIEntryForm
              entry={editingEntry}
              onSuccess={handleFormSuccess}
              onCancel={handleCloseModal}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
