import React, { useEffect, useState, useRef } from 'react';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAppContext } from '../../context/AppContext';
import { adminApi } from '../../api/adminClient';
import type { SuppressionResponse, SuppressionQueryRequest, PaginationInfo, AddSuppressionRequest } from './types';

/**
 * Admin Suppression List Component
 * 管理员抑制列表管理页面
 */
export const AdminSuppressionList: React.FC = () => {
  const { t, showToast, language } = useAppContext();
  
  // State
  const [suppressions, setSuppressions] = useState<SuppressionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [reasonFilter, setReasonFilter] = useState<string | undefined>(undefined);
  const [sourceFilter, setSourceFilter] = useState<string | undefined>(undefined);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    size: 20,
    total: 0,
    totalPages: 0,
  });
  
  // Add suppression modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddSuppressionRequest>({
    email: '',
    reason: 'HARD_BOUNCE',
    notes: '',
  });
  const [addLoading, setAddLoading] = useState(false);
  
  // Remove confirmation state
  const [emailToRemove, setEmailToRemove] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  
  // Batch operations state
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [showBatchRemoveConfirm, setShowBatchRemoveConfirm] = useState(false);
  const [batchOperationLoading, setBatchOperationLoading] = useState(false);
  
  // CSV import state
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSuppressions();
  }, [pagination.page, reasonFilter, sourceFilter]);

  const fetchSuppressions = async () => {
    try {
      setLoading(true);
      
      const params: SuppressionQueryRequest = {
        page: pagination.page,
        pageSize: pagination.size,
        email: searchEmail || undefined,
        reason: reasonFilter,
        source: sourceFilter,
      };

      const result = await adminApi.suppression.list(params);
      setSuppressions(result.data.list);
      setPagination(prev => ({
        ...prev,
        total: result.data.total,
        totalPages: result.data.pages,
      }));
    } catch (err: any) {
      showToast(err.message || (language === 'zh' ? '加载抑制列表失败' : 'Failed to load suppression list'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchSuppressions();
  };

  // Add to suppression list
  const handleAddSuppression = async () => {
    if (!addForm.email.trim()) {
      showToast(
        language === 'zh' ? '请输入邮箱地址' : 'Please enter email address',
        'warning'
      );
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(addForm.email)) {
      showToast(
        language === 'zh' ? '请输入有效的邮箱地址' : 'Please enter a valid email address',
        'warning'
      );
      return;
    }

    try {
      setAddLoading(true);
      
      await adminApi.suppression.add(addForm);
      
      showToast(
        language === 'zh' ? '添加成功' : 'Added successfully',
        'success'
      );
      
      setShowAddModal(false);
      setAddForm({
        email: '',
        reason: 'HARD_BOUNCE',
        notes: '',
      });
      fetchSuppressions();
    } catch (err: any) {
      showToast(err.message || (language === 'zh' ? '添加失败' : 'Failed to add'), 'error');
    } finally {
      setAddLoading(false);
    }
  };

  // Remove from suppression list
  const handleRemoveSuppression = (email: string) => {
    setEmailToRemove(email);
    setShowRemoveConfirm(true);
  };

  const confirmRemoveSuppression = async () => {
    if (!emailToRemove) return;
    
    try {
      setRemoveLoading(true);
      
      await adminApi.suppression.remove(emailToRemove);
      
      showToast(
        language === 'zh' ? '移除成功' : 'Removed successfully',
        'success'
      );
      
      setShowRemoveConfirm(false);
      setEmailToRemove(null);
      fetchSuppressions();
    } catch (err: any) {
      showToast(err.message || (language === 'zh' ? '移除失败' : 'Failed to remove'), 'error');
    } finally {
      setRemoveLoading(false);
    }
  };

  // Batch operations
  const toggleSelectAll = () => {
    if (selectedEmails.length === suppressions.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(suppressions.map(s => s.email));
    }
  };
  
  const toggleSelectEmail = (email: string) => {
    setSelectedEmails(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };
  
  const handleBatchRemove = () => {
    if (selectedEmails.length === 0) {
      showToast(
        language === 'zh' ? '请选择要移除的邮箱' : 'Please select emails to remove',
        'warning'
      );
      return;
    }
    setShowBatchRemoveConfirm(true);
  };
  
  const confirmBatchRemove = async () => {
    try {
      setBatchOperationLoading(true);
      
      // Remove each email sequentially
      for (const email of selectedEmails) {
        await adminApi.suppression.remove(email);
      }
      
      showToast(
        language === 'zh' ? `成功移除 ${selectedEmails.length} 个邮箱` : `Successfully removed ${selectedEmails.length} emails`,
        'success'
      );
      
      setShowBatchRemoveConfirm(false);
      setSelectedEmails([]);
      fetchSuppressions();
    } catch (err: any) {
      showToast(err.message || (language === 'zh' ? '批量移除失败' : 'Batch remove failed'), 'error');
    } finally {
      setBatchOperationLoading(false);
    }
  };

  // Export to CSV
  const handleExportCSV = async () => {
    try {
      const params: SuppressionQueryRequest = {
        email: searchEmail || undefined,
        reason: reasonFilter,
        source: sourceFilter,
      };

      const blob = await adminApi.suppression.export(params);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `suppression-list-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast(
        language === 'zh' ? 'CSV 导出成功' : 'CSV exported successfully',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || (language === 'zh' ? '导出失败' : 'Export failed'), 'error');
    }
  };

  // Import from CSV
  const handleImportCSV = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header line
      const dataLines = lines.slice(1);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const line of dataLines) {
        const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        
        if (parts.length >= 2) {
          const email = parts[0];
          const reason = parts[1] as 'HARD_BOUNCE' | 'SOFT_BOUNCE' | 'COMPLAINT';
          const notes = parts.length > 4 ? parts[4] : undefined;
          
          try {
            await adminApi.suppression.add({ email, reason, notes });
            successCount++;
          } catch {
            errorCount++;
          }
        }
      }
      
      showToast(
        language === 'zh' 
          ? `导入完成：成功 ${successCount} 个，失败 ${errorCount} 个` 
          : `Import completed: ${successCount} succeeded, ${errorCount} failed`,
        successCount > 0 ? 'success' : 'warning'
      );
      
      fetchSuppressions();
    } catch (err: any) {
      showToast(err.message || (language === 'zh' ? '导入失败' : 'Import failed'), 'error');
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, { zh: string; en: string }> = {
      HARD_BOUNCE: { zh: '硬退信', en: 'Hard Bounce' },
      SOFT_BOUNCE: { zh: '软退信', en: 'Soft Bounce' },
      COMPLAINT: { zh: '投诉', en: 'Complaint' },
    };
    return language === 'zh' ? labels[reason]?.zh || reason : labels[reason]?.en || reason;
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'HARD_BOUNCE':
        return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
      case 'SOFT_BOUNCE':
        return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400';
      case 'COMPLAINT':
        return 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US');
  };

  // Calculate soft bounce statistics
  const softBounceStats = suppressions.filter(s => s.reason === 'SOFT_BOUNCE' && s.softBounceCount >= 2);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {language === 'zh' ? '抑制列表管理' : 'Suppression List Management'}
          </h1>
          <p className="text-slate-500 dark:text-text-secondary mt-1">
            {language === 'zh' ? '管理邮件抑制列表，防止向退信和投诉地址发送邮件' : 'Manage email suppression list to prevent sending to bounced and complained addresses'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleImportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Icon name="upload" className="text-[20px]" />
            <span>{language === 'zh' ? '导入 CSV' : 'Import CSV'}</span>
          </button>
          <button 
            onClick={handleExportCSV}
            disabled={suppressions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            <Icon name="download" className="text-[20px]" />
            <span>{language === 'zh' ? '导出 CSV' : 'Export CSV'}</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            <Icon name="add" className="text-[20px]" />
            <span>{language === 'zh' ? '添加抑制' : 'Add Suppression'}</span>
          </button>
        </div>
      </div>

      {/* Hidden file input for CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Soft Bounce Statistics */}
      {softBounceStats.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Icon name="warning" className="text-amber-600 dark:text-amber-400 text-[24px] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100 mb-1">
                {language === 'zh' ? '软退信警告' : 'Soft Bounce Warning'}
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {language === 'zh' 
                  ? `有 ${softBounceStats.length} 个邮箱的软退信次数 ≥ 2 次，即将被永久抑制` 
                  : `${softBounceStats.length} emails have soft bounce count ≥ 2 and will be permanently suppressed soon`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {softBounceStats.slice(0, 5).map(s => (
                  <span key={s.email} className="text-xs font-mono bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 px-2 py-1 rounded">
                    {s.email} ({s.softBounceCount}x)
                  </span>
                ))}
                {softBounceStats.length > 5 && (
                  <span className="text-xs text-amber-700 dark:text-amber-300">
                    {language === 'zh' ? `还有 ${softBounceStats.length - 5} 个...` : `and ${softBounceStats.length - 5} more...`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-text-secondary">
                {language === 'zh' ? '总抑制数' : 'Total Suppressed'}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {pagination.total.toLocaleString()}
              </p>
            </div>
            <div className="size-12 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
              <Icon name="block" className="text-slate-600 dark:text-slate-400 text-[24px]" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-text-secondary">
                {language === 'zh' ? '硬退信' : 'Hard Bounces'}
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                {suppressions.filter(s => s.reason === 'HARD_BOUNCE').length}
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
                {language === 'zh' ? '软退信' : 'Soft Bounces'}
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {suppressions.filter(s => s.reason === 'SOFT_BOUNCE').length}
              </p>
            </div>
            <div className="size-12 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Icon name="warning" className="text-amber-600 dark:text-amber-400 text-[24px]" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-text-secondary">
                {language === 'zh' ? '投诉' : 'Complaints'}
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {suppressions.filter(s => s.reason === 'COMPLAINT').length}
              </p>
            </div>
            <div className="size-12 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <Icon name="report" className="text-purple-600 dark:text-purple-400 text-[24px]" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Email Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {language === 'zh' ? '邮箱地址' : 'Email Address'}
              </label>
              <div className="flex items-center bg-slate-50 dark:bg-[#1e293b] rounded-lg border border-slate-200 dark:border-slate-700 px-3 h-10">
                <Icon name="mail" className="text-slate-400 dark:text-text-secondary text-[20px]" />
                <input
                  type="text"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder={language === 'zh' ? '搜索邮箱地址' : 'Search email'}
                  className="flex-1 bg-transparent border-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-text-secondary focus:ring-0 p-0 ml-2 focus:outline-none"
                />
              </div>
            </div>

            {/* Reason Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {language === 'zh' ? '抑制原因' : 'Reason'}
              </label>
              <select
                value={reasonFilter ?? ''}
                onChange={(e) => setReasonFilter(e.target.value || undefined)}
                className="w-full h-10 px-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
              >
                <option value="">{language === 'zh' ? '全部原因' : 'All Reasons'}</option>
                <option value="HARD_BOUNCE">{getReasonLabel('HARD_BOUNCE')}</option>
                <option value="SOFT_BOUNCE">{getReasonLabel('SOFT_BOUNCE')}</option>
                <option value="COMPLAINT">{getReasonLabel('COMPLAINT')}</option>
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {language === 'zh' ? '来源' : 'Source'}
              </label>
              <div className="flex items-center bg-slate-50 dark:bg-[#1e293b] rounded-lg border border-slate-200 dark:border-slate-700 px-3 h-10">
                <Icon name="source" className="text-slate-400 dark:text-text-secondary text-[20px]" />
                <input
                  type="text"
                  value={sourceFilter ?? ''}
                  onChange={(e) => setSourceFilter(e.target.value || undefined)}
                  placeholder={language === 'zh' ? '搜索来源' : 'Search source'}
                  className="flex-1 bg-transparent border-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-text-secondary focus:ring-0 p-0 ml-2 focus:outline-none"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchEmail('');
                setReasonFilter(undefined);
                setSourceFilter(undefined);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {language === 'zh' ? '重置' : 'Reset'}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Icon name="search" className="text-[20px]" />
              <span>{language === 'zh' ? '搜索' : 'Search'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Batch Operations Toolbar */}
      {selectedEmails.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="check_circle" className="text-indigo-600 dark:text-indigo-400 text-[24px]" />
              <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                {language === 'zh' ? `已选择 ${selectedEmails.length} 项` : `${selectedEmails.length} items selected`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchRemove}
                disabled={batchOperationLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
              >
                <Icon name="delete" className="text-[18px]" />
                <span>{language === 'zh' ? '批量移除' : 'Batch Remove'}</span>
              </button>
              <button
                onClick={() => setSelectedEmails([])}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suppression List Table */}
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
                        checked={selectedEmails.length === suppressions.length && suppressions.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {language === 'zh' ? '邮箱地址' : 'Email Address'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {language === 'zh' ? '抑制原因' : 'Reason'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {language === 'zh' ? '来源' : 'Source'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {language === 'zh' ? '软退信次数' : 'Soft Bounce Count'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {language === 'zh' ? '备注' : 'Notes'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {language === 'zh' ? '创建时间' : 'Created At'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {language === 'zh' ? '操作' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-border-dark">
                  {suppressions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <Icon name="block" className="text-slate-300 dark:text-slate-600 text-[48px] mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-text-secondary">
                          {language === 'zh' ? '暂无抑制记录' : 'No suppression records found'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    suppressions.map((suppression) => (
                      <tr key={suppression.id} className="hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedEmails.includes(suppression.email)}
                            onChange={() => toggleSelectEmail(suppression.email)}
                            className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Icon name="mail" className="text-slate-400 text-[18px]" />
                            <span className="text-sm font-mono text-slate-900 dark:text-white">{suppression.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getReasonColor(suppression.reason)}`}>
                            {getReasonLabel(suppression.reason)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {suppression.source || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-sm font-medium ${suppression.softBounceCount >= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}`}>
                            {suppression.softBounceCount}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-600 dark:text-slate-300 line-clamp-1">
                            {suppression.notes || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-500 dark:text-text-secondary">
                            {formatDate(suppression.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => handleRemoveSuppression(suppression.email)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title={language === 'zh' ? '移除' : 'Remove'}
                          >
                            <Icon name="delete" className="text-[18px]" />
                          </button>
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
                {language === 'zh' ? `共 ${pagination.total} 条记录` : `Total ${pagination.total} records`}
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

      {/* Add Suppression Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setAddForm({
            email: '',
            reason: 'HARD_BOUNCE',
            notes: '',
          });
        }}
        title={language === 'zh' ? '添加到抑制列表' : 'Add to Suppression List'}
      >
        <div className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {language === 'zh' ? '邮箱地址' : 'Email Address'} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder={language === 'zh' ? '输入邮箱地址' : 'Enter email address'}
              className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-text-secondary focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Reason Select */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {language === 'zh' ? '抑制原因' : 'Reason'} <span className="text-red-500">*</span>
            </label>
            <select
              value={addForm.reason}
              onChange={(e) => setAddForm(prev => ({ ...prev, reason: e.target.value as any }))}
              className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
            >
              <option value="HARD_BOUNCE">{getReasonLabel('HARD_BOUNCE')}</option>
              <option value="SOFT_BOUNCE">{getReasonLabel('SOFT_BOUNCE')}</option>
              <option value="COMPLAINT">{getReasonLabel('COMPLAINT')}</option>
            </select>
          </div>

          {/* Notes Textarea */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {language === 'zh' ? '备注' : 'Notes'}
            </label>
            <textarea
              value={addForm.notes}
              onChange={(e) => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={language === 'zh' ? '添加备注信息（可选）' : 'Add notes (optional)'}
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-text-secondary focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                setShowAddModal(false);
                setAddForm({
                  email: '',
                  reason: 'HARD_BOUNCE',
                  notes: '',
                });
              }}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              {language === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleAddSuppression}
              disabled={addLoading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {addLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>{addLoading ? (language === 'zh' ? '添加中...' : 'Adding...') : (language === 'zh' ? '添加' : 'Add')}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Remove Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRemoveConfirm}
        title={language === 'zh' ? '确认移除' : 'Confirm Remove'}
        message={
          language === 'zh'
            ? `确定要从抑制列表中移除 ${emailToRemove} 吗？移除后该邮箱将可以接收邮件。`
            : `Are you sure you want to remove ${emailToRemove} from the suppression list? This email will be able to receive emails after removal.`
        }
        confirmText={removeLoading ? (language === 'zh' ? '移除中...' : 'Removing...') : (language === 'zh' ? '确认移除' : 'Confirm Remove')}
        cancelText={language === 'zh' ? '取消' : 'Cancel'}
        onConfirm={confirmRemoveSuppression}
        onCancel={() => {
          setShowRemoveConfirm(false);
          setEmailToRemove(null);
        }}
        isDangerous={true}
      />

      {/* Batch Remove Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showBatchRemoveConfirm}
        title={language === 'zh' ? '确认批量移除' : 'Confirm Batch Remove'}
        message={
          language === 'zh'
            ? `确定要从抑制列表中移除选中的 ${selectedEmails.length} 个邮箱吗？移除后这些邮箱将可以接收邮件。`
            : `Are you sure you want to remove ${selectedEmails.length} selected emails from the suppression list? These emails will be able to receive emails after removal.`
        }
        confirmText={batchOperationLoading ? (language === 'zh' ? '移除中...' : 'Removing...') : (language === 'zh' ? '确认移除' : 'Confirm Remove')}
        cancelText={language === 'zh' ? '取消' : 'Cancel'}
        onConfirm={confirmBatchRemove}
        onCancel={() => setShowBatchRemoveConfirm(false)}
        isDangerous={true}
      />
    </div>
  );
};
