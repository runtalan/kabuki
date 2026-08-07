const cacheStore = new Map<
  string,
  { data: any; expiresAt: number }
>();

export async function cache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const cached = cacheStore.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }

  try {
    const data = await fetcher();
    cacheStore.set(key, {
      data,
      expiresAt: now + ttlSeconds * 1000,
    });
    return data;
  } catch (error) {
    if (cached) {
      console.warn(`Fetch failed for ${key}, returning stale cache`);
      return cached.data as T;
    }
    throw error;
  }
}

export function invalidateCache(key: string): void {
  cacheStore.delete(key);
}

export function clearCache(): void {
  cacheStore.clear();
}
