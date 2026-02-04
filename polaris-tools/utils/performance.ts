/**
 * Performance Utilities
 * 性能优化工具 - 防抖、节流、批量请求等
 */

import React from 'react';

/**
 * Debounce function - delays execution until after wait time has elapsed
 * 防抖函数 - 延迟执行直到等待时间结束
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - limits execution to once per wait time
 * 节流函数 - 限制执行频率为每个等待时间一次
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastResult: ReturnType<T>;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      lastResult = func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, wait);
    }
    return lastResult;
  };
}

/**
 * React hook for debounced value
 * React 防抖值钩子
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * React hook for debounced callback
 * React 防抖回调钩子
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const callbackRef = React.useRef(callback);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return React.useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

/**
 * React hook for throttled callback
 * React 节流回调钩子
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const callbackRef = React.useRef(callback);
  const throttlingRef = React.useRef(false);

  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return React.useCallback(
    (...args: Parameters<T>) => {
      if (!throttlingRef.current) {
        callbackRef.current(...args);
        throttlingRef.current = true;

        setTimeout(() => {
          throttlingRef.current = false;
        }, delay);
      }
    },
    [delay]
  );
}

/**
 * Batch request manager - combines multiple requests into batches
 * 批量请求管理器 - 将多个请求合并为批次
 */
export class BatchRequestManager<T, R> {
  private queue: Array<{
    item: T;
    resolve: (value: R) => void;
    reject: (error: any) => void;
  }> = [];
  private timeout: NodeJS.Timeout | null = null;
  private batchSize: number;
  private batchDelay: number;
  private processor: (items: T[]) => Promise<R[]>;

  constructor(
    processor: (items: T[]) => Promise<R[]>,
    options: {
      batchSize?: number;
      batchDelay?: number;
    } = {}
  ) {
    this.processor = processor;
    this.batchSize = options.batchSize || 10;
    this.batchDelay = options.batchDelay || 50;
  }

  /**
   * Add item to batch queue
   */
  add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject });

      // Process immediately if batch is full
      if (this.queue.length >= this.batchSize) {
        this.processBatch();
      } else {
        // Schedule batch processing
        if (this.timeout) {
          clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(() => {
          this.processBatch();
        }, this.batchDelay);
      }
    });
  }

  /**
   * Process current batch
   */
  private async processBatch(): Promise<void> {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, this.batchSize);
    const items = batch.map((b) => b.item);

    try {
      const results = await this.processor(items);

      // Resolve all promises
      batch.forEach((b, index) => {
        b.resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises
      batch.forEach((b) => {
        b.reject(error);
      });
    }
  }

  /**
   * Flush all pending requests
   */
  async flush(): Promise<void> {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    while (this.queue.length > 0) {
      await this.processBatch();
    }
  }
}

/**
 * Create a batched version of an async function
 */
export function createBatchedFunction<T, R>(
  processor: (items: T[]) => Promise<R[]>,
  options?: {
    batchSize?: number;
    batchDelay?: number;
  }
): (item: T) => Promise<R> {
  const manager = new BatchRequestManager(processor, options);
  return (item: T) => manager.add(item);
}

/**
 * Memoize function results
 * 记忆化函数结果
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    maxSize?: number;
    keyGenerator?: (...args: Parameters<T>) => string;
  } = {}
): T {
  const cache = new Map<string, ReturnType<T>>();
  const maxSize = options.maxSize || 100;
  const keyGenerator = options.keyGenerator || ((...args) => JSON.stringify(args));

  return ((...args: Parameters<T>) => {
    const key = keyGenerator(...args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);

    // Evict oldest entry if cache is full
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * React hook for memoized value with custom equality
 */
export function useMemoizedValue<T>(
  value: T,
  isEqual: (prev: T, next: T) => boolean = (a, b) => a === b
): T {
  const ref = React.useRef<T>(value);

  if (!isEqual(ref.current, value)) {
    ref.current = value;
  }

  return ref.current;
}

/**
 * Lazy load component with retry logic
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
  } = {}
): React.LazyExoticComponent<T> {
  const maxRetries = options.maxRetries || 3;
  const retryDelay = options.retryDelay || 1000;

  return React.lazy(async () => {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await componentImport();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay * (i + 1)));
        }
      }
    }

    throw lastError;
  });
}

/**
 * Request deduplication - prevents duplicate concurrent requests
 * 请求去重 - 防止重复的并发请求
 */
export class RequestDeduplicator<T> {
  private pending = new Map<string, Promise<T>>();

  async deduplicate(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Return existing promise if request is already in flight
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    // Create new promise
    const promise = fetcher().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }

  clear(): void {
    this.pending.clear();
  }
}

/**
 * Create a deduplicated version of an async function
 */
export function createDeduplicatedFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string = (...args) => JSON.stringify(args)
): T {
  const deduplicator = new RequestDeduplicator<Awaited<ReturnType<T>>>();

  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    return deduplicator.deduplicate(key, () => fn(...args));
  }) as T;
}
