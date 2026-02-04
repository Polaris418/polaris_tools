/**
 * API Client for Polaris Tools Platform
 * Provides type-safe methods for all backend API endpoints
 */

import type {
  Result,
  PageResult,
  UserRegisterRequest,
  UserLoginRequest,
  UserResponse,
  LoginResponse,
  UpdateProfileRequest,
  ToolCreateRequest,
  ToolUpdateRequest,
  ToolQueryRequest,
  ToolResponse,
  CategoryCreateRequest,
  CategoryUpdateRequest,
  CategoryResponse,
  ToolUsageResponse,
  NotificationResponse,
  NotificationQueryRequest,
  NotificationCreateRequest,
  NotificationUpdateRequest,
  SubscriptionPreferenceResponse,
  SendVerificationCodeRequest,
  SendVerificationCodeResponse,
  RegisterWithCodeRequest,
  LoginWithCodeRequest,
  VerifyResetCodeRequest,
  VerifyResetCodeResponse,
  ResetPasswordWithTokenRequest,
  SendChangeEmailCodeRequest,
  VerifyChangeEmailRequest,
  ChangePasswordRequest,
} from '../types';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Check if error is a rate limit error
   */
  isRateLimitError(): boolean {
    return this.code >= 4291 && this.code <= 4299;
  }

  /**
   * Check if error is a verification code error
   */
  isVerificationError(): boolean {
    return this.code >= 4001 && this.code <= 4099;
  }

  /**
   * Check if error is an authentication error
   */
  isAuthError(): boolean {
    return this.code === 401 || this.code === 403;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    // Rate limit errors
    if (this.isRateLimitError()) {
      if (this.code === 4291 && this.data?.seconds) {
        return `发送过于频繁，请${this.data.seconds}秒后再试`;
      }
      return this.message || '请求过于频繁，请稍后再试';
    }

    // Verification code errors
    if (this.isVerificationError()) {
      const errorMessages: Record<number, string> = {
        4001: '验证码无效',
        4002: '验证码已过期',
        4003: '验证码已使用',
        4004: '验证失败次数过多，验证码已失效',
        4005: '验证码用途不匹配',
        4011: '该邮箱已注册',
        4012: '该邮箱未注册',
        4013: '邮箱格式无效',
      };
      return errorMessages[this.code] || this.message;
    }

    // Authentication errors
    if (this.isAuthError()) {
      return this.code === 401 ? '请先登录' : '没有权限访问';
    }

    // Default message
    return this.message || '操作失败，请稍后重试';
  }
}

/**
 * Main API Client class
 */
