import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { apiClient } from '../api/client';
import { Icon } from '../components/Icon';
import { RecentToolCard } from '../components/RecentToolCard';
import { SkeletonList } from '../components/SkeletonList';
import type { Tool, ToolResponse } from '../types';

/**
 * 使用历史页面
 * 展示用户的完整工具使用历史记录
 */
export const History: React.FC = () => {
  const { t, language, isAuthenticated } = useAppContext();
  const navigate = useNavigate();
  
  const [tools, setTools] = useState<ToolResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 12;

  /**
   * 格式化相对时间
   */
  const formatRelativeTime = (dateString?: string): string => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) {
      return t('time.just_now');
    } else if (diffMinutes < 60) {
      return t('time.minutes_ago', { minutes: diffMinutes });
    } else if (diffHours < 24) {
      return t('time.hours_ago', { hours: diffHours });
    } else if (diffDays < 7) {
      return t('time.days_ago', { days: diffDays });
    } else {
      return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  /**
   * 加载使用历史
   */
  const fetchHistory = async (pageNum: number, append: boolean = false) => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      if (!append) setLoading(true);
      // 获取更多的历史记录
      const result = await apiClient.usage.recent(pageNum * pageSize);
      
      if (append) {
        // 追加数据，避免重复
        const existingIds = new Set(tools.map(t => t.id));
        const newTools = result.data.filter(t => !existingIds.has(t.id));
        setTools(prev => [...prev, ...newTools]);
      } else {
        setTools(result.data);
      }
      
      // 判断是否还有更多数据
      setHasMore(result.data.length >= pageNum * pageSize);
      setError(null);
    } catch (err: any) {
      if (!err.message?.includes('401') && !err.message?.includes('Unauthorized')) {
        setError(err.message || t('history.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, [isAuthenticated]);

  /**
   * 加载更多
   */
  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchHistory(nextPage, true);
  };

  /**
   * 转换为 UI Tool 格式
   */
  const convertToUITool = (toolResponse: ToolResponse): Tool => {
    return {
      id: toolResponse.id.toString(),
      numericId: toolResponse.id,
      title: language === 'zh' && toolResponse.nameZh ? toolResponse.nameZh : toolResponse.name,
      title_zh: toolResponse.nameZh,
      description: language === 'zh' && toolResponse.descriptionZh ? toolResponse.descriptionZh : toolResponse.description || '',
      description_zh: toolResponse.descriptionZh,
      icon: toolResponse.icon,
      category: toolResponse.categoryName,
      colorClass: toolResponse.colorClass,
      bgHoverClass: toolResponse.bgHoverClass,
      path: toolResponse.url,
      lastUsed: formatRelativeTime(toolResponse.lastUsedAt),
    };
  };

  // 未登录提示
  if (!isAuthenticated) {
    return (
      <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Icon name="history" className="text-4xl text-slate-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                {t('history.login_required')}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                {t('history.login_required_desc')}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                {t('auth.submit.login')}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 scrollbar-thin scrollbar-thumb-slate-700">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={t('tool.layout.back')}
            >
              <Icon name="arrow_back" className="text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('history.title')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                {t('history.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <SkeletonList count={6} variant="recent" layout="grid" />
        ) : error ? (
          <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Icon name="error" className="text-red-600 dark:text-red-400 text-[24px] flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-1">
                  {t('history.error')}
                </h3>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          </div>
        ) : tools.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {tools.map(tool => (
                <RecentToolCard key={`${tool.id}-${tool.lastUsedAt}`} tool={convertToUITool(tool)} />
              ))}
            </div>
            
            {/* Load More */}
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMore}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
                >
                  {t('history.load_more')}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Icon name="history" className="text-4xl text-slate-400" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {t('history.empty')}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                {t('history.empty_desc')}
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                {t('history.explore_tools')}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
