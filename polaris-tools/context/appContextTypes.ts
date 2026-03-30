import type { Theme } from './ThemeContext';
import type { Language, TranslationKey } from '../i18n';
import type { UserLoginRequest, UserResponse } from '../types';
import type { ToolRegistryItem } from '../toolRegistry';
import type { Page, AdminPage } from './navigation';
import type { ConfirmOptions } from './UiContext';
import type { ToastType } from '../components/Toast';

export interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  toggleLanguage: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  page: Page;
  setPage: (page: Page) => void;
  navigate: (page: Page) => void;
  toolRegistry: ToolRegistryItem[];
  currentToolId: string | null;
  setToolPage: (toolId: string) => void;
  currentCategoryId: number | null;
  setCategoryPage: (categoryId: number) => void;
  adminPage: AdminPage;
  setAdminPage: (page: AdminPage) => void;
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
  promptLogin: (message?: string) => void;
  guestUsage: { count: number; limit: number; lastResetDate: string };
  checkGuestUsage: () => boolean;
  recordGuestToolUsage: () => void;
  isGuestBlocked: boolean;
  showToast: (message: string, type?: ToastType) => void;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}
