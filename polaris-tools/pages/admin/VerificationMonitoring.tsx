/**
 * VerificationMonitoring - 验证码监控页面
 * 
 * 显示验证码系统的监控统计数据
 * - 验证码发送统计
 * - 验证码验证统计
 * - 成功率趋势
 * - 限流触发统计
 * - 实时日志查看
 */

import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/Icon';
import { adminApi } from '../../api/adminClient';
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
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Types for verification monitoring data
interface VerificationStats {
  totalSent: number;
  totalVerified: number;
  totalFailed: number;
  successRate: number;
  avgVerificationTime: number;
}

interface VerificationLog {
  id: number;
  email: string;
  purpose: string;
  action: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

interface TimeSeriesData {
  time: string;
  sent: number;
  verified: number;
  failed: number;
  successRate: number;
}

interface PurposeStats {
  purpose: string;
  count: number;
  successRate: number;
}

interface RateLimitStats {
  emailLimitTriggered: number;
  ipLimitTriggered: number;
  dailyLimitTriggered: number;
}

export const VerificationMonitoring: React.FC = () => {
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [purposeStats, setPurposeStats] = useState<PurposeStats[]>([]);
  const [rateLimitStats, setRateLimitStats] = useState<RateLimitStats | null>(null);
  const [logs, setLogs] = useState<VerificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [timeRange, setTimeRange] = useState<number>(24); // hours
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filterEmail, setFilterEmail] = useState<string>('');
  const [filterPurpose, setFilterPurpose] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('');

  // Colors for charts
  const COLORS = ['#4F46E5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Load monitoring data
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      let calculatedStartDate: Date;
      let calculatedEndDate: Date;
      
      if (startDate && endDate) {
        // Use custom date range from state
        calculatedStartDate = new Date(startDate);
        calculatedEndDate = new Date(endDate);
      } else {
        // Use timeRange to calculate date range
        calculatedEndDate = new Date();
        calculatedStartDate = new Date();
        calculatedStartDate.setHours(calculatedStartDate.getHours() - timeRange);
      }
      
      const dateParams = {
        startDate: calculatedStartDate.toISOString(),
        endDate: calculatedEndDate.toISOString()
      };
      
      // Load stats
      const statsResult = await adminApi.verificationMonitoring.stats(dateParams);
      if (statsResult.code === 200 && statsResult.data) {
        setStats(statsResult.data);
      }

      // Load time series data
      const timeSeriesResult = await adminApi.verificationMonitoring.timeSeries({
        ...dateParams,
        intervalHours: 1
      });
      if (timeSeriesResult.code === 200 && timeSeriesResult.data) {
        setTimeSeriesData(timeSeriesResult.data);
      }

      // Load purpose stats
      const purposeStatsResult = await adminApi.verificationMonitoring.purposeStats(dateParams);
      if (purposeStatsResult.code === 200 && purposeStatsResult.data) {
        setPurposeStats(purposeStatsResult.data);
      }

      // Load rate limit stats
      const rateLimitStatsResult = await adminApi.verificationMonitoring.rateLimitStats(dateParams);
      if (rateLimitStatsResult.code === 200 && rateLimitStatsResult.data) {
        setRateLimitStats(rateLimitStatsResult.data);
      }

      // Load logs
      const logsResult = await adminApi.verificationMonitoring.logs({
        page: currentPage,
        size: 20,
        email: filterEmail || undefined,
        purpose: filterPurpose || undefined,
        action: filterAction || undefined,
        startDate: calculatedStartDate.toISOString(),
        endDate: calculatedEndDate.toISOString()
      });
      
      if (logsResult.code === 200 && logsResult.data) {
        setLogs(logsResult.data.records || []);
        setTotalPages(logsResult.data.pages || 1);
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('加载监控数据失败:', error);
      // Keep using mock data on error for now
    } finally {
      setLoading(false);
    }
  };

