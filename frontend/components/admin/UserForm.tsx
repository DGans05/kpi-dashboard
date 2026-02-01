'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateUser, useUpdateUser } from '@/lib/hooks/useUsers';
import type { User } from '@/lib/api/users';
import type { Restaurant } from '@/lib/api/restaurants';

// Schema that works for both create and update
const userFormSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().optional(),
  fullName: z.string().optional(),
  role: z.enum(['admin', 'manager', 'viewer']),
  restaurantId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

type FormData = z.infer<typeof userFormSchema>;

// Create validation schema with required password
const createUserSchema = userFormSchema.refine(
  (data) => data.password && data.password.length >= 8,
  { message: 'Password must be at least 8 characters', path: ['password'] }
);

// Update validation schema with optional password
const updateUserSchema = userFormSchema.refine(
  (data) => !data.password || data.password.length === 0 || data.password.length >= 8,
  { message: 'Password must be at least 8 characters', path: ['password'] }
);

interface UserFormProps {
  user?: User;
  restaurants: Restaurant[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function UserForm({ user, restaurants, onSuccess, onCancel }: UserFormProps) {
  const isEditing = !!user;
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(isEditing ? updateUserSchema : createUserSchema),
    defaultValues: {
      email: user?.email || '',
      password: '',
      fullName: user?.fullName || '',
      role: user?.role || 'viewer',
      restaurantId: user?.restaurantId || null,
      isActive: user?.isActive ?? true,
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && user) {
        const updateData: Record<string, unknown> = {
          fullName: data.fullName || undefined,
          role: data.role,
          restaurantId: data.restaurantId || null,
          isActive: data.isActive,
        };
        // Only include password if provided
        if (data.password && data.password.length > 0) {
          updateData.password = data.password;
        }
        await updateMutation.mutateAsync({ id: user.id, data: updateData });
      } else {
        await createMutation.mutateAsync({
          email: data.email,
          password: data.password || '',
          fullName: data.fullName,
          role: data.role,
          restaurantId: data.restaurantId || null,
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

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Email <span className="text-rose-400">*</span>
        </label>
        <input
          type="email"
          {...register('email')}
          disabled={isEditing}
          className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-rose-400">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Password {!isEditing && <span className="text-rose-400">*</span>}
          {isEditing && <span className="text-slate-500 text-xs ml-2">(leave empty to keep current)</span>}
        </label>
        <input
          type="password"
          {...register('password')}
          placeholder={isEditing ? '••••••••' : ''}
          className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-rose-400">{errors.password.message}</p>
        )}
      </div>

      {/* Full Name */}
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Full Name
        </label>
        <input
          type="text"
          {...register('fullName')}
          className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
        {errors.fullName && (
          <p className="mt-1 text-xs text-rose-400">{errors.fullName.message}</p>
        )}
      </div>

      {/* Role */}
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Role <span className="text-rose-400">*</span>
        </label>
        <select
          {...register('role')}
          className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          <option value="viewer">Viewer</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        {errors.role && (
          <p className="mt-1 text-xs text-rose-400">{errors.role.message}</p>
        )}
      </div>

      {/* Restaurant (only for manager/viewer) */}
      {selectedRole !== 'admin' && (
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">
            Restaurant
          </label>
          <select
            {...register('restaurantId')}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            <option value="">None</option>
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name} ({restaurant.city})
              </option>
            ))}
          </select>
          {errors.restaurantId && (
            <p className="mt-1 text-xs text-rose-400">{errors.restaurantId.message}</p>
          )}
        </div>
      )}

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
            Active account
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
          className="flex-1 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {isLoading && (
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {isEditing ? 'Update User' : 'Create User'}
        </button>
      </div>
    </form>
  );
}
