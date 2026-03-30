import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/Modal';
import { useAppContext } from '../../context/AppContext';
import { adminClient, ApiError } from '../../api/adminClient';
import type {
  AiProviderConfigRequest,
  AiProviderConfigResponse,
  AiProviderConnectionTestResponse,
  AiProviderHealthSnapshot,
  AiProviderMonitoringDashboardResponse,
  AiProviderRecentEvent,
  AiProviderTrendPoint,
} from './types';

type FormState = AiProviderConfigRequest;

const PROVIDER_DEFAULTS: Record<string, Omit<FormState, 'name' | 'apiKey' | 'enabled' | 'isPrimary' | 'priority'>> = {
  nvidia: {
    providerType: 'nvidia',
    baseUrl: '',
    model: 'openai/gpt-oss-20b',
    timeoutMs: 15000,
    temperature: 0.1,
    topP: 1,
    maxTokens: 1024,
  },
  'openai-compatible': {
    providerType: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-compatible',
    timeoutMs: 15000,
    temperature: 0.1,
    topP: 1,
    maxTokens: 1024,
  },
};

const DEFAULT_FORM: FormState = {
  name: '',
  apiKey: '',
  enabled: true,
  isPrimary: false,
  priority: 10,
  ...PROVIDER_DEFAULTS.nvidia,
};

const PROVIDER_OPTIONS = [
  { value: 'nvidia', label: 'NVIDIA' },
  { value: 'openai-compatible', label: 'OpenAI Compatible' },
];
const RANGE_OPTIONS = [
  { value: 1, labelZh: '最近 1 小时', labelEn: 'Last 1 Hour' },
  { value: 24, labelZh: '最近 24 小时', labelEn: 'Last 24 Hours' },
  { value: 24 * 7, labelZh: '最近 7 天', labelEn: 'Last 7 Days' },
];

