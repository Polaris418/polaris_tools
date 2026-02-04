import React from 'react';
import { SkeletonCard } from './SkeletonCard';

interface SkeletonListProps {
  count?: number;
  variant?: 'standard' | 'recent';
  layout?: 'vertical' | 'grid';
  className?: string;
}

/**
 * SkeletonList Component
 * 骨架屏列表组件，用于显示多个加载中的卡片占位符
 * 
 * Requirements: 5.6
 * Performance Optimizations (Requirement 36.2):
 * - Use React.memo to prevent unnecessary re-renders
 * - Memoize skeleton cards array
 * - Optimize animation delays
 * 
 * @param count - 显示的骨架卡片数量，默认为 6
 * @param variant - 卡片变体：'standard' 或 'recent'
 * @param layout - 布局方式：'vertical' 垂直列表，'grid' 网格布局
 * @param className - 额外的 CSS 类名
 */
export const SkeletonList: React.FC<SkeletonListProps> = React.memo(({
  count = 6,
  variant = 'standard',
  layout = 'vertical',
  className = '',
}) => {
  // Performance: Memoize skeleton cards to prevent recreation on every render
  const skeletonCards = React.useMemo(() => {
    return Array.from({ length: count }, (_, index) => (
      <SkeletonCard 
        key={index} 
        variant={variant}
        // 添加淡入动画效果，使骨架卡片依次出现
        // Performance: Limit animation delay to first 10 items to avoid excessive delays
        className="animate-fade-in"
        style={{ 
          animationDelay: `${Math.min(index, 10) * 50}ms`,
          willChange: 'opacity',
        } as React.CSSProperties}
      />
    ));
  }, [count, variant]);

  // Performance: Memoize container class to avoid recalculation
  const containerClass = React.useMemo(() => {
    return layout === 'grid'
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
      : 'flex flex-col gap-4';
  }, [layout]);

  return (
    <div className={`${containerClass} ${className}`}>
      {skeletonCards}
    </div>
  );
});
