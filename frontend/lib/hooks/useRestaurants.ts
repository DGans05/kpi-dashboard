/**
 * Restaurant Hooks – Convex backend
 */

"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export type Restaurant = {
  id: string;
  name: string;
  city: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
};

export type CreateRestaurantDTO = { name: string; city?: string; timezone?: string };
export type UpdateRestaurantDTO = { name?: string; city?: string; timezone?: string; isActive?: boolean };

export function useRestaurants(): {
  data: Restaurant[];
  isLoading: boolean;
  error: null;
  refetch: () => void;
} {
  const list = useQuery(api.restaurants.list);
  const data: Restaurant[] = Array.isArray(list) ? list : [];
  return {
    data,
    isLoading: list === undefined,
    error: null,
    refetch: () => {},
  };
}

export function useRestaurant(id: string | undefined) {
  const r = useQuery(api.restaurants.get, id ? { id: id as Id<"restaurants"> } : "skip");
  return {
    data: r ?? undefined,
    isLoading: !!id && r === undefined,
    error: null,
  };
}

export function useCreateRestaurant() {
  const create = useMutation(api.restaurants.create);
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = useCallback(
    async (data: CreateRestaurantDTO) => {
      setIsPending(true);
      try {
        return await create({
          name: data.name,
          city: data.city,
          timezone: data.timezone,
        });
      } finally {
        setIsPending(false);
      }
    },
    [create]
  );
  return { mutateAsync, isPending, error: null as Error | null };
}

export function useUpdateRestaurant() {
  const update = useMutation(api.restaurants.update);
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = useCallback(
    async ({ id, data }: { id: string; data: UpdateRestaurantDTO }) => {
      setIsPending(true);
      try {
        return await update({
          id: id as Id<"restaurants">,
          name: data.name,
          city: data.city,
          timezone: data.timezone,
          isActive: data.isActive,
        });
      } finally {
        setIsPending(false);
      }
    },
    [update]
  );
  return { mutateAsync, isPending, error: null as Error | null };
}

export function useDeleteRestaurant() {
  const remove = useMutation(api.restaurants.remove);
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = useCallback(
    async (id: string) => {
      setIsPending(true);
      try {
        return await remove({ id: id as Id<"restaurants"> });
      } finally {
        setIsPending(false);
      }
    },
    [remove]
  );
  return { mutateAsync, isPending, error: null as Error | null };
}
