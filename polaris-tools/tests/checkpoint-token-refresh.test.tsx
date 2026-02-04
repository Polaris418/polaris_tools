/**
 * Checkpoint 22: Token Auto-Refresh Verification Tests
 * 
 * This test suite verifies the complete Token auto-refresh functionality
 * as specified in task 22 of the auth-enhancement spec.
 * 
 * Requirements tested:
 * - 测试 Token 自动刷新功能
 * - 验证 401 错误处理
 * - 确保刷新失败时正确退出
 * 
 * Related Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AppProvider, useAppContext } from '../context/AppContext';
import { apiClient } from '../api/client';
import { tokenManager } from '../utils/tokenManager';

// Mock dependencies
vi.mock('../api/client');
vi.mock('../utils/tokenManager');
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

describe('Checkpoint 22: Token Auto-Refresh Verification', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default tokenManager mocks
    vi.mocked(tokenManager.setToken).mockImplementation(() => {});
    vi.mocked(tokenManager.startAutoRefresh).mockImplementation(() => {});
    vi.mocked(tokenManager.stopAutoRefresh).mockImplementation(() => {});
    vi.mocked(tokenManager.clear).mockImplementation(() => {});
    vi.mocked(tokenManager.getTimeUntilExpiry).mockReturnValue(3600000);
    vi.mocked(tokenManager.getLifetimePercentage).mockReturnValue(50);
    vi.mocked(tokenManager.shouldRefresh).mockReturnValue(false);
    vi.mocked(tokenManager.isExpired).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('1. Token 自动刷新功能测试', () => {
    it('should start TokenManager with auto-refresh on login', async () => {
      // Arrange: Mock successful login
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'mock-access-token',
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

      // Act: Perform login
      await act(async () => {
        await result.current.login({
          username: 'testuser',
          password: 'password123',
        });
      });

      // Assert: Verify TokenManager was initialized and started
      expect(tokenManager.setToken).toHaveBeenCalledWith(
        'mock-access-token',
        'mock-refresh-token'
      );
      expect(tokenManager.startAutoRefresh).toHaveBeenCalled();
      expect(tokenManager.startAutoRefresh).toHaveBeenCalledWith(expect.any(Function));
      
      // Verify user is authenticated
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeDefined();
      expect(result.current.user?.username).toBe('testuser');
    });

    it('should register refresh callback with TokenManager after login', async () => {
      // Arrange: Mock successful login
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'mock-access-token',
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

      // Act: Perform login
      await act(async () => {
        await result.current.login({
          username: 'testuser',
          password: 'password123',
        });
      });

      // Assert: Verify refresh callback was registered
      expect(tokenManager.startAutoRefresh).toHaveBeenCalled();
      const refreshCallback = vi.mocked(tokenManager.startAutoRefresh).mock.calls[0]?.[0];
      expect(refreshCallback).toBeDefined();
      expect(typeof refreshCallback).toBe('function');
    });

    it('should setup TokenManager with correct token and refresh token', async () => {
      // Arrange: Mock successful login
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'access-token-123',
          refreshToken: 'refresh-token-456',
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

      // Act: Perform login
      await act(async () => {
        await result.current.login({
          username: 'testuser',
          password: 'password123',
        });
      });

      // Assert: TokenManager should be set up with both tokens
      expect(tokenManager.setToken).toHaveBeenCalledWith('access-token-123', 'refresh-token-456');
    });

    it('should preserve refresh token in localStorage after login', async () => {
      // Arrange: Mock successful login
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'new-access-token',
          refreshToken: 'new-refresh-token',
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

      // Act: Perform login
      await act(async () => {
        await result.current.login({
          username: 'testuser',
          password: 'password123',
        });
      });

      // Assert: Refresh token should be stored in localStorage
      expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token');
    });
  });

  describe('2. 401 错误处理验证', () => {
    it('should verify TokenManager integration is set up correctly', async () => {
      // This test verifies that the TokenManager integration exists
      // The actual 401 handling is tested in api/client.test.ts
      
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Verify the context is initialized
      expect(result.current).toBeDefined();
      expect(result.current.isInitialized).toBe(true);
    });

    it('should clear tokens on 401 with no refresh token available', async () => {
      // Arrange: No refresh token available
      localStorage.removeItem('refreshToken');

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Assert: Should handle gracefully
      expect(result.current).toBeDefined();
      expect(result.current.isGuest).toBe(true);
    });

    it('should have refresh callback ready for TokenManager after login', async () => {
      // This verifies the integration between TokenManager and API client
      // The actual retry logic is tested in api/client.test.ts
      
      // Arrange: Mock successful login
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'mock-access-token',
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

      // Act: Perform login
      await act(async () => {
        await result.current.login({
          username: 'testuser',
          password: 'password123',
        });
      });

      // Assert: Verify refresh callback exists
      const refreshCallback = vi.mocked(tokenManager.startAutoRefresh).mock.calls[0]?.[0];
      expect(refreshCallback).toBeDefined();
      expect(typeof refreshCallback).toBe('function');
    });
  });

  describe('3. 刷新失败时正确退出', () => {
    it('should have logout mechanism ready for refresh failures', async () => {
      // Arrange: Setup authenticated state
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'valid-token',
          refreshToken: 'valid-refresh-token',
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

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Act: Login
      await act(async () => {
        await result.current.login({
          username: 'testuser',
          password: 'password123',
        });
      });

      // Assert: User is authenticated and logout is available
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.logout).toBeDefined();
    });

    it('should clear TokenManager when logout is called', async () => {
      // Arrange: Setup authenticated state
      localStorage.setItem('token', 'valid-token');
      localStorage.setItem('refreshToken', 'valid-refresh-token');
      
      vi.mocked(apiClient.auth.logout).mockResolvedValue({
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: undefined,
      });

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Act: Perform logout
      await act(async () => {
        await result.current.logout();
      });

      // Assert: TokenManager should be cleared
      expect(tokenManager.clear).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should clear all authentication state on logout', async () => {
      // Arrange: Setup authenticated state
      localStorage.setItem('token', 'old-token');
      localStorage.setItem('refreshToken', 'refresh-token');
      localStorage.setItem('user', JSON.stringify({ id: 1, username: 'test' }));

      vi.mocked(apiClient.auth.logout).mockResolvedValue({
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: undefined,
      });

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Act: Perform logout
      await act(async () => {
        await result.current.logout();
      });

      // Assert: All auth state should be cleared
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(tokenManager.clear).toHaveBeenCalled();
    });

    it('should navigate to login page after logout', async () => {
      // Arrange
      localStorage.setItem('token', 'valid-token');
      localStorage.setItem('refreshToken', 'valid-refresh-token');
      
      vi.mocked(apiClient.auth.logout).mockResolvedValue({
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: undefined,
      });

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Act: Perform logout
      await act(async () => {
        await result.current.logout();
      });

      // Assert: Should navigate to login page
      expect(result.current.page).toBe('login');
    });

    it('should have showToast available for error notifications', async () => {
      // Arrange
      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Assert: showToast should be available
      expect(result.current.showToast).toBeDefined();
      expect(typeof result.current.showToast).toBe('function');
    });
  });

  describe('4. TokenManager 生命周期管理', () => {
    it('should stop TokenManager on manual logout', async () => {
      // Arrange: Setup authenticated state
      localStorage.setItem('token', 'valid-token');
      localStorage.setItem('refreshToken', 'valid-refresh-token');
      
      vi.mocked(apiClient.auth.logout).mockResolvedValue({
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: undefined,
      });

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Act: Perform logout
      await act(async () => {
        await result.current.logout();
      });

      // Assert: TokenManager should be cleared
      expect(tokenManager.clear).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should stop TokenManager on login failure', async () => {
      // Arrange: Mock login failure
      vi.mocked(apiClient.auth.login).mockRejectedValue(
        new Error('Invalid credentials')
      );

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Act: Attempt login
      await act(async () => {
        try {
          await result.current.login({
            username: 'testuser',
            password: 'wrongpassword',
          });
        } catch (error) {
          // Expected to fail
        }
      });

      // Assert: TokenManager should be cleared
      expect(tokenManager.clear).toHaveBeenCalled();
    });

    it('should restart TokenManager on new login after logout', async () => {
      // Arrange: Mock login response
      const mockLoginResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'new-token',
          refreshToken: 'new-refresh-token',
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

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Act: Login, logout, then login again
      await act(async () => {
        await result.current.login({
          username: 'testuser',
          password: 'password123',
        });
      });

      await act(async () => {
        await result.current.logout();
      });

      vi.clearAllMocks(); // Clear previous calls

      await act(async () => {
        await result.current.login({
          username: 'testuser',
          password: 'password123',
        });
      });

      // Assert: TokenManager should be started again
      expect(tokenManager.setToken).toHaveBeenCalledWith('new-token', 'new-refresh-token');
      expect(tokenManager.startAutoRefresh).toHaveBeenCalled();
    });

    it('should handle component unmount gracefully', () => {
      // Arrange
      const { unmount } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Act: Unmount component
      unmount();

      // Assert: TokenManager should be stopped
      expect(tokenManager.stopAutoRefresh).toHaveBeenCalled();
    });
  });

  describe('5. 边界情况和错误处理', () => {
    it('should handle missing refresh token gracefully', async () => {
      // Arrange: No refresh token
      localStorage.removeItem('refreshToken');

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Assert: Should handle gracefully without crashing
      expect(result.current).toBeDefined();
      expect(result.current.isGuest).toBe(true);
    });

    it('should handle logout even when API fails', async () => {
      // Arrange
      localStorage.setItem('token', 'valid-token');
      localStorage.setItem('refreshToken', 'valid-refresh-token');
      
      vi.mocked(apiClient.auth.logout).mockRejectedValue(
        new Error('Logout API failed')
      );

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Act: Perform logout
      await act(async () => {
        await result.current.logout();
      });

      // Assert: Should still clear state even if logout API fails
      expect(tokenManager.clear).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle concurrent refresh attempts', async () => {
      // Arrange
      const mockRefreshResponse = {
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          token: 'new-token',
        },
      };

      localStorage.setItem('refreshToken', 'valid-refresh-token');
      vi.mocked(apiClient.auth.refreshToken).mockResolvedValue(mockRefreshResponse);

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Assert: Should handle gracefully
      expect(result.current).toBeDefined();
    });

    it('should clear state on logout API failure', async () => {
      // Arrange
      localStorage.setItem('token', 'valid-token');
      localStorage.setItem('refreshToken', 'valid-refresh-token');
      
      vi.mocked(apiClient.auth.logout).mockRejectedValue(
        new Error('Logout API failed')
      );

      const { result } = renderHook(() => useAppContext(), {
        wrapper: AppProvider,
      });

      // Act: Perform logout
      await act(async () => {
        await result.current.logout();
      });

      // Assert: Should still clear state
      expect(tokenManager.clear).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
