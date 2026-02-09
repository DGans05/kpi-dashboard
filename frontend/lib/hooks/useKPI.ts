/**
 * KPI Hooks – Convex backend
 */

"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export type KPIEntry = {
  id: string;
  restaurantId: string;
  entryDate: string;
  revenue: number;
  labourCost: number;
  labourCostPercent: number;
  foodCost: number;
  foodCostPercent: number;
  orders: number;
  avgTicket: number;
  createdAt: string;
  restaurant?: { id: string; name: string; city: string };
};

export type CreateKPIEntryDTO = {
  restaurantId: string;
  entryDate: string;
  revenue: number;
  labourCost: number;
  foodCost: number;
  orders: number;
};

export type UpdateKPIEntryDTO = {
  revenue?: number;
  labourCost?: number;
  foodCost?: number;
  orders?: number;
};

export type DashboardSummary = {
  restaurantId: string;
  restaurantName: string;
  dateRange: { startDate: string; endDate: string };
  current: {
    totalRevenue: number;
    totalOrders: number;
    avgTicket: number;
    labourCostPercent: number;
    foodCostPercent: number;
  };
  trends: { revenue: number; orders: number; labourCost: number; foodCost: number };
  alerts: { labourCost: "good" | "warning" | "critical"; foodCost: "good" | "warning" | "critical" };
  targets: { labourCost: number; foodCost: number };
  chartData: Array<{
    date: string;
    revenue: number;
    labourCost: number;
    foodCost: number;
    orders: number;
    labourCostPercent: number;
    foodCostPercent: number;
  }>;
};

export function useKPIEntries(
  restaurantId?: string,
  startDate?: string,
  endDate?: string
): { data: KPIEntry[]; isLoading: boolean; error: null; refetch: () => void } {
  const entries = useQuery(api.kpi.listEntries, {
    restaurantId: restaurantId as Id<"restaurants"> | undefined,
    startDate,
    endDate,
  });
  const data: KPIEntry[] = Array.isArray(entries) ? entries : [];
  return {
    data,
    isLoading: entries === undefined,
    error: null,
    refetch: () => {},
  };
}

export function useKPIEntry(id: string | undefined) {
  const entry = useQuery(
    api.kpi.getEntry,
    id ? { id: id as Id<"kpi_entries"> } : "skip"
  );
  return {
    data: entry ?? undefined,
    isLoading: id !== undefined && entry === undefined,
    error: null,
  };
}

export function useCreateKPIEntry() {
  const create = useMutation(api.kpi.createEntry);
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = useCallback(
    async (data: CreateKPIEntryDTO) => {
      setIsPending(true);
      try {
        return await create({
          restaurantId: data.restaurantId as Id<"restaurants">,
          entryDate: data.entryDate,
          revenue: data.revenue,
          labourCost: data.labourCost,
          foodCost: data.foodCost,
          orders: data.orders,
        });
      } finally {
        setIsPending(false);
      }
    },
    [create]
  );
  return { mutateAsync, isPending, error: null as Error | null };
}

export function useUpdateKPIEntry() {
  const update = useMutation(api.kpi.updateEntry);
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = useCallback(
    async ({ id, data }: { id: string; data: UpdateKPIEntryDTO }) => {
      setIsPending(true);
      try {
        return await update({
          id: id as Id<"kpi_entries">,
          revenue: data.revenue,
          labourCost: data.labourCost,
          foodCost: data.foodCost,
          orders: data.orders,
        });
      } finally {
        setIsPending(false);
      }
    },
    [update]
  );
  return { mutateAsync, isPending, error: null as Error | null };
}

export function useDeleteKPIEntry() {
  const remove = useMutation(api.kpi.deleteEntry);
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = useCallback(
    async (id: string) => {
      setIsPending(true);
      try {
        return await remove({ id: id as Id<"kpi_entries"> });
      } finally {
        setIsPending(false);
      }
    },
    [remove]
  );
  return { mutateAsync, isPending, error: null as Error | null };
}

export function useDashboardSummary(
  restaurantId: string | undefined,
  startDate?: string,
  endDate?: string
): {
  data: DashboardSummary | undefined;
  isLoading: boolean;
  error: null;
} {
  const summary = useQuery(
    api.kpi.getDashboard,
    restaurantId && startDate && endDate
      ? {
          restaurantId: restaurantId as Id<"restaurants">,
          startDate,
          endDate,
        }
      : "skip"
  );
  const data: DashboardSummary | undefined =
    summary && typeof summary === "object" && "restaurantName" in summary
      ? (summary as DashboardSummary)
      : undefined;
  return {
    data,
    isLoading: !!restaurantId && !!startDate && !!endDate && summary === undefined,
    error: null,
  };
}

export function useAggregatedKPIData(
  restaurantId: string | undefined,
  startDate?: string,
  endDate?: string,
  groupBy: "day" | "week" | "month" = "day"
) {
  const data = useQuery(
    api.kpi.getAggregated,
    startDate && endDate
      ? {
          restaurantId: restaurantId as Id<"restaurants"> | undefined,
          startDate,
          endDate,
          groupBy,
        }
      : "skip"
  );
  return {
    data: data ?? [],
    isLoading: !!startDate && !!endDate && data === undefined,
    error: null,
  };
}
