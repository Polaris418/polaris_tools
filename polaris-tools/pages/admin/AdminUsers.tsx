import React, { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { useAppContext } from '../../context/AppContext';
import { adminApi } from '../../api/adminClient';
import { UserFormModal } from './UserFormModal';
import { DeletedDataActions } from '../../components/DeletedDataActions';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { AdminUserResponse, UserQueryRequest, ModalState, PaginationInfo } from './types';

/**
 * Admin Users Management Component
 * 管理员用户管理页面
 */
export const AdminUsers: React.FC = () => {
  const { t, showToast, showConfirm } = useAppContext();
  
  // State
  const [users, setUsers] = useState<AdminUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [planFilter, setPlanFilter] = useState<number | undefined>(undefined);
  const [showDeleted, setShowDeleted] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    size: 10,
    total: 0,
    totalPages: 0,
  });
  const [modal, setModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [selectedUser, setSelectedUser] = useState<AdminUserResponse | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: number | null; name: string }>({ 
    isOpen: false, 
    id: null, 
    name: '' 
  });
  const [operationLoading, setOperationLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, statusFilter, planFilter, showDeleted]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: UserQueryRequest = {
        page: pagination.page,
        size: pagination.size,
        keyword: searchKeyword || undefined,
        status: statusFilter,
        planType: planFilter,
        includeDeleted: showDeleted || undefined,
      };

      const result = await adminApi.users.list(params);
      setUsers(result.data.list);
      setPagination(prev => ({
        ...prev,
        total: result.data.total,
        totalPages: result.data.pages,
      }));
    } catch (err: any) {
      setError(err.message || t('admin.error.load_users'));
      // 使用模拟数据
      setUsers([
        { id: 1, username: 'admin', email: 'admin@polaris.com', nickname: 'Administrator', planType: 2, status: 1, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', lastLoginAt: '2024-01-20T10:00:00Z' },
        { id: 2, username: 'john_doe', email: 'john@example.com', nickname: 'John Doe', planType: 1, status: 1, createdAt: '2024-01-15T00:00:00Z', updatedAt: '2024-01-15T00:00:00Z', lastLoginAt: '2024-01-19T15:30:00Z' },
        { id: 3, username: 'jane_smith', email: 'jane@example.com', nickname: 'Jane Smith', planType: 0, status: 1, createdAt: '2024-01-18T00:00:00Z', updatedAt: '2024-01-18T00:00:00Z' },
        { id: 4, username: 'bob_wilson', email: 'bob@example.com', nickname: 'Bob Wilson', planType: 1, status: 0, createdAt: '2024-01-10T00:00:00Z', updatedAt: '2024-01-10T00:00:00Z' },
      ]);
      setPagination(prev => ({ ...prev, total: 4, totalPages: 1 }));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchUsers();
  };

  const handleToggleStatus = async (user: AdminUserResponse) => {
    try {
      const newStatus = user.status === 1 ? 0 : 1;
      await adminApi.users.toggleStatus(user.id, newStatus);
      // 重新获取数据，保持当前筛选条件
      await fetchUsers();
      showToast(t('admin.tools.status_updated'), 'success');
    } catch (err: any) {
      showToast(err.message || t('admin.error.update_user_status'), 'error');
    }
  };

  const handleAdd = () => {
    setSelectedUser(null);
    setModal({ isOpen: true, mode: 'create' });
  };

  const handleEdit = (user: AdminUserResponse) => {
    setSelectedUser(user);
    setModal({ isOpen: true, mode: 'edit' });
    // 编辑模态框支持编辑已删除记录，deleted状态将被保留
  };

  const handleModalClose = () => {
    setModal({ isOpen: false, mode: 'create' });
    setSelectedUser(null);
  };

  const handleModalSuccess = () => {
    fetchUsers();
  };

  const handleDelete = async (user: AdminUserResponse) => {
    // 防止重复删除
    if (deletingIds.has(user.id)) {
      return;
    }
    
    const confirmed = await showConfirm({
      title: t('confirm.delete_title'),
      message: t('admin.users.confirm_delete', { username: user.username }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      type: 'danger',
    });
    
    if (!confirmed) return;
    
    // 确认后再次检查，防止在等待确认期间已被删除
    if (deletingIds.has(user.id)) {
      return;
    }
    
    // 标记正在删除
    setDeletingIds(prev => new Set(prev).add(user.id));
    
    try {
      await adminApi.users.delete(user.id);
      showToast(t('message.delete_success'), 'success');
      // 删除成功后刷新列表
      await fetchUsers();
    } catch (err: any) {
      showToast(err.message || t('admin.error.delete_user'), 'error');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  };

  // 恢复已删除用户
  const handleRestore = async (id: number) => {
    try {
      setOperationLoading(true);
      await adminApi.users.restore(id);
      showToast(t('deleted.restoreSuccess'), 'success');
      // 刷新列表，保持当前筛选状态
      await fetchUsers();
    } catch (err: any) {
      showToast(err.message || t('deleted.restoreFailed'), 'error');
    } finally {
      setOperationLoading(false);
    }
  };

  // 显示永久删除确认对话框
  const handlePermanentDelete = (user: AdminUserResponse) => {
    setDeleteConfirmation({ 
      isOpen: true, 
      id: user.id, 
      name: user.username 
    });
  };

  // 确认永久删除
  const confirmPermanentDelete = async () => {
    if (!deleteConfirmation.id) return;
    
    try {
      setOperationLoading(true);
      await adminApi.users.permanentDelete(deleteConfirmation.id);
      showToast(t('deleted.permanentDeleteSuccess'), 'success');
      setDeleteConfirmation({ isOpen: false, id: null, name: '' });
      // 刷新列表，保持当前筛选状态
      await fetchUsers();
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

  const getPlanLabel = (planType: number) => {
    switch (planType) {
      case 0: return t('admin.users.plan_free');
      case 1: return t('admin.users.plan_pro');
      case 2: return t('admin.users.plan_enterprise');
      default: return t('admin.users.plan_unknown');
    }
  };

  const getPlanColor = (planType: number) => {
    switch (planType) {
      case 0: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
      case 1: return 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400';
      case 2: return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
    }
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
            {t('admin.users.title')}
          </h1>
          <p className="text-slate-500 dark:text-text-secondary mt-1">
            {t('admin.users.subtitle')}
          </p>
        </div>
        <button 
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
        >
          <Icon name="person_add" className="text-[20px]" />
          <span>{t('admin.users.add')}</span>
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
                placeholder={t('admin.users.search_placeholder')}
                className="flex-1 bg-transparent border-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-text-secondary focus:ring-0 p-0 ml-2 focus:outline-none"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter ?? ''}
            onChange={(e) => setStatusFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="h-10 px-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
            aria-label={t('admin.users.all_status')}
          >
            <option value="">{t('admin.users.all_status')}</option>
            <option value="1">{t('status.active')}</option>
            <option value="0">{t('status.disabled')}</option>
          </select>

          {/* Plan Filter */}
          <select
            value={planFilter ?? ''}
            onChange={(e) => setPlanFilter(e.target.value ? Number(e.target.value) : undefined)}
            className="h-10 px-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
            aria-label={t('admin.users.all_plans')}
          >
            <option value="">{t('admin.users.all_plans')}</option>
            <option value="0">{t('admin.users.plan_free')}</option>
            <option value="1">{t('admin.users.plan_pro')}</option>
            <option value="2">{t('admin.users.plan_enterprise')}</option>
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
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
          <Icon name="warning" className="text-amber-600 dark:text-amber-400 text-[20px] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {t('admin.users.error_fetch')}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              {t('admin.users.error_mock')}
            </p>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden relative">
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
                      {t('admin.users.form.username')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.users.form.email')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.users.form.plan_type')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.users.form.status')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.users.last_login')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.tools.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((user) => (
                    <tr key={user.id} className={`hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors ${user.deleted === 1 ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-sm font-bold flex-shrink-0">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{user.nickname || user.username}</p>
                              {user.deleted === 1 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                  {t('status.deleted')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-text-secondary">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{user.email}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanColor(user.planType)}`}>
                          {getPlanLabel(user.planType)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                          {getStatusLabel(user.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-500 dark:text-text-secondary">
                          {user.lastLoginAt 
                            ? new Date(user.lastLoginAt).toLocaleString()
                            : t('admin.users.never_login')}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {user.deleted === 1 ? (
                          <DeletedDataActions
                            record={user}
                            onEdit={handleEdit}
                            onRestore={handleRestore}
                            onPermanentDelete={async (id) => handlePermanentDelete(user)}
                            isDeleted={true}
                            t={t}
                          />
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                              title={t('common.edit')}
                            >
                              <Icon name="edit" className="text-[18px]" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(user)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                user.status === 1 
                                  ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' 
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                              }`}
                              title={user.status === 1 ? t('action.disable') : t('action.enable')}
                            >
                              <Icon name={user.status === 1 ? 'block' : 'check_circle'} className="text-[18px]" />
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
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
                  title={t('pagination.previous')}
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
                  title={t('pagination.next')}
                >
                  <Icon name="chevron_right" className="text-[20px]" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Operation Loading Overlay */}
        {operationLoading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}
      </div>

      {/* User Form Modal */}
      <UserFormModal
        isOpen={modal.isOpen}
        mode={modal.mode as 'create' | 'edit'}
        user={selectedUser}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />

      {/* Permanent Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmation.isOpen}
        title={t('deleted.confirmPermanentDelete')}
        message={t('deleted.permanentDeleteMessage', { name: deleteConfirmation.name })}
        confirmText={t('deleted.permanentDelete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmPermanentDelete}
        onCancel={cancelPermanentDelete}
        isDangerous={true}
      />
    </div>
  );
};
