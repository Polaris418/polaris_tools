import type { Result, PageResult } from '../../types';
import type { ToolResponse, ToolQueryRequest, ToolUpdateRequest } from '../../pages/admin/types';
import type { AdminRequester } from './shared';

export const createAdminToolsApi = (requester: AdminRequester) => ({
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

    return requester.request<PageResult<ToolResponse>>(endpoint);
  },

  get: (id: number): Promise<Result<ToolResponse>> => {
    return requester.request<ToolResponse>(`/api/v1/admin/tools/${id}`);
  },

  create: (data: ToolUpdateRequest): Promise<Result<ToolResponse>> => {
    return requester.request<ToolResponse>('/api/v1/admin/tools', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: number, data: ToolUpdateRequest): Promise<Result<ToolResponse>> => {
    return requester.request<ToolResponse>(`/api/v1/admin/tools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: number): Promise<Result<void>> => {
    return requester.request<void>(`/api/v1/admin/tools/${id}`, {
      method: 'DELETE',
    });
  },

  restore: (id: number): Promise<Result<ToolResponse>> => {
    return requester.request<ToolResponse>(`/api/v1/admin/tools/${id}/restore`, {
      method: 'PUT',
    });
  },

  permanentDelete: (id: number): Promise<Result<void>> => {
    return requester.request<void>(`/api/v1/admin/tools/${id}?permanent=true`, {
      method: 'DELETE',
    });
  },
});
