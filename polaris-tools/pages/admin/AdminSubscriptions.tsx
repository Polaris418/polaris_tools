import React, { useState, useEffect } from 'react';
import { Icon } from '../../components/Icon';
import { useAppContext } from '../../context/AppContext';
import { adminApi } from '../../api/adminClient';
import type { 
  SubscriptionStatsResponse,
  UserSubscriptionResponse,
  SubscriptionQueryRequest,
  UnsubscribeAnalyticsResponse
} from './types';

/**
 * Admin Subscriptions Page
 * 管理员订阅管理页面
 * 
 * Requirements: 22.2, 22.3, 22.5, 22.6
 */
export const AdminSubscriptions: React.FC = () => {
  const { t, language } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SubscriptionStatsResponse | null>(null);
  const [subscriptions, setSubscriptions] = useState<UserSubscriptionResponse[]>([]);
  const [analytics, setAnalytics] = useState<UnsubscribeAnalyticsResponse | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserSubscriptionResponse | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<SubscriptionQueryRequest>({
    page: 1,
    size: 20,
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    size: 20,
    total: 0,
    totalPages: 0,
  });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadSubscriptions(),
        loadAnalytics(),
      ]);
    } catch (error) {
      console.error('Failed to load subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await adminApi.subscriptions.stats();
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to load subscription stats:', error);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const result = await adminApi.subscriptions.list(filters);
      if (result.success && result.data) {
        setSubscriptions(result.data.records);
        setPagination({
          page: result.data.page,
          size: result.data.size,
          total: result.data.total,
          totalPages: result.data.totalPages,
        });
      }
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const result = await adminApi.subscriptions.analytics();
      if (result.success && result.data) {
        setAnalytics(result.data);
      }
    } catch (error) {
      console.error('Failed to load unsubscribe analytics:', error);
    }
  };

  const handleViewUser = async (userId: number) => {
    try {
      const result = await adminApi.subscriptions.get(userId);
      if (result.success && result.data) {
        setSelectedUser(result.data);
        setShowUserModal(true);
      }
    } catch (error) {
      console.error('Failed to load user subscription:', error);
    }
  };

  const handleUpdatePreferences = async (userId: number, preferences: Record<string, boolean>) => {
    try {
      const result = await adminApi.subscriptions.update(userId, { preferences });
      if (result.success) {
        await loadSubscriptions();
        setShowUserModal(false);
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  const handleExportData = async () => {
    try {
      const blob = await adminApi.subscriptions.export(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-500 dark:text-text-secondary">
            {t('admin.subs.loading')}
          </p>
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
            {t('admin.subs.title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-text-secondary mt-1">
            {t('admin.subs.subtitle')}
          </p>
        </div>
        <button
          onClick={handleExportData}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <Icon name="download" className="text-[18px]" />
          <span>{t('admin.subs.export')}</span>
        </button>
      </div>

      {/* Subscription Statistics Overview - Subtask 6.1 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-surface-dark rounded-xl p-6 border border-slate-200 dark:border-border-dark">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500 dark:text-text-secondary">
                {t('admin.subs.total_subscribers')}
              </span>
              <Icon name="people" className="text-indigo-600 dark:text-indigo-400 text-[20px]" />
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.totalSubscribers.toLocaleString()}
            </div>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl p-6 border border-slate-200 dark:border-border-dark">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500 dark:text-text-secondary">
                {t('admin.subs.system_rate')}
              </span>
              <Icon name="notifications" className="text-blue-600 dark:text-blue-400 text-[20px]" />
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.systemNotificationsRate.toFixed(1)}%
            </div>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl p-6 border border-slate-200 dark:border-border-dark">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500 dark:text-text-secondary">
                {t('admin.subs.marketing_rate')}
              </span>
              <Icon name="campaign" className="text-green-600 dark:text-green-400 text-[20px]" />
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.marketingEmailsRate.toFixed(1)}%
            </div>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl p-6 border border-slate-200 dark:border-border-dark">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500 dark:text-text-secondary">
                {t('admin.subs.updates_rate')}
              </span>
              <Icon name="new_releases" className="text-purple-600 dark:text-purple-400 text-[20px]" />
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.productUpdatesRate.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Unsubscribe Analytics - Subtask 6.4 */}
      {analytics && (
        <div className="bg-white dark:bg-surface-dark rounded-xl p-6 border border-slate-200 dark:border-border-dark">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            {t('admin.subs.unsubscribe_analytics')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <div className="text-sm text-slate-500 dark:text-text-secondary mb-1">
                {t('admin.subs.total_unsubs')}
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {analytics.totalUnsubscribes.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-500 dark:text-text-secondary mb-1">
                {t('admin.subs.week_unsubs')}
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {analytics.weekUnsubscribes.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-500 dark:text-text-secondary mb-1">
                {t('admin.subs.unsubscribe_rate')}
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {analytics.unsubscribeRate.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Unsubscribe Reasons */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              {t('admin.subs.reason_stats')}
            </h3>
            <div className="space-y-2">
              {Object.entries(analytics.reasonStats).map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {reason || t('admin.subs.reason_unspecified')}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full"
                        style={{ width: `${(count / analytics.totalUnsubscribes) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white w-12 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User Subscription List - Subtask 6.2 */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark">
        <div className="p-6 border-b border-slate-200 dark:border-border-dark">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            {t('admin.subs.user_list')}
          </h2>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder={t('admin.subs.search_placeholder')}
              value={filters.keyword || ''}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value, page: 1 })}
              className="px-4 py-2 border border-slate-200 dark:border-border-dark rounded-lg bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            
            <select
              value={filters.subscriptionStatus || ''}
              onChange={(e) => setFilters({ ...filters, subscriptionStatus: e.target.value, page: 1 })}
              className="px-4 py-2 border border-slate-200 dark:border-border-dark rounded-lg bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t('admin.subs.filter.all_status')}</option>
              <option value="all_subscribed">{t('admin.subs.filter.all_subscribed')}</option>
              <option value="partial_subscribed">{t('admin.subs.filter.partial')}</option>
              <option value="all_unsubscribed">{t('admin.subs.filter.all_unsub')}</option>
            </select>

            <button
              onClick={() => setFilters({ page: 1, size: 20 })}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {t('admin.subs.reset')}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-[#1e293b] border-b border-slate-200 dark:border-border-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                  {t('admin.subs.col.user')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                  {t('admin.subs.col.email')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                  {t('admin.subs.col.system')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                  {t('admin.subs.col.marketing')}
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                  {t('admin.subs.col.updates')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                  {t('admin.subs.col.updated_at')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-text-secondary uppercase tracking-wider">
                  {t('admin.subs.col.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-border-dark">
              {subscriptions.map((sub) => (
                <tr key={sub.userId} className="hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {sub.username}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500 dark:text-text-secondary">
                      {sub.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {sub.systemNotifications ? (
                      <Icon name="check_circle" className="text-green-600 dark:text-green-400 text-[20px] inline-block" />
                    ) : (
                      <Icon name="cancel" className="text-slate-300 dark:text-slate-600 text-[20px] inline-block" />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {sub.marketingEmails ? (
                      <Icon name="check_circle" className="text-green-600 dark:text-green-400 text-[20px] inline-block" />
                    ) : (
                      <Icon name="cancel" className="text-slate-300 dark:text-slate-600 text-[20px] inline-block" />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {sub.productUpdates ? (
                      <Icon name="check_circle" className="text-green-600 dark:text-green-400 text-[20px] inline-block" />
                    ) : (
                      <Icon name="cancel" className="text-slate-300 dark:text-slate-600 text-[20px] inline-block" />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-500 dark:text-text-secondary">
                      {new Date(sub.updatedAt).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleViewUser(sub.userId)}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium"
                    >
                      {t('admin.subs.view_details')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-border-dark flex items-center justify-between">
            <div className="text-sm text-slate-500 dark:text-text-secondary">
              {t('admin.subs.pagination.showing', { 
                from: (pagination.page - 1) * pagination.size + 1,
                to: Math.min(pagination.page * pagination.size, pagination.total),
                total: pagination.total
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-slate-200 dark:border-border-dark rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors"
              >
                {t('admin.subs.pagination.prev')}
              </button>
              <button
                onClick={() => setFilters({ ...filters, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 border border-slate-200 dark:border-border-dark rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors"
              >
                {t('admin.subs.pagination.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Subscription Detail Modal - Subtask 6.3 */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-dark rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-surface-dark border-b border-slate-200 dark:border-border-dark p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t('admin.subs.modal.title')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-text-secondary mt-1">
                  {selectedUser.username} ({selectedUser.email})
                </p>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <Icon name="close" className="text-[24px]" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Current Preferences */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  {t('admin.subs.modal.current_pref')}
                </h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 border border-slate-200 dark:border-border-dark rounded-lg hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Icon name="notifications" className="text-blue-600 dark:text-blue-400 text-[20px]" />
                      <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {t('admin.subs.modal.system')}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-text-secondary">
                            {t('admin.subs.modal.system_desc')}
                          </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedUser.systemNotifications}
                      onChange={(e) => setSelectedUser({ ...selectedUser, systemNotifications: e.target.checked })}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 border border-slate-200 dark:border-border-dark rounded-lg hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Icon name="campaign" className="text-green-600 dark:text-green-400 text-[20px]" />
                      <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {t('admin.subs.modal.marketing')}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-text-secondary">
                            {t('admin.subs.modal.marketing_desc')}
                          </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedUser.marketingEmails}
                      onChange={(e) => setSelectedUser({ ...selectedUser, marketingEmails: e.target.checked })}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 border border-slate-200 dark:border-border-dark rounded-lg hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Icon name="new_releases" className="text-purple-600 dark:text-purple-400 text-[20px]" />
                      <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {t('admin.subs.modal.updates')}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-text-secondary">
                            {t('admin.subs.modal.updates_desc')}
                          </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedUser.productUpdates}
                      onChange={(e) => setSelectedUser({ ...selectedUser, productUpdates: e.target.checked })}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                  </label>
                </div>
              </div>

              {/* Subscription History */}
              {selectedUser.history && selectedUser.history.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    {t('admin.subs.modal.history')}
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedUser.history.map((record, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-[#1e293b] rounded-lg">
                        <Icon name="history" className="text-slate-400 text-[18px] mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-900 dark:text-white">
                            {record.action}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-text-secondary mt-1">
                            {new Date(record.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-surface-dark border-t border-slate-200 dark:border-border-dark p-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-border-dark rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors"
              >
                {t('admin.subs.modal.cancel')}
              </button>
              <button
                onClick={() => handleUpdatePreferences(selectedUser.userId, {
                  systemNotifications: selectedUser.systemNotifications,
                  marketingEmails: selectedUser.marketingEmails,
                  productUpdates: selectedUser.productUpdates,
                })}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                {t('admin.subs.modal.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
