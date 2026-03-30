/**
 * AdminMonitoring - 管理后台监控页面
 * 
 * 显示邮件系统的监控统计数据
 * - 邮件发送监控
 * - 退信和投诉监控
 * - 队列监控
 * - 实时图表
 * - 告警配置
 */

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminClient';
import { Icon } from '../../components/Icon';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmailProviderSwitcher } from '../../components/email/EmailProviderSwitcher';
import { useAppContext } from '../../context/AppContext';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import type { 
  MonitoringDashboardResponse, 
  EmailQueueStatsResponse,
  AlertInfo 
} from './types';

export const AdminMonitoring: React.FC = () => {
  const { showToast, language } = useAppContext();
  
  const [dashboardData, setDashboardData] = useState<MonitoringDashboardResponse | null>(null);
  const [queueStats, setQueueStats] = useState<EmailQueueStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [timeRange, setTimeRange] = useState<number>(24); // hours
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [showResumeConfirm, setShowResumeConfirm] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    successRateThreshold: 95,
    bounceRateThreshold: 5,
    complaintRateThreshold: 0.1,
    notificationMethod: 'email' as 'email' | 'webhook',
    notificationEmail: '',
    webhookUrl: '',
  });

  // 加载监控数据
  const loadData = async () => {
    try {
      setLoading(true);
      
      // 加载仪表板数据
      const dashboardResult = await adminApi.monitoring.dashboard();
      if (dashboardResult.code === 200 && dashboardResult.data) {
        setDashboardData(dashboardResult.data);
        // console.log('[AdminMonitoring] Dashboard data loaded, emailSendingPaused:', dashboardResult.data.emailSendingPaused);
      }
      
      // 加载队列统计
      const queueResult = await adminApi.queue.stats();
      if (queueResult.code === 200 && queueResult.data) {
        setQueueStats(queueResult.data);
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('加载监控数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和自动刷新
  useEffect(() => {
    loadData();
    
    // 每分钟自动刷新
    const interval = setInterval(() => {
      loadData();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [timeRange]);

  // 手动刷新
  const handleRefresh = () => {
    loadData();
  };

  // 恢复邮件发送
  const handleResume = async () => {
    try {
      const result = await adminApi.monitoring.resume();
      if (result.code === 200) {
        showToast(
          language === 'zh' ? '邮件发送已恢复' : 'Email sending resumed',
          'success'
        );
        setShowResumeConfirm(false);
        await loadData(); // 等待数据加载完成
      }
    } catch (error: any) {
      console.error('恢复邮件发送失败:', error);
      showToast(
        error.message || (language === 'zh' ? '操作失败' : 'Operation failed'),
        'error'
      );
    }
  };

  // 暂停邮件发送
  const handlePause = async () => {
    try {
      const result = await adminApi.monitoring.pause();
      if (result.code === 200) {
        showToast(
          language === 'zh' ? '邮件发送已暂停' : 'Email sending paused',
          'success'
        );
        setShowPauseConfirm(false);
        await loadData(); // 等待数据加载完成
      }
    } catch (error: any) {
      console.error('暂停邮件发送失败:', error);
      showToast(
        error.message || (language === 'zh' ? '操作失败' : 'Operation failed'),
        'error'
      );
    }
  };

  // 保存告警配置
  const handleSaveAlertConfig = () => {
    // 这里应该调用后端API保存配置
    // 目前只是本地保存
    localStorage.setItem('alertConfig', JSON.stringify(alertConfig));
    alert('告警配置已保存');
    setShowAlertConfig(false);
  };

  // 加载告警配置
  useEffect(() => {
    const savedConfig = localStorage.getItem('alertConfig');
    if (savedConfig) {
      setAlertConfig(JSON.parse(savedConfig));
    }
  }, []);

  // 准备图表数据
  const chartData = React.useMemo(() => {
    if (!dashboardData) return [];
    
    // 合并历史数据和当前小时数据
    const metrics = [...dashboardData.recentMetrics];
    
    // 如果当前小时有数据，添加到列表末尾
    if (dashboardData.currentHourMetrics && 
        (dashboardData.currentHourMetrics.sentCount > 0 || 
         dashboardData.currentHourMetrics.failedCount > 0)) {
      metrics.push(dashboardData.currentHourMetrics);
    }
    
    return metrics.map(metric => ({
      time: new Date(metric.metricHour).toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      sent: metric.sentCount,
      failed: metric.failedCount,
      successRate: metric.successRate,
      bounceRate: metric.bounceRate,
      complaintRate: metric.complaintRate,
      avgDelay: metric.avgDelayMs / 1000, // 转换为秒
    }));
  }, [dashboardData]);

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">加载监控数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            邮件系统监控
          </h1>
          <p className="text-sm text-slate-500 dark:text-text-secondary mt-1">
            最后更新: {lastUpdate.toLocaleString('zh-CN')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Icon name="refresh" />
            刷新
          </button>
          <button
            onClick={() => setShowAlertConfig(true)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Icon name="settings" />
            告警配置
          </button>
          {dashboardData?.emailSendingPaused ? (
            <button
              onClick={() => setShowResumeConfirm(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Icon name="play_arrow" />
              恢复发送
            </button>
          ) : (
            <button
              onClick={() => setShowPauseConfirm(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <Icon name="pause" />
              暂停发送
            </button>
          )}
        </div>
      </div>

      {/* 邮件服务提供商切换器 - 显眼位置 */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Icon name="swap_horiz" className="text-indigo-600 dark:text-indigo-400" />
              邮件服务提供商
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              切换邮件发送服务商，无需重启系统
            </p>
          </div>
        </div>
        <EmailProviderSwitcher onSwitch={loadData} />
      </div>

      {/* 告警信息 */}
      {dashboardData && dashboardData.alerts.length > 0 && (
        <div className="space-y-2">
          {dashboardData.alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${
                alert.level === 'CRITICAL'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                  : 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'
              }`}
            >
              <div className="flex items-start gap-3">
                <Icon
                  name={alert.level === 'CRITICAL' ? 'error' : 'warning'}
                  className={alert.level === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {alert.message}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    当前值: {alert.currentValue.toFixed(2)}% | 阈值: {alert.threshold}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500 dark:text-text-secondary">发送成功率</span>
            <Icon name="check_circle" className="text-green-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {dashboardData?.avgSuccessRate.toFixed(2)}%
          </p>
          <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
            最近24小时平均
          </p>
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500 dark:text-text-secondary">退信率</span>
            <Icon name="error_outline" className="text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {dashboardData?.avgBounceRate.toFixed(2)}%
          </p>
          <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
            最近24小时平均
          </p>
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500 dark:text-text-secondary">投诉率</span>
            <Icon name="report" className="text-red-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {dashboardData?.avgComplaintRate.toFixed(2)}%
          </p>
          <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
            最近24小时平均
          </p>
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500 dark:text-text-secondary">平均延迟</span>
            <Icon name="schedule" className="text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {dashboardData?.currentHourMetrics 
              ? (dashboardData.currentHourMetrics.avgDelayMs / 1000).toFixed(2) 
              : '0.00'}s
          </p>
          <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
            当前小时
          </p>
        </div>
      </div>

      {/* 发送量趋势图 */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          邮件发送量趋势
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="sent" 
              stackId="1"
              stroke="#10b981" 
              fill="#10b981" 
              name="成功发送"
            />
            <Area 
              type="monotone" 
              dataKey="failed" 
              stackId="1"
              stroke="#ef4444" 
              fill="#ef4444" 
              name="发送失败"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 成功率趋势图 */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          成功率趋势
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="successRate" 
              stroke="#10b981" 
              strokeWidth={2}
              name="成功率 (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 退信率和投诉率趋势图 */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          退信率和投诉率趋势
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="bounceRate" 
              stroke="#f59e0b" 
              strokeWidth={2}
              name="退信率 (%)"
            />
            <Line 
              type="monotone" 
              dataKey="complaintRate" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="投诉率 (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 队列监控 */}
      {queueStats && (
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <Icon name="queue" className="text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              邮件队列监控
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">队列长度</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {queueStats.queueLength}
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">处理速度</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {queueStats.processingSpeed.toFixed(0)}
              </p>
              <p className="text-xs text-slate-500 dark:text-text-secondary">邮件/小时</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">失败率</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {queueStats.failureRate.toFixed(2)}%
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">Worker 线程</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {queueStats.workerThreads}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">队列状态:</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              queueStats.enabled 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {queueStats.enabled ? '运行中' : '已停止'}
            </span>
          </div>
        </div>
      )}

      {/* 统计汇总 */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          24小时统计汇总
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">成功发送</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {dashboardData?.totalSent || 0}
            </p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">发送失败</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {dashboardData?.totalFailed || 0}
            </p>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">邮件退信</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {dashboardData?.totalBounce || 0}
            </p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">用户投诉</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {dashboardData?.totalComplaint || 0}
            </p>
          </div>
        </div>
      </div>

      {/* 健康状态指示器 */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          系统健康状态
        </h2>
        <div className="space-y-3">
          {/* 成功率健康状态 */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              邮件发送成功率
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {dashboardData?.avgSuccessRate.toFixed(2)}%
              </span>
              <Icon 
                name={(dashboardData?.avgSuccessRate || 0) >= 95 ? 'check_circle' : 'warning'} 
                className={(dashboardData?.avgSuccessRate || 0) >= 95 ? 'text-green-600' : 'text-amber-600'}
              />
            </div>
          </div>

          {/* 退信率健康状态 */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              邮件退信率
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {dashboardData?.avgBounceRate.toFixed(2)}%
              </span>
              <Icon 
                name={(dashboardData?.avgBounceRate || 0) <= 5 ? 'check_circle' : 'warning'} 
                className={(dashboardData?.avgBounceRate || 0) <= 5 ? 'text-green-600' : 'text-amber-600'}
              />
            </div>
          </div>

          {/* 投诉率健康状态 */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              邮件投诉率
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {dashboardData?.avgComplaintRate.toFixed(2)}%
              </span>
              <Icon 
                name={(dashboardData?.avgComplaintRate || 0) <= 0.1 ? 'check_circle' : 'error'} 
                className={(dashboardData?.avgComplaintRate || 0) <= 0.1 ? 'text-green-600' : 'text-red-600'}
              />
            </div>
          </div>

          {/* 队列健康状态 */}
          {queueStats && (
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                邮件队列状态
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {queueStats.queueLength} 待发送
                </span>
                <Icon 
                  name={queueStats.queueLength < 100 ? 'check_circle' : 'warning'} 
                  className={queueStats.queueLength < 100 ? 'text-green-600' : 'text-amber-600'}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 告警配置模态框 */}
      {showAlertConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-border-dark">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  告警配置
                </h2>
                <button
                  onClick={() => setShowAlertConfig(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <Icon name="close" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 告警阈值配置 */}
              <div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                  告警阈值
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      成功率阈值 (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={alertConfig.successRateThreshold}
                      onChange={(e) => setAlertConfig({
                        ...alertConfig,
                        successRateThreshold: parseFloat(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      当成功率低于此值时触发告警
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      退信率阈值 (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={alertConfig.bounceRateThreshold}
                      onChange={(e) => setAlertConfig({
                        ...alertConfig,
                        bounceRateThreshold: parseFloat(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      当退信率超过此值时触发告警
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      投诉率阈值 (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={alertConfig.complaintRateThreshold}
                      onChange={(e) => setAlertConfig({
                        ...alertConfig,
                        complaintRateThreshold: parseFloat(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      当投诉率超过此值时触发告警并自动暂停发送
                    </p>
                  </div>
                </div>
              </div>

              {/* 通知方式配置 */}
              <div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                  通知方式
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      通知方式
                    </label>
                    <select
                      value={alertConfig.notificationMethod}
                      onChange={(e) => setAlertConfig({
                        ...alertConfig,
                        notificationMethod: e.target.value as 'email' | 'webhook'
                      })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="email">邮件通知</option>
                      <option value="webhook">Webhook</option>
                    </select>
                  </div>

                  {alertConfig.notificationMethod === 'email' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        通知邮箱
                      </label>
                      <input
                        type="email"
                        value={alertConfig.notificationEmail}
                        onChange={(e) => setAlertConfig({
                          ...alertConfig,
                          notificationEmail: e.target.value
                        })}
                        placeholder="admin@example.com"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  {alertConfig.notificationMethod === 'webhook' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Webhook URL
                      </label>
                      <input
                        type="url"
                        value={alertConfig.webhookUrl}
                        onChange={(e) => setAlertConfig({
                          ...alertConfig,
                          webhookUrl: e.target.value
                        })}
                        placeholder="https://example.com/webhook"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 告警历史 */}
              <div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
                  最近告警历史
                </h3>
                <div className="space-y-2">
                  {dashboardData && dashboardData.alerts.length > 0 ? (
                    dashboardData.alerts.map((alert, index) => (
                      <div
                        key={index}
                        className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {alert.message}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              当前值: {alert.currentValue.toFixed(2)}% | 阈值: {alert.threshold}%
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            alert.level === 'CRITICAL'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
                          }`}>
                            {alert.level === 'CRITICAL' ? '严重' : '警告'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                      暂无告警记录
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-border-dark flex justify-end gap-3">
              <button
                onClick={() => setShowAlertConfig(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveAlertConfig}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 暂停确认对话框 */}
      <ConfirmDialog
        isOpen={showPauseConfirm}
        title={language === 'zh' ? '暂停邮件发送' : 'Pause Email Sending'}
        message={language === 'zh' 
          ? '确定要暂停邮件发送吗？暂停后将停止处理队列中的邮件。' 
          : 'Are you sure you want to pause email sending? This will stop processing emails in the queue.'}
        confirmText={language === 'zh' ? '暂停' : 'Pause'}
        cancelText={language === 'zh' ? '取消' : 'Cancel'}
        onConfirm={handlePause}
        onCancel={() => setShowPauseConfirm(false)}
        type="danger"
      />

      {/* 恢复确认对话框 */}
      <ConfirmDialog
        isOpen={showResumeConfirm}
        title={language === 'zh' ? '恢复邮件发送' : 'Resume Email Sending'}
        message={language === 'zh' 
          ? '确定要恢复邮件发送吗？恢复后将继续处理队列中的邮件。' 
          : 'Are you sure you want to resume email sending? This will continue processing emails in the queue.'}
        confirmText={language === 'zh' ? '恢复' : 'Resume'}
        cancelText={language === 'zh' ? '取消' : 'Cancel'}
        onConfirm={handleResume}
        onCancel={() => setShowResumeConfirm(false)}
      />
    </div>
  );
};
