import type { Result } from '../../types';
import type {
  AiProviderConfigRequest,
  AiProviderConfigResponse,
  AiProviderConnectionTestResponse,
  AiProviderMonitoringDashboardResponse,
} from '../../pages/admin/types';
import type { AdminRequester } from './shared';

export const createAdminAiProviderApi = (requester: AdminRequester) => ({
  monitoring: (hours = 24, providerId?: number | null): Promise<Result<AiProviderMonitoringDashboardResponse>> => {
    const query = new URLSearchParams({ hours: String(hours) });
    if (providerId != null) {
      query.set('providerId', String(providerId));
    }
    return requester.request<AiProviderMonitoringDashboardResponse>(`/api/v1/admin/ai-providers/monitoring?${query.toString()}`);
  },

  list: (): Promise<Result<AiProviderConfigResponse[]>> => {
    return requester.request<AiProviderConfigResponse[]>('/api/v1/admin/ai-providers');
  },

  get: (id: number): Promise<Result<AiProviderConfigResponse>> => {
    return requester.request<AiProviderConfigResponse>(`/api/v1/admin/ai-providers/${id}`);
  },

  create: (data: AiProviderConfigRequest): Promise<Result<AiProviderConfigResponse>> => {
    return requester.request<AiProviderConfigResponse>('/api/v1/admin/ai-providers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: (id: number, data: AiProviderConfigRequest): Promise<Result<AiProviderConfigResponse>> => {
    return requester.request<AiProviderConfigResponse>(`/api/v1/admin/ai-providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  updateStatus: (id: number, enabled: boolean): Promise<Result<AiProviderConfigResponse>> => {
    return requester.request<AiProviderConfigResponse>(`/api/v1/admin/ai-providers/${id}/status?enabled=${enabled}`, {
      method: 'POST',
    });
  },

  setPrimary: (id: number): Promise<Result<AiProviderConfigResponse>> => {
    return requester.request<AiProviderConfigResponse>(`/api/v1/admin/ai-providers/${id}/set-primary`, {
      method: 'POST',
    });
  },

  testConnection: (id: number): Promise<Result<AiProviderConnectionTestResponse>> => {
    return requester.request<AiProviderConnectionTestResponse>(`/api/v1/admin/ai-providers/${id}/test-connection`, {
      method: 'POST',
    });
  },
});
