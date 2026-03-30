import { vi } from 'vitest';

export const mockApiClient = {
  request: vi.fn(),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  getToken: vi.fn(),
  auth: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    getCurrentUser: vi.fn(),
  },
  user: {
    updateProfile: vi.fn(),
  },
  tools: {
    getAll: vi.fn(),
    getById: vi.fn(),
    incrementUsage: vi.fn(),
  },
  categories: {
    getAll: vi.fn(),
  },
  favorites: {
    list: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    check: vi.fn(),
  },
  notifications: {
    list: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
};

export const mockAdminApi = {
  dashboard: {
    getStats: vi.fn(),
  },
  users: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  tools: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  categories: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  emails: {
    getLogs: vi.fn(),
    getStatistics: vi.fn(),
  },
  emailProvider: {
    getStatus: vi.fn(),
    switch: vi.fn(),
  },
};

export const resetApiMocks = () => {
  vi.clearAllMocks();
};
