import type { Result } from '../../types';
import type { DashboardStats } from '../../pages/admin/types';
import type { AdminRequester } from './shared';

export const createAdminDashboardApi = (requester: AdminRequester) => ({
  getStats: (): Promise<Result<DashboardStats>> => {
    return requester.request<DashboardStats>('/api/v1/admin/stats');
  },
});
