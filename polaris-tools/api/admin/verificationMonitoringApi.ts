import type { Result, PageResult } from '../../types';
import type { AdminRequester } from './shared';
import { fetchBlobWithToken } from './shared';

type DateRangeParams = {
  startDate?: string;
  endDate?: string;
};

const buildDateQuery = (params?: DateRangeParams): URLSearchParams => {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  return queryParams;
};

export const createAdminVerificationMonitoringApi = (requester: AdminRequester) => ({
  stats: (params?: DateRangeParams): Promise<Result<{
    totalSent: number;
    totalVerified: number;
    totalFailed: number;
    successRate: number;
    avgVerificationTime: number;
  }>> => {
    const queryString = buildDateQuery(params).toString();
    const endpoint = queryString
      ? `/api/admin/verification-monitoring/stats?${queryString}`
      : '/api/admin/verification-monitoring/stats';

    return requester.request(endpoint);
  },

  timeSeries: (params?: DateRangeParams & { intervalHours?: number }): Promise<Result<Array<{
    time: string;
    sent: number;
    verified: number;
    failed: number;
    successRate: number;
  }>>> => {
    const queryParams = buildDateQuery(params);
    if (params?.intervalHours) queryParams.append('intervalHours', params.intervalHours.toString());

    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/api/admin/verification-monitoring/time-series?${queryString}`
      : '/api/admin/verification-monitoring/time-series';

    return requester.request(endpoint);
  },

  purposeStats: (params?: DateRangeParams): Promise<Result<Array<{
    purpose: string;
    count: number;
    successRate: number;
  }>>> => {
    const queryString = buildDateQuery(params).toString();
    const endpoint = queryString
      ? `/api/admin/verification-monitoring/purpose-stats?${queryString}`
      : '/api/admin/verification-monitoring/purpose-stats';

    return requester.request(endpoint);
  },

  rateLimitStats: (params?: DateRangeParams): Promise<Result<{
    emailLimitTriggered: number;
    ipLimitTriggered: number;
    dailyLimitTriggered: number;
  }>> => {
    const queryString = buildDateQuery(params).toString();
    const endpoint = queryString
      ? `/api/admin/verification-monitoring/rate-limit-stats?${queryString}`
      : '/api/admin/verification-monitoring/rate-limit-stats';

    return requester.request(endpoint);
  },

  logs: (params?: {
    page?: number;
    size?: number;
    email?: string;
    purpose?: string;
    action?: string;
    success?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Result<PageResult<{
    id: number;
    email: string;
    purpose: string;
    action: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    errorMessage?: string;
    createdAt: string;
  }>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.size) queryParams.append('size', params.size.toString());
    if (params?.email) queryParams.append('email', params.email);
    if (params?.purpose) queryParams.append('purpose', params.purpose);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.success !== undefined) queryParams.append('success', params.success.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/api/admin/verification-monitoring/logs?${queryString}`
      : '/api/admin/verification-monitoring/logs';

    return requester.request(endpoint);
  },

  exportLogs: async (params?: {
    email?: string;
    purpose?: string;
    action?: string;
    success?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    if (params?.email) queryParams.append('email', params.email);
    if (params?.purpose) queryParams.append('purpose', params.purpose);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.success !== undefined) queryParams.append('success', params.success.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/api/admin/verification-monitoring/logs/export?${queryString}`
      : '/api/admin/verification-monitoring/logs/export';

    return fetchBlobWithToken(endpoint);
  },
});
