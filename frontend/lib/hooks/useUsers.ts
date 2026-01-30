/**
 * User Hooks
 * TanStack Query hooks for user management
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as usersApi from '../api/users';
import type { User, CreateUserDTO, UpdateUserDTO } from '../api/users';

/**
 * Hook to fetch all users
 */
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getUsers,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to fetch single user
 */
export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.getUser(id!),
    enabled: !!id,
  });
}

/**
 * Hook to create user
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserDTO) => usersApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * Hook to update user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDTO }) =>
      usersApi.updateUser(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * Hook to delete user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * Hook to change password
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      usersApi.changePassword(currentPassword, newPassword),
  });
}
