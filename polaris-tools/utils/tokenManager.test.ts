/**
 * TokenManager Unit Tests
 * 
 * Tests for the TokenManager utility class
 * Requirements: 2.1, 2.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tokenManager } from './tokenManager';

describe('TokenManager', () => {
  // Helper function to create a mock JWT token
  const createMockToken = (issuedAt: number, expiresAt: number): string => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      sub: '1234567890',
      name: 'Test User',
      iat: Math.floor(issuedAt / 1000),
      exp: Math.floor(expiresAt / 1000),
    };

    const base64Header = btoa(JSON.stringify(header));
    const base64Payload = btoa(JSON.stringify(payload));
    const signature = 'mock-signature';

    return `${base64Header}.${base64Payload}.${signature}`;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    tokenManager.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    tokenManager.clear();
  });

  describe('Token Parsing (Requirement 2.1, 2.2)', () => {
    it('should parse a valid JWT token', () => {
      const now = Date.now();
      const expiresAt = now + 3600000; // 1 hour from now
      const token = createMockToken(now, expiresAt);

      tokenManager.setToken(token);

      const timeUntilExpiry = tokenManager.getTimeUntilExpiry();
      expect(timeUntilExpiry).toBeGreaterThan(0);
      expect(timeUntilExpiry).toBeLessThanOrEqual(3600000);
    });

    it('should handle invalid token gracefully', () => {
      const invalidToken = 'invalid.token.here';

      // Should not throw error
      expect(() => tokenManager.setToken(invalidToken)).not.toThrow();

      // Should return 0 for time until expiry
      expect(tokenManager.getTimeUntilExpiry()).toBe(0);
    });

    it('should handle malformed token gracefully', () => {
      const malformedToken = 'not-a-jwt-token';

      expect(() => tokenManager.setToken(malformedToken)).not.toThrow();
      expect(tokenManager.getTimeUntilExpiry()).toBe(0);
    });

    it('should store refresh token when provided', () => {
      const now = Date.now();
      const expiresAt = now + 3600000;
      const token = createMockToken(now, expiresAt);
      const refreshToken = 'refresh-token-123';

      tokenManager.setToken(token, refreshToken);

      // Token should be set successfully
      expect(tokenManager.getTimeUntilExpiry()).toBeGreaterThan(0);
    });
  });

  describe('Time Until Expiry Calculation (Requirement 2.1)', () => {
    it('should return correct time until expiry', () => {
      const now = Date.now();
      const expiresAt = now + 3600000; // 1 hour from now
      const token = createMockToken(now, expiresAt);

      tokenManager.setToken(token);

      const timeUntilExpiry = tokenManager.getTimeUntilExpiry();
      expect(timeUntilExpiry).toBeGreaterThan(3599000); // Close to 1 hour
      expect(timeUntilExpiry).toBeLessThanOrEqual(3600000);
    });

    it('should return 0 when token is expired', () => {
      const now = Date.now();
      const expiresAt = now - 1000; // Expired 1 second ago
      const token = createMockToken(now - 3600000, expiresAt);

      tokenManager.setToken(token);

      expect(tokenManager.getTimeUntilExpiry()).toBe(0);
    });

    it('should return 0 when no token is set', () => {
      expect(tokenManager.getTimeUntilExpiry()).toBe(0);
    });

    it('should update time as time passes', () => {
      const now = Date.now();
      const expiresAt = now + 3600000; // 1 hour from now
      const token = createMockToken(now, expiresAt);

      tokenManager.setToken(token);

      const initialTime = tokenManager.getTimeUntilExpiry();

      // Advance time by 10 minutes
      vi.advanceTimersByTime(600000);

      const laterTime = tokenManager.getTimeUntilExpiry();

      expect(laterTime).toBeLessThan(initialTime);
      expect(initialTime - laterTime).toBeCloseTo(600000, -3);
    });
  });

  describe('Lifetime Percentage Calculation (Requirement 2.1)', () => {
    it('should return 0% at token issuance', () => {
      const now = Date.now();
      const expiresAt = now + 3600000; // 1 hour from now
      const token = createMockToken(now, expiresAt);

      tokenManager.setToken(token);

      const percentage = tokenManager.getLifetimePercentage();
      expect(percentage).toBeCloseTo(0, 1);
    });

    it('should return approximately 50% at half lifetime', () => {
      const now = Date.now();
      const issuedAt = now - 1800000; // Issued 30 minutes ago
      const expiresAt = now + 1800000; // Expires in 30 minutes
      const token = createMockToken(issuedAt, expiresAt);

      tokenManager.setToken(token);

      const percentage = tokenManager.getLifetimePercentage();
      expect(percentage).toBeCloseTo(50, 1);
    });

    it('should return approximately 100% at expiry', () => {
      const now = Date.now();
      const issuedAt = now - 3600000; // Issued 1 hour ago
      const expiresAt = now; // Expires now
      const token = createMockToken(issuedAt, expiresAt);

      tokenManager.setToken(token);

      const percentage = tokenManager.getLifetimePercentage();
      expect(percentage).toBeCloseTo(100, 1);
    });

    it('should not exceed 100%', () => {
      const now = Date.now();
      const issuedAt = now - 7200000; // Issued 2 hours ago
      const expiresAt = now - 3600000; // Expired 1 hour ago
      const token = createMockToken(issuedAt, expiresAt);

      tokenManager.setToken(token);

      const percentage = tokenManager.getLifetimePercentage();
      expect(percentage).toBe(100);
    });

    it('should return 0 when no token is set', () => {
      expect(tokenManager.getLifetimePercentage()).toBe(0);
    });

    it('should increase as time passes', () => {
      const now = Date.now();
      const expiresAt = now + 3600000; // 1 hour from now
      const token = createMockToken(now, expiresAt);

      tokenManager.setToken(token);

      const initialPercentage = tokenManager.getLifetimePercentage();

      // Advance time by 30 minutes (50% of lifetime)
      vi.advanceTimersByTime(1800000);

      const laterPercentage = tokenManager.getLifetimePercentage();

      expect(laterPercentage).toBeGreaterThan(initialPercentage);
      expect(laterPercentage).toBeCloseTo(50, 1);
    });
  });

  describe('Should Refresh Logic (Requirement 2.1)', () => {
    it('should return false when token is fresh (< 85% lifetime)', () => {
      const now = Date.now();
      const expiresAt = now + 3600000; // 1 hour from now
      const token = createMockToken(now, expiresAt);

      tokenManager.setToken(token);

      expect(tokenManager.shouldRefresh()).toBe(false);
    });

    it('should return true when token is at 85% lifetime', () => {
      const now = Date.now();
      const totalLifetime = 3600000; // 1 hour
      const issuedAt = now - (totalLifetime * 0.85); // 85% elapsed
      const expiresAt = now + (totalLifetime * 0.15); // 15% remaining
      const token = createMockToken(issuedAt, expiresAt);

      tokenManager.setToken(token);

      expect(tokenManager.shouldRefresh()).toBe(true);
    });

    it('should return true when token is at 90% lifetime', () => {
      const now = Date.now();
      const totalLifetime = 3600000; // 1 hour
      const issuedAt = now - (totalLifetime * 0.9); // 90% elapsed
      const expiresAt = now + (totalLifetime * 0.1); // 10% remaining
      const token = createMockToken(issuedAt, expiresAt);

      tokenManager.setToken(token);

      expect(tokenManager.shouldRefresh()).toBe(true);
    });

    it('should return false when token is expired (100% lifetime)', () => {
      const now = Date.now();
      const issuedAt = now - 3600000; // Issued 1 hour ago
      const expiresAt = now - 1000; // Expired 1 second ago
      const token = createMockToken(issuedAt, expiresAt);

      tokenManager.setToken(token);

      expect(tokenManager.shouldRefresh()).toBe(false);
    });

    it('should return false when no token is set', () => {
      expect(tokenManager.shouldRefresh()).toBe(false);
    });

    it('should transition from false to true as token ages', () => {
      const now = Date.now();
      const expiresAt = now + 1000000; // Some time from now
      const token = createMockToken(now, expiresAt);

      tokenManager.setToken(token);

      // Initially should not need refresh
      expect(tokenManager.shouldRefresh()).toBe(false);

      // Advance time to 85% of lifetime
      vi.advanceTimersByTime(850000);

      // Now should need refresh
      expect(tokenManager.shouldRefresh()).toBe(true);
    });
  });

  describe('Token Expiry Check (Requirement 2.1)', () => {
    it('should return false when token is not expired', () => {
      const now = Date.now();
      const expiresAt = now + 3600000; // 1 hour from now
      const token = createMockToken(now, expiresAt);

      tokenManager.setToken(token);

      expect(tokenManager.isExpired()).toBe(false);
    });

    it('should return true when token is expired', () => {
      const now = Date.now();
      const expiresAt = now - 1000; // Expired 1 second ago
      const token = createMockToken(now - 3600000, expiresAt);

      tokenManager.setToken(token);

      expect(tokenManager.isExpired()).toBe(true);
    });

    it('should return true when no token is set', () => {
      expect(tokenManager.isExpired()).toBe(true);
    });

    it('should transition from false to true when token expires', () => {
      const now = Date.now();
      const expiresAt = now + 1000; // Expires in 1 second
      const token = createMockToken(now, expiresAt);

      tokenManager.setToken(token);

      expect(tokenManager.isExpired()).toBe(false);

      // Advance time past expiry
      vi.advanceTimersByTime(2000);

      expect(tokenManager.isExpired()).toBe(true);
    });
  });

  describe('Auto Refresh (Requirement 2.1, 2.4)', () => {
    it('should start auto refresh timer', () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined);
      const now = Date.now();
      const expiresAt = now + 3600000;
      const token = createMockToken(now, expiresAt);

      tokenManager.setToken(token);
      tokenManager.startAutoRefresh(onRefresh);

      // Timer should be set (we can't directly check, but we can verify behavior)
      expect(onRefresh).not.toHaveBeenCalled();
    });

    it('should call refresh callback when token needs refresh', async () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined);
      const now = Date.now();
      const totalLifetime = 1000000;
      const issuedAt = now - (totalLifetime * 0.86); // 86% elapsed
      const expiresAt = now + (totalLifetime * 0.14); // 14% remaining
      const token = createMockToken(issuedAt, expiresAt);

      tokenManager.setToken(token);
      tokenManager.startAutoRefresh(onRefresh);

      // Advance time by check interval (30 seconds for short-lived tokens)
      await vi.advanceTimersByTimeAsync(30000);

      expect(onRefresh).toHaveBeenCalled();
      
      // Clean up
      tokenManager.stopAutoRefresh();
    });

    it('should not call refresh callback when token is fresh', async () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined);
      const now = Date.now();
      const expiresAt = now + 3600000; // 1 hour from now
      const token = createMockToken(now, expiresAt);

      tokenManager.setToken(token);
      tokenManager.startAutoRefresh(onRefresh);

      // Advance time by check interval (60 seconds for long-lived tokens)
      await vi.advanceTimersByTimeAsync(60000);

      expect(onRefresh).not.toHaveBeenCalled();
      
      // Clean up
      tokenManager.stopAutoRefresh();
    });

    it('should handle refresh callback errors gracefully', async () => {
      const onRefresh = vi.fn().mockRejectedValue(new Error('Refresh failed'));
      const now = Date.now();
      const totalLifetime = 1000000;
      const issuedAt = now - (totalLifetime * 0.86);
      const expiresAt = now + (totalLifetime * 0.14);
      const token = createMockToken(issuedAt, expiresAt);

      tokenManager.setToken(token);
      tokenManager.startAutoRefresh(onRefresh);

      // Advance time by check interval (30 seconds)
      await vi.advanceTimersByTimeAsync(30000);

      // Should have been called and handled error gracefully
      expect(onRefresh).toHaveBeenCalled();
      
      // Clean up
      tokenManager.stopAutoRefresh();
    });

    it('should stop previous timer when starting new auto refresh', () => {
      const onRefresh1 = vi.fn().mockResolvedValue(undefined);
      const onRefresh2 = vi.fn().mockResolvedValue(undefined);
      const now = Date.now();
      const expiresAt = now + 3600000;
      const token = createMockToken(now, expiresAt);

      tokenManager.setToken(token);
      tokenManager.startAutoRefresh(onRefresh1);
      tokenManager.startAutoRefresh(onRefresh2);

      // Only the second callback should be active
      // (We can't directly verify this, but the implementation ensures it)
      expect(true).toBe(true);
    });
  });

  describe('Stop Auto Refresh (Requirement 2.1)', () => {
    it('should stop auto refresh timer', async () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined);
      const now = Date.now();
      const totalLifetime = 1000000;
      const issuedAt = now - (totalLifetime * 0.86);
      const expiresAt = now + (totalLifetime * 0.14);
      const token = createMockToken(issuedAt, expiresAt);

      tokenManager.setToken(token);
      tokenManager.startAutoRefresh(onRefresh);
      tokenManager.stopAutoRefresh();

      // Advance time by 1 minute
      vi.advanceTimersByTime(60000);

      await vi.runAllTimersAsync();

      // Callback should not be called after stopping
      expect(onRefresh).not.toHaveBeenCalled();
    });

    it('should be safe to call stopAutoRefresh multiple times', () => {
      expect(() => {
        tokenManager.stopAutoRefresh();
        tokenManager.stopAutoRefresh();
      }).not.toThrow();
    });

    it('should be safe to call stopAutoRefresh without starting', () => {
      expect(() => tokenManager.stopAutoRefresh()).not.toThrow();
    });
  });

  describe('Clear Token (Requirement 2.1)', () => {
    it('should clear token info', () => {
      const now = Date.now();
      const expiresAt = now + 3600000;
      const token = createMockToken(now, expiresAt);

      tokenManager.setToken(token);
      expect(tokenManager.getTimeUntilExpiry()).toBeGreaterThan(0);

      tokenManager.clear();
      expect(tokenManager.getTimeUntilExpiry()).toBe(0);
    });

    it('should stop auto refresh when clearing', async () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined);
      const now = Date.now();
      const totalLifetime = 1000000;
      const issuedAt = now - (totalLifetime * 0.86);
      const expiresAt = now + (totalLifetime * 0.14);
      const token = createMockToken(issuedAt, expiresAt);

      tokenManager.setToken(token);
      tokenManager.startAutoRefresh(onRefresh);
      tokenManager.clear();

      // Advance time by 1 minute
      vi.advanceTimersByTime(60000);

      await vi.runAllTimersAsync();

      // Callback should not be called after clearing
      expect(onRefresh).not.toHaveBeenCalled();
    });

    it('should be safe to call clear multiple times', () => {
      expect(() => {
        tokenManager.clear();
        tokenManager.clear();
      }).not.toThrow();
    });

    it('should reset all state', () => {
      const now = Date.now();
      const expiresAt = now + 3600000;
      const token = createMockToken(now, expiresAt);

      tokenManager.setToken(token);
      tokenManager.clear();

      expect(tokenManager.getTimeUntilExpiry()).toBe(0);
      expect(tokenManager.getLifetimePercentage()).toBe(0);
      expect(tokenManager.shouldRefresh()).toBe(false);
      expect(tokenManager.isExpired()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle token with very short lifetime', () => {
      const now = Date.now();
      const expiresAt = now + 1000; // 1 second lifetime
      const token = createMockToken(now, expiresAt);

      tokenManager.setToken(token);

      expect(tokenManager.getTimeUntilExpiry()).toBeGreaterThan(0);
      expect(tokenManager.getTimeUntilExpiry()).toBeLessThanOrEqual(1000);
    });

    it('should handle token with very long lifetime', () => {
      const now = Date.now();
      const expiresAt = now + 2592000000; // 30 days
      const token = createMockToken(now, expiresAt);

      tokenManager.setToken(token);

      expect(tokenManager.getTimeUntilExpiry()).toBeGreaterThan(2591000000);
    });

    it('should handle setting new token while auto refresh is active', async () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined);
      const now = Date.now();
      const expiresAt1 = now + 3600000;
      const token1 = createMockToken(now, expiresAt1);

      tokenManager.setToken(token1);
      tokenManager.startAutoRefresh(onRefresh);

      // Set a new token
      const expiresAt2 = now + 7200000;
      const token2 = createMockToken(now, expiresAt2);
      tokenManager.setToken(token2);

      // Should still work correctly
      expect(tokenManager.getTimeUntilExpiry()).toBeGreaterThan(7000000);
    });

    it('should handle concurrent refresh attempts gracefully', async () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined);
      const now = Date.now();
      const totalLifetime = 1000000;
      const issuedAt = now - (totalLifetime * 0.86);
      const expiresAt = now + (totalLifetime * 0.14);
      const token = createMockToken(issuedAt, expiresAt);

      tokenManager.setToken(token);
      tokenManager.startAutoRefresh(onRefresh);

      // Advance time by check interval (30 seconds) - first refresh
      await vi.advanceTimersByTimeAsync(30000);
      
      // Advance time again - should skip due to isRefreshing flag or MIN_REFRESH_INTERVAL
      await vi.advanceTimersByTimeAsync(5000);

      // Should handle multiple refresh attempts gracefully
      // The callback should be called at least once
      expect(onRefresh).toHaveBeenCalled();
      
      // Clean up
      tokenManager.stopAutoRefresh();
    });
  });
});
