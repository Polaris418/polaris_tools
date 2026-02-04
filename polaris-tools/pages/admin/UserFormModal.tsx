import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { useAppContext } from '../../context/AppContext';
import { adminApi } from '../../api/adminClient';
import type { AdminUserResponse, AdminUserUpdateRequest } from './types';

interface UserFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  user: AdminUserResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface CreateFormData {
  username: string;
  email: string;
  password: string;
  nickname: string;
  planType: number;
  status: number;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  mode,
  user,
  onClose,
  onSuccess,
}) => {
  const { t, language, showToast } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AdminUserUpdateRequest>({
    nickname: '',
    email: '',
    planType: 0,
    planExpiredAt: undefined,
    status: 1,
  });
  const [createFormData, setCreateFormData] = useState<CreateFormData>({
    username: '',
    email: '',
    password: '',
    nickname: '',
    planType: 0,
    status: 1,
  });

  // Initialize form data
  useEffect(() => {
    if (mode === 'edit' && user) {
      setFormData({
        nickname: user.nickname || '',
        email: user.email,
        planType: user.planType,
        planExpiredAt: user.planExpiredAt || undefined,
        status: user.status,
      });
    } else {
      setFormData({
        nickname: '',
        email: '',
        planType: 0,
        planExpiredAt: undefined,
        status: 1,
      });
      setCreateFormData({
        username: '',
        email: '',
        password: '',
        nickname: '',
        planType: 0,
        status: 1,
      });
    }
  }, [mode, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'create') {
      if (!createFormData.username || !createFormData.email || !createFormData.password) {
        showToast(t('message.required_fields'), 'warning');
        return;
      }
    } else {
      if (!formData.email) {
        showToast(t('message.required_fields'), 'warning');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'create') {
        await adminApi.users.create(createFormData);
      } else if (user) {
        await adminApi.users.update(user.id, formData);
      }
      showToast(t('message.success'), 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || t('message.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? t('admin.users.add') : t('admin.users.edit')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'edit' && user && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium">{t('admin.users.form.username')}:</span> {user.username}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              <span className="font-medium">{t('admin.users.form.created')}:</span> {new Date(user.createdAt).toLocaleString()}
            </p>
          </div>
        )}

        {/* Create mode fields */}
        {mode === 'create' && (
          <>
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('admin.users.form.username')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={createFormData.username}
                onChange={(e) => setCreateFormData({ ...createFormData, username: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder={t('admin.users.form.username')}
                required
              />
            </div>
            
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('admin.users.form.password')} <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={createFormData.password}
                onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder={t('admin.users.form.password_placeholder')}
                minLength={6}
                required
              />
            </div>
          </>
        )}

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('admin.users.form.email')} <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={mode === 'create' ? createFormData.email : formData.email}
            onChange={(e) => mode === 'create' 
              ? setCreateFormData({ ...createFormData, email: e.target.value })
              : setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder={t('admin.email_placeholder')}
            required
          />
        </div>

        {/* Nickname */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('admin.users.form.nickname')}
          </label>
          <input
            type="text"
            value={mode === 'create' ? createFormData.nickname : formData.nickname}
            onChange={(e) => mode === 'create'
              ? setCreateFormData({ ...createFormData, nickname: e.target.value })
              : setFormData({ ...formData, nickname: e.target.value })}
            className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder={t('admin.users.form.nickname_placeholder')}
          />
        </div>

        {/* Plan Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('admin.users.form.plan_type')}
          </label>
          <select
            value={mode === 'create' ? createFormData.planType : formData.planType}
            onChange={(e) => mode === 'create'
              ? setCreateFormData({ ...createFormData, planType: Number(e.target.value) })
              : setFormData({ ...formData, planType: Number(e.target.value) })}
            className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
          >
            <option value={0}>{t('admin.users.plan_free')}</option>
            <option value={1}>{t('admin.users.plan_pro')}</option>
            <option value={2}>{t('admin.users.plan_admin')}</option>
          </select>
        </div>

        {/* Plan Expired At - Only for edit mode with paid plans */}
        {mode === 'edit' && formData.planType !== 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('admin.users.form.plan_expiration')}
            </label>
            <input
              type="datetime-local"
              value={formData.planExpiredAt ? formData.planExpiredAt.slice(0, 16) : ''}
              onChange={(e) => setFormData({ ...formData, planExpiredAt: e.target.value ? e.target.value + ':00Z' : undefined })}
              className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        )}

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('admin.users.form.status')}
          </label>
          <select
            value={mode === 'create' ? createFormData.status : formData.status}
            onChange={(e) => mode === 'create'
              ? setCreateFormData({ ...createFormData, status: Number(e.target.value) })
              : setFormData({ ...formData, status: Number(e.target.value) })}
            className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
          >
            <option value={1}>{t('status.active')}</option>
            <option value={0}>{t('status.disabled')}</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-border-dark">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
