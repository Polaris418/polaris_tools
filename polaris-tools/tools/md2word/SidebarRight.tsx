import React, { useState } from 'react';
import { ExportFormat } from './types';
import { useAppContext } from '../../context/AppContext';
import { ToastType } from '../../components/Toast';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormatSelector } from './FormatSelector';

interface SidebarRightProps {
  onExport: (format: ExportFormat) => void;
  showToast: (message: string, type: ToastType) => void;
  onStylesChange?: (styles: Array<{id: string; css: string}>) => void;
  onExportSettingsChange?: (settings: {
    imageQuality: number;
    includeTableOfContents: boolean;
    pageNumbers: boolean;
    mirrorMargins: boolean;
  }) => void;
}

/**
 * MD2Word 右侧边栏 - 样式智能 & 导出设置
 */
export const SidebarRight: React.FC<SidebarRightProps> = ({ onExport, showToast, onStylesChange, onExportSettingsChange }) => {
  const { t } = useAppContext();
  const [exportFormat, setExportFormat] = useState<ExportFormat>('docx');
  const [imageQuality, setImageQuality] = useState(85);
  const [mirrorMargins, setMirrorMargins] = useState(false);
  const [includeTableOfContents, setIncludeTableOfContents] = useState(true);
  const [pageNumbers, setPageNumbers] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activeRules, setActiveRules] = useState<Array<{id: string, title: string, description: string}>>([]);
  const [isFormatSelectorExpanded, setIsFormatSelectorExpanded] = useState(false);

  // 当导出设置改变时，通知父组件
  React.useEffect(() => {
    if (onExportSettingsChange) {
      onExportSettingsChange({
        imageQuality,
        includeTableOfContents,
        pageNumbers,
        mirrorMargins
      });
    }
  }, [imageQuality, includeTableOfContents, pageNumbers, mirrorMargins, onExportSettingsChange]);


  const handleExport = () => {
    onExport(exportFormat);
  };

  // 清除所有规则
  const handleClearAllRules = () => {
    if (activeRules.length === 0) return;
    setShowClearConfirm(true);
  };

  const confirmClearRules = () => {
    setActiveRules([]);
    setShowClearConfirm(false);
    
    // 清除所有自定义样式
    if (onStylesChange) {
      onStylesChange([]);
    }
    
    showToast(
      t('md2word.all_rules_cleared'),
      'success'
    );
  };

  // 删除单个规则
  const handleRemoveRule = (id: string) => {
    setActiveRules(prev => prev.filter(rule => rule.id !== id));
    
    // 同时删除对应的样式
    if (onStylesChange) {
      onStylesChange(prev => prev.filter(style => style.id !== id));
    }
  };

  return (
    <div className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col shrink-0 z-20 h-full overflow-hidden">
      {/* 确认对话框 */}
      {showClearConfirm && (
        <ConfirmDialog
          title={t('md2word.clear_all_rules')}
          message={t('md2word.clear_all_rules_confirm')}
          confirmText={t('md2word.clear')}
          cancelText={t('common.cancel')}
          onConfirm={confirmClearRules}
          onCancel={() => setShowClearConfirm(false)}
          type="danger"
        />
      )}
      
      {/* 头部 */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-lg">palette</span>
          <h2 className="font-bold text-slate-900 dark:text-white text-sm">
            {t('md2word.format_export')}
          </h2>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          {t('md2word.format_export_desc')}
        </p>
      </div>

      {/* 滚动区域 - 包含所有内容 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-4">
          {/* 格式选择器 - 可折叠 */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            {/* 折叠标题栏 */}
            <button
              onClick={() => setIsFormatSelectorExpanded(!isFormatSelectorExpanded)}
              className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-lg">palette</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t('md2word.format_selector')}
                </span>
              </div>
              <span className={`material-symbols-outlined text-slate-500 transition-transform ${isFormatSelectorExpanded ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>
            
            {/* 可折叠内容 */}
            {isFormatSelectorExpanded && (
              <div className="p-4">
                <FormatSelector 
                  onStyleChange={(style) => {
                    const newRule = {
                      id: style.id,
                      title: style.description,
                      description: style.description
                    };
                    
                    setActiveRules(prev => [...prev, newRule]);
                    
                    if (onStylesChange) {
                      onStylesChange(prev => [...prev, { id: style.id, css: style.css }]);
                    }
                    
                    showToast(
                      t('md2word.style_applied'),
                      'success'
                    );
                  }}
                />
              </div>
            )}
          </div>

          {/* 活跃规则 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('md2word.active_rules')}
              </label>
              <button 
                onClick={handleClearAllRules}
                disabled={activeRules.length === 0}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline disabled:text-slate-300 dark:disabled:text-slate-600 disabled:no-underline disabled:cursor-not-allowed"
              >
                {t('md2word.clear_all')}
              </button>
            </div>
            <div className="space-y-2">
              {activeRules.length === 0 ? (
                <div className="text-center py-6 text-slate-400 dark:text-slate-500">
                  <span className="material-symbols-outlined text-3xl mb-2 block opacity-50">rule</span>
                  <p className="text-xs">
                    {t('md2word.no_active_rules')}
                  </p>
                </div>
              ) : (
                activeRules.map(rule => (
                  <RuleCard 
                    key={rule.id}
                    title={rule.title}
                    description={rule.description}
                    onRemove={() => handleRemoveRule(rule.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* 导出设置 */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              {t('md2word.export_settings')}
            </label>
            <div className="space-y-3">
              {/* 格式选择 */}
              <div>
                <p className="text-xs text-slate-900 dark:text-white font-medium mb-1.5">
                  {t('md2word.output_format')}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(['docx', 'pdf', 'html'] as ExportFormat[]).map((format) => (
                    <button 
                      key={format}
                      onClick={() => setExportFormat(format)}
                      className={`flex items-center justify-center gap-1 rounded py-2 text-xs font-medium shadow-sm border transition-colors ${
                        exportFormat === format 
                          ? 'bg-indigo-600 text-white border-indigo-600' 
                          : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {format === 'docx' ? 'description' : format === 'pdf' ? 'picture_as_pdf' : 'code'}
                      </span>
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 图片质量滑块 */}
              <div>
                <div className="flex justify-between mb-1">
                  <p className="text-xs text-slate-900 dark:text-white font-medium">
                    {t('md2word.image_quality')}
                  </p>
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">{imageQuality}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={imageQuality} 
                  onChange={(e) => setImageQuality(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                />
              </div>

              {/* 开关选项 */}
              <ToggleOption
                label={t('md2word.table_of_contents')}
                checked={includeTableOfContents}
                onChange={setIncludeTableOfContents}
              />
              <ToggleOption
                label={t('md2word.page_numbers')}
                checked={pageNumbers}
                onChange={setPageNumbers}
              />
              <ToggleOption
                label={t('md2word.mirror_margins')}
                checked={mirrorMargins}
                onChange={setMirrorMargins}
              />
            </div>
          </div>

          {/* 立即转换按钮 - 直接放在内容下面 */}
          <div className="pt-2">
            <button 
              onClick={handleExport}
              className="w-full flex items-center justify-center rounded-lg h-11 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 transition-all text-white gap-2 text-sm font-bold shadow-lg shadow-indigo-600/30 hover:shadow-xl hover:shadow-indigo-600/40 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>{t('md2word.convert_now')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 规则卡片组件
const RuleCard: React.FC<{ title: string; description: string; onRemove?: () => void }> = ({ title, description, onRemove }) => (
  <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-md p-2.5 shadow-sm flex items-start gap-2 group">
    <div className="text-green-500 mt-0.5">
      <span className="material-symbols-outlined text-base">check_circle</span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold text-slate-900 dark:text-white">{title}</p>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
    </div>
    {onRemove && (
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 p-0.5"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    )}
  </div>
);

// 开关选项组件
const ToggleOption: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ 
  label, checked, onChange 
}) => (
  <div className="flex items-center justify-between py-1">
    <p className="text-xs text-slate-900 dark:text-white font-medium">{label}</p>
    <div 
      className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'}`}
      onClick={() => onChange(!checked)}
    >
      <div 
        className="w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm"
        style={{ left: checked ? 'calc(100% - 18px)' : '2px' }}
      />
    </div>
  </div>
);
