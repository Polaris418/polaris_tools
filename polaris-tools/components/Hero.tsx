import React from 'react';
import { useAppContext } from '../context/AppContext';

export const Hero: React.FC = () => {
  const { t, setToolPage } = useAppContext();

  /**
   * 处理"开始使用"按钮点击 - 跳转到 MD转Word 工具
   */
  const handleGetStarted = () => {
    // MD转Word 工具的 path 是 'md2word'
    setToolPage('md2word');
  };

  /**
   * 处理"浏览工具"按钮点击 - 滚动到工具列表
   */
  const handleBrowseTools = () => {
    // 查找第一个工具分类区域
    const firstCategory = document.querySelector('[data-category-section]');
    if (firstCategory) {
      firstCategory.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#020617] dark:bg-[#020617] text-center py-20 px-6 border border-slate-200 dark:border-border-dark shadow-2xl transition-all duration-300">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]"></div>
      <div className="relative z-10 flex flex-col items-center justify-center gap-8">
        <svg className="text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.3)]" fill="none" height="80" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="80">
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"></path>
        </svg>
        <div className="space-y-4 max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">{t('hero.title')}</h2>
          <p className="text-slate-400 text-lg">{t('hero.subtitle')}</p>
        </div>
        <div className="flex gap-4 mt-4">
          <button 
            onClick={handleGetStarted}
            className="px-8 py-3 rounded-lg bg-white text-slate-900 font-semibold text-sm hover:bg-slate-100 transition-colors shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
          >
            {t('hero.cta.start')}
          </button>
          <button 
            onClick={handleBrowseTools}
            className="px-8 py-3 rounded-lg bg-white/5 text-white font-semibold text-sm hover:bg-white/10 transition-colors border border-white/10 backdrop-blur-sm"
          >
            {t('hero.cta.browse')}
          </button>
        </div>
      </div>
    </div>
  );
};
