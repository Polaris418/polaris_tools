/**
 * VirtualList Component
 * 虚拟滚动列表组件 - 用于高效渲染大量数据
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number; // Number of items to render outside visible area
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className = '',
  onScroll,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const totalHeight = items.length * itemHeight;
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight);

  // Add overscan
  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(items.length, visibleEnd + overscan);

  // Get visible items
  const visibleItems = items.slice(startIndex, endIndex);

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    },
    [onScroll]
  );

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: startIndex * itemHeight,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * VirtualTable Component
 * 虚拟滚动表格组件
 */

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render: (item: T, index: number) => React.ReactNode;
}

interface VirtualTableProps<T> {
  items: T[];
  columns: Column<T>[];
  rowHeight: number;
  containerHeight: number;
  overscan?: number;
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((item: T, index: number) => string);
  onScroll?: (scrollTop: number) => void;
}

export function VirtualTable<T>({
  items,
  columns,
  rowHeight,
  containerHeight,
  overscan = 3,
  className = '',
  headerClassName = '',
  rowClassName = '',
  onScroll,
}: VirtualTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const totalHeight = items.length * rowHeight;
  const visibleStart = Math.floor(scrollTop / rowHeight);
  const visibleEnd = Math.ceil((scrollTop + containerHeight - 40) / rowHeight); // Subtract header height

  // Add overscan
  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(items.length, visibleEnd + overscan);

  // Get visible items
  const visibleItems = items.slice(startIndex, endIndex);

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    },
    [onScroll]
  );

  return (
    <div className={className}>
      {/* Header */}
      <div className={`flex border-b ${headerClassName}`}>
        {columns.map((column) => (
          <div
            key={column.key}
            className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
            style={{ width: column.width || 'auto', flex: column.width ? undefined : 1 }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Body */}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{ height: containerHeight - 40 }} // Subtract header height
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: startIndex * rowHeight,
              left: 0,
              right: 0,
            }}
          >
            {visibleItems.map((item, index) => {
              const actualIndex = startIndex + index;
              const rowClass =
                typeof rowClassName === 'function'
                  ? rowClassName(item, actualIndex)
                  : rowClassName;

              return (
                <div
                  key={actualIndex}
                  className={`flex border-b ${rowClass}`}
                  style={{ height: rowHeight }}
                >
                  {columns.map((column) => (
                    <div
                      key={column.key}
                      className="px-4 py-4"
                      style={{ width: column.width || 'auto', flex: column.width ? undefined : 1 }}
                    >
                      {column.render(item, actualIndex)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * React hook for virtual scrolling
 */
export function useVirtualScroll<T>(
  items: T[],
  options: {
    itemHeight: number;
    containerHeight: number;
    overscan?: number;
  }
) {
  const [scrollTop, setScrollTop] = useState(0);
  const overscan = options.overscan || 3;

  // Calculate visible range
  const totalHeight = items.length * options.itemHeight;
  const visibleStart = Math.floor(scrollTop / options.itemHeight);
  const visibleEnd = Math.ceil((scrollTop + options.containerHeight) / options.itemHeight);

  // Add overscan
  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(items.length, visibleEnd + overscan);

  // Get visible items
  const visibleItems = items.slice(startIndex, endIndex);

  return {
    visibleItems,
    startIndex,
    endIndex,
    totalHeight,
    scrollTop,
    setScrollTop,
  };
}

/**
 * Infinite scroll hook
 */
export function useInfiniteScroll(
  callback: () => void | Promise<void>,
  options: {
    threshold?: number; // Distance from bottom to trigger (in pixels)
    enabled?: boolean;
  } = {}
) {
  const { threshold = 200, enabled = true } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);

  const targetRef = useCallback(
    (node: HTMLElement | null) => {
      if (!enabled) return;

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node) return;

      observerRef.current = new IntersectionObserver(
        async (entries) => {
          if (entries[0].isIntersecting && !loadingRef.current) {
            loadingRef.current = true;
            try {
              await callback();
            } finally {
              loadingRef.current = false;
            }
          }
        },
        {
          rootMargin: `${threshold}px`,
        }
      );

      observerRef.current.observe(node);
    },
    [callback, threshold, enabled]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return targetRef;
}
