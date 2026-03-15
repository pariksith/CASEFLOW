"use client";

import { useState, useEffect, useCallback } from "react";
import { Case } from "@/types/case.types";
import { getClientCache, setClientCache } from "@/lib/cache/clientDataCache";

interface UseCasesReturn {
  cases: Case[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  totalAmount: number;
  urgentCount: number;
  activeCount: number;
}

export function useCases(): UseCasesReturn {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = useCallback(async () => {
    const advocateId =
      typeof window !== "undefined"
        ? localStorage.getItem("cf_user_id")
        : null;

    if (!advocateId) {
      setLoading(false);
      return;
    }

    const cacheKey = `cases:summary:${advocateId}`;
    const cachedCases = getClientCache<Case[]>(cacheKey);
    const hasCachedCases = Boolean(cachedCases);
    if (cachedCases) {
      setCases(cachedCases);
      setLoading(false);
    }

    if (!hasCachedCases) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch(`/api/cases?advocate_id=${advocateId}&view=summary`);
      if (!res.ok) throw new Error("Failed to fetch cases");
      const data = await res.json();
      const nextCases = data.cases || [];
      setCases(nextCases);
      setClientCache(cacheKey, nextCases, 45_000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load cases");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const totalAmount = cases.reduce(
    (sum, c) => sum + (c.case_financials?.cheque_amount || 0),
    0
  );

  const urgentCount = cases.filter((c) => {
    if (!c.complaint_deadline) return false;
    const days =
      (new Date(c.complaint_deadline).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 3;
  }).length;

  const activeCount = cases.filter(
    (c) => !["closed", "complaint_filed"].includes(c.stage)
  ).length;

  return {
    cases,
    loading,
    error,
    refetch: fetchCases,
    totalAmount,
    urgentCount,
    activeCount,
  };
}
