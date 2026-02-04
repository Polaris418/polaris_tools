/**
 * Optimized API Client
 * 优化的API客户端 - 集成缓存、防抖、去重等优化
 */

import { apiCache, templateCache, statsCache, createCachedFunction } from './cache';
import { createDeduplicatedFunction, createBatchedFunction } from './performance';
import { adminApi } from '../api/adminClient';
import type { Result, PageResult } from '../types';

/**
 * Create optimized API methods with caching and deduplication
 */

// Template API with caching (templates change less frequently)
export const optimizedTemplateApi = {
  list: createCachedFunction(
    adminApi.templates.list,
    {
      cache: templateCache,
      ttl: 30 * 60 * 1000, // 30 minutes
      keyGenerator: (params) => `templates:list:${JSON.stringify(params)}`,
    }
  ),

  get: createCachedFunction(
    adminApi.templates.get,
    {
      cache: templateCache,
      ttl: 30 * 60 * 1000, // 30 minutes
      keyGenerator: (id) => `templates:get:${id}`,
    }
  ),

  // Invalidate cache after mutations
  create: async (...args: Parameters<typeof adminApi.templates.create>) => {
    const result = await adminApi.templates.create(...args);
    templateCache.clear(); // Clear all template cache
    return result;
  },

  update: async (...args: Parameters<typeof adminApi.templates.update>) => {
    const result = await adminApi.templates.update(...args);
    templateCache.clear(); // Clear all template cache
    return result;
  },

  delete: async (...args: Parameters<typeof adminApi.templates.delete>) => {
    const result = await adminApi.templates.delete(...args);
    templateCache.clear(); // Clear all template cache
    return result;
  },

  preview: adminApi.templates.preview, // Don't cache preview
  sendTest: adminApi.templates.sendTest, // Don't cache test sends
};

// Statistics API with shorter cache (data changes more frequently)
export const optimizedStatsApi = {
  dashboard: createCachedFunction(
    adminApi.monitoring.dashboard,
    {
      cache: statsCache,
      ttl: 2 * 60 * 1000, // 2 minutes
      keyGenerator: () => 'stats:dashboard',
    }
  ),

  queueStats: createCachedFunction(
    adminApi.queue.stats,
    {
      cache: statsCache,
      ttl: 1 * 60 * 1000, // 1 minute
      keyGenerator: () => 'stats:queue',
    }
  ),

  emailStats: createCachedFunction(
    adminApi.emails.statistics,
    {
      cache: statsCache,
      ttl: 2 * 60 * 1000, // 2 minutes
      keyGenerator: () => 'stats:email',
    }
  ),

  subscriptionStats: createCachedFunction(
    adminApi.subscriptions.stats,
    {
      cache: statsCache,
      ttl: 5 * 60 * 1000, // 5 minutes
      keyGenerator: () => 'stats:subscription',
    }
  ),
};

// Email logs API with deduplication (prevent duplicate concurrent requests)
export const optimizedEmailApi = {
  list: createDeduplicatedFunction(
    adminApi.emails.list,
    (params) => `emails:list:${JSON.stringify(params)}`
  ),

  get: createDeduplicatedFunction(
    adminApi.emails.get,
    (id) => `emails:get:${id}`
  ),

  retry: adminApi.emails.retry,
  batchDelete: adminApi.emails.batchDelete,
  batchRetry: adminApi.emails.batchRetry,
  cleanup: adminApi.emails.cleanup,
  statistics: optimizedStatsApi.emailStats,
};

// Queue API with deduplication
export const optimizedQueueApi = {
  list: createDeduplicatedFunction(
    adminApi.queue.list,
    (params) => `queue:list:${JSON.stringify(params)}`
  ),

  stats: optimizedStatsApi.queueStats,
  retry: adminApi.queue.retry,
  cancel: adminApi.queue.cancel,
  updatePriority: adminApi.queue.updatePriority,
  pause: adminApi.queue.pause,
  resume: adminApi.queue.resume,
  getConfig: adminApi.queue.getConfig,
  updateConfig: adminApi.queue.updateConfig,
};

// Suppression API with caching
export const optimizedSuppressionApi = {
  list: createCachedFunction(
    adminApi.suppression.list,
    {
      cache: apiCache,
      ttl: 10 * 60 * 1000, // 10 minutes
      keyGenerator: (params) => `suppression:list:${JSON.stringify(params)}`,
    }
  ),

  check: createCachedFunction(
    adminApi.suppression.check,
    {
      cache: apiCache,
      ttl: 10 * 60 * 1000, // 10 minutes
      keyGenerator: (email) => `suppression:check:${email}`,
    }
  ),

  // Invalidate cache after mutations
  add: async (...args: Parameters<typeof adminApi.suppression.add>) => {
    const result = await adminApi.suppression.add(...args);
    apiCache.clear(); // Clear suppression cache
    return result;
  },

  remove: async (...args: Parameters<typeof adminApi.suppression.remove>) => {
    const result = await adminApi.suppression.remove(...args);
    apiCache.clear(); // Clear suppression cache
    return result;
  },

  export: adminApi.suppression.export,
};

