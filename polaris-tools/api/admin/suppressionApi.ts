import type { Result, PageResult } from '../../types';
import type { SuppressionResponse, SuppressionQueryRequest, AddSuppressionRequest } from '../../pages/admin/types';
import type { AdminRequester } from './shared';
import { fetchBlobWithToken } from './shared';

export const createAdminSuppressionApi = (requester: AdminRequester) => ({
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

    return requester.request<PageResult<SuppressionResponse>>(endpoint);
  },

  add: (data: AddSuppressionRequest): Promise<Result<SuppressionResponse>> => {
    return requester.request<SuppressionResponse>('/api/admin/suppression', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  remove: (email: string): Promise<Result<void>> => {
    return requester.request<void>(`/api/admin/suppression/${encodeURIComponent(email)}`, {
      method: 'DELETE',
    });
  },

  check: (email: string): Promise<Result<SuppressionResponse>> => {
    return requester.request<SuppressionResponse>(`/api/admin/suppression/check/${encodeURIComponent(email)}`);
  },

  export: async (params?: SuppressionQueryRequest): Promise<Blob> => {
    const queryParams = new URLSearchParams();

    if (params) {
      if (params.email) queryParams.append('email', params.email);
      if (params.reason) queryParams.append('reason', params.reason);
      if (params.source) queryParams.append('source', params.source);
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/api/admin/suppression/export?${queryString}` : '/api/admin/suppression/export';

    return fetchBlobWithToken(endpoint);
  },
});
