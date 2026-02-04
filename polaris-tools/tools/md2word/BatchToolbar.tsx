import React, { useState } from 'react';
import { GlobalSettings, ExportFormat, TEMPLATE_OPTIONS, FileStatus, FileItem } from './types';
import { useAppContext } from '../../context/AppContext';

interface BatchToolbarProps {
  settings: GlobalSettings;
  onSettingsChange: (settings: GlobalSettings) => void;
  files: FileItem[];
  onStartConversion: () => void;
  onClearCompleted: () => void;
  onDownloadAll: () => void;
}

/**
 * 批量转换工具栏组件
 */
export const BatchToolbar: React.FC<BatchToolbarProps> = ({ 
  settings, 
  onSettingsChange,
  files,
  onStartConversion,
  onClearCompleted,
  onDownloadAll
}) => {
  const { language, t } = useAppContext();
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  const pendingCount = files.filter(f => f.status === FileStatus.Pending).length;
  const convertingCount = files.filter(f => f.status === FileStatus.Converting).length;
  const doneCount = files.filter(f => f.status === FileStatus.Done).length;
  const errorCount = files.filter(f => f.status === FileStatus.Error).length;

  const isConverting = convertingCount > 0;
  const hasFilesToConvert = pendingCount > 0;

  const selectedTemplateInfo = TEMPLATE_OPTIONS.find(t => t.value === settings.template);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* 左侧：全局设置 */}
        <div className="flex flex-wrap items-center gap-4">
          {/* 模板选择 - 改进版下拉菜单 */}
          <div className="flex flex-col gap-1 relative">
            <label className="text-xs text-slate-500 dark:text-slate-400">
              {t('md2word.global_template_label')}
            </label>
            <button
              onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
              disabled={isConverting}
              className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 min-w-[200px] text-left"
            >
              <span className="material-symbols-outlined text-lg text-indigo-500">
                {selectedTemplateInfo?.icon || 'description'}
              </span>
              <div className="flex-1">
                <span className="block text-slate-700 dark:text-slate-200 font-medium">
                  {language === 'zh' ? selectedTemplateInfo?.labelZh : selectedTemplateInfo?.label}
                </span>
              </div>
              <span className="material-symbols-outlined text-slate-400">
                {showTemplateDropdown ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            
            {/* 下拉菜单 */}
            {showTemplateDropdown && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg z-50 overflow-hidden max-h-80 overflow-y-auto">
                {TEMPLATE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onSettingsChange({ ...settings, template: opt.value });
                      setShowTemplateDropdown(false);
                    }}
                    className={`w-full flex items-start gap-3 p-3 text-left transition-colors border-b border-slate-100 dark:border-slate-700 last:border-b-0 ${
                      settings.template === opt.value
                        ? 'bg-indigo-50 dark:bg-indigo-900/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-xl mt-0.5 ${
                      settings.template === opt.value
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400'
                    }`}>
                      {opt.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${
                          settings.template === opt.value
                            ? 'text-indigo-700 dark:text-indigo-300'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {language === 'zh' ? opt.labelZh : opt.label}
                        </span>
                        {settings.template === opt.value && (
                          <span className="material-symbols-outlined text-indigo-500 text-lg">check</span>
                        )}
                      </div>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {language === 'zh' ? opt.descriptionZh : opt.description}
                      </span>
                      <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                        {language === 'zh' ? opt.detailsZh : opt.details}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 格式选择 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 dark:text-slate-400">
              {t('md2word.output_format_label')}
            </label>
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
              {(['docx', 'pdf', 'html'] as ExportFormat[]).map((format) => (
                <button
                  key={format}
                  onClick={() => onSettingsChange({ ...settings, format })}
                  disabled={isConverting}
                  className={`px-3 py-2 text-sm font-medium uppercase transition-colors ${
                    settings.format === format 
                      ? 'bg-indigo-500 text-white' 
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  } ${isConverting ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 中间：队列状态 */}
        <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
          <QueueStat 
            icon="hourglass_empty" 
            count={pendingCount} 
            label={t('md2word.queue_pending')} 
            color="text-slate-500"
          />
          <QueueStat 
            icon="sync" 
            count={convertingCount} 
            label={t('md2word.queue_converting')} 
            color="text-blue-500"
            spinning={isConverting}
          />
          <QueueStat 
            icon="check_circle" 
            count={doneCount} 
            label={t('md2word.queue_done')} 
            color="text-green-500"
          />
          {errorCount > 0 && (
            <QueueStat 
              icon="error" 
              count={errorCount} 
              label={t('md2word.queue_failed')} 
              color="text-red-500"
            />
          )}
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-2">
          {doneCount > 0 && (
            <>
              <button
                onClick={onClearCompleted}
                className="px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-lg">delete_sweep</span>
                {t('md2word.clear_completed')}
              </button>
              <button
                onClick={onDownloadAll}
                className="px-3 py-2 rounded-lg text-sm bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                {t('md2word.download_all')}
              </button>
            </>
          )}
          <button
            onClick={onStartConversion}
            disabled={!hasFilesToConvert || isConverting}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              hasFilesToConvert && !isConverting
                ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isConverting ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                {t('md2word.converting')}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">play_arrow</span>
                {t('md2word.start_conversion', { count: pendingCount })}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface QueueStatProps {
  icon: string;
  count: number;
  label: string;
  color: string;
  spinning?: boolean;
}

const QueueStat: React.FC<QueueStatProps> = ({ icon, count, label, color, spinning }) => (
  <div className="flex items-center gap-2">
    <span className={`material-symbols-outlined text-xl ${color} ${spinning ? 'animate-spin' : ''}`}>{icon}</span>
    <div className="flex flex-col">
      <span className={`text-lg font-semibold ${color.replace('text-', 'text-').replace('-500', '-600')} dark:${color}`}>{count}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  </div>
);
