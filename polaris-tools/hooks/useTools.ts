/**
 * useTools Hook
 * Fetches and manages tool data from the API
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 */

import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { ToolQueryRequest, ToolResponse, PageResult } from '../types';

interface UseToolsResult {
  data: PageResult<ToolResponse> | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch paginated tool list with filters
 * @param params - Query parameters for filtering and pagination
 * @returns Tool data, loading state, error, and refetch function
 */
export function useTools(params?: ToolQueryRequest): UseToolsResult {
  const [data, setData] = useState<PageResult<ToolResponse> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchTools() {
      try {
        setLoading(true);
        setError(null);
        
        const result = await apiClient.tools.list(params);
        
        if (!cancelled) {
          setData(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch tools'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTools();

    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(params), refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return { data, loading, error, refetch };
}

interface UseToolResult {
  data: ToolResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch a single tool by ID
 * @param id - Tool ID
 * @returns Tool data, loading state, error, and refetch function
 */
export function useTool(id: number | null): UseToolResult {
  const [data, setData] = useState<ToolResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0);

  useEffect(() => {
    if (id === null) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function fetchTool() {
      try {
        setLoading(true);
        setError(null);
        
        const result = await apiClient.tools.get(id);
        
        if (!cancelled) {
          setData(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch tool'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTool();

    return () => {
      cancelled = true;
    };
  }, [id, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return { data, loading, error, refetch };
}

interface UseRecentToolsResult {
  data: ToolResponse[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch recently used tools
 * @param limit - Maximum number of tools to fetch (default: 10)
 * @returns Recent tools data, loading state, error, and refetch function
 */
export function useRecentTools(limit: number = 10): UseRecentToolsResult {
  const [data, setData] = useState<ToolResponse[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchRecentTools() {
      try {
        setLoading(true);
        setError(null);
        
        const result = await apiClient.usage.recent(limit);
        
        if (!cancelled) {
          setData(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch recent tools'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchRecentTools();

    return () => {
      cancelled = true;
    };
  }, [limit, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return { data, loading, error, refetch };
}

interface UsePopularToolsResult {
  data: ToolResponse[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch popular tools
 * @param limit - Maximum number of tools to fetch (default: 10)
 * @returns Popular tools data, loading state, error, and refetch function
 */
export function usePopularTools(limit: number = 10): UsePopularToolsResult {
  const [data, setData] = useState<ToolResponse[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchPopularTools() {
      try {
        setLoading(true);
        setError(null);
        
        const result = await apiClient.usage.popular(limit);
        
        if (!cancelled) {
          setData(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch popular tools'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPopularTools();

    return () => {
      cancelled = true;
    };
  }, [limit, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return { data, loading, error, refetch };
}
