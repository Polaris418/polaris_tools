import type { Result } from '../../types';
import type { AdminRequester } from './shared';

export const createAdminStatisticsApi = (requester: AdminRequester) => ({
  usageTrend: (days: number = 30): Promise<Result<{ date: string; count: number }[]>> => {
    return requester.request<{ date: string; count: number }[]>(`/api/v1/admin/statistics/usage-trend?days=${days}`);
  },

  userTrend: (days: number = 30): Promise<Result<{ date: string; count: number }[]>> => {
    return requester.request<{ date: string; count: number }[]>(`/api/v1/admin/statistics/user-trend?days=${days}`);
  },

  popularTools: (limit: number = 10): Promise<Result<{ toolId: number; toolName: string; count: number }[]>> => {
    return requester.request<{ toolId: number; toolName: string; count: number }[]>(
      `/api/v1/admin/statistics/popular-tools?limit=${limit}`
    );
  },
});
