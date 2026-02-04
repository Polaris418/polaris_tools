/**
 * AdminEmailQueue - 管理后台邮件队列页面
 * 
 * 显示和管理邮件发送队列
 * - 队列概览统计
 * - 队列项列表
 * - 队列管理操作
 * - 队列配置
 */

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminClient';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAppContext } from '../../context/AppContext';
import type { 
  EmailQueueItemResponse,
  EmailQueueStatsResponse,
  EmailQueueConfigResponse,
  EmailQueueQueryRequest,
  PaginationInfo 
} from './types';

export const AdminEmailQueue: React.FC = () => {
  const { showToast, language, t } = useAppContext();
  
  // State
  const [queueItems, setQueueItems] = useState<EmailQueueItemResponse[]>([]);
  const [queueStats, setQueueStats] = useState<EmailQueueStatsResponse | null>(null);
  const [queueConfig, setQueueConfig] = useState<EmailQueueConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>(undefined);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    size: 20,
    total: 0,
    totalPages: 0,
  });
  
  // Config modal state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    workerThreads: 5,
    batchSize: 10,
    maxRetries: 3,
    retryDelaySeconds: 60,
  });

  // Confirmation dialogs
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [showResumeConfirm, setShowResumeConfirm] = useState(false);
  const [itemToRetry, setItemToRetry] = useState<EmailQueueItemResponse | null>(null);
  const [itemToCancel, setItemToCancel] = useState<EmailQueueItemResponse | null>(null);
  const [itemToChangePriority, setItemToChangePriority] = useState<EmailQueueItemResponse | null>(null);
  const [newPriority, setNewPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');

  useEffect(() => {
    fetchQueueStats();
    fetchQueueConfig();
    fetchQueueItems();
  }, [pagination.page, statusFilter, priorityFilter]);

  const fetchQueueStats = async () => {
    try {
      setStatsLoading(true);
      const result = await adminApi.queue.stats();
      if (result.code === 200 && result.data) {
        setQueueStats(result.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch queue stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchQueueConfig = async () => {
    try {
      const result = await adminApi.queue.getConfig();
      if (result.code === 200 && result.data) {
        setQueueConfig(result.data);
        setConfigForm({
          workerThreads: result.data.workerThreads,
          batchSize: result.data.batchSize,
          maxRetries: result.data.maxRetries,
          retryDelaySeconds: result.data.retryDelaySeconds,
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch queue config:', err);
    }
  };

  const fetchQueueItems = async () => {
    try {
      setLoading(true);
      
      const params: EmailQueueQueryRequest = {
        page: pagination.page,
        size: pagination.size,
        status: statusFilter,
        priority: priorityFilter,
        sortBy: 'scheduledAt',
        sortOrder: 'asc',
      };

      const result = await adminApi.queue.list(params);
      if (result.code === 200 && result.data) {
        setQueueItems(result.data.list);
        setPagination(prev => ({
          ...prev,
          total: result.data.total,
          totalPages: result.data.pages,
        }));
      }
    } catch (err: any) {
      showToast(err.message || t('admin.queue.toast.load_failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (item: EmailQueueItemResponse) => {
    try {
      const result = await adminApi.queue.retry(item.id);
      if (result.code === 200) {
        showToast(t('admin.queue.toast.retry_success'), 'success');
        setItemToRetry(null);
        fetchQueueItems();
        fetchQueueStats();
      }
    } catch (err: any) {
      showToast(err.message || t('admin.queue.toast.retry_failed'), 'error');
    }
  };

  const handleCancel = async (item: EmailQueueItemResponse) => {
    try {
      const result = await adminApi.queue.cancel(item.id);
      if (result.code === 200) {
        showToast(t('admin.queue.toast.cancel_success'), 'success');
        setItemToCancel(null);
        fetchQueueItems();
        fetchQueueStats();
      }
    } catch (err: any) {
      showToast(err.message || t('admin.queue.toast.cancel_failed'), 'error');
    }
  };

  const handleChangePriority = async () => {
    if (!itemToChangePriority) return;
    
    try {
      const result = await adminApi.queue.updatePriority(itemToChangePriority.id, newPriority);
      if (result.code === 200) {
        showToast(t('admin.queue.toast.priority_success'), 'success');
        setItemToChangePriority(null);
        fetchQueueItems();
      }
    } catch (err: any) {
      showToast(err.message || t('admin.queue.toast.priority_failed'), 'error');
    }
  };

  const handlePauseQueue = async () => {
    try {
      const result = await adminApi.queue.pause();
      if (result.code === 200) {
        showToast(t('admin.queue.toast.paused'), 'success');
        setShowPauseConfirm(false);
        fetchQueueStats();
      }
    } catch (err: any) {
      showToast(err.message || t('admin.queue.toast.pause_failed'), 'error');
    }
  };

  const handleResumeQueue = async () => {
    try {
      const result = await adminApi.queue.resume();
      if (result.code === 200) {
        showToast(t('admin.queue.toast.resumed'), 'success');
        setShowResumeConfirm(false);
        fetchQueueStats();
      }
    } catch (err: any) {
      showToast(err.message || t('admin.queue.toast.resume_failed'), 'error');
    }
  };

  const handleSaveConfig = async () => {
    try {
      const result = await adminApi.queue.updateConfig(configForm);
      if (result.code === 200) {
        showToast(t('admin.queue.toast.config_saved'), 'success');
        setShowConfigModal(false);
        fetchQueueConfig();
        fetchQueueStats();
      }
    } catch (err: any) {
      showToast(err.message || t('admin.queue.toast.config_failed'), 'error');
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      PENDING: t('admin.queue.status.pending'),
      PROCESSING: t('admin.queue.status.processing'),
      SENT: t('admin.queue.status.sent'),
      FAILED: t('admin.queue.status.failed'),
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400';
      case 'PROCESSING':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
      case 'SENT':
        return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400';
      case 'FAILED':
        return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    }
  };

  const getPriorityLabel = (priority: string) => {
    const map: Record<string, string> = {
      HIGH: t('admin.queue.priority.high'),
      MEDIUM: t('admin.queue.priority.medium'),
      LOW: t('admin.queue.priority.low'),
    };
    return map[priority] || priority;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
      case 'MEDIUM':
        return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400';
      case 'LOW':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('admin.queue.title')}
          </h1>
          <p className="text-slate-500 dark:text-text-secondary mt-1">
            {t('admin.queue.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            <Icon name="settings" className="text-[20px]" />
            <span>{t('admin.queue.button.config')}</span>
          </button>
          {queueStats?.enabled ? (
            <button 
              onClick={() => setShowPauseConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
            >
              <Icon name="pause" className="text-[20px]" />
              <span>{t('admin.queue.button.pause')}</span>
            </button>
          ) : (
            <button 
              onClick={() => setShowResumeConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              <Icon name="play_arrow" className="text-[20px]" />
              <span>{t('admin.queue.button.resume')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Queue Statistics */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-3"></div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
            </div>
          ))}
        </div>
      ) : queueStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-text-secondary">
                  {t('admin.queue.stats.length')}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {queueStats.queueLength.toLocaleString()}
                </p>
              </div>
              <div className="size-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <Icon name="queue" className="text-indigo-600 dark:text-indigo-400 text-[24px]" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-text-secondary">
                  {t('admin.queue.stats.speed')}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {queueStats.processingSpeed >= 1 
                    ? queueStats.processingSpeed.toFixed(0)
                    : queueStats.processingSpeed.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">
                  {t('admin.queue.stats.throughput')}
                </p>
              </div>
              <div className="size-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <Icon name="speed" className="text-emerald-600 dark:text-emerald-400 text-[24px]" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-text-secondary">
                  {t('admin.queue.stats.failure_rate')}
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {queueStats.failureRate.toFixed(2)}%
                </p>
              </div>
              <div className="size-12 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <Icon name="error" className="text-red-600 dark:text-red-400 text-[24px]" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-text-secondary">
                  {t('admin.queue.stats.workers')}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {queueStats.workerThreads}
                </p>
              </div>
              <div className="size-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Icon name="settings" className="text-blue-600 dark:text-blue-400 text-[24px]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('admin.queue.filter.status')}
            </label>
            <select
              value={statusFilter ?? ''}
              onChange={(e) => {
                setStatusFilter(e.target.value || undefined);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full h-10 px-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
            >
              <option value="">{t('admin.queue.filter.all_status')}</option>
              <option value="PENDING">{getStatusLabel('PENDING')}</option>
              <option value="PROCESSING">{getStatusLabel('PROCESSING')}</option>
              <option value="SENT">{getStatusLabel('SENT')}</option>
              <option value="FAILED">{getStatusLabel('FAILED')}</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('admin.queue.filter.priority')}
            </label>
            <select
              value={priorityFilter ?? ''}
              onChange={(e) => {
                setPriorityFilter(e.target.value || undefined);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full h-10 px-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
            >
              <option value="">{t('admin.queue.filter.all_priority')}</option>
              <option value="HIGH">{getPriorityLabel('HIGH')}</option>
              <option value="MEDIUM">{getPriorityLabel('MEDIUM')}</option>
              <option value="LOW">{getPriorityLabel('LOW')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Queue Items Table */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-[#1e293b] border-b border-slate-200 dark:border-border-dark">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.queue.table.recipient')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.queue.table.subject')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.queue.table.priority')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.queue.table.status')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.queue.table.retries')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.queue.table.scheduled')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.queue.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-border-dark">
                  {queueItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <Icon name="inbox" className="text-slate-300 dark:text-slate-600 text-[48px] mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-text-secondary">
                          {t('admin.queue.empty')}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    queueItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors">
                        <td className="px-4 py-4">
                          <span className="text-sm font-mono text-slate-500 dark:text-slate-400">#{item.id}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Icon name="mail" className="text-slate-400 text-[18px]" />
                            <span className="text-sm text-slate-900 dark:text-white">{item.recipient}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-600 dark:text-slate-300 line-clamp-1">
                            {item.subject}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                            {getPriorityLabel(item.priority)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {item.retryCount} / {item.maxRetries || 3}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-500 dark:text-text-secondary">
                            {formatDate(item.scheduledAt)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {item.status === 'FAILED' && (
                              <button
                                onClick={() => setItemToRetry(item)}
                                className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                title={t('admin.queue.action.retry')}
                              >
                                <Icon name="refresh" className="text-[18px]" />
                              </button>
                            )}
                            {item.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => {
                                    setItemToChangePriority(item);
                                    setNewPriority(item.priority);
                                  }}
                                  className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                  title={t('admin.queue.action.change_priority')}
                                >
                                  <Icon name="low_priority" className="text-[18px]" />
                                </button>
                                <button
                                  onClick={() => setItemToCancel(item)}
                                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title={t('admin.queue.action.cancel')}
                                >
                                  <Icon name="cancel" className="text-[18px]" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-border-dark flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-text-secondary">
                {t('admin.queue.pagination.total', { total: pagination.total })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Icon name="chevron_left" className="text-[20px]" />
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-300 px-3">
                  {pagination.page} / {pagination.totalPages || 1}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Icon name="chevron_right" className="text-[20px]" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Queue Configuration Modal */}
      <Modal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title={t('admin.queue.config.title')}
        size="lg"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('admin.queue.config.worker_threads')}
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={configForm.workerThreads}
              onChange={(e) => setConfigForm({ ...configForm, workerThreads: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('admin.queue.config.worker_threads_desc')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('admin.queue.config.batch_size')}
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={configForm.batchSize}
              onChange={(e) => setConfigForm({ ...configForm, batchSize: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('admin.queue.config.batch_size_desc')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('admin.queue.config.max_retries')}
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={configForm.maxRetries}
              onChange={(e) => setConfigForm({ ...configForm, maxRetries: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('admin.queue.config.max_retries_desc')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('admin.queue.config.retry_delay')}
            </label>
            <input
              type="number"
              min="10"
              max="3600"
              value={configForm.retryDelaySeconds}
              onChange={(e) => setConfigForm({ ...configForm, retryDelaySeconds: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('admin.queue.config.retry_delay_desc')}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setShowConfigModal(false)}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              {t('admin.queue.config.cancel')}
            </button>
            <button
              onClick={handleSaveConfig}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              {t('admin.queue.config.save')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Retry Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!itemToRetry}
        title={t('admin.queue.modal.retry.title')}
        message={t('admin.queue.modal.retry.message', { recipient: itemToRetry?.recipient ?? '' })}
        confirmText={t('admin.queue.modal.common.confirm')}
        cancelText={t('admin.queue.modal.common.cancel')}
        onConfirm={() => itemToRetry && handleRetry(itemToRetry)}
        onCancel={() => setItemToRetry(null)}
        isDangerous={false}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!itemToCancel}
        title={t('admin.queue.modal.cancel.title')}
        message={t('admin.queue.modal.cancel.message', { recipient: itemToCancel?.recipient ?? '' })}
        confirmText={t('admin.queue.modal.common.confirm')}
        cancelText={t('admin.queue.modal.common.cancel')}
        onConfirm={() => itemToCancel && handleCancel(itemToCancel)}
        onCancel={() => setItemToCancel(null)}
        isDangerous={true}
      />

      {/* Change Priority Modal */}
      <Modal
        isOpen={!!itemToChangePriority}
        onClose={() => setItemToChangePriority(null)}
        title={t('admin.queue.modal.priority.title')}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('admin.queue.modal.priority.select')}
            </label>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as 'HIGH' | 'MEDIUM' | 'LOW')}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
            >
              <option value="HIGH">{getPriorityLabel('HIGH')}</option>
              <option value="MEDIUM">{getPriorityLabel('MEDIUM')}</option>
              <option value="LOW">{getPriorityLabel('LOW')}</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setItemToChangePriority(null)}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              {t('admin.queue.config.cancel')}
            </button>
            <button
              onClick={handleChangePriority}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              {t('admin.queue.modal.common.confirm')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Pause Queue Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showPauseConfirm}
        title={t('admin.queue.modal.pause.title')}
        message={t('admin.queue.modal.pause.message')}
        confirmText={t('admin.queue.modal.common.confirm')}
        cancelText={t('admin.queue.modal.common.cancel')}
        onConfirm={handlePauseQueue}
        onCancel={() => setShowPauseConfirm(false)}
        isDangerous={true}
      />

      {/* Resume Queue Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResumeConfirm}
        title={t('admin.queue.modal.resume.title')}
        message={t('admin.queue.modal.resume.message')}
        confirmText={t('admin.queue.modal.common.confirm')}
        cancelText={t('admin.queue.modal.common.cancel')}
        onConfirm={handleResumeQueue}
        onCancel={() => setShowResumeConfirm(false)}
        isDangerous={false}
      />
    </div>
  );
};
