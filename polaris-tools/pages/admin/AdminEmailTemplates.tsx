import React, { useEffect, useState, useRef } from 'react';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAppContext } from '../../context/AppContext';
import { adminApi } from '../../api/adminClient';
import type { 
  EmailTemplateResponse, 
  EmailTemplateQueryRequest,
  EmailTemplateUpdateRequest,
  EmailTemplatePreviewRequest,
  PaginationInfo 
} from './types';

/**
 * Admin Email Templates Component
 * 管理员邮件模板管理页面
 */
export const AdminEmailTemplates: React.FC = () => {
  const { t, showToast, language } = useAppContext();
  
  // Add error boundary state
  const [hasError, setHasError] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  // Catch errors during rendering
  React.useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('[AdminEmailTemplates] Runtime error:', error);
      setHasError(true);
      setErrorMessage(error.message);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Show error UI if component crashed
  if (hasError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 max-w-md">
          <div className="size-20 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <Icon name="error" className="text-4xl text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {t('admin.templates.error.title')}
          </h2>
          <p className="text-slate-500 dark:text-text-secondary mb-4">
            {errorMessage || t('admin.templates.error.message')}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            {t('admin.templates.error.reload')}
          </button>
        </div>
      </div>
    );
  }
  
  // State
  const [templates, setTemplates] = useState<EmailTemplateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [languageFilter, setLanguageFilter] = useState<string | undefined>(undefined);
  const [codeFilter, setCodeFilter] = useState<string | undefined>(undefined);
  const [enabledFilter, setEnabledFilter] = useState<boolean | undefined>(undefined);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    size: 20,
    total: 0,
    totalPages: 0,
  });
  
  // Editor modal state
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateResponse | null>(null);
  const [editorLoading, setEditorLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    language: 'zh-CN',
    subject: '',
    htmlContent: '',
    textContent: '',
    enabled: true,
  });
  
  // Preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<{
    subject: string;
    htmlContent: string;
    textContent: string;
  } | null>(null);
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Test email modal state
  const [showTestEmailModal, setShowTestEmailModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplateResponse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Editor refs
  const htmlEditorRef = useRef<HTMLTextAreaElement>(null);
  const textEditorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchTemplates();
  }, [pagination.page, pagination.size, languageFilter, codeFilter, enabledFilter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      
      const params: EmailTemplateQueryRequest = {
        page: pagination.page,
        size: pagination.size,
        language: languageFilter,
        code: codeFilter,
        enabled: enabledFilter,
      };

      const result = await adminApi.templates.list(params);
      
      // Backend returns Result<List<EmailTemplateResponse>>, not PageResult
      // So result.data is the array directly
      const templateList = Array.isArray(result.data) ? result.data : result.data.list || [];
      
      setTemplates(templateList);
      setPagination(prev => ({
        ...prev,
        total: templateList.length,
        totalPages: Math.ceil(templateList.length / prev.size),
      }));
    } catch (err: any) {
      console.error('[AdminEmailTemplates] Error fetching templates:', err);
      showToast(err.message || t('admin.templates.toast.load_failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset to first page when filters change
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleCreateTemplate = () => {
    setEditorMode('create');
    setSelectedTemplate(null);
    setFormData({
      code: '',
      name: '',
      language: 'zh-CN',
      subject: '',
      htmlContent: '',
      textContent: '',
      enabled: true,
    });
    setShowEditorModal(true);
  };

  const handleEditTemplate = async (template: EmailTemplateResponse) => {
    try {
      setEditorLoading(true);
      setShowEditorModal(true);
      
      // Fetch full template details using code and language
      const result = await adminApi.templates.get(template.code, template.language);
      const fullTemplate = result.data;
      
      setEditorMode('edit');
      setSelectedTemplate(fullTemplate);
      setFormData({
        code: fullTemplate.code,
        name: fullTemplate.name,
        language: fullTemplate.language,
        subject: fullTemplate.subject,
        htmlContent: fullTemplate.htmlContent,
        textContent: fullTemplate.textContent,
        enabled: fullTemplate.enabled,
      });
    } catch (err: any) {
      showToast(err.message || t('admin.templates.toast.detail_failed'), 'error');
      setShowEditorModal(false);
    } finally {
      setEditorLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      setEditorLoading(true);
      
      if (editorMode === 'create') {
        await adminApi.templates.create({
          code: formData.code,
          name: formData.name,
          language: formData.language,
          subject: formData.subject,
          htmlContent: formData.htmlContent,
          textContent: formData.textContent,
          enabled: formData.enabled,
          version: 1,
        });
        showToast(
          t('admin.templates.toast.create_success'),
          'success'
        );
      } else if (selectedTemplate) {
        await adminApi.templates.update(selectedTemplate.id, {
          code: selectedTemplate.code,
          language: selectedTemplate.language,
          name: formData.name,
          subject: formData.subject,
          htmlContent: formData.htmlContent,
          textContent: formData.textContent,
          enabled: formData.enabled,
          version: selectedTemplate.version + 1, // Increment version
        });
        showToast(
          t('admin.templates.toast.update_success'),
          'success'
        );
      }
      
      setShowEditorModal(false);
      fetchTemplates();
    } catch (err: any) {
      showToast(err.message || t('admin.templates.toast.save_failed'), 'error');
    } finally {
      setEditorLoading(false);
    }
  };

  const handleDeleteTemplate = (template: EmailTemplateResponse) => {
    setTemplateToDelete(template);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    
    try {
      setDeleteLoading(true);
      await adminApi.templates.delete(templateToDelete.id);
      
      showToast(
        t('admin.templates.toast.delete_success'),
        'success'
      );
      
      setShowDeleteConfirm(false);
      setTemplateToDelete(null);
      fetchTemplates();
    } catch (err: any) {
      showToast(err.message || t('admin.templates.toast.delete_failed'), 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePreviewTemplate = async (template: EmailTemplateResponse) => {
    try {
      setPreviewLoading(true);
      setShowPreviewModal(true);
      
      // Generate sample variables based on template variables
      const sampleVars: Record<string, string> = {};
      if (template.variables && Array.isArray(template.variables)) {
        template.variables.forEach(varName => {
          sampleVars[varName] = getSampleValue(varName);
        });
      }
      setPreviewVariables(sampleVars);
      
      // Fetch preview using code and language
      const request: EmailTemplatePreviewRequest = {
        code: template.code,
        language: template.language,
        variables: sampleVars,
      };
      
      const result = await adminApi.templates.preview(request);
      setPreviewData(result.data);
    } catch (err: any) {
      showToast(err.message || t('admin.templates.toast.preview_failed'), 'error');
      setShowPreviewModal(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!selectedTemplate || !testEmail) {
      showToast(
        t('admin.templates.toast.test_email_required'),
        'warning'
      );
      return;
    }
    
    try {
      setTestEmailLoading(true);
      
      const sampleVars: Record<string, string> = {};
      if (selectedTemplate.variables && Array.isArray(selectedTemplate.variables)) {
        selectedTemplate.variables.forEach(varName => {
          sampleVars[varName] = getSampleValue(varName);
        });
      }
      
      await adminApi.templates.sendTest(selectedTemplate.id, testEmail, sampleVars);
      
      showToast(
        t('admin.templates.toast.test_email_sent'),
        'success'
      );
      
      setShowTestEmailModal(false);
      setTestEmail('');
    } catch (err: any) {
      showToast(err.message || t('admin.templates.toast.test_email_failed'), 'error');
    } finally {
      setTestEmailLoading(false);
    }
  };

  const getSampleValue = (varName: string): string => {
    const samples: Record<string, string> = {
      username: 'John Doe',
      email: 'john.doe@example.com',
      verificationCode: '123456',
      verificationLink: 'https://polaristools.online/verify?token=abc123',
      resetLink: 'https://polaristools.online/reset-password?token=xyz789',
      loginTime: new Date().toLocaleString(),
      ipAddress: '192.168.1.1',
      device: 'Chrome on Windows',
      toolName: 'Base64 Encoder',
      notificationTitle: 'System Update',
      notificationContent: 'A new version is available',
    };
    return samples[varName] || `[${varName}]`;
  };

  const insertVariable = (varName: string, target: 'html' | 'text') => {
    const variable = `\${${varName}}`;
    const ref = target === 'html' ? htmlEditorRef : textEditorRef;
    
    if (ref.current) {
      const start = ref.current.selectionStart;
      const end = ref.current.selectionEnd;
      const text = ref.current.value;
      const newText = text.substring(0, start) + variable + text.substring(end);
      
      if (target === 'html') {
        setFormData(prev => ({ ...prev, htmlContent: newText }));
      } else {
        setFormData(prev => ({ ...prev, textContent: newText }));
      }
      
      // Set cursor position after inserted variable
      setTimeout(() => {
        if (ref.current) {
          ref.current.focus();
          ref.current.setSelectionRange(start + variable.length, start + variable.length);
        }
      }, 0);
    }
  };

  const getTemplateTypeLabel = (code: string) => {
    return t(`admin.templates.type.${code}`, { code });
  };

  const getLanguageLabel = (lang: string) => t(`admin.templates.lang.${lang}`, { lang });

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
            {t('admin.templates.title')}
          </h1>
          <p className="text-slate-500 dark:text-text-secondary mt-1">
            {t('admin.templates.subtitle')}
          </p>
        </div>
        <button 
          onClick={handleCreateTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
        >
          <Icon name="add" className="text-[20px]" />
          <span>{t('admin.templates.create')}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-border-dark p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Language Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('admin.templates.filter.language')}
              </label>
              <select
                value={languageFilter ?? ''}
                onChange={(e) => setLanguageFilter(e.target.value || undefined)}
                className="w-full h-10 px-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
              >
                <option value="">{t('admin.templates.filter.language_all')}</option>
                <option value="zh-CN">{getLanguageLabel('zh-CN')}</option>
                <option value="en-US">{getLanguageLabel('en-US')}</option>
              </select>
            </div>
            
            {/* Template Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('admin.templates.filter.type')}
              </label>
              <select
                value={codeFilter ?? ''}
                onChange={(e) => setCodeFilter(e.target.value || undefined)}
                className="w-full h-10 px-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
              >
                <option value="">{t('admin.templates.filter.type_all')}</option>
                <option value="VERIFICATION_CODE_REGISTER">{getTemplateTypeLabel('VERIFICATION_CODE_REGISTER')}</option>
                <option value="VERIFICATION_CODE_LOGIN">{getTemplateTypeLabel('VERIFICATION_CODE_LOGIN')}</option>
                <option value="VERIFICATION_CODE_RESET">{getTemplateTypeLabel('VERIFICATION_CODE_RESET')}</option>
                <option value="VERIFICATION_CODE_CHANGE">{getTemplateTypeLabel('VERIFICATION_CODE_CHANGE')}</option>
                <option value="EMAIL_VERIFICATION">{getTemplateTypeLabel('EMAIL_VERIFICATION')}</option>
                <option value="EMAIL_VERIFICATION_SUCCESS">{getTemplateTypeLabel('EMAIL_VERIFICATION_SUCCESS')}</option>
                <option value="PASSWORD_RESET">{getTemplateTypeLabel('PASSWORD_RESET')}</option>
                <option value="PASSWORD_CHANGE_CODE">{getTemplateTypeLabel('PASSWORD_CHANGE_CODE')}</option>
                <option value="PASSWORD_CHANGED">{getTemplateTypeLabel('PASSWORD_CHANGED')}</option>
                <option value="WELCOME_EMAIL">{getTemplateTypeLabel('WELCOME_EMAIL')}</option>
                <option value="REGISTRATION_WELCOME">{getTemplateTypeLabel('REGISTRATION_WELCOME')}</option>
                <option value="ACCOUNT_ACTIVATION">{getTemplateTypeLabel('ACCOUNT_ACTIVATION')}</option>
                <option value="ACCOUNT_SUSPENSION">{getTemplateTypeLabel('ACCOUNT_SUSPENSION')}</option>
                <option value="SUBSCRIPTION_CONFIRMATION">{getTemplateTypeLabel('SUBSCRIPTION_CONFIRMATION')}</option>
                <option value="UNSUBSCRIBE_CONFIRMATION">{getTemplateTypeLabel('UNSUBSCRIBE_CONFIRMATION')}</option>
                <option value="LOGIN_NOTIFICATION">{getTemplateTypeLabel('LOGIN_NOTIFICATION')}</option>
                <option value="EMAIL_CHANGE_NOTIFICATION">{getTemplateTypeLabel('EMAIL_CHANGE_NOTIFICATION')}</option>
                <option value="SECURITY_ALERT">{getTemplateTypeLabel('SECURITY_ALERT')}</option>
                <option value="SYSTEM_MAINTENANCE">{getTemplateTypeLabel('SYSTEM_MAINTENANCE')}</option>
              </select>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('admin.templates.filter.status')}
              </label>
              <select
                value={enabledFilter === undefined ? '' : enabledFilter.toString()}
                onChange={(e) => setEnabledFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
                className="w-full h-10 px-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
              >
                <option value="">{t('admin.templates.filter.status_all')}</option>
                <option value="true">{t('status.enabled')}</option>
                <option value="false">{t('status.disabled')}</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setLanguageFilter(undefined);
                setCodeFilter(undefined);
                setEnabledFilter(undefined);
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

      {/* Templates Table */}
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
                      {t('admin.templates.table.name')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.templates.table.type')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.templates.table.language')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.templates.table.status')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.templates.table.version')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.templates.table.updated_at')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('admin.templates.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-border-dark">
                  {templates.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <Icon name="description" className="text-slate-300 dark:text-slate-600 text-[48px] mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-text-secondary">
                          {t('admin.templates.table.empty')}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    templates.map((template) => (
                      <tr key={template.id} className="hover:bg-slate-50 dark:hover:bg-[#1e293b] transition-colors">
                        <td className="px-4 py-4">
                          <span className="text-sm font-mono text-slate-500 dark:text-slate-400">#{template.id}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Icon name="mail" className="text-indigo-500 text-[18px]" />
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{template.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {getTemplateTypeLabel(template.code)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {getLanguageLabel(template.language)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            template.enabled
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            {template.enabled ? t('status.enabled') : t('status.disabled')}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-500 dark:text-text-secondary">
                            v{template.version}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-500 dark:text-text-secondary">
                            {formatDate(template.updatedAt)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePreviewTemplate(template)}
                              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title={t('admin.templates.action.preview')}
                            >
                              <Icon name="visibility" className="text-[18px]" />
                            </button>
                            <button
                              onClick={() => handleEditTemplate(template)}
                              className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                              title={t('admin.templates.action.edit')}
                            >
                              <Icon name="edit" className="text-[18px]" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTemplate(template);
                                setShowTestEmailModal(true);
                              }}
                              className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                              title={t('admin.templates.action.send_test')}
                            >
                              <Icon name="send" className="text-[18px]" />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template)}
                              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title={t('admin.templates.action.delete')}
                            >
                              <Icon name="delete" className="text-[18px]" />
                            </button>
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
                {t('admin.templates.pagination.total', { total: pagination.total })}
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

      {/* Editor Modal */}
      <Modal
        isOpen={showEditorModal}
        onClose={() => {
          setShowEditorModal(false);
          setSelectedTemplate(null);
        }}
        title={editorMode === 'create' ? t('admin.templates.editor.title.create') : t('admin.templates.editor.title.edit')}
        size="2xl"
      >
        {editorLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('admin.templates.editor.code')} *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  disabled={editorMode === 'edit'}
                  placeholder="VERIFICATION"
                  className="w-full h-10 px-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('admin.templates.editor.language')} *
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                  disabled={editorMode === 'edit'}
                  className="w-full h-10 px-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
                >
                  <option value="zh-CN">{getLanguageLabel('zh-CN')}</option>
                  <option value="en-US">{getLanguageLabel('en-US')}</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('admin.templates.editor.name')} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('admin.templates.editor.placeholder.name')}
                className="w-full h-10 px-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('admin.templates.editor.subject')} *
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder={t('admin.templates.editor.placeholder.subject')}
                className="w-full h-10 px-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            
            {/* Variable Helper */}
            {selectedTemplate && selectedTemplate.variables && Array.isArray(selectedTemplate.variables) && selectedTemplate.variables.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Icon name="info" className="text-blue-600 dark:text-blue-400 text-[20px] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-2">
                      {t('admin.templates.editor.variables.title')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.variables.map(varName => (
                        <button
                          key={varName}
                          onClick={() => insertVariable(varName, 'html')}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-xs font-mono hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                        >
                          ${'{' + varName + '}'}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                      {t('admin.templates.editor.variables.hint')}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* HTML Content Editor */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('admin.templates.editor.html')} *
              </label>
              <textarea
                ref={htmlEditorRef}
                value={formData.htmlContent}
                onChange={(e) => setFormData(prev => ({ ...prev, htmlContent: e.target.value }))}
                placeholder={t('admin.templates.editor.placeholder.html')}
                rows={12}
                className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
              />
            </div>
            
            {/* Text Content Editor */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('admin.templates.editor.text')}
              </label>
              <textarea
                ref={textEditorRef}
                value={formData.textContent}
                onChange={(e) => setFormData(prev => ({ ...prev, textContent: e.target.value }))}
                placeholder={t('admin.templates.editor.placeholder.text')}
                rows={8}
                className="w-full px-3 py-2 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
              />
            </div>
            
            {/* Status Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
              />
              <label htmlFor="enabled" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                {t('admin.templates.editor.enable')}
              </label>
            </div>
            
            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setShowEditorModal(false);
                  setSelectedTemplate(null);
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!formData.code || !formData.name || !formData.subject || !formData.htmlContent}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Icon name="save" className="text-[20px]" />
                <span>{t('common.save')}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
      
      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setPreviewData(null);
        }}
        title={t('admin.templates.preview.title')}
        size="2xl"
      >
        {previewLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : previewData ? (
          <div className="space-y-6">
            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                {t('admin.templates.preview.subject')}
              </label>
              <p className="text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                {previewData.subject}
              </p>
            </div>
            
            {/* HTML Preview */}
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                {t('admin.templates.preview.html')}
              </label>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <iframe
                  srcDoc={previewData.htmlContent}
                  className="w-full h-96 bg-white"
                  title="Email Preview"
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
            </div>
            
            {/* Text Content */}
            {previewData.textContent && (
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {t('admin.templates.preview.text')}
                </label>
                <pre className="text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 p-3 rounded-lg whitespace-pre-wrap font-mono">
                  {previewData.textContent}
                </pre>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewData(null);
                }}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
      
      {/* Test Email Modal */}
      <Modal
        isOpen={showTestEmailModal}
        onClose={() => {
          setShowTestEmailModal(false);
          setTestEmail('');
        }}
        title={t('admin.templates.test.title')}
        size="md"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Icon name="info" className="text-blue-600 dark:text-blue-400 text-[20px] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  {t('admin.templates.test.desc')}
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('admin.templates.test.email')} *
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full h-10 px-3 bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                setShowTestEmailModal(false);
                setTestEmail('');
              }}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSendTestEmail}
              disabled={!testEmail || testEmailLoading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Icon name="send" className="text-[20px]" />
              <span>{testEmailLoading ? t('admin.templates.test.sending') : t('admin.templates.test.send')}</span>
            </button>
          </div>
        </div>
      </Modal>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={t('admin.templates.delete.title')}
        message={t('admin.templates.delete.message', { name: templateToDelete?.name ?? '' })}
        confirmText={deleteLoading ? t('admin.templates.delete.confirming') : t('admin.templates.delete.confirm')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDeleteTemplate}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setTemplateToDelete(null);
        }}
        isDangerous={true}
      />
    </div>
  );
};
