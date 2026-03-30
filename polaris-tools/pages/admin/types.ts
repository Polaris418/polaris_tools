/**
 * Admin Panel Type Definitions
 * 管理员面板类型定义
 */
import type React from 'react';

/**
 * Admin page types
 */
export type AdminPage = 'dashboard' | 'users' | 'tools' | 'categories' | 'emails' | 'templates' | 'queue' | 'suppression' | 'subscriptions' | 'statistics' | 'notifications' | 'monitoring' | 'verification-monitoring' | 'ai-providers';

/**
 * User query parameters
 */
export interface UserQueryRequest {
  keyword?: string;
  status?: number;
  planType?: number;
  page?: number;
  size?: number;
  includeDeleted?: boolean;
}

/**
 * Admin user response (with more details)
 */
export interface AdminUserResponse {
  id: number;
  username: string;
  email: string;
  nickname?: string;
  avatar?: string;
  planType: number;
  planExpiredAt?: string;
  status: number;
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
  updatedAt: string;
  deleted?: number;
}

/**
 * User update request (admin)
 */
export interface AdminUserUpdateRequest {
  nickname?: string;
  email?: string;
  planType?: number;
  planExpiredAt?: string;
  status?: number;
}

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalTools: number;
  totalCategories: number;
  totalUsage: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  usageToday: number;
}

/**
 * Chart data point
 */
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

/**
 * Table column definition
 */
