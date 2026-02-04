import React, { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { useAppContext } from '../../context/AppContext';
import { adminApi } from '../../api/adminClient';
import type { AdminPage, DashboardStats } from './types';

interface RecentUser {
  id: number;
  username: string;
  email: string;
  createdAt: string;
}

interface PopularTool {
  toolId: number;
  toolName: string;
  count: number;
}

interface AdminDashboardProps {
  onNavigate?: (page: AdminPage) => void;
}

/**
 * Admin Dashboard Component
 * 管理员仪表盘 - 显示统计数据概览
 */
export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { t, language } = useAppContext();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [popularTools, setPopularTools] = useState<PopularTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 并行获取数据
      const [statsResult, popularToolsResult] = await Promise.all([
        adminApi.getStats(),
        adminApi.statistics.popularTools(5),
      ]);
      
      setStats(statsResult.data);
      setPopularTools(popularToolsResult.data);
      
      // 尝试获取最近用户（如果API支持）
      try {
        const usersResult = await adminApi.users.list({ page: 1, size: 5 });
        if (usersResult.data.list) {
          setRecentUsers(usersResult.data.list.map((u: any) => ({
            id: u.id,
            username: u.nickname || u.username,
            email: u.email,
            createdAt: u.createdAt,
          })));
        }
      } catch (err) {
        // 用户数据获取失败，使用空数组
        console.warn('Failed to fetch recent users:', err);
      }
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
      setError(err.message || t('admin.error.load_stats'));
    } finally {
      setLoading(false);
    }
  };

  // 计算相对时间
  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return t('time.just_now');
    if (diffMins < 60) return t('time.minutes_ago', { minutes: diffMins });
    if (diffHours < 24) return t('time.hours_ago', { hours: diffHours });
    return t('time.days_ago', { days: diffDays });
  };

  const statCards = [
    {
      title: t('admin.dashboard.total_users'),
      value: stats?.totalUsers || 0,
      icon: 'people',
      color: 'indigo',
      change: `+${stats?.newUsersToday || 0}`,
      changeLabel: t('admin.dashboard.new_users_today'),
    },
    {
      title: t('admin.dashboard.active_users'),
      value: stats?.activeUsers || 0,
      icon: 'person_check',
      color: 'emerald',
      change: `${stats?.activeUsers && stats?.totalUsers ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%`,
      changeLabel: t('admin.dashboard.active_rate'),
    },
    {
      title: t('admin.dashboard.total_tools'),
      value: stats?.totalTools || 0,
      icon: 'build',
      color: 'purple',
      change: `${stats?.totalCategories || 0}`,
      changeLabel: t('admin.dashboard.categories'),
    },
    {
      title: t('admin.dashboard.total_usage'),
      value: stats?.totalUsage || 0,
      icon: 'analytics',
      color: 'amber',
      change: `+${stats?.usageToday || 0}`,
      changeLabel: t('admin.dashboard.usage_today'),
    },
  ];

  const colorClasses: Record<string, { bg: string; bgDark: string; text: string; textDark: string; border: string }> = {
    indigo: {
      bg: 'bg-indigo-50',
      bgDark: 'dark:bg-indigo-900/20',
      text: 'text-indigo-600',
      textDark: 'dark:text-indigo-400',
      border: 'border-indigo-100 dark:border-indigo-800/30',
    },
    emerald: {
      bg: 'bg-emerald-50',
      bgDark: 'dark:bg-emerald-900/20',
      text: 'text-emerald-600',
      textDark: 'dark:text-emerald-400',
      border: 'border-emerald-100 dark:border-emerald-800/30',
    },
    purple: {
      bg: 'bg-purple-50',
      bgDark: 'dark:bg-purple-900/20',
      text: 'text-purple-600',
      textDark: 'dark:text-purple-400',
      border: 'border-purple-100 dark:border-purple-800/30',
    },
    amber: {
      bg: 'bg-amber-50',
      bgDark: 'dark:bg-amber-900/20',
      text: 'text-amber-600',
      textDark: 'dark:text-amber-400',
      border: 'border-amber-100 dark:border-amber-800/30',
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('admin.dashboard.title')}
        </h1>
        <p className="text-slate-500 dark:text-text-secondary mt-1">
          {t('admin.dashboard.subtitle')}
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <Icon name="error" className="text-red-600 dark:text-red-400 text-[20px] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {t('admin.dashboard.error_fetch')}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchStats}
            className="px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, index) => {
          const colors = colorClasses[card.color];
          return (
            <div
              key={index}
              className={`bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-5 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm hover:shadow-md dark:shadow-none`}
            >
              <div className="flex items-start justify-between">
                <div className={`size-11 rounded-lg ${colors.bg} ${colors.bgDark} ${colors.border} border flex items-center justify-center`}>
                  <Icon name={card.icon} className={`text-[22px] ${colors.text} ${colors.textDark}`} />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                  <span>{card.change}</span>
                  <span className="text-slate-400 dark:text-slate-500">{card.changeLabel}</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {card.value.toLocaleString()}
                </p>
                <p className="text-sm text-slate-500 dark:text-text-secondary mt-1">
                  {card.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          {t('admin.dashboard.quick_actions')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: 'person_add', label: t('admin.dashboard.add_user'), color: 'indigo', action: () => onNavigate?.('users') },
            { icon: 'add_circle', label: t('admin.dashboard.add_tool'), color: 'purple', action: () => onNavigate?.('tools') },
            { icon: 'category', label: t('admin.dashboard.new_category'), color: 'emerald', action: () => onNavigate?.('categories') },
            { icon: 'bar_chart', label: t('admin.dashboard.view_statistics'), color: 'amber', action: () => onNavigate?.('statistics') },
          ].map((action, index) => {
            const colors = colorClasses[action.color];
            return (
              <button
                key={index}
                onClick={action.action}
                className={`flex items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-border-dark hover:border-slate-300 dark:hover:border-slate-600 ${colors.bg} ${colors.bgDark} transition-all group hover:scale-[1.02] active:scale-[0.98]`}
              >
                <Icon name={action.icon} className={`text-[22px] ${colors.text} ${colors.textDark}`} />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('admin.dashboard.recent_users')}
            </h2>
            <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              {t('admin.dashboard.view_all')}
            </button>
          </div>
          <div className="space-y-3">
            {recentUsers.length > 0 ? (
              recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors">
                  <div className="size-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.username}</p>
                    <p className="text-xs text-slate-500 dark:text-text-secondary truncate">{user.email}</p>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{getRelativeTime(user.createdAt)}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
                {t('admin.dashboard.no_user_data')}
              </div>
            )}
          </div>
        </div>

        {/* Popular Tools */}
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('admin.dashboard.popular_tools')}
            </h2>
            <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              {t('admin.dashboard.view_all')}
            </button>
          </div>
          <div className="space-y-3">
            {popularTools.length > 0 ? (
              popularTools.map((tool, index) => (
                <div key={tool.toolId} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors">
                  <div className="size-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30 flex items-center justify-center">
                    <span className="text-purple-600 dark:text-purple-400 text-sm font-bold">#{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{tool.toolName}</p>
                    <p className="text-xs text-slate-500 dark:text-text-secondary">
                      {tool.count.toLocaleString()} {t('admin.dashboard.uses')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
                {t('admin.dashboard.no_usage_data')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
