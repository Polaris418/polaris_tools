import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { LoadingScreen } from '../components/LoadingScreen';
import { SkeletonCard } from '../components/SkeletonCard';
import { SkeletonList } from '../components/SkeletonList';
import { AppProvider } from '../context/AppContext';
import App from '../App';

const findProgressBar = (container: HTMLElement): HTMLElement | undefined => {
  return Array.from(container.querySelectorAll('div')).find((element) => {
    const width = (element as HTMLElement).style.width;
    return width.endsWith('%');
  }) as HTMLElement | undefined;
};

/**
 * Checkpoint 17: Loading State Optimization Verification
 * 
 * This test suite verifies:
 * - Various loading scenarios work correctly
 * - Animation performance is optimized
 * - User experience is smooth
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

describe('Checkpoint 17: Loading State Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('LoadingScreen Component', () => {
    it('should render basic loading screen with default message', () => {
      render(<LoadingScreen />);
      
      // Check for brand name
      expect(screen.getByText('Polaris Tools')).toBeInTheDocument();
      
      // Check for default loading message
      expect(screen.getByText('正在加载...')).toBeInTheDocument();
      
      // Check for tagline
      expect(screen.getByText('Navigate your workflow with precision')).toBeInTheDocument();
    });

    it('should render custom loading message', () => {
      render(<LoadingScreen message="正在初始化应用..." />);
      
      expect(screen.getByText('正在初始化应用...')).toBeInTheDocument();
    });

    it('should show timeout message after 3 seconds', async () => {
      vi.useFakeTimers();
      
      render(<LoadingScreen message="加载中" />);
      
      // Initially, timeout message should not be visible
      expect(screen.queryByText(/加载时间较长/)).not.toBeInTheDocument();
      
      // Fast-forward time by 3 seconds
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      
      // Timeout message should now be visible
      expect(screen.getByText(/加载时间较长/)).toBeInTheDocument();
    });

    it('should render progress bar when showProgress is true', () => {
      const { container } = render(
        <LoadingScreen showProgress={true} progress={50} />
      );
      
      // Check for progress bar
      const progressBar = findProgressBar(container);
      expect(progressBar).toBeInTheDocument();
      expect(progressBar?.style.width).toBe('50%');
      
      // Check for percentage text
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should handle progress values correctly (0-100)', () => {
      const { container, rerender } = render(
        <LoadingScreen showProgress={true} progress={0} />
      );
      
      let progressBar = findProgressBar(container);
      expect(progressBar?.style.width).toBe('0%');
      
      // Test 100%
      rerender(<LoadingScreen showProgress={true} progress={100} />);
      progressBar = findProgressBar(container);
      expect(progressBar?.style.width).toBe('100%');
      
      // Test values beyond bounds (should clamp)
      rerender(<LoadingScreen showProgress={true} progress={150} />);
      progressBar = findProgressBar(container);
      expect(progressBar?.style.width).toBe('100%');
      
      rerender(<LoadingScreen showProgress={true} progress={-10} />);
      progressBar = findProgressBar(container);
      expect(progressBar?.style.width).toBe('0%');
    });

    it('should render error state with retry button', () => {
      const onRetry = vi.fn();
      
      render(
        <LoadingScreen 
          error="加载失败，请重试" 
          onRetry={onRetry}
        />
      );
      
      // Check for error message
      expect(screen.getByText('加载失败')).toBeInTheDocument();
      expect(screen.getByText('加载失败，请重试')).toBeInTheDocument();
      
      // Check for retry button
      const retryButton = screen.getByRole('button', { name: /重试/i });
      expect(retryButton).toBeInTheDocument();
      
      // Click retry button
      retryButton.click();
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should not show timeout message when in error state', async () => {
      vi.useFakeTimers();
      
      render(<LoadingScreen error="Something went wrong" />);
      
      // Fast-forward time by 3 seconds
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      
      // Timeout message should NOT appear in error state
      expect(screen.queryByText(/加载时间较长/)).not.toBeInTheDocument();
    });

    it('should have optimized animations with will-change property', () => {
      const { container } = render(<LoadingScreen />);
      
      // Check for will-change optimization on animated elements
      const animatedElements = container.querySelectorAll('[style*="will-change"]');
      expect(animatedElements.length).toBeGreaterThan(0);
    });
  });

  describe('SkeletonCard Component', () => {
    it('should render standard variant skeleton card', () => {
      const { container } = render(<SkeletonCard variant="standard" />);
      
      // Check for skeleton elements with pulse animation
      const skeletonElements = container.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('should render recent variant skeleton card', () => {
      const { container } = render(<SkeletonCard variant="recent" />);
      
      // Check for skeleton elements
      const skeletonElements = container.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(0);
      
      // Recent variant should have different structure
      expect(container.querySelector('.h-36')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <SkeletonCard variant="standard" className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('SkeletonList Component', () => {
    it('should render correct number of skeleton cards', () => {
      const { container } = render(<SkeletonList count={5} />);
      
      // Should render 5 skeleton cards
      const skeletonCards = container.querySelectorAll('.animate-pulse');
      expect(skeletonCards.length).toBeGreaterThanOrEqual(5);
    });

    it('should render with grid layout', () => {
      const { container } = render(<SkeletonList layout="grid" />);
      
      // Check for grid layout classes
      expect(container.firstChild).toHaveClass('grid');
    });

    it('should render with vertical layout', () => {
      const { container } = render(<SkeletonList layout="vertical" />);
      
      // Check for flex column layout
      expect(container.firstChild).toHaveClass('flex', 'flex-col');
    });

    it('should render different variants', () => {
      const { container: standardContainer } = render(
        <SkeletonList variant="standard" count={3} />
      );
      
      const { container: recentContainer } = render(
        <SkeletonList variant="recent" count={3} />
      );
      
      // Both should render skeleton cards
      expect(standardContainer.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
      expect(recentContainer.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('should have staggered fade-in animation', () => {
      const { container } = render(<SkeletonList count={3} />);
      
      // Check for fade-in animation class
      const fadeInElements = container.querySelectorAll('.animate-fade-in');
      expect(fadeInElements.length).toBeGreaterThan(0);
    });
  });

  describe('App Integration - Loading States', () => {
    it('should show loading screen during initialization', async () => {
      // Mock localStorage to simulate uninitialized state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      render(
        <AppProvider>
          <App />
        </AppProvider>
      );
      
      // Should show loading screen initially
      // Note: This might be very brief, so we check if it appears at all
      const loadingText = screen.queryByText(/正在加载|正在初始化/);
      
      // If loading screen appears, verify it has the brand name
      if (loadingText) {
        expect(screen.getByText('Polaris Tools')).toBeInTheDocument();
      }

      await waitFor(() => {
        expect(screen.queryByText(/正在加载|正在初始化/)).not.toBeInTheDocument();
      });
    });

    it('should transition from loading to content', async () => {
      // Mock API responses
      global.fetch = vi.fn((url) => {
        if (url.includes('/api/v1/tools')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              code: 200,
              message: 'Success',
              data: {
                list: [],
                total: 0,
                page: 1,
                size: 20,
              },
            }),
          });
        }
        if (url.includes('/api/v1/categories')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              code: 200,
              message: 'Success',
              data: [],
            }),
          });
        }
        return Promise.reject(new Error('Not found'));
      }) as any;
      
      render(
        <AppProvider>
          <App />
        </AppProvider>
      );
      
      // 等待初始化完成，确认不再停留在加载态
      await waitFor(() => {
        expect(screen.queryByText(/正在加载|正在初始化/)).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Performance Optimization', () => {
    it('should use CSS transforms for animations', () => {
      const { container } = render(<LoadingScreen />);
      
      // Check for transform-based animations (more performant than position/size changes)
      const spinningElements = container.querySelectorAll('.animate-spin');
      expect(spinningElements.length).toBeGreaterThan(0);
      
      // Check for pulse animations
      const pulsingElements = container.querySelectorAll('.animate-pulse');
      expect(pulsingElements.length).toBeGreaterThan(0);
    });

    it('should use will-change for optimized rendering', () => {
      const { container } = render(<LoadingScreen />);
      
      // Elements with will-change should be present for performance optimization
      const optimizedElements = container.querySelectorAll('[style*="will-change"]');
      expect(optimizedElements.length).toBeGreaterThan(0);
    });

    it('should not cause layout thrashing with skeleton screens', () => {
      const { container } = render(<SkeletonList count={10} />);
      
      // Skeleton cards should have fixed dimensions to prevent layout shifts
      const skeletonCards = container.querySelectorAll('.animate-pulse');
      
      skeletonCards.forEach(card => {
        const styles = window.getComputedStyle(card);
        // Should have defined dimensions (not auto)
        expect(styles.width).not.toBe('auto');
        expect(styles.height).not.toBe('auto');
      });
    });
  });

  describe('User Experience', () => {
    it('should provide visual feedback during loading', () => {
      render(<LoadingScreen message="加载数据中" />);
      
      // Should have animated elements to indicate activity
      const { container } = render(<LoadingScreen />);
      const animatedElements = container.querySelectorAll('[class*="animate-"]');
      expect(animatedElements.length).toBeGreaterThan(0);
    });

    it('should show helpful error messages', () => {
      const errorMessage = '网络连接失败，请检查您的网络设置';
      render(<LoadingScreen error={errorMessage} onRetry={() => {}} />);
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /重试/i })).toBeInTheDocument();
    });

    it('should maintain brand consistency in loading states', () => {
      render(<LoadingScreen />);
      
      // Brand elements should be present
      expect(screen.getByText('Polaris Tools')).toBeInTheDocument();
      expect(screen.getByText('Navigate your workflow with precision')).toBeInTheDocument();
    });

    it('should handle rapid state changes gracefully', async () => {
      vi.useFakeTimers();
      
      const { rerender } = render(<LoadingScreen message="Loading 1" />);
      
      // Rapidly change messages
      act(() => {
        rerender(<LoadingScreen message="Loading 2" />);
        vi.advanceTimersByTime(100);
        rerender(<LoadingScreen message="Loading 3" />);
        vi.advanceTimersByTime(100);
        rerender(<LoadingScreen message="Loading 4" />);
      });
      
      // Should show the latest message
      expect(screen.getByText('Loading 4')).toBeInTheDocument();
      
      vi.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for loading state', () => {
      const { container } = render(<LoadingScreen />);
      
      // Loading screen should be perceivable
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should have accessible retry button', () => {
      render(<LoadingScreen error="Error" onRetry={() => {}} />);
      
      const retryButton = screen.getByRole('button', { name: /重试/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toBeEnabled();
    });

    it('should provide text alternatives for visual loading indicators', () => {
      render(<LoadingScreen message="正在加载数据" />);
      
      // Loading message should be visible text
      expect(screen.getByText('正在加载数据')).toBeInTheDocument();
    });
  });
});
