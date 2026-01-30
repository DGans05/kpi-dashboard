"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';

import { login as apiLogin, getCurrentUser, type LoginResponse } from '../api/auth';
import { ApiError } from '../api/client';
import { useAuthStore } from '../store/authStore';

// Hook: useLogin
export function useLogin() {
  const setUser = useAuthStore((state) => state.setUser);
  const [error, setError] = useState<string | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (params: { email: string; password: string }) =>
      apiLogin(params.email, params.password),
    onSuccess: (data: LoginResponse) => {
      setError(null);
      setUser(data.user);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed. Please try again.');
      }
    },
  });

  const login = (email: string, password: string) =>
    mutateAsync({ email, password });

  return {
    login,
    isLoading: isPending,
    error,
  };
}

// Hook: useLogout
export function useLogout() {
  const router = useRouter();
  const storeLogout = useAuthStore((state) => state.logout);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      // Ensure backend logout is called and local state is cleared
      // storeLogout already calls the API logout under the hood.
      await storeLogout();
    },
    onSuccess: () => {
      router.push('/login');
    },
  });

  const logout = () => mutateAsync();

  return {
    logout,
    isLoading: isPending,
  };
}

// Hook: useCurrentUser
export function useCurrentUser() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const storeIsLoading = useAuthStore((state) => state.isLoading);

  const {
    data,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (storeIsLoading !== isPending) {
      setLoading(isPending);
    }
  }, [isPending, storeIsLoading]);

  useEffect(() => {
    if (data) {
      setUser(data);
    }
  }, [data]);

  useEffect(() => {
    if (!error) return;

    if (error instanceof ApiError && error.status === 401) {
      // Unauthorized – clear auth state and redirect to login
      setUser(null);
      router.push('/login');
    }
  }, [error, router]);

  return {
    user: data ?? user,
    isLoading: isPending,
    error,
    refetch,
  };
}

// Hook: useAuthGuard
export function useAuthGuard(requiredRoles?: Array<'admin' | 'manager' | 'viewer'>) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  const requiredRolesKey = useMemo(
    () => (requiredRoles ? requiredRoles.join('|') : ''),
    [requiredRoles],
  );
  const requiredRolesSet = useMemo(
    () => new Set(requiredRoles ?? []),
    [requiredRolesKey],
  );

  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      setIsAuthorized(false);
      return;
    }

    if (requiredRolesSet.size > 0) {
      if (!user || !requiredRolesSet.has(user.role)) {
        // Authenticated but wrong role – do not redirect, mark unauthorized
        setIsAuthorized(false);
        return;
      }
    }

    setIsAuthorized(true);
  }, [isAuthenticated, isLoading, requiredRolesSet, router, user]);

  const guardLoading = isLoading || (!isAuthenticated && !isAuthorized);

  return {
    isAuthorized,
    isLoading: guardLoading,
  };
}

