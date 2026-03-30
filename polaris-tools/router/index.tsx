export const ROUTES = {
  dashboard: '/',
  login: '/login',
  register: '/register',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',
  settings: '/settings',
  profile: '/profile',
  emailPreferences: '/email-preferences',
  notifications: '/notifications',
  favorites: '/favorites',
  history: '/history',
  category: (id: number | string) => `/category/${id}`,
  tool: (toolId: string) => `/tool/${encodeURIComponent(toolId)}`,
  privacy: '/privacy',
  terms: '/terms',
  contact: '/contact',
  admin: '/admin',
  adminPage: (page: string) => `/admin/${page}`,
} as const;

export { ProtectedRoute } from './ProtectedRoute';
export { AdminRoute } from './AdminRoute';
export { GuestRoute } from './GuestRoute';
