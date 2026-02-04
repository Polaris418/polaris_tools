import React from 'react';
import { FileItem, FileStatus, TEMPLATE_OPTIONS } from './types';
import { useAppContext } from '../../context/AppContext';

interface FileListProps {
  files: FileItem[];
  globalTemplate: string;
  onRemove: (id: string) => void;
  onTemplateOverride: (id: string, template: string) => void;
  onRetry?: (id: string) => void;
}

/**
 * 文件列表组件 - 显示批量转换队列
 */
export const FileList: React.FC<FileListProps> = ({ 
  files, 
  globalTemplate, 
  onRemove, 
  onTemplateOverride,
  onRetry 
}) => {
  const { language, t } = useAppContext();

  if (files.length === 0) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getGlobalTemplateLabel = () => {
    const template = TEMPLATE_OPTIONS.find(t => t.value === globalTemplate);
    return language === 'zh' ? template?.labelZh : template?.label;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('md2word.file_name')}
            </th>
            <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('md2word.size')}
            </th>
            <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('md2word.template')}
            </th>
            <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('md2word.status')}
            </th>
            <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
              {t('md2word.actions')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-sm">
          {files.map((file) => (
            <tr key={file.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">description</span>
                  <span className="truncate max-w-[200px]">{file.name}</span>
                </div>
              </td>
              <td className="py-3 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                {formatFileSize(file.size)}
              </td>
              <td className="py-3 px-4">
                {file.status === FileStatus.Pending ? (
                  <select 
                    className="bg-transparent border-b border-dashed border-slate-400 dark:border-slate-600 text-xs py-0.5 focus:outline-none focus:border-indigo-500 text-slate-600 dark:text-slate-400 cursor-pointer"
                    value={file.templateOverride || ''}
                    onChange={(e) => onTemplateOverride(file.id, e.target.value)}
                  >
                    <option value="">
                      {t('md2word.global_template', { template: getGlobalTemplateLabel() })}
                    </option>
                    {TEMPLATE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {language === 'zh' ? opt.labelZh : opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400 text-xs">
                    {file.templateOverride 
                      ? (language === 'zh' 
                          ? TEMPLATE_OPTIONS.find(t => t.value === file.templateOverride)?.labelZh 
                          : TEMPLATE_OPTIONS.find(t => t.value === file.templateOverride)?.label)
                      : t('md2word.global_template', { template: getGlobalTemplateLabel() })}
                  </span>
                )}
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={file.status} progress={file.progress} language={language} t={t} />
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {file.status === FileStatus.Error && onRetry && (
                    <button 
                      onClick={() => onRetry(file.id)}
                      className="text-indigo-500 hover:text-indigo-600 transition-colors p-1"
                      title={t('md2word.retry')}
                    >
                      <span className="material-symbols-outlined text-xl">refresh</span>
                    </button>
                  )}
                  <button 
                    onClick={() => onRemove(file.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                    title={file.status === FileStatus.Converting ? t('md2word.cancel') : t('md2word.remove')}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {file.status === FileStatus.Converting ? 'close' : 'delete'}
                    </span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface StatusBadgeProps {
  status: FileStatus;
  progress: number;
  language: string;
  t: any;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, progress, language, t }) => {
  switch (status) {
    case FileStatus.Done:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          {t('md2word.done')}
        </span>
      );
    case FileStatus.Converting:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
          {Math.round(progress)}%
        </span>
      );
    case FileStatus.Error:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
          <span className="material-symbols-outlined text-sm">error</span>
          {t('md2word.failed')}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          <span className="material-symbols-outlined text-sm">hourglass_empty</span>
          {t('md2word.pending')}
        </span>
      );
  }
};
