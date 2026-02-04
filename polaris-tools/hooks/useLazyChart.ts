/**
 * useLazyChart Hook
 * 图表懒加载钩子 - 仅在可见时加载和渲染图表
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseLazyChartOptions {
  threshold?: number; // Intersection threshold (0-1)
  rootMargin?: string; // Root margin for intersection observer
  enabled?: boolean; // Whether lazy loading is enabled
}

/**
 * Hook for lazy loading charts
 * Only loads and renders chart when it becomes visible
 */
export function useLazyChart(options: UseLazyChartOptions = {}) {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    enabled = true,
  } = options;

  const [isVisible, setIsVisible] = useState(!enabled);
  const [hasBeenVisible, setHasBeenVisible] = useState(!enabled);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (!enabled) return;

      // Disconnect previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node) return;

      // Create new observer
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          setIsVisible(entry.isIntersecting);

          // Once visible, keep it loaded
          if (entry.isIntersecting) {
            setHasBeenVisible(true);
          }
        },
        {
          threshold,
          rootMargin,
        }
      );

      observerRef.current.observe(node);
    },
    [threshold, rootMargin, enabled]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    ref,
    isVisible,
    hasBeenVisible,
    shouldRender: hasBeenVisible, // Render if it has been visible at least once
  };
}

/**
 * Hook for progressive chart loading
 * Loads chart data in stages for better performance
 */
export function useProgressiveChart<T>(
  data: T[],
  options: {
    initialSize?: number;
    incrementSize?: number;
    incrementDelay?: number;
  } = {}
) {
  const {
    initialSize = 10,
    incrementSize = 10,
    incrementDelay = 100,
  } = options;

  const [visibleCount, setVisibleCount] = useState(initialSize);
  const [isComplete, setIsComplete] = useState(data.length <= initialSize);

  useEffect(() => {
    if (visibleCount >= data.length) {
      setIsComplete(true);
      return;
    }

    const timer = setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + incrementSize, data.length));
    }, incrementDelay);

    return () => clearTimeout(timer);
  }, [visibleCount, data.length, incrementSize, incrementDelay]);

  const visibleData = data.slice(0, visibleCount);

  return {
    visibleData,
    isComplete,
    progress: (visibleCount / data.length) * 100,
  };
}

/**
 * Hook for chart data sampling
 * Reduces data points for better performance while maintaining visual accuracy
 */
export function useChartSampling<T extends { [key: string]: any }>(
  data: T[],
  options: {
    maxPoints?: number;
    samplingMethod?: 'uniform' | 'lttb'; // LTTB = Largest Triangle Three Buckets
    xKey?: string;
    yKey?: string;
  } = {}
) {
  const {
    maxPoints = 100,
    samplingMethod = 'uniform',
    xKey = 'x',
    yKey = 'y',
  } = options;

  const [sampledData, setSampledData] = useState<T[]>(data);

  useEffect(() => {
    if (data.length <= maxPoints) {
      setSampledData(data);
      return;
    }

    if (samplingMethod === 'uniform') {
      // Uniform sampling - take every nth point
      const step = Math.ceil(data.length / maxPoints);
      const sampled = data.filter((_, index) => index % step === 0);
      setSampledData(sampled);
    } else if (samplingMethod === 'lttb') {
      // Largest Triangle Three Buckets algorithm
      const sampled = lttbSampling(data, maxPoints, xKey, yKey);
      setSampledData(sampled);
    }
  }, [data, maxPoints, samplingMethod, xKey, yKey]);

  return sampledData;
}

/**
 * Largest Triangle Three Buckets (LTTB) downsampling algorithm
 * Preserves visual characteristics of the data while reducing points
 */
function lttbSampling<T extends { [key: string]: any }>(
  data: T[],
  threshold: number,
  xKey: string,
  yKey: string
): T[] {
  if (data.length <= threshold) {
    return data;
  }

  const sampled: T[] = [];
  const bucketSize = (data.length - 2) / (threshold - 2);

  // Always include first point
  sampled.push(data[0]);

  let a = 0;

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate point average for next bucket
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    const avgRangeLength = avgRangeEnd - avgRangeStart;

    let avgX = 0;
    let avgY = 0;

    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgX += Number(data[j][xKey]);
      avgY += Number(data[j][yKey]);
    }

    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    // Get the range for this bucket
    const rangeOffs = Math.floor(i * bucketSize) + 1;
    const rangeTo = Math.floor((i + 1) * bucketSize) + 1;

    // Point a
    const pointAX = Number(data[a][xKey]);
    const pointAY = Number(data[a][yKey]);

    let maxArea = -1;
    let maxAreaPoint = 0;

    for (let j = rangeOffs; j < rangeTo; j++) {
      // Calculate triangle area
      const pointX = Number(data[j][xKey]);
      const pointY = Number(data[j][yKey]);

      const area = Math.abs(
        (pointAX - avgX) * (pointY - pointAY) -
        (pointAX - pointX) * (avgY - pointAY)
      ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = j;
      }
    }

    sampled.push(data[maxAreaPoint]);
    a = maxAreaPoint;
  }

  // Always include last point
  sampled.push(data[data.length - 1]);

  return sampled;
}

/**
 * Hook for chart animation control
 * Delays chart animation until it's visible
 */
export function useChartAnimation(options: {
  enabled?: boolean;
  delay?: number;
} = {}) {
  const { enabled = true, delay = 0 } = options;
  const [shouldAnimate, setShouldAnimate] = useState(!enabled);
  const { ref, isVisible } = useLazyChart({ enabled });

  useEffect(() => {
    if (isVisible && enabled) {
      const timer = setTimeout(() => {
        setShouldAnimate(true);
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [isVisible, enabled, delay]);

  return {
    ref,
    shouldAnimate,
    animationDuration: shouldAnimate ? 1000 : 0,
  };
}
