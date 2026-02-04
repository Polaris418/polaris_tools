import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { Icon } from '../../components/Icon';
import { useAppContext } from '../../context/AppContext';
import { adminApi } from '../../api/adminClient';
import type { CategoryResponse, CategoryUpdateRequest } from './types';

interface CategoryFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  category: CategoryResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  mode,
  category,
  onClose,
  onSuccess,
}) => {
  const { t, language, showToast } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CategoryUpdateRequest>({
    name: '',
    nameZh: '',
    icon: 'category',
    accentColor: 'bg-indigo-500',
    description: '',
    sortOrder: 0,
    status: 1,
  });

  // Initialize form data
  useEffect(() => {
    if (mode === 'edit' && category) {
      setFormData({
        name: category.name,
        nameZh: category.nameZh || '',
        icon: category.icon,
        accentColor: category.accentColor,
        description: category.description || '',
        sortOrder: category.sortOrder,
        status: category.status,
      });
    } else {
      setFormData({
        name: '',
        nameZh: '',
        icon: 'category',
        accentColor: 'bg-indigo-500',
        description: '',
        sortOrder: 0,
        status: 1,
      });
    }
  }, [mode, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      showToast(t('message.required_fields'), 'warning');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'create') {
        await adminApi.categories.create(formData as any);
      } else if (category) {
        await adminApi.categories.update(category.id, formData);
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

  const commonIcons = [
    'category', 'description', 'image', 'code', 'palette', 'build',
    'terminal', 'security', 'translate', 'text_fields', 'data_object',
    'picture_as_pdf', 'title', 'swap_horiz', 'numbers'
  ];

  const accentColors = [
    { name: 'Indigo', value: 'bg-indigo-500' },
    { name: 'Purple', value: 'bg-purple-500' },
    { name: 'Blue', value: 'bg-blue-500' },
    { name: 'Emerald', value: 'bg-emerald-500' },
    { name: 'Amber', value: 'bg-amber-500' },
    { name: 'Rose', value: 'bg-rose-500' },
    { name: 'Pink', value: 'bg-pink-500' },
    { name: 'Cyan', value: 'bg-cyan-500' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? t('admin.categories.add') : t('admin.categories.edit')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('admin.categories.form.name')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder={t('admin.categories.form.name_placeholder')}
            required
          />
        </div>

        {/* Name (Chinese) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('admin.categories.form.name_zh')}
          </label>
          <input
            type="text"
            value={formData.nameZh}
            onChange={(e) => setFormData({ ...formData, nameZh: e.target.value })}
            className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder={t('admin.categories.form.name_zh_placeholder')}
          />
        </div>

        {/* Icon */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('admin.categories.form.icon')}
          </label>
          <div className="grid grid-cols-8 gap-2 mb-2">
            {commonIcons.map((iconName) => (
              <button
                key={iconName}
                type="button"
                onClick={() => setFormData({ ...formData, icon: iconName })}
                className={`p-2 rounded-lg border-2 transition-all ${
                  formData.icon === iconName
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <Icon name={iconName} className="text-[20px] text-slate-700 dark:text-slate-300" />
              </button>
            ))}
          </div>
          <input
            type="text"
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder={t('admin.icon_placeholder')}
          />
        </div>

        {/* Accent Color */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('admin.categories.form.accent_color')}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {accentColors.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setFormData({ ...formData, accentColor: color.value })}
                className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center ${
                  formData.accentColor === color.value
                    ? 'border-indigo-500'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className={`w-6 h-6 rounded-full ${color.value}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('admin.categories.form.description')}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            placeholder={t('admin.categories.form.description_placeholder')}
          />
        </div>

        {/* Options Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('admin.categories.form.sort_order')}
            </label>
            <input
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              min="0"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('admin.categories.form.status')}
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
            >
              <option value="1">{t('status.active')}</option>
              <option value="0">{t('status.disabled')}</option>
            </select>
          </div>
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
