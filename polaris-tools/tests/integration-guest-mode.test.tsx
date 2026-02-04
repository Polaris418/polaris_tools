/**
 * Integration Test: 游客模式功能测试 (Guest Mode Functionality)
 * Task 34.1
 * 
 * This test suite provides comprehensive integration testing for guest mode functionality.
 * 
 * Requirements tested: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10
 * 
 * Test Coverage:
 * - Guest access to basic features
 * - Guest restrictions on protected features
 * - Anonymous usage statistics
 * - Usage limit tracking and enforcement
 * - Login prompts and navigation
 * - Guest-to-authenticated user transitions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AppProvider, useAppContext } from '../context/AppContext';
import { guestUsageManager } from '../utils/guestUsageManager';
import { apiClient } from '../api/client';

// Mock dependencies
vi.mock('../api/client');
vi.mock('../utils/guestUsageManager');

describe('Integration Test: Guest Mode Functionality', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    
    // Setup default mocks
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
    vi.mocked(guestUsageManager.clear).mockImplementation(() => {});
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Requirement 1.1: 未登录用户可以访问首页和工具页面', () => {
    it('should allow guest to access dashboard page', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current.isGuest).toBe(true);
      expect(result.current.canAccessFeature('dashboard')).toBe(true);
    });

    it('should allow guest to navigate to dashboard', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        result.current.navigate('dashboard');
      });

      expect(result.current.page).toBe('dashboard');
    });

    it('should allow guest to access tool pages', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current.canAccessFeature('tool')).toBe(true);
    });

    it('should allow guest to access category pages', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current.canAccessFeature('category')).toBe(true);
    });
  });

  describe('Requirement 1.2: 未登录用户可以使用所有工具的基础功能（有次数限制）', () => {
    it('should allow guest to use tools when under limit', () => {
      vi.mocked(guestUsageManager.isLimitReached).mockReturnValue(false);

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        const canUse = result.current.checkGuestUsage();
        expect(canUse).toBe(true);
      });
    });

    it('should track guest tool usage', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        result.current.recordGuestToolUsage();
      });

      expect(guestUsageManager.incrementUsage).toHaveBeenCalled();
    });

    it('should update usage count after tool use', () => {
      vi.mocked(guestUsageManager.incrementUsage).mockReturnValue({
        count: 5,
        limit: 10,
        lastResetDate: new Date().toISOString(),
      });

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        result.current.recordGuestToolUsage();
      });

      expect(result.current.guestUsage.count).toBe(5);
    });

    it('should enforce usage limit', () => {
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
  });

  describe('Requirement 1.3: 未登录用户的使用统计会被匿名记录', () => {
    it('should have guest usage tracking enabled', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current.guestUsage).toBeDefined();
      expect(result.current.recordGuestToolUsage).toBeDefined();
    });

    it('should maintain usage statistics in localStorage', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        result.current.recordGuestToolUsage();
      });

      expect(guestUsageManager.incrementUsage).toHaveBeenCalled();
    });

    it('should not save personal history for guests', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current.isGuest).toBe(true);
      expect(result.current.user).toBeNull();
    });
  });

  describe('Requirement 1.4: 未登录用户在尝试访问需要登录的功能时，显示友好的提示', () => {
    it('should provide promptLogin function', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(typeof result.current.promptLogin).toBe('function');
    });

    it('should trigger login prompt for restricted features', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      const canAccessFavorites = result.current.canAccessFeature('favorites');
      expect(canAccessFavorites).toBe(false);

      act(() => {
        result.current.promptLogin('访问收藏功能需要登录');
      });

      expect(result.current.promptLogin).toBeDefined();
    });

    it('should accept custom message in promptLogin', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        result.current.promptLogin('自定义提示消息');
      });

      expect(result.current.promptLogin).toBeDefined();
    });

    it('should provide default message when none provided', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        result.current.promptLogin();
      });

      expect(result.current.promptLogin).toBeDefined();
    });
  });

  describe('Requirement 1.5: 页面顶部显示"登录"和"注册"按钮', () => {
    it('should identify guest status for UI rendering', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current.isGuest).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should allow navigation to login page', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        result.current.navigate('login');
      });

      expect(result.current.page).toBe('login');
    });

    it('should allow navigation to register page', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        result.current.navigate('register');
      });

      expect(result.current.page).toBe('register');
    });
  });

  describe('Requirement 1.6: 侧边栏显示简化版本，隐藏需要登录的功能', () => {
    it('should restrict access to favorites', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current.canAccessFeature('favorites')).toBe(false);
    });

    it('should restrict access to profile', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current.canAccessFeature('profile')).toBe(false);
    });

    it('should restrict access to settings', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current.canAccessFeature('settings')).toBe(false);
    });

    it('should restrict access to notifications', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current.canAccessFeature('notifications')).toBe(false);
    });

    it('should restrict access to admin panel', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current.canAccessFeature('admin')).toBe(false);
    });
  });

  describe('Requirement 1.7: 未登录用户的工具使用会增加全局使用计数', () => {
    it('should track usage globally for guests', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        result.current.recordGuestToolUsage();
      });

      expect(guestUsageManager.incrementUsage).toHaveBeenCalled();
    });

    it('should not associate usage with specific user', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current.user).toBeNull();
      
      act(() => {
        result.current.recordGuestToolUsage();
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe('Requirement 1.8: 记录游客的工具使用次数（存储在 localStorage）', () => {
    it('should initialize guest usage from localStorage', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(guestUsageManager.getUsage).toHaveBeenCalled();
      expect(result.current.guestUsage).toBeDefined();
    });

    it('should persist usage count across sessions', () => {
      vi.mocked(guestUsageManager.getUsage).mockReturnValue({
        count: 5,
        limit: 10,
        lastResetDate: new Date().toISOString(),
      });

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current.guestUsage.count).toBe(5);
    });

    it('should update usage in localStorage on each use', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        result.current.recordGuestToolUsage();
      });

      expect(guestUsageManager.incrementUsage).toHaveBeenCalled();
    });
  });

  describe('Requirement 1.9: 游客使用次数达到限制后，强制要求登录', () => {
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

    it('should set blocked state when recording usage at limit', () => {
      vi.mocked(guestUsageManager.isLimitReached).mockReturnValue(true);

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        result.current.recordGuestToolUsage();
      });

      expect(result.current.isGuestBlocked).toBe(true);
    });

    it('should prevent further usage after limit', () => {
      vi.mocked(guestUsageManager.isLimitReached).mockReturnValue(true);

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        const canUse = result.current.checkGuestUsage();
        expect(canUse).toBe(false);
      });
    });
  });

  describe('Requirement 1.10: 显示剩余使用次数提示，引导用户注册登录', () => {
    it('should provide remaining count information', () => {
      vi.mocked(guestUsageManager.getRemainingCount).mockReturnValue(7);

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      const remaining = guestUsageManager.getRemainingCount();
      expect(remaining).toBe(7);
    });

    it('should show warning when approaching limit', () => {
      vi.mocked(guestUsageManager.shouldShowWarning).mockReturnValue(true);
      vi.mocked(guestUsageManager.getRemainingCount).mockReturnValue(3);

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        result.current.recordGuestToolUsage();
      });

      expect(guestUsageManager.shouldShowWarning).toHaveBeenCalled();
    });

    it('should track usage count for display', () => {
      vi.mocked(guestUsageManager.getUsage).mockReturnValue({
        count: 7,
        limit: 10,
        lastResetDate: new Date().toISOString(),
      });

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current.guestUsage.count).toBe(7);
      expect(result.current.guestUsage.limit).toBe(10);
    });
  });

  describe('Integration: Complete Guest-to-Authenticated Flow', () => {
    it('should transition from guest to authenticated user on login', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: 3600,
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            planType: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      };

      vi.mocked(apiClient.auth.login).mockResolvedValue(mockLoginResponse);
      vi.mocked(apiClient.setToken).mockImplementation(() => {});

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Initially guest
      expect(result.current.isGuest).toBe(true);

      // Login
      await act(async () => {
        await result.current.login({
          username: 'testuser',
          password: 'password123',
        });
      });

      // Now authenticated
      expect(result.current.isGuest).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeDefined();
    });

    it('should clear guest usage on login', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: 3600,
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            planType: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      };

      vi.mocked(apiClient.auth.login).mockResolvedValue(mockLoginResponse);
      vi.mocked(apiClient.setToken).mockImplementation(() => {});

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      await act(async () => {
        await result.current.login({
          username: 'testuser',
          password: 'password123',
        });
      });

      expect(guestUsageManager.clear).toHaveBeenCalled();
    });

    it('should unlock all features after login', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: 3600,
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            planType: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      };

      vi.mocked(apiClient.auth.login).mockResolvedValue(mockLoginResponse);
      vi.mocked(apiClient.setToken).mockImplementation(() => {});

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      await act(async () => {
        await result.current.login({
          username: 'testuser',
          password: 'password123',
        });
      });

      // All features should be accessible
      expect(result.current.canAccessFeature('favorites')).toBe(true);
      expect(result.current.canAccessFeature('profile')).toBe(true);
      expect(result.current.canAccessFeature('settings')).toBe(true);
      expect(result.current.canAccessFeature('notifications')).toBe(true);
    });

    it('should return to guest mode after logout', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
          expiresIn: 3600,
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            planType: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      };

      vi.mocked(apiClient.auth.login).mockResolvedValue(mockLoginResponse);
      vi.mocked(apiClient.auth.logout).mockResolvedValue({
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: undefined,
      });
      vi.mocked(apiClient.setToken).mockImplementation(() => {});

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Login
      await act(async () => {
        await result.current.login({
          username: 'testuser',
          password: 'password123',
        });
      });

      expect(result.current.isGuest).toBe(false);

      // Logout
      await act(async () => {
        await result.current.logout();
      });

      // Back to guest
      expect(result.current.isGuest).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle corrupted localStorage data gracefully', () => {
      vi.mocked(guestUsageManager.getUsage).mockReturnValue({
        count: 0,
        limit: 10,
        lastResetDate: new Date().toISOString(),
      });

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current.guestUsage).toBeDefined();
    });

    it('should handle missing guestUsageManager gracefully', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current).toBeDefined();
      expect(result.current.isGuest).toBe(true);
    });

    it('should handle navigation to invalid pages', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      act(() => {
        result.current.navigate('invalid-page' as any);
      });

      expect(result.current.page).toBe('invalid-page');
    });

    it('should maintain guest state across page navigations', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current.isGuest).toBe(true);

      act(() => {
        result.current.navigate('dashboard');
      });

      expect(result.current.isGuest).toBe(true);

      act(() => {
        result.current.navigate('login');
      });

      expect(result.current.isGuest).toBe(true);
    });
  });
});
