import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';

interface LoadingScreenProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
  onRetry?: () => void;
  error?: string | null;
}

/**
 * LoadingScreen Component
 * 品牌化的加载屏幕，支持自定义文本和可选进度条
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7
 * Performance Optimizations (Requirement 36.2):
 * - Use CSS transforms and will-change for GPU acceleration
 * - Minimize re-renders with useMemo and useCallback
 * - Optimize animation timing and reduce DOM operations
 * 
 * Features:
 * - Timeout detection (shows additional message after 3 seconds)
 * - Error state with retry button
 * - Optimized animations using CSS transforms and will-change
 * - Smooth transitions
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = '正在加载...',
  showProgress = false,
  progress = 0,
  onRetry,
  error = null,
}) => {
  const [dots, setDots] = useState('');
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

  // Performance: Memoize progress width calculation
  const progressWidth = React.useMemo(() => {
    return `${Math.min(100, Math.max(0, progress))}%`;
  }, [progress]);

  // Performance: Memoize progress percentage
  const progressPercentage = React.useMemo(() => {
    return Math.round(Math.min(100, Math.max(0, progress)));
  }, [progress]);

  // 动画点点点效果
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // 超时检测 - 3秒后显示额外提示
  useEffect(() => {
    if (error) {
      setShowTimeoutMessage(false);
      return;
    }

    const timeout = setTimeout(() => {
      setShowTimeoutMessage(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [error]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      {/* 背景装饰 - 优化性能使用 will-change */}
      <div className="absolute inset-0 overflow-hidden">
        {/* 渐变圆圈装饰 */}
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-200/30 dark:bg-indigo-500/10 rounded-full blur-3xl animate-pulse"
          style={{ willChange: 'opacity' }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/30 dark:bg-purple-500/10 rounded-full blur-3xl animate-pulse" 
          style={{ animationDelay: '1s', willChange: 'opacity' }}
        />
      </div>

      {/* 主内容 */}
      <div className="relative flex flex-col items-center gap-8 px-8">
        {/* 错误状态 */}
        {error ? (
          <>
            {/* 错误图标 */}
            <div className="relative">
              <div className="w-32 h-32 flex items-center justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-2xl flex items-center justify-center">
                  <Icon 
                    name="error" 
                    filled={true}
                    className="text-white text-[40px]"
                  />
                </div>
              </div>
            </div>

            {/* 品牌名称 */}
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Polaris Tools
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Navigate your workflow with precision
              </p>
            </div>

            {/* 错误信息 */}
            <div className="flex flex-col items-center gap-4 max-w-md">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  加载失败
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {error}
                </p>
              </div>

              {/* 重试按钮 */}
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                  style={{ willChange: 'transform' }}
                >
                  <Icon name="refresh" className="text-[20px]" />
                  <span>重试</span>
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Logo 容器 - 带动画，优化性能 */}
            <div className="relative">
              {/* 外圈旋转动画 - 使用 transform 优化性能 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div 
                  className="w-32 h-32 border-4 border-transparent border-t-indigo-500 border-r-indigo-400 rounded-full animate-spin" 
                  style={{ animationDuration: '2s', willChange: 'transform' }}
                />
              </div>
              
              {/* 中圈反向旋转 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div 
                  className="w-24 h-24 border-4 border-transparent border-b-purple-500 border-l-purple-400 rounded-full animate-spin" 
                  style={{ animationDuration: '3s', animationDirection: 'reverse', willChange: 'transform' }}
                />
              </div>

              {/* Logo 图标 */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-2xl flex items-center justify-center animate-pulse">
                  <Icon 
                    name="explore" 
                    filled={true}
                    className="text-white text-[40px] animate-spin" 
                    style={{ animationDuration: '4s', willChange: 'transform' }}
                  />
                </div>
              </div>
            </div>

            {/* 品牌名称 */}
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Polaris Tools
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Navigate your workflow with precision
              </p>
            </div>

            {/* 加载提示文本 */}
            <div className="flex flex-col items-center gap-4 min-h-[80px]">
              <div className="flex items-center gap-2">
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {message}
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold w-6 text-left">
                  {dots}
                </span>
              </div>

              {/* 超时提示 - 3秒后显示 */}
              {showTimeoutMessage && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 animate-fade-in">
                  <Icon name="schedule" className="text-amber-600 dark:text-amber-400 text-[18px]" />
                  <span className="text-sm text-amber-700 dark:text-amber-300">
                    加载时间较长，请稍候...
                  </span>
                </div>
              )}

              {/* 可选的进度条 */}
              {showProgress && (
                <div className="w-64 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-300 ease-out"
                    style={{ 
                      width: progressWidth,
                      willChange: 'width',
                      transform: 'translateZ(0)', // Force GPU acceleration
                    }}
                  />
                </div>
              )}

              {/* 进度百分比 */}
              {showProgress && (
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {progressPercentage}%
                </span>
              )}
            </div>

            {/* 底部装饰线 */}
            <div className="flex items-center gap-2 mt-4">
              <div 
                className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" 
                style={{ willChange: 'transform' }}
              />
              <div 
                className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" 
                style={{ animationDelay: '0.1s', willChange: 'transform' }}
              />
              <div 
                className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" 
                style={{ animationDelay: '0.2s', willChange: 'transform' }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
