import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { TabMode } from './types';

interface TopNavigationProps {
  activeFileName?: string;
  tabMode: TabMode;
  onTabChange: (mode: TabMode) => void;
  onBack: () => void;
}

/**
 * MD2Word 顶部导航栏
 */
export const TopNavigation: React.FC<TopNavigationProps> = ({ 
  activeFileName, 
  tabMode,
  onTabChange,
  onBack 
}) => {
  const { t } = useAppContext();

  return (
    <div className="h-14 border-b border-slate-200 dark:border-slate-700 flex items-center px-6 justify-between shrink-0 bg-white dark:bg-slate-800">
      <div className="flex items-center gap-3">
        {/* 返回按钮 */}
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
          <span className="text-sm font-medium">
            {t('md2word.back')}
          </span>
        </button>
        
        <div className="h-5 w-px bg-slate-200 dark:bg-slate-600" />
        
        {/* 面包屑导航 */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400 dark:text-slate-500 font-medium">
            {t('md2word.text_tools')}
          </span>
          <span className="text-slate-400 dark:text-slate-500">/</span>
          <span className="text-slate-900 dark:text-white font-bold">
            {t('md2word.title')}
          </span>
          {tabMode === 'editor' && activeFileName && (
            <>
              <span className="text-slate-400 dark:text-slate-500">/</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                {activeFileName}
              </span>
            </>
          )}
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-600 ml-2" />

        {/* Tab 切换 */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
          <button
            onClick={() => onTabChange('editor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              tabMode === 'editor' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span className="material-symbols-outlined text-lg">edit_note</span>
            {t('md2word.editor')}
          </button>
          <button
            onClick={() => onTabChange('batch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              tabMode === 'batch' 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span className="material-symbols-outlined text-lg">drive_folder_upload</span>
            {t('md2word.batch')}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {tabMode === 'editor' && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
              {t('md2word.auto_saved')}
            </span>
          </div>
        )}
        <button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300">
          <span className="material-symbols-outlined">account_circle</span>
        </button>
      </div>
    </div>
  );
};
