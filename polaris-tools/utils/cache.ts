/**
 * Cache Utility
 * 缓存工具 - 用于缓存API响应和计算结果
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  maxSize?: number; // Maximum number of entries (default: 100)
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;
  private maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes
    this.maxSize = options.maxSize || 100;
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  stats(): {
    size: number;
    maxSize: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.expiresAt - now,
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries,
    };
  }
}

// Create singleton instances for different cache types
export const apiCache = new CacheManager({
  ttl: 5 * 60 * 1000, // 5 minutes for API responses
  maxSize: 100,
});

export const templateCache = new CacheManager({
  ttl: 30 * 60 * 1000, // 30 minutes for templates (they change less frequently)
  maxSize: 50,
});

export const statsCache = new CacheManager({
  ttl: 2 * 60 * 1000, // 2 minutes for statistics (need fresher data)
  maxSize: 20,
});

/**
 * Create a cached version of an async function
 */
export function createCachedFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    cache?: CacheManager;
    keyGenerator?: (...args: Parameters<T>) => string;
    ttl?: number;
  } = {}
): T {
  const cache = options.cache || apiCache;
  const keyGenerator = options.keyGenerator || ((...args) => JSON.stringify(args));

  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);

    // Check cache first
    const cached = cache.get<Awaited<ReturnType<T>>>(key);
    if (cached !== null) {
      return cached;
    }

    // Call original function
    const result = await fn(...args);

    // Store in cache
    cache.set(key, result, options.ttl);

    return result;
  }) as T;
}

/**
 * React hook for using cached data
 */
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    cache?: CacheManager;
    ttl?: number;
    enabled?: boolean;
  } = {}
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const cache = options.cache || apiCache;
  const enabled = options.enabled !== false;

  const fetchData = React.useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cached = cache.get<T>(key);
      if (cached !== null) {
        setData(cached);
        setLoading(false);
        return;
      }

      // Fetch fresh data
      const result = await fetcher();
      cache.set(key, result, options.ttl);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, cache, options.ttl, enabled]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

// Auto-cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.clearExpired();
    templateCache.clearExpired();
    statsCache.clearExpired();
  }, 5 * 60 * 1000);
}

export default CacheManager;
