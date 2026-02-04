import React, { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { useAppContext } from '../../context/AppContext';
import { adminApi } from '../../api/adminClient';
import { ToolFormModal } from './ToolFormModal';
import { DeletedDataActions } from '../../components/DeletedDataActions';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { ToolResponse, ToolQueryRequest, PaginationInfo, ModalState } from './types';

/**
 * Admin Tools Management Component
 * 管理员工具管理页面
 */
export const AdminTools: React.FC = () => {
  const { t, language, showToast, showConfirm } = useAppContext();
  
  // State
  const [tools, setTools] = useState<ToolResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>(undefined);
  const [showDeleted, setShowDeleted] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    size: 10,
    total: 0,
    totalPages: 0,
  });
  const [modal, setModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [selectedTool, setSelectedTool] = useState<ToolResponse | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: number | null; name: string }>({ 
    isOpen: false, 
    id: null, 
    name: '' 
  });
  const [operationLoading, setOperationLoading] = useState(false);

  useEffect(() => {
    fetchTools();
  }, [pagination.page, statusFilter, categoryFilter, showDeleted]);

  const fetchTools = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: ToolQueryRequest = {
        page: pagination.page,
        size: pagination.size,
        keyword: searchKeyword || undefined,
        status: statusFilter,
        categoryId: categoryFilter,
        includeDeleted: showDeleted || undefined,
      };

      const result = await adminApi.tools.list(params);
      setTools(result.data.list);
      setPagination(prev => ({
        ...prev,
        total: result.data.total,
        totalPages: result.data.pages,
      }));
    } catch (err: any) {
      setError(err.message || t('admin.error.load_tools'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchTools();
  };

  const handleToggleStatus = async (tool: ToolResponse) => {
    try {
      const newStatus = tool.status === 1 ? 0 : 1;
      await adminApi.tools.update(tool.id, { status: newStatus });
      // 重新获取数据，保持当前筛选条件
      await fetchTools();
      showToast(t('admin.tools.status_updated'), 'success');
    } catch (err: any) {
      showToast(err.message || t('admin.error.update_tool_status'), 'error');
    }
  };

  const handleAdd = () => {
    setSelectedTool(null);
    setModal({ isOpen: true, mode: 'create' });
  };

  const handleEdit = (tool: ToolResponse) => {
    setSelectedTool(tool);
    setModal({ isOpen: true, mode: 'edit' });
    // 编辑模态框支持编辑已删除记录，deleted状态将被保留
  };

  const handleModalClose = () => {
    setModal({ isOpen: false, mode: 'create' });
    setSelectedTool(null);
  };

  const handleModalSuccess = () => {
    fetchTools();
  };

  const handleDelete = async (tool: ToolResponse) => {
    // 防止重复删除
    if (deletingIds.has(tool.id)) {
      return;
    }
    
    const confirmed = await showConfirm({
      title: t('confirm.delete_title'),
      message: t('admin.tools.confirm_delete', { name: tool.name }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      type: 'danger',
    });
    
    if (!confirmed) return;
    
    // 确认后再次检查，防止在等待确认期间已被删除
    if (deletingIds.has(tool.id)) {
      return;
    }
    
    // 标记正在删除
    setDeletingIds(prev => new Set(prev).add(tool.id));
    
    try {
      await adminApi.tools.delete(tool.id);
      showToast(t('admin.tools.deleted'), 'success');
      // 删除成功后刷新列表
      await fetchTools();
    } catch (err: any) {
      showToast(err.message || t('admin.error.delete_tool'), 'error');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(tool.id);
        return next;
      });
    }
  };

  // 恢复已删除工具
  const handleRestore = async (id: number) => {
    try {
      setOperationLoading(true);
      await adminApi.tools.restore(id);
      showToast(t('deleted.restoreSuccess'), 'success');
      // 刷新列表，保持当前筛选状态
      await fetchTools();
    } catch (err: any) {
      showToast(err.message || t('deleted.restoreFailed'), 'error');
    } finally {
      setOperationLoading(false);
    }
  };

  // 显示永久删除确认对话框
  const handlePermanentDelete = (tool: ToolResponse) => {
    setDeleteConfirmation({ 
      isOpen: true, 
      id: tool.id, 
      name: tool.name 
    });
  };

  // 确认永久删除
  const confirmPermanentDelete = async () => {
    if (!deleteConfirmation.id) return;
    
    try {
      setOperationLoading(true);
      await adminApi.tools.permanentDelete(deleteConfirmation.id);
      showToast(t('deleted.permanentDeleteSuccess'), 'success');
      setDeleteConfirmation({ isOpen: false, id: null, name: '' });
      // 刷新列表，保持当前筛选状态
      await fetchTools();
    } catch (err: any) {
      showToast(err.message || t('deleted.permanentDeleteFailed'), 'error');
    } finally {
      setOperationLoading(false);
    }
  };

  // 取消永久删除
  const cancelPermanentDelete = () => {
    setDeleteConfirmation({ isOpen: false, id: null, name: '' });
  };

  const getStatusLabel = (status: number) => {
    return status === 1 ? t('status.active') : t('status.disabled');
  };

  const getStatusColor = (status: number) => {
    return status === 1
      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
      : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t('admin.tools.title')}
          </h1>
          <p className="text-slate-500 dark:text-text-secondary mt-1">
            {t('admin.tools.subtitle')}
          </p>
        </div>
        <button 
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
        >
          <Icon name="add_circle" className="text-[20px]" />
          <span>{t('admin.tools.add')}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="flex items-center bg-slate-50 dark:bg-[#1e293b] rounded-lg border border-slate-200 dark:border-slate-700 px-3 h-10">
              <Icon name="search" className="text-slate-400 dark:text-text-secondary text-[20px]" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder={t('admin.tools.search_placeholder')}
                className="flex-1 bg-transparent border-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-text-secondary focus:ring-0 p-0 ml-2 focus:outline-none"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter ?? ''}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) : undefined;
              setStatusFilter(value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="h-10 px-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
          >
            <option value="">{t('admin.tools.all_status')}</option>
            <option value="1">{t('status.active')}</option>
            <option value="0">{t('status.disabled')}</option>
          </select>

          {/* Deleted Filter Toggle */}
          <button
            type="button"
            onClick={() => {
              setShowDeleted(!showDeleted);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className={`h-10 px-4 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              showDeleted 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            <Icon name="delete" className="text-[18px]" />
            <span>{t('status.deleted')}</span>
          </button>

          <button
            type="submit"
            className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            {t('common.search')}
          </button>
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <Icon name="error" className="text-red-600 dark:text-red-400 text-[20px] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {t('admin.tools.error_fetch')}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Tools Table */}
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
                      {t('admin.tools.form.name')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.tools.category')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.tools.usage')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.tools.form.status')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.tools.created')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.tools.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tools.map((tool) => (
                    <tr key={tool.id} className={`hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors ${tool.deleted === 1 ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 flex items-center justify-center flex-shrink-0">
                            <Icon name={tool.icon} className="text-indigo-600 dark:text-indigo-400 text-[20px]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {language === 'zh' && tool.nameZh ? tool.nameZh : tool.name}
                              </p>
                              {tool.deleted === 1 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                  {t('status.deleted')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-text-secondary truncate max-w-xs">
                              {language === 'zh' && tool.descriptionZh ? tool.descriptionZh : tool.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          {tool.categoryName || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          {tool.useCount?.toLocaleString() || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tool.status)}`}>
                          {getStatusLabel(tool.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-500 dark:text-text-secondary">
                          {new Date(tool.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {tool.deleted === 1 ? (
                          <DeletedDataActions
                            record={tool}
                            onEdit={handleEdit}
                            onRestore={handleRestore}
                            onPermanentDelete={async (id) => handlePermanentDelete(tool)}
                            isDeleted={true}
                            t={t}
                          />
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(tool)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                              title={t('common.edit')}
                            >
                              <Icon name="edit" className="text-[18px]" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(tool)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                tool.status === 1 
                                  ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' 
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                              }`}
                              title={tool.status === 1 ? t('action.disable') : t('action.enable')}
                            >
                              <Icon name={tool.status === 1 ? 'block' : 'check_circle'} className="text-[18px]" />
                            </button>
                            <button
                              onClick={() => handleDelete(tool)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title={t('common.delete')}
                            >
                              <Icon name="delete" className="text-[18px]" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-border-dark flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-text-secondary">
                {t('pagination.total', { total: pagination.total })}
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

      {/* Tool Form Modal */}
      <ToolFormModal
        isOpen={modal.isOpen}
        mode={modal.mode as 'create' | 'edit'}
        tool={selectedTool}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />

      {/* Permanent Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        title={t('deleted.confirmPermanentDelete')}
        message={t('deleted.permanentDeleteWarning', { name: deleteConfirmation.name })}
        confirmText={t('deleted.permanentDelete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmPermanentDelete}
        onCancel={cancelPermanentDelete}
        isDangerous={true}
      />
    </div>
  );
};