// Subscription API with caching
export const optimizedSubscriptionApi = {
  list: createCachedFunction(
    adminApi.subscriptions.list,
    {
      cache: apiCache,
      ttl: 5 * 60 * 1000, // 5 minutes
      keyGenerator: (params) => `subscriptions:list:${JSON.stringify(params)}`,
    }
  ),

  get: createCachedFunction(
    adminApi.subscriptions.get,
    {
      cache: apiCache,
      ttl: 5 * 60 * 1000, // 5 minutes
      keyGenerator: (userId) => `subscriptions:get:${userId}`,
    }
  ),

  stats: optimizedStatsApi.subscriptionStats,
  analytics: adminApi.subscriptions.analytics,

  // Invalidate cache after mutations
  update: async (...args: Parameters<typeof adminApi.subscriptions.update>) => {
    const result = await adminApi.subscriptions.update(...args);
    apiCache.clear(); // Clear subscription cache
    return result;
  },

  export: adminApi.subscriptions.export,
};

// Monitoring API with caching
export const optimizedMonitoringApi = {
  dashboard: optimizedStatsApi.dashboard,

  current: createCachedFunction(
    adminApi.monitoring.current,
    {
      cache: statsCache,
      ttl: 1 * 60 * 1000, // 1 minute
      keyGenerator: () => 'monitoring:current',
    }
  ),

  range: createCachedFunction(
    adminApi.monitoring.range,
    {
      cache: statsCache,
      ttl: 5 * 60 * 1000, // 5 minutes
      keyGenerator: (start, end) => `monitoring:range:${start}:${end}`,
    }
  ),

  recent: createCachedFunction(
    adminApi.monitoring.recent,
    {
      cache: statsCache,
      ttl: 2 * 60 * 1000, // 2 minutes
      keyGenerator: (hours) => `monitoring:recent:${hours}`,
    }
  ),

  metrics: createCachedFunction(
    adminApi.monitoring.metrics,
    {
      cache: statsCache,
      ttl: 5 * 60 * 1000, // 5 minutes
      keyGenerator: (timeRange) => `monitoring:metrics:${JSON.stringify(timeRange)}`,
    }
  ),

  alerts: adminApi.monitoring.alerts,
  configureAlerts: adminApi.monitoring.configureAlerts,
  flush: adminApi.monitoring.flush,
  resume: adminApi.monitoring.resume,
  pause: adminApi.monitoring.pause,
};

/**
 * Batch operations helper
 * Combines multiple API calls into batches for better performance
 */
export const batchOperations = {
  /**
   * Batch get templates by IDs
   */
  getTemplates: createBatchedFunction(
    async (ids: number[]) => {
      const results = await Promise.all(
        ids.map((id) => optimizedTemplateApi.get(id))
      );
      return results.map((r) => r.data);
    },
    {
      batchSize: 10,
      batchDelay: 50,
    }
  ),

  /**
   * Batch check suppression status
   */
  checkSuppressions: createBatchedFunction(
    async (emails: string[]) => {
      const results = await Promise.all(
        emails.map((email) => optimizedSuppressionApi.check(email))
      );
      return results.map((r) => r.data);
    },
    {
      batchSize: 20,
      batchDelay: 100,
    }
  ),
};

/**
 * Cache management utilities
 */
export const cacheManager = {
  /**
   * Clear all caches
   */
  clearAll: () => {
    apiCache.clear();
    templateCache.clear();
    statsCache.clear();
  },

  /**
   * Clear specific cache type
   */
  clear: (type: 'api' | 'template' | 'stats') => {
    switch (type) {
      case 'api':
        apiCache.clear();
        break;
      case 'template':
        templateCache.clear();
        break;
      case 'stats':
        statsCache.clear();
        break;
    }
  },

  /**
   * Get cache statistics
   */
  stats: () => ({
    api: apiCache.stats(),
    template: templateCache.stats(),
    stats: statsCache.stats(),
  }),

  /**
   * Clear expired entries from all caches
   */
  clearExpired: () => {
    apiCache.clearExpired();
    templateCache.clearExpired();
    statsCache.clearExpired();
  },
};

/**
 * Prefetch data for better UX
 */
export const prefetch = {
  /**
   * Prefetch dashboard data
   */
  dashboard: async () => {
    await Promise.all([
      optimizedStatsApi.dashboard(),
      optimizedStatsApi.queueStats(),
      optimizedStatsApi.emailStats(),
    ]);
  },

  /**
   * Prefetch template list
   */
  templates: async () => {
    await optimizedTemplateApi.list({ page: 1, size: 20 });
  },

  /**
   * Prefetch monitoring data
   */
  monitoring: async () => {
    await Promise.all([
      optimizedMonitoringApi.dashboard(),
      optimizedMonitoringApi.recent(24),
    ]);
  },
};
