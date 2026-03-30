import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { guestUsageManager } from '../utils/guestUsageManager';
import { tokenManager } from '../utils/tokenManager';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { useUi } from './UiContext';
import type { UserLoginRequest, UserResponse } from '../types';

interface GuestUsage {
  count: number;
  limit: number;
  lastResetDate: string;
}

export interface AuthContextValue {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isAdmin: boolean;
  isGuest: boolean;
  login: (
    credentials: UserLoginRequest,
    navigateToAdmin?: boolean,
    rememberMe?: boolean,
    redirectPath?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  canAccessFeature: (feature: string) => boolean;
  guestUsage: GuestUsage;
  checkGuestUsage: () => boolean;
  recordGuestToolUsage: () => void;
  isGuestBlocked: boolean;
  showSessionTimeoutWarning: boolean;
  sessionExpiresAt: number | null;
  handleSessionContinue: () => Promise<void>;
  handleSessionLogout: () => Promise<void>;
  handleSessionClose: () => void;
}

export const useAuthState = (): AuthContextValue => {
  const navigate = useNavigate();
  const { showToast, openGuestLimit, closeGuestLimit } = useUi();

  const [user, setUser] = useState<UserResponse | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [showSessionTimeoutPref, setShowSessionTimeoutPref] = useState(true);
  const [guestUsage, setGuestUsage] = useState<GuestUsage>(guestUsageManager.getUsage());
  const [isGuestBlocked, setIsGuestBlocked] = useState(false);

  const isAdmin = useMemo(() => user?.planType === 999, [user?.planType]);
  const isGuest = useMemo(() => !isAuthenticated || !user, [isAuthenticated, user]);

  const clearAuthState = useCallback(() => {
    tokenManager.clear();
    apiClient.clearToken();
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    setUser(null);
    setIsAuthenticated(false);
    setSessionExpiresAt(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const result = await apiClient.auth.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(result.data));
      setUser(result.data);
      setIsAuthenticated(true);
    } catch (error) {
      clearAuthState();
      console.error('刷新用户信息失败:', error);
    }
  }, [clearAuthState]);

  const logout = useCallback(async () => {
    try {
      await apiClient.auth.logout();
    } catch (error) {
      console.error('退出登录接口调用失败:', error);
    } finally {
      clearAuthState();
      closeGuestLimit();
      navigate('/login');
    }
  }, [clearAuthState, closeGuestLimit, navigate]);

