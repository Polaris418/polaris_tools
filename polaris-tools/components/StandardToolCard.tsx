import React, { useState } from 'react';
import { Icon } from './Icon';
import { Tool } from '../types';
import { useAppContext } from '../context/AppContext';
import { useFavoriteStatus } from '../hooks/useFavorites';

const SCROLL_POSITION_KEY = 'dashboard_scroll_position';

interface StandardToolCardProps {
  tool: Tool;
  showFavoriteButton?: boolean;
}

export const StandardToolCard: React.FC<StandardToolCardProps> = ({ tool, showFavoriteButton = true }) => {
  const { setToolPage, language, isAuthenticated, showToast, t } = useAppContext();
  // 优先使用 numericId，否则尝试解析 id
  const toolId = tool.numericId ?? (tool.id ? parseInt(tool.id, 10) : null);
  const validToolId = toolId && !isNaN(toolId) ? toolId : null;
  const { isFavorited, loading: favoriteLoading, toggleFavorite } = useFavoriteStatus(
    isAuthenticated && showFavoriteButton && validToolId ? validToolId : null
  );
  const [isToggling, setIsToggling] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // 在导航前保存滚动位置
    const mainElement = document.querySelector('main');
    if (mainElement) {
      sessionStorage.setItem(SCROLL_POSITION_KEY, mainElement.scrollTop.toString());
    }
    
    // 如果工具有 path，使用插件化路由系统
    if (tool.path) {
      setToolPage(tool.path);
    }
    // 否则，如果是外部链接，在新标签页打开
    else if (tool.path && tool.path.startsWith('http')) {
      window.open(tool.path, '_blank');
    }
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      showToast(t('favorite.login_required'), 'warning');
      return;
    }
    
    if (isToggling || favoriteLoading) return;
    
    setIsToggling(true);
    try {
      await toggleFavorite();
      showToast(
        isFavorited ? t('favorite.removed') : t('favorite.added'),
        'success'
      );
    } catch (err) {
      showToast(t('favorite.error'), 'error');
    } finally {
      setIsToggling(false);
    }
  };

  const title = language === 'zh' && tool.title_zh ? tool.title_zh : tool.title;
  const description = language === 'zh' && tool.description_zh ? tool.description_zh : tool.description;

  return (
    <div className="relative group">
      <a 
        href="#" 
        onClick={handleClick}
        className="flex items-center gap-4 p-5 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm hover:shadow-md dark:shadow-none cursor-pointer"
      >
        <div className="size-10 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#1e293b] text-slate-600 dark:text-slate-400 flex items-center justify-center group-hover:text-slate-900 dark:group-hover:text-white transition-all duration-300 overflow-hidden relative">
          <div className={`absolute inset-0 ${tool.bgHoverClass || 'bg-indigo-500/0 group-hover:bg-indigo-500/10'} transition-colors duration-300`}></div>
          <Icon name={tool.icon} className="relative z-10" />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <h4 className={`text-slate-900 dark:text-white text-sm font-bold ${tool.colorClass} transition-colors truncate`}>{title}</h4>
          <p className="text-slate-500 dark:text-text-secondary text-xs truncate">{description}</p>
        </div>
      </a>
      
      {/* 收藏按钮 */}
      {showFavoriteButton && isAuthenticated && (
        <button
          onClick={handleFavoriteClick}
          disabled={isToggling || favoriteLoading}
          className={`absolute top-2 right-2 size-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
            isFavorited
              ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-500 opacity-100'
              : 'bg-white/80 dark:bg-slate-800/80 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/10'
          } ${isToggling || favoriteLoading ? 'cursor-wait' : 'cursor-pointer'} shadow-sm border border-slate-200 dark:border-slate-700`}
          title={isFavorited ? t('favorite.remove') : t('favorite.add')}
        >
          {isToggling || favoriteLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          ) : (
            <Icon name="star" filled={isFavorited} className="text-[18px]" />
          )}
        </button>
      )}
    </div>
  );
};
