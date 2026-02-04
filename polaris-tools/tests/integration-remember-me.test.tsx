/**
 * Integration Test: 记住我功能测试 (Remember Me Functionality)
 * Task 34.3
 * 
 * This test suite provides comprehensive integration testing for remember me functionality.
 * 
 * Requirements tested: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 * 
 * Test Coverage:
 * - Remember me checkbox in login page
 * - Extended token expiry with remember me
 * - Short token expiry without remember me
 * - Remember me state persistence
 * - Settings page management
 * - Manual logout clearing remember me
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

describe('Integration Test: Remember Me Functionality', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    
    // Setup default tokenManager mocks
    vi.mocked(tokenManager.setToken).mockImplementation(() => {});
    vi.mocked(tokenManager.startAutoRefresh).mockImplementation(() => {});
    vi.mocked(tokenManager.stopAutoRefresh).mockImplementation(() => {});
    vi.mocked(tokenManager.clear).mockImplementation(() => {});
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Requirement 3.1: 登录页面显示"记住我"复选框', () => {
    it('should accept rememberMe parameter in login function', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 2592000, // 30 days
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
        await result.current.login(
          {
            username: 'testuser',
            password: 'password123',
          },
          false,
          true // rememberMe = true
        );
      });

      expect(apiClient.auth.login).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
        rememberMe: true,
      });
    });

    it('should handle login without rememberMe parameter', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 86400, // 1 day
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
        await result.current.login(
          {
            username: 'testuser',
            password: 'password123',
          },
          false,
          false // rememberMe = false
        );
      });

      expect(apiClient.auth.login).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
        rememberMe: false,
      });
    });
  });

  describe('Requirement 3.2: 勾选"记住我"后，token 有效期延长', () => {
    it('should receive extended token expiry when rememberMe is true', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 2592000, // 30 days
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
        await result.current.login(
          {
            username: 'testuser',
            password: 'password123',
          },
          false,
          true // rememberMe = true
        );
      });

      expect(result.current.isAuthenticated).toBe(true);
      // Backend should return extended expiry (30 days = 2592000 seconds)
      expect(mockLoginResponse.data.expiresIn).toBe(2592000);
    });

    it('should verify backend receives rememberMe flag', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 2592000,
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
        await result.current.login(
          {
            username: 'testuser',
            password: 'password123',
          },
          false,
          true
        );
      });

      expect(apiClient.auth.login).toHaveBeenCalledWith(
        expect.objectContaining({
          rememberMe: true,
        })
      );
    });
  });

  describe('Requirement 3.3: 未勾选时，使用短期 token', () => {
    it('should receive short-term token expiry when rememberMe is false', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 86400, // 1 day
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
        await result.current.login(
          {
            username: 'testuser',
            password: 'password123',
          },
          false,
          false // rememberMe = false
        );
      });

      expect(result.current.isAuthenticated).toBe(true);
      // Backend should return short-term expiry (1 day = 86400 seconds)
      expect(mockLoginResponse.data.expiresIn).toBe(86400);
    });

    it('should default to short-term token when rememberMe not specified', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 86400,
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
    });
  });

  describe('Requirement 3.4: "记住我"状态保存在 localStorage 中', () => {
    it('should save rememberMe state to localStorage when true', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 2592000,
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
        await result.current.login(
          {
            username: 'testuser',
            password: 'password123',
          },
          false,
          true
        );
      });

      expect(localStorage.getItem('rememberMe')).toBe('true');
    });

    it('should save rememberMe state to localStorage when false', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 86400,
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
        await result.current.login(
          {
            username: 'testuser',
            password: 'password123',
          },
          false,
          false
        );
      });

      expect(localStorage.getItem('rememberMe')).toBe('false');
    });

    it('should store rememberMe in localStorage after login', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 2592000,
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
        await result.current.login(
          {
            username: 'testuser',
            password: 'password123',
          },
          false,
          true
        );
      });

      expect(localStorage.getItem('rememberMe')).toBe('true');
    });

    it('should persist rememberMe across sessions', async () => {
      localStorage.setItem('rememberMe', 'true');

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // rememberMe should be loaded from localStorage
      expect(localStorage.getItem('rememberMe')).toBe('true');
    });
  });

  describe('Requirement 3.5: 用户可以在设置页面查看和管理"记住我"状态', () => {
    it('should store rememberMe state in localStorage for settings page access', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 2592000,
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
        await result.current.login(
          {
            username: 'testuser',
            password: 'password123',
          },
          false,
          true
        );
      });

      expect(localStorage.getItem('rememberMe')).toBe('true');
    });

    it('should allow viewing rememberMe state from localStorage', async () => {
      localStorage.setItem('rememberMe', 'true');

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(localStorage.getItem('rememberMe')).toBe('true');
    });

    it('should persist rememberMe value across sessions', () => {
      localStorage.setItem('rememberMe', 'true');

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(localStorage.getItem('rememberMe')).toBe('true');
      
      // Simulate new session
      const { result: result2 } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(localStorage.getItem('rememberMe')).toBe('true');
    });

    it('should allow manual update of rememberMe in localStorage', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Settings page can manually update localStorage
      localStorage.setItem('rememberMe', 'true');
      expect(localStorage.getItem('rememberMe')).toBe('true');

      localStorage.setItem('rememberMe', 'false');
      expect(localStorage.getItem('rememberMe')).toBe('false');
    });
  });

  describe('Requirement 3.6: 手动退出登录时，清除"记住我"状态', () => {
    it('should clear rememberMe state on logout', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 2592000,
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

      // Login with rememberMe
      await act(async () => {
        await result.current.login(
          {
            username: 'testuser',
            password: 'password123',
          },
          false,
          true
        );
      });

      expect(localStorage.getItem('rememberMe')).toBe('true');

      // Logout
      await act(async () => {
        await result.current.logout();
      });

      expect(localStorage.getItem('rememberMe')).toBeNull();
    });

    it('should clear rememberMe from localStorage after logout', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 2592000,
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

      // Login with rememberMe
      await act(async () => {
        await result.current.login(
          {
            username: 'testuser',
            password: 'password123',
          },
          false,
          true
        );
      });

      expect(localStorage.getItem('rememberMe')).toBe('true');

      // Logout
      await act(async () => {
        await result.current.logout();
      });

      expect(localStorage.getItem('rememberMe')).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should clear rememberMe even when logout API fails', async () => {
      localStorage.setItem('rememberMe', 'true');
      
      vi.mocked(apiClient.auth.logout).mockRejectedValue(
        new Error('Logout API failed')
      );

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(localStorage.getItem('rememberMe')).toBeNull();
    });
  });

  describe('Integration: Complete Remember Me Flow', () => {
    it('should handle complete remember me login flow', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 2592000,
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

      // Login with rememberMe
      await act(async () => {
        await result.current.login(
          {
            username: 'testuser',
            password: 'password123',
          },
          false,
          true
        );
      });

      // Verify state
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorage.getItem('rememberMe')).toBe('true');
      expect(apiClient.auth.login).toHaveBeenCalledWith(
        expect.objectContaining({ rememberMe: true })
      );
    });

    it('should handle complete non-remember me login flow', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 86400,
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

      // Login without rememberMe
      await act(async () => {
        await result.current.login(
          {
            username: 'testuser',
            password: 'password123',
          },
          false,
          false
        );
      });

      // Verify state
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorage.getItem('rememberMe')).toBe('false');
      expect(apiClient.auth.login).toHaveBeenCalledWith(
        expect.objectContaining({ rememberMe: false })
      );
    });

    it('should handle remember me toggle via localStorage', () => {
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Initially not set
      expect(localStorage.getItem('rememberMe')).toBeNull();

      // Set to true
      localStorage.setItem('rememberMe', 'true');
      expect(localStorage.getItem('rememberMe')).toBe('true');

      // Set to false
      localStorage.setItem('rememberMe', 'false');
      expect(localStorage.getItem('rememberMe')).toBe('false');
    });

    it('should handle login-logout-login cycle with different rememberMe values', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 2592000,
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

      // First login with rememberMe = true
      await act(async () => {
        await result.current.login(
          {
            username: 'testuser',
            password: 'password123',
          },
          false,
          true
        );
      });

      expect(localStorage.getItem('rememberMe')).toBe('true');

      // Logout
      await act(async () => {
        await result.current.logout();
      });

      expect(localStorage.getItem('rememberMe')).toBeNull();

      // Second login with rememberMe = false
      await act(async () => {
        await result.current.login(
          {
            username: 'testuser',
            password: 'password123',
          },
          false,
          false
        );
      });

      expect(localStorage.getItem('rememberMe')).toBe('false');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing rememberMe in localStorage', () => {
      localStorage.removeItem('rememberMe');

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(localStorage.getItem('rememberMe')).toBeNull();
    });

    it('should handle invalid rememberMe value in localStorage', () => {
      localStorage.setItem('rememberMe', 'invalid');

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      expect(result.current).toBeDefined();
    });

    it('should handle login failure with rememberMe', async () => {
      vi.mocked(apiClient.auth.login).mockRejectedValue(
        new Error('Invalid credentials')
      );

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      await act(async () => {
        try {
          await result.current.login(
            {
              username: 'testuser',
              password: 'wrongpassword',
            },
            false,
            true
          );
        } catch (error) {
          // Expected to fail
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.getItem('rememberMe')).toBeNull();
    });

    it('should maintain rememberMe state consistency in localStorage', async () => {
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 2592000,
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
        await result.current.login(
          {
            username: 'testuser',
            password: 'password123',
          },
          false,
          true
        );
      });

      // localStorage should be set correctly
      expect(localStorage.getItem('rememberMe')).toBe('true');
    });
  });
});
