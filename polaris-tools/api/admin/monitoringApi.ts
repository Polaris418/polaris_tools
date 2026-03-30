import type { Result } from '../../types';
import type { MonitoringDashboardResponse, EmailMetricsResponse } from '../../pages/admin/types';
import type { AdminRequester } from './shared';

export const createAdminMonitoringApi = (requester: AdminRequester) => ({
  dashboard: (): Promise<Result<MonitoringDashboardResponse>> => {
    return requester.request<MonitoringDashboardResponse>('/api/monitoring/dashboard');
  },

  current: (): Promise<Result<EmailMetricsResponse>> => {
    return requester.request<EmailMetricsResponse>('/api/monitoring/current');
  },

  range: (startTime: string, endTime: string): Promise<Result<EmailMetricsResponse[]>> => {
    return requester.request<EmailMetricsResponse[]>(
      `/api/monitoring/range?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`
    );
  },

  recent: (hours: number): Promise<Result<EmailMetricsResponse[]>> => {
    return requester.request<EmailMetricsResponse[]>(`/api/monitoring/recent/${hours}`);
  },

  metrics: (timeRange: { startTime: string; endTime: string }): Promise<Result<EmailMetricsResponse[]>> => {
    return requester.request<EmailMetricsResponse[]>(
      `/api/monitoring/range?startTime=${encodeURIComponent(timeRange.startTime)}&endTime=${encodeURIComponent(timeRange.endTime)}`
    );
  },

  alerts: (): Promise<Result<{
    configurations: Array<{
      id: number;
      name: string;
      type: string;
      threshold: number;
      enabled: boolean;
      notificationChannels: string[];
    }>;
    history: Array<{
      id: number;
      alertType: string;
      message: string;
      triggeredAt: string;
      resolved: boolean;
    }>;
  }>> => {
    return requester.request('/api/monitoring/alerts');
  },

  configureAlerts: (config: {
    successRateThreshold?: number;
    bounceRateThreshold?: number;
    complaintRateThreshold?: number;
    notificationChannels?: string[];
    enabled?: boolean;
  }): Promise<Result<void>> => {
    return requester.request<void>('/api/monitoring/alerts/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },

  flush: (): Promise<Result<void>> => {
    return requester.request<void>('/api/monitoring/flush', { method: 'POST' });
  },

  resume: (): Promise<Result<string>> => {
    return requester.request<string>('/api/monitoring/resume', { method: 'POST' });
  },

  pause: (): Promise<Result<string>> => {
    return requester.request<string>('/api/monitoring/pause', { method: 'POST' });
  },
});
