import type { Result, PageResult } from '../../types';
import type {
  AdminUserResponse,
  AdminUserUpdateRequest,
  UserQueryRequest,
} from '../../pages/admin/types';
import type { AdminRequester } from './shared';

export const createAdminUsersApi = (requester: AdminRequester) => ({
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

    return requester.request<PageResult<AdminUserResponse>>(endpoint);
  },

  get: (id: number): Promise<Result<AdminUserResponse>> => {
    return requester.request<AdminUserResponse>(`/api/v1/admin/users/${id}`);
  },

  create: (data: {
    username: string;
    email: string;
    password: string;
    nickname?: string;
    planType?: number;
    status?: number;
  }): Promise<Result<AdminUserResponse>> => {
    return requester.request<AdminUserResponse>('/api/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: number, data: AdminUserUpdateRequest): Promise<Result<AdminUserResponse>> => {
    return requester.request<AdminUserResponse>(`/api/v1/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: number): Promise<Result<void>> => {
    return requester.request<void>(`/api/v1/admin/users/${id}`, {
      method: 'DELETE',
    });
  },

  restore: (id: number): Promise<Result<AdminUserResponse>> => {
    return requester.request<AdminUserResponse>(`/api/v1/admin/users/${id}/restore`, {
      method: 'PUT',
    });
  },

  permanentDelete: (id: number): Promise<Result<void>> => {
    return requester.request<void>(`/api/v1/admin/users/${id}?permanent=true`, {
      method: 'DELETE',
    });
  },

  toggleStatus: (id: number, status: number): Promise<Result<void>> => {
    return requester.request<void>(`/api/v1/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
});
