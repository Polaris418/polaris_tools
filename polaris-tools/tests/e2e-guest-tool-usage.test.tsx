/**
 * E2E Test: 游客使用工具流程 (Guest Tool Usage Flow)
 * Task 35.1
 * 
 * This test suite simulates complete end-to-end user workflows for guest users
 * using tools, from initial visit to hitting usage limits.
 * 
 * Requirements tested: 1.1, 1.2, 1.3, 1.8, 1.9
 * 
 * Test Scenarios:
 * - Guest visits site and uses tools
 * - Usage tracking and limit enforcement
 * - Transition to login when limit reached
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AppProvider, useAppContext } from '../context/AppContext';
import { guestUsageManager } from '../utils/guestUsageManager';
import { apiClient } from '../api/client';

// Mock dependencies
vi.mock('../api/client');
vi.mock('../utils/guestUsageManager');

describe('E2E Test: Guest Tool Usage Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(guestUsageManager.getUsage).mockReturnValue({
      count: 0,
      limit: 10,
      lastResetDate: new Date().toISOString(),
    });
    vi.mocked(guestUsageManager.clear).mockImplementation(() => {});
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Scenario 1: New Guest User Visits and Uses Tools', () => {
    it('should complete full guest workflow from visit to tool usage', async () => {
      // Step 1: Guest visits the site
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Verify initial guest state
      expect(result.current.isGuest).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();

      // Step 2: Guest navigates to dashboard
      act(() => {
        result.current.navigate('dashboard');
      });

      expect(result.current.page).toBe('dashboard');
      expect(result.current.canAccessFeature('dashboard')).toBe(true);

      // Step 3: Guest views available tools
      expect(result.current.canAccessFeature('tool')).toBe(true);

      // Step 4: Guest uses a tool (first time)
      vi.mocked(guestUsageManager.incrementUsage).mockReturnValue({
        count: 1,
        limit: 10,
        lastResetDate: new Date().toISOString(),
      });
      vi.mocked(guestUsageManager.isLimitReached).mockReturnValue(false);
      vi.mocked(guestUsageManager.shouldShowWarning).mockReturnValue(false);
      vi.mocked(guestUsageManager.getRemainingCount).mockReturnValue(9);

      act(() => {
        const canUse = result.current.checkGuestUsage();
        expect(canUse).toBe(true);
        result.current.recordGuestToolUsage();
      });

      expect(result.current.guestUsage.count).toBe(1);
      expect(guestUsageManager.incrementUsage).toHaveBeenCalled();

      // Step 5: Guest uses tool multiple times
      for (let i = 2; i <= 5; i++) {
        vi.mocked(guestUsageManager.incrementUsage).mockReturnValue({
          count: i,
          limit: 10,
          lastResetDate: new Date().toISOString(),
        });
        vi.mocked(guestUsageManager.getRemainingCount).mockReturnValue(10 - i);

        act(() => {
          result.current.recordGuestToolUsage();
        });

        expect(result.current.guestUsage.count).toBe(i);
      }

      // Verify usage is tracked
      expect(result.current.guestUsage.count).toBe(5);
      expect(result.current.isGuestBlocked).toBe(false);
    });
  });

  describe('Scenario 2: Guest Approaches Usage Limit', () => {
    it('should show warning when approaching limit and block at limit', async () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Step 1: Guest has used 7 times (3 remaining)
      vi.mocked(guestUsageManager.getUsage).mockReturnValue({
        count: 7,
        limit: 10,
        lastResetDate: new Date().toISOString(),
      });
      vi.mocked(guestUsageManager.shouldShowWarning).mockReturnValue(true);
      vi.mocked(guestUsageManager.getRemainingCount).mockReturnValue(3);
      vi.mocked(guestUsageManager.isLimitReached).mockReturnValue(false);

      // Trigger usage check
      act(() => {
        result.current.recordGuestToolUsage();
      });

      // Warning should be shown
      expect(guestUsageManager.shouldShowWarning).toHaveBeenCalled();

      // Step 2: Guest uses 2 more times (1 remaining)
      vi.mocked(guestUsageManager.incrementUsage).mockReturnValue({
        count: 9,
        limit: 10,
        lastResetDate: new Date().toISOString(),
      });
      vi.mocked(guestUsageManager.getRemainingCount).mockReturnValue(1);

      act(() => {
        result.current.recordGuestToolUsage();
      });

      expect(result.current.guestUsage.count).toBe(9);

      // Step 3: Guest uses last time (0 remaining)
      vi.mocked(guestUsageManager.incrementUsage).mockReturnValue({
        count: 10,
        limit: 10,
        lastResetDate: new Date().toISOString(),
      });
      vi.mocked(guestUsageManager.isLimitReached).mockReturnValue(true);
      vi.mocked(guestUsageManager.getRemainingCount).mockReturnValue(0);

      act(() => {
        result.current.recordGuestToolUsage();
      });

      // Should be blocked now
      expect(result.current.isGuestBlocked).toBe(true);
      expect(result.current.guestUsage.count).toBe(10);

      // Step 4: Guest tries to use again - should be blocked
      act(() => {
        const canUse = result.current.checkGuestUsage();
        expect(canUse).toBe(false);
      });

      expect(result.current.isGuestBlocked).toBe(true);
    });
  });

  describe('Scenario 3: Guest Reaches Limit and Logs In', () => {
    it('should transition from blocked guest to authenticated user', async () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Step 1: Guest is blocked
      vi.mocked(guestUsageManager.getUsage).mockReturnValue({
        count: 10,
        limit: 10,
        lastResetDate: new Date().toISOString(),
      });
      vi.mocked(guestUsageManager.isLimitReached).mockReturnValue(true);
      vi.mocked(guestUsageManager.getRemainingCount).mockReturnValue(0);

      act(() => {
        const canUse = result.current.checkGuestUsage();
        expect(canUse).toBe(false);
      });

      expect(result.current.isGuestBlocked).toBe(true);

      // Step 2: Guest navigates to login page
      act(() => {
        result.current.navigate('login');
      });

      expect(result.current.page).toBe('login');

      // Step 3: Guest logs in
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

      await act(async () => {
        await result.current.login({
          username: 'testuser',
          password: 'password123',
        });
      });

      // Step 4: Verify transition to authenticated user
      expect(result.current.isGuest).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeDefined();
      expect(result.current.isGuestBlocked).toBe(false);

      // Step 5: Verify guest usage is cleared
      expect(guestUsageManager.clear).toHaveBeenCalled();

      // Step 6: Verify all features are now accessible
      expect(result.current.canAccessFeature('favorites')).toBe(true);
      expect(result.current.canAccessFeature('profile')).toBe(true);
      expect(result.current.canAccessFeature('settings')).toBe(true);

      // Step 7: User can now use tools without limits
      expect(result.current.isGuest).toBe(false);
      // No more guest usage tracking
    });
  });

  describe('Scenario 4: Guest Tries to Access Protected Features', () => {
    it('should prompt login when accessing protected features', async () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Step 1: Guest is on dashboard
      act(() => {
        result.current.navigate('dashboard');
      });

      expect(result.current.isGuest).toBe(true);

      // Step 2: Guest tries to access favorites
      const canAccessFavorites = result.current.canAccessFeature('favorites');
      expect(canAccessFavorites).toBe(false);

      // Step 3: Prompt login is triggered
      act(() => {
        result.current.promptLogin('访问收藏功能需要登录');
      });

      // Verify promptLogin function exists and can be called
      expect(typeof result.current.promptLogin).toBe('function');

      // Step 4: Guest tries to access profile
      const canAccessProfile = result.current.canAccessFeature('profile');
      expect(canAccessProfile).toBe(false);

      // Step 5: Guest tries to access settings
      const canAccessSettings = result.current.canAccessFeature('settings');
      expect(canAccessSettings).toBe(false);

      // Step 6: Guest tries to access notifications
      const canAccessNotifications = result.current.canAccessFeature('notifications');
      expect(canAccessNotifications).toBe(false);

      // Step 7: Guest can still access public features
      expect(result.current.canAccessFeature('dashboard')).toBe(true);
      expect(result.current.canAccessFeature('tool')).toBe(true);
      expect(result.current.canAccessFeature('category')).toBe(true);
    });
  });

  describe('Scenario 5: Guest Usage Persistence Across Sessions', () => {
    it('should maintain usage count across page reloads', async () => {
      // Step 1: First session - guest uses tools
      vi.mocked(guestUsageManager.getUsage).mockReturnValue({
        count: 5,
        limit: 10,
        lastResetDate: new Date().toISOString(),
      });

      const { result: result1 } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result1.current.guestUsage.count).toBe(5);

      // Step 2: Simulate page reload - new context instance
      vi.mocked(guestUsageManager.getUsage).mockReturnValue({
        count: 5,
        limit: 10,
        lastResetDate: new Date().toISOString(),
      });

      const { result: result2 } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Usage count should persist
      expect(result2.current.guestUsage.count).toBe(5);

      // Step 3: Continue using tools
      vi.mocked(guestUsageManager.incrementUsage).mockReturnValue({
        count: 6,
        limit: 10,
        lastResetDate: new Date().toISOString(),
      });

      act(() => {
        result2.current.recordGuestToolUsage();
      });

      expect(result2.current.guestUsage.count).toBe(6);
    });
  });

  describe('Scenario 6: Anonymous Usage Statistics', () => {
    it('should track anonymous usage without user identity', async () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Step 1: Verify guest has no user identity
      expect(result.current.user).toBeNull();
      expect(result.current.isGuest).toBe(true);

      // Step 2: Guest uses tool
      vi.mocked(guestUsageManager.incrementUsage).mockReturnValue({
        count: 1,
        limit: 10,
        lastResetDate: new Date().toISOString(),
      });

      act(() => {
        result.current.recordGuestToolUsage();
      });

      // Step 3: Verify usage is tracked anonymously
      expect(guestUsageManager.incrementUsage).toHaveBeenCalled();
      expect(result.current.user).toBeNull();

      // Step 4: Multiple tool uses
      for (let i = 2; i <= 5; i++) {
        vi.mocked(guestUsageManager.incrementUsage).mockReturnValue({
          count: i,
          limit: 10,
          lastResetDate: new Date().toISOString(),
        });

        act(() => {
          result.current.recordGuestToolUsage();
        });
      }

      // Step 5: Verify all usage is anonymous
      expect(result.current.guestUsage.count).toBe(5);
      expect(result.current.user).toBeNull();
    });
  });

  describe('Scenario 7: Complete Guest Journey', () => {
    it('should handle complete guest journey from visit to registration', async () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Step 1: Guest visits site
      expect(result.current.isGuest).toBe(true);
      expect(result.current.page).toBe('dashboard');

      // Step 2: Guest explores tools
      act(() => {
        result.current.navigate('dashboard');
      });

      // Step 3: Guest uses tools (5 times)
      for (let i = 1; i <= 5; i++) {
        vi.mocked(guestUsageManager.incrementUsage).mockReturnValue({
          count: i,
          limit: 10,
          lastResetDate: new Date().toISOString(),
        });
        vi.mocked(guestUsageManager.getRemainingCount).mockReturnValue(10 - i);
        vi.mocked(guestUsageManager.isLimitReached).mockReturnValue(false);

        act(() => {
          result.current.recordGuestToolUsage();
        });
      }

      expect(result.current.guestUsage.count).toBe(5);

      // Step 4: Guest tries to access favorites (blocked)
      expect(result.current.canAccessFeature('favorites')).toBe(false);

      // Step 5: Guest continues using tools (3 more times, warning shown)
      for (let i = 6; i <= 8; i++) {
        vi.mocked(guestUsageManager.incrementUsage).mockReturnValue({
          count: i,
          limit: 10,
          lastResetDate: new Date().toISOString(),
        });
        vi.mocked(guestUsageManager.getRemainingCount).mockReturnValue(10 - i);
        vi.mocked(guestUsageManager.shouldShowWarning).mockReturnValue(i >= 7);

        act(() => {
          result.current.recordGuestToolUsage();
        });
      }

      expect(result.current.guestUsage.count).toBe(8);

      // Step 6: Guest uses remaining 2 times
      for (let i = 9; i <= 10; i++) {
        vi.mocked(guestUsageManager.incrementUsage).mockReturnValue({
          count: i,
          limit: 10,
          lastResetDate: new Date().toISOString(),
        });
        vi.mocked(guestUsageManager.getRemainingCount).mockReturnValue(10 - i);
        vi.mocked(guestUsageManager.isLimitReached).mockReturnValue(i >= 10);

        act(() => {
          result.current.recordGuestToolUsage();
        });
      }

      // Step 7: Guest is now blocked
      expect(result.current.isGuestBlocked).toBe(true);

      // Step 8: Guest navigates to register page
      act(() => {
        result.current.navigate('register');
      });

      expect(result.current.page).toBe('register');

      // Step 9: After registration, guest becomes authenticated user
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
            username: 'newuser',
            email: 'new@example.com',
            planType: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      };

      vi.mocked(apiClient.auth.login).mockResolvedValue(mockLoginResponse);
      vi.mocked(apiClient.setToken).mockImplementation(() => {});

      await act(async () => {
        await result.current.login({
          username: 'newuser',
          password: 'password123',
        });
      });

      // Step 10: Verify complete transition
      expect(result.current.isGuest).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isGuestBlocked).toBe(false);
      expect(guestUsageManager.clear).toHaveBeenCalled();
      expect(result.current.canAccessFeature('favorites')).toBe(true);
    });
  });
});
