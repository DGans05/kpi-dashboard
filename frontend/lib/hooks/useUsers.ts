/**
 * User Hooks (admin) – Convex backend
 * Users are created via Convex Auth (sign up). Admin can list, get, update role/restaurant.
 */

"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export type User = {
  id: string;
  email: string;
  fullName: string | null;
  role: "admin" | "manager" | "viewer";
  restaurantId: string | null;
  isActive: boolean;
  createdAt: string;
  restaurant?: { id: string; name: string; city: string };
};

export type UpdateUserDTO = {
  fullName?: string;
  role?: "admin" | "manager" | "viewer";
  restaurantId?: string | null;
  isActive?: boolean;
};

export function useUsers(): { data: User[]; isLoading: boolean; error: null; refetch: () => void } {
  const list = useQuery(api.usersAdmin.list);
  const data: User[] = Array.isArray(list) ? list : [];
  return {
    data,
    isLoading: list === undefined,
    error: null,
    refetch: () => {},
  };
}

export function useUser(id: string | undefined) {
  const u = useQuery(api.usersAdmin.get, id ? { id: id as Id<"users"> } : "skip");
  return {
    data: u ?? undefined,
    isLoading: !!id && u === undefined,
    error: null,
  };
}

export function useUpdateUser() {
  const update = useMutation(api.usersAdmin.update);
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = useCallback(
    async ({ id, data }: { id: string; data: UpdateUserDTO }) => {
      setIsPending(true);
      try {
        return await update({
          id: id as Id<"users">,
          fullName: data.fullName,
          role: data.role,
          restaurantId: data.restaurantId as Id<"restaurants"> | null | undefined,
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

/** Create user is not supported – users sign up via Convex Auth. Admin can then update role/restaurant. */
export function useCreateUser() {
  return {
    mutateAsync: async (_data: unknown) => {
      throw new Error("Create user via registration; then set role in Admin.");
    },
    isPending: false,
    error: null as Error | null,
  };
}

export function useDeleteUser() {
  return {
    mutateAsync: async (_id: string) => {
      throw new Error("Delete user not implemented in Convex migration.");
    },
    isPending: false,
  };
}

/** Change password: use Convex Auth password reset flow or re-sign up. */
export function useChangePassword() {
  return {
    mutateAsync: async (_args: { currentPassword: string; newPassword: string }) => {
      throw new Error("Change password: use Convex Auth or sign out and reset.");
    },
    isPending: false,
    isSuccess: false,
    error: null as Error | null,
  };
}
