import type { Result, PageResult } from '../../types';
import type {
  SubscriptionStatsResponse,
  UserSubscriptionResponse,
  SubscriptionQueryRequest,
  UnsubscribeAnalyticsResponse,
  SubscriptionPreferenceUpdateRequest,
} from '../../pages/admin/types';
import type { AdminRequester } from './shared';
import { fetchBlobWithToken } from './shared';

export const createAdminSubscriptionsApi = (requester: AdminRequester) => ({
  stats: (): Promise<Result<SubscriptionStatsResponse>> => {
    return requester.request<SubscriptionStatsResponse>('/api/admin/subscriptions/stats');
  },

  list: (params?: SubscriptionQueryRequest): Promise<Result<PageResult<UserSubscriptionResponse>>> => {
    const queryParams = new URLSearchParams();

    if (params) {
      if (params.keyword) queryParams.append('keyword', params.keyword);
      if (params.subscriptionStatus) queryParams.append('subscriptionStatus', params.subscriptionStatus);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.size) queryParams.append('size', params.size.toString());
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/api/admin/subscriptions?${queryString}` : '/api/admin/subscriptions';

    return requester.request<PageResult<UserSubscriptionResponse>>(endpoint);
  },

  get: (userId: number): Promise<Result<UserSubscriptionResponse>> => {
    return requester.request<UserSubscriptionResponse>(`/api/admin/subscriptions/${userId}`);
  },

  update: (userId: number, data: SubscriptionPreferenceUpdateRequest): Promise<Result<void>> => {
    return requester.request<void>(`/api/admin/subscriptions/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  analytics: (): Promise<Result<UnsubscribeAnalyticsResponse>> => {
    return requester.request<UnsubscribeAnalyticsResponse>('/api/admin/subscriptions/analytics');
  },

  export: async (params?: SubscriptionQueryRequest): Promise<Blob> => {
    const queryParams = new URLSearchParams();

    if (params) {
      if (params.keyword) queryParams.append('keyword', params.keyword);
      if (params.subscriptionStatus) queryParams.append('subscriptionStatus', params.subscriptionStatus);
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/api/admin/subscriptions/export?${queryString}` : '/api/admin/subscriptions/export';

    return fetchBlobWithToken(endpoint);
  },
});
