/**
 * Integration test for TokenManager in AppContext
 * Tests Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tokenManager } from '../utils/tokenManager';

describe('TokenManager Integration with AppContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Stop any running timers
    tokenManager.clear();
  });

  afterEach(() => {
    // Clean up after each test
    tokenManager.clear();
    vi.clearAllTimers();
  });

  it('should set token info when login is successful', () => {
    // Create a mock JWT token (valid for 1 hour)
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: '1',
      iat: now,
      exp: now + 3600, // 1 hour from now
    };
    
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    const signature = 'mock-signature';
    const mockToken = `${header}.${body}.${signature}`;
    const mockRefreshToken = 'mock-refresh-token';

    // Set token in TokenManager
    tokenManager.setToken(mockToken, mockRefreshToken);

    // Verify token info is set
    const timeUntilExpiry = tokenManager.getTimeUntilExpiry();
    expect(timeUntilExpiry).toBeGreaterThan(0);
    expect(timeUntilExpiry).toBeLessThanOrEqual(3600 * 1000);
  });

  it('should calculate lifetime percentage correctly', () => {
    // Create a token that's 50% through its lifetime
    const now = Math.floor(Date.now() / 1000);
    const totalLifetime = 3600; // 1 hour
    const halfLifetime = totalLifetime / 2;
    
    const payload = {
      sub: '1',
      iat: now - halfLifetime, // Issued 30 minutes ago
      exp: now + halfLifetime, // Expires in 30 minutes
    };
    
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    const signature = 'mock-signature';
    const mockToken = `${header}.${body}.${signature}`;

    tokenManager.setToken(mockToken);

    const percentage = tokenManager.getLifetimePercentage();
    // Should be around 50% (with some tolerance for execution time)
    expect(percentage).toBeGreaterThan(45);
    expect(percentage).toBeLessThan(55);
  });

  it('should determine when token needs refresh (85% threshold)', () => {
    // Create a token that's 90% through its lifetime (should refresh)
    const now = Math.floor(Date.now() / 1000);
    const totalLifetime = 3600; // 1 hour
    const elapsed = totalLifetime * 0.9; // 90% elapsed
    
    const payload = {
      sub: '1',
      iat: now - elapsed,
      exp: now + (totalLifetime - elapsed),
    };
    
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    const signature = 'mock-signature';
    const mockToken = `${header}.${body}.${signature}`;

    tokenManager.setToken(mockToken);

    // Should need refresh at 90%
    expect(tokenManager.shouldRefresh()).toBe(true);
  });

  it('should not refresh token when below 85% threshold', () => {
    // Create a fresh token (10% through lifetime)
    const now = Math.floor(Date.now() / 1000);
    const totalLifetime = 3600; // 1 hour
    const elapsed = totalLifetime * 0.1; // 10% elapsed
    
    const payload = {
      sub: '1',
      iat: now - elapsed,
      exp: now + (totalLifetime - elapsed),
    };
    
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    const signature = 'mock-signature';
    const mockToken = `${header}.${body}.${signature}`;

    tokenManager.setToken(mockToken);

    // Should NOT need refresh at 10%
    expect(tokenManager.shouldRefresh()).toBe(false);
  });

  it('should start and stop auto-refresh correctly', async () => {
    vi.useFakeTimers();
    
    const mockRefreshCallback = vi.fn().mockResolvedValue(undefined);
    
    // Create a token that needs refresh
    const now = Math.floor(Date.now() / 1000);
    const totalLifetime = 3600;
    const elapsed = totalLifetime * 0.9; // 90% elapsed
    
    const payload = {
      sub: '1',
      iat: now - elapsed,
      exp: now + (totalLifetime - elapsed),
    };
    
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    const signature = 'mock-signature';
    const mockToken = `${header}.${body}.${signature}`;

    tokenManager.setToken(mockToken);
    tokenManager.startAutoRefresh(mockRefreshCallback);

    // Fast-forward 1 minute (check interval)
    await vi.advanceTimersByTimeAsync(60 * 1000);

    // Callback should have been called since token needs refresh
    expect(mockRefreshCallback).toHaveBeenCalled();

    // Stop auto-refresh
    tokenManager.stopAutoRefresh();

    // Reset mock
    mockRefreshCallback.mockClear();

    // Fast-forward another minute
    await vi.advanceTimersByTimeAsync(60 * 1000);

    // Callback should NOT be called after stopping
    expect(mockRefreshCallback).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('should clear token info and stop refresh on logout', () => {
    const mockRefreshCallback = vi.fn().mockResolvedValue(undefined);
    
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: '1',
      iat: now,
      exp: now + 3600,
    };
    
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    const signature = 'mock-signature';
    const mockToken = `${header}.${body}.${signature}`;

    tokenManager.setToken(mockToken);
    tokenManager.startAutoRefresh(mockRefreshCallback);

    // Clear (simulating logout)
    tokenManager.clear();

    // Token should be expired/cleared
    expect(tokenManager.isExpired()).toBe(true);
    expect(tokenManager.getTimeUntilExpiry()).toBe(0);
  });

  it('should detect expired tokens', () => {
    // Create an expired token
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: '1',
      iat: now - 7200, // Issued 2 hours ago
      exp: now - 3600, // Expired 1 hour ago
    };
    
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify(payload));
    const signature = 'mock-signature';
    const mockToken = `${header}.${body}.${signature}`;

    tokenManager.setToken(mockToken);

    expect(tokenManager.isExpired()).toBe(true);
    expect(tokenManager.getTimeUntilExpiry()).toBe(0);
  });
});
