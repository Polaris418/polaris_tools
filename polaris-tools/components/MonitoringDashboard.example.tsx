/**
 * AdminMonitoring - 管理后台监控页面
 * 
 * 显示认证系统的监控统计数据
 * - Token 刷新监控
 * - 会话超时监控
 * - 游客转化监控
 */

import React, { useState, useEffect } from 'react';
import { monitoringService } from '../../utils/monitoringService';
import { Icon } from '../Icon';

export const MonitoringDashboard: React.FC = () => {
  const [stats, setStats] = useState(monitoringService.getAllStats());
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // 每分钟自动更新统计数据
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(monitoringService.getAllStats());
      setLastUpdate(new Date());
    }, 60000); // 60秒

    return () => clearInterval(interval);
  }, []);

  // 手动刷新
  const handleRefresh = () => {
    setStats(monitoringService.getAllStats());
    setLastUpdate(new Date());
  };

  // 导出报告
  const handleExport = () => {
    const report = monitoringService.exportReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 清除旧数据
  const handleClearOld = () => {
    if (confirm('确定要清除 7 天前的监控数据吗？')) {
      monitoringService.clearOldEvents(7);
      setStats(monitoringService.getAllStats());
    }
  };

  // 计算成功率
  const tokenSuccessRate = stats.tokenRefresh.totalAttempts > 0
    ? (stats.tokenRefresh.successCount / stats.tokenRefresh.totalAttempts * 100).toFixed(2)
    : '0.00';

  // 计算用户参与率
  const userEngagementRate = stats.sessionTimeout.warningShownCount > 0
    ? (stats.sessionTimeout.continueCount / stats.sessionTimeout.warningShownCount * 100).toFixed(2)
    : '0.00';

  // 计算平均刷新间隔（分钟）
  const avgRefreshInterval = (stats.tokenRefresh.averageRefreshInterval / 60000).toFixed(2);

  // 计算平均响应时间（秒）
  const avgResponseTime = (stats.sessionTimeout.averageResponseTime / 1000).toFixed(2);

  return (
    <div className="p-6 space-y-6">
      {/* 标题和操作按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            认证系统监控
          </h1>
          <p className="text-sm text-slate-500 dark:text-text-secondary mt-1">
            最后更新: {lastUpdate.toLocaleString('zh-CN')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <Icon name="refresh" />
            刷新
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg flex items-center gap-2"
          >
            <Icon name="download" />
            导出报告
          </button>
          <button
            onClick={handleClearOld}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg flex items-center gap-2"
          >
            <Icon name="delete" />
            清理旧数据
          </button>
        </div>
      </div>

      {/* Token 刷新监控 */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
            <Icon name="sync" className="text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Token 刷新监控
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">总尝试次数</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.tokenRefresh.totalAttempts}
            </p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">成功次数</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.tokenRefresh.successCount}
            </p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">失败次数</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.tokenRefresh.failureCount}
            </p>
          </div>
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">成功率</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {tokenSuccessRate}%
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">平均刷新间隔</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              {avgRefreshInterval} 分钟
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">最后刷新时间</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              {stats.tokenRefresh.lastRefreshTime 
                ? new Date(stats.tokenRefresh.lastRefreshTime).toLocaleString('zh-CN')
                : '暂无数据'
              }
            </p>
          </div>
        </div>

        {/* 失败原因统计 */}
        {Object.keys(stats.tokenRefresh.failureReasons).length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">失败原因统计：</p>
            <div className="space-y-2">
              {Object.entries(stats.tokenRefresh.failureReasons).map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/10 rounded">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{reason}</span>
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">{count} 次</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 会话超时监控 */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
            <Icon name="schedule" className="text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            会话超时监控
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">警告显示次数</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.sessionTimeout.warningShownCount}
            </p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">继续使用次数</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.sessionTimeout.continueCount}
            </p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">退出次数</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.sessionTimeout.logoutCount + stats.sessionTimeout.autoLogoutCount}
            </p>
          </div>
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">用户参与率</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {userEngagementRate}%
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">平均响应时间</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">
            {avgResponseTime} 秒
          </p>
        </div>
      </div>

      {/* 游客转化监控 */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
            <Icon name="person_add" className="text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            游客转化监控
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">总使用次数</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {stats.guestConversion.totalGuestUsage}
            </p>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">达到限制次数</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.guestConversion.limitReachedCount}
            </p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">转化次数</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.guestConversion.conversionCount}
            </p>
          </div>
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">转化率</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {stats.guestConversion.conversionRate.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">警告显示次数</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              {stats.guestConversion.warningShownCount}
            </p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-sm text-slate-500 dark:text-text-secondary mb-1">关闭提示次数</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              {stats.guestConversion.dismissalCount}
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
          {/* Token 刷新健康状态 */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Token 刷新成功率
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{tokenSuccessRate}%</span>
              <Icon 
                name={parseFloat(tokenSuccessRate) >= 95 ? 'check_circle' : 'warning'} 
                className={parseFloat(tokenSuccessRate) >= 95 ? 'text-green-600' : 'text-amber-600'}
              />
            </div>
          </div>

          {/* 用户参与率健康状态 */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              用户参与率
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{userEngagementRate}%</span>
              <Icon 
                name={parseFloat(userEngagementRate) >= 70 ? 'check_circle' : 'warning'} 
                className={parseFloat(userEngagementRate) >= 70 ? 'text-green-600' : 'text-amber-600'}
              />
            </div>
          </div>

          {/* 游客转化率健康状态 */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              游客转化率
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{stats.guestConversion.conversionRate.toFixed(2)}%</span>
              <Icon 
                name={stats.guestConversion.conversionRate >= 20 ? 'check_circle' : 'warning'} 
                className={stats.guestConversion.conversionRate >= 20 ? 'text-green-600' : 'text-amber-600'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
