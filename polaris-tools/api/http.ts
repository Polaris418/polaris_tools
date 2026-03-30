import { ERROR_CODES, ERROR_RANGES, RATE_LIMIT_ERROR_CODES } from './errorCodes';
import type { Result } from '../types';

export class ApiError extends Error {
  constructor(public code: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }

  isRateLimitError(): boolean {
    return RATE_LIMIT_ERROR_CODES.has(this.code);
  }

  isVerificationError(): boolean {
    return this.code >= ERROR_RANGES.VERIFICATION_MIN && this.code <= ERROR_RANGES.VERIFICATION_MAX;
  }

  isAuthError(): boolean {
    return this.code === 401 || this.code === 403 || (this.code >= ERROR_RANGES.AUTH_MIN && this.code <= ERROR_RANGES.AUTH_MAX);
  }

  getUserMessage(): string {
    if (this.isRateLimitError()) {
      if (this.code === ERROR_CODES.RATE_LIMIT_EMAIL && this.data?.seconds) {
        return `发送过于频繁，请${this.data.seconds}秒后再试`;
      }
      return this.message || '请求过于频繁，请稍后再试';
    }

    if (this.isVerificationError()) {
      const errorMessages: Record<number, string> = {
        [ERROR_CODES.CODE_INVALID]: '验证码无效',
        [ERROR_CODES.CODE_EXPIRED]: '验证码已过期',
        [ERROR_CODES.CODE_USED]: '验证码已使用',
        [ERROR_CODES.CODE_FAILED_TOO_MANY]: '验证失败次数过多，验证码已失效',
        [ERROR_CODES.CODE_PURPOSE_MISMATCH]: '验证码用途不匹配',
        [ERROR_CODES.RATE_LIMIT_EMAIL]: '发送过于频繁，请稍后再试',
        [ERROR_CODES.RATE_LIMIT_IP]: '请求过于频繁，请稍后再试',
        [ERROR_CODES.RATE_LIMIT_DAILY]: '今日发送次数已达上限',
        [ERROR_CODES.EMAIL_BLOCKED]: '该邮箱已被临时封禁',
        [ERROR_CODES.EMAIL_SEND_FAILED]: '邮件发送失败',
        [ERROR_CODES.CODE_GENERATE_FAILED]: '验证码生成失败',
      };
      return errorMessages[this.code] || this.message;
    }

    if (this.isAuthError()) {
      if (this.code === 401) return '请先登录';
      if (this.code === 403) return '没有权限访问';
      const authMessages: Record<number, string> = {
        [ERROR_CODES.USER_NOT_FOUND]: '用户不存在',
        [ERROR_CODES.USERNAME_EXISTS]: '用户名已存在',
        [ERROR_CODES.EMAIL_EXISTS]: '邮箱已存在',
        [ERROR_CODES.INVALID_CREDENTIALS]: '用户名或密码错误',
        [ERROR_CODES.TOKEN_EXPIRED]: '登录已过期，请重新登录',
      };
      return authMessages[this.code] || this.message || '认证失败';
    }

    return this.message || '操作失败，请稍后重试';
  }
}

export interface HttpRequester {
  request<T>(endpoint: string, options?: RequestInit): Promise<Result<T>>;
  setToken(token: string): void;
  clearToken(): void;
  getToken(): string | null;
  getBaseURL(): string;
}

export class HttpClient implements HttpRequester {
  private baseURL: string;
  private token: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    this.token =
      typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function'
        ? localStorage.getItem('token')
        : null;
  }

  setToken(token: string): void {
    this.token = token;
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem('token', token);
    }
  }

  clearToken(): void {
    this.token = null;
    if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
      localStorage.removeItem('token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<Result<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options?.headers,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, { ...options, headers });
      if (response.status === 401 && this.token) {
        return await this.handleUnauthorized(endpoint, options);
      }

      const result: Result<T> = await response.json();
      if (result.code !== 200) {
        throw new ApiError(result.code, result.message, result.data);
      }
      return result;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof TypeError) throw new ApiError(0, 'Network error: Unable to connect to server');
      throw new ApiError(500, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async handleUnauthorized<T>(endpoint: string, options?: RequestInit): Promise<Result<T>> {
    const refreshToken =
      typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function'
        ? localStorage.getItem('refreshToken')
        : null;
    if (!refreshToken) throw new ApiError(401, 'No refresh token available');

    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.refreshSubscribers.push(() => {
          this.request<T>(endpoint, options).then(resolve).catch(reject);
        });
      });
    }

    this.isRefreshing = true;
    try {
      const response = await fetch(`${this.baseURL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const result = await response.json();
      if (result.code !== 200 || !result.data?.token) {
        throw new ApiError(result.code || 401, result.message || 'Token refresh failed');
      }

      const newToken = result.data.token as string;
      this.setToken(newToken);
      this.refreshSubscribers.forEach((callback) => callback(newToken));
      this.refreshSubscribers = [];
      return await this.request<T>(endpoint, options);
    } catch (error) {
      this.clearToken();
      if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
        localStorage.removeItem('refreshToken');
      }
      if (error instanceof ApiError) throw error;
      throw new ApiError(401, 'Token refresh failed');
    } finally {
      this.isRefreshing = false;
    }
  }
}
