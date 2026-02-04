/**
 * useCategories Hook
 * Fetches and manages category data from the API
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { CategoryResponse } from '../types';

interface UseCategoriesResult {
  data: CategoryResponse[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch all categories
 * @returns Category data, loading state, error, and refetch function
 */
export function useCategories(): UseCategoriesResult {
  const [data, setData] = useState<CategoryResponse[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchCategories() {
      try {
        setLoading(true);
        setError(null);
        
        const result = await apiClient.categories.list();
        
        if (!cancelled) {
          setData(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch categories'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchCategories();

    return () => {
      cancelled = true;
    };
  }, [refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return { data, loading, error, refetch };
}

interface UseCategoryResult {
  data: CategoryResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch a single category by ID
 * @param id - Category ID
 * @returns Category data, loading state, error, and refetch function
 */
export function useCategory(id: number | null): UseCategoryResult {
  const [data, setData] = useState<CategoryResponse | null>(null);
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

    async function fetchCategory() {
      try {
        setLoading(true);
        setError(null);
        
        const result = await apiClient.categories.get(id);
        
        if (!cancelled) {
          setData(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch category'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchCategory();

    return () => {
      cancelled = true;
    };
  }, [id, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return { data, loading, error, refetch };
}
