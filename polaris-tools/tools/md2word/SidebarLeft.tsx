import React, { useRef, useState } from 'react';
import { FileItem, TEMPLATE_OPTIONS } from './types';
import { useAppContext } from '../../context/AppContext';
import {
  type Md2WordHistoryEntry,
  formatMd2WordHistoryTime,
  isSubscribedHistoryUser,
} from './history';

interface SidebarLeftProps {
  files: FileItem[];
  historyItems: Md2WordHistoryEntry[];
  historySearch?: string;
  activeFileId: string;
  onFileSelect: (id: string) => void;
  onHistorySelect: (id: string) => void;
  onHistoryRename?: (id: string, nextName: string) => void;
  onHistoryDelete?: (id: string) => void;
  onHistorySearchChange?: (keyword: string) => void;
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
  historyItems,
  historySearch: controlledHistorySearch = '',
  activeFileId,
  onFileSelect,
  onHistorySelect,
  onHistoryRename,
  onHistoryDelete,
  onHistorySearchChange,
  onNewFile,
  onFileUpload,
  selectedTemplate = 'corporate',
  onTemplateSelect,
}) => {
  const { t, language, isAuthenticated, promptLogin, user } = useAppContext();
  const [activeTab, setActiveTab] = React.useState<'recent' | 'templates'>('recent');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [historySearch, setHistorySearch] = useState(controlledHistorySearch);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const isSubscribedUser = isSubscribedHistoryUser(user?.planType);

  React.useEffect(() => {
    setHistorySearch(controlledHistorySearch);
  }, [controlledHistorySearch]);

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

  const filteredHistoryItems = historyItems.filter((item) => {
    const keyword = historySearch.trim().toLowerCase();
    if (!keyword) {
      return true;
    }

    return [item.documentName, item.previewText, item.content]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword));
  });

  const startRename = (item: Md2WordHistoryEntry) => {
    setEditingHistoryId(item.clientFileId);
    setRenameDraft(item.documentName);
  };

  const cancelRename = () => {
    setEditingHistoryId(null);
    setRenameDraft('');
  };

  const commitRename = (item: Md2WordHistoryEntry) => {
    const nextName = renameDraft.trim();
    if (!nextName) {
      return;
    }

    if (nextName !== item.documentName) {
      onHistoryRename?.(item.clientFileId, nextName);
    }
    cancelRename();
  };

  return (
    <div className="w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 z-20 h-full overflow-hidden">
      <div className="p-6 pb-3">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              description
            </span>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight text-slate-900 dark:text-white">
              {t('md2word.brand_polaris')}
            </h1>
            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1">
              {t('md2word.brand_subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('md2word.upload_files')}
          </p>
          <span className="text-[10px] text-indigo-500 dark:text-indigo-400">.md / .markdown / .txt</span>
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

      <div className="px-6 pb-2">
        <button
          onClick={onNewFile}
          className="w-full cursor-pointer flex items-center justify-center rounded-lg h-9 px-4 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors gap-2 text-sm font-medium"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            note_add
          </span>
          <span>{t('md2word.new_document')}</span>
        </button>
      </div>

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
            <p className="text-xs font-bold uppercase tracking-wider">{t('md2word.recent')}</p>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex flex-col items-center justify-center border-b-2 pb-3 pt-2 flex-1 transition-colors ${
              activeTab === 'templates'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wider">{t('md2word.templates')}</p>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {activeTab === 'recent' ? (
          <>
            {!isAuthenticated ? (
              <div className="px-4 py-6" data-md2word-history-guest="true">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {language === 'zh' ? '历史记录仅对登录用户开放' : 'History is available for signed-in users only'}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {language === 'zh'
                      ? '登录后可在这里查看并恢复 Markdown 转 Word 的最近编辑历史。'
                      : 'Sign in to view and restore your recent Markdown to Word history here.'}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      promptLogin(
                        language === 'zh'
                          ? '登录后即可使用 Markdown 转 Word 的历史记录功能'
                          : 'Sign in to access Markdown to Word history'
                      )
                    }
                    className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                  >
                    {language === 'zh' ? '登录后使用' : 'Sign in'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 pb-3" data-md2word-history-search="true">
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {language === 'zh' ? '搜索历史' : 'Search history'}
                  </label>
                  <div className="relative">
                    <span
                      className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                      style={{ fontSize: '18px' }}
                    >
                      search
                    </span>
                    <input
                      value={historySearch}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setHistorySearch(nextValue);
                        onHistorySearchChange?.(nextValue);
                      }}
                      placeholder={language === 'zh' ? '搜索最近历史' : 'Search recent history'}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none transition-colors focus:border-indigo-500 dark:focus:border-indigo-400"
                    />
                  </div>
                </div>

                {!isSubscribedUser && (
                  <div className="px-4 pb-2" data-md2word-history-limit="free">
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium leading-5 text-amber-700">
                      {language === 'zh'
                        ? '普通用户仅保留最近 5 条历史记录。'
                        : 'Free users keep the latest 5 history items.'}
                    </div>
                  </div>
                )}

                {filteredHistoryItems.length === 0 ? (
                  <div className="px-4 py-6" data-md2word-history-empty="true">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {historySearch.trim()
                          ? language === 'zh'
                            ? '没有匹配的历史记录'
                            : 'No matching history'
                          : language === 'zh'
                            ? '还没有历史记录'
                            : 'No history yet'}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {historySearch.trim()
                          ? language === 'zh'
                            ? '尝试换一个关键词搜索。'
                            : 'Try a different keyword.'
                          : language === 'zh'
                            ? '开始编辑或上传 Markdown 文档后，这里会自动保存你的最近记录。'
                            : 'Recent entries will appear here after you edit or upload Markdown documents.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  filteredHistoryItems.map((item) => {
                    const isActive = item.clientFileId === activeFileId;
                    const isEditing = editingHistoryId === item.clientFileId;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (!isEditing) {
                            onHistorySelect(item.clientFileId);
                          }
                        }}
                        className={`group flex items-start gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors border border-transparent
                          ${isActive
                            ? 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                        data-md2word-history-item={item.clientFileId}
                      >
                        <div
                          className={`${
                            isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                          } flex items-center justify-center shrink-0 pt-0.5`}
                        >
                          <span className={`material-symbols-outlined ${isActive ? 'icon-filled' : ''}`}>
                            description
                          </span>
                        </div>
                        <div className="flex flex-col flex-1 min-w-0 gap-1">
                          {isEditing ? (
                            <div className="flex flex-col gap-2">
                              <input
                                autoFocus
                                value={renameDraft}
                                onChange={(event) => setRenameDraft(event.target.value)}
                                onClick={(event) => event.stopPropagation()}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    commitRename(item);
                                  }
                                  if (event.key === 'Escape') {
                                    event.preventDefault();
                                    cancelRename();
                                  }
                                }}
                                className="w-full rounded-lg border border-indigo-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-indigo-600 dark:bg-slate-900 dark:text-white"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    commitRename(item);
                                  }}
                                  disabled={!renameDraft.trim()}
                                  className="inline-flex h-7 items-center justify-center rounded-md bg-indigo-600 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {language === 'zh' ? '保存' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    cancelRename();
                                  }}
                                  className="inline-flex h-7 items-center justify-center rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                                >
                                  {language === 'zh' ? '取消' : 'Cancel'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start gap-2">
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={`text-sm font-bold truncate ${
                                      isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    {item.documentName}
                                  </p>
                                  <p
                                    className={`text-xs truncate ${
                                      isActive ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'
                                    }`}
                                  >
                                    {formatMd2WordHistoryTime(item.updatedAt, language)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      startRename(item);
                                    }}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-indigo-400"
                                    aria-label={language === 'zh' ? '重命名历史记录' : 'Rename history item'}
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                      edit
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onHistoryDelete?.(item.clientFileId);
                                    }}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-rose-400"
                                    aria-label={language === 'zh' ? '删除历史记录' : 'Delete history item'}
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                      delete
                                    </span>
                                  </button>
                                </div>
                              </div>
                              {isActive && (
                                <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500" style={{ fontSize: '18px' }}>
                                    history
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </>
        ) : (
          <div className="px-2 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              {t('md2word.select_template')}
            </p>
            {TEMPLATE_OPTIONS.map((template) => (
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
                  <span
                    className={`material-symbols-outlined text-lg transition-colors ${
                      selectedTemplate === template.value
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400 group-hover:text-indigo-500'
                    }`}
                  >
                    {template.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm font-bold ${
                          selectedTemplate === template.value
                            ? 'text-indigo-700 dark:text-indigo-300'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {language === 'zh' ? template.labelZh : template.label}
                      </span>
                      {selectedTemplate === template.value && (
                        <span className="material-symbols-outlined text-indigo-500 text-base">check_circle</span>
                      )}
                    </div>
                    <p
                      className={`text-[10px] mb-2 ${
                        selectedTemplate === template.value
                          ? 'text-indigo-500/70 dark:text-indigo-400/70'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
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
