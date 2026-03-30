import '@testing-library/jest-dom';
import { expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

type StorageStore = Map<string, string>;

const createStorageMock = (): Storage => {
  const store: StorageStore = new Map();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(String(key), String(value));
    },
  };
};

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: createStorageMock(),
});

Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: createStorageMock(),
});

const createJsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const createDefaultFetchMock = () =>
  vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : 'url' in input
            ? input.url
            : String(input);
    const method =
      init?.method ??
      (typeof input === 'object' && input !== null && 'method' in input ? input.method : 'GET');

    if (method === 'GET' && url.includes('/api/v1/auth/me')) {
      const user = localStorage.getItem('user');
      if (user) {
        return createJsonResponse({
          code: 200,
          message: 'Success',
          timestamp: Date.now(),
          data: JSON.parse(user),
        });
      }

      return createJsonResponse(
        {
          code: 401,
          message: 'Unauthorized',
          timestamp: Date.now(),
          data: null,
        },
        401
      );
    }

    if (method === 'GET' && (url.includes('/api/v1/tools?') || url.endsWith('/api/v1/tools'))) {
      return createJsonResponse({
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: {
          list: [],
          total: 0,
          page: 1,
          size: 100,
        },
      });
    }

    if (method === 'GET' && url.includes('/api/v1/categories/all')) {
      return createJsonResponse({
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: [],
      });
    }

    if (method === 'GET' && url.includes('/api/v1/usage/recent')) {
      return createJsonResponse({
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: [],
      });
    }

    if (method === 'GET' && url.includes('/api/v1/notifications/unread-count')) {
      return createJsonResponse({
        code: 200,
        message: 'Success',
        timestamp: Date.now(),
        data: 0,
      });
    }

    throw new Error(`Unhandled fetch request in test: ${method} ${url}`);
  });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal('fetch', createDefaultFetchMock());
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
