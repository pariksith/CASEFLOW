"use client";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cacheStore = new Map<string, CacheEntry<unknown>>();

export function getClientCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setClientCache<T>(key: string, value: T, ttlMs = 60_000) {
  if (typeof window === "undefined") return;
  cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearClientCache(prefix?: string) {
  if (!prefix) {
    cacheStore.clear();
    return;
  }
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}

