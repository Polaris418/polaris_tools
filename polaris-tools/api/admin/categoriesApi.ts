import type { Result } from '../../types';
import type { CategoryResponse, CategoryQueryRequest, CategoryUpdateRequest } from '../../pages/admin/types';
import type { AdminRequester } from './shared';

export const createAdminCategoriesApi = (requester: AdminRequester) => ({
  list: (params?: CategoryQueryRequest): Promise<Result<CategoryResponse[]>> => {
    const queryParams = new URLSearchParams();

    if (params) {
      if (params.status !== undefined) queryParams.append('status', params.status.toString());
      if (params.includeDeleted) queryParams.append('includeDeleted', 'true');
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/api/v1/admin/categories?${queryString}` : '/api/v1/admin/categories';

    return requester.request<CategoryResponse[]>(endpoint);
  },

  get: (id: number): Promise<Result<CategoryResponse>> => {
    return requester.request<CategoryResponse>(`/api/v1/admin/categories/${id}`);
  },

  create: (data: CategoryUpdateRequest): Promise<Result<CategoryResponse>> => {
    return requester.request<CategoryResponse>('/api/v1/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: number, data: CategoryUpdateRequest): Promise<Result<CategoryResponse>> => {
    return requester.request<CategoryResponse>(`/api/v1/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: number): Promise<Result<void>> => {
    return requester.request<void>(`/api/v1/admin/categories/${id}`, {
      method: 'DELETE',
    });
  },

  restore: (id: number): Promise<Result<CategoryResponse>> => {
    return requester.request<CategoryResponse>(`/api/v1/admin/categories/${id}/restore`, {
      method: 'PUT',
    });
  },

  permanentDelete: (id: number): Promise<Result<void>> => {
    return requester.request<void>(`/api/v1/admin/categories/${id}?permanent=true`, {
      method: 'DELETE',
    });
  },

  reorder: (items: { id: number; sortOrder: number }[]): Promise<Result<void>> => {
    return requester.request<void>('/api/v1/admin/categories/reorder', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    });
  },
});
