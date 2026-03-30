export type Page =
  | 'dashboard'
  | 'login'
  | 'register'
  | 'reset-password'
  | 'verify-email'
  | 'settings'
  | 'profile'
  | 'email-preferences'
  | 'notifications'
  | 'favorites'
  | 'history'
  | 'category'
  | 'tool'
  | 'admin'
  | 'privacy'
  | 'terms'
  | 'contact';

export type AdminPage =
  | 'dashboard'
  | 'users'
  | 'tools'
  | 'categories'
  | 'emails'
  | 'templates'
  | 'queue'
  | 'suppression'
  | 'subscriptions'
  | 'statistics'
  | 'monitoring'
  | 'notifications'
  | 'verification-monitoring'
  | 'ai-providers';

export const ADMIN_PAGES: AdminPage[] = [
  'dashboard',
  'users',
  'tools',
  'categories',
  'emails',
  'templates',
  'queue',
  'suppression',
  'subscriptions',
  'statistics',
  'monitoring',
  'notifications',
  'verification-monitoring',
  'ai-providers',
];

export interface RouteState {
  page: Page;
  currentToolId: string | null;
  currentCategoryId: number | null;
  adminPage: AdminPage;
}

const decodePart = (raw: string | undefined): string | null => {
  if (!raw) {
    return null;
  }
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

export const parseRouteState = (pathname: string): RouteState => {
  const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  const lowerPath = path.toLowerCase();

  if (lowerPath === '/login') return { page: 'login', currentToolId: null, currentCategoryId: null, adminPage: 'dashboard' };
  if (lowerPath === '/register') return { page: 'register', currentToolId: null, currentCategoryId: null, adminPage: 'dashboard' };
  if (lowerPath === '/reset-password') return { page: 'reset-password', currentToolId: null, currentCategoryId: null, adminPage: 'dashboard' };
  if (lowerPath === '/verify-email') return { page: 'verify-email', currentToolId: null, currentCategoryId: null, adminPage: 'dashboard' };
  if (lowerPath === '/settings') return { page: 'settings', currentToolId: null, currentCategoryId: null, adminPage: 'dashboard' };
  if (lowerPath === '/profile') return { page: 'profile', currentToolId: null, currentCategoryId: null, adminPage: 'dashboard' };
  if (lowerPath === '/email-preferences') return { page: 'email-preferences', currentToolId: null, currentCategoryId: null, adminPage: 'dashboard' };
  if (lowerPath === '/notifications') return { page: 'notifications', currentToolId: null, currentCategoryId: null, adminPage: 'dashboard' };
  if (lowerPath === '/favorites') return { page: 'favorites', currentToolId: null, currentCategoryId: null, adminPage: 'dashboard' };
  if (lowerPath === '/history') return { page: 'history', currentToolId: null, currentCategoryId: null, adminPage: 'dashboard' };
  if (lowerPath === '/privacy') return { page: 'privacy', currentToolId: null, currentCategoryId: null, adminPage: 'dashboard' };
  if (lowerPath === '/terms') return { page: 'terms', currentToolId: null, currentCategoryId: null, adminPage: 'dashboard' };
  if (lowerPath === '/contact') return { page: 'contact', currentToolId: null, currentCategoryId: null, adminPage: 'dashboard' };

  const toolMatch = path.match(/^\/tool\/([^/]+)$/);
  if (toolMatch) {
    return {
      page: 'tool',
      currentToolId: decodePart(toolMatch[1]),
      currentCategoryId: null,
      adminPage: 'dashboard',
    };
  }

  const categoryMatch = path.match(/^\/category\/(\d+)$/);
  if (categoryMatch) {
    return {
      page: 'category',
      currentToolId: null,
      currentCategoryId: Number.parseInt(categoryMatch[1], 10),
      adminPage: 'dashboard',
    };
  }

  const adminMatch = lowerPath.match(/^\/admin(?:\/([^/]+))?$/);
  if (adminMatch) {
    const target = decodePart(adminMatch[1]) as AdminPage | null;
    const adminPage = target && ADMIN_PAGES.includes(target) ? target : 'dashboard';
    return { page: 'admin', currentToolId: null, currentCategoryId: null, adminPage };
  }

  return { page: 'dashboard', currentToolId: null, currentCategoryId: null, adminPage: 'dashboard' };
};

export const pathByPage = (
  page: Page,
  options?: { toolId?: string | null; categoryId?: number | null; adminPage?: AdminPage }
): string | null => {
  if (page === 'dashboard') return '/';
  if (page === 'login') return '/login';
  if (page === 'register') return '/register';
  if (page === 'reset-password') return '/reset-password';
  if (page === 'verify-email') return '/verify-email';
  if (page === 'settings') return '/settings';
  if (page === 'profile') return '/profile';
  if (page === 'email-preferences') return '/email-preferences';
  if (page === 'notifications') return '/notifications';
  if (page === 'favorites') return '/favorites';
  if (page === 'history') return '/history';
  if (page === 'privacy') return '/privacy';
  if (page === 'terms') return '/terms';
  if (page === 'contact') return '/contact';
  if (page === 'tool') {
    const toolId = options?.toolId;
    return toolId ? `/tool/${encodeURIComponent(toolId)}` : '/';
  }
  if (page === 'category') {
    const categoryId = options?.categoryId;
    return typeof categoryId === 'number' ? `/category/${categoryId}` : '/';
  }
  if (page === 'admin') {
    const adminPage = options?.adminPage || 'dashboard';
    return adminPage === 'dashboard' ? '/admin' : `/admin/${adminPage}`;
  }
  return null;
};
