import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { Icon } from '../../components/Icon';
import { useAppContext } from '../../context/AppContext';
import { adminApi } from '../../api/adminClient';
import type { ToolResponse, ToolUpdateRequest, CategoryResponse } from './types';

interface ToolFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  tool: ToolResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ToolFormModal: React.FC<ToolFormModalProps> = ({
  isOpen,
  mode,
  tool,
  onClose,
  onSuccess,
}) => {
  const { t, language, showToast } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [formData, setFormData] = useState<ToolUpdateRequest>({
    name: '',
    nameZh: '',
    description: '',
    descriptionZh: '',
    categoryId: undefined,
    icon: 'build',
    url: '',
    toolType: 0,
    isFeatured: 0,
    sortOrder: 0,
    status: 1,
  });

  // Load categories
  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  // Initialize form data
  useEffect(() => {
    if (mode === 'edit' && tool) {
      setFormData({
        name: tool.name,
        nameZh: tool.nameZh || '',
        description: tool.description || '',
        descriptionZh: tool.descriptionZh || '',
        categoryId: tool.categoryId,
        icon: tool.icon,
        url: tool.url || '',
        toolType: tool.toolType,
        isFeatured: tool.isFeatured,
        sortOrder: tool.sortOrder,
        status: tool.status,
      });
    } else {
      setFormData({
        name: '',
        nameZh: '',
        description: '',
        descriptionZh: '',
        categoryId: undefined,
        icon: 'build',
        url: '',
        toolType: 0,
        isFeatured: 0,
        sortOrder: 0,
        status: 1,
      });
    }
  }, [mode, tool]);

  const loadCategories = async () => {
    try {
      const result = await adminApi.categories.list();
      setCategories(result.data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.categoryId) {
      showToast(t('message.required_fields'), 'warning');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'create') {
        await adminApi.tools.create(formData as any);
      } else if (tool) {
        await adminApi.tools.update(tool.id, formData);
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
    'build', 'description', 'image', 'code', 'palette', 'calculate',
    'text_fields', 'data_object', 'terminal', 'security', 'translate',
    'schedule', 'link', 'qr_code', 'photo_camera', 'videocam'
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? t('admin.tools.add') : t('admin.tools.edit')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('admin.tools.form.name')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder={t('admin.tools.form.name_placeholder')}
            required
          />
        </div>

        {/* Name (Chinese) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('admin.tools.form.name_zh')}
          </label>
          <input
            type="text"
            value={formData.nameZh}
            onChange={(e) => setFormData({ ...formData, nameZh: e.target.value })}
            className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder={t('admin.tools.form.name_zh_placeholder')}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('admin.tools.form.category')} <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.categoryId || ''}
            onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
            className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
            required
          >
            <option value="">{t('admin.tools.form.select_category')}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {language === 'zh' && cat.nameZh ? cat.nameZh : cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Icon */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('admin.tools.form.icon')}
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

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('admin.tools.form.description')}
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            placeholder={t('admin.tools.form.description_placeholder')}
          />
        </div>

        {/* Description (Chinese) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('admin.tools.form.description_zh')}
          </label>
          <textarea
            value={formData.descriptionZh}
            onChange={(e) => setFormData({ ...formData, descriptionZh: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            placeholder={t('admin.tools.form.description_placeholder')}
          />
        </div>

        {/* URL */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('admin.tools.form.url')}
          </label>
          <input
            type="text"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder={t('admin.tools.form.url_placeholder')}
          />
        </div>

        {/* Options Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('admin.tools.form.sort_order')}
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
              {t('admin.tools.form.status')}
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

        {/* Checkboxes */}
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isFeatured === 1}
              onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked ? 1 : 0 })}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {t('admin.tools.form.featured')}
            </span>
          </label>
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