  // Initial load and auto-refresh
  useEffect(() => {
    loadData();
    
    // Auto-refresh every minute
    const interval = setInterval(() => {
      loadData();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [timeRange, currentPage, startDate, endDate, filterEmail, filterPurpose, filterAction]);

  // Manual refresh
  const handleRefresh = () => {
    loadData();
  };

  // Export data
  const handleExport = async () => {
    try {
      // Prepare export parameters
      const params = {
        email: filterEmail || undefined,
        purpose: filterPurpose || undefined,
        action: filterAction || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      // Call export API
      const blob = await adminApi.verificationMonitoring.exportLogs(params);
      
      // Create blob and download
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `verification_logs_${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('数据导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请稍后重试');
    }
  };

  // Apply filters
  const handleApplyFilters = () => {
    setCurrentPage(1);
    loadData();
  };

  // Reset filters
  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setFilterEmail('');
    setFilterPurpose('');
    setFilterAction('');
    setCurrentPage(1);
    loadData();
  };

  // Get purpose display name
  const getPurposeDisplayName = (purpose: string): string => {
    const names: Record<string, string> = {
      register: '注册',
      login: '登录',
      reset: '重置密码',
      verify: '验证邮箱',
      change: '修改邮箱'
    };
    return names[purpose] || purpose;
  };

  // Get action display name
  const getActionDisplayName = (action: string): string => {
    const names: Record<string, string> = {
      send: '发送',
      verify: '验证',
      fail: '失败'
    };
    return names[action] || action;
  };

  if (loading && !stats) {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            验证码系统监控
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
            onClick={handleExport}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Icon name="download" />
            导出数据
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-text-secondary">发送总数</span>
              <Icon name="send" className="text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.totalSent.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
              最近{timeRange}小时
            </p>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-text-secondary">验证成功</span>
              <Icon name="check_circle" className="text-green-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.totalVerified.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
              最近{timeRange}小时
            </p>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-text-secondary">验证失败</span>
              <Icon name="error" className="text-red-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.totalFailed.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
              最近{timeRange}小时
            </p>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-text-secondary">成功率</span>
              <Icon name="trending_up" className="text-green-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.successRate.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
              最近{timeRange}小时
            </p>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-text-secondary">平均验证时间</span>
              <Icon name="schedule" className="text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.avgVerificationTime.toFixed(1)}s
            </p>
            <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
              从发送到验证
            </p>
          </div>
        </div>
      )}

      {/* Time Range Selector and Filters */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-4">
        <div className="space-y-4">
          {/* Quick Time Range Selector */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">快速选择:</span>
            <div className="flex gap-2">
              {[1, 6, 12, 24, 48, 72].map((hours) => (
                <button
                  key={hours}
                  onClick={() => {
                    setTimeRange(hours);
                    setStartDate('');
                    setEndDate('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    timeRange === hours && !startDate && !endDate
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {hours}小时
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="flex items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">自定义范围:</span>
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
              <span className="text-slate-500 dark:text-slate-400">至</span>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              />
            </div>
          </div>

          {/* Additional Filters */}
          <div className="flex items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">筛选条件:</span>
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                placeholder="邮箱地址"
                value={filterEmail}
                onChange={(e) => setFilterEmail(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm flex-1 max-w-xs"
              />
              <select
                value={filterPurpose}
                onChange={(e) => setFilterPurpose(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              >
                <option value="">所有用途</option>
                <option value="register">注册</option>
                <option value="login">登录</option>
                <option value="reset">重置密码</option>
                <option value="verify">验证邮箱</option>
                <option value="change">修改邮箱</option>
              </select>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              >
                <option value="">所有操作</option>
                <option value="send">发送</option>
                <option value="verify">验证</option>
                <option value="fail">失败</option>
              </select>
              <button
                onClick={handleApplyFilters}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                应用筛选
              </button>
              <button
                onClick={handleResetFilters}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                重置
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Code Send Statistics Chart */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          验证码发送统计
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="time" 
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1e293b',
                border: 'none',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Legend />
            <Bar 
              dataKey="sent" 
              fill="#4F46E5" 
              name="发送总数"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="verified" 
              fill="#10b981" 
              name="验证成功"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="failed" 
              fill="#ef4444" 
              name="验证失败"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Verification Statistics by Purpose */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          验证码用途统计
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={purposeStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ purpose, percent }) => `${getPurposeDisplayName(purpose)} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {purposeStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Stats Table */}
          <div className="space-y-3">
            {purposeStats.map((stat, index) => (
              <div 
                key={stat.purpose}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {getPurposeDisplayName(stat.purpose)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {stat.count.toLocaleString()}
                  </span>
                  <span className={`text-sm font-medium ${
                    stat.successRate >= 95 
                      ? 'text-green-600 dark:text-green-400' 
                      : stat.successRate >= 90
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {stat.successRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Success Rate Trend Chart */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          成功率趋势
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="time" 
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              domain={[0, 100]}
              stroke="#64748b"
              style={{ fontSize: '12px' }}
              label={{ value: '成功率 (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1e293b',
                border: 'none',
                borderRadius: '8px',
                color: '#fff'
              }}
              formatter={(value: number) => `${value.toFixed(2)}%`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="successRate" 
              stroke="#10b981" 
              strokeWidth={3}
              name="成功率"
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
            />
            {/* Reference line at 95% */}
            <Line 
              type="monotone" 
              dataKey={() => 95} 
              stroke="#f59e0b" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="目标 (95%)"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-600"></div>
            <span className="text-slate-600 dark:text-slate-400">实际成功率</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-amber-600"></div>
            <span className="text-slate-600 dark:text-slate-400">目标成功率 (95%)</span>
          </div>
        </div>
      </div>

      {/* Rate Limit Statistics */}
      {rateLimitStats && (
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
              <Icon name="block" className="text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              限流触发统计
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  邮箱级限流
                </span>
                <Icon name="email" className="text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {rateLimitStats.emailLimitTriggered}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                60秒冷却时间触发
              </p>
            </div>

            <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  IP级限流
                </span>
                <Icon name="router" className="text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {rateLimitStats.ipLimitTriggered}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                60秒冷却时间触发
              </p>
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  每日限额
                </span>
                <Icon name="calendar_today" className="text-red-600 dark:text-red-400" />
              </div>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {rateLimitStats.dailyLimitTriggered}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                每日限额触发
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              限流规则说明
            </h3>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-start gap-2">
                <Icon name="info" className="text-blue-600 mt-0.5" />
                <span>邮箱级限流: 同一邮箱60秒内最多发送1次，每日最多10次</span>
              </div>
              <div className="flex items-start gap-2">
                <Icon name="info" className="text-blue-600 mt-0.5" />
                <span>IP级限流: 同一IP 60秒内最多发送3次，每日最多20次</span>
              </div>
              <div className="flex items-start gap-2">
                <Icon name="info" className="text-blue-600 mt-0.5" />
                <span>验证失败10次后临时封禁邮箱1小时</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder for logs - will be implemented in subsequent subtasks */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <Icon name="list_alt" className="text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              实时验证日志
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              共 {logs.length} 条记录
            </span>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  时间
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  邮箱
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  用途
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  操作
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  IP地址
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  状态
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  错误信息
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr 
                  key={log.id}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                    {new Date(log.createdAt).toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900 dark:text-white font-medium">
                    {log.email}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                      {getPurposeDisplayName(log.purpose)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      log.action === 'send'
                        ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
                        : 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
                    }`}>
                      {getActionDisplayName(log.action)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 font-mono">
                    {log.ipAddress}
                  </td>
                  <td className="py-3 px-4">
                    {log.success ? (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Icon name="check_circle" className="text-sm" />
                        <span className="text-xs font-medium">成功</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <Icon name="error" className="text-sm" />
                        <span className="text-xs font-medium">失败</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                    {log.errorMessage || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            第 {currentPage} 页，共 {totalPages} 页
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              上一页
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
