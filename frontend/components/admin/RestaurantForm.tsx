'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateRestaurant, useUpdateRestaurant } from '@/lib/hooks/useRestaurants';
import type { Restaurant } from '@/lib/api/restaurants';

const restaurantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  city: z.string().max(100).optional(),
  timezone: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

type FormData = z.infer<typeof restaurantSchema>;

interface RestaurantFormProps {
  restaurant?: Restaurant;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

export function RestaurantForm({ restaurant, onSuccess, onCancel }: RestaurantFormProps) {
  const isEditing = !!restaurant;
  const createMutation = useCreateRestaurant();
  const updateMutation = useUpdateRestaurant();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(restaurantSchema),
    defaultValues: {
      name: restaurant?.name || '',
      city: restaurant?.city || '',
      timezone: restaurant?.timezone || 'UTC',
      isActive: restaurant?.isActive ?? true,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && restaurant) {
        await updateMutation.mutateAsync({
          id: restaurant.id,
          data: {
            name: data.name,
            city: data.city,
            timezone: data.timezone,
            isActive: data.isActive,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          city: data.city,
          timezone: data.timezone,
        });
      }
      reset();
      onSuccess?.();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || isSubmitting;
  const error = createMutation.error || updateMutation.error;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error instanceof Error ? error.message : 'An error occurred'}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Restaurant Name <span className="text-rose-400">*</span>
        </label>
        <input
          type="text"
          {...register('name')}
          className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-rose-400">{errors.name.message}</p>
        )}
      </div>

      {/* City */}
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          City
        </label>
        <input
          type="text"
          {...register('city')}
          className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
        {errors.city && (
          <p className="mt-1 text-xs text-rose-400">{errors.city.message}</p>
        )}
      </div>

      {/* Timezone */}
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Timezone
        </label>
        <select
          {...register('timezone')}
          className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        {errors.timezone && (
          <p className="mt-1 text-xs text-rose-400">{errors.timezone.message}</p>
        )}
      </div>

      {/* Active Status */}
      {isEditing && (
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            {...register('isActive')}
            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/40"
          />
          <label htmlFor="isActive" className="text-sm text-slate-200">
            Active restaurant
          </label>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-60 transition"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 inline-flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/40 hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {isLoading && (
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {isEditing ? 'Update Restaurant' : 'Create Restaurant'}
        </button>
      </div>
    </form>
  );
}
