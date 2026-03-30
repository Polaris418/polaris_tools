import type { Result, PageResult } from '../../types';
import type { EmailAuditLogResponse, EmailQueryRequest, EmailStatisticsResponse } from '../../pages/admin/types';
import type { AdminRequester } from './shared';

export const createAdminEmailsApi = (requester: AdminRequester) => ({
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

    return requester.request<PageResult<EmailAuditLogResponse>>(endpoint);
  },

  get: (id: number): Promise<Result<EmailAuditLogResponse>> => {
    return requester.request<EmailAuditLogResponse>(`/api/v1/admin/emails/logs/${id}`);
  },

  statistics: (): Promise<Result<EmailStatisticsResponse>> => {
    return requester.request<EmailStatisticsResponse>('/api/v1/admin/emails/statistics');
  },

  cleanup: (days: number = 90): Promise<Result<{ deletedCount: number; message: string }>> => {
    return requester.request<{ deletedCount: number; message: string }>(
      `/api/v1/admin/emails/logs/cleanup?days=${days}`,
      { method: 'DELETE' }
    );
  },

  retry: (id: number): Promise<Result<{ success: boolean; message: string }>> => {
    return requester.request<{ success: boolean; message: string }>(`/api/v1/admin/email/queue/retry/${id}`, {
      method: 'POST',
    });
  },

  batchDelete: (ids: number[]): Promise<Result<{ deletedCount: number; message: string }>> => {
    return requester.request<{ deletedCount: number; message: string }>('/api/v1/admin/emails/logs/batch-delete', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  },

  batchRetry: (ids: number[]): Promise<Result<{ retriedCount: number; message: string }>> => {
    return requester.request<{ retriedCount: number; message: string }>('/api/v1/admin/emails/logs/batch-retry', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },
});
