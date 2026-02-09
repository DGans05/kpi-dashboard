"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  role: "admin" | "manager" | "viewer";
  restaurantId: string | null;
  isActive: boolean;
  restaurant?: {
    id: string;
    name: string;
    city: string;
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
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
          set({ isLoading: true });
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        },
      }),
      {
        name: "auth-store",
        partialize: (state) => ({ user: state.user }),
      }
    ),
    { enabled: process.env.NODE_ENV !== "production" }
  )
);

