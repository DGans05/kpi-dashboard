'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateKPIEntry, useUpdateKPIEntry } from '@/lib/hooks/useKPI';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { KPIEntry } from '@/lib/api/kpi';

const kpiEntrySchema = z.object({
  restaurantId: z.string().min(1, 'Restaurant is required'),
  entryDate: z.string().min(1, 'Date is required'),
  revenue: z.number().min(0, 'Revenue must be non-negative'),
  labourCost: z.number().min(0, 'Labour cost must be non-negative'),
  foodCost: z.number().min(0, 'Food cost must be non-negative'),
  orders: z.number().int().min(0, 'Orders must be a non-negative integer'),
});

type FormData = z.infer<typeof kpiEntrySchema>;

interface KPIEntryFormProps {
  entry?: KPIEntry;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function KPIEntryForm({ entry, onSuccess, onCancel }: KPIEntryFormProps) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  const isEditing = !!entry;

  const createMutation = useCreateKPIEntry();
  const updateMutation = useUpdateKPIEntry();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(kpiEntrySchema),
    defaultValues: {
      restaurantId: entry?.restaurantId || user?.restaurantId || '',
      entryDate: entry?.entryDate || new Date().toISOString().split('T')[0],
      revenue: entry?.revenue || 0,
      labourCost: entry?.labourCost || 0,
      foodCost: entry?.foodCost || 0,
      orders: entry?.orders || 0,
    },
  });

  // Watch values for calculated fields
  const revenue = watch('revenue');
  const orders = watch('orders');
  const labourCost = watch('labourCost');
  const foodCost = watch('foodCost');

  // Calculate derived values
  const avgTicket = orders > 0 ? revenue / orders : 0;
  const labourCostPercent = revenue > 0 ? (labourCost / revenue) * 100 : 0;
  const foodCostPercent = revenue > 0 ? (foodCost / revenue) * 100 : 0;

  // Set restaurant ID for managers
  useEffect(() => {
    if (!isAdmin && user?.restaurantId) {
      setValue('restaurantId', user.restaurantId);
    }
  }, [isAdmin, user?.restaurantId, setValue]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && entry) {
        await updateMutation.mutateAsync({
          id: entry.id,
          data: {
            revenue: data.revenue,
            labourCost: data.labourCost,
            foodCost: data.foodCost,
            orders: data.orders,
          },
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      reset();
      onSuccess?.();
    } catch (error) {
      // Error is handled by mutation
      console.error('Form submission error:', error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || isSubmitting;
  const error = createMutation.error || updateMutation.error;

  const inputClassName = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
          {error instanceof Error ? error.message : 'An error occurred'}
        </div>
      )}

      {/* Date Field */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Entry Date
        </label>
        <input
          type="date"
          {...register('entryDate')}
          disabled={isEditing}
          max={new Date().toISOString().split('T')[0]}
          className={inputClassName}
        />
        {errors.entryDate && (
          <p className="mt-1 text-xs text-destructive">{errors.entryDate.message}</p>
        )}
      </div>

      {/* Restaurant ID (hidden for managers) */}
      {isAdmin && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Restaurant ID
          </label>
          <input
            type="text"
            {...register('restaurantId')}
            disabled={isEditing}
            placeholder="Enter restaurant UUID"
            className={inputClassName}
          />
          {errors.restaurantId && (
            <p className="mt-1 text-xs text-destructive">{errors.restaurantId.message}</p>
          )}
        </div>
      )}

      {/* Revenue Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Revenue
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Total Revenue ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('revenue', { valueAsNumber: true })}
              className={inputClassName}
            />
            {errors.revenue && (
              <p className="mt-1 text-xs text-destructive">{errors.revenue.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Order Count
            </label>
            <input
              type="number"
              min="0"
              {...register('orders', { valueAsNumber: true })}
              className={inputClassName}
            />
            {errors.orders && (
              <p className="mt-1 text-xs text-destructive">{errors.orders.message}</p>
            )}
          </div>
        </div>
        <div className="rounded-lg bg-muted px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Average Ticket:{' '}
            <span className="font-semibold text-foreground">
              ${avgTicket.toFixed(2)}
            </span>
          </p>
        </div>
      </div>

      {/* Labour Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Labour Costs
        </h3>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Labour Cost ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('labourCost', { valueAsNumber: true })}
            className={inputClassName}
          />
          {errors.labourCost && (
            <p className="mt-1 text-xs text-destructive">{errors.labourCost.message}</p>
          )}
        </div>
        <div className="rounded-lg bg-muted px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Labour Cost %:{' '}
            <span className={cn(
              'font-semibold',
              labourCostPercent > 30 ? 'text-destructive' : labourCostPercent > 25 ? 'text-warning' : 'text-success'
            )}>
              {labourCostPercent.toFixed(1)}%
            </span>
          </p>
        </div>
      </div>

      {/* Food Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Food Costs
        </h3>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Food Cost ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('foodCost', { valueAsNumber: true })}
            className={inputClassName}
          />
          {errors.foodCost && (
            <p className="mt-1 text-xs text-destructive">{errors.foodCost.message}</p>
          )}
        </div>
        <div className="rounded-lg bg-muted px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Food Cost %:{' '}
            <span className={cn(
              'font-semibold',
              foodCostPercent > 35 ? 'text-destructive' : foodCostPercent > 32 ? 'text-warning' : 'text-success'
            )}>
              {foodCostPercent.toFixed(1)}%
            </span>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading && (
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          )}
          {isEditing ? 'Update Entry' : 'Create Entry'}
        </Button>
      </div>
    </form>
  );
}
