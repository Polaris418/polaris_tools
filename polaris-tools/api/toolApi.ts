import type {
  Result,
  PageResult,
  ToolCreateRequest,
  ToolUpdateRequest,
  ToolQueryRequest,
  ToolResponse,
  CategoryCreateRequest,
  CategoryUpdateRequest,
  CategoryResponse,
  ToolUsageResponse,
} from '../types';
import type { HttpRequester } from './http';

export const createToolsApi = (client: HttpRequester) => ({
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

    return client.request<PageResult<ToolResponse>>(endpoint);
  },

  get: (id: number): Promise<Result<ToolResponse>> => {
    return client.request<ToolResponse>(`/api/v1/tools/${id}`);
  },

  create: (data: ToolCreateRequest): Promise<Result<ToolResponse>> => {
    return client.request<ToolResponse>('/api/v1/tools', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: number, data: ToolUpdateRequest): Promise<Result<ToolResponse>> => {
    return client.request<ToolResponse>(`/api/v1/tools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: number): Promise<Result<void>> => {
    return client.request<void>(`/api/v1/tools/${id}`, {
      method: 'DELETE',
    });
  },

  recordView: (id: number): Promise<Result<void>> => {
    return client.request<void>(`/api/v1/tools/${id}/view`, {
      method: 'POST',
    });
  },

  recordUse: (id: number): Promise<Result<void>> => {
    return client.request<void>(`/api/v1/tools/${id}/use`, {
      method: 'POST',
    });
  },

  recordUseByUrl: (url: string): Promise<Result<number | null>> => {
    return client.request<number | null>(`/api/v1/tools/use-by-url?url=${encodeURIComponent(url)}`, {
      method: 'POST',
    });
  },

  updateUsageDuration: (usageId: number, duration: number): Promise<Result<void>> => {
    return client.request<void>(`/api/v1/tools/usage/${usageId}/duration?duration=${duration}`, {
      method: 'PUT',
    });
  },
});

export const createCategoriesApi = (client: HttpRequester) => ({
  list: (): Promise<Result<CategoryResponse[]>> => {
    return client.request<CategoryResponse[]>('/api/v1/categories/all');
  },

  get: (id: number): Promise<Result<CategoryResponse>> => {
    return client.request<CategoryResponse>(`/api/v1/categories/${id}`);
  },

  create: (data: CategoryCreateRequest): Promise<Result<CategoryResponse>> => {
    return client.request<CategoryResponse>('/api/v1/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: number, data: CategoryUpdateRequest): Promise<Result<CategoryResponse>> => {
    return client.request<CategoryResponse>(`/api/v1/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: (id: number): Promise<Result<void>> => {
    return client.request<void>(`/api/v1/categories/${id}`, {
      method: 'DELETE',
    });
  },
});

export const createFavoritesApi = (client: HttpRequester) => ({
  list: (): Promise<Result<ToolResponse[]>> => {
    return client.request<ToolResponse[]>('/api/v1/favorites');
  },

  add: (toolId: number): Promise<Result<void>> => {
    return client.request<void>('/api/v1/favorites', {
      method: 'POST',
      body: JSON.stringify({ toolId }),
    });
  },

  remove: (toolId: number): Promise<Result<void>> => {
    return client.request<void>(`/api/v1/favorites/${toolId}`, {
      method: 'DELETE',
    });
  },

  check: (toolId: number): Promise<Result<boolean>> => {
    return client.request<boolean>(`/api/v1/favorites/check/${toolId}`);
  },
});

export const createUsageApi = (client: HttpRequester) => ({
  recent: (limit: number = 10): Promise<Result<ToolResponse[]>> => {
    return client.request<ToolResponse[]>(`/api/v1/usage/recent?limit=${limit}`);
  },

  popular: (limit: number = 10): Promise<Result<ToolResponse[]>> => {
    return client.request<ToolResponse[]>(`/api/v1/usage/popular?limit=${limit}`);
  },

  history: (page: number = 1, size: number = 20): Promise<Result<PageResult<ToolUsageResponse>>> => {
    return client.request<PageResult<ToolUsageResponse>>(`/api/v1/usage/history?page=${page}&size=${size}`);
  },
});