class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('token');
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('token', token);
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    this.token = null;
    localStorage.removeItem('token');
  }

  /**
   * Generic request method
   */
  async request<T>(endpoint: string, options?: RequestInit): Promise<Result<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options?.headers,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      // 401 error, attempt token refresh
      if (response.status === 401 && this.token) {
        return await this.handleUnauthorized(endpoint, options);
      }

      // Parse JSON response
      const result: Result<T> = await response.json();

      // Check if the API returned an error
      if (result.code !== 200) {
        throw new ApiError(result.code, result.message, result.data);
      }

      return result;
    } catch (error) {
      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw new ApiError(0, 'Network error: Unable to connect to server');
      }

      // Handle other errors
      throw new ApiError(500, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Handle 401 Unauthorized errors by refreshing token
   */
  private async handleUnauthorized<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<Result<T>> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      throw new ApiError(401, 'No refresh token available');
    }

    // If already refreshing, queue this request
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.refreshSubscribers.push((newToken: string) => {
          this.request<T>(endpoint, options).then(resolve).catch(reject);
        });
      });
    }

    this.isRefreshing = true;

    try {
      // Make direct fetch call to refresh endpoint to avoid recursion
      const response = await fetch(`${this.baseURL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const result = await response.json();

      // Check if refresh failed
      if (result.code !== 200 || !result.data?.token) {
        throw new ApiError(result.code || 401, result.message || 'Token refresh failed');
      }

      const newToken = result.data.token;

      // Update token
      this.setToken(newToken);

      // Notify all waiting requests
      this.refreshSubscribers.forEach((callback) => callback(newToken));
      this.refreshSubscribers = [];

      // Retry original request
      return await this.request<T>(endpoint, options);
    } catch (error) {
      // Refresh failed, clear state
      this.clearToken();
      localStorage.removeItem('refreshToken');
      
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(401, 'Token refresh failed');
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Authentication API methods
   */
  auth = {
    /**
     * Register a new user
     */
    register: (data: UserRegisterRequest): Promise<Result<UserResponse>> => {
      return this.request<UserResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Send registration verification code
     */
    sendRegisterCode: (data: SendVerificationCodeRequest): Promise<Result<SendVerificationCodeResponse>> => {
      return this.request<SendVerificationCodeResponse>('/api/v1/auth/register/send-code', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Register with verification code
     */
    verifyRegister: (data: RegisterWithCodeRequest): Promise<Result<LoginResponse>> => {
      return this.request<LoginResponse>('/api/v1/auth/register/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Login user
     */
    login: (data: UserLoginRequest): Promise<Result<LoginResponse>> => {
      return this.request<LoginResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Send login verification code
     */
    sendLoginCode: (data: SendVerificationCodeRequest): Promise<Result<SendVerificationCodeResponse>> => {
      return this.request<SendVerificationCodeResponse>('/api/v1/auth/login/send-code', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Login with verification code
     */
    verifyLoginCode: (data: LoginWithCodeRequest): Promise<Result<LoginResponse>> => {
      return this.request<LoginResponse>('/api/v1/auth/login/verify-code', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Logout user
     */
    logout: (): Promise<Result<void>> => {
      return this.request<void>('/api/v1/auth/logout', {
        method: 'POST',
      });
    },

    /**
     * Refresh authentication token
     */
    refreshToken: (refreshToken: string): Promise<Result<{ token: string }>> => {
      return this.request<{ token: string }>('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    },

    /**
     * Get current user information
     */
    getCurrentUser: (): Promise<Result<UserResponse>> => {
      return this.request<UserResponse>('/api/v1/auth/me');
    },

    /**
     * Send password reset verification code
     */
    sendResetCode: (data: SendVerificationCodeRequest): Promise<Result<SendVerificationCodeResponse>> => {
      return this.request<SendVerificationCodeResponse>('/api/v1/auth/password/send-reset-code', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Verify password reset code
     */
    verifyResetCode: (data: VerifyResetCodeRequest): Promise<Result<VerifyResetCodeResponse>> => {
      return this.request<VerifyResetCodeResponse>('/api/v1/auth/password/verify-code', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Reset password with reset token
     */
    resetPassword: (data: ResetPasswordWithTokenRequest): Promise<Result<void>> => {
      return this.request<void>('/api/v1/auth/password/reset', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    
    /**
     * Send change password verification code
     */
    sendChangePasswordCode: (data: SendVerificationCodeRequest): Promise<Result<SendVerificationCodeResponse>> => {
      return this.request<SendVerificationCodeResponse>('/api/v1/auth/password/send-change-code', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    
    /**
     * Change password with verification code and old password
     */
    changePassword: (data: ChangePasswordRequest): Promise<Result<void>> => {
      return this.request<void>('/api/v1/auth/password/change', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    
    /**
     * Check if email is available for registration
     */
    checkEmailAvailable: (email: string): Promise<Result<{ available: boolean }>> => {
      return this.request<{ available: boolean }>(`/api/v1/auth/check-email?email=${encodeURIComponent(email)}`);
    },
    
    /**
     * Check if username is available for registration
     */
    checkUsernameAvailable: (username: string): Promise<Result<{ available: boolean }>> => {
      return this.request<{ available: boolean }>(`/api/v1/auth/check-username?username=${encodeURIComponent(username)}`);
    },
  };

  /**
   * User API methods
   */
  user = {
    /**
     * Update user profile
     */
    updateProfile: (data: UpdateProfileRequest): Promise<Result<UserResponse>> => {
      return this.request<UserResponse>('/api/v1/user/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  };

  /**
   * Email verification API methods
   */
  email = {
    /**
     * Verify email with token
     */
    verify: (token: string): Promise<Result<number>> => {
      return this.request<number>(`/api/v1/email/verify?token=${encodeURIComponent(token)}`, {
        method: 'POST',
      });
    },

    /**
     * Get email verification status
     */
    getVerificationStatus: (): Promise<Result<{
      email: string;
      verified: boolean;
      verifiedAt: string | null;
      cooldownSeconds: number;
      dailyUsageCount: number;
    }>> => {
      return this.request('/api/v1/email/verification-status');
    },

    /**
     * Resend verification email
     */
    resendVerification: (): Promise<Result<void>> => {
      return this.request<void>('/api/v1/email/resend-verification', {
        method: 'POST',
      });
    },

    /**
     * Update email address (requires password confirmation)
     */
    updateEmail: (newEmail: string, password: string): Promise<Result<void>> => {
      return this.request<void>('/api/v1/user/email', {
        method: 'PUT',
        body: JSON.stringify({ newEmail, password }),
      });
    },

    /**
     * Send email change verification code
     */
    sendChangeEmailCode: (data: SendChangeEmailCodeRequest): Promise<Result<SendVerificationCodeResponse>> => {
      return this.request<SendVerificationCodeResponse>('/api/v1/user/email/send-change-code', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Verify email change with code
     */
    verifyChangeEmail: (data: VerifyChangeEmailRequest): Promise<Result<void>> => {
      return this.request<void>('/api/v1/user/email/verify-change', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Verify password reset token
     */
    verifyResetToken: (token: string): Promise<Result<number>> => {
      return this.request<number>(`/api/v1/email/verify-reset-token?token=${encodeURIComponent(token)}`, {
        method: 'POST',
      });
    },

    /**
     * Reset password using token
     */
    resetPassword: (token: string, newPassword: string): Promise<Result<void>> => {
      return this.request<void>(`/api/v1/email/reset-password?token=${encodeURIComponent(token)}&newPassword=${encodeURIComponent(newPassword)}`, {
        method: 'POST',
      });
    },
  };

  /**
   * Subscription preferences API methods
   */
  preferences = {
    /**
     * Get user's subscription preferences
     */
    get: (): Promise<Result<SubscriptionPreferenceResponse[]>> => {
      return this.request<SubscriptionPreferenceResponse[]>('/api/v1/subscription/preferences');
    },

    /**
     * Update subscription preferences
     */
    update: (preferences: Record<string, boolean>): Promise<Result<string>> => {
      return this.request<string>('/api/v1/subscription/preferences', {
        method: 'PUT',
        body: JSON.stringify({ preferences }),
      });
    },

    /**
     * Unsubscribe using token (one-click unsubscribe)
     */
    unsubscribe: (token: string, reason?: string): Promise<Result<string>> => {
      return this.request<string>('/api/v1/subscription/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ token, reason }),
      });
    },

    /**
     * Unsubscribe using GET method (for email links)
     */
    unsubscribeByGet: (token: string, reason?: string): Promise<Result<string>> => {
      const params = new URLSearchParams({ token });
      if (reason) params.append('reason', reason);
      return this.request<string>(`/api/v1/subscription/unsubscribe?${params.toString()}`);
    },

    /**
     * Get subscription history
     */
    getHistory: (): Promise<Result<SubscriptionPreferenceResponse[]>> => {
      return this.request<SubscriptionPreferenceResponse[]>('/api/v1/subscription/history');
    },
  };

  /**
   * Tools API methods
   */
  tools = {
    /**
     * Get paginated list of tools with optional filters
     */
    list: (params?: ToolQueryRequest): Promise<Result<PageResult<ToolResponse>>> => {
      const queryParams = new URLSearchParams();
      
      if (params) {
        if (params.keyword) queryParams.append('keyword', params.keyword);
        if (params.categoryId) queryParams.append('categoryId', params.categoryId.toString());
        if (params.toolType !== undefined) queryParams.append('toolType', params.toolType.toString());
        if (params.isFeatured !== undefined) queryParams.append('isFeatured', params.isFeatured.toString());
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.size) queryParams.append('size', params.size.toString());
      }

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/api/v1/tools?${queryString}` : '/api/v1/tools';

      return this.request<PageResult<ToolResponse>>(endpoint);
    },

    /**
     * Get tool by ID
     */
    get: (id: number): Promise<Result<ToolResponse>> => {
      return this.request<ToolResponse>(`/api/v1/tools/${id}`);
    },

    /**
     * Create a new tool (admin only)
     */
    create: (data: ToolCreateRequest): Promise<Result<ToolResponse>> => {
      return this.request<ToolResponse>('/api/v1/tools', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Update an existing tool (admin only)
     */
    update: (id: number, data: ToolUpdateRequest): Promise<Result<ToolResponse>> => {
      return this.request<ToolResponse>(`/api/v1/tools/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    /**
     * Delete a tool (admin only)
     */
    delete: (id: number): Promise<Result<void>> => {
      return this.request<void>(`/api/v1/tools/${id}`, {
        method: 'DELETE',
      });
    },

    /**
     * Record a tool view
     */
    recordView: (id: number): Promise<Result<void>> => {
      return this.request<void>(`/api/v1/tools/${id}/view`, {
        method: 'POST',
      });
    },

    /**
     * Record a tool usage
     */
    recordUse: (id: number): Promise<Result<void>> => {
      return this.request<void>(`/api/v1/tools/${id}/use`, {
        method: 'POST',
      });
    },
    
    /**
     * Record a tool usage by URL
     * @returns The usage record ID for duration tracking
     */
    recordUseByUrl: (url: string): Promise<Result<number | null>> => {
      return this.request<number | null>(`/api/v1/tools/use-by-url?url=${encodeURIComponent(url)}`, {
        method: 'POST',
      });
    },
    
    /**
     * Update usage duration
     * @param usageId The usage record ID returned from recordUseByUrl
     * @param duration Duration in seconds
     */
    updateUsageDuration: (usageId: number, duration: number): Promise<Result<void>> => {
      return this.request<void>(`/api/v1/tools/usage/${usageId}/duration?duration=${duration}`, {
        method: 'PUT',
      });
    },
  };

  /**
   * Categories API methods
   */
  categories = {
    /**
     * Get all categories (not paginated)
     */
    list: (): Promise<Result<CategoryResponse[]>> => {
      return this.request<CategoryResponse[]>('/api/v1/categories/all');
    },

    /**
     * Get category by ID
     */
    get: (id: number): Promise<Result<CategoryResponse>> => {
      return this.request<CategoryResponse>(`/api/v1/categories/${id}`);
    },

    /**
     * Create a new category (admin only)
     */
    create: (data: CategoryCreateRequest): Promise<Result<CategoryResponse>> => {
      return this.request<CategoryResponse>('/api/v1/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Update an existing category (admin only)
     */
    update: (id: number, data: CategoryUpdateRequest): Promise<Result<CategoryResponse>> => {
      return this.request<CategoryResponse>(`/api/v1/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    /**
     * Delete a category (admin only)
     */
    delete: (id: number): Promise<Result<void>> => {
      return this.request<void>(`/api/v1/categories/${id}`, {
        method: 'DELETE',
      });
    },
  };

  /**
   * Favorites API methods
   */
  favorites = {
    /**
     * Get user's favorite tools
     */
    list: (): Promise<Result<ToolResponse[]>> => {
      return this.request<ToolResponse[]>('/api/v1/favorites');
    },

    /**
     * Add a tool to favorites
     */
    add: (toolId: number): Promise<Result<void>> => {
      return this.request<void>('/api/v1/favorites', {
        method: 'POST',
        body: JSON.stringify({ toolId }),
      });
    },

    /**
     * Remove a tool from favorites
     */
    remove: (toolId: number): Promise<Result<void>> => {
      return this.request<void>(`/api/v1/favorites/${toolId}`, {
        method: 'DELETE',
      });
    },

    /**
     * Check if a tool is favorited
     */
    check: (toolId: number): Promise<Result<boolean>> => {
      return this.request<boolean>(`/api/v1/favorites/check/${toolId}`);
    },
  };

  /**
   * Usage statistics API methods
   */
  usage = {
    /**
     * Get recently used tools
     */
    recent: (limit: number = 10): Promise<Result<ToolResponse[]>> => {
      return this.request<ToolResponse[]>(`/api/v1/usage/recent?limit=${limit}`);
    },

    /**
     * Get popular tools
     */
    popular: (limit: number = 10): Promise<Result<ToolResponse[]>> => {
      return this.request<ToolResponse[]>(`/api/v1/usage/popular?limit=${limit}`);
    },

    /**
     * Get user's usage history
     */
    history: (page: number = 1, size: number = 20): Promise<Result<PageResult<ToolUsageResponse>>> => {
      return this.request<PageResult<ToolUsageResponse>>(
        `/api/v1/usage/history?page=${page}&size=${size}`
      );
    },
  };

  /**
   * Document Export API methods (MD2Word)
   */
  documents = {
    /**
     * Export a single document
     * Returns the file as a blob for download
     */
    export: async (
      documentId: number,
      format: 'docx' | 'pdf' | 'html',
      template: string = 'corporate'
    ): Promise<Blob> => {
      const endpoint = `/api/v1/documents/${documentId}/export?format=${format}&template=${template}`;
      
      const headers: HeadersInit = {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      };

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        throw new ApiError(response.status, `Export failed: ${response.statusText}`);
      }

      return response.blob();
    },

    /**
     * Export markdown content directly (without saving as document)
     * Returns the file as a blob for download
     */
    exportMarkdown: async (
      markdown: string,
      format: 'docx' | 'pdf' | 'html',
      template: string = 'corporate',
      fileName: string = 'document'
    ): Promise<Blob> => {
      // Create a temporary document for export
      const endpoint = `/api/v1/documents/export-markdown`;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      };

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          markdown,
          format,
          template,
          fileName,
        }),
      });

      if (!response.ok) {
        throw new ApiError(response.status, `Export failed: ${response.statusText}`);
      }

      return response.blob();
    },

    /**
     * Batch export documents
     */
    batchExport: async (
      documentIds: number[],
      format: 'docx' | 'pdf' | 'html',
      template: string = 'corporate'
    ): Promise<Result<any[]>> => {
      return this.request<any[]>('/api/v1/documents/batch-export', {
        method: 'POST',
        body: JSON.stringify({
          documentIds,
          format,
          template,
        }),
      });
    },

    /**
     * Batch export and download as ZIP
     */
    batchExportDownload: async (
      documentIds: number[],
      format: 'docx' | 'pdf' | 'html',
      template: string = 'corporate'
    ): Promise<Blob> => {
      const endpoint = '/api/v1/documents/batch-export/download';
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      };

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          documentIds,
          format,
          template,
        }),
      });

      if (!response.ok) {
        throw new ApiError(response.status, `Batch export failed: ${response.statusText}`);
      }

      return response.blob();
    },

    /**
     * Preview markdown as HTML
     */
    preview: (markdown: string): Promise<Result<string>> => {
      return this.request<string>('/api/v1/documents/preview', {
        method: 'POST',
        body: JSON.stringify(markdown),
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    },
  };

  /**
   * Notifications API methods
   */
  notifications = {
    /**
     * Get user notifications list
     */
    list: (params?: NotificationQueryRequest): Promise<Result<PageResult<NotificationResponse>>> => {
      const queryParams = new URLSearchParams();
      
      if (params) {
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.size) queryParams.append('size', params.size.toString());
        if (params.type) queryParams.append('type', params.type);
        if (params.isRead !== undefined) queryParams.append('isRead', params.isRead.toString());
      }

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/api/v1/notifications?${queryString}` : '/api/v1/notifications';

      return this.request<PageResult<NotificationResponse>>(endpoint);
    },

    /**
     * Get unread notifications count
     */
    getUnreadCount: (): Promise<Result<number>> => {
      return this.request<number>('/api/v1/notifications/unread-count');
    },

    /**
     * Mark notification as read
     */
    markAsRead: (id: number): Promise<Result<void>> => {
      return this.request<void>(`/api/v1/notifications/${id}/read`, {
        method: 'PUT',
      });
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead: (): Promise<Result<void>> => {
      return this.request<void>('/api/v1/notifications/read-all', {
        method: 'PUT',
      });
    },

    /**
     * Delete notification
     */
    delete: (id: number): Promise<Result<void>> => {
      return this.request<void>(`/api/v1/notifications/${id}`, {
        method: 'DELETE',
      });
    },

    /**
     * Send notification (admin only)
     */
    send: (data: NotificationCreateRequest): Promise<Result<number>> => {
      return this.request<number>('/api/v1/notifications/send', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Update notification (admin only)
     */
    update: (id: number, data: NotificationUpdateRequest): Promise<Result<number>> => {
      return this.request<number>(`/api/v1/notifications/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    /**
     * Restore deleted notification (admin only)
     */
    restore: (id: number): Promise<Result<void>> => {
      return this.request<void>(`/api/v1/notifications/${id}/restore`, {
        method: 'POST',
      });
    },
    resend: (id: number): Promise<Result<number>> => {
      return this.request<number>(`/api/v1/notifications/${id}/resend`, {
        method: 'POST',
      });
    },

    /**
     * Get all notifications (admin only)
     */
    listAll: (params?: NotificationQueryRequest): Promise<Result<PageResult<NotificationResponse>>> => {
      const queryParams = new URLSearchParams();
      
      if (params) {
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.size) queryParams.append('size', params.size.toString());
        if (params.type) queryParams.append('type', params.type);
        if (params.includeDeleted !== undefined) queryParams.append('includeDeleted', params.includeDeleted.toString());
      }

      const queryString = queryParams.toString();
      const endpoint = queryString 
        ? `/api/v1/notifications/admin/all?${queryString}` 
        : '/api/v1/notifications/admin/all';

      return this.request<PageResult<NotificationResponse>>(endpoint);
    },
  };
}

// Export singleton instance
export const apiClient = new ApiClient();
