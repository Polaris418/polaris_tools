/**
 * Admin API Client Extension
 * 管理员API扩展
 */

import { apiClient, ApiError } from './client';
import type { Result, PageResult } from '../types';
import type { 
  AdminUserResponse, 
  AdminUserUpdateRequest, 
  UserQueryRequest, 
  DashboardStats,
  ToolResponse,
  ToolQueryRequest,
  ToolUpdateRequest,
  CategoryResponse,
  CategoryQueryRequest,
  CategoryUpdateRequest,
  EmailAuditLogResponse,
  EmailQueryRequest,
  EmailStatisticsResponse,
  MonitoringDashboardResponse,
  EmailMetricsResponse,
  EmailQueueStatsResponse,
  EmailTemplateResponse,
  EmailTemplateQueryRequest,
  EmailTemplateUpdateRequest,
  EmailTemplatePreviewRequest,
  EmailTemplatePreviewResponse,
  EmailQueueItemResponse,
  EmailQueueQueryRequest,
  EmailQueueConfigResponse,
  EmailQueueConfigUpdateRequest,
  SuppressionResponse,
  SuppressionQueryRequest,
  AddSuppressionRequest,
  SubscriptionStatsResponse,
  UserSubscriptionResponse,
  SubscriptionQueryRequest,
  UnsubscribeAnalyticsResponse,
  SubscriptionPreferenceUpdateRequest,
  EmailProviderInfo,
  ProviderStatus
} from '../pages/admin/types';

/**
 * Admin API methods
 */