export interface TableColumn<T> {
  key: keyof T | string;
  title: string;
  width?: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

/**
 * Pagination info
 */
export interface PaginationInfo {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

/**
 * Modal state
 */
export interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view' | 'delete';
  data?: any;
}

/**
 * Tool response (from backend)
 */
export interface ToolResponse {
  id: number;
  categoryId: number;
  categoryName?: string;
  name: string;
  nameZh?: string;
  description?: string;
  descriptionZh?: string;
  icon: string;
  url?: string;
  toolType: number;
  isFeatured: number;
  viewCount?: number;
  useCount?: number;
  ratingScore?: number;
  ratingCount?: number;
  sortOrder: number;
  status: number;
  createdAt: string;
  updatedAt: string;
  deleted?: number;
}

/**
 * Tool query request
 */
export interface ToolQueryRequest {
  keyword?: string;
  categoryId?: number;
  status?: number;
  isFeatured?: number;
  page?: number;
  size?: number;
  includeDeleted?: boolean;
}

/**
 * Tool update request
 */
export interface ToolUpdateRequest {
  name?: string;
  nameZh?: string;
  description?: string;
  descriptionZh?: string;
  categoryId?: number;
  icon?: string;
  url?: string;
  toolType?: number;
  isFeatured?: number;
  sortOrder?: number;
  status?: number;
}

/**
 * Category response
 */
export interface CategoryResponse {
  id: number;
  name: string;
  nameZh?: string;
  icon: string;
  accentColor: string;
  description?: string;
  sortOrder: number;
  status: number;
  toolCount?: number;
  createdAt: string;
  updatedAt: string;
  deleted?: number;
}

/**
 * Category query request
 */
export interface CategoryQueryRequest {
  status?: number;
  page?: number;
  size?: number;
  includeDeleted?: boolean;
}

/**
 * Category update request
 */
export interface CategoryUpdateRequest {
  name?: string;
  nameZh?: string;
  icon?: string;
  accentColor?: string;
  description?: string;
  sortOrder?: number;
  status?: number;
}

/**
 * Email audit log response
 */
export interface EmailAuditLogResponse {
  id: number;
  recipient: string;
  subject?: string;
  emailType: string;
  emailTypeDescriptionZh?: string;
  emailTypeDescriptionEn?: string;
  status: string;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  sentAt?: string;
}

/**
 * Email query request
 */
export interface EmailQueryRequest {
  page?: number;
  pageSize?: number;
  recipient?: string;
  emailType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Email statistics response
 */
export interface EmailStatisticsResponse {
  totalSent: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  successRate: number;
  emailTypeStats: Record<string, number>;
  todaySent: number;
  weekSent: number;
  monthSent: number;
}

/**
 * Email metrics response
 */
export interface EmailMetricsResponse {
  id?: number;
  metricHour: string;
  sentCount: number;
  failedCount: number;
  bounceCount: number;
  complaintCount: number;
  successRate: number;
  bounceRate: number;
  complaintRate: number;
  avgDelayMs: number;
  createdAt?: string;
}

/**
 * Monitoring dashboard response
 */
export interface MonitoringDashboardResponse {
  currentHourMetrics: EmailMetricsResponse;
  recentMetrics: EmailMetricsResponse[];
  totalSent: number;
  totalFailed: number;
  totalBounce: number;
  totalComplaint: number;
  avgSuccessRate: number;
  avgBounceRate: number;
  avgComplaintRate: number;
  emailSendingPaused: boolean;
  alerts: AlertInfo[];
}

/**
 * Alert info
 */
export interface AlertInfo {
  type: string;
  level: string;
  message: string;
  currentValue: number;
  threshold: number;
}

/**
 * Email queue stats response
 */
export interface EmailQueueStatsResponse {
  queueLength: number;
  processingSpeed: number;
  failureRate: number;
  workerThreads: number;
  batchSize: number;
  enabled: boolean;
}

/**
 * Email template response
 */
export interface EmailTemplateResponse {
  id: number;
  code: string;
  name: string;
  language: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables?: string[]; // Optional since backend might not always include it
  version: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Email template query request
 */
export interface EmailTemplateQueryRequest {
  language?: string;
  code?: string;
  enabled?: boolean;
  page?: number;
  size?: number;
}

/**
 * Email template update request
 */
export interface EmailTemplateUpdateRequest {
  name?: string;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  enabled?: boolean;
}

/**
 * Email template preview request
 */
export interface EmailTemplatePreviewRequest {
  code: string;
  language: string;
  variables: Record<string, string>;
}

/**
 * Email template preview response
 */
export interface EmailTemplatePreviewResponse {
  subject: string;
  htmlContent: string;
  textContent: string;
}

/**
 * Email queue item response
 */
export interface EmailQueueItemResponse {
  id: number;
  recipient: string;
  subject: string;
  emailType: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
  retryCount: number;
  maxRetries?: number; // Optional, will use default if not provided
  scheduledAt: string;
  sentAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Email queue query request
 */
export interface EmailQueueQueryRequest {
  status?: string;
  priority?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Email queue config response
 */
export interface EmailQueueConfigResponse {
  workerThreads: number;
  batchSize: number;
  maxRetries: number;
  retryDelaySeconds: number;
  enabled: boolean;
}

/**
 * Email queue config update request
 */
export interface EmailQueueConfigUpdateRequest {
  workerThreads?: number;
  batchSize?: number;
  maxRetries?: number;
  retryDelaySeconds?: number;
}

/**
 * Suppression entry response
 */
export interface SuppressionResponse {
  id: number;
  email: string;
  reason: 'HARD_BOUNCE' | 'SOFT_BOUNCE' | 'COMPLAINT';
  source: string;
  softBounceCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Suppression query request
 */
export interface SuppressionQueryRequest {
  email?: string;
  reason?: string;
  source?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Add suppression request
 */
export interface AddSuppressionRequest {
  email: string;
  reason: 'HARD_BOUNCE' | 'SOFT_BOUNCE' | 'COMPLAINT';
  notes?: string;
}

/**
 * Subscription statistics response
 */
export interface SubscriptionStatsResponse {
  totalSubscribers: number;
  systemNotificationsRate: number;
  marketingEmailsRate: number;
  productUpdatesRate: number;
  weeklyTrend: { date: string; count: number }[];
}

/**
 * User subscription response
 */
export interface UserSubscriptionResponse {
  userId: number;
  username: string;
  email: string;
  systemNotifications: boolean;
  marketingEmails: boolean;
  productUpdates: boolean;
  updatedAt: string;
  history?: SubscriptionHistoryRecord[];
}

/**
 * Subscription history record
 */
export interface SubscriptionHistoryRecord {
  action: string;
  timestamp: string;
  changes?: Record<string, boolean>;
}

/**
 * Subscription query request
 */
export interface SubscriptionQueryRequest {
  keyword?: string;
  subscriptionStatus?: string;
  page?: number;
  size?: number;
}

/**
 * Unsubscribe analytics response
 */
export interface UnsubscribeAnalyticsResponse {
  totalUnsubscribes: number;
  weekUnsubscribes: number;
  monthUnsubscribes: number;
  unsubscribeRate: number;
  reasonStats: Record<string, number>;
  trendData: { date: string; count: number }[];
}

/**
 * Subscription preference update request
 */
export interface SubscriptionPreferenceUpdateRequest {
  preferences: Record<string, boolean>;
}


/**
 * Email provider info
 */
export interface EmailProviderInfo {
  current: string;
  providersStatus: Record<string, boolean>;
}

/**
 * Provider status
 */
export interface ProviderStatus {
  name: string;
  displayName: string;
  available: boolean;
  current: boolean;
}

export interface AiProviderConfigResponse {
  id: number;
  name: string;
  providerType: string;
  baseUrl?: string | null;
  apiKey?: string | null;
  model: string;
  enabled: boolean;
  isPrimary: boolean;
  priority: number;
  timeoutMs: number;
  temperature: number;
  topP: number;
  maxTokens: number;
  createdAt?: string;
  updatedAt?: string;
  available?: boolean;
}

export interface AiProviderConfigRequest {
  name: string;
  providerType: string;
  baseUrl?: string;
  apiKey?: string;
  model: string;
  enabled: boolean;
  isPrimary: boolean;
  priority: number;
  timeoutMs: number;
  temperature: number;
  topP: number;
  maxTokens: number;
}

export interface AiProviderConnectionTestResponse {
  success: boolean;
  providerType: string;
  providerName: string;
  latencyMs: number;
  message: string;
}

export interface AiProviderMonitoringSummary {
  totalProviders: number;
  enabledProviders: number;
  availableProviders: number;
  healthyProviders: number;
  degradedProviders: number;
  totalChatRequests: number;
  successCount: number;
  failureCount: number;
  fallbackCount: number;
  lastFallbackAt?: string | null;
}

export interface AiProviderHealthSnapshot {
  id: number;
  name: string;
  providerType: string;
  model: string;
  enabled: boolean;
  isPrimary: boolean;
  available: boolean;
  priority: number;
  healthStatus: 'healthy' | 'degraded' | 'idle' | 'disabled' | 'misconfigured';
  successCount: number;
  failureCount: number;
  testSuccessCount: number;
  testFailureCount: number;
  fallbackCount: number;
  avgLatencyMs: number;
  lastLatencyMs?: number | null;
  successRate?: number | null;
  lastError?: string | null;
  lastConnectionMessage?: string | null;
  lastUsedAt?: string | null;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  lastTestedAt?: string | null;
  lastFallbackAt?: string | null;
}

export interface AiProviderRecentEvent {
  eventType: 'chat_success' | 'chat_failure' | 'fallback' | 'test_success' | 'test_failure';
  providerId?: number | null;
  providerName: string;
  providerType: string;
  relatedProviderName?: string | null;
  success: boolean;
  latencyMs?: number | null;
  message: string;
  occurredAt: string;
}

export interface AiProviderMonitoringDashboardResponse {
  generatedAt: string;
  rangeHours: number;
  trendBucketHours: number;
  retentionDays: number;
  selectedProviderId?: number | null;
  summary: AiProviderMonitoringSummary;
  providers: AiProviderHealthSnapshot[];
  recentEvents: AiProviderRecentEvent[];
  trendPoints: AiProviderTrendPoint[];
}

export interface AiProviderTrendPoint {
  metricHour: string;
  successCount: number;
  failureCount: number;
  fallbackCount: number;
  avgLatencyMs?: number | null;
}
