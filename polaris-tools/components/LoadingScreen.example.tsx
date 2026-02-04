/**
 * LoadingScreen Component - Usage Examples
 * 
 * This file demonstrates various ways to use the LoadingScreen component.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7
 */

import React from 'react';
import { LoadingScreen } from './LoadingScreen';

/**
 * Example 1: Basic usage with default message
 * Shows "正在加载..." with animated logo
 */
export const BasicLoadingExample = () => {
  return <LoadingScreen />;
};

/**
 * Example 2: Custom loading message
 * Useful for different loading contexts
 */
export const CustomMessageExample = () => {
  return <LoadingScreen message="正在初始化应用..." />;
};

/**
 * Example 3: With progress bar
 * Shows a progress bar with percentage
 */
export const WithProgressExample = () => {
  return (
    <LoadingScreen 
      message="正在加载数据"
      showProgress={true}
      progress={65}
    />
  );
};

/**
 * Example 4: Timeout detection (NEW - Requirement 5.5)
 * After 3 seconds, shows additional timeout message
 */
export const TimeoutDetectionExample = () => {
  return (
    <LoadingScreen message="正在连接服务器..." />
    // After 3 seconds, will automatically show: "加载时间较长，请稍候..."
  );
};

/**
 * Example 5: Error state with retry (NEW - Requirement 5.7)
 * Shows error message with retry button
 */
export const ErrorStateExample = () => {
  const handleRetry = () => {
    console.log('Retrying...');
    // Implement retry logic here
  };

  return (
    <LoadingScreen 
      error="加载失败，请检查网络连接后重试"
      onRetry={handleRetry}
    />
  );
};

/**
 * Example 6: Different loading states
 * Common loading messages for different scenarios
 */
export const LoadingStates = {
  initializing: (
    <LoadingScreen message="正在初始化..." />
  ),
  
  loggingIn: (
    <LoadingScreen message="登录中..." />
  ),
  
  refreshingData: (
    <LoadingScreen message="刷新数据中..." />
  ),
  
  loadingTools: (
    <LoadingScreen message="加载工具列表..." />
  ),
  
  savingChanges: (
    <LoadingScreen 
      message="保存更改中..."
      showProgress={true}
      progress={80}
    />
  ),
};

/**
 * Example 7: Simulated progress loading
 * Shows how to implement progressive loading
 */
export const ProgressiveLoadingExample = () => {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev: number) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <LoadingScreen 
      message="正在加载应用..."
      showProgress={true}
      progress={progress}
    />
  );
};

/**
 * Example 8: Integration with App.tsx
 * How to use LoadingScreen during app initialization
 */
export const AppIntegrationExample = () => {
  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    // Simulate app initialization
    setTimeout(() => {
      setIsInitialized(true);
    }, 2000);
  }, []);

  if (!isInitialized) {
    return <LoadingScreen message="正在初始化应用..." />;
  }

  return <div>App Content</div>;
};

/**
 * Example 9: Multi-stage loading with different messages
 * Shows how to update loading message during different stages
 */
export const MultiStageLoadingExample = () => {
  const [stage, setStage] = React.useState(0);
  const [progress, setProgress] = React.useState(0);

  const stages = [
    { message: '正在连接服务器...', duration: 1000 },
    { message: '正在验证身份...', duration: 1500 },
    { message: '正在加载用户数据...', duration: 1000 },
    { message: '正在初始化界面...', duration: 800 },
  ];

  React.useEffect(() => {
    if (stage >= stages.length) return;

    const timer = setTimeout(() => {
      setStage((prev: number) => prev + 1);
      setProgress(((stage + 1) / stages.length) * 100);
    }, stages[stage].duration);

    return () => clearTimeout(timer);
  }, [stage]);

  if (stage >= stages.length) {
    return <div>Loading Complete!</div>;
  }

  return (
    <LoadingScreen 
      message={stages[stage].message}
      showProgress={true}
      progress={progress}
    />
  );
};

/**
 * Example 10: Error handling with retry logic (NEW)
 * Complete example with error state and retry functionality
 */
export const ErrorHandlingExample = () => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate random failure
          if (Math.random() > 0.5) {
            resolve('success');
          } else {
            reject(new Error('Network error'));
          }
        }, 2000);
      });

      setLoading(false);
    } catch (err) {
      setError('加载失败，请检查网络连接后重试');
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleRetry = () => {
    loadData();
  };

  if (loading) {
    return <LoadingScreen message="正在加载数据..." />;
  }

  if (error) {
    return <LoadingScreen error={error} onRetry={handleRetry} />;
  }

  return <div>Data loaded successfully!</div>;
};

/**
 * Usage Notes:
 * 
 * 1. Basic Loading:
 *    <LoadingScreen />
 * 
 * 2. Custom Message:
 *    <LoadingScreen message="自定义加载文本" />
 * 
 * 3. With Progress:
 *    <LoadingScreen 
 *      message="加载中" 
 *      showProgress={true} 
 *      progress={50} 
 *    />
 * 
 * 4. With Error and Retry (NEW):
 *    <LoadingScreen 
 *      error="加载失败，请重试"
 *      onRetry={handleRetry}
 *    />
 * 
 * 5. Progress is automatically clamped to 0-100 range
 * 
 * 6. The component is full-screen and uses fixed positioning
 * 
 * 7. Animations (OPTIMIZED):
 *    - Logo has rotating rings (with will-change for performance)
 *    - Icon spins slowly (optimized with CSS transforms)
 *    - Dots animate in the message
 *    - Background has pulsing gradient circles
 *    - Bottom has bouncing dots
 *    - All animations use GPU acceleration
 * 
 * 8. Timeout Detection (NEW):
 *    - After 3 seconds of loading, shows additional message
 *    - "加载时间较长，请稍候..."
 *    - Automatically appears without any configuration
 * 
 * 9. Error State (NEW):
 *    - Shows error icon instead of loading animation
 *    - Displays custom error message
 *    - Provides retry button if onRetry callback is provided
 *    - Smooth transition from loading to error state
 * 
 * 10. Dark mode is fully supported
 * 
 * 11. The component is accessible and responsive
 * 
 * 12. Performance Optimizations:
 *     - Uses CSS transforms for animations
 *     - Uses will-change property for smooth animations
 *     - GPU-accelerated animations
 *     - Minimal re-renders
 */