export const AdminAiProviders: React.FC = () => {
  const { language, showToast } = useAppContext();
  const [providers, setProviders] = useState<AiProviderConfigResponse[]>([]);
  const [rangeHours, setRangeHours] = useState(24);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingMonitoring, setLoadingMonitoring] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [connectionResult, setConnectionResult] = useState<AiProviderConnectionTestResponse | null>(null);
  const [monitoring, setMonitoring] = useState<AiProviderMonitoringDashboardResponse | null>(null);
  const [monitoringError, setMonitoringError] = useState<string | null>(null);
  const [lastSuccessfulMonitoringAt, setLastSuccessfulMonitoringAt] = useState<string | null>(null);

  const title = language === 'zh' ? 'AI 提供商管理' : 'AI Provider Management';
  const subtitle =
    language === 'zh'
      ? '维护多家模型提供商配置，支持主用/备用、优先级、启停和在线连通性测试。'
      : 'Manage multiple model providers with primary/backup routing, priority, status, and live connection tests.';
  const failoverPolicyText =
    language === 'zh'
      ? '自动接管策略：仅当主用出现超时或返回无效/脏格式结果时，才会按优先级尝试备用提供商；鉴权失败、配置错误等不可恢复错误不会自动切换。'
      : 'Failover policy: backup providers are only attempted when the primary times out or returns an invalid/dirty formatting result. Non-recoverable errors such as auth or configuration failures do not trigger failover.';

  const loadProviders = async (options?: { silent?: boolean; background?: boolean }) => {
    try {
      if (!options?.background) {
        setLoadingProviders(true);
      }
      const providersResult = await adminClient.aiProvider.list();
      setProviders(providersResult.data);
    } catch (error) {
      if (!options?.silent) {
        const message =
          error instanceof ApiError ? error.getUserMessage() : language === 'zh' ? '加载 AI 提供商失败' : 'Failed to load AI providers';
        showToast(message, 'error');
      }
    } finally {
      setLoadingProviders(false);
    }
  };

  const loadMonitoringData = async (
    options?: { silent?: boolean; background?: boolean; providerId?: number | null; rangeHours?: number }
  ) => {
    const effectiveRangeHours = options?.rangeHours ?? rangeHours;
    const effectiveProviderId = options?.providerId ?? selectedProviderId;

    try {
      if (options?.background) {
        setRefreshing(true);
      } else {
        setLoadingMonitoring(true);
      }
      const monitoringResult = await adminClient.aiProvider.monitoring(effectiveRangeHours, effectiveProviderId);
      setMonitoring(monitoringResult.data);
      setMonitoringError(null);
      setLastSuccessfulMonitoringAt(monitoringResult.data.generatedAt);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.getUserMessage() : language === 'zh' ? '加载监控视图失败' : 'Failed to load monitoring dashboard';
      setMonitoringError(message);
      if (!options?.silent) {
        showToast(message, 'error');
      }
    } finally {
      setLoadingMonitoring(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    loadMonitoringData();
    const timer = window.setInterval(() => {
      loadMonitoringData({ silent: true, background: true });
    }, 30000);

    return () => window.clearInterval(timer);
  }, [rangeHours, selectedProviderId]);

  const sortedProviders = useMemo(
    () => [...providers].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.priority - b.priority || a.id - b.id),
    [providers]
  );
  const monitoringByProviderId = useMemo(
    () => new Map((monitoring?.providers ?? []).map((item) => [item.id, item])),
    [monitoring]
  );
  const monitoringSummary = monitoring?.summary;
  const monitoringLoaded = monitoring != null;
  const trendChartData = useMemo(
    () =>
      (monitoring?.trendPoints ?? []).map((point: AiProviderTrendPoint) => ({
        label: formatTrendLabel(point.metricHour, rangeHours, language),
        successCount: point.successCount,
        failureCount: point.failureCount,
        fallbackCount: point.fallbackCount,
        avgLatencyMs: point.avgLatencyMs == null ? null : Math.round(point.avgLatencyMs),
      })),
    [monitoring?.trendPoints, rangeHours, language]
  );
  const lastUpdatedText = monitoring?.generatedAt
    ? formatDateTime(monitoring.generatedAt, language)
    : language === 'zh'
      ? '暂未生成'
      : 'Not available';
  const monitoringStatusText = monitoringError
    ? language === 'zh'
      ? `监控拉取失败，上次成功刷新：${lastSuccessfulMonitoringAt ? formatDateTime(lastSuccessfulMonitoringAt, language) : '暂无'}`
      : `Monitoring failed to refresh. Last success: ${lastSuccessfulMonitoringAt ? formatDateTime(lastSuccessfulMonitoringAt, language) : 'N/A'}`
    : language === 'zh'
      ? `趋势按 ${monitoring?.trendBucketHours ?? 1} 小时聚合，历史保留 ${monitoring?.retentionDays ?? 30} 天`
      : `Trend grouped by ${monitoring?.trendBucketHours ?? 1} hour(s), retaining ${monitoring?.retentionDays ?? 30} day(s) of history`;

  const openCreateModal = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setConnectionResult(null);
    setShowModal(true);
  };

  const openEditModal = async (id: number) => {
    try {
      setSaving(true);
      const result = await adminClient.aiProvider.get(id);
      setEditingId(id);
      setForm({
        name: result.data.name,
        providerType: result.data.providerType,
        baseUrl: result.data.baseUrl || '',
        apiKey: result.data.apiKey || '',
        model: result.data.model,
        enabled: result.data.enabled,
        isPrimary: result.data.isPrimary,
        priority: result.data.priority,
        timeoutMs: result.data.timeoutMs,
        temperature: result.data.temperature,
        topP: result.data.topP,
        maxTokens: result.data.maxTokens,
      });
      setConnectionResult(null);
      setShowModal(true);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.getUserMessage() : language === 'zh' ? '加载配置详情失败' : 'Failed to load provider details';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setConnectionResult(null);
  };

  const handleProviderTypeChange = (providerType: string) => {
    const defaults = PROVIDER_DEFAULTS[providerType] ?? PROVIDER_DEFAULTS.nvidia;
    setForm((prev) => ({
      ...prev,
      ...defaults,
    }));
  };

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      if (editingId == null) {
        await adminClient.aiProvider.create(form);
        showToast(language === 'zh' ? 'AI 提供商已创建' : 'AI provider created', 'success');
      } else {
        await adminClient.aiProvider.update(editingId, form);
        showToast(language === 'zh' ? 'AI 提供商已更新' : 'AI provider updated', 'success');
      }
      closeModal();
      await Promise.all([loadProviders({ background: true }), loadMonitoringData({ background: true })]);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.getUserMessage() : language === 'zh' ? '保存 AI 提供商失败' : 'Failed to save AI provider';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (provider: AiProviderConfigResponse) => {
    try {
      await adminClient.aiProvider.updateStatus(provider.id, !provider.enabled);
      showToast(
        language === 'zh'
          ? `${provider.name} 已${provider.enabled ? '停用' : '启用'}`
          : `${provider.name} ${provider.enabled ? 'disabled' : 'enabled'}`,
        'success'
      );
      await Promise.all([loadProviders({ background: true }), loadMonitoringData({ background: true })]);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.getUserMessage() : language === 'zh' ? '更新状态失败' : 'Failed to update status';
      showToast(message, 'error');
    }
  };

  const handleSetPrimary = async (provider: AiProviderConfigResponse) => {
    try {
      await adminClient.aiProvider.setPrimary(provider.id);
      showToast(language === 'zh' ? `已将 ${provider.name} 设为主用` : `${provider.name} is now primary`, 'success');
      await Promise.all([loadProviders({ background: true }), loadMonitoringData({ background: true })]);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.getUserMessage() : language === 'zh' ? '设置主用失败' : 'Failed to set primary provider';
      showToast(message, 'error');
    }
  };

  const handleTestConnection = async (provider: AiProviderConfigResponse) => {
    try {
      setTestingId(provider.id);
      const result = await adminClient.aiProvider.testConnection(provider.id);
      setConnectionResult(result.data);
      await loadMonitoringData({ silent: true, background: true });
      showToast(
        result.data.success
          ? language === 'zh'
            ? '连通性测试成功'
            : 'Connection test succeeded'
          : language === 'zh'
            ? '连通性测试失败'
            : 'Connection test failed',
        result.data.success ? 'success' : 'error'
      );
    } catch (error) {
      const message =
        error instanceof ApiError ? error.getUserMessage() : language === 'zh' ? '测试连接失败' : 'Failed to test connection';
      showToast(message, 'error');
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <p className="text-slate-500 dark:text-text-secondary mt-1">{subtitle}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{failoverPolicyText}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            {language === 'zh' ? `运行态最近刷新：${lastUpdatedText}` : `Runtime last updated: ${lastUpdatedText}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={rangeHours}
            aria-label={language === 'zh' ? '时间范围' : 'Time Range'}
            onChange={(event) => setRangeHours(Number(event.target.value))}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-white"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {language === 'zh' ? option.labelZh : option.labelEn}
              </option>
            ))}
          </select>
          <select
            value={selectedProviderId == null ? 'all' : String(selectedProviderId)}
            aria-label={language === 'zh' ? '提供商筛选' : 'Provider Filter'}
            onChange={(event) => setSelectedProviderId(event.target.value === 'all' ? null : Number(event.target.value))}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-white"
          >
            <option value="all">{language === 'zh' ? '全部提供商' : 'All Providers'}</option>
            {sortedProviders.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => loadMonitoringData({ background: true, providerId: selectedProviderId, rangeHours })}
            aria-label={language === 'zh' ? '刷新监控' : 'Refresh Monitoring'}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg font-medium transition-colors"
          >
            <Icon name="refresh" className={`text-[20px] ${refreshing ? 'animate-spin' : ''}`} />
            <span>{language === 'zh' ? '刷新监控' : 'Refresh'}</span>
          </button>
          <button
            onClick={openCreateModal}
            aria-label={language === 'zh' ? '新增提供商' : 'Add Provider'}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            <Icon name="add" className="text-[20px]" />
            <span>{language === 'zh' ? '新增提供商' : 'Add Provider'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          label={language === 'zh' ? '总配置数' : 'Total Providers'}
          value={(monitoringSummary?.totalProviders ?? providers.length).toString()}
          icon="hub"
          accent="indigo"
          loading={loadingProviders}
          helperText={language === 'zh' ? `${monitoringSummary?.enabledProviders ?? providers.filter((item) => item.enabled).length} 个已启用` : `${monitoringSummary?.enabledProviders ?? providers.filter((item) => item.enabled).length} enabled`}
        />
        <SummaryCard
          label={language === 'zh' ? '累计解析请求' : 'Parsed Requests'}
          value={(monitoringSummary?.totalChatRequests ?? 0).toString()}
          icon="check_circle"
          accent="emerald"
          loading={!monitoringLoaded && loadingMonitoring}
          helperText={language === 'zh' ? `成功 ${monitoringSummary?.successCount ?? 0} / 失败 ${monitoringSummary?.failureCount ?? 0}` : `Success ${monitoringSummary?.successCount ?? 0} / Failure ${monitoringSummary?.failureCount ?? 0}`}
        />
        <SummaryCard
          label={language === 'zh' ? '自动降级次数' : 'Fallback Count'}
          value={(monitoringSummary?.fallbackCount ?? 0).toString()}
          icon="bolt"
          accent="amber"
          loading={!monitoringLoaded && loadingMonitoring}
          helperText={
            monitoringSummary?.lastFallbackAt
              ? language === 'zh'
                ? `最近一次：${formatDateTime(monitoringSummary.lastFallbackAt, language)}`
                : `Last fallback: ${formatDateTime(monitoringSummary.lastFallbackAt, language)}`
              : language === 'zh'
                ? '暂无降级记录'
                : 'No fallback yet'
          }
        />
        <SummaryCard
          label={language === 'zh' ? '健康 / 降级' : 'Healthy / Degraded'}
          value={`${monitoringSummary?.healthyProviders ?? 0} / ${monitoringSummary?.degradedProviders ?? 0}`}
          icon="monitoring"
          accent="blue"
          loading={!monitoringLoaded && loadingMonitoring}
          helperText={language === 'zh' ? `${monitoringSummary?.availableProviders ?? 0} 个配置可参与路由` : `${monitoringSummary?.availableProviders ?? 0} routable providers`}
        />
      </div>

      <MonitoringBanner
        language={language}
        loading={loadingMonitoring && !monitoringLoaded}
        errorMessage={monitoringError}
        statusText={monitoringStatusText}
        onRetry={() => loadMonitoringData({ background: true, providerId: selectedProviderId, rangeHours })}
      />

      {monitoring && monitoring.providers.length > 0 && (
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {language === 'zh' ? '运行态健康概览' : 'Runtime Health Overview'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-text-secondary mt-1">
                {language === 'zh'
                  ? '这里展示最近调用、连通性测试和自动降级形成的即时状态。'
                  : 'Live status derived from recent calls, connection tests, and fallback activity.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {monitoring.providers.map((provider) => (
              <ProviderHealthCard key={provider.id} provider={provider} language={language} />
            ))}
          </div>
        </div>
      )}

      {monitoring && monitoring.providers.length === 0 && (
        <EmptyStateNotice
          language={language}
          textZh="当前筛选范围内还没有可展示的运行态健康快照。"
          textEn="No runtime health snapshots are available for the current filter yet."
        />
      )}

      {monitoring && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {language === 'zh' ? '请求与降级趋势' : 'Request & Fallback Trend'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-text-secondary mt-1">
                {monitoringStatusText}
              </p>
            </div>
            {trendChartData.length === 0 ? (
              <EmptyTrend language={language} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="successCount" name={language === 'zh' ? '成功' : 'Success'} fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failureCount" name={language === 'zh' ? '失败' : 'Failure'} fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="fallbackCount" name={language === 'zh' ? '降级' : 'Fallback'} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {language === 'zh' ? '平均延迟趋势' : 'Average Latency Trend'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-text-secondary mt-1">
                {language === 'zh'
                  ? `仅统计成功调用的平均延迟，当前按 ${monitoring.trendBucketHours} 小时聚合。`
                  : `Average latency from successful calls, grouped into ${monitoring.trendBucketHours}-hour buckets.`}
              </p>
            </div>
            {trendChartData.length === 0 ? (
              <EmptyTrend language={language} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgLatencyMs"
                    name={language === 'zh' ? '平均延迟 (ms)' : 'Avg Latency (ms)'}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {monitoring && (
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {language === 'zh' ? '最近失败与降级事件' : 'Recent Failures & Fallbacks'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-text-secondary mt-1">
              {language === 'zh'
                ? '优先展示调用失败、自动切换和连通性测试结果，方便排查主备链路。'
                : 'Surfacing recent failures, automatic failovers, and connection tests for quick diagnosis.'}
            </p>
          </div>

          {monitoring.recentEvents.length === 0 ? (
            <EmptyStateNotice
              language={language}
              textZh="还没有运行态事件，先触发一次 AI 解析或连通性测试。"
              textEn="No runtime events yet. Trigger an AI parse or a connection test first."
            />
          ) : (
            <div className="space-y-3">
              {monitoring.recentEvents.slice(0, 12).map((event, index) => (
                <RecentEventRow key={`${event.providerName}-${event.occurredAt}-${index}`} event={event} language={language} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden">
        {loadingProviders ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-[#1e293b] border-b border-slate-200 dark:border-border-dark">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {language === 'zh' ? '名称' : 'Name'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {language === 'zh' ? '类型 / 模型' : 'Type / Model'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {language === 'zh' ? '路由' : 'Routing'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {language === 'zh' ? '状态' : 'Status'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {language === 'zh' ? '健康 / 延迟' : 'Health / Latency'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {language === 'zh' ? '接口地址' : 'Base URL'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {language === 'zh' ? '操作' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedProviders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <Icon name="settings_suggest" className="text-slate-300 dark:text-slate-600 text-[48px] mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-text-secondary">
                          {language === 'zh' ? '还没有 AI 提供商配置' : 'No AI providers configured yet'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    sortedProviders.map((provider) => (
                      <tr key={provider.id} className="hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <div className="size-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                              <Icon name="smart_toy" className="text-[22px]" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">{provider.name}</span>
                                {provider.isPrimary && (
                                  <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                                    {language === 'zh' ? '主用' : 'Primary'}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
                                API Key: {provider.apiKey ? provider.apiKey : language === 'zh' ? '列表隐藏，编辑时回显' : 'Hidden in list, visible in edit'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-slate-900 dark:text-white">{provider.providerType}</p>
                          <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">{provider.model}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-slate-900 dark:text-white">
                            {language === 'zh' ? `优先级 ${provider.priority}` : `Priority ${provider.priority}`}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
                            {language === 'zh' ? `${provider.timeoutMs}ms 超时` : `${provider.timeoutMs}ms timeout`}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2">
                            <StatusBadge
                              color={provider.enabled ? 'emerald' : 'slate'}
                              text={provider.enabled ? (language === 'zh' ? '已启用' : 'Enabled') : language === 'zh' ? '已停用' : 'Disabled'}
                            />
                            <StatusBadge
                              color={provider.available ? 'blue' : 'amber'}
                              text={provider.available ? (language === 'zh' ? '可用' : 'Available') : language === 'zh' ? '不可用' : 'Unavailable'}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <ProviderRuntimeInline provider={monitoringByProviderId.get(provider.id)} language={language} />
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-slate-600 dark:text-slate-300 break-all">
                            {provider.baseUrl || (language === 'zh' ? '使用默认地址' : 'Using default URL')}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => openEditModal(provider.id)}
                              aria-label={language === 'zh' ? '编辑' : 'Edit'}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                            >
                              <Icon name="edit" className="text-[16px]" />
                              <span>{language === 'zh' ? '编辑' : 'Edit'}</span>
                            </button>
                            <button
                              onClick={() => handleTestConnection(provider)}
                              disabled={testingId === provider.id}
                              aria-label={language === 'zh' ? '测试连接' : 'Test Connection'}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm disabled:opacity-50"
                            >
                              <Icon name="network_check" className="text-[16px]" />
                              <span>{testingId === provider.id ? (language === 'zh' ? '测试中...' : 'Testing...') : language === 'zh' ? '测试连接' : 'Test'}</span>
                            </button>
                            {!provider.isPrimary && (
                              <button
                                onClick={() => handleSetPrimary(provider)}
                                aria-label={language === 'zh' ? '设为主用' : 'Set Primary'}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
                              >
                                <Icon name="star" className="text-[16px]" />
                                <span>{language === 'zh' ? '设为主用' : 'Set Primary'}</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleStatus(provider)}
                              aria-label={provider.enabled ? (language === 'zh' ? '停用' : 'Disable') : language === 'zh' ? '启用' : 'Enable'}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white ${provider.enabled ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                            >
                              <Icon name={provider.enabled ? 'pause' : 'play_arrow'} className="text-[16px]" />
                              <span>{provider.enabled ? (language === 'zh' ? '停用' : 'Disable') : language === 'zh' ? '启用' : 'Enable'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingId == null ? (language === 'zh' ? '新增 AI 提供商' : 'Add AI Provider') : language === 'zh' ? '编辑 AI 提供商' : 'Edit AI Provider'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={language === 'zh' ? '配置名称' : 'Name'}>
              <input
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                aria-label={language === 'zh' ? '配置名称' : 'Name'}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                placeholder={language === 'zh' ? '例如：NVIDIA 主用' : 'e.g. NVIDIA Primary'}
                required
              />
            </FormField>
            <FormField label={language === 'zh' ? '提供商类型' : 'Provider Type'}>
              <select
                value={form.providerType}
                onChange={(event) => handleProviderTypeChange(event.target.value)}
                aria-label={language === 'zh' ? '提供商类型' : 'Provider Type'}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              >
                {PROVIDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Model">
              <input
                value={form.model}
                onChange={(event) => updateForm('model', event.target.value)}
                aria-label="Model"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                placeholder="openai/gpt-oss-20b"
                required
              />
            </FormField>
            <FormField label="API Key">
              <input
                value={form.apiKey || ''}
                onChange={(event) => updateForm('apiKey', event.target.value)}
                aria-label="API Key"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
                placeholder="sk-..."
              />
            </FormField>
          </div>

          <FormField
            label={language === 'zh' ? '接口地址' : 'Base URL'}
            helperText={
              form.providerType === 'nvidia'
                ? language === 'zh'
                  ? 'NVIDIA 可留空，后端会自动使用默认 chat/completions 地址。'
                  : 'NVIDIA can be left blank and will fall back to its default chat/completions URL.'
                : undefined
            }
          >
            <input
              value={form.baseUrl || ''}
              onChange={(event) => updateForm('baseUrl', event.target.value)}
              aria-label={language === 'zh' ? '接口地址' : 'Base URL'}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              placeholder="https://integrate.api.nvidia.com/v1/chat/completions"
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label={language === 'zh' ? '优先级' : 'Priority'}>
              <input
                type="number"
                value={form.priority}
                onChange={(event) => updateForm('priority', Number(event.target.value))}
                aria-label={language === 'zh' ? '优先级' : 'Priority'}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                min={0}
                max={9999}
              />
            </FormField>
            <FormField label={language === 'zh' ? '超时 (ms)' : 'Timeout (ms)'}>
              <input
                type="number"
                value={form.timeoutMs}
                onChange={(event) => updateForm('timeoutMs', Number(event.target.value))}
                aria-label={language === 'zh' ? '超时 (ms)' : 'Timeout (ms)'}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                min={1000}
                max={120000}
              />
            </FormField>
            <FormField label="Max Tokens">
              <input
                type="number"
                value={form.maxTokens}
                onChange={(event) => updateForm('maxTokens', Number(event.target.value))}
                aria-label="Max Tokens"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                min={1}
                max={32768}
              />
            </FormField>
            <FormField label="Temperature">
              <input
                type="number"
                value={form.temperature}
                onChange={(event) => updateForm('temperature', Number(event.target.value))}
                aria-label="Temperature"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                step="0.1"
              />
            </FormField>
            <FormField label="Top P">
              <input
                type="number"
                value={form.topP}
                onChange={(event) => updateForm('topP', Number(event.target.value))}
                aria-label="Top P"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                step="0.1"
              />
            </FormField>
            <div className="flex flex-col justify-end gap-2">
              <ToggleRow
                label={language === 'zh' ? '启用' : 'Enabled'}
                checked={form.enabled}
                onChange={(checked) => updateForm('enabled', checked)}
              />
              <ToggleRow
                label={language === 'zh' ? '设为主用' : 'Primary'}
                checked={form.isPrimary}
                onChange={(checked) => updateForm('isPrimary', checked)}
              />
            </div>
          </div>

          {connectionResult && (
            <div
              className={`rounded-lg border px-4 py-3 ${
                connectionResult.success
                  ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10'
                  : 'border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10'
              }`}
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {language === 'zh' ? '最近一次测试结果' : 'Latest test result'}
              </p>
              <p className="text-sm mt-1 text-slate-700 dark:text-slate-200">{connectionResult.message}</p>
              <p className="text-xs mt-1 text-slate-500 dark:text-text-secondary">
                {language === 'zh' ? '耗时' : 'Latency'}: {connectionResult.latencyMs} ms
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={closeModal}
              aria-label={language === 'zh' ? '取消' : 'Cancel'}
              className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white text-sm font-medium"
            >
              {language === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              aria-label={language === 'zh' ? '保存配置' : 'Save'}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium"
            >
              {saving ? (language === 'zh' ? '保存中...' : 'Saving...') : language === 'zh' ? '保存配置' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const SummaryCard: React.FC<{
  label: string;
  value: string;
  icon: string;
  accent: 'indigo' | 'emerald' | 'amber' | 'blue';
  loading?: boolean;
  helperText?: string;
}> = ({ label, value, icon, accent, helperText, loading = false }) => {
  const accentClass = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  }[accent];

  return (
    <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-text-secondary">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{loading ? '--' : value}</p>
          {helperText && <p className="text-xs text-slate-500 dark:text-text-secondary mt-2">{helperText}</p>}
        </div>
        <div className={`size-12 rounded-lg flex items-center justify-center ${accentClass}`}>
          <Icon name={icon} className="text-[24px]" />
        </div>
      </div>
    </div>
  );
};

const MonitoringBanner: React.FC<{
  language: string;
  loading: boolean;
  errorMessage: string | null;
  statusText: string;
  onRetry: () => void;
}> = ({ language, loading, errorMessage, statusText, onRetry }) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark px-5 py-4 text-sm text-slate-500 dark:text-text-secondary">
        {language === 'zh' ? '监控数据加载中…' : 'Loading monitoring data...'}
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {language === 'zh' ? '监控数据刷新失败' : 'Monitoring refresh failed'}
            </p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">{errorMessage}</p>
            <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">{statusText}</p>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            {language === 'zh' ? '重试监控' : 'Retry Monitoring'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark px-5 py-4 text-sm text-slate-500 dark:text-text-secondary">
      {statusText}
    </div>
  );
};

const ProviderHealthCard: React.FC<{ provider: AiProviderHealthSnapshot; language: string }> = ({ provider, language }) => {
  const statusMeta = getHealthStatusMeta(provider.healthStatus, language);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{provider.name}</h3>
            {provider.isPrimary && (
              <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                {language === 'zh' ? '主用' : 'Primary'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
            {provider.providerType} · {provider.model}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
          {statusMeta.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricTile
          label={language === 'zh' ? '成功率' : 'Success Rate'}
          value={provider.successRate == null ? '--' : `${provider.successRate.toFixed(1)}%`}
        />
        <MetricTile
          label={language === 'zh' ? '平均延迟' : 'Avg Latency'}
          value={provider.avgLatencyMs > 0 ? `${provider.avgLatencyMs} ms` : '--'}
        />
        <MetricTile
          label={language === 'zh' ? '调用成功/失败' : 'Calls S/F'}
          value={`${provider.successCount}/${provider.failureCount}`}
        />
        <MetricTile
          label={language === 'zh' ? '降级命中' : 'Fallback Hits'}
          value={provider.fallbackCount.toString()}
        />
      </div>

      <div className="space-y-2 text-xs text-slate-500 dark:text-text-secondary">
        <p>
          {language === 'zh' ? '最近成功' : 'Last success'}:
          <span className="ml-1 text-slate-700 dark:text-slate-200">{provider.lastSuccessAt ? formatDateTime(provider.lastSuccessAt, language) : '--'}</span>
        </p>
        <p>
          {language === 'zh' ? '最近失败' : 'Last failure'}:
          <span className="ml-1 text-slate-700 dark:text-slate-200">{provider.lastFailureAt ? formatDateTime(provider.lastFailureAt, language) : '--'}</span>
        </p>
        <p>
          {language === 'zh' ? '最近测试' : 'Last test'}:
          <span className="ml-1 text-slate-700 dark:text-slate-200">{provider.lastTestedAt ? formatDateTime(provider.lastTestedAt, language) : '--'}</span>
        </p>
        {provider.lastError && (
          <p className="rounded-lg bg-red-50 dark:bg-red-900/10 px-3 py-2 text-red-700 dark:text-red-300">
            {language === 'zh' ? '最近错误' : 'Last error'}: {provider.lastError}
          </p>
        )}
      </div>
    </div>
  );
};

const ProviderRuntimeInline: React.FC<{ provider?: AiProviderHealthSnapshot; language: string }> = ({ provider, language }) => {
  if (!provider) {
    return <p className="text-sm text-slate-400 dark:text-slate-500">{language === 'zh' ? '暂无运行数据' : 'No runtime data'}</p>;
  }

  const statusMeta = getHealthStatusMeta(provider.healthStatus, language);
  return (
    <div className="space-y-2">
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusMeta.className}`}>
        {statusMeta.label}
      </span>
      <p className="text-xs text-slate-500 dark:text-text-secondary">
        {language === 'zh' ? '成功率' : 'Success'}: {provider.successRate == null ? '--' : `${provider.successRate.toFixed(1)}%`}
      </p>
      <p className="text-xs text-slate-500 dark:text-text-secondary">
        {language === 'zh' ? '平均延迟' : 'Avg'}: {provider.avgLatencyMs > 0 ? `${provider.avgLatencyMs} ms` : '--'}
      </p>
    </div>
  );
};

const RecentEventRow: React.FC<{ event: AiProviderRecentEvent; language: string }> = ({ event, language }) => {
  const eventMeta = getEventMeta(event, language);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/30 px-4 py-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${eventMeta.className}`}>
            {eventMeta.label}
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">{event.providerName}</span>
          {event.relatedProviderName && (
            <span className="text-xs text-slate-500 dark:text-text-secondary">
              {language === 'zh' ? `← 来自 ${event.relatedProviderName}` : `← from ${event.relatedProviderName}`}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">{event.message}</p>
      </div>
      <div className="space-y-1 text-xs text-slate-500 dark:text-text-secondary md:text-right">
        <p>{formatDateTime(event.occurredAt, language)}</p>
        <p>{event.providerType}</p>
        {event.latencyMs != null && <p>{language === 'zh' ? `耗时 ${event.latencyMs} ms` : `${event.latencyMs} ms`}</p>}
      </div>
    </div>
  );
};

const MetricTile: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg bg-white dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 px-3 py-3">
    <p className="text-xs text-slate-500 dark:text-text-secondary">{label}</p>
    <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{value}</p>
  </div>
);

const EmptyTrend: React.FC<{ language: string }> = ({ language }) => (
  <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-6 py-16 text-center text-sm text-slate-500 dark:text-text-secondary">
    {language === 'zh' ? '当前时间范围内还没有足够的历史事件。' : 'No historical events in the selected time range yet.'}
  </div>
);

const EmptyStateNotice: React.FC<{ language: string; textZh: string; textEn: string }> = ({ language, textZh, textEn }) => (
  <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-6 py-10 text-center text-sm text-slate-500 dark:text-text-secondary">
    {language === 'zh' ? textZh : textEn}
  </div>
);

const StatusBadge: React.FC<{ text: string; color: 'emerald' | 'slate' | 'blue' | 'amber' }> = ({ text, color }) => {
  const className = {
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  }[color];

  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{text}</span>;
};

const FormField: React.FC<{ label: string; children: React.ReactNode; helperText?: string }> = ({ label, children, helperText }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
    {children}
    {helperText && <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">{helperText}</p>}
  </div>
);

const ToggleRow: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void }> = ({ label, checked, onChange }) => (
  <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
    <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  </label>
);

const getHealthStatusMeta = (status: AiProviderHealthSnapshot['healthStatus'], language: string) => {
  switch (status) {
    case 'healthy':
      return {
        label: language === 'zh' ? '健康' : 'Healthy',
        className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
      };
    case 'degraded':
      return {
        label: language === 'zh' ? '降级' : 'Degraded',
        className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
      };
    case 'misconfigured':
      return {
        label: language === 'zh' ? '配置异常' : 'Misconfigured',
        className: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
      };
    case 'disabled':
      return {
        label: language === 'zh' ? '已停用' : 'Disabled',
        className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      };
    default:
      return {
        label: language === 'zh' ? '待机' : 'Idle',
        className: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
      };
  }
};

const getEventMeta = (event: AiProviderRecentEvent, language: string) => {
  switch (event.eventType) {
    case 'chat_success':
      return {
        label: language === 'zh' ? '调用成功' : 'Call Success',
        className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
      };
    case 'chat_failure':
      return {
        label: language === 'zh' ? '调用失败' : 'Call Failed',
        className: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
      };
    case 'fallback':
      return {
        label: language === 'zh' ? '自动降级' : 'Fallback',
        className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
      };
    case 'test_success':
      return {
        label: language === 'zh' ? '测试成功' : 'Test Success',
        className: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
      };
    default:
      return {
        label: language === 'zh' ? '测试失败' : 'Test Failed',
        className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      };
  }
};

const formatDateTime = (value: string, language: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatTrendLabel = (value: string, rangeHours: number, language: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  if (rangeHours <= 24) {
    return date.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
  });
};

export default AdminAiProviders;
