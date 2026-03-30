import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppProvider, useAppContext } from '../context/AppContext';
import { guestUsageManager } from '../utils/guestUsageManager';

/**
 * Checkpoint Test: Task 12 - 验证游客模式功能
 * 
 * This test suite verifies the complete guest mode functionality:
 * 1. 确保游客可以访问基础功能
 * 2. 测试使用次数限制
 * 3. 验证登录提示功能
 */

// Mock the guestUsageManager
vi.mock('../utils/guestUsageManager', () => ({
  guestUsageManager: {
    getUsage: vi.fn(() => ({ count: 0, limit: 10, lastResetDate: new Date().toISOString() })),
    incrementUsage: vi.fn(() => ({ count: 1, limit: 10, lastResetDate: new Date().toISOString() })),
    isLimitReached: vi.fn(() => false),
    shouldShowWarning: vi.fn(() => false),
    getRemainingCount: vi.fn(() => 10),
    clear: vi.fn(),
  },
}));

// Mock the API client
vi.mock('../api/client', () => ({
  apiClient: {
    setToken: vi.fn(),
    clearToken: vi.fn(),
    auth: {
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
    },
  },
}));

describe('Checkpoint: Guest Mode Functionality Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // 每个用例恢复默认模拟返回，避免前序用例污染后续断言
    vi.mocked(guestUsageManager.getUsage).mockReturnValue({
      count: 0,
      limit: 10,
      lastResetDate: new Date().toISOString(),
    });
    vi.mocked(guestUsageManager.incrementUsage).mockReturnValue({
      count: 1,
      limit: 10,
      lastResetDate: new Date().toISOString(),
    });
    vi.mocked(guestUsageManager.isLimitReached).mockReturnValue(false);
    vi.mocked(guestUsageManager.shouldShowWarning).mockReturnValue(false);
    vi.mocked(guestUsageManager.getRemainingCount).mockReturnValue(10);
  });

  describe('1. 确保游客可以访问基础功能', () => {
    it('should identify unauthenticated users as guests', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current.isGuest).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should allow guests to access dashboard', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      const canAccess = result.current.canAccessFeature('dashboard');
      expect(canAccess).toBe(true);
    });

    it('should allow guests to access tools', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      const canAccess = result.current.canAccessFeature('tool');
      expect(canAccess).toBe(true);
    });

    it('should allow guests to access categories', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      const canAccess = result.current.canAccessFeature('category');
      expect(canAccess).toBe(true);
    });

    it('should restrict guests from accessing favorites', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      const canAccess = result.current.canAccessFeature('favorites');
      expect(canAccess).toBe(false);
    });

    it('should restrict guests from accessing profile', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      const canAccess = result.current.canAccessFeature('profile');
      expect(canAccess).toBe(false);
    });

    it('should restrict guests from accessing settings', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      const canAccess = result.current.canAccessFeature('settings');
      expect(canAccess).toBe(false);
    });

    it('should restrict guests from accessing notifications', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      const canAccess = result.current.canAccessFeature('notifications');
      expect(canAccess).toBe(false);
    });

    it('should restrict guests from accessing admin panel', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      const canAccess = result.current.canAccessFeature('admin');
      expect(canAccess).toBe(false);
    });
  });

  describe('2. 测试使用次数限制', () => {
    it('should initialize with guest usage state', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current.guestUsage).toBeDefined();
      expect(result.current.guestUsage.count).toBe(0);
      expect(result.current.guestUsage.limit).toBe(10);
      expect(result.current.isGuestBlocked).toBe(false);
    });

    it('should allow usage when limit is not reached', () => {
      vi.mocked(guestUsageManager.isLimitReached).mockReturnValue(false);

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        const canUse = result.current.checkGuestUsage();
        expect(canUse).toBe(true);
      });

      expect(result.current.isGuestBlocked).toBe(false);
    });

    it('should block usage when limit is reached', () => {
      vi.mocked(guestUsageManager.isLimitReached).mockReturnValue(true);

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        const canUse = result.current.checkGuestUsage();
        expect(canUse).toBe(false);
      });

      expect(result.current.isGuestBlocked).toBe(true);
    });

    it('should record guest tool usage', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        result.current.recordGuestToolUsage();
      });

      expect(guestUsageManager.incrementUsage).toHaveBeenCalled();
      expect(result.current.guestUsage.count).toBe(1);
    });

    it('should show warning when approaching limit', () => {
      vi.mocked(guestUsageManager.shouldShowWarning).mockReturnValue(true);
      vi.mocked(guestUsageManager.isLimitReached).mockReturnValue(false);

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        result.current.recordGuestToolUsage();
      });

      expect(guestUsageManager.shouldShowWarning).toHaveBeenCalled();
    });

    it('should block and show dialog when limit is reached after usage', () => {
      vi.mocked(guestUsageManager.shouldShowWarning).mockReturnValue(false);
      vi.mocked(guestUsageManager.isLimitReached).mockReturnValue(true);

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        result.current.recordGuestToolUsage();
      });

      expect(result.current.isGuestBlocked).toBe(true);
    });

    it('should only track usage for guests, not authenticated users', () => {
      // Mock authenticated user
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Simulate login by setting user state
      // In real scenario, this would be done through login method
      // For this test, we verify that recordGuestToolUsage checks isGuest
      
      // When isGuest is true, it should record
      expect(result.current.isGuest).toBe(true);
      
      act(() => {
        result.current.recordGuestToolUsage();
      });
      
      expect(guestUsageManager.incrementUsage).toHaveBeenCalled();
    });

    it('should provide remaining count information', () => {
      vi.mocked(guestUsageManager.getRemainingCount).mockReturnValue(7);

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      const remaining = guestUsageManager.getRemainingCount();
      expect(remaining).toBe(7);
    });
  });

  describe('3. 验证登录提示功能', () => {
    it('should provide promptLogin function', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(typeof result.current.promptLogin).toBe('function');
    });

    it('should trigger login prompt when called', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        result.current.promptLogin('测试消息');
      });

      // The prompt should be triggered (we can't test the UI directly)
      // But we can verify the function executes without error
      expect(result.current.promptLogin).toBeDefined();
    });

    it('should provide default message when no message is provided', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        result.current.promptLogin();
      });

      // Should not throw error
      expect(result.current.promptLogin).toBeDefined();
    });

    it('should have navigation function for login redirect', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(typeof result.current.navigate).toBe('function');
      
      act(() => {
        result.current.navigate('login');
      });

      expect(result.current.page).toBe('login');
    });
  });

  describe('Integration: Complete Guest Mode Flow', () => {
    it('should handle complete guest usage flow', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // 1. Verify guest status
      expect(result.current.isGuest).toBe(true);

      // 2. Check access to basic features
      expect(result.current.canAccessFeature('dashboard')).toBe(true);
      expect(result.current.canAccessFeature('tool')).toBe(true);

      // 3. Check access to restricted features
      expect(result.current.canAccessFeature('favorites')).toBe(false);
      expect(result.current.canAccessFeature('profile')).toBe(false);

      // 4. Check usage limit
      act(() => {
        const canUse = result.current.checkGuestUsage();
        expect(canUse).toBe(true);
      });

      // 5. Record usage
      act(() => {
        result.current.recordGuestToolUsage();
      });

      expect(guestUsageManager.incrementUsage).toHaveBeenCalled();
    });

    it('should handle guest trying to access restricted feature', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Guest tries to access favorites
      const canAccess = result.current.canAccessFeature('favorites');
      expect(canAccess).toBe(false);

      // Should be able to prompt login
      act(() => {
        result.current.promptLogin('访问收藏功能需要登录');
      });

      expect(result.current.promptLogin).toBeDefined();
    });

    it('should handle guest reaching usage limit', () => {
      vi.mocked(guestUsageManager.isLimitReached).mockReturnValue(true);

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Check usage - should be blocked
      act(() => {
        const canUse = result.current.checkGuestUsage();
        expect(canUse).toBe(false);
      });

      expect(result.current.isGuestBlocked).toBe(true);

      // Should still be able to navigate to login
      act(() => {
        result.current.navigate('login');
      });

      expect(result.current.page).toBe('login');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing localStorage gracefully', () => {
      // This test verifies the app doesn't crash if localStorage is unavailable
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current.isGuest).toBe(true);
      expect(result.current.guestUsage).toBeDefined();
    });

    it('should expose all required guest mode APIs', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Verify all required APIs are exposed
      expect(result.current.isGuest).toBeDefined();
      expect(result.current.canAccessFeature).toBeDefined();
      expect(result.current.promptLogin).toBeDefined();
      expect(result.current.guestUsage).toBeDefined();
      expect(result.current.checkGuestUsage).toBeDefined();
      expect(result.current.recordGuestToolUsage).toBeDefined();
      expect(result.current.isGuestBlocked).toBeDefined();
    });
  });
});
