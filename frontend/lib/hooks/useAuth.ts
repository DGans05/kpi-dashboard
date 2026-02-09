"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore, type User } from "../store/authStore";

export function useLogin() {
  const setUser = useAuthStore((state) => state.setUser);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuthActions();

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      await signIn("password", { flow: "signIn", email, password });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Invalid credentials";
      const message =
        raw === "InvalidAccountId"
          ? "No account with this email. Please register first."
          : raw === "InvalidSecret"
            ? "Invalid password."
            : raw;
      setError(message);
      throw err;
    }
  };

  return { login, isLoading: false, error };
}

export function useRegister() {
  const setUser = useAuthStore((state) => state.setUser);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuthActions();

  const register = async (email: string, password: string, fullName?: string) => {
    setError(null);
    try {
      await signIn("password", {
        flow: "signUp",
        email,
        password,
        name: fullName ?? email.split("@")[0],
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Registration failed";
      const message =
        raw === "InvalidAccountId"
          ? "An account with this email already exists. Sign in instead."
          : raw;
      setError(message);
      throw err;
    }
  };

  return { register, isLoading: false, error };
}

export function useLogout() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const { signOut } = useAuthActions();

  const logout = async () => {
    await signOut();
    setUser(null);
    router.push("/login");
  };

  return { logout, isLoading: false };
}

export function useCurrentUser() {
  const router = useRouter();
  const userFromStore = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const data = useQuery(api.users.getCurrentUser);
  const isLoading = data === undefined;

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  useEffect(() => {
    if (data !== undefined) {
      setUser(
        data && typeof data === "object" && "id" in data && "role" in data
          ? (data as User)
          : null
      );
    }
  }, [data, setUser]);

  useEffect(() => {
    if (data === null && !isLoading) {
      setUser(null);
    }
  }, [data, isLoading, setUser]);

  const raw = data ?? userFromStore;
  const user: User | null =
    raw && typeof raw === "object" && "id" in raw && "role" in raw
      ? (raw as User)
      : null;

  return {
    user,
    isLoading,
    error: null,
    refetch: () => {},
  };
}

export function useAuthGuard(requiredRoles?: Array<"admin" | "manager" | "viewer">) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  const requiredRolesSet = useMemo(
    () => new Set(requiredRoles ?? []),
    [requiredRoles?.join("|") ?? ""]
  );

  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push("/login");
      setIsAuthorized(false);
      return;
    }

    if (requiredRolesSet.size > 0) {
      if (!user || !requiredRolesSet.has(user.role)) {
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
