import { apiClient } from './client';
import { createAdminDashboardApi } from './admin/dashboardApi';
import { createAdminUsersApi } from './admin/usersApi';
import { createAdminStatisticsApi } from './admin/statisticsApi';
import { createAdminToolsApi } from './admin/toolsApi';
import { createAdminCategoriesApi } from './admin/categoriesApi';
import { createAdminEmailsApi } from './admin/emailsApi';
import { createAdminMonitoringApi } from './admin/monitoringApi';
import { createAdminQueueApi } from './admin/queueApi';
import { createAdminTemplatesApi } from './admin/templatesApi';
import { createAdminSuppressionApi } from './admin/suppressionApi';
import { createAdminVerificationMonitoringApi } from './admin/verificationMonitoringApi';
import { createAdminSubscriptionsApi } from './admin/subscriptionsApi';
import { createAdminEmailProviderApi } from './admin/emailProviderApi';
import { createAdminAiProviderApi } from './admin/aiProviderApi';

const dashboardApi = createAdminDashboardApi(apiClient);

export const adminApi = {
  getStats: dashboardApi.getStats,
  users: createAdminUsersApi(apiClient),
  statistics: createAdminStatisticsApi(apiClient),
  tools: createAdminToolsApi(apiClient),
  categories: createAdminCategoriesApi(apiClient),
  emails: createAdminEmailsApi(apiClient),
  monitoring: createAdminMonitoringApi(apiClient),
  queue: createAdminQueueApi(apiClient),
  templates: createAdminTemplatesApi(apiClient),
  suppression: createAdminSuppressionApi(apiClient),
  verificationMonitoring: createAdminVerificationMonitoringApi(apiClient),
  subscriptions: createAdminSubscriptionsApi(apiClient),
  emailProvider: createAdminEmailProviderApi(apiClient),
  aiProvider: createAdminAiProviderApi(apiClient),
};

export const adminClient = adminApi;
