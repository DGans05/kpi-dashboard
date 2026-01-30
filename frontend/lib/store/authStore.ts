"use client";

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { type User, logout as apiLogout } from '../api/auth';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

const withDevtools =
  process.env.NODE_ENV !== 'production'
    ? devtools<AuthState>
    : ((fn: any) => fn);

export const useAuthStore = create<AuthState>()(
  withDevtools(
    persist(
      (set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,

        setUser: (user: User | null) =>
          set({
            user,
            isAuthenticated: user !== null,
          }),

        setLoading: (loading: boolean) =>
          set({
            isLoading: loading,
          }),

        logout: async () => {
          // Optimistically set loading while logging out
          set({ isLoading: true });
          try {
            await apiLogout();
          } finally {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        },
      }),
      {
        name: 'auth-store',
        // Only persist the user object; derived flags are recomputed
        partialize: (state) => ({
          user: state.user,
        }),
      },
    ),
  ),
);

