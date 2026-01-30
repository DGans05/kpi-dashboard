/**
 * Restaurant Hooks
 * TanStack Query hooks for restaurant management
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as restaurantsApi from '../api/restaurants';
import type { CreateRestaurantDTO, UpdateRestaurantDTO } from '../api/restaurants';

/**
 * Hook to fetch all restaurants
 */
export function useRestaurants() {
  return useQuery({
    queryKey: ['restaurants'],
    queryFn: restaurantsApi.getRestaurants,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch single restaurant
 */
export function useRestaurant(id: string | undefined) {
  return useQuery({
    queryKey: ['restaurants', id],
    queryFn: () => restaurantsApi.getRestaurant(id!),
    enabled: !!id,
  });
}

/**
 * Hook to create restaurant
 */
export function useCreateRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRestaurantDTO) => restaurantsApi.createRestaurant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    },
  });
}

/**
 * Hook to update restaurant
 */
export function useUpdateRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRestaurantDTO }) =>
      restaurantsApi.updateRestaurant(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['restaurants', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    },
  });
}

/**
 * Hook to delete restaurant
 */
export function useDeleteRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => restaurantsApi.deleteRestaurant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    },
  });
}
