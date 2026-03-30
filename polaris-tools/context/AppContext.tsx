import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { MemoryRouter, useInRouterContext } from 'react-router-dom';
import { TOOL_REGISTRY } from '../toolRegistry';
import { ThemeProvider, useTheme } from './ThemeContext';
import { I18nProvider, useI18n } from './I18nContext';
import { UiProvider, useUi } from './UiContext';
import { AuthProvider, useAuth } from './AuthContext';
import { AppOverlays } from './AppOverlays';
import { useLegacyNavigation } from './useLegacyNavigation';
import type { AppContextType } from './appContextTypes';

export type { Page, AdminPage } from './navigation';

const AppContext = createContext<AppContextType | undefined>(undefined);

const AppProviderInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useI18n();
  const ui = useUi();
  const auth = useAuth();
  const navigation = useLegacyNavigation();

  const handleLoginPromptLogin = useCallback(() => {
    ui.closeLoginPrompt();
    navigation.navigate('login');
  }, [navigation.navigate, ui.closeLoginPrompt]);

  const handleGuestLimitLogin = useCallback(() => {
    ui.closeGuestLimit();
    navigation.navigate('login');
  }, [navigation.navigate, ui.closeGuestLimit]);

  const handleGuestLimitRegister = useCallback(() => {
    ui.closeGuestLimit();
    navigation.navigate('register');
  }, [navigation.navigate, ui.closeGuestLimit]);

  const contextValue = useMemo<AppContextType>(
    () => ({
      theme,
      toggleTheme,
      language,
      toggleLanguage,
      t,
      page: navigation.page,
      setPage: navigation.setPage,
      navigate: navigation.navigate,
      toolRegistry: TOOL_REGISTRY,
      currentToolId: navigation.currentToolId,
      setToolPage: navigation.setToolPage,
      currentCategoryId: navigation.currentCategoryId,
      setCategoryPage: navigation.setCategoryPage,
      adminPage: navigation.adminPage,
      setAdminPage: navigation.setAdminPage,
      user: auth.user,
      isAuthenticated: auth.isAuthenticated,
      isInitialized: auth.isInitialized,
      isAdmin: auth.isAdmin,
      isGuest: auth.isGuest,
      login: auth.login,
      logout: auth.logout,
      refreshUser: auth.refreshUser,
      canAccessFeature: auth.canAccessFeature,
      promptLogin: ui.promptLogin,
      guestUsage: auth.guestUsage,
      checkGuestUsage: auth.checkGuestUsage,
      recordGuestToolUsage: auth.recordGuestToolUsage,
      isGuestBlocked: auth.isGuestBlocked,
      showToast: ui.showToast,
      showConfirm: ui.showConfirm,
    }),
    [
      theme,
      toggleTheme,
      language,
      toggleLanguage,
      t,
      navigation.page,
      navigation.setPage,
      navigation.navigate,
      navigation.currentToolId,
      navigation.setToolPage,
      navigation.currentCategoryId,
      navigation.setCategoryPage,
      navigation.adminPage,
      navigation.setAdminPage,
      auth.user,
      auth.isAuthenticated,
      auth.isInitialized,
      auth.isAdmin,
      auth.isGuest,
      auth.login,
      auth.logout,
      auth.refreshUser,
      auth.canAccessFeature,
      auth.guestUsage,
      auth.checkGuestUsage,
      auth.recordGuestToolUsage,
      auth.isGuestBlocked,
      ui.promptLogin,
      ui.showToast,
      ui.showConfirm,
    ]
  );

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      <AppOverlays
        ui={ui}
        auth={auth}
        t={t}
        onLoginPromptLogin={handleLoginPromptLogin}
        onGuestLimitLogin={handleGuestLimitLogin}
        onGuestLimitRegister={handleGuestLimitRegister}
      />
    </AppContext.Provider>
  );
};

const AppProviderComposition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider>
      <I18nProvider>
        <UiProvider>
          <AuthProvider>
            <AppProviderInner>{children}</AppProviderInner>
          </AuthProvider>
        </UiProvider>
      </I18nProvider>
    </ThemeProvider>
  );
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const inRouterContext = useInRouterContext();

  if (inRouterContext) {
    return <AppProviderComposition>{children}</AppProviderComposition>;
  }

  return (
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppProviderComposition>{children}</AppProviderComposition>
    </MemoryRouter>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext 必须在 AppProvider 内使用');
  }
  return context;
};
