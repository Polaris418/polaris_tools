import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import { adminClient } from '../api/adminClient';
import { AdminAiProviders } from '../pages/admin/AdminAiProviders';
import type {
  AiProviderConfigResponse,
  AiProviderConnectionTestResponse,
  AiProviderMonitoringDashboardResponse,
} from '../pages/admin/types';

const createProvider = (overrides: Partial<AiProviderConfigResponse> = {}): AiProviderConfigResponse => ({
  id: 1,
  name: 'NVIDIA 主用',
  providerType: 'nvidia',
  baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
  apiKey: null,
  model: 'openai/gpt-oss-20b',
  enabled: true,
  isPrimary: true,
  priority: 10,
  timeoutMs: 15000,
  temperature: 0.1,
  topP: 1,
  maxTokens: 1024,
  createdAt: '2026-03-15T00:00:00Z',
  updatedAt: '2026-03-15T00:00:00Z',
  available: true,
  ...overrides,
});

describe('管理员 AI 提供商页面', () => {
  let monitoringSpy: ReturnType<typeof vi.spyOn>;
  let listSpy: ReturnType<typeof vi.spyOn>;
  let getSpy: ReturnType<typeof vi.spyOn>;
  let createSpy: ReturnType<typeof vi.spyOn>;
  let updateSpy: ReturnType<typeof vi.spyOn>;
  let updateStatusSpy: ReturnType<typeof vi.spyOn>;
  let setPrimarySpy: ReturnType<typeof vi.spyOn>;
  let testConnectionSpy: ReturnType<typeof vi.spyOn>;

  const connectionResult: AiProviderConnectionTestResponse = {
    success: true,
    providerType: 'nvidia',
    providerName: 'NVIDIA 主用',
    latencyMs: 123,
    message: '连接成功',
  };
  const monitoringResult: AiProviderMonitoringDashboardResponse = {
    generatedAt: '2026-03-15T12:34:56Z',
    rangeHours: 24,
    trendBucketHours: 1,
    retentionDays: 30,
    selectedProviderId: null,
    summary: {
      totalProviders: 2,
      enabledProviders: 1,
      availableProviders: 1,
      healthyProviders: 1,
      degradedProviders: 1,
      totalChatRequests: 6,
      successCount: 4,
      failureCount: 2,
      fallbackCount: 1,
      lastFallbackAt: '2026-03-15T12:33:00Z',
    },
    providers: [
      {
        id: 1,
        name: 'NVIDIA 主用',
        providerType: 'nvidia',
        model: 'openai/gpt-oss-20b',
        enabled: true,
        isPrimary: true,
        available: true,
        priority: 10,
        healthStatus: 'degraded',
        successCount: 1,
        failureCount: 2,
        testSuccessCount: 1,
        testFailureCount: 0,
        fallbackCount: 0,
        avgLatencyMs: 380,
        lastLatencyMs: 460,
        successRate: 33.3,
        lastError: 'timeout',
        lastConnectionMessage: '连接成功',
        lastUsedAt: '2026-03-15T12:33:00Z',
        lastSuccessAt: '2026-03-15T12:20:00Z',
        lastFailureAt: '2026-03-15T12:33:00Z',
        lastTestedAt: '2026-03-15T12:10:00Z',
      },
      {
        id: 2,
        name: 'OpenAI 兼容备用',
        providerType: 'openai-compatible',
        model: 'gpt-compatible',
        enabled: false,
        isPrimary: false,
        available: false,
        priority: 20,
        healthStatus: 'healthy',
        successCount: 3,
        failureCount: 0,
        testSuccessCount: 1,
        testFailureCount: 0,
        fallbackCount: 1,
        avgLatencyMs: 220,
        lastLatencyMs: 210,
        successRate: 100,
        lastError: null,
        lastConnectionMessage: '连接成功',
        lastUsedAt: '2026-03-15T12:33:05Z',
        lastSuccessAt: '2026-03-15T12:33:05Z',
        lastFailureAt: null,
        lastTestedAt: '2026-03-15T12:12:00Z',
      },
    ],
    recentEvents: [
      {
        eventType: 'fallback',
        providerId: 2,
        providerName: 'OpenAI 兼容备用',
        providerType: 'openai-compatible',
        relatedProviderName: 'NVIDIA 主用',
        success: true,
        latencyMs: null,
        message: 'timeout',
        occurredAt: '2026-03-15T12:33:01Z',
      },
    ],
    trendPoints: [
      {
        metricHour: '2026-03-15T11:00:00Z',
        successCount: 2,
        failureCount: 1,
        fallbackCount: 1,
        avgLatencyMs: 220,
      },
    ],
  };

  beforeEach(() => {
    monitoringSpy = vi.spyOn(adminClient.aiProvider, 'monitoring');
    listSpy = vi.spyOn(adminClient.aiProvider, 'list');
    getSpy = vi.spyOn(adminClient.aiProvider, 'get');
    createSpy = vi.spyOn(adminClient.aiProvider, 'create');
    updateSpy = vi.spyOn(adminClient.aiProvider, 'update');
    updateStatusSpy = vi.spyOn(adminClient.aiProvider, 'updateStatus');
    setPrimarySpy = vi.spyOn(adminClient.aiProvider, 'setPrimary');
    testConnectionSpy = vi.spyOn(adminClient.aiProvider, 'testConnection');

    listSpy.mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: [
        createProvider(),
        createProvider({
          id: 2,
          name: 'OpenAI 兼容备用',
          providerType: 'openai-compatible',
          isPrimary: false,
          enabled: false,
          priority: 20,
          available: false,
          baseUrl: 'https://example.com/v1/chat/completions',
          model: 'gpt-compatible',
        }),
      ],
    });

    monitoringSpy.mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: monitoringResult,
    });

    getSpy.mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: createProvider({
        id: 2,
        name: 'OpenAI 兼容备用',
        providerType: 'openai-compatible',
        isPrimary: false,
        enabled: false,
        priority: 20,
        available: false,
        baseUrl: 'https://example.com/v1/chat/completions',
        apiKey: 'sk-visible-test-key',
        model: 'gpt-compatible',
      }),
    });

    createSpy.mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: createProvider({ id: 3, name: '新建提供商', isPrimary: false }),
    });

    updateSpy.mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: createProvider({ id: 2, name: 'OpenAI 兼容备用' }),
    });

    updateStatusSpy.mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: createProvider({ enabled: false }),
    });

    setPrimarySpy.mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: createProvider({ id: 2, name: 'OpenAI 兼容备用', isPrimary: true }),
    });

    testConnectionSpy.mockResolvedValue({
      code: 200,
      message: 'success',
      timestamp: Date.now(),
      data: connectionResult,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应加载并显示 AI 提供商列表', async () => {
    render(
      <AppProvider>
        <AdminAiProviders />
      </AppProvider>
    );

    expect(await screen.findByText('AI 提供商管理')).toBeInTheDocument();
    expect((await screen.findAllByText('NVIDIA 主用')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('OpenAI 兼容备用').length).toBeGreaterThan(0);
    expect(screen.getByText('累计解析请求')).toBeInTheDocument();
    expect(screen.getByText('自动降级次数')).toBeInTheDocument();
    expect(screen.getByText('最近失败与降级事件')).toBeInTheDocument();
    expect(screen.getByText('请求与降级趋势')).toBeInTheDocument();
    expect(screen.getAllByText('趋势按 1 小时聚合，历史保留 30 天').length).toBeGreaterThan(0);
    expect(screen.getByRole('combobox', { name: '时间范围' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '提供商筛选' })).toBeInTheDocument();
    expect(screen.getByText('timeout')).toBeInTheDocument();
    expect(listSpy).toHaveBeenCalledTimes(1);
    expect(monitoringSpy).toHaveBeenCalledWith(24, null);
  });

  it('监控接口失败时仍应显示提供商列表并提示可重试', async () => {
    monitoringSpy.mockRejectedValueOnce(new Error('monitoring unavailable'));

    render(
      <AppProvider>
        <AdminAiProviders />
      </AppProvider>
    );

    expect(await screen.findByText('AI 提供商管理')).toBeInTheDocument();
    expect((await screen.findAllByText('NVIDIA 主用')).length).toBeGreaterThan(0);
    expect(screen.getByText('监控数据刷新失败')).toBeInTheDocument();
    expect(screen.getAllByText('加载监控视图失败').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '重试监控' })).toBeInTheDocument();
  });

  it('应支持新增提供商', async () => {
    render(
      <AppProvider>
        <AdminAiProviders />
      </AppProvider>
    );

    await screen.findByText('最近失败与降级事件');
    fireEvent.click(screen.getByRole('button', { name: '新增提供商' }));
    await screen.findByRole('heading', { name: '新增 AI 提供商' });

    expect(screen.getByDisplayValue('openai/gpt-oss-20b')).toBeInTheDocument();
    expect(screen.getByDisplayValue('15000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0.1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1024')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('配置名称'), { target: { value: '新建提供商' } });
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'meta/llama-3.1-8b-instruct' } });
    fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'sk-new-provider' } });
    fireEvent.change(screen.getByLabelText('优先级'), { target: { value: '30' } });
    fireEvent.submit(screen.getByRole('button', { name: '保存配置' }).closest('form')!);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '新建提供商',
          model: 'meta/llama-3.1-8b-instruct',
          apiKey: 'sk-new-provider',
          priority: 30,
        })
      );
    });

    expect(listSpy).toHaveBeenCalledTimes(2);
    expect(monitoringSpy).toHaveBeenCalledTimes(2);
  });

  it('编辑时应回显明文 apiKey 并保存更新', async () => {
    render(
      <AppProvider>
        <AdminAiProviders />
      </AppProvider>
    );

    await screen.findByText('最近失败与降级事件');
    fireEvent.click(screen.getAllByRole('button', { name: '编辑' })[1]);
    await screen.findByRole('heading', { name: '编辑 AI 提供商' });

    expect(await screen.findByDisplayValue('sk-visible-test-key')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('gpt-compatible'), { target: { value: 'gpt-compatible-v2' } });
    fireEvent.submit(screen.getByRole('button', { name: '保存配置' }).closest('form')!);

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(2);
      expect(updateSpy).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          apiKey: 'sk-visible-test-key',
          model: 'gpt-compatible-v2',
        })
      );
    });
    expect(monitoringSpy).toHaveBeenCalledTimes(2);
  });

  it('应支持设置主用、切换状态和测试连接', async () => {
    render(
      <AppProvider>
        <AdminAiProviders />
      </AppProvider>
    );

    await screen.findByText('最近失败与降级事件');

    fireEvent.click(screen.getByRole('button', { name: '设为主用' }));
    await waitFor(() => {
      expect(setPrimarySpy).toHaveBeenCalledWith(2);
    });

    fireEvent.click(screen.getByRole('button', { name: '启用' }));
    await waitFor(() => {
      expect(updateStatusSpy).toHaveBeenCalledWith(2, true);
    });

    fireEvent.click(screen.getAllByRole('button', { name: '测试连接' })[0]);
    await waitFor(() => {
      expect(testConnectionSpy).toHaveBeenCalledWith(1);
    });
    expect(monitoringSpy).toHaveBeenCalledTimes(4);
  });
});
