"use client";

import { useState, useEffect, useCallback } from "react";
import { Case } from "@/types/case.types";
import { getClientCache, setClientCache } from "@/lib/cache/clientDataCache";

interface UseCaseReturn {
  caseData: Case | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateStage: (stage: string, extra?: Record<string, string>) => Promise<void>;
}

export function useCase(caseId: string | null): UseCaseReturn {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCase = useCallback(async () => {
    if (!caseId) {
      setLoading(false);
      return;
    }
    const cacheKey = `case:${caseId}:full`;
    const cachedCase = getClientCache<Case>(cacheKey);
    const hasCachedCase = Boolean(cachedCase);
    if (cachedCase) {
      setCaseData(cachedCase);
      setLoading(false);
    }
    if (!hasCachedCase) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}`);
      if (!res.ok) throw new Error("Case not found");
      const data = await res.json();
      const nextCase = data.case || null;
      setCaseData(nextCase);
      if (nextCase) {
        setClientCache(cacheKey, nextCase, 45_000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load case");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  const updateStage = useCallback(
    async (stage: string, extra?: Record<string, string>) => {
      if (!caseId) return;
      try {
        const res = await fetch(`/api/cases/${caseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage, ...extra }),
        });
        if (!res.ok) throw new Error("Update failed");
        const data = await res.json();
        const nextCase = data.case || null;
        setCaseData(nextCase);
        if (nextCase) {
          setClientCache(`case:${caseId}:full`, nextCase, 45_000);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Update failed");
        throw err;
      }
    },
    [caseId]
  );

  return { caseData, loading, error, refetch: fetchCase, updateStage };
}
