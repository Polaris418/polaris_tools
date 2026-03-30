import type { Result, PageResult } from '../../types';
import type {
  EmailQueueStatsResponse,
  EmailQueueItemResponse,
  EmailQueueQueryRequest,
  EmailQueueConfigResponse,
  EmailQueueConfigUpdateRequest,
} from '../../pages/admin/types';
import type { AdminRequester } from './shared';

export const createAdminQueueApi = (requester: AdminRequester) => ({
  stats: (): Promise<Result<EmailQueueStatsResponse>> => {
    return requester.request<EmailQueueStatsResponse>('/api/v1/admin/email/queue/stats');
  },

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

    return requester.request<PageResult<EmailQueueItemResponse>>(endpoint);
  },

  retry: (id: number): Promise<Result<{ success: boolean; message: string }>> => {
    return requester.request<{ success: boolean; message: string }>(`/api/v1/admin/email/queue/retry/${id}`, {
      method: 'POST',
    });
  },

  cancel: (id: number): Promise<Result<{ success: boolean; message: string }>> => {
    return requester.request<{ success: boolean; message: string }>(`/api/v1/admin/email/queue/cancel/${id}`, {
      method: 'POST',
    });
  },

  updatePriority: (id: number, priority: 'HIGH' | 'MEDIUM' | 'LOW'): Promise<Result<{ success: boolean; message: string }>> => {
    return requester.request<{ success: boolean; message: string }>(`/api/v1/admin/email/queue/${id}/priority`, {
      method: 'PUT',
      body: JSON.stringify({ priority }),
    });
  },

  pause: (): Promise<Result<{ success: boolean; message: string }>> => {
    return requester.request<{ success: boolean; message: string }>('/api/v1/admin/email/queue/pause', {
      method: 'POST',
    });
  },

  resume: (): Promise<Result<{ success: boolean; message: string }>> => {
    return requester.request<{ success: boolean; message: string }>('/api/v1/admin/email/queue/resume', {
      method: 'POST',
    });
  },

  getConfig: (): Promise<Result<EmailQueueConfigResponse>> => {
    return requester.request<EmailQueueConfigResponse>('/api/v1/admin/email/queue/config');
  },

  updateConfig: (config: EmailQueueConfigUpdateRequest): Promise<Result<EmailQueueConfigResponse>> => {
    return requester.request<EmailQueueConfigResponse>('/api/v1/admin/email/queue/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },
});
