import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiClient } from '../api/client';
import { TOOL_REGISTRY } from '../constants';
import type { UserResponse, UserLoginRequest, Tool } from '../types';
import { ToastContainer, ToastType } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoginPrompt } from '../components/LoginPrompt';
import { GuestLimitDialog } from '../components/GuestLimitDialog';
import { SessionTimeoutDialog } from '../components/SessionTimeoutDialog';
import { guestUsageManager } from '../utils/guestUsageManager';
import { tokenManager } from '../utils/tokenManager';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { getTranslation, type Language, type TranslationKey } from '../i18n';

type Theme = 'dark' | 'light';
export type Page = 'dashboard' | 'login' | 'register' | 'reset-password' | 'verify-email' | 'settings' | 'profile' | 'email-preferences' | 'notifications' | 'favorites' | 'history' | 'category' | 'tool' | 'admin' | 'privacy' | 'terms' | 'contact';
export type AdminPage = 'dashboard' | 'users' | 'tools' | 'categories' | 'emails' | 'templates' | 'queue' | 'suppression' | 'subscriptions' | 'statistics' | 'monitoring' | 'notifications';

// Legacy Translation Dictionary (for backward compatibility during migration)
const translations = {
  en: {
    "app.name": "Polaris Tools",
    "app.desc": "Productivity Suite",
    "search.placeholder": "Search tools...",
    
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.favorites": "Favorites",
    "nav.categories": "Categories",
    "nav.settings": "Settings",
    
    // Header
    "header.overview": "Overview",
    "header.upgrade": "UPGRADE PRO",
    "header.logout": "Log Out",

    // Hero & Dashboard
    "hero.title": "Polaris Tools",
    "hero.subtitle": "Navigate your workflow with precision. A suite of minimalist tools designed for the modern creator.",
    "hero.cta.start": "Get Started",
    "hero.cta.browse": "Browse Tools",
    "section.recent": "Recently Used",
    "section.recent.view_history": "View History",
    "section.text_utils": "Text Utilities",
    "section.dev_tools": "Developer Tools",
    
    // Footer
    "footer.rights": "© 2026 Polaris Tools Inc.",
    "footer.privacy": "Privacy",
    "footer.terms": "Terms",
    "footer.contact": "Contact",

    // Login & Register
    "auth.login.title": "Welcome back",
    "auth.login.subtitle": "Enter your credentials to access your account",
    "auth.register.title": "Create an account",
    "auth.register.subtitle": "Start your journey with Polaris Tools today",
    "auth.email": "Email Address",
    "auth.password": "Password",
    "auth.name": "Full Name",
    "auth.forgot": "Forgot password?",
    "auth.submit.login": "Sign in",
    "auth.submit.register": "Create account",
    "auth.no_account": "Don't have an account?",
    "auth.has_account": "Already have an account?",
    "auth.link.signup": "Sign up",
    "auth.link.signin": "Sign in",

    // Settings
    "settings.title": "Settings",
    "settings.general": "General",
    "settings.account": "Account",
    "settings.notifications": "Notifications",
    "settings.theme": "Appearance",
    "settings.theme.desc": "Customize how Polaris looks on your device",
    "settings.lang": "Language",
    "settings.lang.desc": "Select your preferred language",
    "settings.save": "Save Changes",

    // Profile
    "profile.title": "My Profile",
    "profile.bio": "Bio",
    "profile.role": "Role",
    "profile.stats": "Usage Statistics",
    "profile.stats.tools": "Tools Used",
    "profile.stats.saved": "Hours Saved",
    "profile.stats.streak": "Day Streak",
    "profile.edit": "Edit Profile",

    // Notifications
    "notifications.title": "Notifications",
    "notifications.mark_read": "Mark all as read",
    "notifications.empty": "No new notifications",
    "notifications.type.system": "System",
    "notifications.type.security": "Security",
    "notifications.type.promo": "Offer",

    // Favorites
    "favorites.title": "My Favorites",
    "favorites.no_favorites": "No favorite tools yet. Star some tools to see them here!",

    // Category
    "category.back": "Back to Dashboard",
    "category.tool_singular": "tool",
    "category.tool_plural": "tools",
    "category.error.title": "Failed to load category",
    "category.error.retry": "Try Again",
    "category.empty.title": "No tools in this category",
    "category.empty.description": "Check back later for new tools in this category!",
  },
  zh: {
    "app.name": "北极星工具箱",
    "app.desc": "生产力套件",
    "search.placeholder": "搜索工具...",
    
    // Navigation
    "nav.dashboard": "仪表盘",
    "nav.favorites": "收藏",
    "nav.categories": "分类列表",
    "nav.settings": "设置",
    
    // Header
    "header.overview": "概览",
    "header.upgrade": "升级专业版",
    "header.logout": "退出登录",

    // Hero & Dashboard
    "hero.title": "北极星工具箱",
    "hero.subtitle": "精准导航您的工作流程。为现代创作者设计的极简主义工具套件。",
    "hero.cta.start": "开始使用",
    "hero.cta.browse": "浏览工具",
    "section.recent": "最近使用",
    "section.recent.view_history": "查看历史",
    "section.text_utils": "文本工具",
    "section.dev_tools": "开发者工具",
    
    // Footer
    "footer.rights": "© 2026 北极星工具箱 Inc.",
    "footer.privacy": "隐私",
    "footer.terms": "条款",
    "footer.contact": "联系我们",

    // Login & Register
    "auth.login.title": "欢迎回来",
    "auth.login.subtitle": "输入您的凭据以访问您的帐户",
    "auth.register.title": "创建帐户",
    "auth.register.subtitle": "立即开启您的北极星之旅",
    "auth.email": "电子邮件",
    "auth.password": "密码",
    "auth.name": "全名",
    "auth.forgot": "忘记密码？",
    "auth.submit.login": "登录",
    "auth.submit.register": "创建帐户",
    "auth.no_account": "还没有帐户？",
    "auth.has_account": "已有帐户？",
    "auth.link.signup": "注册",
    "auth.link.signin": "登录",

    // Settings
    "settings.title": "设置",
    "settings.general": "常规",
    "settings.account": "帐户",
    "settings.notifications": "通知",
    "settings.theme": "外观",
    "settings.theme.desc": "自定义北极星在您设备上的显示方式",
    "settings.lang": "语言",
    "settings.lang.desc": "选择您的首选语言",
    "settings.save": "保存更改",

    // Profile
    "profile.title": "我的资料",
    "profile.bio": "个人简介",
    "profile.role": "角色",
    "profile.stats": "使用统计",
    "profile.stats.tools": "使用工具",
    "profile.stats.saved": "节省时间 (小时)",
    "profile.stats.streak": "连续天数",
    "profile.edit": "编辑资料",

    // Notifications
    "notifications.title": "通知中心",
    "notifications.mark_read": "全部标记为已读",
    "notifications.empty": "暂无新通知",
    "notifications.type.system": "系统",
    "notifications.type.security": "安全",
    "notifications.type.promo": "优惠",

    // Favorites
    "favorites.title": "我的收藏",
    "favorites.no_favorites": "暂无收藏工具。点击星标收藏您常用的工具！",

    // Category
    "category.back": "返回仪表盘",
    "category.tool_singular": "个工具",
    "category.tool_plural": "个工具",
    "category.error.title": "加载分类失败",
    "category.error.retry": "重试",
    "category.empty.title": "该分类下暂无工具",
    "category.empty.description": "稍后再来查看该分类的新工具！",
  }
};

interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  toggleLanguage: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  tLegacy: (key: keyof typeof translations['en']) => string; // Legacy translation for backward compatibility
  page: Page;
  setPage: (page: Page) => void; // 直接暴露 setPage
  navigate: (page: Page) => void;
  // Tool registry and navigation
  toolRegistry: Tool[];
  currentToolId: string | null;
  setToolPage: (toolId: string) => void;
  // Category navigation
  currentCategoryId: number | null;
  setCategoryPage: (categoryId: number) => void;
  // Admin navigation
  adminPage: AdminPage;
  setAdminPage: (page: AdminPage) => void;
  // User authentication state
  user: UserResponse | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isAdmin: boolean;
  isGuest: boolean; // 游客模式：未登录或无有效 token
  login: (credentials: UserLoginRequest, navigateToAdmin?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // Guest mode functions
  canAccessFeature: (feature: string) => boolean;
  promptLogin: (message?: string) => void;
  // Guest usage limits
  guestUsage: { count: number; limit: number; lastResetDate: string };
  checkGuestUsage: () => boolean;
  recordGuestToolUsage: () => void;
  isGuestBlocked: boolean;
  // Toast notifications
  showToast: (message: string, type?: ToastType) => void;
  // Confirm dialog
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state (could check localStorage here in a real app)
  const [theme, setTheme] = useState<Theme>('light');
  // Initialize language from localStorage, default to 'zh' if not set
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('systemLanguage');
    return (stored === 'en' || stored === 'zh') ? stored as Language : 'zh';
  });
  
  // Initialize page based on URL path
  const getInitialPage = (): Page => {
    const path = window.location.pathname;
    if (path.includes('/verify-email')) return 'verify-email';
    if (path.includes('/login')) return 'login';
    if (path.includes('/register')) return 'register';
    if (path.includes('/reset-password')) return 'reset-password';
    if (path.includes('/admin')) return 'admin';
    return 'dashboard';
  };
  
  const [page, setPage] = useState<Page>(getInitialPage());
  const [currentToolId, setCurrentToolId] = useState<string | null>(null);
  const [currentCategoryId, setCurrentCategoryId] = useState<number | null>(null);
  const [adminPage, setAdminPage] = useState<AdminPage>('dashboard');
  
  // Toast state
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  
  // Confirm dialog state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: { title: '', message: '' },
    resolve: null,
  });
  
  // Login prompt state
  const [loginPromptState, setLoginPromptState] = useState<{
    isOpen: boolean;
    message?: string;
  }>({
    isOpen: false,
    message: undefined,
  });
  
  // User authentication state
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  // Session timeout state (Requirements: 4.1, 4.6)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [showSessionTimeoutPref, setShowSessionTimeoutPref] = useState<boolean>(true);
  
  // Guest usage state
  const [guestUsage, setGuestUsage] = useState(guestUsageManager.getUsage());
  const [showGuestLimit, setShowGuestLimit] = useState(false);
  const [isGuestBlocked, setIsGuestBlocked] = useState(false);
  
  // Performance: Memoize computed values to prevent unnecessary recalculations (Requirement 36.3)
  const isAdmin = React.useMemo(() => user?.planType === 999, [user?.planType]);
  const isGuest = React.useMemo(() => !isAuthenticated || !user, [isAuthenticated, user]);

  // Load showSessionTimeout preference from localStorage (Requirement 4.7)
  useEffect(() => {
    const savedPref = localStorage.getItem('showSessionTimeout');
    if (savedPref !== null) {
      setShowSessionTimeoutPref(savedPref === 'true');
    }

    // Listen for preference changes from Settings page (Requirement 4.7)
    const handlePrefChange = (event: CustomEvent) => {
      setShowSessionTimeoutPref(event.detail.enabled);
    };

    window.addEventListener('sessionTimeoutPrefChanged', handlePrefChange as EventListener);

    return () => {
      window.removeEventListener('sessionTimeoutPrefChanged', handlePrefChange as EventListener);
    };
  }, []);

  // Check for existing authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      // Token exists, verify it by fetching user data from server
      refreshUser().finally(() => {
        setIsInitialized(true);
      });
    } else {
      // No token, allow guest access - don't force login
      setIsInitialized(true);
      // Only navigate to login if explicitly on login or register page
      // Otherwise, allow guest to browse the app
    }
  }, []);

  // Apply theme to HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Performance: Memoize theme toggle to prevent recreation (Requirement 36.3)
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  // Performance: Memoize language toggle to prevent recreation (Requirement 36.3)
  const toggleLanguage = useCallback(() => {
    setLanguage((prev: Language) => {
      const newLang = prev === 'en' ? 'zh' : 'en';
      // Persist to localStorage
      localStorage.setItem('systemLanguage', newLang);
      return newLang;
    });
  }, []);

  // Performance: Memoize translation function (Requirement 36.3)
  const t = React.useMemo(() => getTranslation(language), [language]);
  
  // Performance: Memoize legacy translation function (Requirement 36.3)
  const tLegacy = useCallback((key: keyof typeof translations['en']): string => {
    return translations[language][key] || key;
  }, [language]);

  // Toast functions
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Confirm dialog function
  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(true);
    }
    setConfirmState({ isOpen: false, options: { title: '', message: '' }, resolve: null });
  }, [confirmState.resolve]);

  const handleCancel = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(false);
    }
    setConfirmState({ isOpen: false, options: { title: '', message: '' }, resolve: null });
  }, [confirmState.resolve]);

  // Performance: Memoize navigate function (Requirement 36.3)
  const navigate = useCallback((newPage: Page) => {
    setPage(newPage);
    if (newPage !== 'tool') {
      setCurrentToolId(null);
    }
    if (newPage !== 'category') {
      setCurrentCategoryId(null);
    }
  }, []);

  /**
   * 导航到工具页面
   * Performance: Memoized to prevent recreation (Requirement 36.3)
   * @param toolId 工具的 path 标识
   */
  const setToolPage = useCallback((toolId: string) => {
    setCurrentToolId(toolId);
    setPage('tool');
  }, []);

  /**
   * 导航到分类详情页面
   * Performance: Memoized to prevent recreation (Requirement 36.3)
   * @param categoryId 分类 ID
   */
  const setCategoryPage = useCallback((categoryId: number) => {
    setCurrentCategoryId(categoryId);
    setPage('category');
  }, []);

  /**
   * 检查功能访问权限
   * Requirements: 1.1, 1.2, 1.6
   * @param feature - 功能标识符
   * @returns 是否可以访问该功能
   */
  const canAccessFeature = useCallback((feature: string): boolean => {
    // 游客可以访问的功能
    const guestAllowedFeatures = [
      'dashboard', 'tool', 'category'
    ];
    
    // 需要登录的功能
    const loginRequiredFeatures = [
      'favorites', 'profile', 'settings', 'notifications', 'admin'
    ];
    
    // 游客尝试访问需要登录的功能
    if (isGuest && loginRequiredFeatures.includes(feature)) {
      return false;
    }
    
    return true;
  }, [isGuest]);
  
  /**
   * 显示登录提示
   * Requirements: 1.4
   * @param message - 可选的自定义提示消息
   */
  const promptLogin = useCallback((message?: string) => {
    setLoginPromptState({
      isOpen: true,
      message,
    });
  }, []);
  
  const handleLoginPromptLogin = useCallback(() => {
    setLoginPromptState({ isOpen: false, message: undefined });
    navigate('login');
  }, []);
  
  const handleLoginPromptCancel = useCallback(() => {
    setLoginPromptState({ isOpen: false, message: undefined });
  }, []);

  /**
   * 检查游客使用限制
   * Requirements: 1.8, 1.9
   * @returns 是否可以继续使用（true=可以使用，false=已达到限制）
   */
  const checkGuestUsage = useCallback((): boolean => {
    if (isGuest) {
      const usage = guestUsageManager.getUsage();
      setGuestUsage(usage);
      
      // 检查是否达到限制
      if (guestUsageManager.isLimitReached()) {
        setIsGuestBlocked(true);
        setShowGuestLimit(true);
        return false;
      }
      
      // 检查是否需要显示警告
      if (guestUsageManager.shouldShowWarning()) {
        setShowGuestLimit(true);
      }
      
      return true;
    }
    return true;
  }, [isGuest]);
  
  /**
   * 记录工具使用（游客）
   * Requirements: 1.8, 1.9
   */
  const recordGuestToolUsage = useCallback(() => {
    if (isGuest) {
      const usage = guestUsageManager.incrementUsage();
      setGuestUsage(usage);
      
      // 检查是否需要显示提醒
      if (guestUsageManager.shouldShowWarning()) {
        setShowGuestLimit(true);
      }
      
      // 检查是否达到限制
      if (guestUsageManager.isLimitReached()) {
        setIsGuestBlocked(true);
        setShowGuestLimit(true);
      }
    }
  }, [isGuest]);
  
  /**
   * 处理游客限制对话框的登录按钮
   */
  const handleGuestLimitLogin = useCallback(() => {
    setShowGuestLimit(false);
    navigate('login');
  }, []);
  
  /**
   * 处理游客限制对话框的注册按钮
   */
  const handleGuestLimitRegister = useCallback(() => {
    setShowGuestLimit(false);
    navigate('register');
  }, []);
  
  /**
   * 处理游客限制对话框的关闭按钮
   */
  const handleGuestLimitClose = useCallback(() => {
    setShowGuestLimit(false);
  }, []);

  /**
   * Logout user
   * Requirements: 1.6, 2.6, 4.1
   */
  const logout = useCallback(async () => {
    try {
      // Call logout API
      await apiClient.auth.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      // Stop TokenManager (Requirement 2.6)
      tokenManager.clear();
      
      // Clear authentication state
      apiClient.clearToken();
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('rememberMe'); // Requirement 3.6: Clear rememberMe on logout
      setUser(null);
      setIsAuthenticated(false);
      setSessionExpiresAt(null); // Clear session expiration (Requirement 4.1)
      
      // Navigate to login page
      navigate('login');
    }
  }, []);

  /**
   * Handle token refresh
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1
   */
  const handleTokenRefresh = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const result = await apiClient.auth.refreshToken(refreshToken);
      const newToken = result.data.token;
      
      // Update token in API client (Requirement 2.3)
      apiClient.setToken(newToken);
      
      // Update token in TokenManager (Requirement 2.3)
      tokenManager.setToken(newToken, refreshToken);
      
      // Update session expiration time (Requirement 4.1)
      const expiresAt = tokenManager.getExpiresAt();
      if (expiresAt) {
        setSessionExpiresAt(expiresAt);
      }
    } catch (error) {
      showToast('会话已过期，请重新登录', 'error');
      
      // Refresh failed, clear state and logout (Requirement 2.6)
      await logout();
    }
  }, [showToast, logout]);

  /**
   * Login user with credentials
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1
   * @param credentials - User login credentials
   * @param navigateToAdmin - If true and user is admin, navigate to admin panel
   * @param rememberMe - If true, extend token lifetime to 30 days
   */
  const login = useCallback(async (credentials: UserLoginRequest, navigateToAdmin: boolean = false, rememberMe: boolean = false) => {
    try {
      // Pass rememberMe to API (Requirement 3.1, 3.2)
      const result = await apiClient.auth.login({
        ...credentials,
        rememberMe,
      });
      
      // Store token
      apiClient.setToken(result.data.token);
      
      // Store refresh token if provided
      if (result.data.refreshToken) {
        localStorage.setItem('refreshToken', result.data.refreshToken);
      }
      
      // Store user data to localStorage for persistence
      localStorage.setItem('user', JSON.stringify(result.data.user));
      
      // Store rememberMe state to localStorage (Requirement 3.3, 3.4)
      localStorage.setItem('rememberMe', rememberMe.toString());
      
      // Update user state
      setUser(result.data.user);
      setIsAuthenticated(true);
      
      // Start TokenManager (Requirements: 2.1, 2.4)
      if (result.data.refreshToken) {
        tokenManager.setToken(result.data.token, result.data.refreshToken);
        tokenManager.startAutoRefresh(handleTokenRefresh);
        
        // Set session expiration time (Requirement 4.1)
        const expiresAt = tokenManager.getExpiresAt();
        if (expiresAt) {
          setSessionExpiresAt(expiresAt);
        }
      }
      
      // Clear guest usage records (Requirement 1.8, 1.9)
      guestUsageManager.clear();
      setGuestUsage(guestUsageManager.getUsage());
      setShowGuestLimit(false);
      setIsGuestBlocked(false);
      
      // Navigate based on user type and preference
      if (navigateToAdmin && result.data.user.planType === 999) {
        navigate('admin');
      } else {
        navigate('dashboard');
      }
    } catch (error) {
      // Clear any existing auth state on login failure
      apiClient.clearToken();
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('rememberMe');
      setUser(null);
      setIsAuthenticated(false);
      setSessionExpiresAt(null);
      
      // Stop TokenManager on login failure
      tokenManager.clear();
      
      throw error;
    }
  }, [handleTokenRefresh]);

  /**
   * Refresh current user data
   * Performance: Memoized to prevent recreation (Requirement 36.3)
   * Requirements: 1.8
   */
  const refreshUser = useCallback(async () => {
    try {
      const result = await apiClient.auth.getCurrentUser();
      localStorage.setItem('user', JSON.stringify(result.data));
      setUser(result.data);
      setIsAuthenticated(true);
    } catch (error) {
      // If refresh fails, clear authentication
      apiClient.clearToken();
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
      console.error('Failed to refresh user:', error);
    }
  }, []);

  // Use session timeout hook (Requirements: 4.1, 4.2, 4.3, 4.4, 4.5)
  // Must be called after logout and handleTokenRefresh are defined
  const {
    showWarning: showSessionTimeoutWarning,
    handleContinue: handleSessionContinue,
    handleLogout: handleSessionLogout,
    handleClose: handleSessionClose,
  } = useSessionTimeout(
    showSessionTimeoutPref && isAuthenticated, // Only enable if user preference is on and user is authenticated
    sessionExpiresAt,
    handleTokenRefresh,
    logout
  );

  // Token auto-refresh integration (Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1)
  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (token && refreshToken) {
        // Set token info in TokenManager (Requirement 2.1)
        tokenManager.setToken(token, refreshToken);
        
        // Set session expiration time (Requirement 4.1)
        const expiresAt = tokenManager.getExpiresAt();
        if (expiresAt) {
          setSessionExpiresAt(expiresAt);
        }
        
        // Start auto-refresh with callback (Requirement 2.4)
        tokenManager.startAutoRefresh(handleTokenRefresh);
      }
    } else {
      // User logged out or not authenticated, stop TokenManager (Requirement 2.6)
      tokenManager.stopAutoRefresh();
      setSessionExpiresAt(null);
    }
    
    // Cleanup on unmount
    return () => {
      tokenManager.stopAutoRefresh();
    };
  }, [isAuthenticated, user, handleTokenRefresh]);

  // Performance: Memoize context value to prevent unnecessary re-renders (Requirement 36.3)
  const contextValue = React.useMemo(() => ({
    theme, 
    toggleTheme, 
    language, 
    toggleLanguage, 
    t,
    tLegacy,
    page,
    setPage,
    navigate,
    toolRegistry: TOOL_REGISTRY,
    currentToolId,
    setToolPage,
    currentCategoryId,
    setCategoryPage,
    adminPage,
    setAdminPage,
    user,
    isAuthenticated,
    isInitialized,
    isAdmin,
    isGuest,
    login,
    logout,
    refreshUser,
    canAccessFeature,
    promptLogin,
    guestUsage,
    checkGuestUsage,
    recordGuestToolUsage,
    isGuestBlocked,
    showToast,
    showConfirm,
  }), [
    theme, toggleTheme, language, toggleLanguage, t, tLegacy,
    page, navigate, currentToolId, setToolPage, currentCategoryId, setCategoryPage,
    adminPage, user, isAuthenticated, isInitialized, isAdmin, isGuest,
    login, logout, refreshUser, canAccessFeature, promptLogin,
    guestUsage, checkGuestUsage, recordGuestToolUsage, isGuestBlocked,
    showToast, showConfirm
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.options.title}
        message={confirmState.options.message}
        confirmText={confirmState.options.confirmText || t('common.confirm')}
        cancelText={confirmState.options.cancelText || t('common.cancel')}
        isDangerous={confirmState.options.type === 'danger'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      {/* Login Prompt */}
      {loginPromptState.isOpen && (
        <LoginPrompt
          message={loginPromptState.message}
          onLogin={handleLoginPromptLogin}
          onCancel={handleLoginPromptCancel}
        />
      )}
      {/* Guest Limit Dialog */}
      {showGuestLimit && (
        <GuestLimitDialog
          remainingCount={guestUsageManager.getRemainingCount()}
          isBlocked={isGuestBlocked}
          onLogin={handleGuestLimitLogin}
          onRegister={handleGuestLimitRegister}
          onClose={isGuestBlocked ? undefined : handleGuestLimitClose}
        />
      )}
      {/* Session Timeout Dialog (Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6) */}
      {showSessionTimeoutWarning && sessionExpiresAt && (
        <SessionTimeoutDialog
          expiresAt={sessionExpiresAt}
          onContinue={handleSessionContinue}
          onLogout={handleSessionLogout}
          onClose={handleSessionClose}
        />
      )}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
