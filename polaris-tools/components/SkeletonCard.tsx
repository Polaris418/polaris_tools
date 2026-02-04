import React from 'react';

interface SkeletonCardProps {
  variant?: 'standard' | 'recent';
  className?: string;
}

/**
 * SkeletonCard Component
 * 骨架屏卡片组件，用于内容加载时的占位显示
 * 
 * Requirements: 5.6
 * Performance Optimizations (Requirement 36.2):
 * - Use CSS animations instead of JS for better performance
 * - Minimize DOM elements
 * - Use will-change for animated elements
 * 
 * @param variant - 卡片变体：'standard' 用于标准工具卡片，'recent' 用于最近使用卡片
 * @param className - 额外的 CSS 类名
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = React.memo(({
  variant = 'standard',
  className = '',
}) => {
  if (variant === 'recent') {
    return (
      <div className={`flex flex-col justify-between p-6 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark h-36 shadow-sm dark:shadow-none ${className}`}>
        <div className="flex justify-between items-start">
          {/* 图标骨架 - Performance: Add will-change for animation */}
          <div 
            className="size-10 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" 
            style={{ willChange: 'opacity' }}
          />
          {/* 右上角图标骨架 */}
          <div 
            className="size-5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" 
            style={{ willChange: 'opacity' }}
          />
        </div>
        <div className="space-y-2">
          {/* 标题骨架 */}
          <div 
            className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" 
            style={{ willChange: 'opacity' }}
          />
          {/* 描述骨架 */}
          <div 
            className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2" 
            style={{ willChange: 'opacity' }}
          />
        </div>
      </div>
    );
  }

  // Standard variant
  return (
    <div className={`flex items-center gap-4 p-5 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark shadow-sm dark:shadow-none ${className}`}>
      {/* 图标骨架 - Performance: Add will-change for animation */}
      <div 
        className="size-10 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse flex-shrink-0" 
        style={{ willChange: 'opacity' }}
      />
      
      {/* 文本内容骨架 */}
      <div className="flex flex-col gap-2 flex-1">
        {/* 标题骨架 */}
        <div 
          className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3" 
          style={{ willChange: 'opacity' }}
        />
        {/* 描述骨架 */}
        <div 
          className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-full" 
          style={{ willChange: 'opacity' }}
        />
      </div>
    </div>
  );
});
