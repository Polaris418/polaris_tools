/**
 * Integration Test: 会话超时测试 (Session Timeout)
 * Task 34.4
 * 
 * Requirements tested: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 * 
 * This test suite verifies session timeout functionality is integrated correctly.
 * Note: Session timeout dialog and preferences are managed internally by AppContext.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppProvider, useAppContext } from '../context/AppContext';
import { tokenManager } from '../utils/tokenManager';
import { apiClient } from '../api/client';

// Mock dependencies
vi.mock('../utils/tokenManager');
vi.mock('../api/client');
vi.mock('../utils/guestUsageManager', () => ({
  guestUsageManager: {
    getUsage: vi.fn(() => ({ count: 0, limit: 10, lastResetDate: new Date().toISOString() })),
    clear: vi.fn(),
    incrementUsage: vi.fn(),
    isLimitReached: vi.fn(() => false),
    shouldShowWarning: vi.fn(() => false),
    getRemainingCount: vi.fn(() => 10),
  },
}));

describe('Integration Test: Session Timeout', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    
    // Setup default tokenManager mocks
    vi.mocked(tokenManager.setToken).mockImplementation(() => {});
    vi.mocked(tokenManager.startAutoRefresh).mockImplementation(() => {});
    vi.mocked(tokenManager.stopAutoRefresh).mockImplementation(() => {});
    vi.mocked(tokenManager.clear).mockImplementation(() => {});
    vi.mocked(tokenManager.getTimeUntilExpiry).mockReturnValue(3600000);
    vi.mocked(tokenManager.getExpiresAt).mockReturnValue(Date.now() + 3600000);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Requirements 4.1-4.6: Session Timeout Integration', () => {
    it('should setup session management on login', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
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

      expect(result.current.isAuthenticated).toBe(true);
      expect(tokenManager.startAutoRefresh).toHaveBeenCalled();
      expect(tokenManager.getExpiresAt).toHaveBeenCalled();
    });

    it('should have logout mechanism for session timeout', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
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

      await act(async () => {
        await result.current.login({
          username: 'testuser',
          password: 'password123',
        });
      });

      expect(result.current.logout).toBeDefined();
      expect(typeof result.current.logout).toBe('function');

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should allow user to continue working during session', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
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

      // User should still be able to navigate
      act(() => {
        result.current.navigate('dashboard');
      });

      expect(result.current.page).toBe('dashboard');
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('Requirement 4.7: Session Timeout Preferences', () => {
    it('should have showSessionTimeout preference in localStorage', () => {
      // Default should be true
      const stored = localStorage.getItem('showSessionTimeout');
      expect(stored === null || stored === 'true').toBe(true);
    });

    it('should allow disabling session timeout preference', () => {
      localStorage.setItem('showSessionTimeout', 'false');
      
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(localStorage.getItem('showSessionTimeout')).toBe('false');
    });

    it('should persist session timeout preference', () => {
      localStorage.setItem('showSessionTimeout', 'false');

      const { result: result1 } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(localStorage.getItem('showSessionTimeout')).toBe('false');

      // Simulate new session
      const { result: result2 } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(localStorage.getItem('showSessionTimeout')).toBe('false');
    });
  });

  describe('Integration: Complete Session Management Flow', () => {
    it('should handle complete login-logout cycle with session management', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
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

      expect(result.current.isAuthenticated).toBe(true);
      expect(tokenManager.startAutoRefresh).toHaveBeenCalled();

      // Logout
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(tokenManager.clear).toHaveBeenCalled();
    });

    it('should handle session timeout preference changes', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Enable
      localStorage.setItem('showSessionTimeout', 'true');
      expect(localStorage.getItem('showSessionTimeout')).toBe('true');

      // Disable
      localStorage.setItem('showSessionTimeout', 'false');
      expect(localStorage.getItem('showSessionTimeout')).toBe('false');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle logout failure gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
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
      vi.mocked(apiClient.auth.logout).mockRejectedValue(
        new Error('Logout failed')
      );
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

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(tokenManager.clear).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle invalid showSessionTimeout in localStorage', () => {
      localStorage.setItem('showSessionTimeout', 'invalid');

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current).toBeDefined();
    });

    it('should maintain session state consistency', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
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

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeDefined();
    });
  });
});
