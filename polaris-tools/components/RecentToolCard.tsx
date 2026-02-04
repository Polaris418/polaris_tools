import React from 'react';
import { Icon } from './Icon';
import { Tool } from '../types';
import { useAppContext } from '../context/AppContext';

const SCROLL_POSITION_KEY = 'dashboard_scroll_position';

interface RecentToolCardProps {
  tool: Tool;
}

export const RecentToolCard: React.FC<RecentToolCardProps> = ({ tool }) => {
  const { setToolPage } = useAppContext();
  
  const handleClick = () => {
    // 在导航前保存滚动位置
    const mainElement = document.querySelector('main');
    if (mainElement) {
      sessionStorage.setItem(SCROLL_POSITION_KEY, mainElement.scrollTop.toString());
    }
    
    if (tool.path) {
      setToolPage(tool.path);
    }
  };
  
  return (
    <div 
      onClick={handleClick}
      className="flex flex-col justify-between p-6 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer group h-36 shadow-sm hover:shadow-md dark:shadow-none"
    >
      <div className="flex justify-between items-start">
        <div className={`size-10 rounded-lg bg-slate-50 dark:bg-[#1e293b] border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 flex items-center justify-center group-hover:text-slate-900 dark:group-hover:text-white transition-all duration-300 relative overflow-hidden`}>
          <div className={`absolute inset-0 ${tool.bgHoverClass || 'bg-indigo-500/0 group-hover:bg-indigo-500/10'} transition-colors duration-300`}></div>
          <Icon name={tool.icon} className="relative z-10" />
        </div>
        <Icon name="open_in_new" className="text-slate-300 dark:text-slate-600 group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-[20px]" />
      </div>
      <div>
        <h3 className="text-slate-900 dark:text-white font-semibold text-sm">{tool.title}</h3>
        <p className="text-slate-500 dark:text-text-secondary text-xs mt-1">{tool.lastUsed}</p>
      </div>
    </div>
  );
};
