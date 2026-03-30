import type {
  Result,
  PageResult,
  NotificationResponse,
  NotificationQueryRequest,
  NotificationCreateRequest,
  NotificationUpdateRequest,
} from '../types';
import type { HttpRequester } from './http';

export const createNotificationsApi = (client: HttpRequester) => ({
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

    return client.request<PageResult<NotificationResponse>>(endpoint);
  },

  getUnreadCount: (): Promise<Result<number>> => {
    return client.request<number>('/api/v1/notifications/unread-count');
  },

  markAsRead: (id: number): Promise<Result<void>> => {
    return client.request<void>(`/api/v1/notifications/${id}/read`, {
      method: 'PUT',
    });
  },

  markAllAsRead: (): Promise<Result<void>> => {
    return client.request<void>('/api/v1/notifications/read-all', {
      method: 'PUT',
    });
  },

  delete: (id: number): Promise<Result<void>> => {
    return client.request<void>(`/api/v1/notifications/${id}`, {
      method: 'DELETE',
    });
  },

  send: (data: NotificationCreateRequest): Promise<Result<number>> => {
    return client.request<number>('/api/v1/notifications/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: number, data: NotificationUpdateRequest): Promise<Result<number>> => {
    return client.request<number>(`/api/v1/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  restore: (id: number): Promise<Result<void>> => {
    return client.request<void>(`/api/v1/notifications/${id}/restore`, {
      method: 'POST',
    });
  },

  resend: (id: number): Promise<Result<number>> => {
    return client.request<number>(`/api/v1/notifications/${id}/resend`, {
      method: 'POST',
    });
  },

  listAll: (params?: NotificationQueryRequest): Promise<Result<PageResult<NotificationResponse>>> => {
    const queryParams = new URLSearchParams();

    if (params) {
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.size) queryParams.append('size', params.size.toString());
      if (params.type) queryParams.append('type', params.type);
      if (params.includeDeleted !== undefined) {
        queryParams.append('includeDeleted', params.includeDeleted.toString());
      }
    }

    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/api/v1/notifications/admin/all?${queryString}`
      : '/api/v1/notifications/admin/all';

    return client.request<PageResult<NotificationResponse>>(endpoint);
  },
});