  const handleTokenRefresh = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('refresh token 不存在');
      }

      const result = await apiClient.auth.refreshToken(refreshToken);
      const newToken = result.data.token;
      apiClient.setToken(newToken);
      tokenManager.setToken(newToken, refreshToken);

      const expiresAt = tokenManager.getExpiresAt();
      if (expiresAt) {
        setSessionExpiresAt(expiresAt);
      }
    } catch (error) {
      showToast('会话已过期，请重新登录', 'error');
      await logout();
    }
  }, [logout, showToast]);

  const login = useCallback(
    async (
      credentials: UserLoginRequest,
      navigateToAdmin: boolean = false,
      rememberMe: boolean = false,
      redirectPath?: string
    ) => {
      try {
        const result = await apiClient.auth.login({
          ...credentials,
          rememberMe,
        });

        apiClient.setToken(result.data.token);

        if (result.data.refreshToken) {
          localStorage.setItem('refreshToken', result.data.refreshToken);
          tokenManager.setToken(result.data.token, result.data.refreshToken);
          tokenManager.startAutoRefresh(handleTokenRefresh);
          const expiresAt = tokenManager.getExpiresAt();
          if (expiresAt) {
            setSessionExpiresAt(expiresAt);
          }
        }

        localStorage.setItem('user', JSON.stringify(result.data.user));
        localStorage.setItem('rememberMe', rememberMe.toString());

        setUser(result.data.user);
        setIsAuthenticated(true);

        guestUsageManager.clear();
        setGuestUsage(guestUsageManager.getUsage());
        setIsGuestBlocked(false);
        closeGuestLimit();

        if (redirectPath && redirectPath.startsWith('/')) {
          navigate(redirectPath);
          return;
        }

        if (navigateToAdmin && result.data.user.planType === 999) {
          navigate('/admin');
          return;
        }

        navigate('/');
      } catch (error) {
        clearAuthState();
        throw error;
      }
    },
    [clearAuthState, closeGuestLimit, handleTokenRefresh, navigate]
  );

  const canAccessFeature = useCallback(
    (feature: string): boolean => {
      const loginRequiredFeatures = ['favorites', 'profile', 'settings', 'history', 'notifications', 'admin'];
      if (isGuest && loginRequiredFeatures.includes(feature)) {
        return false;
      }
      return true;
    },
    [isGuest]
  );

  const checkGuestUsage = useCallback((): boolean => {
    if (!isGuest) {
      return true;
    }

    const usage = guestUsageManager.getUsage();
    setGuestUsage(usage);

    if (guestUsageManager.isLimitReached()) {
      setIsGuestBlocked(true);
      openGuestLimit(true);
      return false;
    }

    if (guestUsageManager.shouldShowWarning()) {
      openGuestLimit(false);
    }

    return true;
  }, [isGuest, openGuestLimit]);

  const recordGuestToolUsage = useCallback(() => {
    if (!isGuest) {
      return;
    }

    const usage = guestUsageManager.incrementUsage();
    setGuestUsage(usage);

    if (guestUsageManager.shouldShowWarning()) {
      openGuestLimit(false);
    }

    if (guestUsageManager.isLimitReached()) {
      setIsGuestBlocked(true);
      openGuestLimit(true);
    }
  }, [isGuest, openGuestLimit]);

  useEffect(() => {
    const savedPref = localStorage.getItem('showSessionTimeout');
    if (savedPref !== null) {
      setShowSessionTimeoutPref(savedPref === 'true');
    }

    const handlePrefChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled: boolean }>;
      setShowSessionTimeoutPref(customEvent.detail?.enabled ?? true);
    };

    window.addEventListener('sessionTimeoutPrefChanged', handlePrefChange);
    return () => {
      window.removeEventListener('sessionTimeoutPrefChanged', handlePrefChange);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsInitialized(true);
      return;
    }

    refreshUser().finally(() => {
      setIsInitialized(true);
    });
  }, [refreshUser]);

  const {
    showWarning: showSessionTimeoutWarning,
    handleContinue: handleSessionContinue,
    handleLogout: handleSessionLogout,
    handleClose: handleSessionClose,
  } = useSessionTimeout(showSessionTimeoutPref && isAuthenticated, sessionExpiresAt, handleTokenRefresh, logout);

  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      if (token && refreshToken) {
        tokenManager.setToken(token, refreshToken);
        const expiresAt = tokenManager.getExpiresAt();
        if (expiresAt) {
          setSessionExpiresAt(expiresAt);
        }
        tokenManager.startAutoRefresh(handleTokenRefresh);
      }
    } else {
      tokenManager.stopAutoRefresh();
      setSessionExpiresAt(null);
    }

    return () => {
      tokenManager.stopAutoRefresh();
    };
  }, [isAuthenticated, user, handleTokenRefresh]);

  return useMemo(
    () => ({
      user,
      isAuthenticated,
      isInitialized,
      isAdmin,
      isGuest,
      login,
      logout,
      refreshUser,
      canAccessFeature,
      guestUsage,
      checkGuestUsage,
      recordGuestToolUsage,
      isGuestBlocked,
      showSessionTimeoutWarning,
      sessionExpiresAt,
      handleSessionContinue,
      handleSessionLogout,
      handleSessionClose,
    }),
    [
      user,
      isAuthenticated,
      isInitialized,
      isAdmin,
      isGuest,
      login,
      logout,
      refreshUser,
      canAccessFeature,
      guestUsage,
      checkGuestUsage,
      recordGuestToolUsage,
      isGuestBlocked,
      showSessionTimeoutWarning,
      sessionExpiresAt,
      handleSessionContinue,
      handleSessionLogout,
      handleSessionClose,
    ]
  );
};
