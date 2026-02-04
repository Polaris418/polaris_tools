import React, { useRef, useState } from 'react';
import { FileItem, TEMPLATE_OPTIONS } from './types';
import { useAppContext } from '../../context/AppContext';

interface SidebarLeftProps {
  files: FileItem[];
  activeFileId: string;
  onFileSelect: (id: string) => void;
  onNewFile: () => void;
  onFileUpload?: (files: File[]) => void;
  selectedTemplate?: string;
  onTemplateSelect?: (template: string) => void;
}

/**
 * MD2Word 左侧边栏 - 文件管理
 */
export const SidebarLeft: React.FC<SidebarLeftProps> = ({ 
  files, 
  activeFileId, 
  onFileSelect,
  onNewFile,
  onFileUpload,
  selectedTemplate = 'corporate',
  onTemplateSelect
}) => {
  const { t, language } = useAppContext();
  const [activeTab, setActiveTab] = React.useState<'recent' | 'templates'>('recent');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 文件上传处理
  const handleFileUpload = (fileList: FileList | File[]) => {
    const fileArray = Array.from(fileList).filter(
      (file: File) => file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.txt')
    );
    if (fileArray.length > 0 && onFileUpload) {
      onFileUpload(fileArray);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 z-20 h-full overflow-hidden">
      
      {/* 品牌 */}
      <div className="p-6 pb-3">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight text-slate-900 dark:text-white">{t('md2word.brand_polaris')}</h1>
            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1">
              {t('md2word.brand_subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* 文件上传区域（更醒目） */}
      <div className="px-6 pb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('md2word.upload_files')}
          </p>
          <span className="text-[10px] text-indigo-500 dark:text-indigo-400">
            .md / .markdown / .txt
          </span>
        </div>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
              : 'border-indigo-300/70 dark:border-indigo-700/60 bg-indigo-50/60 dark:bg-indigo-900/20 hover:border-indigo-400 dark:hover:border-indigo-500'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".md,.markdown,.txt"
            multiple
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          />
          <span className={`material-symbols-outlined text-2xl ${isDragging ? 'text-indigo-500' : 'text-indigo-500'}`}>
            upload_file
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t('md2word.click_or_drop')}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('md2word.markdown_supported')}
            </span>
          </div>
        </div>
      </div>

      {/* 新建文档（弱化） */}
      <div className="px-6 pb-2">
        <button 
          onClick={onNewFile}
          className="w-full cursor-pointer flex items-center justify-center rounded-lg h-9 px-4 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors gap-2 text-sm font-medium"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>note_add</span>
          <span>{t('md2word.new_document')}</span>
        </button>
      </div>

      {/* 选项卡 */}
      <div className="px-6 mt-2">
        <div className="flex border-b border-slate-200 dark:border-slate-600 gap-6">
          <button 
            onClick={() => setActiveTab('recent')}
            className={`flex flex-col items-center justify-center border-b-2 pb-3 pt-2 flex-1 transition-colors ${
              activeTab === 'recent' 
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wider">
              {t('md2word.recent')}
            </p>
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className={`flex flex-col items-center justify-center border-b-2 pb-3 pt-2 flex-1 transition-colors ${
              activeTab === 'templates' 
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wider">
              {t('md2word.templates')}
            </p>
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {activeTab === 'recent' ? (
          // 最近文件列表
          files.map((file) => {
            const isActive = file.id === activeFileId;
            return (
              <div
                key={file.id}
                onClick={() => onFileSelect(file.id)}
                className={`group flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors border border-transparent 
                  ${isActive 
                    ? 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600' 
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
              >
                <div className={`${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined ${isActive ? 'icon-filled' : ''}`}>
                    {file.name.includes('Report') ? 'article' : 'description'}
                  </span>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                    {file.name}
                  </p>
                  <p className={`text-xs truncate ${isActive ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    {file.lastEdited}
                  </p>
                </div>
                {isActive && (
                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-slate-400 dark:text-slate-500" style={{ fontSize: '18px' }}>
                      more_vert
                    </span>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          // 文档模板列表
          <div className="px-2 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              {t('md2word.select_template')}
            </p>
            {TEMPLATE_OPTIONS.map(template => (
              <button
                key={template.value}
                onClick={() => onTemplateSelect?.(template.value)}
                className={`group w-full rounded-lg border text-left transition-all duration-200 p-3 ${
                  selectedTemplate === template.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className={`material-symbols-outlined text-lg transition-colors ${
                    selectedTemplate === template.value 
                      ? 'text-indigo-600 dark:text-indigo-400' 
                      : 'text-slate-400 group-hover:text-indigo-500'
                  }`}>
                    {template.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-bold ${
                        selectedTemplate === template.value
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {language === 'zh' ? template.labelZh : template.label}
                      </span>
                      {selectedTemplate === template.value && (
                        <span className="material-symbols-outlined text-indigo-500 text-base">check_circle</span>
                      )}
                    </div>
                    <p className={`text-[10px] mb-2 ${
                      selectedTemplate === template.value
                        ? 'text-indigo-500/70 dark:text-indigo-400/70'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {language === 'zh' ? template.descriptionZh : template.description}
                    </p>
                  </div>
                </div>
                <div className="pl-7 border-t border-slate-200 dark:border-slate-600 pt-2">
                  <p className="text-[9px] leading-relaxed text-slate-600 dark:text-slate-400">
                    {language === 'zh' ? template.detailsZh : template.details}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 底部状态 */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 mt-auto">
        <div className="flex items-center gap-3 px-2">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('md2word.systems_operational')}
          </span>
        </div>
      </div>
    </div>
  );
};
