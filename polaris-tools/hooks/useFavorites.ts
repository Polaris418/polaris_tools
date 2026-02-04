/**
 * useFavorites Hook
 * Fetches and manages user favorite tools from the API
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { ToolResponse } from '../types';

interface UseFavoritesResult {
  data: ToolResponse[] | null;
  loading: boolean;
  error: Error | null;
  addFavorite: (toolId: number) => Promise<void>;
  removeFavorite: (toolId: number) => Promise<void>;
  isFavorited: (toolId: number) => boolean;
  refetch: () => void;
}

/**
 * Hook to manage user's favorite tools
 * @returns Favorite tools data, loading state, error, and management functions
 */
export function useFavorites(): UseFavoritesResult {
  const [data, setData] = useState<ToolResponse[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchFavorites() {
      try {
        setLoading(true);
        setError(null);
        
        const result = await apiClient.favorites.list();
        
        if (!cancelled) {
          setData(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch favorites'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchFavorites();

    return () => {
      cancelled = true;
    };
  }, [refetchTrigger]);

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  const addFavorite = useCallback(async (toolId: number) => {
    try {
      await apiClient.favorites.add(toolId);
      // Optimistically update the local state
      refetch();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to add favorite');
    }
  }, [refetch]);

  const removeFavorite = useCallback(async (toolId: number) => {
    try {
      await apiClient.favorites.remove(toolId);
      // Optimistically update the local state
      refetch();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to remove favorite');
    }
  }, [refetch]);

  const isFavorited = useCallback((toolId: number): boolean => {
    if (!data) return false;
    return data.some(tool => tool.id === toolId);
  }, [data]);

  return { data, loading, error, addFavorite, removeFavorite, isFavorited, refetch };
}

interface UseFavoriteStatusResult {
  isFavorited: boolean;
  loading: boolean;
  error: Error | null;
  toggleFavorite: () => Promise<void>;
}

/**
 * Hook to check and toggle favorite status for a specific tool
 * @param toolId - Tool ID to check
 * @returns Favorite status, loading state, error, and toggle function
 */
export function useFavoriteStatus(toolId: number | null): UseFavoriteStatusResult {
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (toolId === null) {
      setIsFavorited(false);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function checkFavoriteStatus() {
      try {
        setLoading(true);
        setError(null);
        
        const result = await apiClient.favorites.check(toolId);
        
        if (!cancelled) {
          setIsFavorited(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to check favorite status'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    checkFavoriteStatus();

    return () => {
      cancelled = true;
    };
  }, [toolId]);

  const toggleFavorite = useCallback(async () => {
    if (toolId === null) return;

    try {
      if (isFavorited) {
        await apiClient.favorites.remove(toolId);
        setIsFavorited(false);
      } else {
        await apiClient.favorites.add(toolId);
        setIsFavorited(true);
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to toggle favorite');
    }
  }, [toolId, isFavorited]);

  return { isFavorited, loading, error, toggleFavorite };
}
