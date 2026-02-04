import React, { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAppContext } from '../../context/AppContext';
import { adminApi } from '../../api/adminClient';
import { getEmailTypeDisplay, getEmailTypeLabel } from '../../utils/emailTypeTranslation';
import type { EmailAuditLogResponse, EmailStatisticsResponse, EmailQueryRequest, PaginationInfo } from './types';

/**
 * Admin Email Management Component
 * 管理员邮件管理页面
 */
export const AdminEmails: React.FC = () => {
  const { t, showToast, language } = useAppContext();
  
  // State
  const [emails, setEmails] = useState<EmailAuditLogResponse[]>([]);
  const [statistics, setStatistics] = useState<EmailStatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchRecipient, setSearchRecipient] = useState('');
  const [searchMessageId, setSearchMessageId] = useState('');
  const [searchErrorCode, setSearchErrorCode] = useState('');
  const [emailTypeFilter, setEmailTypeFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    size: 20,
    total: 0,
    totalPages: 0,
  });
  
  // Detail modal state
  const [selectedEmail, setSelectedEmail] = useState<EmailAuditLogResponse | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Batch operations state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showBatchRetryConfirm, setShowBatchRetryConfirm] = useState(false);
  const [batchOperationLoading, setBatchOperationLoading] = useState(false);
  
  // Resend confirmation state
  const [emailToResend, setEmailToResend] = useState<EmailAuditLogResponse | null>(null);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    fetchStatistics();
    fetchEmails();
  }, [pagination.page, emailTypeFilter, statusFilter]);

  const fetchStatistics = async () => {
    try {
      setStatsLoading(true);
      const result = await adminApi.emails.statistics();
      setStatistics(result.data);
    } catch (err: any) {
      console.error('Failed to fetch email statistics:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchEmails = async () => {
    try {
      setLoading(true);
      
      const params: EmailQueryRequest = {
        page: pagination.page,
        pageSize: pagination.size,
        recipient: searchRecipient || undefined,
        emailType: emailTypeFilter,
        status: statusFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy: 'created_at',
        sortOrder: 'desc',
      };

      const result = await adminApi.emails.list(params);
      setEmails(result.data.list);
      setPagination(prev => ({
        ...prev,
        total: result.data.total,
        totalPages: result.data.pages,
      }));
    } catch (err: any) {
      showToast(err.message || t('admin.emails.toast.load_failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchEmails();
  };

  const handleCleanup = async () => {
    const days = 90;
    const confirmed = window.confirm(
      t('admin.emails.confirm.cleanup', { days })
    );
    
    if (!confirmed) return;

    try {
      const result = await adminApi.emails.cleanup(days);
      showToast(result.data.message || t('admin.emails.toast.cleanup_success'), 'success');
      fetchEmails();
      fetchStatistics();
    } catch (err: any) {
      showToast(err.message || t('admin.emails.toast.cleanup_failed'), 'error');
    }
  };
  
  // View email details
  const handleViewDetails = async (email: EmailAuditLogResponse) => {
    try {
      setDetailLoading(true);
      setShowDetailModal(true);
      
      // Fetch full email details
      const result = await adminApi.emails.get(email.id);
      setSelectedEmail(result.data);
    } catch (err: any) {
      showToast(err.message || t('admin.emails.toast.detail_failed'), 'error');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };
  
  // Resend failed email
  const handleResendEmail = (email: EmailAuditLogResponse) => {
    setEmailToResend(email);
    setShowResendConfirm(true);
  };
  
  const confirmResendEmail = async () => {
    if (!emailToResend) return;
    
    try {
      setResendLoading(true);
      
      // Call the retry endpoint
      const result = await adminApi.emails.retry(emailToResend.id);
      
      showToast(t('admin.emails.toast.resend_success'), 'success');
      
      setShowResendConfirm(false);
      setEmailToResend(null);
      fetchEmails();
      fetchStatistics();
    } catch (err: any) {
      showToast(err.message || t('admin.emails.toast.resend_failed'), 'error');
    } finally {
      setResendLoading(false);
    }
  };
  
  // Batch operations
  const toggleSelectAll = () => {
    if (selectedIds.length === emails.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(emails.map(e => e.id));
    }
  };
  
  const toggleSelectEmail = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  const handleBatchDelete = () => {
    if (selectedIds.length === 0) {
      showToast(
        t('admin.emails.toast.select_delete'),
        'warning'
      );
      return;
    }
    setShowBatchDeleteConfirm(true);
  };
  
  const confirmBatchDelete = async () => {
    try {
      setBatchOperationLoading(true);
      
      // Call batch delete endpoint
      await adminApi.emails.batchDelete(selectedIds);
      
      showToast(t('admin.emails.toast.batch_delete_success', { count: selectedIds.length }), 'success');
      
      setShowBatchDeleteConfirm(false);
      setSelectedIds([]);
      fetchEmails();
      fetchStatistics();
    } catch (err: any) {
      showToast(err.message || t('admin.emails.toast.batch_delete_failed'), 'error');
    } finally {
      setBatchOperationLoading(false);
    }
  };
  
  const handleBatchRetry = () => {
    const failedEmails = emails.filter(e => selectedIds.includes(e.id) && e.status === 'FAILED');
    
    if (failedEmails.length === 0) {
      showToast(
        t('admin.emails.toast.select_retry'),
        'warning'
      );
      return;
    }
    setShowBatchRetryConfirm(true);
  };
  
  const confirmBatchRetry = async () => {
    try {
      setBatchOperationLoading(true);
      
      const failedIds = emails.filter(e => selectedIds.includes(e.id) && e.status === 'FAILED').map(e => e.id);
      
      // Call batch retry endpoint
      await adminApi.emails.batchRetry(failedIds);
      
      showToast(t('admin.emails.toast.batch_retry_success', { count: failedIds.length }), 'success');
      
      setShowBatchRetryConfirm(false);
      setSelectedIds([]);
      fetchEmails();
      fetchStatistics();
    } catch (err: any) {
      showToast(err.message || t('admin.emails.toast.batch_retry_failed'), 'error');
    } finally {
      setBatchOperationLoading(false);
    }
  };
  
  // Export to CSV
  const handleExportCSV = () => {
    try {
      // Prepare CSV data
      const headers = ['ID', 'Recipient', 'Subject', 'Type', 'Status', 'Message ID', 'Error Code', 'Error Message', 'Sent At', 'Created At'];
      const rows = emails.map(email => [
        email.id,
        email.recipient,
        email.subject || '',
        email.emailType,
        email.status,
        email.messageId || '',
        email.errorCode || '',
        email.errorMessage || '',
        email.sentAt || '',
        email.createdAt
      ]);
      
      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      // Create blob and download
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `email-logs-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast(t('admin.emails.toast.export_success'), 'success');
    } catch (err: any) {
      showToast(err.message || t('admin.emails.toast.export_failed'), 'error');
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      SUCCESS: t('admin.emails.status.success'),
      FAILED: t('admin.emails.status.failed'),
      PENDING: t('admin.emails.status.pending'),
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400';
      case 'FAILED':
        return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
      case 'PENDING':
        return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    }
  };

  // 用于筛选器选项的辅助函数
  const getEmailTypeFilterLabel = (type: string) => {
    return getEmailTypeLabel(type, language as 'zh' | 'en');
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
            {t('admin.emails.title')}
          </h1>
          <p className="text-slate-500 dark:text-text-secondary mt-1">
            {t('admin.emails.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportCSV}
            disabled={emails.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            <Icon name="download" className="text-[20px]" />
            <span>{t('admin.emails.action.export')}</span>
          </button>
          <button 
            onClick={handleCleanup}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            <Icon name="delete_sweep" className="text-[20px]" />
            <span>{t('admin.emails.action.cleanup')}</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-3"></div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
            </div>
          ))}
        </div>
      ) : statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-text-secondary">
                  {t('admin.emails.stats.total_sent')}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {statistics.totalSent.toLocaleString()}
                </p>
              </div>
              <div className="size-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                <Icon name="mail" className="text-indigo-600 dark:text-indigo-400 text-[24px]" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-text-secondary">
                  {t('admin.emails.stats.success_rate')}
                </p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {statistics.successRate.toFixed(1)}%
                </p>
              </div>
              <div className="size-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <Icon name="check_circle" className="text-emerald-600 dark:text-emerald-400 text-[24px]" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-text-secondary">
                  {t('admin.emails.stats.today')}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {statistics.todaySent.toLocaleString()}
                </p>
              </div>
              <div className="size-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Icon name="today" className="text-blue-600 dark:text-blue-400 text-[24px]" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-text-secondary">
                  {t('admin.emails.stats.failed')}
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {statistics.failedCount.toLocaleString()}
                </p>
              </div>
              <div className="size-12 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <Icon name="error" className="text-red-600 dark:text-red-400 text-[24px]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Recipient Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('admin.emails.filter.recipient')}
              </label>
              <div className="flex items-center bg-slate-50 dark:bg-[#1e293b] rounded-lg border border-slate-200 dark:border-slate-700 px-3 h-10">
                <Icon name="person" className="text-slate-400 dark:text-text-secondary text-[20px]" />
                <input
                  type="text"
                  value={searchRecipient}
                  onChange={(e) => setSearchRecipient(e.target.value)}
                  placeholder={t('admin.emails.filter.recipient_placeholder')}
                  className="flex-1 bg-transparent border-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-text-secondary focus:ring-0 p-0 ml-2 focus:outline-none"
                />
              </div>
            </div>
            
            {/* Message ID Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('admin.emails.filter.message_id')}
              </label>
              <div className="flex items-center bg-slate-50 dark:bg-[#1e293b] rounded-lg border border-slate-200 dark:border-slate-700 px-3 h-10">
                <Icon name="tag" className="text-slate-400 dark:text-text-secondary text-[20px]" />
                <input
                  type="text"
                  value={searchMessageId}
                  onChange={(e) => setSearchMessageId(e.target.value)}
                  placeholder={t('admin.emails.filter.message_id_placeholder')}
                  className="flex-1 bg-transparent border-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-text-secondary focus:ring-0 p-0 ml-2 focus:outline-none"
                />
              </div>
            </div>
            
            {/* Error Code Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('admin.emails.filter.error_code')}
              </label>
              <div className="flex items-center bg-slate-50 dark:bg-[#1e293b] rounded-lg border border-slate-200 dark:border-slate-700 px-3 h-10">
                <Icon name="error_outline" className="text-slate-400 dark:text-text-secondary text-[20px]" />
                <input
                  type="text"
                  value={searchErrorCode}
                  onChange={(e) => setSearchErrorCode(e.target.value)}
                  placeholder={t('admin.emails.filter.error_code_placeholder')}
                  className="flex-1 bg-transparent border-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-text-secondary focus:ring-0 p-0 ml-2 focus:outline-none"
                />
              </div>
            </div>

            {/* Email Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('admin.emails.filter.type')}
              </label>
              <select
                value={emailTypeFilter ?? ''}
                onChange={(e) => setEmailTypeFilter(e.target.value || undefined)}
                className="w-full h-10 px-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
              >
                <option value="">{t('admin.emails.filter.type_all')}</option>
                <option value="VERIFICATION">{getEmailTypeFilterLabel('VERIFICATION')}</option>
                <option value="PASSWORD_RESET">{getEmailTypeFilterLabel('PASSWORD_RESET')}</option>
                <option value="NOTIFICATION">{getEmailTypeFilterLabel('NOTIFICATION')}</option>
                <option value="WELCOME">{getEmailTypeFilterLabel('WELCOME')}</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('admin.emails.filter.status')}
              </label>
              <select
                value={statusFilter ?? ''}
                onChange={(e) => setStatusFilter(e.target.value || undefined)}
                className="w-full h-10 px-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
              >
                <option value="">{t('admin.emails.filter.status_all')}</option>
                <option value="SUCCESS">{getStatusLabel('SUCCESS')}</option>
                <option value="FAILED">{getStatusLabel('FAILED')}</option>
                <option value="PENDING">{getStatusLabel('PENDING')}</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('admin.emails.filter.start')}
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 px-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            
            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('admin.emails.filter.end')}
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-10 px-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchRecipient('');
                setSearchMessageId('');
                setSearchErrorCode('');
                setEmailTypeFilter(undefined);
                setStatusFilter(undefined);
                setStartDate('');
                setEndDate('');
              }}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {t('common.reset')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Icon name="search" className="text-[20px]" />
              <span>{t('common.search')}</span>
            </button>
          </div>
        </form>
      </div>
      
      {/* Batch Operations Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="check_circle" className="text-indigo-600 dark:text-indigo-400 text-[24px]" />
              <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                {t('admin.emails.batch.selected', { count: selectedIds.length })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchRetry}
                disabled={batchOperationLoading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
              >
                <Icon name="refresh" className="text-[18px]" />
                <span>{t('admin.emails.batch.retry')}</span>
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={batchOperationLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
              >
                <Icon name="delete" className="text-[18px]" />
                <span>{t('admin.emails.batch.delete')}</span>
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Logs Table */}
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
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === emails.length && emails.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.emails.table.recipient')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.emails.table.subject')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.emails.table.type')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.emails.table.status')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.emails.table.sent_at')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.emails.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {emails.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <Icon name="mail_outline" className="text-slate-300 dark:text-slate-600 text-[48px] mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-text-secondary">
                          {t('admin.emails.table.empty')}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    emails.map((email) => (
                      <tr key={email.id} className="hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(email.id)}
                            onChange={() => toggleSelectEmail(email.id)}
                            className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-mono text-slate-500 dark:text-slate-400">#{email.id}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Icon name="mail" className="text-slate-400 text-[18px]" />
                            <span className="text-sm text-slate-900 dark:text-white">{email.recipient}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-600 dark:text-slate-300 line-clamp-1">
                            {email.subject || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {getEmailTypeDisplay(email, language as 'zh' | 'en')}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(email.status)}`}>
                            {getStatusLabel(email.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-500 dark:text-text-secondary">
                            {formatDate(email.sentAt || email.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDetails(email)}
                              className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                              title={t('admin.emails.action.view')}
                            >
                              <Icon name="visibility" className="text-[18px]" />
                            </button>
                            {email.status === 'FAILED' && (
                              <button
                                onClick={() => handleResendEmail(email)}
                                className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                title={t('admin.emails.action.resend')}
                              >
                                <Icon name="refresh" className="text-[18px]" />
                              </button>
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
                {t('admin.emails.pagination.total', { total: pagination.total })}
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
      
      {/* Email Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedEmail(null);
        }}
        title={t('admin.emails.detail.title')}
        size="xl"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : selectedEmail ? (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t('admin.emails.detail.id')}
                </label>
                <p className="text-sm font-mono text-slate-900 dark:text-white">#{selectedEmail.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t('admin.emails.detail.message_id')}
                </label>
                <p className="text-sm font-mono text-slate-900 dark:text-white break-all">
                  {selectedEmail.messageId || '-'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t('admin.emails.detail.recipient')}
                </label>
                <p className="text-sm text-slate-900 dark:text-white">{selectedEmail.recipient}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t('admin.emails.detail.type')}
                </label>
                <p className="text-sm text-slate-900 dark:text-white">{getEmailTypeDisplay(selectedEmail, language as 'zh' | 'en')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t('admin.emails.detail.status')}
                </label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedEmail.status)}`}>
                  {getStatusLabel(selectedEmail.status)}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t('admin.emails.detail.sent_at')}
                </label>
                <p className="text-sm text-slate-900 dark:text-white">
                  {formatDate(selectedEmail.sentAt || selectedEmail.createdAt)}
                </p>
              </div>
            </div>
            
            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                {t('admin.emails.detail.subject')}
              </label>
              <p className="text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                {selectedEmail.subject || '-'}
              </p>
            </div>
            
            {/* Error Details (if failed) */}
            {selectedEmail.status === 'FAILED' && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Icon name="error" className="text-red-600 dark:text-red-400 text-[24px] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <h4 className="text-sm font-bold text-red-900 dark:text-red-100">
                      {t('admin.emails.detail.error.title')}
                    </h4>
                    {selectedEmail.errorCode && (
                      <div>
                        <label className="block text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                          {t('admin.emails.detail.error.code')}
                        </label>
                        <p className="text-sm font-mono text-red-900 dark:text-red-100">
                          {selectedEmail.errorCode}
                        </p>
                      </div>
                    )}
                    {selectedEmail.errorMessage && (
                      <div>
                        <label className="block text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                          {t('admin.emails.detail.error.message')}
                        </label>
                        <p className="text-sm text-red-900 dark:text-red-100">
                          {selectedEmail.errorMessage}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              {selectedEmail.status === 'FAILED' && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleResendEmail(selectedEmail);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Icon name="refresh" className="text-[20px]" />
                  <span>{t('admin.emails.action.resend')}</span>
                </button>
              )}
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedEmail(null);
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
      
      {/* Resend Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResendConfirm}
        title={t('admin.emails.modal.resend.title')}
        message={t('admin.emails.modal.resend.message', { recipient: emailToResend?.recipient ?? '' })}
        confirmText={resendLoading ? t('admin.emails.modal.resend.sending') : t('admin.emails.modal.resend.confirm')}
        cancelText={t('common.cancel')}
        onConfirm={confirmResendEmail}
        onCancel={() => {
          setShowResendConfirm(false);
          setEmailToResend(null);
        }}
        isDangerous={false}
      />
      
      {/* Batch Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showBatchDeleteConfirm}
        title={t('admin.emails.modal.batch_delete.title')}
        message={t('admin.emails.modal.batch_delete.message', { count: selectedIds.length })}
        confirmText={batchOperationLoading ? t('admin.emails.modal.batch_delete.deleting') : t('admin.emails.modal.batch_delete.confirm')}
        cancelText={t('common.cancel')}
        onConfirm={confirmBatchDelete}
        onCancel={() => setShowBatchDeleteConfirm(false)}
        isDangerous={true}
      />
      
      {/* Batch Retry Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showBatchRetryConfirm}
        title={t('admin.emails.modal.batch_retry.title')}
        message={t('admin.emails.modal.batch_retry.message')}
        confirmText={batchOperationLoading ? t('admin.emails.modal.batch_retry.retrying') : t('admin.emails.modal.batch_retry.confirm')}
        cancelText={t('common.cancel')}
        onConfirm={confirmBatchRetry}
        onCancel={() => setShowBatchRetryConfirm(false)}
        isDangerous={false}
      />
    </div>
  );
};