export const adminApi = {
  /**
   * Get dashboard statistics
   */
  getStats: (): Promise<Result<DashboardStats>> => {
    return apiClient.request<DashboardStats>('/api/v1/admin/stats');
  },

  /**
   * User management
   */
  users: {
    /**
     * Get paginated list of users
     */
    list: (params?: UserQueryRequest): Promise<Result<PageResult<AdminUserResponse>>> => {
      const queryParams = new URLSearchParams();
      
      if (params) {
        if (params.keyword) queryParams.append('keyword', params.keyword);
        if (params.status !== undefined) queryParams.append('status', params.status.toString());
        if (params.planType !== undefined) queryParams.append('planType', params.planType.toString());
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.size) queryParams.append('size', params.size.toString());
        if (params.includeDeleted) queryParams.append('includeDeleted', 'true');
      }

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/api/v1/admin/users?${queryString}` : '/api/v1/admin/users';

      return apiClient.request<PageResult<AdminUserResponse>>(endpoint);
    },

    /**
     * Get user by ID
     */
    get: (id: number): Promise<Result<AdminUserResponse>> => {
      return apiClient.request<AdminUserResponse>(`/api/v1/admin/users/${id}`);
    },

    /**
     * Create new user
     */
    create: (data: { username: string; email: string; password: string; nickname?: string; planType?: number; status?: number }): Promise<Result<AdminUserResponse>> => {
      return apiClient.request<AdminUserResponse>('/api/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Update user
     */
    update: (id: number, data: AdminUserUpdateRequest): Promise<Result<AdminUserResponse>> => {
      return apiClient.request<AdminUserResponse>(`/api/v1/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    /**
     * Delete user
     */
    delete: (id: number): Promise<Result<void>> => {
      return apiClient.request<void>(`/api/v1/admin/users/${id}`, {
        method: 'DELETE',
      });
    },

    /**
     * Restore deleted user
     */
    restore: (id: number): Promise<Result<AdminUserResponse>> => {
      return apiClient.request<AdminUserResponse>(`/api/v1/admin/users/${id}/restore`, {
        method: 'PUT',
      });
    },

    /**
     * Permanently delete user
     */
    permanentDelete: (id: number): Promise<Result<void>> => {
      return apiClient.request<void>(`/api/v1/admin/users/${id}?permanent=true`, {
        method: 'DELETE',
      });
    },

    /**
     * Enable/disable user
     */
    toggleStatus: (id: number, status: number): Promise<Result<void>> => {
      return apiClient.request<void>(`/api/v1/admin/users/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    },
  },

  /**
   * Usage statistics for admin
   */
  statistics: {
    /**
     * Get usage trend data
     */
    usageTrend: (days: number = 30): Promise<Result<{ date: string; count: number }[]>> => {
      return apiClient.request<{ date: string; count: number }[]>(`/api/v1/admin/statistics/usage-trend?days=${days}`);
    },

    /**
     * Get user registration trend
     */
    userTrend: (days: number = 30): Promise<Result<{ date: string; count: number }[]>> => {
      return apiClient.request<{ date: string; count: number }[]>(`/api/v1/admin/statistics/user-trend?days=${days}`);
    },

    /**
     * Get popular tools
     */
    popularTools: (limit: number = 10): Promise<Result<{ toolId: number; toolName: string; count: number }[]>> => {
      return apiClient.request<{ toolId: number; toolName: string; count: number }[]>(
        `/api/v1/admin/statistics/popular-tools?limit=${limit}`
      );
    },
  },

  /**
   * Tool management
   */
  tools: {
    /**
     * Get paginated list of tools
     */
    list: (params?: ToolQueryRequest): Promise<Result<PageResult<ToolResponse>>> => {
      const queryParams = new URLSearchParams();
      
      if (params) {
        if (params.keyword) queryParams.append('keyword', params.keyword);
        if (params.categoryId !== undefined) queryParams.append('categoryId', params.categoryId.toString());
        if (params.status !== undefined) queryParams.append('status', params.status.toString());
        if (params.isFeatured !== undefined) queryParams.append('isFeatured', params.isFeatured.toString());
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.size) queryParams.append('size', params.size.toString());
        if (params.includeDeleted) queryParams.append('includeDeleted', 'true');
      }

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/api/v1/admin/tools?${queryString}` : '/api/v1/admin/tools';

      return apiClient.request<PageResult<ToolResponse>>(endpoint);
    },

    /**
     * Get tool by ID
     */
    get: (id: number): Promise<Result<ToolResponse>> => {
      return apiClient.request<ToolResponse>(`/api/v1/admin/tools/${id}`);
    },

    /**
     * Create new tool
     */
    create: (data: ToolUpdateRequest): Promise<Result<ToolResponse>> => {
      return apiClient.request<ToolResponse>('/api/v1/admin/tools', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Update tool
     */
    update: (id: number, data: ToolUpdateRequest): Promise<Result<ToolResponse>> => {
      return apiClient.request<ToolResponse>(`/api/v1/admin/tools/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    /**
     * Delete tool
     */
    delete: (id: number): Promise<Result<void>> => {
      return apiClient.request<void>(`/api/v1/admin/tools/${id}`, {
        method: 'DELETE',
      });
    },

    /**
     * Restore deleted tool
     */
    restore: (id: number): Promise<Result<ToolResponse>> => {
      return apiClient.request<ToolResponse>(`/api/v1/admin/tools/${id}/restore`, {
        method: 'PUT',
      });
    },

    /**
     * Permanently delete tool
     */
    permanentDelete: (id: number): Promise<Result<void>> => {
      return apiClient.request<void>(`/api/v1/admin/tools/${id}?permanent=true`, {
        method: 'DELETE',
      });
    },
  },

  /**
   * Category management
   */
  categories: {
    /**
     * Get list of categories
     */
    list: (params?: CategoryQueryRequest): Promise<Result<CategoryResponse[]>> => {
      const queryParams = new URLSearchParams();
      
      if (params) {
        if (params.status !== undefined) queryParams.append('status', params.status.toString());
        if (params.includeDeleted) queryParams.append('includeDeleted', 'true');
      }

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/api/v1/admin/categories?${queryString}` : '/api/v1/admin/categories';

      return apiClient.request<CategoryResponse[]>(endpoint);
    },

    /**
     * Get category by ID
     */
    get: (id: number): Promise<Result<CategoryResponse>> => {
      return apiClient.request<CategoryResponse>(`/api/v1/admin/categories/${id}`);
    },

    /**
     * Create new category
     */
    create: (data: CategoryUpdateRequest): Promise<Result<CategoryResponse>> => {
      return apiClient.request<CategoryResponse>('/api/v1/admin/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Update category
     */
    update: (id: number, data: CategoryUpdateRequest): Promise<Result<CategoryResponse>> => {
      return apiClient.request<CategoryResponse>(`/api/v1/admin/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    /**
     * Delete category
     */
    delete: (id: number): Promise<Result<void>> => {
      return apiClient.request<void>(`/api/v1/admin/categories/${id}`, {
        method: 'DELETE',
      });
    },

    /**
     * Restore deleted category
     */
    restore: (id: number): Promise<Result<CategoryResponse>> => {
      return apiClient.request<CategoryResponse>(`/api/v1/admin/categories/${id}/restore`, {
        method: 'PUT',
      });
    },

    /**
     * Permanently delete category
     */
    permanentDelete: (id: number): Promise<Result<void>> => {
      return apiClient.request<void>(`/api/v1/admin/categories/${id}?permanent=true`, {
        method: 'DELETE',
      });
    },

    /**
     * Reorder categories (batch update sort order)
     */
    reorder: (items: { id: number; sortOrder: number }[]): Promise<Result<void>> => {
      return apiClient.request<void>('/api/v1/admin/categories/reorder', {
        method: 'PUT',
        body: JSON.stringify({ items }),
      });
    },
  },

  /**
   * Email management
   */
  emails: {
    /**
     * Get paginated list of email logs
     */
    list: (params?: EmailQueryRequest): Promise<Result<PageResult<EmailAuditLogResponse>>> => {
      const queryParams = new URLSearchParams();
      
      if (params) {
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
        if (params.recipient) queryParams.append('recipient', params.recipient);
        if (params.emailType) queryParams.append('emailType', params.emailType);
        if (params.status) queryParams.append('status', params.status);
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      }

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/api/v1/admin/emails/logs?${queryString}` : '/api/v1/admin/emails/logs';

      return apiClient.request<PageResult<EmailAuditLogResponse>>(endpoint);
    },

    /**
     * Get email log by ID
     */
    get: (id: number): Promise<Result<EmailAuditLogResponse>> => {
      return apiClient.request<EmailAuditLogResponse>(`/api/v1/admin/emails/logs/${id}`);
    },

    /**
     * Get email statistics
     */
    statistics: (): Promise<Result<EmailStatisticsResponse>> => {
      return apiClient.request<EmailStatisticsResponse>('/api/v1/admin/emails/statistics');
    },

    /**
     * Cleanup old email logs
     */
    cleanup: (days: number = 90): Promise<Result<{ deletedCount: number; message: string }>> => {
      return apiClient.request<{ deletedCount: number; message: string }>(
        `/api/v1/admin/emails/logs/cleanup?days=${days}`,
        { method: 'DELETE' }
      );
    },
    
    /**
     * Retry failed email
     */
    retry: (id: number): Promise<Result<{ success: boolean; message: string }>> => {
      return apiClient.request<{ success: boolean; message: string }>(
        `/api/v1/admin/email/queue/retry/${id}`,
        { method: 'POST' }
      );
    },
    
    /**
     * Batch delete email logs
     */
    batchDelete: (ids: number[]): Promise<Result<{ deletedCount: number; message: string }>> => {
      return apiClient.request<{ deletedCount: number; message: string }>(
        '/api/v1/admin/emails/logs/batch-delete',
        {
          method: 'DELETE',
          body: JSON.stringify({ ids }),
        }
      );
    },
    
    /**
     * Batch retry failed emails
     */
    batchRetry: (ids: number[]): Promise<Result<{ retriedCount: number; message: string }>> => {
      return apiClient.request<{ retriedCount: number; message: string }>(
        '/api/v1/admin/emails/logs/batch-retry',
        {
          method: 'POST',
          body: JSON.stringify({ ids }),
        }
      );
    },
  },

  /**
   * Monitoring management
   */
  monitoring: {
    /**
     * Get monitoring dashboard data
     */
    dashboard: (): Promise<Result<MonitoringDashboardResponse>> => {
      return apiClient.request<MonitoringDashboardResponse>('/api/monitoring/dashboard');
    },

    /**
     * Get current hour metrics
     */
    current: (): Promise<Result<EmailMetricsResponse>> => {
      return apiClient.request<EmailMetricsResponse>('/api/monitoring/current');
    },

    /**
     * Get metrics by time range
     */
    range: (startTime: string, endTime: string): Promise<Result<EmailMetricsResponse[]>> => {
      return apiClient.request<EmailMetricsResponse[]>(
        `/api/monitoring/range?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`
      );
    },

    /**
     * Get recent metrics
     */
    recent: (hours: number): Promise<Result<EmailMetricsResponse[]>> => {
      return apiClient.request<EmailMetricsResponse[]>(`/api/monitoring/recent/${hours}`);
    },

    /**
     * Get metrics by time range (alias for compatibility)
     */
    metrics: (timeRange: { startTime: string; endTime: string }): Promise<Result<EmailMetricsResponse[]>> => {
      return apiClient.request<EmailMetricsResponse[]>(
        `/api/monitoring/range?startTime=${encodeURIComponent(timeRange.startTime)}&endTime=${encodeURIComponent(timeRange.endTime)}`
      );
    },

    /**
     * Get alert configurations and history
     */
    alerts: (): Promise<Result<{
      configurations: Array<{
        id: number;
        name: string;
        type: string;
        threshold: number;
        enabled: boolean;
        notificationChannels: string[];
      }>;
      history: Array<{
        id: number;
        alertType: string;
        message: string;
        triggeredAt: string;
        resolved: boolean;
      }>;
    }>> => {
      return apiClient.request<{
        configurations: Array<{
          id: number;
          name: string;
          type: string;
          threshold: number;
          enabled: boolean;
          notificationChannels: string[];
        }>;
        history: Array<{
          id: number;
          alertType: string;
          message: string;
          triggeredAt: string;
          resolved: boolean;
        }>;
      }>('/api/monitoring/alerts');
    },

    /**
     * Configure alert settings
     */
    configureAlerts: (config: {
      successRateThreshold?: number;
      bounceRateThreshold?: number;
      complaintRateThreshold?: number;
      notificationChannels?: string[];
      enabled?: boolean;
    }): Promise<Result<void>> => {
      return apiClient.request<void>('/api/monitoring/alerts/config', {
        method: 'PUT',
        body: JSON.stringify(config),
      });
    },

    /**
     * Flush current metrics
     */
    flush: (): Promise<Result<void>> => {
      return apiClient.request<void>('/api/monitoring/flush', { method: 'POST' });
    },

    /**
     * Resume email sending
     */
    resume: (): Promise<Result<string>> => {
      return apiClient.request<string>('/api/monitoring/resume', { method: 'POST' });
    },

    /**
     * Pause email sending
     */
    pause: (): Promise<Result<string>> => {
      return apiClient.request<string>('/api/monitoring/pause', { method: 'POST' });
    },
  },

  /**
   * Email queue management
   */
  queue: {
    /**
     * Get queue statistics
     */
    stats: (): Promise<Result<EmailQueueStatsResponse>> => {
      return apiClient.request<EmailQueueStatsResponse>('/api/v1/admin/email/queue/stats');
    },

    /**
     * Get paginated list of queue items
     */
    list: (params?: EmailQueueQueryRequest): Promise<Result<PageResult<EmailQueueItemResponse>>> => {
      const queryParams = new URLSearchParams();
      
      if (params) {
        if (params.status) queryParams.append('status', params.status);
        if (params.priority) queryParams.append('priority', params.priority);
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.size) queryParams.append('size', params.size.toString());
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      }

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/api/v1/admin/email/queue?${queryString}` : '/api/v1/admin/email/queue';

      return apiClient.request<PageResult<EmailQueueItemResponse>>(endpoint);
    },

    /**
     * Retry failed email
     */
    retry: (id: number): Promise<Result<{ success: boolean; message: string }>> => {
      return apiClient.request<{ success: boolean; message: string }>(
        `/api/v1/admin/email/queue/retry/${id}`,
        { method: 'POST' }
      );
    },

    /**
     * Cancel pending email
     */
    cancel: (id: number): Promise<Result<{ success: boolean; message: string }>> => {
      return apiClient.request<{ success: boolean; message: string }>(
        `/api/v1/admin/email/queue/cancel/${id}`,
        { method: 'POST' }
      );
    },

    /**
     * Update email priority
     */
    updatePriority: (id: number, priority: 'HIGH' | 'MEDIUM' | 'LOW'): Promise<Result<{ success: boolean; message: string }>> => {
      return apiClient.request<{ success: boolean; message: string }>(
        `/api/v1/admin/email/queue/${id}/priority`,
        {
          method: 'PUT',
          body: JSON.stringify({ priority }),
        }
      );
    },

    /**
     * Pause queue processing
     */
    pause: (): Promise<Result<{ success: boolean; message: string }>> => {
      return apiClient.request<{ success: boolean; message: string }>(
        '/api/v1/admin/email/queue/pause',
        { method: 'POST' }
      );
    },

    /**
     * Resume queue processing
     */
    resume: (): Promise<Result<{ success: boolean; message: string }>> => {
      return apiClient.request<{ success: boolean; message: string }>(
        '/api/v1/admin/email/queue/resume',
        { method: 'POST' }
      );
    },

    /**
     * Get queue configuration
     */
    getConfig: (): Promise<Result<EmailQueueConfigResponse>> => {
      return apiClient.request<EmailQueueConfigResponse>('/api/v1/admin/email/queue/config');
    },

    /**
     * Update queue configuration
     */
    updateConfig: (config: EmailQueueConfigUpdateRequest): Promise<Result<EmailQueueConfigResponse>> => {
      return apiClient.request<EmailQueueConfigResponse>(
        '/api/v1/admin/email/queue/config',
        {
          method: 'PUT',
          body: JSON.stringify(config),
        }
      );
    },
  },

  /**
   * Email template management
   */
  templates: {
    /**
     * Get list of email templates (not paginated in backend)
     */
    list: (params?: EmailTemplateQueryRequest): Promise<Result<EmailTemplateResponse[]>> => {
      const queryParams = new URLSearchParams();
      
      if (params) {
        if (params.language) queryParams.append('language', params.language);
        if (params.code) queryParams.append('code', params.code);
        if (params.enabled !== undefined) queryParams.append('enabled', params.enabled.toString());
        // Note: page and size params are ignored by backend
      }

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/api/v1/admin/email/templates?${queryString}` : '/api/v1/admin/email/templates';

      return apiClient.request<EmailTemplateResponse[]>(endpoint);
    },

    /**
     * Get template by code and language
     */
    get: (code: string, language: string): Promise<Result<EmailTemplateResponse>> => {
      return apiClient.request<EmailTemplateResponse>(`/api/v1/admin/email/templates/${code}/${language}`);
    },

    /**
     * Create new template
     */
    create: (data: { code: string; name: string; language: string; subject: string; htmlContent: string; textContent?: string; enabled: boolean; version?: number }): Promise<Result<EmailTemplateResponse>> => {
      return apiClient.request<EmailTemplateResponse>('/api/v1/admin/email/templates', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          version: data.version || 1, // Default version to 1 for new templates
        }),
      });
    },

    /**
     * Update template
     */
    update: (id: number, data: EmailTemplateUpdateRequest & { code: string; language: string; version: number }): Promise<Result<EmailTemplateResponse>> => {
      return apiClient.request<EmailTemplateResponse>('/api/v1/admin/email/templates', {
        method: 'POST', // Backend uses POST for both create and update
        body: JSON.stringify({
          id,
          ...data,
        }),
      });
    },

    /**
     * Delete template
     */
    delete: (id: number): Promise<Result<void>> => {
      return apiClient.request<void>(`/api/v1/admin/email/templates/${id}`, {
        method: 'DELETE',
      });
    },

    /**
     * Preview template with sample data
     */
    preview: (request: EmailTemplatePreviewRequest): Promise<Result<EmailTemplatePreviewResponse>> => {
      return apiClient.request<EmailTemplatePreviewResponse>('/api/v1/admin/email/templates/preview', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    },

    /**
     * Send test email
     */
    sendTest: (templateId: number, email: string, variables: Record<string, string>): Promise<Result<{ success: boolean; message: string }>> => {
      return apiClient.request<{ success: boolean; message: string }>('/api/v1/admin/email/templates/test', {
        method: 'POST',
        body: JSON.stringify({ templateId, email, variables }),
      });
    },
  },

  /**
   * Suppression list management
   */
  suppression: {
    /**
     * Get paginated list of suppression entries
     */
    list: (params?: SuppressionQueryRequest): Promise<Result<PageResult<SuppressionResponse>>> => {
      const queryParams = new URLSearchParams();
      
      if (params) {
        if (params.email) queryParams.append('email', params.email);
        if (params.reason) queryParams.append('reason', params.reason);
        if (params.source) queryParams.append('source', params.source);
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
      }

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/api/admin/suppression?${queryString}` : '/api/admin/suppression';

      return apiClient.request<PageResult<SuppressionResponse>>(endpoint);
    },

    /**
     * Add email to suppression list
     */
    add: (data: AddSuppressionRequest): Promise<Result<SuppressionResponse>> => {
      return apiClient.request<SuppressionResponse>('/api/admin/suppression', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Remove email from suppression list
     */
    remove: (email: string): Promise<Result<void>> => {
      return apiClient.request<void>(`/api/admin/suppression/${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
    },

    /**
     * Check if email is in suppression list
     */
    check: (email: string): Promise<Result<SuppressionResponse>> => {
      return apiClient.request<SuppressionResponse>(`/api/admin/suppression/check/${encodeURIComponent(email)}`);
    },

    /**
     * Export suppression list as CSV
     */
    export: async (params?: SuppressionQueryRequest): Promise<Blob> => {
      const queryParams = new URLSearchParams();
      
      if (params) {
        if (params.email) queryParams.append('email', params.email);
        if (params.reason) queryParams.append('reason', params.reason);
        if (params.source) queryParams.append('source', params.source);
      }

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/api/admin/suppression/export?${queryString}` : '/api/admin/suppression/export';

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      return response.blob();
    },
  },

  /**
   * Verification monitoring
   */
  verificationMonitoring: {
    /**
     * Get verification statistics
     */
    stats: (params?: { startDate?: string; endDate?: string }): Promise<Result<{
      totalSent: number;
      totalVerified: number;
      totalFailed: number;
      successRate: number;
      avgVerificationTime: number;
    }>> => {
      const queryParams = new URLSearchParams();
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      
      const queryString = queryParams.toString();
      const endpoint = queryString 
        ? `/api/admin/verification-monitoring/stats?${queryString}` 
        : '/api/admin/verification-monitoring/stats';
      
      return apiClient.request<{
        totalSent: number;
        totalVerified: number;
        totalFailed: number;
        successRate: number;
        avgVerificationTime: number;
      }>(endpoint);
    },

    /**
     * Get time series data
     */
    timeSeries: (params?: { startDate?: string; endDate?: string; intervalHours?: number }): Promise<Result<Array<{
      time: string;
      sent: number;
      verified: number;
      failed: number;
      successRate: number;
    }>>> => {
      const queryParams = new URLSearchParams();
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.intervalHours) queryParams.append('intervalHours', params.intervalHours.toString());
      
      const queryString = queryParams.toString();
      const endpoint = queryString 
        ? `/api/admin/verification-monitoring/time-series?${queryString}` 
        : '/api/admin/verification-monitoring/time-series';
      
      return apiClient.request<Array<{
        time: string;
        sent: number;
        verified: number;
        failed: number;
        successRate: number;
      }>>(endpoint);
    },

    /**
     * Get purpose statistics
     */
    purposeStats: (params?: { startDate?: string; endDate?: string }): Promise<Result<Array<{
      purpose: string;
      count: number;
      successRate: number;
    }>>> => {
      const queryParams = new URLSearchParams();
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      
      const queryString = queryParams.toString();
      const endpoint = queryString 
        ? `/api/admin/verification-monitoring/purpose-stats?${queryString}` 
        : '/api/admin/verification-monitoring/purpose-stats';
      
      return apiClient.request<Array<{
        purpose: string;
        count: number;
        successRate: number;
      }>>(endpoint);
    },

    /**
     * Get rate limit statistics
     */
    rateLimitStats: (params?: { startDate?: string; endDate?: string }): Promise<Result<{
      emailLimitTriggered: number;
      ipLimitTriggered: number;
      dailyLimitTriggered: number;
    }>> => {
      const queryParams = new URLSearchParams();
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      
      const queryString = queryParams.toString();
      const endpoint = queryString 
        ? `/api/admin/verification-monitoring/rate-limit-stats?${queryString}` 
        : '/api/admin/verification-monitoring/rate-limit-stats';
      
      return apiClient.request<{
        emailLimitTriggered: number;
        ipLimitTriggered: number;
        dailyLimitTriggered: number;
      }>(endpoint);
    },

    /**
     * Get verification logs
     */
    logs: (params?: {
      page?: number;
      size?: number;
      email?: string;
      purpose?: string;
      action?: string;
      success?: number;
      startDate?: string;
      endDate?: string;
    }): Promise<Result<PageResult<{
      id: number;
      email: string;
      purpose: string;
      action: string;
      ipAddress: string;
      userAgent: string;
      success: boolean;
      errorMessage?: string;
      createdAt: string;
    }>>> => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.size) queryParams.append('size', params.size.toString());
      if (params?.email) queryParams.append('email', params.email);
      if (params?.purpose) queryParams.append('purpose', params.purpose);
      if (params?.action) queryParams.append('action', params.action);
      if (params?.success !== undefined) queryParams.append('success', params.success.toString());
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      
      const queryString = queryParams.toString();
      const endpoint = queryString 
        ? `/api/admin/verification-monitoring/logs?${queryString}` 
        : '/api/admin/verification-monitoring/logs';
      
      return apiClient.request<PageResult<{
        id: number;
        email: string;
        purpose: string;
        action: string;
        ipAddress: string;
        userAgent: string;
        success: boolean;
        errorMessage?: string;
        createdAt: string;
      }>>(endpoint);
    },

    /**
     * Export verification logs
     */
    exportLogs: async (params?: {
      email?: string;
      purpose?: string;
      action?: string;
      success?: number;
      startDate?: string;
      endDate?: string;
    }): Promise<Blob> => {
      const queryParams = new URLSearchParams();
      if (params?.email) queryParams.append('email', params.email);
      if (params?.purpose) queryParams.append('purpose', params.purpose);
      if (params?.action) queryParams.append('action', params.action);
      if (params?.success !== undefined) queryParams.append('success', params.success.toString());
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      
      const queryString = queryParams.toString();
      const endpoint = queryString 
        ? `/api/admin/verification-monitoring/logs/export?${queryString}` 
        : '/api/admin/verification-monitoring/logs/export';

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      return response.blob();
    },
  },

  /**
   * Subscription management
   */
  subscriptions: {
    /**
     * Get subscription statistics
     */
    stats: (): Promise<Result<SubscriptionStatsResponse>> => {
      return apiClient.request<SubscriptionStatsResponse>('/api/admin/subscriptions/stats');
    },

    /**
     * Get paginated list of user subscriptions
     */
    list: (params?: SubscriptionQueryRequest): Promise<Result<PageResult<UserSubscriptionResponse>>> => {
      const queryParams = new URLSearchParams();
      
      if (params) {
        if (params.keyword) queryParams.append('keyword', params.keyword);
        if (params.subscriptionStatus) queryParams.append('subscriptionStatus', params.subscriptionStatus);
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.size) queryParams.append('size', params.size.toString());
      }

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/api/admin/subscriptions?${queryString}` : '/api/admin/subscriptions';

      return apiClient.request<PageResult<UserSubscriptionResponse>>(endpoint);
    },

    /**
     * Get user subscription by user ID
     */
    get: (userId: number): Promise<Result<UserSubscriptionResponse>> => {
      return apiClient.request<UserSubscriptionResponse>(`/api/admin/subscriptions/${userId}`);
    },

    /**
     * Update user subscription preferences (admin)
     */
    update: (userId: number, data: SubscriptionPreferenceUpdateRequest): Promise<Result<void>> => {
      return apiClient.request<void>(`/api/admin/subscriptions/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    /**
     * Get unsubscribe analytics
     */
    analytics: (): Promise<Result<UnsubscribeAnalyticsResponse>> => {
      return apiClient.request<UnsubscribeAnalyticsResponse>('/api/admin/subscriptions/analytics');
    },

    /**
     * Export subscription data as CSV
     */
    export: async (params?: SubscriptionQueryRequest): Promise<Blob> => {
      const queryParams = new URLSearchParams();
      
      if (params) {
        if (params.keyword) queryParams.append('keyword', params.keyword);
        if (params.subscriptionStatus) queryParams.append('subscriptionStatus', params.subscriptionStatus);
      }

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/api/admin/subscriptions/export?${queryString}` : '/api/admin/subscriptions/export';

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      return response.blob();
    },
  },

  /**
   * Email provider management
   */
  emailProvider: {
    /**
     * Get current email provider
     */
    getCurrent: (): Promise<Result<EmailProviderInfo>> => {
      return apiClient.request<EmailProviderInfo>('/api/admin/email-provider/current');
    },

    /**
     * Switch email provider
     */
    switch: (provider: string): Promise<Result<string>> => {
      return apiClient.request<string>('/api/admin/email-provider/switch', {
        method: 'POST',
        body: JSON.stringify({ provider }),
      });
    },

    /**
     * Get all providers status
     */
    getStatus: (): Promise<Result<Record<string, ProviderStatus>>> => {
      return apiClient.request<Record<string, ProviderStatus>>('/api/admin/email-provider/status');
    },
  },
};

export { ApiError };
